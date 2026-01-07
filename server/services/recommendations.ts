import { db } from '../db.js';
import { programs, programEvents, recommendationEvents, peerSuccessInsights, profiles } from '../schema.js';
import { eq, and, gte, lte, inArray, sql, desc, or, isNull } from 'drizzle-orm';
import { DateTime } from 'luxon';
import type { MoodTrendData } from './moodTrends.js';
import type { MoodKey } from '../../src/lib/moodConfig.js';
import logger from '../logger.ts';

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10;
}

/**
 * Calculate proximity score based on distance
 * Returns a score between 0 and 0.3
 */
function calculateProximityScore(distanceKm: number): number {
  if (distanceKm > 40) return 0;
  return Math.max(0, 0.3 - (distanceKm / 40) * 0.3);
}

export interface ProgramRecommendation {
  eventId: string;
  programId: string;
  eventName: string;
  programTitle: string;
  title: string;
  description: string | null;
  programDescription: string | null;
  matchScore: number;
  triggerReason: string;
  tags: string[];
  wellnessDimensions: string[];
  free: boolean;
  costCents: number | null;
  cost: string;
  ageMin: number | null;
  ageMax: number | null;
  locationName: string | null;
  address: string | null;
  lat: string | null;
  lng: string | null;
  website: string | null;
  accessibilityNotes: string | null;
  dayOfWeek: string | null;
  startTime: string;
  endTime: string;
  nextStart: Date | null;
  isDropIn: boolean;
  requiresRegistration: boolean;
  registrationUrl: string | null;
  distance: number | null;
  organizer: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

export interface RecommendationContext {
  userId: string;
  currentMood?: MoodKey;
  wellnessDimensions?: string[];
  moodTrend?: MoodTrendData | null;
  city?: string | null;
  maxResults?: number;
  userLat?: number;
  userLng?: number;
  prioritizeNearby?: boolean;
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
 * Calculate the next occurrence date for an event
 */
function calculateNextOccurrence(event: any, nowInEdmonton: DateTime): Date | null {
  if (event.occursOnDate) {
    return event.occursOnDate;
  }
  
  if (!event.dayOfWeek) {
    return null;
  }
  
  const dayMap: Record<string, number> = {
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6,
    'Sunday': 7
  };
  
  const targetDay = dayMap[event.dayOfWeek];
  if (!targetDay) return null;
  
  const currentDay = nowInEdmonton.weekday;
  let daysUntil = targetDay - currentDay;
  if (daysUntil <= 0) {
    daysUntil += 7;
  }
  
  return nowInEdmonton.plus({ days: daysUntil }).toJSDate();
}

/**
 * Generate program recommendations based on user context
 */
export async function generateRecommendations(
  context: RecommendationContext
): Promise<ProgramRecommendation[]> {
  logger.info({ context: 'recommendations-generate', userId: '[REDACTED]' }, 'Generating recommendations for user');

  const maxResults = context.maxResults || 5;

  // Get user profile for location preferences
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, context.userId))
    .limit(1);

  const userCity = context.city || profile?.city;

  // Calculate date range: 7-14 days from now in Edmonton timezone
  const nowInEdmonton = DateTime.now().setZone('America/Edmonton');
  const startDate = nowInEdmonton.plus({ days: 7 }).startOf('day').toJSDate();
  const endDate = nowInEdmonton.plus({ days: 14 }).endOf('day').toJSDate();

  // Get days of week in the 7-14 day window
  const daysInWindow: string[] = [];
  for (let i = 7; i <= 14; i++) {
    const futureDate = nowInEdmonton.plus({ days: i });
    const dayName = futureDate.toFormat('EEEE');
    if (!daysInWindow.includes(dayName)) {
      daysInWindow.push(dayName);
    }
  }

  logger.info({ context: 'recommendations-generate', startDate: startDate.toISOString(), endDate: endDate.toISOString() }, 'Looking for events in window');
  logger.debug({ context: 'recommendations-generate', daysInWindow }, 'Days in window');

  // Format dates for SQL
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Fetch upcoming event occurrences (7-14 days out)
  const upcomingEvents = await db
    .select()
    .from(programEvents)
    .leftJoin(programs, eq(programEvents.programId, programs.id))
    .where(
      and(
        eq(programEvents.active, true),
        or(
          // One-time events within the 7-14 day window
          and(
            sql`${programEvents.occursOnDate} IS NOT NULL`,
            sql`${programEvents.occursOnDate} >= ${startDateStr}::date`,
            sql`${programEvents.occursOnDate} <= ${endDateStr}::date`
          ),
          // Recurring events on matching days within effective date range
          and(
            isNull(programEvents.occursOnDate),
            inArray(programEvents.dayOfWeek, daysInWindow as any),
            or(
              isNull(programEvents.effectiveFrom),
              sql`${programEvents.effectiveFrom} <= ${endDateStr}::date`
            ),
            or(
              isNull(programEvents.effectiveTo),
              sql`${programEvents.effectiveTo} >= ${startDateStr}::date`
            )
          )
        )
      )
    );

