import { db } from "../db.js";
import * as schema from "../schema.ts";
import * as schemaExtensions from "../schema-extensions.ts";
import { and, eq, desc, gte, sql, inArray } from "drizzle-orm";
import logger from "../logger.ts";

/**
 * Trigger Engine: Finds users who may benefit from an intervention.
 * This function identifies users who have had recent negative mood check-ins
 * and haven't received an intervention recently.
 */
async function findInterventionOpportunities(): Promise<string[]> {
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  try {
    const recentNegativeCheckins = await db.query.checkins.findMany({
      where: and(
        gte(schema.checkins.moodLevel16, 4),
        gte(schema.checkins.timestamp, twoDaysAgo)
      ),
      columns: { userId: true },
      orderBy: [desc(schema.checkins.timestamp)],
    });

    const candidateUserIds = [...new Set(recentNegativeCheckins.map(c => c.userId))];

    if (candidateUserIds.length === 0) {
      return [];
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentInterventions = await db
      .select({ userId: schemaExtensions.userInterventionHistory.userId })
      .from(schemaExtensions.userInterventionHistory)
      .where(and(
        inArray(schemaExtensions.userInterventionHistory.userId, candidateUserIds),
        gte(schemaExtensions.userInterventionHistory.deliveredAt, twentyFourHoursAgo)
      ));

    const usersToExclude = new Set(recentInterventions.map(i => i.userId));
    const usersToProcess = candidateUserIds.filter(id => !usersToExclude.has(id));

    return usersToProcess;
  } catch (error) {
    logger.error({ error, context: "proactiveAI" }, "Error finding intervention opportunities");
    return [];
  }
}

/**
 * Content Selection Engine: Selects the best intervention for a user.
 */
async function selectIntervention(userId: string) {
  try {
    const allInterventions = await db
      .select()
      .from(schemaExtensions.aiInterventions)
      .where(eq(schemaExtensions.aiInterventions.active, true));

    const latestCheckin = await db.query.checkins.findFirst({
      where: eq(schema.checkins.userId, userId),
      orderBy: [desc(schema.checkins.timestamp)],
    });

    if (!latestCheckin || allInterventions.length === 0) {
      return null;
    }

    const matchingInterventions = allInterventions.filter(intervention => {
      const conditions = intervention.triggerConditions as any;
      if (conditions.mood && Array.isArray(conditions.mood)) {
        if (conditions.mood.includes(latestCheckin.moodType)) {
          return true;
        }
      }
      if (conditions.moodLevel && latestCheckin.moodLevel16 >= conditions.moodLevel) {
        return true;
      }
      return false;
    });

    if (matchingInterventions.length === 0) {
      return null;
    }

    const recentUserInterventions = await db
      .select()
      .from(schemaExtensions.userInterventionHistory)
      .where(eq(schemaExtensions.userInterventionHistory.userId, userId))
      .orderBy(desc(schemaExtensions.userInterventionHistory.deliveredAt));

    const eligibleInterventions = matchingInterventions.filter(intervention => {
      const lastTimeDelivered = recentUserInterventions.find(h => h.interventionId === intervention.id);
      if (!lastTimeDelivered) return true;

      const cooldownHours = intervention.cooldownPeriodHours ?? 24;
      const cooldownMillis = cooldownHours * 60 * 60 * 1000;
      const now = Date.now();
      const lastDeliveredTime = lastTimeDelivered.deliveredAt ? new Date(lastTimeDelivered.deliveredAt).getTime() : 0;

      return now - lastDeliveredTime > cooldownMillis;
    });

    if (eligibleInterventions.length > 0) {
      const randomIndex = Math.floor(Math.random() * eligibleInterventions.length);
      return eligibleInterventions[randomIndex];
    }

    return null;
  } catch (error) {
    logger.error({ error, userId, context: "proactiveAI" }, "Error selecting intervention");
    return null;
  }
}

/**
 * Delivery Service: Delivers the intervention and records it.
 * Respects user privacy consent before delivery.
 */
async function deliverIntervention(userId: string, intervention: any) {
  try {
    // Check if user has opted into AI/notification features
    const userConsent = await db.query.privacyConsents?.findFirst({
      where: eq(schema.privacyConsents.userId, userId),
    });

    // If user has explicitly opted out, skip delivery and log for audit trail
    if (userConsent && userConsent.notificationsEnabled === false) {
      logger.info({
        userId,
        interventionId: intervention.id,
        type: intervention.interventionType,
        reason: "User has not consented to notifications",
        context: "proactiveAI",
      }, "Skipped intervention delivery: consent not granted");
      return null;
    }

    const [historyRecord] = await db.insert(schemaExtensions.userInterventionHistory).values({
      userId,
      interventionId: intervention.id,
    }).returning();

    logger.info({ 
      interventionId: intervention.id, 
      userId, 
      type: intervention.interventionType,
      context: "proactiveAI" 
    }, "Delivered intervention");
    
    return historyRecord;
  } catch (error) {
    logger.error({ error, userId, interventionId: intervention.id, context: "proactiveAI" }, "Error delivering intervention");
    return null;
  }
}

/**
 * Main orchestrator function to be called by the scheduler.
 */
export async function runProactiveAIEngine() {
  logger.info({ context: "proactiveAI" }, "Running Proactive AI Engine...");
  
  try {
    const userIds = await findInterventionOpportunities();

    if (userIds.length === 0) {
      logger.info({ context: "proactiveAI" }, "No intervention opportunities found.");
      return { processed: 0, delivered: 0 };
    }

    let delivered = 0;
    for (const userId of userIds) {
      const intervention = await selectIntervention(userId);
      if (intervention) {
        await deliverIntervention(userId, intervention);
        delivered++;
      }
    }

    logger.info({ 
      processed: userIds.length, 
      delivered, 
      context: "proactiveAI" 
    }, "Proactive AI Engine run complete.");
    
    return { processed: userIds.length, delivered };
  } catch (error) {
    logger.error({ error, context: "proactiveAI" }, "Proactive AI Engine error");
    return { processed: 0, delivered: 0, error: true };
  }
}

/**
 * AI Journal Summary Service - Privacy-preserving summary for youth workers
 */
export async function generateJournalSummary(youthId: string): Promise<string> {
  try {
    const recentCheckins = await db.query.checkins.findMany({
      where: and(
        eq(schema.checkins.userId, youthId),
        sql`${schema.checkins.note} IS NOT NULL AND ${schema.checkins.note} != ''`
      ),
      orderBy: [desc(schema.checkins.timestamp)],
      limit: 5,
      columns: {
        moodType: true,
        note: true,
        timestamp: true,
      }
    });

    if (recentCheckins.length === 0) {
      return "No recent journal entries with notes are available.";
    }

    const moodCounts: Record<string, number> = {};
    recentCheckins.forEach(c => {
      const mood = c.moodType || "unknown";
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });

    const dominantMood = Object.entries(moodCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || "mixed";

    const summaryTemplates: Record<string, string> = {
      clear: "Recent entries suggest a positive outlook with clear, focused thoughts.",
      breezy: "The youth appears to be in a generally good state, with light and manageable concerns.",
      foggy: "Some uncertainty or confusion appears in recent entries. May benefit from check-in.",
      stormy: "Recent entries indicate emotional turbulence. Proactive support may be helpful.",
      cold: "A pattern of low energy or disconnection is present. Consider reaching out.",
      mixed: "Mood has varied across recent entries. Monitoring recommended.",
    };

    const baseSummary = summaryTemplates[dominantMood] || summaryTemplates.mixed;
    
    return `${baseSummary} Based on ${recentCheckins.length} recent entries.`;
  } catch (error) {
    logger.error({ error, youthId, context: "proactiveAI" }, "Error generating journal summary");
    return "Unable to generate summary at this time.";
  }
}

/**
 * Record user feedback on an intervention
 */
export async function recordInterventionFeedback(
  historyId: string, 
  feedback: { rating?: string; details?: Record<string, any> }
): Promise<boolean> {
  try {
    await db
      .update(schemaExtensions.userInterventionHistory)
      .set({
        feedbackRating: feedback.rating,
        interactionDetails: feedback.details,
        interactionType: "feedback_provided",
      })
      .where(eq(schemaExtensions.userInterventionHistory.id, historyId));
    return true;
  } catch (error) {
    logger.error({ error, historyId, context: "proactiveAI" }, "Error recording feedback");
    return false;
  }
}
