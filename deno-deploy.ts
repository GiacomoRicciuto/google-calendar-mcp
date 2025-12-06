// Deno Deploy entry point for MCP Calendar Server
import { createMCPServer, text, object } from 'npm:mcp-use@latest/server';
import { z } from 'npm:zod@latest';
import { google } from 'npm:googleapis@latest';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  calendarId: Deno.env.get('CALENDAR_ID') || 'giacomo.ricciuto4@gmail.com',
  timezone: Deno.env.get('TIMEZONE') || 'Europe/Rome',
  googleCredentials: Deno.env.get('GOOGLE_CREDENTIALS') // JSON string
};

// Parse Google credentials from environment variable
const credentials = JSON.parse(CONFIG.googleCredentials || '{}');

// ============================================================================
// GOOGLE CALENDAR CLIENT
// ============================================================================

class CalendarClient {
  private calendar: any;
  private calendarId: string;

  constructor(credentials: any, calendarId: string) {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar']
    });

    this.calendar = google.calendar({ version: 'v3', auth });
    this.calendarId = calendarId;
  }

  async getBusyPeriods(date: string): Promise<Array<{ start: string; end: string }>> {
    const timeMin = `${date}T00:00:00+01:00`;
    const timeMax = `${date}T23:59:59+01:00`;

    const response = await this.calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        timeZone: CONFIG.timezone,
        items: [{ id: this.calendarId }]
      }
    });

    const busy = response.data.calendars[this.calendarId]?.busy || [];
    return busy;
  }

  calculateAvailableSlots(
    date: string,
    busyPeriods: Array<{ start: string; end: string }>,
    workingHours = { start: '09:00', end: '18:00' },
    slotDuration = 30
  ): Array<{ start: string; end: string; available: boolean }> {
    const slots: Array<{ start: string; end: string; available: boolean }> = [];
    const dayStart = new Date(`${date}T${workingHours.start}:00+01:00`);
    const dayEnd = new Date(`${date}T${workingHours.end}:00+01:00`);
    let current = new Date(dayStart);

    while (current < dayEnd) {
      const slotEnd = new Date(current.getTime() + slotDuration * 60 * 1000);

      if (slotEnd <= dayEnd) {
        const isBusy = busyPeriods.some(busy => {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          return current < busyEnd && slotEnd > busyStart;
        });

        slots.push({
          start: current.toISOString(),
          end: slotEnd.toISOString(),
          available: !isBusy
        });
      }

      current = new Date(current.getTime() + 30 * 60 * 1000);
    }

    return slots;
  }

  async createEvent(params: {
    datetime: string;
    duration: number;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    notes?: string;
  }) {
    const startTime = new Date(params.datetime);
    const endTime = new Date(startTime.getTime() + params.duration * 60 * 1000);

    const event = {
      summary: `Appuntamento - ${params.customerName}`,
      description: `
Cliente: ${params.customerName}
Telefono: ${params.customerPhone}
${params.customerEmail ? `Email: ${params.customerEmail}` : ''}
${params.notes ? `Note: ${params.notes}` : ''}

Prenotato tramite DeepAgent Voice AI
      `.trim(),
      start: {
        dateTime: startTime.toISOString(),
        timeZone: CONFIG.timezone
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: CONFIG.timezone
      }
    };

    const response = await this.calendar.events.insert({
      calendarId: this.calendarId,
      requestBody: event,
      sendUpdates: 'none'
    });

    return response.data;
  }
}

// ============================================================================
// MCP SERVER SETUP
// ============================================================================

const server = createMCPServer('deepagent-calendar', {
  version: '1.0.0',
  description: 'MCP Calendar Server per giacomo.ricciuto4@gmail.com'
});

const calendarClient = new CalendarClient(credentials, CONFIG.calendarId);

