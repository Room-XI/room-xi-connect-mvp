import express from "express";
import crypto from "crypto";
import { db } from "../db.js";
import { moodTasks } from "../schema.extras.js";
import logger from "../logger.ts";

const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
};

const TOKENS = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [token, data] of TOKENS.entries()) {
    if (data.exp < now) {
      TOKENS.delete(token);
    }
  }
}, 60000);

router.post("/badge/rotate", requireAuth, async (req, res) => {
  try {
    const token = crypto.randomBytes(24).toString("base64url");
    const exp = Date.now() + 90000;

    TOKENS.set(token, {
      uid: req.session.userId,
      exp,
    });

    res.json({
      token,
      expiresAt: new Date(exp),
    });
  } catch (error) {
    logger.error({ err: error, context: 'qr-badge-rotate' }, 'Error rotating badge token');
    res.status(500).json({ error: "Failed to generate token" });
  }
});

const requireAuthStaff = (req, res, next) => {
  if (!req.session?.userId && !req.session?.parentId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

router.post("/scan", requireAuthStaff, async (req, res) => {
  try {
    const { token, programEventId, eventEndIso } = req.body;

    if (!token || !programEventId) {
      return res.status(400).json({ 
        error: "token and programEventId required" 
      });
    }

    const rec = TOKENS.get(token);
    if (!rec || rec.exp < Date.now()) {
      return res.status(410).json({ error: "Token expired or invalid" });
    }

    TOKENS.delete(token);

    const now = new Date();
    const eventEnd = eventEndIso ? new Date(eventEndIso) : null;

    await db.insert(moodTasks).values({
      userId: rec.uid,
      programEventId,
      type: "pre",
      dueAt: now,
    });

    if (eventEnd && eventEnd > now) {
      await db.insert(moodTasks).values({
        userId: rec.uid,
        programEventId,
        type: "post",
        dueAt: eventEnd,
      });
    }

    res.json({
      ok: true,
      userId: rec.uid,
      tasksCreated: eventEnd ? 2 : 1,
    });
  } catch (error) {
    logger.error({ err: error, context: 'qr-scan' }, 'Error scanning QR code');
    res.status(500).json({ error: "Failed to process scan" });
  }
});

router.get("/validate/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const rec = TOKENS.get(token);

    if (!rec || rec.exp < Date.now()) {
      return res.json({ valid: false });
    }

    res.json({
      valid: true,
      expiresAt: new Date(rec.exp),
    });
  } catch (error) {
    logger.error({ err: error, context: 'qr-validate' }, 'Error validating token');
    res.status(500).json({ error: "Failed to validate token" });
  }
});

export default router;
