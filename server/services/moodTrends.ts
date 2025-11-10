import { db } from '../db.js';
import { checkins, moodTrendSummaries } from '../schema.js';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { variance, mean } from 'simple-statistics';

export type TrendDirection = 'improving' | 'stable' | 'declining' | 'insufficient_data';
export type WindowType = 'week' | 'month' | 'quarter';

export interface MoodTrendData {
  userId: string;
  windowType: WindowType;
  windowStart: string;
  windowEnd: string;
  averageMoodLevel: number;
  moodVariance: number;
  dominantMood: string | null;
  trendDirection: TrendDirection;
  consecutiveLowDays: number;
  consecutiveHighDays: number;
  patternsDetected: string[];
  topWellnessConcerns: string[];
  wellnessScores: Record<string, number>;
}

const LOW_MOOD_THRESHOLD = 2;
const HIGH_MOOD_THRESHOLD = 5;
const STABLE_VARIANCE_THRESHOLD = 0.5;

/**
 * Compute mood trends for a specific user and time window
 */
export async function computeMoodTrends(
  userId: string,
  windowType: WindowType = 'week'
): Promise<MoodTrendData | null> {
  console.log(`[Mood Trends] Computing ${windowType} trends for user ${userId}`);

  const now = DateTime.now().setZone('America/Edmonton');
  const { windowStart, windowEnd } = getTimeWindow(now, windowType);

  // Fetch check-ins for the window
  const checkinsData = await db
    .select()
    .from(checkins)
    .where(
      and(
        eq(checkins.userId, userId),
        gte(checkins.checkinDate, windowStart.toISODate()),
        lte(checkins.checkinDate, windowEnd.toISODate())
      )
    )
    .orderBy(desc(checkins.timestamp));

  if (checkinsData.length === 0) {
    console.log(`[Mood Trends] No check-ins found for user ${userId} in ${windowType} window`);
    return null;
  }

  console.log(`[Mood Trends] Found ${checkinsData.length} check-ins for analysis`);

  // Calculate basic metrics
  const moodLevels = checkinsData.map(c => c.moodLevel16);
  const averageMoodLevel = mean(moodLevels);
  const moodVariance = moodLevels.length > 1 ? variance(moodLevels) : 0;

  // Find dominant mood
  const moodCounts: Record<string, number> = {};
  checkinsData.forEach(c => {
    if (c.moodType) {
      moodCounts[c.moodType] = (moodCounts[c.moodType] || 0) + 1;
    }
  });
  const dominantMood = Object.keys(moodCounts).length > 0
    ? Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  // Calculate trend direction
  const trendDirection = calculateTrendDirection(checkinsData);

  // Detect consecutive patterns
  const { consecutiveLowDays, consecutiveHighDays } = detectConsecutivePatterns(checkinsData);

  // Detect temporal patterns
  const patternsDetected = detectTemporalPatterns(checkinsData);

  // Analyze wellness dimensions
  const { topWellnessConcerns, wellnessScores } = analyzeWellnessDimensions(checkinsData);

  const trendData: MoodTrendData = {
    userId,
    windowType,
    windowStart: windowStart.toISODate(),
    windowEnd: windowEnd.toISODate(),
    averageMoodLevel: parseFloat(averageMoodLevel.toFixed(2)),
    moodVariance: parseFloat(moodVariance.toFixed(3)),
    dominantMood,
    trendDirection,
    consecutiveLowDays,
    consecutiveHighDays,
    patternsDetected,
    topWellnessConcerns,
    wellnessScores,
  };

  console.log(`[Mood Trends] Computed trends:`, {
    averageMoodLevel: trendData.averageMoodLevel,
    trendDirection: trendData.trendDirection,
    dominantMood: trendData.dominantMood,
    patternsDetected: trendData.patternsDetected,
  });

  return trendData;
}

/**
 * Store computed trend data in the database
 */
export async function storeMoodTrends(trendData: MoodTrendData): Promise<void> {
  console.log(`[Mood Trends] Storing trends for user ${trendData.userId}`);

  await db
    .insert(moodTrendSummaries)
    .values({
      userId: trendData.userId,
      windowType: trendData.windowType,
      windowStart: trendData.windowStart,
      windowEnd: trendData.windowEnd,
      averageMoodLevel: trendData.averageMoodLevel.toString(),
      moodVariance: trendData.moodVariance.toString(),
      dominantMood: trendData.dominantMood,
      trendDirection: trendData.trendDirection,
      consecutiveLowDays: trendData.consecutiveLowDays,
      consecutiveHighDays: trendData.consecutiveHighDays,
      patternsDetected: trendData.patternsDetected,
      topWellnessConcerns: trendData.topWellnessConcerns,
      wellnessScores: trendData.wellnessScores,
    })
    .onConflictDoUpdate({
      target: [
        moodTrendSummaries.userId,
        moodTrendSummaries.windowType,
        moodTrendSummaries.windowStart,
      ],
      set: {
        averageMoodLevel: trendData.averageMoodLevel.toString(),
        moodVariance: trendData.moodVariance.toString(),
        dominantMood: trendData.dominantMood,
        trendDirection: trendData.trendDirection,
        consecutiveLowDays: trendData.consecutiveLowDays,
        consecutiveHighDays: trendData.consecutiveHighDays,
        patternsDetected: trendData.patternsDetected,
        topWellnessConcerns: trendData.topWellnessConcerns,
        wellnessScores: trendData.wellnessScores,
        computedAt: sql`now()`,
      },
    });

  console.log(`[Mood Trends] Successfully stored trends`);
}

