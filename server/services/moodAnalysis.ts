/**
 * Mood Analysis Service
 * Detects significant mood changes and triggers Ximi support prompts
 * - 15% mood drop detection
 * - Weekly variance >0.4 detection
 * - 48-hour cooldown tracking
 * - Respects opt-out preferences
 */

import { db } from '../db.js';
import { checkins, profiles, consentEvents } from '../schema.js';
import { eq, gte, desc, and } from 'drizzle-orm';
import { DateTime } from 'luxon';
import type { MoodKey } from '../../src/lib/moodConfig.js';
import logger from '../logger.ts';

// Numerical mood scores for variance calculation (1-6 scale)
const MOOD_SCORES: Record<MoodKey, number> = {
  cold: 1,
  stormy: 2,
  foggy: 3,
  clear: 4,
  breezy: 5,
  aurora: 6
};

const COOLDOWN_HOURS = 48;
const MOOD_DROP_THRESHOLD = 0.15; // 15% drop
const VARIANCE_THRESHOLD = 0.4;

interface MoodTriggerResult {
  shouldTrigger: boolean;
  reason?: 'mood_drop' | 'high_variance' | 'cooldown_active' | 'opt_out';
  details?: {
    moodDrop?: number;
    variance?: number;
    lastTrigger?: Date;
    cooldownEnds?: Date;
  };
}

/**
 * Calculate variance for a set of mood scores
 */
function calculateVariance(scores: number[]): number {
  if (scores.length === 0) return 0;
  
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length;
  
  return variance;
}

/**
 * Calculate percentage mood drop from previous average
 */
function calculateMoodDrop(currentScore: number, previousScores: number[]): number {
  if (previousScores.length === 0) return 0;
  
  const previousAverage = previousScores.reduce((sum, score) => sum + score, 0) / previousScores.length;
  const drop = (previousAverage - currentScore) / previousAverage;
  
  return drop;
}

/**
 * Check if user has opted out of Ximi mood triggers
 */
async function hasOptedOut(userId: string): Promise<boolean> {
  try {
    const userProfile = await db.select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!userProfile || userProfile.length === 0) return false;

    // Check if ximiConsent is explicitly false
    return userProfile[0].ximiConsent === false;
  } catch (error) {
    logger.error({ err: error, context: 'mood-analysis-opt-out' }, 'Error checking opt-out status');
    return false; // Fail open: allow triggers if we can't check
  }
}

/**
 * Get last Ximi trigger time from localStorage-synced consent events
 * (In real implementation, this would be a dedicated trigger_events table)
 */
async function getLastTriggerTime(userId: string): Promise<Date | null> {
  try {
    const recentEvents = await db.select()
      .from(consentEvents)
      .where(
        and(
          eq(consentEvents.userId, userId),
          eq(consentEvents.eventType, 'ximi_mood_trigger')
        )
      )
      .orderBy(desc(consentEvents.occurredAt))
      .limit(1);

    if (recentEvents && recentEvents.length > 0) {
      return recentEvents[0].occurredAt;
    }

    return null;
  } catch (error) {
    logger.error({ err: error, context: 'mood-analysis-trigger-time' }, 'Error getting last trigger time');
    return null;
  }
}

/**
 * Log a mood trigger event
 */
