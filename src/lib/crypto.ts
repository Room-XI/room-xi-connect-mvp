// Enhanced crypto utilities for offline queue encryption (Fix for R-02: Check-in Data Sensitivity)

/**
 * Generate a device-specific encryption key for offline data
 * This key is stored in IndexedDB and used to encrypt sensitive offline data
 */
export async function generateDeviceKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Store the device key in IndexedDB
 */
export async function storeDeviceKey(key: CryptoKey): Promise<void> {
  const keyData = await crypto.subtle.exportKey('raw', key);
  const keyArray = new Uint8Array(keyData);
  
  // Store in IndexedDB
  const request = indexedDB.open('room-xi-crypto', 1);
  
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['keys'], 'readwrite');
      const store = transaction.objectStore('keys');
      
      store.put(keyArray, 'device-key');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('keys')) {
        db.createObjectStore('keys');
      }
    };
  });
}

/**
 * Retrieve the device key from IndexedDB
 */
export async function getDeviceKey(): Promise<CryptoKey | null> {
  const request = indexedDB.open('room-xi-crypto', 1);
  
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = async () => {
      const db = request.result;
      
      if (!db.objectStoreNames.contains('keys')) {
        resolve(null);
        return;
      }
      
      const transaction = db.transaction(['keys'], 'readonly');
      const store = transaction.objectStore('keys');
      const getRequest = store.get('device-key');
      
      getRequest.onsuccess = async () => {
        if (!getRequest.result) {
          resolve(null);
          return;
        }
        
        try {
          const keyData = getRequest.result;
          const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'AES-GCM' },
            true,
            ['encrypt', 'decrypt']
          );
          resolve(key);
        } catch (error) {
          console.error('Error importing device key:', error);
          resolve(null);
        }
      };
      
      getRequest.onerror = () => resolve(null);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('keys')) {
        db.createObjectStore('keys');
      }
    };
  });
}

/**
 * Get or create the device encryption key
 */
export async function getOrCreateDeviceKey(): Promise<CryptoKey> {
  let key = await getDeviceKey();
  
  if (!key) {
    key = await generateDeviceKey();
    await storeDeviceKey(key);
  }
  
  return key;
}

/**
 * Encrypt data using AES-GCM with the device key
 */
export async function encryptData(data: any): Promise<string> {
  try {
    const key = await getOrCreateDeviceKey();
    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonString);
    
    // Generate a random IV for each encryption
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      dataBuffer
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);
    
    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Error encrypting data:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-GCM with the device key
 */
export async function decryptData(encryptedData: string): Promise<any> {
  try {
    const key = await getOrCreateDeviceKey();
    
    // Convert from base64
    const combined = new Uint8Array(
      atob(encryptedData)
        .split('')
        .map(char => char.charCodeAt(0))
    );
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);
    
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error decrypting data:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Securely clear the device key (for account deletion)
 */
export async function clearDeviceKey(): Promise<void> {
  const request = indexedDB.open('room-xi-crypto', 1);
  
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      
      if (!db.objectStoreNames.contains('keys')) {
        resolve();
        return;
      }
      
      const transaction = db.transaction(['keys'], 'readwrite');
      const store = transaction.objectStore('keys');
      
      store.delete('device-key');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
  });
}
