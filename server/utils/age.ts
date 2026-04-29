import { DateTime } from 'luxon';

/**
 * Compute integer age in years from an ISO YYYY-MM-DD date of birth.
 * Returns null for invalid/future dates.
 */
export function calculateAge(dateOfBirth: string): number | null {
  const dob = DateTime.fromISO(dateOfBirth);
  if (!dob.isValid) return null;
  const age = Math.floor(DateTime.now().diff(dob, 'years').years);
  if (!Number.isFinite(age) || age < 0) return null;
  return age;
}