// Tool 1: Check Availability
server.tool({
  name: 'check_availability',
  description: 'Controlla disponibilità del calendario per una data specifica',
  schema: z.object({
    date: z.string().describe('Data in formato YYYY-MM-DD (es: 2025-12-10)'),
    duration: z.number().optional().default(30).describe('Durata appuntamento in minuti'),
    preferred_time: z.enum(['morning', 'afternoon', 'any']).optional().default('any')
  }),
  cb: async ({ date, duration, preferred_time }: { date: string; duration?: number; preferred_time?: 'morning' | 'afternoon' | 'any' }) => {
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return text('Formato data non valido. Usa YYYY-MM-DD (es: 2025-12-10)');
      }

      const busyPeriods = await calendarClient.getBusyPeriods(date);
      const allSlots = calendarClient.calculateAvailableSlots(date, busyPeriods, { start: '09:00', end: '18:00' }, duration);
      let slots = allSlots.filter(s => s.available);

      if (preferred_time === 'morning') {
        slots = slots.filter(s => new Date(s.start).getHours() >= 9 && new Date(s.start).getHours() < 13);
      } else if (preferred_time === 'afternoon') {
        slots = slots.filter(s => new Date(s.start).getHours() >= 14 && new Date(s.start).getHours() < 18);
      }

      const formattedSlots = slots.map(slot => ({
        start: slot.start,
        end: slot.end,
        time: new Date(slot.start).toLocaleTimeString('it-IT', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: CONFIG.timezone
        })
      }));

      return object({
        success: true,
        date,
        total_slots: slots.length,
        slots: formattedSlots,
        message: slots.length > 0 ? `Ho trovato ${slots.length} slot disponibili per il ${date}` : `Nessuno slot disponibile per il ${date}`
      });
    } catch (error: any) {
      return text(`Error: ${error.message}`);
    }
  }
});

// Tool 2: Book Appointment
server.tool({
  name: 'book_appointment',
  description: 'Prenota un appuntamento nel calendario',
  schema: z.object({
    datetime: z.string().describe('Data e ora in formato ISO (es: 2025-12-10T10:00:00+01:00)'),
    customer_name: z.string().describe('Nome del cliente'),
    customer_phone: z.string().describe('Telefono del cliente'),
    customer_email: z.string().optional().describe('Email del cliente (opzionale)'),
    duration: z.number().optional().default(30).describe('Durata in minuti'),
    notes: z.string().optional().describe('Note aggiuntive')
  }),
  cb: async (params: { datetime: string; customer_name: string; customer_phone: string; customer_email?: string; duration?: number; notes?: string }) => {
    try {
      const appointmentTime = new Date(params.datetime);
      if (appointmentTime <= new Date()) {
        return text('La data deve essere nel futuro');
      }

      const event = await calendarClient.createEvent({
        datetime: params.datetime,
        duration: params.duration || 30,
        customerName: params.customer_name,
        customerPhone: params.customer_phone,
        customerEmail: params.customer_email,
        notes: params.notes
      });

      return object({
        success: true,
        booking_id: event.id,
        event_link: event.htmlLink,
        start_time: params.datetime,
        customer: params.customer_name,
        message: `Appuntamento confermato per ${params.customer_name} il ${appointmentTime.toLocaleString('it-IT', { timeZone: CONFIG.timezone })}`
      });
    } catch (error: any) {
      return text(`Error: ${error.message}`);
    }
  }
});

// Tool 3: Get Today's Appointments
server.tool({
  name: 'get_todays_appointments',
  description: 'Ottieni tutti gli appuntamenti di oggi',
  schema: z.object({}),
  cb: async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const busyPeriods = await calendarClient.getBusyPeriods(today);

      const appointments = busyPeriods.map(period => ({
        start: period.start,
        end: period.end,
        time: `${new Date(period.start).toLocaleTimeString('it-IT', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: CONFIG.timezone
        })} - ${new Date(period.end).toLocaleTimeString('it-IT', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: CONFIG.timezone
        })}`
      }));

      return object({
        success: true,
        date: today,
        total_appointments: appointments.length,
        appointments
      });
    } catch (error: any) {
      return text(`Error: ${error.message}`);
    }
  }
});

// Export the handler for Deno Deploy
const handler = await server.getHandler({ provider: 'deno-deploy' });
Deno.serve(handler);
