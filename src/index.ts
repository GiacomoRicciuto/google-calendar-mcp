// src/index.ts
// MCP Calendar Server per Giacomo - DeepAgent

import { createMCPServer, text, object } from 'mcp-use/server';
import { z } from 'zod';
import { google } from 'googleapis';
import { readFileSync } from 'fs';
import * as dotenv from 'dotenv';

// Carica variabili ambiente
dotenv.config();

// ============================================================================
// CONFIGURAZIONE
// ============================================================================

const CONFIG = {
  calendarId: process.env.CALENDAR_ID || 'giacomo.ricciuto4@gmail.com',
  timezone: process.env.TIMEZONE || 'Europe/Rome',
  port: parseInt(process.env.PORT || '3001'),
  credentialsPath: process.env.GOOGLE_CREDENTIALS_PATH || './credentials/service-account.json'
};

// ============================================================================
// GOOGLE CALENDAR CLIENT
// ============================================================================

class CalendarClient {
  private calendar: any;
  private calendarId: string;

  constructor(credentialsPath: string, calendarId: string) {
    // Leggi credenziali dal file JSON
    const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));

    // Setup autenticazione
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar']
    });

    // Inizializza client Google Calendar
    this.calendar = google.calendar({ version: 'v3', auth });
    this.calendarId = calendarId;
  }

  /**
   * Ottiene i periodi occupati per una data specifica
   */
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

  /**
   * Calcola gli slot disponibili per una data
   */
  calculateAvailableSlots(
    date: string,
    busyPeriods: Array<{ start: string; end: string }>,
    workingHours = { start: '09:00', end: '18:00' },
    slotDuration = 30
  ): Array<{ start: string; end: string; available: boolean }> {
    const slots: Array<{ start: string; end: string; available: boolean }> = [];

    // Crea datetime per inizio/fine giornata lavorativa
    const [startHour, startMin] = workingHours.start.split(':').map(Number);
    const [endHour, endMin] = workingHours.end.split(':').map(Number);

    const dayStart = new Date(`${date}T${workingHours.start}:00+01:00`);
    const dayEnd = new Date(`${date}T${workingHours.end}:00+01:00`);

    // Genera slot ogni 30 minuti
    let current = new Date(dayStart);

    while (current < dayEnd) {
      const slotEnd = new Date(current.getTime() + slotDuration * 60 * 1000);

      if (slotEnd <= dayEnd) {
        // Controlla se lo slot è libero
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

      // Prossimo slot (ogni 30 min)
      current = new Date(current.getTime() + 30 * 60 * 1000);
    }

    return slots;
  }

  /**
   * Crea un evento nel calendario
   */
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
      // Note: attendees removed - service accounts can't invite without Domain-Wide Delegation
    };

    const response = await this.calendar.events.insert({
      calendarId: this.calendarId,
      requestBody: event,
      sendUpdates: 'none'  // Changed from 'all' to 'none' since we can't send invites
    });

    return response.data;
  }
}

// ============================================================================
// MCP SERVER SETUP
// ============================================================================

console.log('🚀 Starting DeepAgent Calendar MCP Server...\n');

const server = createMCPServer('deepagent-calendar', {
  version: '1.0.0',
  description: 'MCP Calendar Server per giacomo.ricciuto4@gmail.com'
});

// Inizializza client Google Calendar
let calendarClient: CalendarClient;

try {
  calendarClient = new CalendarClient(CONFIG.credentialsPath, CONFIG.calendarId);
  console.log('✅ Google Calendar client initialized');
  console.log(`📅 Calendar: ${CONFIG.calendarId}\n`);
} catch (error: any) {
  console.error('❌ Error initializing Google Calendar client:', error.message);
  console.error('\n💡 Make sure you have:');
  console.error('  1. Created service-account.json in credentials/');
  console.error('  2. Shared your calendar with the service account email\n');
  process.exit(1);
}

