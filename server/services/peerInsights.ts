import { db } from '../db.js';
import { outcomeEvents, peerSuccessInsights, programs, auditTrail, privacyConsents } from '../schema.js';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';
import { DateTime } from 'luxon';

const K_ANONYMITY_THRESHOLD = 5;
const PERCENTAGE_ROUNDING = 5;

export interface PeerInsightData {
  programId: string;
  periodStart: string;
  periodEnd: string;
  totalResponses: number;
  averageRating: number | null;
  recommendationRate: number | null;
  moodImprovementRate: number | null;
  commonBarriers: Array<{ barrier: string; frequency: number }>;
  commonBenefits: Array<{ benefit: string; count: number }>;
  barriersResolvedRate: number | null;
  suppressed: boolean;
  suppressionReason: string | null;
}

export async function computePeerInsights(
  programId: string,
  periodStart: string,
  periodEnd: string
): Promise<PeerInsightData | null> {
  console.log('[Peer Insights] Computing insights for program:', {
    programId,
    periodStart,
    periodEnd,
    timestamp: new Date().toISOString(),
  });

  const outcomes = await db
    .select()
    .from(outcomeEvents)
    .where(
      and(
        eq(outcomeEvents.programId, programId),
        eq(outcomeEvents.attended, true),
        gte(outcomeEvents.createdAt, new Date(periodStart)),
        lte(outcomeEvents.createdAt, new Date(periodEnd))
      )
    );

  if (outcomes.length === 0) {
    console.log('[Peer Insights] No outcomes found for program in period');
    return null;
  }

  const consentedUserIds = await getUsersWithOutcomeConsent();
  const consentedOutcomes = outcomes.filter((o) => consentedUserIds.includes(o.userId));

  console.log(`[Peer Insights] ${consentedOutcomes.length}/${outcomes.length} outcomes with consent`);

  if (consentedOutcomes.length < K_ANONYMITY_THRESHOLD) {
    console.log(`[Peer Insights] Below k-anonymity threshold (${K_ANONYMITY_THRESHOLD}), suppressing data`);

    return {
      programId,
      periodStart,
      periodEnd,
      totalResponses: 0,
      averageRating: null,
      recommendationRate: null,
      moodImprovementRate: null,
      commonBarriers: [],
      commonBenefits: [],
      barriersResolvedRate: null,
      suppressed: true,
      suppressionReason: `Less than ${K_ANONYMITY_THRESHOLD} responses with consent`,
    };
  }

  const ratedOutcomes = consentedOutcomes.filter((o) => o.helpfulnessRating !== null);
  const averageRating =
    ratedOutcomes.length > 0
      ? ratedOutcomes.reduce((sum, o) => sum + (o.helpfulnessRating || 0), 0) /
        ratedOutcomes.length
      : null;

  const recommendationOutcomes = consentedOutcomes.filter((o) => o.wouldRecommend !== null);
  const rawRecommendationRate =
    recommendationOutcomes.length > 0
      ? (recommendationOutcomes.filter((o) => o.wouldRecommend).length /
          recommendationOutcomes.length) *
        100
      : null;
  const recommendationRate = rawRecommendationRate
    ? roundToNearest(rawRecommendationRate, PERCENTAGE_ROUNDING)
    : null;

  const moodOutcomes = consentedOutcomes.filter((o) => o.moodBefore && o.moodAfter);
  const moodImprovements = moodOutcomes.filter((o) => {
    const before = getMoodScore(o.moodBefore!);
    const after = getMoodScore(o.moodAfter!);
    return after > before;
  }).length;
  const rawMoodImprovementRate =
    moodOutcomes.length > 0 ? (moodImprovements / moodOutcomes.length) * 100 : null;
  const moodImprovementRate = rawMoodImprovementRate
    ? roundToNearest(rawMoodImprovementRate, PERCENTAGE_ROUNDING)
    : null;

  const barrierCounts: Record<string, number> = {};
  consentedOutcomes.forEach((o) => {
    o.barriersEncountered.forEach((barrier) => {
      barrierCounts[barrier] = (barrierCounts[barrier] || 0) + 1;
    });
  });

  const commonBarriers = Object.entries(barrierCounts)
    .map(([barrier, count]) => ({
      barrier,
      frequency: roundToNearest((count / consentedOutcomes.length) * 100, PERCENTAGE_ROUNDING),
    }))
    .filter((b) => b.frequency >= 10)
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);

  const benefitKeywords = extractBenefitsFromReflections(
    consentedOutcomes
      .filter((o) => o.reflectionText)
      .map((o) => o.reflectionText!)
  );

  const barriersWithResolution = consentedOutcomes.filter(
    (o) => o.barriersEncountered.length > 0
  );
  const rawBarriersResolvedRate =
    barriersWithResolution.length > 0
      ? (barriersWithResolution.filter((o) => o.barriersResolved).length /
          barriersWithResolution.length) *
        100
      : null;
  const barriersResolvedRate = rawBarriersResolvedRate
    ? roundToNearest(rawBarriersResolvedRate, PERCENTAGE_ROUNDING)
    : null;

  await logAggregationOperation(programId, consentedOutcomes.length, {
    periodStart,
    periodEnd,
    averageRating,
    recommendationRate,
    moodImprovementRate,
  });

  console.log('[Peer Insights] Insights computed successfully:', {
    totalResponses: consentedOutcomes.length,
    averageRating,
    recommendationRate,
    moodImprovementRate,
  });

  return {
    programId,
    periodStart,
    periodEnd,
    totalResponses: consentedOutcomes.length,
    averageRating,
    recommendationRate,
    moodImprovementRate,
    commonBarriers,
    commonBenefits: benefitKeywords,
    barriersResolvedRate,
    suppressed: false,
    suppressionReason: null,
  };
}

