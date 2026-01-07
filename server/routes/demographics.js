import express from "express";
import { z } from "zod";
import { db } from "../db.js";
import { youthDemographics, parentDemographics, parentLinks } from "../schema.extras.js";
import { guardianPerceptions, guardianVerifications } from "../schema.js";
import { and, eq } from "drizzle-orm";
import { requireDataConsent } from "../middleware/consent.ts";
import logger from "../logger.ts";

const router = express.Router();
const Schema = z.record(z.any());

const requireYouth = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
};

const requireParent = (req, res, next) => {
  if (!req.session?.parentId) {
    return res.status(401).json({ error: "Parent authentication required" });
  }
  next();
};

router.post("/youth", requireYouth, requireDataConsent(), async (req, res) => {
  try {
    const userId = req.session.userId;
    const parsed = Schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(422).json({ error: parsed.error.flatten() });
    }

    await db
      .insert(youthDemographics)
      .values({
        userId,
        answers: parsed.data,
      })
      .onConflictDoUpdate({
        target: youthDemographics.userId,
        set: {
          answers: parsed.data,
          updatedAt: new Date(),
        },
      });

    res.json({ saved: true });
  } catch (error) {
    logger.error({ err: error, context: 'demographics-youth-save' }, 'Error saving youth demographics');
    res.status(500).json({ error: "Failed to save demographics" });
  }
});

router.get("/youth", requireYouth, async (req, res) => {
  try {
    const userId = req.session.userId;

    const [demo] = await db
      .select()
      .from(youthDemographics)
      .where(eq(youthDemographics.userId, userId));

    res.json({
      answers: demo?.answers || {},
      updatedAt: demo?.updatedAt,
    });
  } catch (error) {
    logger.error({ err: error, context: 'demographics-youth-get' }, 'Error fetching youth demographics');
    res.status(500).json({ error: "Failed to fetch demographics" });
  }
});

router.post("/parent", requireParent, async (req, res) => {
  try {
    const parentId = req.session.parentId;
    const { userId, answers } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const [link] = await db
      .select()
      .from(parentLinks)
      .where(
        and(
          eq(parentLinks.parentId, parentId),
          eq(parentLinks.userId, userId)
        )
      );

    if (!link) {
      return res.status(403).json({ error: "Not linked to youth" });
    }

    const parsed = Schema.safeParse(answers);
    if (!parsed.success) {
      return res.status(422).json({ error: parsed.error.flatten() });
    }

    await db
      .insert(parentDemographics)
      .values({
        parentId,
        userId,
        answers: parsed.data,
      })
      .onConflictDoUpdate({
        target: [parentDemographics.parentId, parentDemographics.userId],
        set: {
          answers: parsed.data,
          updatedAt: new Date(),
        },
      });

    res.json({ saved: true });
  } catch (error) {
    logger.error({ err: error, context: 'demographics-parent-save' }, 'Error saving parent demographics');
    res.status(500).json({ error: "Failed to save demographics" });
  }
});

router.get("/parent/:userId", requireParent, async (req, res) => {
  try {
    const parentId = req.session.parentId;
    const { userId } = req.params;

    const [link] = await db
      .select()
      .from(parentLinks)
      .where(
        and(
          eq(parentLinks.parentId, parentId),
          eq(parentLinks.userId, userId)
        )
      );

    if (!link) {
      return res.status(403).json({ error: "Not linked to youth" });
    }

    const [demo] = await db
      .select()
      .from(parentDemographics)
      .where(
        and(
          eq(parentDemographics.parentId, parentId),
          eq(parentDemographics.userId, userId)
        )
      );

    res.json({
      answers: demo?.answers || {},
      updatedAt: demo?.updatedAt,
    });
  } catch (error) {
    logger.error({ err: error, context: 'demographics-parent-get' }, 'Error fetching parent demographics');
    res.status(500).json({ error: "Failed to fetch demographics" });
  }
});

