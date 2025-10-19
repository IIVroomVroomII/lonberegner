import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Get encryption key from environment variable
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 characters (32 bytes in hex)');
  }

  return Buffer.from(key, 'hex');
};

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param text Plain text to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext
 */
export const encrypt = (text: string): string => {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return in format: iv:authTag:ciphertext
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error: any) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
};

/**
 * Decrypt data encrypted with encrypt()
 * @param encryptedText Encrypted string in format: iv:authTag:ciphertext
 * @returns Decrypted plain text
 */
export const decrypt = (encryptedText: string): string => {
  try {
    const key = getEncryptionKey();

    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }

    const [ivHex, authTagHex, ciphertext] = parts;

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error: any) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
};

/**
 * Encrypt a JSON object
 * @param obj Object to encrypt
 * @returns Encrypted string
 */
export const encryptJSON = (obj: any): string => {
  return encrypt(JSON.stringify(obj));
};

/**
 * Decrypt a JSON object
 * @param encryptedText Encrypted string
 * @returns Decrypted object
 */
export const decryptJSON = (encryptedText: string): any => {
  const decrypted = decrypt(encryptedText);
  return JSON.parse(decrypted);
};

/**
 * Generate a new encryption key (for initial setup)
 * @returns 64-character hex string (32 bytes)
 */
export const generateEncryptionKey = (): string => {
  return crypto.randomBytes(32).toString('hex');
};
