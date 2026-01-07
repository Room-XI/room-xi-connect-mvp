/**
 * 7-Day Mood Orb System
 * Implements the gradient visualization for mood tracking
 * As per mood_orb_system_spec.md
 */

import { db } from '../db.js';
import { checkins } from '../schema.js';
import { eq, and, gte, sql } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { applyDPToMoodDistribution, logDPApplication } from './differentialPrivacy.js';
import logger from '../logger.ts';

// Mood levels mapping (1-6 scale)
const MOOD_LEVELS = {
  1: 'Cold',
  2: 'Stormy',
  3: 'Foggy',
  4: 'Clear',
  5: 'Breezy',
  6: 'Aurora'
};

// Color values for each mood (HSL format)
const MOOD_COLORS = {
  Cold: { h: 210, s: 60, l: 45 },     // Blue
  Stormy: { h: 270, s: 55, l: 40 },   // Purple
  Foggy: { h: 200, s: 20, l: 60 },    // Gray-blue
  Clear: { h: 60, s: 50, l: 60 },     // Yellow
  Breezy: { h: 120, s: 45, l: 55 },   // Green
  Aurora: { h: 330, s: 65, l: 55 }    // Pink-purple
};

/**
 * Get 7-day mood data for a user
 * @param {string} userId - User ID
 * @param {string} timezone - User's timezone (default: America/Edmonton)
 * @returns {object} 7-day mood orb data
 */
export async function get7DayMoodOrb(userId, timezone = 'America/Edmonton') {
  try {
    const now = DateTime.now().setZone(timezone);
    const sevenDaysAgo = now.minus({ days: 7 }).startOf('day');
    
    // Fetch check-ins from the last 7 days
    const recentCheckins = await db
      .select({
        moodLevel: checkins.moodLevel16,
        timestamp: checkins.timestamp,
        affectTags: checkins.affectTags,
      })
      .from(checkins)
      .where(and(
        eq(checkins.userId, userId),
        gte(checkins.timestamp, sevenDaysAgo.toJSDate())
      ))
      .orderBy(checkins.timestamp);
    
    // Count moods by level
    const moodCounts = {
      Cold: 0,
      Stormy: 0,
      Foggy: 0,
      Clear: 0,
      Breezy: 0,
      Aurora: 0
    };
    
    let totalCheckins = 0;
    let streakDays = 0;
    const dailyCheckins = {};
    
    // Process check-ins
    recentCheckins.forEach(checkin => {
      const moodName = MOOD_LEVELS[checkin.moodLevel] || 'Foggy';
      moodCounts[moodName]++;
      totalCheckins++;
      
      // Track daily check-ins for streak
      const day = DateTime.fromJSDate(checkin.timestamp)
        .setZone(timezone)
        .toISODate();
      dailyCheckins[day] = true;
    });
    
    // Calculate streak (consecutive days with check-ins)
    for (let i = 0; i < 7; i++) {
      const day = now.minus({ days: i }).toISODate();
      if (dailyCheckins[day]) {
        streakDays++;
      } else if (i > 0) {
        break; // Streak broken
      }
    }
    
    // Calculate ratios (with privacy protection)
    const distribution = totalCheckins > 0
      ? applyDPToMoodDistribution(moodCounts, totalCheckins)
      : { suppressed: true, reason: 'No check-ins in last 7 days' };
    
    // Determine dominant mood
    let dominantMood = 'Foggy';
    let maxCount = 0;
    
    if (!distribution.suppressed) {
      for (const [mood, count] of Object.entries(distribution.noisyCounts)) {
        if (count > maxCount) {
          maxCount = count;
          dominantMood = mood;
        }
      }
    }
    
    // Calculate variance (how varied the moods are)
    const variance = calculateMoodVariance(distribution);
    
    // Log DP application
    if (distribution.noiseAdded) {
      logDPApplication('7day_mood_orb', {
        userId,
        totalCheckins,
        ...distribution
      });
    }
    
    return {
      // Core orb data
      distribution: distribution.suppressed ? null : distribution.ratios,
      dominantMood,
      dominantColor: MOOD_COLORS[dominantMood],
      
      // Metadata
      streakDays,
      totalCheckins,
      variance,
      
      // Rendering hints
      opacity: calculateOpacities(distribution),
      ambientIntensity: 0.25, // 25% ambient background
      
      // Privacy metadata
      privacyApplied: distribution.noiseAdded || distribution.suppressed,
      suppressed: distribution.suppressed,
      suppressionReason: distribution.suppressionReason,
      
      // Timestamp
      calculatedAt: now.toISO(),
      timezone
    };
  } catch (error) {
    logger.error({ err: error, context: 'mood-orb-calculate' }, 'Error calculating 7-day mood orb');
    throw error;
  }
}

/**
 * Calculate opacity values for each mood based on ratios
 * Opacity = clamp(0.3 + ratio, 0.3, 0.9)
 */
function calculateOpacities(distribution) {
  if (distribution.suppressed) {
    return null;
  }
  
  const opacities = {};
  
  for (const [mood, ratio] of Object.entries(distribution.ratios)) {
    // Clamp between 0.3 and 0.9
    opacities[mood] = Math.min(0.9, Math.max(0.3, 0.3 + ratio));
  }
  
  return opacities;
}

