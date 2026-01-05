import { describe, it, expect } from 'vitest';
import { encryptData, decryptData } from '../crypto';

const isBrowser = typeof window !== 'undefined' && typeof indexedDB !== 'undefined';

describe.skipIf(!isBrowser)('crypto utilities', () => {
  it('should encrypt and decrypt data successfully', async () => {
    const originalData = {
      mood: 'happy',
      note: 'Feeling great today!',
      timestamp: Date.now(),
    };

    const encrypted = await encryptData(originalData);
    expect(encrypted).toBeDefined();
    expect(typeof encrypted).toBe('string');
    expect(encrypted).not.toEqual(JSON.stringify(originalData));

    const decrypted = await decryptData(encrypted);
    expect(decrypted).toEqual(originalData);
  });

  it('should handle empty objects', async () => {
    const originalData = {};
    const encrypted = await encryptData(originalData);
    const decrypted = await decryptData(encrypted);
    expect(decrypted).toEqual(originalData);
  });

  it('should throw error for invalid encrypted data', async () => {
    await expect(decryptData('invalid-encrypted-data')).rejects.toThrow();
  });
});
