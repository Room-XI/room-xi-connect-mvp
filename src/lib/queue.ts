import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { encryptData, decryptData } from './crypto';
import api from './api';
import { useState, useEffect } from 'react';

// Fix for R-03: Inadequate Offline Feedback - Enhanced queue with retry logic and status tracking

interface CheckinData {
  timestamp: string;
  dimension: string;
  moodLevel16: number;
  affectTags: string[];
  note?: string;
  localTz?: string;
}

interface AttendanceData {
  programId: string;
  xidId: string;
  timestamp: string;
  method: 'qr' | 'manual';
}

interface ProgramData {
  programId: string;
}

type QueueData = CheckinData | AttendanceData | ProgramData;

interface QueueItem {
  id: string;
  type: 'checkin' | 'attendance' | 'save_program' | 'unsave_program';
  data: QueueData | string; // string when encrypted
  timestamp: number;
  tries: number; // Track retry attempts
  encrypted: boolean;
  lastError?: string;
}

interface QueueDB extends DBSchema {
  queue: {
    key: string;
    value: QueueItem;
  };
}

const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000]; // Progressive backoff

let db: IDBPDatabase<QueueDB> | null = null;
let syncInProgress = false;
let queueListeners: Array<(count: number) => void> = [];

/**
 * Initialize the offline queue database
 */
async function initDB(): Promise<IDBPDatabase<QueueDB>> {
  if (db) return db;
  
  db = await openDB<QueueDB>('room-xi-queue', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('queue')) {
        const store = db.createObjectStore('queue', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('type', 'type');
      }
    },
  });
  
  return db;
}

/**
 * Add an item to the offline queue with encryption
 */
export async function addToQueue(
  type: QueueItem['type'],
  data: QueueData
): Promise<void> {
  try {
    const database = await initDB();
    const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Encrypt sensitive data (Fix for R-02: Check-in Data Sensitivity)
    const encryptedData = await encryptData(data);
    
    const item: QueueItem = {
      id,
      type,
      data: encryptedData,
      timestamp: Date.now(),
      tries: 0,
      encrypted: true,
    };
    
    await database.add('queue', item);
    notifyQueueListeners();
    
    // Attempt immediate sync if online
    if (navigator.onLine) {
      setTimeout(() => syncQueue(), 100);
    }
  } catch (error) {
    console.error('Error adding item to queue:', error);
    throw error;
  }
}

/**
 * Get the current queue count for UI indicators
 */
export async function getQueueCount(): Promise<number> {
  try {
    const database = await initDB();
    return await database.count('queue');
  } catch (error) {
    console.error('Error getting queue count:', error);
    return 0;
  }
}

/**
 * Get all queue items for debugging/status display
 */
export async function getQueueItems(): Promise<QueueItem[]> {
  try {
    const database = await initDB();
    return await database.getAll('queue');
  } catch (error) {
    console.error('Error getting queue items:', error);
    return [];
  }
}

/**
 * Process a single queue item
 */
async function processQueueItem(item: QueueItem): Promise<boolean> {
  try {
    // Decrypt the data
    const data = item.encrypted ? await decryptData(item.data) : item.data;
    
    switch (item.type) {
      case 'checkin': {
        const checkinData = data as CheckinData;
        await api.checkins.create({
          timestamp: checkinData.timestamp,
          dimension: checkinData.dimension,
          moodLevel16: checkinData.moodLevel16,
          affectTags: checkinData.affectTags,
          note: checkinData.note,
          localTz: checkinData.localTz,
        });
        break;
      }
        
      case 'attendance': {
        const attendanceData = data as AttendanceData;
        await api.xid.recordAttendance(attendanceData.programId, attendanceData.method);
        break;
      }
        
      case 'save_program': {
        const programData = data as ProgramData;
        await api.programs.save(programData.programId);
        break;
      }
        
      case 'unsave_program': {
        const programData = data as ProgramData;
        await api.programs.unsave(programData.programId);
        break;
      }
        
      default:
        console.warn('Unknown queue item type:', item.type);
        return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error processing queue item ${item.id}:`, error);
    return false;
  }
}

/**
 * Sync the offline queue with the server
 */
export async function syncQueue(): Promise<void> {
  if (syncInProgress || !navigator.onLine) {
    return;
  }
  
  syncInProgress = true;
  
  try {
    const database = await initDB();
    const items = await database.getAll('queue');
    
    if (items.length === 0) {
      return;
    }
    
    console.log(`Syncing ${items.length} queued items...`);
    
    for (const item of items) {
      // Skip items that have exceeded max retries
      if (item.tries >= MAX_RETRIES) {
        console.warn(`Item ${item.id} exceeded max retries, flagging for manual review`);
        // Update the item with error status but don't delete it
        await database.put('queue', {
          ...item,
          lastError: 'Max retries exceeded',
        });
        continue;
      }
      
      const success = await processQueueItem(item);
      
      if (success) {
        // Remove successfully processed item
        await database.delete('queue', item.id);
        console.log(`Successfully synced item ${item.id}`);
      } else {
        // Increment retry count and update last error
        const updatedItem = {
          ...item,
          tries: item.tries + 1,
          lastError: 'Sync failed',
        };
        await database.put('queue', updatedItem);
        
        // Schedule retry with progressive backoff
        if (updatedItem.tries < MAX_RETRIES) {
          const delay = RETRY_DELAYS[Math.min(updatedItem.tries - 1, RETRY_DELAYS.length - 1)];
          setTimeout(() => {
            if (navigator.onLine) {
              syncQueue();
            }
          }, delay);
        }
      }
    }
    
    notifyQueueListeners();
  } catch (error) {
    console.error('Error syncing queue:', error);
  } finally {
    syncInProgress = false;
  }
}

/**
 * Clear all queue items (for account deletion)
 */
export async function clearQueue(): Promise<void> {
  try {
    const database = await initDB();
    await database.clear('queue');
    notifyQueueListeners();
  } catch (error) {
    console.error('Error clearing queue:', error);
  }
}

/**
 * Subscribe to queue count changes for UI updates
 */
export function subscribeToQueue(callback: (count: number) => void): () => void {
  queueListeners.push(callback);
  
  // Immediately call with current count
  getQueueCount().then(callback);
  
  // Return unsubscribe function
  return () => {
    const index = queueListeners.indexOf(callback);
    if (index > -1) {
      queueListeners.splice(index, 1);
    }
  };
}

/**
 * Notify all queue listeners of count changes
 */
async function notifyQueueListeners(): Promise<void> {
  const count = await getQueueCount();
  queueListeners.forEach(callback => callback(count));
}

/**
 * React hook for queue status
 */
export function useQueue() {
  const [itemCount, setItemCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    // Subscribe to queue changes
    const unsubscribe = subscribeToQueue(setItemCount);
    
    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      syncQueue();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial sync if online
    if (navigator.onLine) {
      syncQueue();
    }
    
    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return {
    itemCount,
    isOnline,
    sync: syncQueue,
  };
}

// Auto-sync when coming back online
window.addEventListener('online', () => {
  setTimeout(() => syncQueue(), 1000);
});