// Save guardian perceptions (called from guardian verification flow)
router.post("/guardian-perception/:verificationId", async (req, res) => {
  try {
    const { verificationId } = req.params;
    const perceptionData = req.body;

    // Get the verification record to find the user
    const [verification] = await db
      .select()
      .from(guardianVerifications)
      .where(eq(guardianVerifications.id, verificationId));

    if (!verification) {
      return res.status(404).json({ error: "Verification not found" });
    }

    // Check if already submitted
    const [existing] = await db
      .select()
      .from(guardianPerceptions)
      .where(eq(guardianPerceptions.guardianVerificationId, verificationId));

    if (existing) {
      // Update existing perceptions
      await db.update(guardianPerceptions)
        .set({
          ...perceptionData,
          updatedAt: new Date()
        })
        .where(eq(guardianPerceptions.guardianVerificationId, verificationId));
    } else {
      // Save new guardian perceptions
      await db.insert(guardianPerceptions)
        .values({
          guardianVerificationId: verificationId,
          userId: verification.userId,
          ...perceptionData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error, context: 'demographics-guardian-perception-save' }, 'Guardian perception save error');
    res.status(500).json({ error: "Failed to save guardian perceptions" });
  }
});

// Get youth demographics progress for profile completion meter
router.get("/progress", requireYouth, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Define required fields for complete profile (per product spec: 4 mandatory fields)
    const requiredFields = [
      'age',
      'genderIdentity',
      'racialIdentity',
      'postalCode'
    ];
    
    const [demo] = await db
      .select()
      .from(youthDemographics)
      .where(eq(youthDemographics.userId, userId));
    
    const answers = demo?.answers || {};
    
    // Count completed fields
    const completedFields = requiredFields.filter(field => {
      const value = answers[field];
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined && value !== '';
    });
    
    const percent = Math.round((completedFields.length / requiredFields.length) * 100);
    
    res.json({
      percent,
      completed: completedFields.length,
      total: requiredFields.length,
      requiredFields,
      completedFields,
      missingFields: requiredFields.filter(f => !completedFields.includes(f))
    });
  } catch (error) {
    logger.error({ err: error, context: 'demographics-progress' }, 'Error getting demographics progress');
    res.status(500).json({ error: "Failed to get progress" });
  }
});

// Admin: Get perception vs reality comparison
router.get("/comparison", async (req, res) => {
  try {
    // Check if user is admin (supports both admin portal and profile-based admin)
    if (!req.session?.isAdminSession && !req.session?.isAdmin) {
      return res.status(403).json({ error: "Admin only" });
    }

    // Get all youth demographics with structured data
    const youthData = await db.select().from(youthDemographics);

    // Get all guardian perceptions
    const guardianData = await db.select().from(guardianPerceptions);

    // Create comparison data
    const comparisons = [];
    
    for (const youth of youthData) {
      const guardianView = guardianData.find(g => g.userId === youth.userId);
      
      if (guardianView) {
        // Extract demographics from youth answers (stored as JSONB)
        const youthAnswers = youth.answers || {};
        
        comparisons.push({
          userId: youth.userId,
          youth: {
            sexualOrientation: youthAnswers.sexualOrientation,
            genderIdentity: youthAnswers.genderIdentity,
            racialIdentity: youthAnswers.racialIdentity
          },
          guardian: {
            perceivedSexualOrientation: guardianView.perceivedSexualOrientation,
            perceivedGenderIdentity: guardianView.perceivedGenderIdentity,
            perceivedRacialIdentity: guardianView.perceivedRacialIdentity,
            awarenessLevel: guardianView.awarenessLevel,
            comfortWithIdentity: guardianView.comfortWithIdentity
          },
          matches: {
            sexualOrientation: youthAnswers.sexualOrientation === guardianView.perceivedSexualOrientation,
            genderIdentity: youthAnswers.genderIdentity === guardianView.perceivedGenderIdentity,
            racialIdentity: (youthAnswers.racialIdentity || []).some(r => 
              (guardianView.perceivedRacialIdentity || []).includes(r)
            )
          }
        });
      }
    }

    // Calculate aggregate stats
    const stats = {
      total: comparisons.length,
      sexualOrientationMatch: comparisons.filter(c => c.matches.sexualOrientation).length,
      genderIdentityMatch: comparisons.filter(c => c.matches.genderIdentity).length,
      racialIdentityMatch: comparisons.filter(c => c.matches.racialIdentity).length,
      awarenessLevels: {},
      comfortLevels: {}
    };

    // Count awareness and comfort levels
    comparisons.forEach(c => {
      const awareness = c.guardian.awarenessLevel || "unknown";
      stats.awarenessLevels[awareness] = (stats.awarenessLevels[awareness] || 0) + 1;
      
      const comfort = c.guardian.comfortWithIdentity || "unknown";
      stats.comfortLevels[comfort] = (stats.comfortLevels[comfort] || 0) + 1;
    });

    res.json({
      stats,
      comparisons: req.query.detailed === "true" ? comparisons : undefined
    });
  } catch (error) {
    logger.error({ err: error, context: 'demographics-comparison' }, 'Comparison data error');
    res.status(500).json({ error: "Failed to get comparison data" });
  }
});

export default router;
