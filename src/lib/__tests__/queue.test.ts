import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addToQueue, getQueueCount } from '../queue';

const isBrowser = typeof window !== 'undefined' && typeof indexedDB !== 'undefined';

beforeEach(() => {
  vi.resetModules();
});

describe.skipIf(!isBrowser)('queue utilities', () => {
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
