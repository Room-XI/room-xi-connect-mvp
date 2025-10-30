import { DateTime } from 'luxon';

export interface StreakResult {
  newStreak: number;
  isConsecutive: boolean;
  daysSinceLastCheckin: number;
}

/**
 * Calculates the new streak count based on the user's timezone.
 * Uses Luxon's calendar-day comparison to handle DST transitions correctly.
 * 
 * @param lastCheckinDate - ISO string of last check-in (or null if first check-in)
 * @param currentStreak - Current streak count
 * @param userTimezone - User's timezone (e.g., 'America/Edmonton')
 * @param checkinTimestamp - ISO string of current check-in timestamp
 * @returns StreakResult with new streak count and metadata
 */
export function calculateStreak(
  lastCheckinDate: string | null,
  currentStreak: number,
  userTimezone: string,
  checkinTimestamp: string = new Date().toISOString()
): StreakResult {
  // Default timezone if not provided
  const tz = userTimezone || 'America/Edmonton';
  
  // First check-in ever
  if (!lastCheckinDate) {
    return {
      newStreak: 1,
      isConsecutive: false,
      daysSinceLastCheckin: 0,
    };
  }

  // Parse timestamps in user's local timezone
  const last = DateTime.fromISO(lastCheckinDate, { zone: tz });
  const now = DateTime.fromISO(checkinTimestamp, { zone: tz });

  // Validate parsed dates
  if (!last.isValid || !now.isValid) {
    console.error('Invalid dates provided to calculateStreak', {
      lastCheckinDate,
      checkinTimestamp,
      tz
    });
    // Default to resetting streak on invalid dates
    return {
      newStreak: 1,
      isConsecutive: false,
      daysSinceLastCheckin: 0,
    };
  }

  // Calculate difference in calendar days using startOf('day')
  // This is the key fix: startOf('day') ensures we're comparing calendar days
  // not 24-hour periods, which handles DST transitions correctly
  const lastDay = last.startOf('day');
  const nowDay = now.startOf('day');
  const daysDiff = nowDay.diff(lastDay, 'days').days;

  let newStreak = currentStreak || 0;
  let isConsecutive = false;

  if (daysDiff === 0) {
    // Same calendar day: streak unchanged
    newStreak = currentStreak;
    isConsecutive = false;
  } else if (daysDiff === 1) {
    // Consecutive day: increment streak
    newStreak = currentStreak + 1;
    isConsecutive = true;
  } else {
    // Missed day(s): reset streak to 1
    newStreak = 1;
    isConsecutive = false;
  }

  return {
    newStreak,
    isConsecutive,
    daysSinceLastCheckin: Math.floor(daysDiff),
  };
}

/**
 * Check if a check-in already exists for today in the user's timezone
 */
export function hasCheckedInToday(
  lastCheckinDate: string | null,
  userTimezone: string
): boolean {
  if (!lastCheckinDate) return false;

  const tz = userTimezone || 'America/Edmonton';
  const last = DateTime.fromISO(lastCheckinDate, { zone: tz });
  const now = DateTime.now().setZone(tz);

  if (!last.isValid) return false;

  // Compare calendar days
  return last.startOf('day').equals(now.startOf('day'));
}

/**
 * Get the local date string (YYYY-MM-DD) in user's timezone
 */
export function getLocalDateString(
  timestamp: string = new Date().toISOString(),
  userTimezone: string = 'America/Edmonton'
): string {
  const dt = DateTime.fromISO(timestamp, { zone: userTimezone });
  if (!dt.isValid) {
    return DateTime.now().setZone(userTimezone).toISODate() || '';
  }
  return dt.toISODate() || '';
}

/**
 * Example test cases for DST transitions:
 * 
 * Spring Forward (March 2025):
 * - Last check-in: March 8, 2025 11:59 PM MST
 * - Next check-in: March 9, 2025 1:01 AM MDT (DST starts at 2:00 AM)
 * - Result: Should count as consecutive (daysDiff = 1)
 * 
 * Fall Back (November 2025):
 * - Last check-in: November 1, 2025 11:59 PM MDT
 * - Next check-in: November 2, 2025 1:01 AM MST (DST ends at 2:00 AM)
 * - Result: Should count as consecutive (daysDiff = 1)
 * 
 * Without Luxon's startOf('day'), these would incorrectly calculate as
 * 25 hours or 23 hours, potentially breaking streaks.
 */
