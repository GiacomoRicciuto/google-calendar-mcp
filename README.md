# Google Calendar MCP Server

MCP (Model Context Protocol) server for managing Google Calendar appointments via AI agents like ElevenLabs.

## Features

- ✅ Check calendar availability for specific dates
- ✅ Book appointments with customer details
- ✅ View today's appointments
- ✅ Support for morning/afternoon time preferences
- ✅ Automatic slot calculation (30-minute intervals, 9 AM - 6 PM)

## Setup

### Prerequisites

- Node.js 18+ or Deno
- Google Calendar API credentials (service account)
- Calendar shared with service account email

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/GiacomoRicciuto/google-calendar-mcp.git
   cd google-calendar-mcp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Add Google credentials:**
   - Place your service account JSON file in `credentials/service-account.json`
   - Share your Google Calendar with the service account email

5. **Build and run:**
   ```bash
   npm run build
   npm start
   ```

6. **Test the server:**
   ```bash
   # In another terminal
   node test-client.mjs
   ```

The server will be available at:
- MCP endpoint: `http://localhost:3001/mcp`
- Inspector UI: `http://localhost:3001/inspector`

## Available Tools

### 1. check_availability

Check calendar availability for a specific date.

**Parameters:**
- `date` (required): Date in YYYY-MM-DD format (e.g., "2025-12-10")
- `duration` (optional): Appointment duration in minutes (default: 30)
- `preferred_time` (optional): "morning", "afternoon", or "any" (default: "any")

**Example:**
```json
{
  "date": "2025-12-10",
  "duration": 30,
  "preferred_time": "morning"
}
```

### 2. book_appointment

Book an appointment in the calendar.

**Parameters:**
- `datetime` (required): ISO datetime (e.g., "2025-12-10T10:00:00+01:00")
- `customer_name` (required): Customer name
- `customer_phone` (required): Customer phone number
- `customer_email` (optional): Customer email
- `duration` (optional): Duration in minutes (default: 30)
- `notes` (optional): Additional notes

**Example:**
```json
{
  "datetime": "2025-12-10T10:00:00+01:00",
  "customer_name": "Mario Rossi",
  "customer_phone": "+39 333 1234567",
  "customer_email": "mario@example.com",
  "duration": 30,
  "notes": "First appointment"
}
```

### 3. get_todays_appointments

Get all appointments for today.

**Parameters:** None

## Deployment

### Option 1: Deno Deploy (Recommended)

```bash
# Install Deno and deployctl
curl -fsSL https://deno.land/install.sh | sh
deno install -Arf jsr:@deno/deployctl

# Deploy
deployctl deploy --project=deepagent-calendar deno-deploy.ts
```

Set environment variables in Deno Deploy dashboard:
- `CALENDAR_ID`
- `TIMEZONE`
- `GOOGLE_CREDENTIALS` (JSON string)

### Option 2: ngrok (Quick Testing)

```bash
npm start
# In another terminal:
ngrok http 3001
```

Use the ngrok HTTPS URL with ElevenLabs or other AI agents.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CALENDAR_ID` | Google Calendar email | `giacomo.ricciuto4@gmail.com` |
| `TIMEZONE` | Calendar timezone | `Europe/Rome` |
| `PORT` | Server port | `3001` |
| `GOOGLE_CREDENTIALS_PATH` | Path to credentials JSON | `./credentials/service-account.json` |
| `NODE_ENV` | Environment | `development` |

## Google Calendar Setup

1. Create a service account in Google Cloud Console
2. Enable Google Calendar API
3. Download the service account JSON credentials
4. Share your Google Calendar with the service account email
5. Grant "Make changes to events" permission

## Integration with ElevenLabs

1. Deploy the server (use Deno Deploy or ngrok for HTTPS)
2. Get your MCP endpoint URL (e.g., `https://your-app.deno.dev/mcp`)
3. In ElevenLabs agent configuration, add the MCP server URL
4. The agent can now manage calendar appointments via voice

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build TypeScript
npm run build

# Test the MCP server
node test-client.mjs
```

## Project Structure

```
google-calendar-mcp/
├── src/
│   └── index.ts              # Main MCP server (Node.js)
├── credentials/
│   └── service-account.json  # Google credentials (gitignored)
├── deno-deploy.ts            # Deno Deploy entry point
├── test-client.mjs           # Test client
├── .env                      # Environment config (gitignored)
├── .env.example              # Example environment config
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT

## Author

DeepAgent - Giacomo Ricciuto
