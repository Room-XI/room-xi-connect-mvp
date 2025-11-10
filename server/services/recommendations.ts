import { db } from '../db.js';
import { programs, recommendationEvents, peerSuccessInsights, profiles } from '../schema.js';
import { eq, and, gte, inArray, sql, desc } from 'drizzle-orm';
import type { MoodTrendData } from './moodTrends.js';
import type { MoodKey } from '../../src/lib/moodConfig.js';

export interface ProgramRecommendation {
  programId: string;
  title: string;
  description: string | null;
  matchScore: number;
  triggerReason: string;
  tags: string[];
  free: boolean;
  costCents: number | null;
  locationName: string | null;
  address: string | null;
  website: string | null;
  nextStart: Date | null;
  accessibilityNotes: string | null;
}

export interface RecommendationContext {
  userId: string;
  currentMood?: MoodKey;
  wellnessDimensions?: string[];
  moodTrend?: MoodTrendData | null;
  city?: string | null;
  maxResults?: number;
}

const MOOD_TAG_MAP: Record<MoodKey, string[]> = {
  cold: ['quiet', 'gentle', 'creative', 'arts', 'mental-health', 'indoor', 'calm', 'mindfulness', 'self-care'],
  stormy: ['mental-health', 'community', 'quiet', 'creative', 'arts', 'support', 'counselling', 'indoor'],
  foggy: ['creative', 'arts', 'learning', 'tech', 'mental-health', 'community', 'indoor', 'structure'],
  clear: ['community', 'social', 'creative', 'arts', 'learning', 'tech', 'sports', 'indoor'],
  breezy: ['sports', 'outdoor', 'community', 'active', 'drop-in', 'creative', 'physical'],
  aurora: ['community', 'social', 'leadership', 'creative', 'sports', 'outdoor', 'active', 'drop-in'],
};

/**
 * Generate program recommendations based on user context
 */
export async function generateRecommendations(
  context: RecommendationContext
): Promise<ProgramRecommendation[]> {
  console.log(`[Recommendations] Generating recommendations for user ${context.userId}`);

  const maxResults = context.maxResults || 5;

  // Get user profile for location preferences
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, context.userId))
    .limit(1);

  const userCity = context.city || profile?.city;

  // Fetch all available programs
  const allPrograms = await db
    .select()
    .from(programs)
    .where(sql`${programs.createdAt} IS NOT NULL`); // Basic filter to get active programs

  if (allPrograms.length === 0) {
    console.log('[Recommendations] No programs available');
    return [];
  }

  console.log(`[Recommendations] Found ${allPrograms.length} programs to score`);

  // Score each program
  const scoredPrograms = await Promise.all(
    allPrograms.map(async (program) => {
      const score = await scoreProgram(program, context);
      return { program, score };
    })
  );

  // Filter out low scores and sort by score
  const recommendations = scoredPrograms
    .filter(({ score }) => score.matchScore > 0.2)
    .sort((a, b) => b.score.matchScore - a.score.matchScore)
    .slice(0, maxResults)
    .map(({ program, score }) => ({
      programId: program.id,
      title: program.title,
      description: program.description,
      matchScore: score.matchScore,
      triggerReason: score.triggerReason,
      tags: program.tags,
      free: program.free,
      costCents: program.costCents,
      locationName: program.locationName,
      address: program.address,
      website: program.website,
      nextStart: program.nextStart,
      accessibilityNotes: program.accessibilityNotes,
    }));

  console.log(`[Recommendations] Generated ${recommendations.length} recommendations`);

  return recommendations;
}

/**
 * Score a program based on user context
 */
