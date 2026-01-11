import express from 'express';
import crypto from 'crypto';
import { db } from '../db.js';
import { xids, attendance } from '../schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import logger from '../logger.ts';

const router = express.Router();

// XID_PEPPER is required in production for secure hashing
const XID_PEPPER = process.env.XID_PEPPER;

// Fail fast in production if XID_PEPPER is missing
if (process.env.NODE_ENV === 'production' && !XID_PEPPER) {
  throw new Error('FATAL: XID_PEPPER environment variable is required in production');
}

// Get pepper with fallback only in development
const getXidPepper = () => {
  if (XID_PEPPER) return XID_PEPPER;
  if (process.env.NODE_ENV !== 'production') {
    logger.warn({ context: 'xid' }, 'Using default XID_PEPPER in development - DO NOT USE IN PRODUCTION');
    return 'default-pepper-DEVELOPMENT-ONLY';
  }
  throw new Error('XID_PEPPER is required');
};

// Get or create XID for user
router.post('/create', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if user already has an active XID
    const [existingXid] = await db.select().from(xids)
      .where(and(
        eq(xids.userId, req.session.userId),
        isNull(xids.tombstonedAt)
      ))
      .limit(1);

    if (existingXid) {
      return res.json({
        ok: true,
        xid_id: existingXid.id,
        xid_hash: existingXid.xidHash,
        checksum: existingXid.checksum,
        message: 'XID already exists'
      });
    }

    // Generate salt (32 bytes for strong security)
    const salt = crypto.randomBytes(32).toString('base64');

    // Generate XID hash using HMAC with environment pepper
    const pepper = getXidPepper();
    const xidHash = crypto
      .createHmac('sha256', pepper)
      .update(req.session.userId + salt)
      .digest('base64');

    // Generate checksum (SHA-256 of hash, first 8 chars)
    const checksum = crypto
      .createHash('sha256')
      .update(xidHash)
      .digest('base64')
      .substring(0, 8);

    // Tombstone old XIDs (for rotation)
    await db.update(xids)
      .set({ tombstonedAt: new Date() })
      .where(and(
        eq(xids.userId, req.session.userId),
        isNull(xids.tombstonedAt)
      ));

    // Create new XID
    const [newXid] = await db.insert(xids)
      .values({
        userId: req.session.userId,
        xidHash,
        checksum,
      })
      .returning();

    res.status(201).json({
      ok: true,
      xid_id: newXid.id,
      xid_hash: newXid.xidHash,
      checksum: newXid.checksum,
      message: 'XID created successfully'
    });
  } catch (error) {
    logger.error({ err: error, context: 'xid-create' }, 'XID creation error');
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// Record attendance
router.post('/attendance', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { programId, method = 'manual', site } = req.body;

    if (!programId) {
      return res.status(400).json({ error: 'programId is required' });
    }

    // Get user's active XID
    const [xid] = await db.select().from(xids)
      .where(and(
        eq(xids.userId, req.session.userId),
        isNull(xids.tombstonedAt)
      ))
      .limit(1);

    if (!xid) {
      return res.status(404).json({ error: 'No active XID found. Please create one first.' });
    }

    // Create attendance record
    const [record] = await db.insert(attendance)
      .values({
        xidId: xid.id,
        programId,
        timestamp: new Date(),
        method,
        site: site || null,
      })
      .returning();

    res.status(201).json(record);
  } catch (error) {
    logger.error({ err: error, context: 'xid-attendance-create' }, 'Attendance creation error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attendance history
router.get('/attendance', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get all XIDs for user (including tombstoned)
    const userXids = await db.select().from(xids)
      .where(eq(xids.userId, req.session.userId));

    if (userXids.length === 0) {
      return res.json([]);
    }

    const xidIds = userXids.map(x => x.id);

    // Get attendance for all user's XIDs
    const records = await db.select().from(attendance)
      .where(sql`${attendance.xidId} = ANY(${xidIds})`);

    res.json(records);
  } catch (error) {
    logger.error({ err: error, context: 'xid-attendance-get' }, 'Get attendance error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