/**
 * Calculate mood variance (0-1, where 1 is maximum variety)
 */
function calculateMoodVariance(distribution) {
  if (distribution.suppressed || !distribution.ratios) {
    return 0;
  }
  
  const ratios = Object.values(distribution.ratios);
  const n = ratios.length;
  
  if (n === 0) return 0;
  
  // Calculate entropy as a measure of variance
  let entropy = 0;
  for (const ratio of ratios) {
    if (ratio > 0) {
      entropy -= ratio * Math.log2(ratio);
    }
  }
  
  // Normalize to 0-1 range
  const maxEntropy = Math.log2(n);
  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}

/**
 * Get weekly snapshot for a user (Sunday 8:00 AM)
 * @param {string} userId - User ID
 * @param {Date} weekDate - Any date in the target week
 */
export async function getWeeklySnapshot(userId, weekDate = new Date()) {
  const timezone = 'America/Edmonton';
  const targetDate = DateTime.fromJSDate(weekDate).setZone(timezone);
  
  // Find the Sunday of that week
  const sunday = targetDate.startOf('week');
  const snapshotTime = sunday.set({ hour: 8, minute: 0, second: 0 });
  
  // Get 7-day orb data as of that Sunday
  const weekStart = snapshotTime.minus({ days: 7 });
  const weekEnd = snapshotTime;
  
  const weekCheckins = await db
    .select({
      moodLevel: checkins.moodLevel16,
      timestamp: checkins.timestamp,
    })
    .from(checkins)
    .where(and(
      eq(checkins.userId, userId),
      gte(checkins.timestamp, weekStart.toJSDate()),
      sql`${checkins.timestamp} < ${weekEnd.toJSDate()}`
    ));
  
  // Process weekly data
  const moodCounts = {
    Cold: 0,
    Stormy: 0,
    Foggy: 0,
    Clear: 0,
    Breezy: 0,
    Aurora: 0
  };
  
  weekCheckins.forEach(checkin => {
    const moodName = MOOD_LEVELS[checkin.moodLevel] || 'Foggy';
    moodCounts[moodName]++;
  });
  
  return {
    weekOf: sunday.toISODate(),
    snapshotTime: snapshotTime.toISO(),
    moodCounts,
    totalCheckins: weekCheckins.length,
    timezone
  };
}

/**
 * Get 30-day time lapse data for reflection
 * Returns weekly snapshots for the last 4 weeks
 */
export async function get30DayTimeLapse(userId) {
  const snapshots = [];
  const now = DateTime.now().setZone('America/Edmonton');
  
  // Get snapshots for the last 4 Sundays
  for (let i = 0; i < 4; i++) {
    const weekDate = now.minus({ weeks: i }).toJSDate();
    const snapshot = await getWeeklySnapshot(userId, weekDate);
    snapshots.push(snapshot);
  }
  
  return {
    snapshots: snapshots.reverse(), // Oldest first
    generatedAt: now.toISO(),
    userId
  };
}

/**
 * Export orb data for transparency dashboard
 * Applies DP before export
 */
export async function exportOrbDataForTransparency() {
  const timezone = 'America/Edmonton';
  const now = DateTime.now().setZone(timezone);
  const sevenDaysAgo = now.minus({ days: 7 }).startOf('day');
  
  // Get aggregate mood distribution across all users
  const [aggregateData] = await db
    .select({
      cold: sql`count(*) filter (where mood_level_1_6 = 1)::int`,
      stormy: sql`count(*) filter (where mood_level_1_6 = 2)::int`,
      foggy: sql`count(*) filter (where mood_level_1_6 = 3)::int`,
      clear: sql`count(*) filter (where mood_level_1_6 = 4)::int`,
      breezy: sql`count(*) filter (where mood_level_1_6 = 5)::int`,
      aurora: sql`count(*) filter (where mood_level_1_6 = 6)::int`,
      total: sql`count(*)::int`,
    })
    .from(checkins)
    .where(gte(checkins.timestamp, sevenDaysAgo.toJSDate()));
  
  const moodCounts = {
    Cold: aggregateData.cold || 0,
    Stormy: aggregateData.stormy || 0,
    Foggy: aggregateData.foggy || 0,
    Clear: aggregateData.clear || 0,
    Breezy: aggregateData.breezy || 0,
    Aurora: aggregateData.aurora || 0
  };
  
  // Apply DP
  const distribution = applyDPToMoodDistribution(moodCounts, aggregateData.total || 0);
  
  return {
    period: '7_days',
    startDate: sevenDaysAgo.toISODate(),
    endDate: now.toISODate(),
    distribution: distribution.suppressed ? 'suppressed' : distribution.ratios,
    totalParticipants: distribution.suppressed ? 'suppressed' : distribution.totalCount,
    privacyNotice: 'Data includes differential privacy noise for user protection',
    suppressionReason: distribution.suppressionReason,
    exportedAt: now.toISO()
  };
}

export default {
  get7DayMoodOrb,
  getWeeklySnapshot,
  get30DayTimeLapse,
  exportOrbDataForTransparency,
  MOOD_LEVELS,
  MOOD_COLORS
};