async function scoreProgram(
  program: any,
  context: RecommendationContext
): Promise<{ matchScore: number; triggerReason: string }> {
  let score = 0;
  const reasons: string[] = [];

  // 1. Mood tag matching (0-0.4 points)
  if (context.currentMood) {
    const moodTags = MOOD_TAG_MAP[context.currentMood] || [];
    const matchingTags = program.tags.filter((tag: string) =>
      moodTags.some(moodTag => tag.toLowerCase().includes(moodTag.toLowerCase()))
    );

    if (matchingTags.length > 0) {
      const tagScore = Math.min(matchingTags.length * 0.1, 0.4);
      score += tagScore;
      reasons.push(`matches your ${context.currentMood} mood`);
    }
  }

  // 2. Wellness dimension matching (0-0.3 points)
  if (context.wellnessDimensions && context.wellnessDimensions.length > 0) {
    const matchingDimensions = program.tags.filter((tag: string) =>
      context.wellnessDimensions!.some(dim => 
        tag.toLowerCase().includes(dim.toLowerCase())
      )
    );

    if (matchingDimensions.length > 0) {
      const dimScore = Math.min(matchingDimensions.length * 0.15, 0.3);
      score += dimScore;
      reasons.push(`addresses ${context.wellnessDimensions.join(', ')}`);
    }
  }

  // 3. Trend-based scoring (0-0.3 points)
  if (context.moodTrend) {
    const trendScore = scoreTrendMatch(program, context.moodTrend, reasons);
    score += trendScore;
  }

  // 4. Barrier considerations (adjust score)
  const barrierAdjustment = scoreBarriers(program, context);
  score = Math.max(0, score + barrierAdjustment);

  // 5. Historical effectiveness (0-0.2 points)
  const peerScore = await scorePeerSuccess(program.id);
  score += peerScore;
  if (peerScore > 0.1) {
    reasons.push('highly rated by peers');
  }

  // Normalize score to 0-1 range
  score = Math.min(score, 1.0);

  // Generate trigger reason
  const triggerReason = generateTriggerReason(context, reasons);

  return { matchScore: parseFloat(score.toFixed(2)), triggerReason };
}

/**
 * Score program based on mood trends
 */
function scoreTrendMatch(
  program: any,
  trend: MoodTrendData,
  reasons: string[]
): number {
  let trendScore = 0;

  // Declining trend - recommend supportive programs
  if (trend.trendDirection === 'declining') {
    const supportiveTags = ['support', 'counseling', 'mindfulness', 'self_care', 'calming'];
    if (program.tags.some((tag: string) => 
      supportiveTags.some(st => tag.toLowerCase().includes(st))
    )) {
      trendScore += 0.2;
      reasons.push('recommended for declining mood patterns');
    }
  }

  // Improving trend - recommend engagement programs
  if (trend.trendDirection === 'improving') {
    const engagementTags = ['social', 'active', 'creative', 'leadership', 'skills'];
    if (program.tags.some((tag: string) => 
      engagementTags.some(et => tag.toLowerCase().includes(et))
    )) {
      trendScore += 0.15;
      reasons.push('builds on your improving mood');
    }
  }

  // Consecutive low days - prioritize immediate support
  if (trend.consecutiveLowDays >= 3) {
    const immediateTags = ['drop_in', 'flexible', 'low_barrier', 'free'];
    if (program.tags.some((tag: string) => 
      immediateTags.some(it => tag.toLowerCase().includes(it))
    )) {
      trendScore += 0.25;
      reasons.push(`helpful for ${trend.consecutiveLowDays} consecutive low days`);
    }
  }

  // Weekend dip pattern - recommend weekend programs
  if (trend.patternsDetected.includes('weekend_dip')) {
    if (program.tags.includes('weekend') || program.tags.includes('flexible_schedule')) {
      trendScore += 0.1;
      reasons.push('addresses weekend mood dips');
    }
  }

  return trendScore;
}

/**
 * Adjust score based on barriers (cost, location, accessibility)
 */
function scoreBarriers(program: any, context: RecommendationContext): number {
  let adjustment = 0;

  // Cost barrier
  if (!program.free && program.costCents && program.costCents > 5000) {
    adjustment -= 0.15; // Reduce score for expensive programs
  } else if (program.free) {
    adjustment += 0.05; // Slight boost for free programs
  }

  // Location barrier (if user has city preference)
  if (context.city && program.city) {
    if (program.city.toLowerCase() !== context.city.toLowerCase()) {
      adjustment -= 0.1; // Reduce score for programs in different city
    }
  }

  // Accessibility boost
  if (program.accessibilityNotes) {
    adjustment += 0.05;
  }

  return adjustment;
}

/**
 * Score program based on peer success insights
 */
