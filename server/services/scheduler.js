import { DateTime } from 'luxon';
import { captureAllWeeklySnapshots } from '../routes/orbSnapshots.js';

// Store the interval ID for the scheduler
let schedulerInterval = null;

/**
 * Check if current time matches Sunday 08:00 America/Edmonton
 */
function shouldRunWeeklySnapshot() {
  const now = DateTime.now().setZone('America/Edmonton');
  
  // Check if it's Sunday (weekday 7 in Luxon) and around 08:00
  if (now.weekday === 7) { // Sunday
    const hour = now.hour;
    const minute = now.minute;
    
    // Run at 08:00-08:05 to account for small timing variations
    return hour === 8 && minute >= 0 && minute < 5;
  }
  
  return false;
}

/**
 * Calculate milliseconds until next Sunday 08:00 America/Edmonton
 */
function msUntilNextSundaySnapshot() {
  const now = DateTime.now().setZone('America/Edmonton');
  
  // Find next Sunday at 08:00
  let nextSunday = now.set({ hour: 8, minute: 0, second: 0, millisecond: 0 });
  
  // If we're already past Sunday 08:00, go to next week
  if (now.weekday === 7 && now.hour >= 8) {
    nextSunday = nextSunday.plus({ weeks: 1 });
  } else {
    // Calculate days until Sunday (weekday 7)
    const daysUntilSunday = (7 - now.weekday + 7) % 7 || 7;
    nextSunday = nextSunday.plus({ days: daysUntilSunday });
  }
  
  return nextSunday.diff(now).milliseconds;
}

/**
 * Run scheduled tasks
 */
async function runScheduledTasks() {
  try {
    console.log('[Scheduler] Checking scheduled tasks at', 
      DateTime.now().setZone('America/Edmonton').toString());
    
    // Check if we should run weekly snapshot
    if (shouldRunWeeklySnapshot()) {
      console.log('[Scheduler] Running weekly orb snapshots...');
      
      try {
        const result = await captureAllWeeklySnapshots();
        console.log('[Scheduler] Weekly snapshots completed:', result);
      } catch (error) {
        console.error('[Scheduler] Failed to capture weekly snapshots:', error);
      }
    }
  } catch (error) {
    console.error('[Scheduler] Error in scheduled tasks:', error);
  }
}

/**
 * Initialize the scheduler
 */
export function initializeScheduler() {
  if (schedulerInterval) {
    console.log('[Scheduler] Scheduler already initialized');
    return;
  }
  
  console.log('[Scheduler] Initializing scheduler...');
  
  // Calculate when the next snapshot should run
  const msUntilNext = msUntilNextSundaySnapshot();
  const nextRun = DateTime.now()
    .setZone('America/Edmonton')
    .plus({ milliseconds: msUntilNext });
    
  console.log(`[Scheduler] Next weekly snapshot scheduled for: ${nextRun.toString()}`);
  
  // Run the scheduler every 60 seconds to check if tasks need to run
  schedulerInterval = setInterval(runScheduledTasks, 60 * 1000); // Every minute
  
  // Run once on startup to check if we need to capture immediately
  runScheduledTasks();
  
  console.log('[Scheduler] Scheduler initialized successfully');
}

/**
 * Stop the scheduler
 */
export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Scheduler] Scheduler stopped');
  }
}

/**
 * Manually trigger weekly snapshots (for testing)
 */
export async function triggerWeeklySnapshots() {
  console.log('[Scheduler] Manually triggering weekly snapshots...');
  try {
    const result = await captureAllWeeklySnapshots();
    console.log('[Scheduler] Manual weekly snapshots completed:', result);
    return result;
  } catch (error) {
    console.error('[Scheduler] Failed to capture weekly snapshots:', error);
    throw error;
  }
}