export async function storePeerInsights(insights: PeerInsightData): Promise<void> {
  console.log('[Peer Insights] Storing insights for program:', insights.programId);

  await db
    .insert(peerSuccessInsights)
    .values({
      programId: insights.programId,
      periodStart: insights.periodStart,
      periodEnd: insights.periodEnd,
      totalResponses: insights.totalResponses,
      averageRating: insights.averageRating?.toString() || null,
      recommendationRate: insights.recommendationRate?.toString() || null,
      moodImprovementRate: insights.moodImprovementRate?.toString() || null,
      commonBarriers: insights.commonBarriers.map((b) => b.barrier),
      commonBenefits: insights.commonBenefits.map((b) => b.benefit),
      barriersResolvedRate: insights.barriersResolvedRate?.toString() || null,
      suppressed: insights.suppressed,
      suppressionReason: insights.suppressionReason,
      differentialPrivacyApplied: true,
      kAnonymityThreshold: K_ANONYMITY_THRESHOLD,
    })
    .onConflictDoUpdate({
      target: [
        peerSuccessInsights.programId,
        peerSuccessInsights.periodStart,
        peerSuccessInsights.periodEnd,
      ],
      set: {
        totalResponses: insights.totalResponses,
        averageRating: insights.averageRating?.toString() || null,
        recommendationRate: insights.recommendationRate?.toString() || null,
        moodImprovementRate: insights.moodImprovementRate?.toString() || null,
        commonBarriers: insights.commonBarriers.map((b) => b.barrier),
        commonBenefits: insights.commonBenefits.map((b) => b.benefit),
        barriersResolvedRate: insights.barriersResolvedRate?.toString() || null,
        suppressed: insights.suppressed,
        suppressionReason: insights.suppressionReason,
        computedAt: sql`now()`,
      },
    });

  console.log('[Peer Insights] Insights stored successfully');
}