async function logTriggerEvent(userId: string, reason: string, details: any): Promise<void> {
  try {
    await db.insert(consentEvents).values({
      userId,
      actor: 'system',
      eventType: 'ximi_mood_trigger',
      notes: JSON.stringify({
        reason,
        details,
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    logger.error({ err: error, context: 'mood-analysis-log-trigger' }, 'Error logging trigger event');
  }
}

/**
 * Analyze mood trends and determine if Ximi should be triggered
 */
export async function analyzeMoodTrigger(
  userId: string,
  currentMood: MoodKey
): Promise<MoodTriggerResult> {
  try {
    // Check opt-out first
    const optedOut = await hasOptedOut(userId);
    if (optedOut) {
      return {
        shouldTrigger: false,
        reason: 'opt_out'
      };
    }

    // Check cooldown
    const lastTrigger = await getLastTriggerTime(userId);
    if (lastTrigger) {
      const cooldownEnd = DateTime.fromJSDate(lastTrigger).plus({ hours: COOLDOWN_HOURS });
      const now = DateTime.now();
      
      if (now < cooldownEnd) {
        return {
          shouldTrigger: false,
          reason: 'cooldown_active',
          details: {
            lastTrigger,
            cooldownEnds: cooldownEnd.toJSDate()
          }
        };
      }
    }

    // Get last 7 days of check-ins
    const sevenDaysAgo = DateTime.now().minus({ days: 7 }).toJSDate();
    const recentCheckins = await db.select({
      mood: checkins.moodType,
      createdAt: checkins.timestamp
    })
    .from(checkins)
    .where(
      and(
        eq(checkins.userId, userId),
        gte(checkins.timestamp, sevenDaysAgo)
      )
    )
    .orderBy(desc(checkins.timestamp));

    if (recentCheckins.length < 3) {
      // Not enough data for analysis
      return { shouldTrigger: false };
    }

    // Convert moods to numerical scores
    const scores = recentCheckins.map(c => MOOD_SCORES[c.mood as MoodKey]);
    const currentScore = MOOD_SCORES[currentMood];

    // Calculate variance for the week
    const variance = calculateVariance(scores);

    // Calculate mood drop (exclude current mood from previous average)
    const previousScores = scores.slice(1); // All except the most recent (current)
    const moodDrop = calculateMoodDrop(currentScore, previousScores);

    // Check triggers
    if (moodDrop >= MOOD_DROP_THRESHOLD) {
      await logTriggerEvent(userId, 'mood_drop', { moodDrop, variance });
      return {
        shouldTrigger: true,
        reason: 'mood_drop',
        details: {
          moodDrop,
          variance
        }
      };
    }

    if (variance >= VARIANCE_THRESHOLD) {
      await logTriggerEvent(userId, 'high_variance', { moodDrop, variance });
      return {
        shouldTrigger: true,
        reason: 'high_variance',
        details: {
          moodDrop,
          variance
        }
      };
    }

    return {
      shouldTrigger: false,
      details: {
        moodDrop,
        variance
      }
    };

  } catch (error) {
    logger.error({ err: error, context: 'mood-analysis-analyze' }, 'Error analyzing mood trigger');
    return { shouldTrigger: false };
  }
}

/**
 * Get mood analysis summary for a user
 */
export async function getMoodAnalysisSummary(userId: string): Promise<any> {
  try {
    const sevenDaysAgo = DateTime.now().minus({ days: 7 }).toJSDate();
    const recentCheckins = await db.select({
      mood: checkins.moodType,
      createdAt: checkins.timestamp
    })
    .from(checkins)
    .where(
      and(
        eq(checkins.userId, userId),
        gte(checkins.timestamp, sevenDaysAgo)
      )
    )
    .orderBy(desc(checkins.timestamp));

    if (recentCheckins.length === 0) {
      return {
        hasData: false,
        message: 'Not enough check-ins for analysis'
      };
    }

    // Filter out null moods and convert to scores
    const validCheckins = recentCheckins.filter(c => c.mood !== null);
    const scores = validCheckins.map(c => MOOD_SCORES[c.mood as MoodKey]);
    const variance = calculateVariance(scores);
    const average = scores.reduce((sum, s) => sum + s, 0) / scores.length;

    return {
      hasData: true,
      weeklyAverage: average,
      variance,
      totalCheckins: validCheckins.length,
      moodDistribution: validCheckins.reduce((dist, c) => {
        if (c.mood) {
          dist[c.mood] = (dist[c.mood] || 0) + 1;
        }
        return dist;
      }, {} as Record<string, number>)
    };

  } catch (error) {
    logger.error({ err: error, context: 'mood-analysis-summary' }, 'Error getting mood summary');
    return { hasData: false, error: error.message };
  }
}
