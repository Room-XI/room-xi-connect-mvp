import { db } from '../db.js';
import { outcomeEvents, recommendationEvents, programs, profiles } from '../schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { MoodKey } from '../../src/lib/moodConfig.js';

export interface OutcomeEventData {
  userId: string;
  programId: string;
  recommendationEventId?: string | null;
  attended: boolean;
  attendanceDate?: string;
  sessionsAttended?: number;
  helpfulnessRating?: number;
  wouldRecommend?: boolean;
  reflectionText?: string;
  moodBefore?: MoodKey;
  moodAfter?: MoodKey;
  barriersEncountered?: string[];
  barriersResolved?: boolean;
}

export interface OutcomeEvent {
  id: string;
  userId: string;
  programId: string;
  recommendationEventId: string | null;
  attended: boolean;
  attendanceDate: string | null;
  sessionsAttended: number;
  helpfulnessRating: number | null;
  wouldRecommend: boolean | null;
  reflectionText: string | null;
  moodBefore: string | null;
  moodAfter: string | null;
  barriersEncountered: string[];
  barriersResolved: boolean;
  followUpCount: number;
  lastFollowUpAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MoodDifferential {
  before: MoodKey | null;
  after: MoodKey | null;
  improved: boolean;
  differential: number;
}

const MOOD_SCORES: Record<MoodKey, number> = {
  cold: 1,
  stormy: 2,
  foggy: 3,
  clear: 4,
  breezy: 5,
  aurora: 6,
};

export async function createOutcomeEvent(data: OutcomeEventData): Promise<OutcomeEvent> {
  console.log('[Outcomes] Creating outcome event:', {
    userId: data.userId,
    programId: data.programId,
    attended: data.attended,
    timestamp: new Date().toISOString(),
  });

  const [outcome] = await db
    .insert(outcomeEvents)
    .values({
      userId: data.userId,
      programId: data.programId,
      recommendationEventId: data.recommendationEventId || null,
      attended: data.attended,
      attendanceDate: data.attendanceDate || null,
      sessionsAttended: data.sessionsAttended || 1,
      helpfulnessRating: data.helpfulnessRating || null,
      wouldRecommend: data.wouldRecommend || null,
      reflectionText: data.reflectionText || null,
      moodBefore: data.moodBefore || null,
      moodAfter: data.moodAfter || null,
      barriersEncountered: data.barriersEncountered || [],
      barriersResolved: data.barriersResolved || false,
      followUpCount: 0,
    })
    .returning();

  console.log('[Outcomes] Outcome event created:', outcome.id);
  return outcome as OutcomeEvent;
}

export async function updateOutcomeEvent(
  outcomeId: string,
  userId: string,
  updates: Partial<OutcomeEventData>
): Promise<OutcomeEvent | null> {
  console.log('[Outcomes] Updating outcome event:', {
    outcomeId,
    userId,
    hasReflection: !!updates.reflectionText,
    timestamp: new Date().toISOString(),
  });

  const [existing] = await db
    .select()
    .from(outcomeEvents)
    .where(and(eq(outcomeEvents.id, outcomeId), eq(outcomeEvents.userId, userId)))
    .limit(1);

  if (!existing) {
    console.log('[Outcomes] Outcome event not found or unauthorized');
    return null;
  }

  const shouldIncrementFollowUp = updates.reflectionText && !existing.reflectionText;

  const [updated] = await db
    .update(outcomeEvents)
    .set({
      helpfulnessRating: updates.helpfulnessRating ?? existing.helpfulnessRating,
      wouldRecommend: updates.wouldRecommend ?? existing.wouldRecommend,
      reflectionText: updates.reflectionText ?? existing.reflectionText,
      moodBefore: updates.moodBefore ?? existing.moodBefore,
      moodAfter: updates.moodAfter ?? existing.moodAfter,
      barriersEncountered: updates.barriersEncountered ?? existing.barriersEncountered,
      barriersResolved: updates.barriersResolved ?? existing.barriersResolved,
      followUpCount: shouldIncrementFollowUp
        ? existing.followUpCount + 1
        : existing.followUpCount,
      lastFollowUpAt: shouldIncrementFollowUp ? sql`now()` : existing.lastFollowUpAt,
      updatedAt: sql`now()`,
    })
    .where(eq(outcomeEvents.id, outcomeId))
    .returning();

  console.log('[Outcomes] Outcome event updated:', updated.id);
  return updated as OutcomeEvent;
}

export async function getUserOutcomes(
  userId: string,
  limit: number = 50
): Promise<OutcomeEvent[]> {
  console.log('[Outcomes] Fetching outcomes for user:', userId);

  const outcomes = await db
    .select()
    .from(outcomeEvents)
    .where(eq(outcomeEvents.userId, userId))
    .orderBy(desc(outcomeEvents.createdAt))
    .limit(limit);

  console.log(`[Outcomes] Found ${outcomes.length} outcome(s) for user`);
  return outcomes as OutcomeEvent[];
}

export async function getProgramOutcomes(programId: string): Promise<OutcomeEvent[]> {
  console.log('[Outcomes] Fetching outcomes for program:', programId);

  const outcomes = await db
    .select()
    .from(outcomeEvents)
    .where(and(eq(outcomeEvents.programId, programId), eq(outcomeEvents.attended, true)))
    .orderBy(desc(outcomeEvents.createdAt));

  console.log(`[Outcomes] Found ${outcomes.length} outcome(s) for program`);
  return outcomes as OutcomeEvent[];
}

export async function getOutcomeById(
  outcomeId: string,
  userId: string
): Promise<OutcomeEvent | null> {
  const [outcome] = await db
    .select()
    .from(outcomeEvents)
    .where(and(eq(outcomeEvents.id, outcomeId), eq(outcomeEvents.userId, userId)))
    .limit(1);

  return outcome ? (outcome as OutcomeEvent) : null;
}

export function calculateMoodDifferential(
  moodBefore: MoodKey | null,
  moodAfter: MoodKey | null
): MoodDifferential {
  if (!moodBefore || !moodAfter) {
    return {
      before: moodBefore,
      after: moodAfter,
      improved: false,
      differential: 0,
    };
  }

  const scoreBefore = MOOD_SCORES[moodBefore];
  const scoreAfter = MOOD_SCORES[moodAfter];
  const differential = scoreAfter - scoreBefore;

  return {
    before: moodBefore,
    after: moodAfter,
    improved: differential > 0,
    differential,
  };
}

export async function checkUserOutcomeConsent(userId: string): Promise<boolean> {
  const [profile] = await db
    .select({ ximiConsent: profiles.ximiConsent })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  return profile?.ximiConsent || false;
}

export async function deleteUserOutcomes(userId: string): Promise<number> {
  console.log('[Outcomes] Deleting all outcomes for user:', userId);

  const deleted = await db
    .delete(outcomeEvents)
    .where(eq(outcomeEvents.userId, userId))
    .returning();

  console.log(`[Outcomes] Deleted ${deleted.length} outcome(s)`);
  return deleted.length;
}

export interface OutcomeSummary {
  totalOutcomes: number;
  attendedPrograms: number;
  averageHelpfulness: number | null;
  recommendationRate: number | null;
  moodImprovements: number;
  commonBarriers: Array<{ barrier: string; count: number }>;
}

export async function getUserOutcomeSummary(userId: string): Promise<OutcomeSummary> {
  const outcomes = await getUserOutcomes(userId, 100);

  const attendedOutcomes = outcomes.filter((o) => o.attended);
  const ratedOutcomes = attendedOutcomes.filter((o) => o.helpfulnessRating !== null);
  const recommendationOutcomes = attendedOutcomes.filter((o) => o.wouldRecommend !== null);

  const averageHelpfulness =
    ratedOutcomes.length > 0
      ? ratedOutcomes.reduce((sum, o) => sum + (o.helpfulnessRating || 0), 0) /
        ratedOutcomes.length
      : null;

  const recommendationRate =
    recommendationOutcomes.length > 0
      ? (recommendationOutcomes.filter((o) => o.wouldRecommend).length /
          recommendationOutcomes.length) *
        100
      : null;

  const moodImprovements = attendedOutcomes.filter((o) => {
    if (!o.moodBefore || !o.moodAfter) return false;
    const diff = calculateMoodDifferential(
      o.moodBefore as MoodKey,
      o.moodAfter as MoodKey
    );
    return diff.improved;
  }).length;

  const barrierCounts: Record<string, number> = {};
  attendedOutcomes.forEach((o) => {
    o.barriersEncountered.forEach((barrier) => {
      barrierCounts[barrier] = (barrierCounts[barrier] || 0) + 1;
    });
  });

  const commonBarriers = Object.entries(barrierCounts)
    .map(([barrier, count]) => ({ barrier, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalOutcomes: outcomes.length,
    attendedPrograms: attendedOutcomes.length,
    averageHelpfulness,
    recommendationRate,
    moodImprovements,
    commonBarriers,
  };
}
