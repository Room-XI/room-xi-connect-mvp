import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db.js';
import { attendancePasses, eventRsvps, attendanceSessions } from '../schema.extras.js';
import { users, profiles, programEvents, programs } from '../schema.js';
import { eq, and } from 'drizzle-orm';
import logger from '../logger.ts';

const router = express.Router();
// Worker-session-scoped router (mounted separately under workerSession in
// server/index.js). Printed-pass issuance is worker-only — mounting it on
// the main user-session router would make `req.session.youthWorkerId`
// unreachable in normal operator flow.
export const workerRouter = express.Router();

const PASS_TOKEN_LIFETIME_MS = 90 * 1000;
// Printed pass: single-use, longer TTL (8h), for youth without phones.
// Staff-issued; consumed on first successful check-in.
const PRINTED_PASS_LIFETIME_MS = 8 * 60 * 60 * 1000;

function generatePassToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

const requireAuth = (req: Request, res: Response, next: any) => {
  if (!(req.session as any)?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

router.post('/generate', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;

    const [existing] = await db.select()
      .from(attendancePasses)
      .where(and(
        eq(attendancePasses.userId, userId),
        eq(attendancePasses.active, true)
      ))
      .limit(1);

    if (existing && existing.tokenExpiresAt > new Date()) {
      return res.json({
        pass: existing,
        message: 'Active pass found',
      });
    }

    if (existing) {
      await db.update(attendancePasses)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(attendancePasses.id, existing.id));
    }

    const passToken = generatePassToken();
    const tokenExpiresAt = new Date(Date.now() + PASS_TOKEN_LIFETIME_MS);

    const [pass] = await db.insert(attendancePasses).values({
      userId,
      passToken,
      tokenExpiresAt,
      active: true,
    }).returning();

    logger.info({ userId }, 'Attendance pass generated');

    res.status(201).json({ pass });
  } catch (error) {
    logger.error({ err: error, context: 'attendance-pass-generate' }, 'Error generating pass');
    res.status(500).json({ error: 'Failed to generate pass' });
  }
});

router.post('/rotate', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;

    const [existing] = await db.select()
      .from(attendancePasses)
      .where(and(
        eq(attendancePasses.userId, userId),
        eq(attendancePasses.active, true)
      ))
      .limit(1);

    if (existing) {
      await db.update(attendancePasses)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(attendancePasses.id, existing.id));
    }

    const passToken = generatePassToken();
    const tokenExpiresAt = new Date(Date.now() + PASS_TOKEN_LIFETIME_MS);

    const [pass] = await db.insert(attendancePasses).values({
      userId,
      passToken,
      tokenExpiresAt,
      active: true,
    }).returning();

    res.json({ pass });
  } catch (error) {
    logger.error({ err: error, context: 'attendance-pass-rotate' }, 'Error rotating pass');
    res.status(500).json({ error: 'Failed to rotate pass' });
  }
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;

    const [pass] = await db.select()
      .from(attendancePasses)
      .where(and(
        eq(attendancePasses.userId, userId),
        eq(attendancePasses.active, true)
      ))
      .limit(1);

    const [user] = await db.select({
      displayName: users.displayName,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

    const [profile] = await db.select({
      preferredName: profiles.preferredName,
      firstName: profiles.firstName,
    })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

    const upcomingRsvps = await db.select({
      eventId: eventRsvps.eventId,
      eventName: programEvents.eventName,
      programTitle: programs.title,
      dayOfWeek: programEvents.dayOfWeek,
      startTime: programEvents.startTime,
      endTime: programEvents.endTime,
      locationName: programEvents.locationName,
    })
    .from(eventRsvps)
    .innerJoin(programEvents, eq(eventRsvps.eventId, programEvents.id))
    .innerJoin(programs, eq(programEvents.programId, programs.id))
    .where(and(
      eq(eventRsvps.userId, userId),
      eq(eventRsvps.status, 'confirmed')
    ))
    .limit(5);

    const rsvpEventIds = upcomingRsvps.map(r => r.eventId);
    let openSessions: { sessionId: string; eventId: string; eventName: string; programTitle: string }[] = [];
    if (rsvpEventIds.length > 0) {
      const { inArray } = await import('drizzle-orm');
      openSessions = await db.select({
        sessionId: attendanceSessions.id,
        eventId: attendanceSessions.eventId,
        eventName: programEvents.eventName,
        programTitle: programs.title,
      })
      .from(attendanceSessions)
      .innerJoin(programEvents, eq(attendanceSessions.eventId, programEvents.id))
      .innerJoin(programs, eq(attendanceSessions.programId, programs.id))
      .where(and(
        eq(attendanceSessions.status, 'open'),
        inArray(attendanceSessions.eventId, rsvpEventIds)
      ))
      .limit(5);
    }

    res.json({
      pass: pass || null,
      displayName: profile?.preferredName || profile?.firstName || user?.displayName || 'Youth',
      upcomingEvents: upcomingRsvps,
      openSessions,
    });
  } catch (error) {
    logger.error({ err: error, context: 'attendance-pass-me' }, 'Error fetching pass');
    res.status(500).json({ error: 'Failed to fetch pass' });
  }
});

// Staff-issued printed pass for no-phone youth.
// Requires worker auth. Contextual authorization: the targeted youth
// must have a confirmed RSVP for an event whose program belongs to
// the worker's organization. Dynamic passes (phone) and printed
// passes coexist; generating a printed pass invalidates any active
// dynamic pass for the same youth.
workerRouter.post('/', async (req: Request, res: Response) => {
  try {
    const workerId = (req.session as any).youthWorkerId;
    const orgId = (req.session as any).organizationId;
    if (!workerId || !orgId) {
      return res.status(401).json({ error: 'Worker authentication required' });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Eligibility: youth must have a confirmed RSVP on an event whose
    // program is owned by this worker's org. Prevents an operator from
    // minting printed passes for arbitrary youth.
    const [eligibleRsvp] = await db.select({ id: eventRsvps.id })
      .from(eventRsvps)
      .innerJoin(programs, eq(eventRsvps.programId, programs.id))
      .where(and(
        eq(eventRsvps.userId, userId),
        eq(eventRsvps.status, 'confirmed'),
        eq(programs.orgId, orgId)
      ))
      .limit(1);

    if (!eligibleRsvp) {
      return res.status(403).json({
        error: 'Youth has no confirmed RSVP in your organization.',
        code: 'NOT_ELIGIBLE_FOR_PRINTED_PASS',
      });
    }

    // Invalidate any currently active pass (dynamic or printed) for this
    // youth — the printed pass becomes the canonical pass until used or
    // expired.
    await db.update(attendancePasses)
      .set({ active: false, updatedAt: new Date() })
      .where(and(
        eq(attendancePasses.userId, userId),
        eq(attendancePasses.active, true)
      ));

    const passToken = generatePassToken();
    const now = new Date();
    const tokenExpiresAt = new Date(now.getTime() + PRINTED_PASS_LIFETIME_MS);

    const [pass] = await db.insert(attendancePasses).values({
      userId,
      passToken,
      tokenExpiresAt,
      active: true,
      kind: 'printed',
      printedAt: now,
      singleUse: true,
    }).returning();

    logger.info({ workerId, orgId, userId, passId: pass.id }, 'Printed attendance pass issued');

    res.status(201).json({ pass });
  } catch (error) {
    logger.error({ err: error, context: 'attendance-pass-print' }, 'Error issuing printed pass');
    res.status(500).json({ error: 'Failed to issue printed pass' });
  }
});

export default router;
