import crypto from 'crypto';
import logger from '../logger.ts';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_SECRET must be set in production for PHIPA compliance');
    }
    const devFallback = crypto.createHash('sha256').update('room-xi-dev-encryption-key-DO-NOT-USE-IN-PRODUCTION').digest();
    return devFallback;
  }
  
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptHealthData(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined || plaintext === '') {
    return null;
  }
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    const ivBase64 = iv.toString('base64');
    const authTagBase64 = authTag.toString('base64');
    
    return `${ivBase64}:${authTagBase64}:${encrypted}`;
  } catch (error) {
    logger.error({ err: error, context: 'encryption' }, 'Encryption error');
    throw new Error('Failed to encrypt health data');
  }
}

export function decryptHealthData(encryptedValue: string | null | undefined): string | null {
  if (encryptedValue === null || encryptedValue === undefined || encryptedValue === '') {
    return null;
  }
  
  if (!encryptedValue.includes(':')) {
    return encryptedValue;
  }
  
  try {
    const parts = encryptedValue.split(':');
    if (parts.length !== 3) {
      return encryptedValue;
    }
    
    const [ivBase64, authTagBase64, encrypted] = parts;
    
    const key = getEncryptionKey();
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error({ err: error, context: 'decryption' }, 'Decryption error - data may be unencrypted or corrupted');
    return encryptedValue;
  }
}

export function encryptHealthProfile(profile: Record<string, any>): Record<string, any> {
  const fieldsToEncrypt = [
    'allergies',
    'medicalConditions',
    'medications',
    'accessibilityNeeds',
    'dietaryRestrictions'
  ];
  
  const encrypted = { ...profile };
  
  for (const field of fieldsToEncrypt) {
    if (field in encrypted) {
      encrypted[field] = encryptHealthData(encrypted[field]);
    }
  }
  
  return encrypted;
}

export function decryptHealthProfile(profile: Record<string, any> | null): Record<string, any> | null {
  if (!profile) return null;
  
  const fieldsToDecrypt = [
    'allergies',
    'medicalConditions',
    'medications',
    'accessibilityNeeds',
    'dietaryRestrictions'
  ];
  
  const decrypted = { ...profile };
  
  for (const field of fieldsToDecrypt) {
    if (field in decrypted) {
      decrypted[field] = decryptHealthData(decrypted[field]);
    }
  }
  
  return decrypted;
}