  if (upcomingEvents.length === 0) {
    logger.info({ context: 'recommendations-generate' }, 'No upcoming events available in 7-14 day window');
    return [];
  }

  logger.info({ context: 'recommendations-generate', eventCount: upcomingEvents.length }, 'Found upcoming events to score');

  // Score each event with its parent program data
  const scoredEvents = await Promise.all(
    upcomingEvents.map(async ({ program_events: event, programs: program }) => {
      if (!program) return null;
      
      const score = await scoreEvent(event, program, context);
      const nextStart = calculateNextOccurrence(event, nowInEdmonton);
      
      return { event, program, score, nextStart };
    })
  );

  // Calculate 7-14 day window boundaries for post-filtering
  const minDate = nowInEdmonton.plus({ days: 7 }).startOf('day');
  const maxDate = nowInEdmonton.plus({ days: 14 }).endOf('day');

  logger.info({ context: 'recommendations-generate', minDate: minDate.toISO(), maxDate: maxDate.toISO() }, 'Filtering events to 7-14 day window');

  // Filter out null entries, low scores, and events outside 7-14 day window
  const validEvents = scoredEvents.filter(
    (item): item is NonNullable<typeof item> => {
      if (item === null || item.score.matchScore <= 0.2) {
        return false;
      }
      
      // Enforce 7-14 day window on calculated nextStart
      if (!item.nextStart) {
        logger.debug({ context: 'recommendations-filter', eventId: item.event.id }, 'Excluding event: no nextStart calculated');
        return false;
      }
      
      const nextStartDT = DateTime.fromJSDate(item.nextStart).setZone('America/Edmonton');
      const inWindow = nextStartDT >= minDate && nextStartDT <= maxDate;
      
      if (!inWindow) {
        logger.debug({ context: 'recommendations-filter', eventId: item.event.id, nextStart: nextStartDT.toISO() }, 'Excluding event: outside 7-14 day window');
      }
      
      return inWindow;
    }
  );

  // Sort by match score (descending), then by nextStart (ascending)
  validEvents.sort((a, b) => {
    if (b.score.matchScore !== a.score.matchScore) {
      return b.score.matchScore - a.score.matchScore;
    }
    if (a.nextStart && b.nextStart) {
      return a.nextStart.getTime() - b.nextStart.getTime();
    }
    if (a.nextStart) return -1;
    if (b.nextStart) return 1;
    return 0;
  });

  // Take top results and format response
  const recommendations = validEvents
    .slice(0, maxResults)
    .map(({ event, program, score, nextStart }) => {
      let distance: number | null = null;
      
      if (context.userLat !== undefined && context.userLng !== undefined) {
        const eventLat = event.lat || program.lat;
        const eventLng = event.lng || program.lng;
        
        if (eventLat && eventLng) {
          try {
            const lat = parseFloat(eventLat);
            const lng = parseFloat(eventLng);
            if (!isNaN(lat) && !isNaN(lng)) {
              distance = calculateDistance(context.userLat, context.userLng, lat, lng);
            }
          } catch (error) {
            logger.error({ err: error, context: 'recommendations-distance' }, 'Error calculating distance');
          }
        }
      }

      const finalCostCents = event.costCents ?? program.costCents ?? 0;
      const costString = finalCostCents === 0 ? 'Free' : `$${(finalCostCents / 100).toFixed(2)}`;

      return {
        eventId: event.id,
        programId: program.id,
        eventName: event.eventName,
        programTitle: program.title,
        title: event.eventName,
        description: event.description || program.description,
        programDescription: program.description,
        matchScore: score.matchScore,
        triggerReason: score.triggerReason,
        tags: program.tags,
        wellnessDimensions: program.wellnessDimensions || [],
        free: finalCostCents === 0,
        costCents: finalCostCents,
        cost: costString,
        ageMin: event.ageMin ?? program.ageMin ?? null,
        ageMax: event.ageMax ?? program.ageMax ?? null,
        locationName: event.locationName || program.locationName,
        address: event.address || program.address,
        lat: event.lat || program.lat,
        lng: event.lng || program.lng,
        website: program.website,
        accessibilityNotes: program.accessibilityNotes,
        dayOfWeek: event.dayOfWeek,
        startTime: event.startTime,
        endTime: event.endTime,
        nextStart,
        isDropIn: event.isDropIn || false,
        requiresRegistration: event.requiresRegistration || false,
        registrationUrl: event.registrationUrl,
        distance,
        organizer: program.organizer,
        contactEmail: program.contactEmail,
        contactPhone: program.contactPhone,
      };
    });

  logger.info({ context: 'recommendations-generate', count: recommendations.length }, 'Generated recommendations');

  return recommendations;
}

/**
 * Score an event based on user context (event + parent program data)
 */
