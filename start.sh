#!/bin/bash
# Startup script that decrypts credentials and starts the server

set -e

echo "🔐 Starting deepagent-calendar-mcp..."

# Decrypt credentials if CREDENTIALS_KEY is set
if [ -n "$CREDENTIALS_KEY" ]; then
  echo "🔓 Decrypting credentials..."
  ./decrypt-credentials.sh
  export GOOGLE_CREDENTIALS_PATH="./credentials/service-account.json"
fi

# Start the server
echo "🚀 Starting server..."
node dist/index.js
