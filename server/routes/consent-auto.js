import express from "express";
import { db } from "../db.js";
import { consents, consentEvents } from "../schema.js";
import { eq, and } from "drizzle-orm";
import logger from "../logger.ts";

const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
};

async function upsertConsent(
  userId,
  consentType,
  value,
  actor = "guardian",
  ip,
  ua
) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [prior] = await tx
      .select()
      .from(consents)
      .where(
        and(
          eq(consents.userId, userId),
          eq(consents.consentType, consentType)
        )
      );

    await tx
      .insert(consents)
      .values({
        userId,
        consentType,
        value,
        ipAddress: ip,
        userAgent: ua,
        grantedBy: actor,
        textVersion: "v1",
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [consents.userId, consents.consentType],
        set: {
          value,
          ipAddress: ip,
          userAgent: ua,
          grantedBy: actor,
          textVersion: "v1",
          updatedAt: now,
        },
      });

    await tx.insert(consentEvents).values({
      userId,
      actor,
      eventType: "updated",
      consentKey: consentType,
      oldValue: prior?.value ?? null,
      newValue: value,
      ipAddress: ip,
      userAgent: ua,
      occurredAt: now,
    });
  });
}

router.post("/platform-bootstrap", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    await upsertConsent(
      userId,
      "terms_of_use",
      false,
      "guardian",
      req.ip,
      req.headers["user-agent"]
    );
    await upsertConsent(
      userId,
      "privacy_notice",
      false,
      "guardian",
      req.ip,
      req.headers["user-agent"]
    );

    res.json({ ok: true });
  } catch (error) {
    logger.error({ err: error, context: 'consent-auto-bootstrap' }, 'Error bootstrapping platform consent');
    res.status(500).json({ error: "Failed to create consent records" });
  }
});

router.post("/program-request", requireAuth, async (req, res) => {
  try {
    const { programId } = req.body;

    if (!programId) {
      return res.status(400).json({ error: "programId required" });
    }

    const key = `program:${programId}:registration`;

    await upsertConsent(
      req.session.userId,
      key,
      false,
      "guardian",
      req.ip,
      req.headers["user-agent"]
    );

    res.json({ ok: true });
  } catch (error) {
    logger.error({ err: error, context: 'consent-auto-program-request' }, 'Error creating program consent request');
    res.status(500).json({ error: "Failed to create consent request" });
  }
});

router.get("/pending/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!req.session?.parentId && req.session?.userId !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const pendingConsents = await db
      .select()
      .from(consents)
      .where(
        and(
          eq(consents.userId, userId),
          eq(consents.value, false)
        )
      );

    res.json({
      consents: pendingConsents.map((c) => ({
        consentType: c.consentType,
        value: c.value,
        grantedBy: c.grantedBy,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (error) {
    logger.error({ err: error, context: 'consent-auto-pending' }, 'Error fetching pending consents');
    res.status(500).json({ error: "Failed to fetch consents" });
  }
});

router.post("/approve", async (req, res) => {
  try {
    const { userId, consentType, value } = req.body;

    if (!req.session?.parentId) {
      return res.status(401).json({ error: "Parent authentication required" });
    }

    if (!userId || !consentType || typeof value !== "boolean") {
      return res.status(400).json({ error: "userId, consentType, and value required" });
    }

    const { parentLinks } = await import("../schema.extras.js");
    const { and, eq } = await import("drizzle-orm");
    
    const [link] = await db
      .select()
      .from(parentLinks)
      .where(
        and(
          eq(parentLinks.parentId, req.session.parentId),
          eq(parentLinks.userId, userId)
        )
      );

    if (!link) {
      return res.status(403).json({ error: "Not authorized to manage consent for this youth" });
    }

    await upsertConsent(
      userId,
      consentType,
      value,
      "guardian",
      req.ip,
      req.headers["user-agent"]
    );

    res.json({ ok: true });
  } catch (error) {
    logger.error({ err: error, context: 'consent-auto-approve' }, 'Error approving consent');
    res.status(500).json({ error: "Failed to approve consent" });
  }
});

export default router;