async function scoreEvent(
  event: any,
  program: any,
  context: RecommendationContext
): Promise<{ matchScore: number; triggerReason: string }> {
  let relevanceScore = 0;
  let proximityScore = 0;
  const reasons: string[] = [];

  // 1. Mood tag matching (0-0.4 points) - use program tags
  if (context.currentMood) {
    const moodTags = MOOD_TAG_MAP[context.currentMood] || [];
    const matchingTags = program.tags.filter((tag: string) =>
      moodTags.some(moodTag => tag.toLowerCase().includes(moodTag.toLowerCase()))
    );

    if (matchingTags.length > 0) {
      const tagScore = Math.min(matchingTags.length * 0.1, 0.4);
      relevanceScore += tagScore;
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
      relevanceScore += dimScore;
      reasons.push(`addresses ${context.wellnessDimensions.join(', ')}`);
    }
  }

  // 3. Trend-based scoring (0-0.3 points)
  if (context.moodTrend) {
    const trendScore = scoreTrendMatch(program, context.moodTrend, reasons);
    relevanceScore += trendScore;
  }

  // 4. Barrier considerations (adjust score) - use event-specific cost if available
  const eventCost = event.costCents ?? program.costCents;
  const barrierAdjustment = scoreBarriers({ ...program, costCents: eventCost, free: eventCost === 0 }, context);
  relevanceScore = Math.max(0, relevanceScore + barrierAdjustment);

  // 5. Historical effectiveness (0-0.2 points) - based on parent program
  const peerScore = await scorePeerSuccess(program.id);
  relevanceScore += peerScore;
  if (peerScore > 0.1) {
    reasons.push('highly rated by peers');
  }

  // 6. Drop-in boost for immediacy (0-0.1 points)
  if (event.isDropIn) {
    relevanceScore += 0.1;
    reasons.push('drop-in welcome');
  }

  // 7. Proximity scoring (only if prioritizeNearby and location available)
  if (context.prioritizeNearby && context.userLat !== undefined && context.userLng !== undefined) {
    const eventLat = event.lat || program.lat;
    const eventLng = event.lng || program.lng;
    
    if (eventLat && eventLng) {
      try {
        const lat = parseFloat(eventLat);
        const lng = parseFloat(eventLng);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          const distance = calculateDistance(context.userLat, context.userLng, lat, lng);
          proximityScore = calculateProximityScore(distance);
          
          if (proximityScore > 0.15) {
            reasons.push(`${distance}km away`);
          }
        }
      } catch (error) {
        logger.error({ err: error, context: 'recommendations-distance' }, 'Error calculating distance');
      }
    }
  }

  // Calculate final score
  let finalScore: number;
  if (context.prioritizeNearby && proximityScore > 0) {
    finalScore = 0.7 * relevanceScore + 0.3 * proximityScore;
  } else {
    finalScore = relevanceScore;
  }

  // Normalize score to 0-1 range
  finalScore = Math.min(finalScore, 1.0);

  // Generate trigger reason
  const triggerReason = generateTriggerReason(context, reasons);

  return { matchScore: parseFloat(finalScore.toFixed(2)), triggerReason };
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
    logger.error({ err: error, context: 'recommendations-peer-insights' }, 'Error fetching peer success insights');
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
  logger.info({ context: 'recommendations-track', userId: '[REDACTED]' }, 'Tracking recommendation event');

  await db.insert(recommendationEvents).values({
    userId,
    programId,
    ximiConversationId: conversationId || null,
    recommendationType,
    moodTrend,
    triggerReason,
    matchScore: matchScore.toString(),
  });

  logger.info({ context: 'recommendations-track' }, 'Recommendation event tracked successfully');
}

/**
 * Update recommendation event with user action
 */
export async function updateRecommendationAction(
  recommendationId: string,
  userAction: string,
  feedback?: string
): Promise<void> {
  logger.info({ context: 'recommendations-update', recommendationId, userAction }, 'Updating recommendation action');

  await db
    .update(recommendationEvents)
    .set({
      userAction,
      actionTimestamp: sql`now()`,
      userFeedback: feedback || null,
    })
    .where(eq(recommendationEvents.id, recommendationId));

  logger.info({ context: 'recommendations-update' }, 'Recommendation action updated');
}

/**
 * Get recommendations with trend context
 */
export async function getRecommendationsWithContext(
  userId: string,
  currentMood?: MoodKey,
  wellnessDimensions?: string[],
  moodTrend?: MoodTrendData | null,
  userLat?: number,
  userLng?: number,
  prioritizeNearby?: boolean
): Promise<ProgramRecommendation[]> {
  const context: RecommendationContext = {
    userId,
    currentMood,
    wellnessDimensions,
    moodTrend,
    maxResults: 5,
    userLat,
    userLng,
    prioritizeNearby: prioritizeNearby || false,
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
      logger.error({ err: error, context: 'recommendations-track' }, 'Error tracking recommendation');
    }
  }

  return recommendations;
}