async function scorePeerSuccess(programId: string): Promise<number> {
  try {
    const [insights] = await db
      .select()
      .from(peerSuccessInsights)
      .where(
        and(
          eq(peerSuccessInsights.programId, programId),
          eq(peerSuccessInsights.suppressed, false)
        )
      )
      .orderBy(desc(peerSuccessInsights.createdAt))
      .limit(1);

    if (!insights) {
      return 0;
    }

    // Score based on average rating and recommendation rate
    const avgRating = parseFloat(insights.averageRating || '0');
    const recRate = parseFloat(insights.recommendationRate || '0');

    // Normalize to 0-0.2 scale
    const ratingScore = (avgRating / 5) * 0.1; // Max 0.1 from rating
    const recScore = recRate * 0.1; // Max 0.1 from recommendation rate

    return ratingScore + recScore;
  } catch (error) {
    console.error('[Recommendations] Error fetching peer success insights:', error);
    return 0;
  }
}

/**
 * Generate contextual trigger reason
 */
function generateTriggerReason(
  context: RecommendationContext,
  reasons: string[]
): string {
  const parts: string[] = [];

  // Add trend-specific context
  if (context.moodTrend) {
    const trend = context.moodTrend;

    if (trend.consecutiveLowDays >= 3) {
      parts.push(`You've had ${trend.consecutiveLowDays} consecutive low mood days`);
    } else if (trend.consecutiveHighDays >= 3) {
      parts.push(`You're on a ${trend.consecutiveHighDays}-day positive streak`);
    }

    if (trend.trendDirection === 'declining') {
      parts.push('Your mood has been declining recently');
    } else if (trend.trendDirection === 'improving') {
      parts.push('Your mood is trending upward');
    }

    if (trend.patternsDetected.includes('weekend_dip')) {
      parts.push('Noticed weekend mood dips');
    }
  }

  // Add match reasons
  if (reasons.length > 0) {
    parts.push(reasons.join(', '));
  }

  return parts.length > 0
    ? parts.join(' — ')
    : 'Recommended based on your profile';
}

/**
 * Track recommendation event in database
 */
export async function trackRecommendation(
  userId: string,
  programId: string,
  recommendationType: string,
  moodTrend: string | null,
  triggerReason: string,
  matchScore: number,
  conversationId?: string
): Promise<void> {
  console.log(`[Recommendations] Tracking recommendation event for user ${userId}`);

  await db.insert(recommendationEvents).values({
    userId,
    programId,
    ximiConversationId: conversationId || null,
    recommendationType,
    moodTrend,
    triggerReason,
    matchScore: matchScore.toString(),
  });

  console.log('[Recommendations] Recommendation event tracked successfully');
}

/**
 * Update recommendation event with user action
 */
export async function updateRecommendationAction(
  recommendationId: string,
  userAction: string,
  feedback?: string
): Promise<void> {
  console.log(`[Recommendations] Updating recommendation ${recommendationId} with action: ${userAction}`);

  await db
    .update(recommendationEvents)
    .set({
      userAction,
      actionTimestamp: sql`now()`,
      userFeedback: feedback || null,
    })
    .where(eq(recommendationEvents.id, recommendationId));

  console.log('[Recommendations] Recommendation action updated');
}

/**
 * Get recommendations with trend context
 */
export async function getRecommendationsWithContext(
  userId: string,
  currentMood?: MoodKey,
  wellnessDimensions?: string[],
  moodTrend?: MoodTrendData | null
): Promise<ProgramRecommendation[]> {
  const context: RecommendationContext = {
    userId,
    currentMood,
    wellnessDimensions,
    moodTrend,
    maxResults: 5,
  };

  const recommendations = await generateRecommendations(context);

  // Track all recommendations
  for (const rec of recommendations) {
    try {
      await trackRecommendation(
        userId,
        rec.programId,
        moodTrend ? 'proactive_nudge' : 'direct_ask',
        moodTrend?.trendDirection || null,
        rec.triggerReason,
        rec.matchScore
      );
    } catch (error) {
      console.error('[Recommendations] Error tracking recommendation:', error);
    }
  }

  return recommendations;
}
