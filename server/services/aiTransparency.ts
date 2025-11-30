import { sql } from 'drizzle-orm';
import { db } from '../db.ts';

/**
 * TASK 14: Record AI transparency metrics
 * Tracks aggregate counts only - no user content
 */
export async function recordAiMetrics({
  totalMessagesDelta = 0,
  crisisDetectedDelta = 0,
  moderationFlaggedDelta = 0,
}: {
  totalMessagesDelta?: number;
  crisisDetectedDelta?: number;
  moderationFlaggedDelta?: number;
}) {
  try {
    await db.execute(sql`
      INSERT INTO ai_transparency_metrics (date, total_messages, crisis_detected, moderation_flagged)
      VALUES (CURRENT_DATE, ${totalMessagesDelta}, ${crisisDetectedDelta}, ${moderationFlaggedDelta})
      ON CONFLICT (date) DO UPDATE
        SET total_messages = ai_transparency_metrics.total_messages + ${totalMessagesDelta},
            crisis_detected = ai_transparency_metrics.crisis_detected + ${crisisDetectedDelta},
            moderation_flagged = ai_transparency_metrics.moderation_flagged + ${moderationFlaggedDelta}
    `);
  } catch (error) {
    console.error('[AI Transparency] Failed to record metrics:', error);
  }
}