// ============================================================================
// TOOL 1: Check Availability
// ============================================================================

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
      console.log(`📅 Checking availability for ${date}...`);

      // Valida formato data
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return text('Formato data non valido. Usa YYYY-MM-DD (es: 2025-12-10)');
      }

      // Ottieni periodi occupati
      const busyPeriods = await calendarClient.getBusyPeriods(date);
      console.log(`  Found ${busyPeriods.length} busy periods`);

      // Calcola slot disponibili
      const allSlots = calendarClient.calculateAvailableSlots(
        date,
        busyPeriods,
        { start: '09:00', end: '18:00' },
        duration
      );

      // Filtra per preferenza oraria
      let slots = allSlots.filter(s => s.available);

      if (preferred_time === 'morning') {
        slots = slots.filter(s => {
          const hour = new Date(s.start).getHours();
          return hour >= 9 && hour < 13;
        });
      } else if (preferred_time === 'afternoon') {
        slots = slots.filter(s => {
          const hour = new Date(s.start).getHours();
          return hour >= 14 && hour < 18;
        });
      }

      console.log(`  Found ${slots.length} available slots\n`);

      // Formatta risposta
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
        message: slots.length > 0
          ? `Ho trovato ${slots.length} slot disponibili per il ${date}`
          : `Nessuno slot disponibile per il ${date}`
      });

    } catch (error: any) {
      console.error('❌ Error checking availability:', error.message);
      return text(`Error: ${error.message}`);
    }
  }
});

// ============================================================================
// TOOL 2: Book Appointment
// ============================================================================

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
      console.log(`📝 Booking appointment for ${params.customer_name}...`);

      // Valida che la data sia nel futuro
      const appointmentTime = new Date(params.datetime);
      const now = new Date();

      if (appointmentTime <= now) {
        return text('La data deve essere nel futuro');
      }

      // Crea evento
      const event = await calendarClient.createEvent({
        datetime: params.datetime,
        duration: params.duration || 30,
        customerName: params.customer_name,
        customerPhone: params.customer_phone,
        customerEmail: params.customer_email,
        notes: params.notes
      });

      console.log(`  ✅ Event created: ${event.id}\n`);

      return object({
        success: true,
        booking_id: event.id,
        event_link: event.htmlLink,
        start_time: params.datetime,
        customer: params.customer_name,
        message: `Appuntamento confermato per ${params.customer_name} il ${appointmentTime.toLocaleString('it-IT', { timeZone: CONFIG.timezone })}`
      });

    } catch (error: any) {
      console.error('❌ Error booking appointment:', error.message);
      return text(`Error: ${error.message}`);
    }
  }
});

// ============================================================================
// TOOL 3: Get Today's Appointments
// ============================================================================

server.tool({
  name: 'get_todays_appointments',
  description: 'Ottieni tutti gli appuntamenti di oggi',
  schema: z.object({}),
  cb: async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      console.log(`📋 Getting appointments for today (${today})...`);

      const busyPeriods = await calendarClient.getBusyPeriods(today);

      console.log(`  Found ${busyPeriods.length} appointments\n`);

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
      console.error('❌ Error getting appointments:', error.message);
      return text(`Error: ${error.message}`);
    }
  }
});

// ============================================================================
// START SERVER
// ============================================================================

await server.listen(CONFIG.port);

console.log(`
╔════════════════════════════════════════════════════════════════╗
║         🚀 DeepAgent Calendar MCP Server READY                ║
╚════════════════════════════════════════════════════════════════╝

📍 Server Info:
   Port:      ${CONFIG.port}
   Calendar:  ${CONFIG.calendarId}
   Timezone:  ${CONFIG.timezone}

🔍 Inspector:
   http://localhost:${CONFIG.port}/inspector

   Qui puoi testare i tools interattivamente!

🛠️  Available Tools:
   1. check_availability     - Controlla disponibilità
   2. book_appointment       - Prenota appuntamento
   3. get_todays_appointments - Vedi appuntamenti oggi

📝 Example Usage:

   Check availability:
   {
     "date": "2025-12-10",
     "preferred_time": "morning"
   }

   Book appointment:
   {
     "datetime": "2025-12-10T10:00:00+01:00",
     "customer_name": "Mario Rossi",
     "customer_phone": "+39 333 1234567",
     "duration": 30
   }

Ready to accept connections! 🎉
`);
