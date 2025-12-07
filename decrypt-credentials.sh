#!/bin/bash
# Decrypt credentials at build/startup time

set -e

if [ -z "$CREDENTIALS_KEY" ]; then
  echo "Error: CREDENTIALS_KEY environment variable is required"
  exit 1
fi

echo "Decrypting credentials..."

# Decrypt the credentials file
openssl enc -aes-256-cbc -d -pbkdf2 \
  -in credentials/service-account.json.enc \
  -out credentials/service-account.json \
  -k "$CREDENTIALS_KEY"

echo "✅ Credentials decrypted successfully"
