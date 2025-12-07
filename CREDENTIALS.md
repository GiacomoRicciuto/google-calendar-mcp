# Encrypted Credentials Setup

This project uses encrypted credentials stored in the repository for secure deployment.

## How It Works

1. **Encrypted File**: `credentials/service-account.json.enc` is stored in the repository
2. **Decryption Key**: Set as `CREDENTIALS_KEY` environment variable in deployment
3. **Automatic Decryption**: The startup script decrypts credentials before starting the server

## Deployment Setup

### For mcp-use / Fly.io Deployment

Set these environment variables in your deployment:

```bash
CALENDAR_ID=giacomo.ricciuto4@gmail.com
TIMEZONE=Europe/Rome
CREDENTIALS_KEY=c59c474985b7829e4a72efc508ef3dc6c857e28ab5c8a7de0c12dd37aead8280
```

**IMPORTANT**: Keep `CREDENTIALS_KEY` secret! This is the key to decrypt your Google service account credentials.

### Using Fly.io CLI

```bash
fly secrets set CALENDAR_ID=giacomo.ricciuto4@gmail.com -a mcp-crimson-morning-9523
fly secrets set TIMEZONE=Europe/Rome -a mcp-crimson-morning-9523
fly secrets set CREDENTIALS_KEY=c59c474985b7829e4a72efc508ef3dc6c857e28ab5c8a7de0c12dd37aead8280 -a mcp-crimson-morning-9523
```

## How to Update Credentials

If you need to update the Google service account credentials:

1. **Update** the `credentials/service-account.json` file locally
2. **Re-encrypt** it:
   ```bash
   openssl enc -aes-256-cbc -salt -pbkdf2 \
     -in credentials/service-account.json \
     -out credentials/service-account.json.enc \
     -k "c59c474985b7829e4a72efc508ef3dc6c857e28ab5c8a7de0c12dd37aead8280"
   ```
3. **Commit** the new encrypted file:
   ```bash
   git add credentials/service-account.json.enc
   git commit -m "Update encrypted credentials"
   git push
   ```

## Security Notes

- ✅ The encrypted file (`.enc`) is safe to commit to Git
- ❌ Never commit the unencrypted `service-account.json` file
- ❌ Never expose the `CREDENTIALS_KEY` in public places
- ✅ The decryption key is only stored as an environment variable in deployment
- ✅ The unencrypted file is created temporarily at runtime and never committed

## Local Development

For local development, you can still use the unencrypted credentials file:

```bash
export CALENDAR_ID=giacomo.ricciuto4@gmail.com
export TIMEZONE=Europe/Rome
export GOOGLE_CREDENTIALS_PATH=./credentials/service-account.json

npm run dev
```

Or let the startup script decrypt it:

```bash
export CALENDAR_ID=giacomo.ricciuto4@gmail.com
export TIMEZONE=Europe/Rome
export CREDENTIALS_KEY=c59c474985b7829e4a72efc508ef3dc6c857e28ab5c8a7de0c12dd37aead8280

npm start
```
