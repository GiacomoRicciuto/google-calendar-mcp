# Deploy MCP Calendar Server

## Option 1: Deno Deploy (Recommended - works with mcp-use)

### Steps:

1. **Install Deno CLI** (if not already installed):
   ```bash
   curl -fsSL https://deno.land/install.sh | sh
   ```

2. **Install deployctl**:
   ```bash
   deno install -Arf jsr:@deno/deployctl
   ```

3. **Create a Deno Deploy account**:
   - Go to https://dash.deno.com
   - Sign up with GitHub

4. **Get your Google credentials as a single-line JSON**:
   ```bash
   cat credentials/service-account.json | jq -c
   ```
   Copy the output (it will be one long line of JSON)

5. **Deploy**:
   ```bash
   deployctl deploy --project=deepagent-calendar deno-deploy.ts \
     --env CALENDAR_ID=giacomo.ricciuto4@gmail.com \
     --env TIMEZONE=Europe/Rome \
     --env GOOGLE_CREDENTIALS='{"type":"service_account",...}'
   ```
   (Replace the GOOGLE_CREDENTIALS value with your actual JSON from step 4)

6. **Your HTTPS URL will be**:
   ```
   https://deepagent-calendar.deno.dev
   ```

7. **Use with ElevenLabs**:
   - MCP Endpoint: `https://deepagent-calendar.deno.dev/mcp`

---

## Option 2: Cloudflare Workers (also supported by mcp-use)

### Create worker file:

Already created! Use the Cloudflare dashboard to deploy.

### Steps:

1. **Install Wrangler**:
   ```bash
   npm install -g wrangler
   ```

2. **Login**:
   ```bash
   wrangler login
   ```

3. **Deploy**:
   ```bash
   wrangler deploy
   ```

4. **Set environment variables** in Cloudflare dashboard:
   - `CALENDAR_ID`
   - `TIMEZONE`
   - `GOOGLE_CREDENTIALS`

---

## Option 3: Use ngrok for quick testing

```bash
# Terminal 1
npm start

# Terminal 2
ngrok http 3001
```

Then use the ngrok HTTPS URL with ElevenLabs.

---

## Recommended for ElevenLabs

**Deno Deploy** is the best option because:
- ✅ Native mcp-use support
- ✅ Free tier with generous limits
- ✅ Auto HTTPS
- ✅ Global edge network
- ✅ Zero config deployment
- ✅ Environment variables support

Your MCP endpoint will be: `https://your-project.deno.dev/mcp`
