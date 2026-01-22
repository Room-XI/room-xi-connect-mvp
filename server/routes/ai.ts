import express from "express";
import { db } from "../db.js";
import * as schemaExtensions from "../schema-extensions.ts";
import { eq, and, desc } from "drizzle-orm";
import { generateJournalSummary, recordInterventionFeedback, runProactiveAIEngine } from "../services/proactiveAI.ts";
import logger from "../logger.ts";

const router = express.Router();

// Middleware to require youth worker authentication
function requireYouthWorkerAuth(req: any, res: any, next: any) {
  if (!req.session?.youthWorkerId) {
    return res.status(401).json({ error: "Youth worker authentication required" });
  }
  next();
}

// Middleware to require admin authentication
function requireAdminAuth(req: any, res: any, next: any) {
  if (!req.session?.adminId) {
    return res.status(401).json({ error: "Admin authentication required" });
  }
  next();
}

// Get AI-generated journal summary for a youth (for Youth Workers)
router.get("/summary/:youthId", requireYouthWorkerAuth, async (req, res, next) => {
  const { youthId } = req.params;
  const { youthWorkerId } = req.session;

  try {
    // Verify the youth worker is assigned to this youth and has consent
    const assignment = await db.query.youthWorkerAssignments?.findFirst({
      where: and(
        eq(schemaExtensions.youthWorkerAssignments.youthWorkerId, youthWorkerId),
        eq(schemaExtensions.youthWorkerAssignments.youthId, youthId),
        eq(schemaExtensions.youthWorkerAssignments.consentStatus, "granted")
      ),
    });

    if (!assignment) {
      return res.status(403).json({ error: "No consent to view this youth's data" });
    }

    const summary = await generateJournalSummary(youthId);
    res.status(200).json({ summary });
  } catch (error) {
    logger.error({ error, youthId, context: "ai-routes" }, "Error generating journal summary");
    next(error);
  }
});

// Get intervention history for a user (Admin only)
router.get("/history/:userId", requireAdminAuth, async (req, res, next) => {
  const { userId } = req.params;

  try {
    const history = await db
      .select()
      .from(schemaExtensions.userInterventionHistory)
      .where(eq(schemaExtensions.userInterventionHistory.userId, userId))
      .orderBy(desc(schemaExtensions.userInterventionHistory.deliveredAt))
      .limit(50);

    res.status(200).json(history);
  } catch (error) {
    logger.error({ error, userId, context: "ai-routes" }, "Error fetching intervention history");
    next(error);
  }
});

// Get all AI interventions (Admin only)
router.get("/interventions", requireAdminAuth, async (req, res, next) => {
  try {
    const interventions = await db
      .select()
      .from(schemaExtensions.aiInterventions)
      .orderBy(desc(schemaExtensions.aiInterventions.createdAt));

    res.status(200).json(interventions);
  } catch (error) {
    logger.error({ error, context: "ai-routes" }, "Error fetching interventions");
    next(error);
  }
});

// Create a new AI intervention (Admin only)
router.post("/interventions", requireAdminAuth, async (req, res, next) => {
  const { interventionType, content, triggerConditions, deliveryChannel, cooldownPeriodHours } = req.body;

  if (!interventionType || !content || !triggerConditions) {
    return res.status(400).json({ error: "interventionType, content, and triggerConditions are required" });
  }

  try {
    const [intervention] = await db.insert(schemaExtensions.aiInterventions).values({
      interventionType,
      content,
      triggerConditions,
      deliveryChannel: deliveryChannel || "in_app_notification",
      cooldownPeriodHours: cooldownPeriodHours || 24,
    }).returning();

    logger.info({ interventionId: intervention.id, context: "ai-routes" }, "Created new AI intervention");
    res.status(201).json(intervention);
  } catch (error) {
    logger.error({ error, context: "ai-routes" }, "Error creating intervention");
    next(error);
  }
});

// Update an AI intervention (Admin only)
router.put("/interventions/:id", requireAdminAuth, async (req, res, next) => {
  const { id } = req.params;
  const { interventionType, content, triggerConditions, deliveryChannel, cooldownPeriodHours, active } = req.body;

  try {
    const [updated] = await db
      .update(schemaExtensions.aiInterventions)
      .set({
        interventionType,
        content,
        triggerConditions,
        deliveryChannel,
        cooldownPeriodHours,
        active,
      })
      .where(eq(schemaExtensions.aiInterventions.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Intervention not found" });
    }

    res.status(200).json(updated);
  } catch (error) {
    logger.error({ error, id, context: "ai-routes" }, "Error updating intervention");
    next(error);
  }
});

// Log user feedback on an intervention (Youth)
router.post("/feedback", async (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const { interventionHistoryId, feedback } = req.body;

  if (!interventionHistoryId || !feedback) {
    return res.status(400).json({ error: "interventionHistoryId and feedback are required" });
  }

  try {
    const success = await recordInterventionFeedback(interventionHistoryId, {
      rating: feedback,
      details: { providedAt: new Date().toISOString() },
    });

    if (success) {
      res.status(200).json({ message: "Feedback recorded" });
    } else {
      res.status(500).json({ error: "Failed to record feedback" });
    }
  } catch (error) {
    logger.error({ error, interventionHistoryId, context: "ai-routes" }, "Error recording feedback");
    next(error);
  }
});

// Manually trigger proactive AI engine (Admin only, for testing)
router.post("/trigger", requireAdminAuth, async (req, res, next) => {
  try {
    const result = await runProactiveAIEngine();
    res.status(200).json(result);
  } catch (error) {
    logger.error({ error, context: "ai-routes" }, "Error triggering AI engine");
    next(error);
  }
});

export default router;