/**
 * Get the most recent mood trend for a user
 */
export async function getLatestMoodTrend(
  userId: string,
  windowType: WindowType = 'week'
): Promise<MoodTrendData | null> {
  const [trend] = await db
    .select()
    .from(moodTrendSummaries)
    .where(
      and(
        eq(moodTrendSummaries.userId, userId),
        eq(moodTrendSummaries.windowType, windowType)
      )
    )
    .orderBy(desc(moodTrendSummaries.computedAt))
    .limit(1);

  if (!trend) {
    return null;
  }

  return {
    userId: trend.userId,
    windowType: trend.windowType as WindowType,
    windowStart: trend.windowStart,
    windowEnd: trend.windowEnd,
    averageMoodLevel: parseFloat(trend.averageMoodLevel || '0'),
    moodVariance: parseFloat(trend.moodVariance || '0'),
    dominantMood: trend.dominantMood,
    trendDirection: (trend.trendDirection as TrendDirection) || 'insufficient_data',
    consecutiveLowDays: trend.consecutiveLowDays,
    consecutiveHighDays: trend.consecutiveHighDays,
    patternsDetected: trend.patternsDetected,
    topWellnessConcerns: trend.topWellnessConcerns,
    wellnessScores: (trend.wellnessScores as Record<string, number>) || {},
  };
}

/**
 * Get time window boundaries
 */
function getTimeWindow(
  now: DateTime,
  windowType: WindowType
): { windowStart: DateTime; windowEnd: DateTime } {
  let windowStart: DateTime;
  let windowEnd: DateTime = now;

  switch (windowType) {
    case 'week':
      windowStart = now.minus({ weeks: 1 });
      break;
    case 'month':
      windowStart = now.minus({ months: 1 });
      break;
    case 'quarter':
      windowStart = now.minus({ months: 3 });
      break;
    default:
      windowStart = now.minus({ weeks: 1 });
  }

  return { windowStart, windowEnd };
}

/**
 * Calculate trend direction based on recent vs historical mood levels
 */
function calculateTrendDirection(
  checkinsData: Array<{ moodLevel16: number; checkinDate: string }>
): TrendDirection {
  if (checkinsData.length < 3) {
    return 'insufficient_data';
  }

  // Split into recent (last 1/3) and historical (first 2/3)
  const splitIndex = Math.floor(checkinsData.length / 3);
  const recentCheckins = checkinsData.slice(0, splitIndex);
  const historicalCheckins = checkinsData.slice(splitIndex);

  const recentAvg = mean(recentCheckins.map(c => c.moodLevel16));
  const historicalAvg = mean(historicalCheckins.map(c => c.moodLevel16));

  const diff = recentAvg - historicalAvg;

  if (Math.abs(diff) < STABLE_VARIANCE_THRESHOLD) {
    return 'stable';
  } else if (diff > 0) {
    return 'improving';
  } else {
    return 'declining';
  }
}

/**
 * Detect consecutive low or high mood days
 */
function detectConsecutivePatterns(
  checkinsData: Array<{ moodLevel16: number; checkinDate: string }>
): { consecutiveLowDays: number; consecutiveHighDays: number } {
  let consecutiveLowDays = 0;
  let consecutiveHighDays = 0;
  let currentLowStreak = 0;
  let currentHighStreak = 0;

  // Sort by date ascending for streak detection
  const sorted = [...checkinsData].sort((a, b) => 
    a.checkinDate.localeCompare(b.checkinDate)
  );

  for (const checkin of sorted) {
    if (checkin.moodLevel16 <= LOW_MOOD_THRESHOLD) {
      currentLowStreak++;
      currentHighStreak = 0;
      consecutiveLowDays = Math.max(consecutiveLowDays, currentLowStreak);
    } else if (checkin.moodLevel16 >= HIGH_MOOD_THRESHOLD) {
      currentHighStreak++;
      currentLowStreak = 0;
      consecutiveHighDays = Math.max(consecutiveHighDays, currentHighStreak);
    } else {
      currentLowStreak = 0;
      currentHighStreak = 0;
    }
  }

  return { consecutiveLowDays, consecutiveHighDays };
}

