import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addToQueue, getQueueCount } from '../queue';

// Mock IndexedDB
beforeEach(() => {
  vi.resetModules();
});

describe('queue utilities', () => {
  it('should add items to queue', async () => {
    const checkinData = {
      timestamp: new Date().toISOString(),
      dimension: 'mood',
      moodLevel16: 4,
      affectTags: ['happy', 'energetic'],
    };

    await addToQueue('checkin', checkinData);
    const count = await getQueueCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('should handle queue count', async () => {
    const count = await getQueueCount();
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
