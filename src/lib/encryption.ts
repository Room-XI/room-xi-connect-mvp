/**
 * Client-side encryption utilities for sensitive data
 * Uses Web Crypto API for AES-256-GCM encryption
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Generate a random encryption key
 * Note: In production, this should be derived from a secure source
 */
export async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Derive encryption key from password using PBKDF2
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    {
      name: ALGORITHM,
      length: KEY_LENGTH
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-256-GCM
 */
export async function encrypt(
  data: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const encrypted = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv
    },
    key,
    encoder.encode(data)
  );

  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv)
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
export async function decrypt(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const decoder = new TextDecoder();

  const decrypted = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: base64ToArrayBuffer(iv)
    },
    key,
    base64ToArrayBuffer(ciphertext)
  );

  return decoder.decode(decrypted);
}

/**
 * Encrypt case note for storage
 * Returns encrypted object ready for database
 */
export async function encryptCaseNote(
  note: string,
  key: CryptoKey
): Promise<{ encrypted_content: string; iv: string; algorithm: string }> {
  const { ciphertext, iv } = await encrypt(note, key);
  
  return {
    encrypted_content: ciphertext,
    iv,
    algorithm: ALGORITHM
  };
}

/**
 * Decrypt case note from storage
 */
export async function decryptCaseNote(
  encryptedNote: { encrypted_content: string; iv: string },
  key: CryptoKey
): Promise<string> {
  return await decrypt(encryptedNote.encrypted_content, encryptedNote.iv, key);
}

/**
 * Hash data using SHA-256
 */
export async function hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return arrayBufferToBase64(hashBuffer);
}

/**
 * Generate HMAC for data integrity
 */
export async function generateHMAC(
  data: string,
  key: CryptoKey
): Promise<string> {
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );
  return arrayBufferToBase64(signature);
}

/**
 * Verify HMAC
 */
export async function verifyHMAC(
  data: string,
  signature: string,
  key: CryptoKey
): Promise<boolean> {
  const encoder = new TextEncoder();
  return await crypto.subtle.verify(
    'HMAC',
    key,
    base64ToArrayBuffer(signature),
    encoder.encode(data)
  );
}

/**
 * Generate random salt for key derivation
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Generate random token for verification
 */
export function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return arrayBufferToBase64(array);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Export key to JSON Web Key format
 */
export async function exportKey(key: CryptoKey): Promise<JsonWebKey> {
  return await crypto.subtle.exportKey('jwk', key);
}

/**
 * Import key from JSON Web Key format
 */
export async function importKey(
  jwk: JsonWebKey,
  usages: KeyUsage[] = ['encrypt', 'decrypt']
): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: ALGORITHM,
      length: KEY_LENGTH
    },
    true,
    usages
  );
}

/**
 * Securely compare two strings in constant time
 * Prevents timing attacks
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return generateToken();
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string, expected: string): boolean {
  return constantTimeEqual(token, expected);
}