/**
 * Detect temporal patterns like weekend dips or weekly cycles
 */
function detectTemporalPatterns(
  checkinsData: Array<{ moodLevel16: number; checkinDate: string }>
): string[] {
  const patterns: string[] = [];

  if (checkinsData.length < 7) {
    return patterns;
  }

  // Analyze weekend vs weekday moods
  const weekendMoods: number[] = [];
  const weekdayMoods: number[] = [];

  checkinsData.forEach(checkin => {
    const date = DateTime.fromISO(checkin.checkinDate);
    const isWeekend = date.weekday === 6 || date.weekday === 7; // Saturday or Sunday

    if (isWeekend) {
      weekendMoods.push(checkin.moodLevel16);
    } else {
      weekdayMoods.push(checkin.moodLevel16);
    }
  });

  if (weekendMoods.length > 0 && weekdayMoods.length > 0) {
    const weekendAvg = mean(weekendMoods);
    const weekdayAvg = mean(weekdayMoods);

    if (weekendAvg < weekdayAvg - 0.5) {
      patterns.push('weekend_dip');
    } else if (weekendAvg > weekdayAvg + 0.5) {
      patterns.push('weekend_boost');
    }
  }

  // Detect weekly cycle (if we have enough data)
  if (checkinsData.length >= 14) {
    const weeklyVariance = calculateWeeklyVariance(checkinsData);
    if (weeklyVariance > 1.0) {
      patterns.push('weekly_cycle');
    }
  }

  return patterns;
}

/**
 * Calculate variance across weeks
 */
function calculateWeeklyVariance(
  checkinsData: Array<{ moodLevel16: number; checkinDate: string }>
): number {
  const weeklyAverages: number[] = [];
  const weekGroups: Record<string, number[]> = {};

  checkinsData.forEach(checkin => {
    const date = DateTime.fromISO(checkin.checkinDate);
    const weekKey = date.toFormat('yyyy-WW'); // Year-Week format

    if (!weekGroups[weekKey]) {
      weekGroups[weekKey] = [];
    }
    weekGroups[weekKey].push(checkin.moodLevel16);
  });

  Object.values(weekGroups).forEach(weekMoods => {
    if (weekMoods.length > 0) {
      weeklyAverages.push(mean(weekMoods));
    }
  });

  return weeklyAverages.length > 1 ? variance(weeklyAverages) : 0;
}

/**
 * Analyze wellness dimensions to find top concerns and scores
 */
function analyzeWellnessDimensions(
  checkinsData: Array<{ wellnessDimensions: string[] | null }>
): { topWellnessConcerns: string[]; wellnessScores: Record<string, number> } {
  const dimensionCounts: Record<string, number> = {};

  checkinsData.forEach(checkin => {
    if (checkin.wellnessDimensions) {
      checkin.wellnessDimensions.forEach(dimension => {
        dimensionCounts[dimension] = (dimensionCounts[dimension] || 0) + 1;
      });
    }
  });

  // Get top 3 wellness concerns
  const topWellnessConcerns = Object.entries(dimensionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([dimension]) => dimension);

  // Calculate wellness scores (frequency as score)
  const totalCheckins = checkinsData.length;
  const wellnessScores: Record<string, number> = {};

  Object.entries(dimensionCounts).forEach(([dimension, count]) => {
    wellnessScores[dimension] = parseFloat((count / totalCheckins).toFixed(2));
  });

  return { topWellnessConcerns, wellnessScores };
}

/**
 * Compute trends for all active users (for scheduler)
 */
export async function computeTrendsForAllUsers(): Promise<void> {
  console.log('[Mood Trends] Computing trends for all active users...');

  try {
    // Get all users with recent check-ins (last 30 days)
    const thirtyDaysAgo = DateTime.now().minus({ days: 30 }).toISODate();

    const activeUsers = await db
      .selectDistinct({ userId: checkins.userId })
      .from(checkins)
      .where(gte(checkins.checkinDate, thirtyDaysAgo));

    console.log(`[Mood Trends] Found ${activeUsers.length} active users`);

    let successCount = 0;
    let errorCount = 0;

    for (const { userId } of activeUsers) {
      try {
        // Compute weekly trends for each user
        const trendData = await computeMoodTrends(userId, 'week');
        if (trendData) {
          await storeMoodTrends(trendData);
          successCount++;
        }
      } catch (error) {
        console.error(`[Mood Trends] Error computing trends for user ${userId}:`, error);
        errorCount++;
      }
    }

    console.log(`[Mood Trends] Trend computation complete: ${successCount} success, ${errorCount} errors`);
  } catch (error) {
    console.error('[Mood Trends] Error in computeTrendsForAllUsers:', error);
    throw error;
  }
}
