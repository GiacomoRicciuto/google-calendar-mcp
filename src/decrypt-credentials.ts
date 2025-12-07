// Decrypt credentials at startup if CREDENTIALS_KEY is provided
import { createDecipheriv, pbkdf2Sync, createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';

export function decryptCredentials(): void {
  const credentialsKey = process.env.CREDENTIALS_KEY;

  // If no CREDENTIALS_KEY, skip decryption (use other credential methods)
  if (!credentialsKey) {
    console.log('ℹ️  No CREDENTIALS_KEY found, skipping decryption');
    return;
  }

  const encryptedPath = './credentials/service-account.json.enc';
  const decryptedPath = './credentials/service-account.json';

  // Check if encrypted file exists
  if (!existsSync(encryptedPath)) {
    console.error(`❌ Encrypted credentials file not found: ${encryptedPath}`);
    return;
  }

  // Check if already decrypted
  if (existsSync(decryptedPath)) {
    console.log('✅ Credentials already decrypted');
    return;
  }

  try {
    console.log('🔓 Decrypting credentials...');

    // Read encrypted file
    const encrypted = readFileSync(encryptedPath);

    // OpenSSL compatible decryption
    // Extract salt (first 16 bytes after "Salted__")
    const salt = encrypted.subarray(8, 16);
    const ciphertext = encrypted.subarray(16);

    // Derive key and IV using pbkdf2 (matching openssl's default)
    const keyIv = pbkdf2Sync(credentialsKey, salt, 10000, 48, 'md5');
    const key = keyIv.subarray(0, 32);
    const iv = keyIv.subarray(32, 48);

    // Decrypt
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);

    // Write decrypted file
    writeFileSync(decryptedPath, decrypted);

    console.log('✅ Credentials decrypted successfully');

    // Set the credentials path for the app to use
    process.env.GOOGLE_CREDENTIALS_PATH = decryptedPath;

  } catch (error: any) {
    console.error('❌ Failed to decrypt credentials:', error.message);
    throw error;
  }
}