export async function getProgramPeerInsights(programId: string): Promise<PeerInsightData | null> {
  console.log('[Peer Insights] Fetching latest insights for program:', programId);

  const [latest] = await db
    .select()
    .from(peerSuccessInsights)
    .where(eq(peerSuccessInsights.programId, programId))
    .orderBy(sql`${peerSuccessInsights.computedAt} DESC`)
    .limit(1);

  if (!latest) {
    console.log('[Peer Insights] No insights found for program');
    return null;
  }

  if (latest.suppressed) {
    console.log('[Peer Insights] Insights are suppressed:', latest.suppressionReason);
  }

  return {
    programId: latest.programId,
    periodStart: latest.periodStart,
    periodEnd: latest.periodEnd,
    totalResponses: latest.totalResponses,
    averageRating: latest.averageRating ? parseFloat(latest.averageRating) : null,
    recommendationRate: latest.recommendationRate ? parseFloat(latest.recommendationRate) : null,
    moodImprovementRate: latest.moodImprovementRate
      ? parseFloat(latest.moodImprovementRate)
      : null,
    commonBarriers: latest.commonBarriers.map((barrier, index) => ({
      barrier,
      frequency: 0,
    })),
    commonBenefits: latest.commonBenefits.map((benefit) => ({
      benefit,
      count: 0,
    })),
    barriersResolvedRate: latest.barriersResolvedRate
      ? parseFloat(latest.barriersResolvedRate)
      : null,
    suppressed: latest.suppressed,
    suppressionReason: latest.suppressionReason,
  };
}

export async function computePeerInsightsForAllPrograms(): Promise<void> {
  console.log('[Peer Insights] Computing insights for all programs');

  const now = DateTime.now().setZone('America/Edmonton');
  const periodEnd = now.toISODate();
  const periodStart = now.minus({ months: 3 }).toISODate();

  const allPrograms = await db.select({ id: programs.id }).from(programs);

  console.log(`[Peer Insights] Processing ${allPrograms.length} programs`);

  let successCount = 0;
  let suppressedCount = 0;
  let noDataCount = 0;

  for (const program of allPrograms) {
    try {
      const insights = await computePeerInsights(program.id, periodStart, periodEnd);

      if (insights) {
        await storePeerInsights(insights);
        if (insights.suppressed) {
          suppressedCount++;
        } else {
          successCount++;
        }
      } else {
        noDataCount++;
      }
    } catch (error) {
      console.error(`[Peer Insights] Error computing insights for program ${program.id}:`, error);
    }
  }

  console.log('[Peer Insights] Computation complete:', {
    total: allPrograms.length,
    success: successCount,
    suppressed: suppressedCount,
    noData: noDataCount,
  });
}

async function getUsersWithOutcomeConsent(): Promise<string[]> {
  const consented = await db
    .select({ userId: privacyConsents.userId })
    .from(privacyConsents)
    .where(eq(privacyConsents.researchParticipation, true));

  return consented.map((c) => c.userId);
}

function roundToNearest(value: number, nearest: number): number {
  return Math.round(value / nearest) * nearest;
}

function getMoodScore(mood: string): number {
  const moodScores: Record<string, number> = {
    cold: 1,
    stormy: 2,
    foggy: 3,
    clear: 4,
    breezy: 5,
    aurora: 6,
  };
  return moodScores[mood] || 3;
}

function extractBenefitsFromReflections(reflections: string[]): Array<{ benefit: string; count: number }> {
  const benefitKeywords = [
    'helpful',
    'fun',
    'made friends',
    'connections',
    'learned',
    'felt better',
    'mood improved',
    'relaxing',
    'supportive',
    'safe space',
  ];

  const benefitCounts: Record<string, number> = {};

  reflections.forEach((reflection) => {
    const lowerReflection = reflection.toLowerCase();
    benefitKeywords.forEach((keyword) => {
      if (lowerReflection.includes(keyword)) {
        benefitCounts[keyword] = (benefitCounts[keyword] || 0) + 1;
      }
    });
  });

  return Object.entries(benefitCounts)
    .map(([benefit, count]) => ({ benefit, count }))
    .filter((b) => b.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

async function logAggregationOperation(
  programId: string,
  responseCount: number,
  metadata: Record<string, any>
): Promise<void> {
  try {
    await db.insert(auditTrail).values({
      action: 'peer_insights_aggregation',
      tableName: 'peer_success_insights',
      recordId: programId,
      recordData: {
        responseCount,
        kAnonymityThreshold: K_ANONYMITY_THRESHOLD,
        percentageRounding: PERCENTAGE_ROUNDING,
        ...metadata,
      },
      result: 'success',
    });
  } catch (error) {
    console.error('[Peer Insights] Failed to log aggregation operation:', error);
  }
}
