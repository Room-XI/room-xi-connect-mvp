import express from "express";
import { z } from "zod";
import { db } from "../db.js";
import { youthDemographics, parentDemographics, parentLinks } from "../schema.extras.js";
import { and, eq } from "drizzle-orm";

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

router.post("/youth", requireYouth, async (req, res) => {
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
    console.error("Error saving youth demographics:", error);
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
    console.error("Error fetching youth demographics:", error);
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
    console.error("Error saving parent demographics:", error);
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
    console.error("Error fetching parent demographics:", error);
    res.status(500).json({ error: "Failed to fetch demographics" });
  }
});

export default router;
