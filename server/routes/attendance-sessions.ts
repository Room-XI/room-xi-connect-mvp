import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db.js';
import { attendanceSessions, attendanceRecords, attendancePasses, consentRequests, consentReceipts, eventRsvps } from '../schema.extras.js';
import { programEvents, programs, users, referrals } from '../schema.js';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import logger from '../logger.ts';

const router = express.Router();

const TOKEN_TTL_MS = 5 * 60 * 1000;
const TOKEN_GRACE_MS = 30 * 1000;

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function isTokenExpired(tokenRotatedAt: Date | string): boolean {
  const rotatedTime = new Date(tokenRotatedAt).getTime();
  return Date.now() - rotatedTime > TOKEN_TTL_MS;
}

async function rotateIfStale(sessionId: string, currentToken: string, tokenRotatedAt: Date | string): Promise<{ sessionToken: string; previousToken: string; tokenRotatedAt: Date } | null> {
  if (!isTokenExpired(tokenRotatedAt)) return null;
  const newToken = generateSessionToken();
  const now = new Date();
  await db.update(attendanceSessions)
    .set({ sessionToken: newToken, tokenRotatedAt: now, updatedAt: now })
    .where(eq(attendanceSessions.id, sessionId));
  return { sessionToken: newToken, previousToken: currentToken, tokenRotatedAt: now };
}

function isWithinGracePeriod(tokenRotatedAt: Date | string): boolean {
  const rotatedTime = new Date(tokenRotatedAt).getTime();
  return Date.now() - rotatedTime <= TOKEN_GRACE_MS;
}

const requireWorker = (req: Request, res: Response, next: any) => {
  if (!(req.session as any)?.youthWorkerId) {
    return res.status(401).json({ error: 'Worker authentication required' });
  }
  next();
};

router.post('/open', requireWorker, async (req: Request, res: Response) => {
  try {
    const workerId = (req.session as any).youthWorkerId;
    const orgId = (req.session as any).organizationId;
    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required' });
    }

    const [event] = await db.select({
      id: programEvents.id,
      programId: programEvents.programId,
      eventName: programEvents.eventName,
      active: programEvents.active,
    })
    .from(programEvents)
    .where(eq(programEvents.id, eventId))
    .limit(1);

    if (!event || !event.active) {
      return res.status(404).json({ error: 'Event not found or inactive' });
    }

    const [program] = await db.select({ orgId: programs.orgId })
      .from(programs)
      .where(eq(programs.id, event.programId))
      .limit(1);

    if (!program?.orgId || program.orgId !== orgId) {
      return res.status(403).json({ error: 'Not authorized for this program' });
    }

    const [existingOpen] = await db.select({ id: attendanceSessions.id })
      .from(attendanceSessions)
      .where(and(
        eq(attendanceSessions.eventId, eventId),
        eq(attendanceSessions.status, 'open')
      ))
      .limit(1);

    if (existingOpen) {
      return res.status(409).json({ error: 'Session already open for this event', sessionId: existingOpen.id });
    }

    const sessionToken = generateSessionToken();

    const [session] = await db.insert(attendanceSessions).values({
      eventId,
      programId: event.programId,
      orgId,
      openedBy: workerId,
      status: 'open',
      sessionToken,
      tokenRotatedAt: new Date(),
    }).returning();

    logger.info({ workerId, eventId, sessionId: session.id }, 'Attendance session opened');

    res.status(201).json({ session });
  } catch (error) {
    logger.error({ err: error, context: 'attendance-session-open' }, 'Error opening session');
    res.status(500).json({ error: 'Failed to open session' });
  }
});

router.post('/:id/close', requireWorker, async (req: Request, res: Response) => {
  try {
    const workerId = (req.session as any).youthWorkerId;
    const orgId = (req.session as any).organizationId;
    const { id } = req.params;
    const { notes } = req.body;

    const [session] = await db.select()
      .from(attendanceSessions)
      .where(and(eq(attendanceSessions.id, id), eq(attendanceSessions.orgId, orgId)))
      .limit(1);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status === 'closed') {
      return res.status(400).json({ error: 'Session already closed' });
    }

    const [updated] = await db.update(attendanceSessions)
      .set({
        status: 'closed',
        closedAt: new Date(),
        closedBy: workerId,
        notes: notes || null,
        updatedAt: new Date(),
      })
      .where(eq(attendanceSessions.id, id))
      .returning();

    logger.info({ workerId, sessionId: id }, 'Attendance session closed');

    try {
      const attendedYouth = await db.select({ youthId: attendanceRecords.userId })
        .from(attendanceRecords)
        .where(eq(attendanceRecords.sessionId, id));

      const attendedIds = attendedYouth.map(r => r.youthId).filter(Boolean) as string[];

      const now = new Date();
      if (attendedIds.length > 0) {
        await db.update(referrals)
          .set({ status: 'missed', outcome: 'missed', outcomeAt: now, updatedAt: now })
          .where(and(
            eq(referrals.eventId, session.eventId),
            eq(referrals.status, 'accepted'),
            sql`${referrals.youthId} NOT IN (${sql.join(attendedIds.map(id => sql`${id}`), sql`, `)})`
          ));
      } else {
        await db.update(referrals)
          .set({ status: 'missed', outcome: 'missed', outcomeAt: now, updatedAt: now })
          .where(and(
            eq(referrals.eventId, session.eventId),
            eq(referrals.status, 'accepted')
          ));
      }

      logger.info({ sessionId: id, eventId: session.eventId }, 'Marked unattended referrals as missed');
    } catch (missedErr) {
      logger.error({ err: missedErr, sessionId: id }, 'Failed to update missed referrals');
    }

    res.json({ session: updated });
  } catch (error) {
    logger.error({ err: error, context: 'attendance-session-close' }, 'Error closing session');
    res.status(500).json({ error: 'Failed to close session' });
  }
});

router.post('/:id/rotate', requireWorker, async (req: Request, res: Response) => {
  try {
    const orgId = (req.session as any).organizationId;
    const { id } = req.params;

    const [session] = await db.select()
      .from(attendanceSessions)
      .where(and(eq(attendanceSessions.id, id), eq(attendanceSessions.orgId, orgId)))
      .limit(1);

    if (!session || session.status !== 'open') {
      return res.status(400).json({ error: 'Session not found or not open' });
    }

    const newToken = generateSessionToken();

    const [updated] = await db.update(attendanceSessions)
      .set({
        sessionToken: newToken,
        tokenRotatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(attendanceSessions.id, id))
      .returning();

    res.json({ sessionToken: updated.sessionToken, tokenRotatedAt: updated.tokenRotatedAt });
  } catch (error) {
    logger.error({ err: error, context: 'attendance-session-rotate' }, 'Error rotating session token');
    res.status(500).json({ error: 'Failed to rotate token' });
  }
});

router.post('/:id/check-in', requireWorker, async (req: Request, res: Response) => {
  try {
    const workerId = (req.session as any).youthWorkerId;
    const orgId = (req.session as any).organizationId;
    const { id } = req.params;
    const { userId, passToken, sessionToken, method, notes, walkinJustification } = req.body;

    if (!method) {
      return res.status(400).json({ error: 'method is required' });
    }

    const validMethods = ['roster', 'scan', 'kiosk', 'walk-in'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({ error: `Invalid method. Must be one of: ${validMethods.join(', ')}` });
    }

    const [session] = await db.select()
      .from(attendanceSessions)
      .where(and(eq(attendanceSessions.id, id), eq(attendanceSessions.orgId, orgId)))
      .limit(1);

    if (!session || session.status !== 'open') {
      return res.status(400).json({ error: 'Session not found or not open' });
    }

    const SESSION_WINDOW_HOURS = 8;
    const sessionAge = (Date.now() - new Date(session.createdAt).getTime()) / (1000 * 60 * 60);
    if (sessionAge > SESSION_WINDOW_HOURS) {
      return res.status(400).json({ error: 'Session has exceeded maximum duration. Please close and reopen.' });
    }

    if (method === 'scan' || method === 'kiosk') {
      if (!sessionToken) {
        return res.status(403).json({ error: 'Session token is required for scan/kiosk check-in' });
      }

      const rotated = await rotateIfStale(session.id, session.sessionToken, session.tokenRotatedAt);

      if (rotated) {
        // M-grace hardening (device-bound, one-shot per rotation):
        //
        // Kiosk method = shared operator device. We do NOT extend any
        // grace for the previous session token here; the operator can
        // simply re-scan with the freshly-rotated token. Allowing
        // grace on a shared device would let anyone who momentarily
        // saw the prior QR replay it.
        //
        // Scan method = the youth's own device, which proves identity
        // via passToken. Even here grace is gated:
        //   (a) we must still be inside the 30s window, AND
        //   (b) a passToken must be presented, AND
        //   (c) the youth bound to that passToken must NOT already
        //       have an attendance_records row for this session — i.e.
        //       grace is single-use per (session, youth). If a captured
        //       (sessionToken, passToken) pair is replayed from a
        //       different device after the legitimate device already
        //       checked in, the unique attendance_records index plus
        //       this preflight reject the replay.
        //
        // The CURRENT (post-rotation) token is always acceptable on
        // its own — rotation grace only relaxes which token the youth
        // device may carry, never the identity model.
        const matchesCurrent = sessionToken === rotated.sessionToken;
        if (!matchesCurrent) {
          if (method !== 'scan') {
            return res.status(403).json({
              error: 'Invalid session token. Token has been rotated.',
              tokenRotated: true,
            });
          }
          const inGrace = isWithinGracePeriod(rotated.tokenRotatedAt);
          if (!inGrace || !passToken || sessionToken !== rotated.previousToken) {
            return res.status(403).json({
              error: 'Invalid session token. Token has been rotated.',
              tokenRotated: true,
            });
          }
          // (c) one-shot per (session, youth): look up the user this
          // passToken belongs to and reject if they already have an
          // attendance row for this session. We deliberately do this
          // BEFORE pass expiry/active checks below so an attacker
          // can't probe the rotation oracle without a fresh pass.
          const [graceCandidate] = await db.select({ userId: attendancePasses.userId })
            .from(attendancePasses)
            .where(eq(attendancePasses.passToken, passToken))
            .limit(1);
          if (!graceCandidate) {
            return res.status(403).json({
              error: 'Invalid session token. Token has been rotated.',
              tokenRotated: true,
            });
          }
          const [priorRecord] = await db.select({ id: attendanceRecords.id })
            .from(attendanceRecords)
            .where(and(
              eq(attendanceRecords.sessionId, session.id),
              eq(attendanceRecords.userId, graceCandidate.userId),
            ))
            .limit(1);
          if (priorRecord) {
            return res.status(403).json({
              error: 'Session token has been rotated. Please refresh.',
              tokenRotated: true,
              code: 'GRACE_ALREADY_USED',
            });
          }
        }
      } else if (sessionToken !== session.sessionToken) {
        return res.status(403).json({ error: 'Invalid session token. Token may have been rotated.' });
      }
    }

    let resolvedUserId = userId;
    let consumedPassId: string | null = null;

    if (passToken && (method === 'scan' || method === 'kiosk')) {
      const [pass] = await db.select()
        .from(attendancePasses)
        .where(and(
          eq(attendancePasses.passToken, passToken),
          eq(attendancePasses.active, true)
        ))
        .limit(1);

      if (!pass) {
        return res.status(410).json({ error: 'Invalid or expired pass' });
      }

      if (pass.tokenExpiresAt < new Date()) {
        return res.status(410).json({ error: 'Pass token expired' });
      }

      // Single-use printed passes cannot be reused once consumed.
      if (pass.singleUse && pass.usedAt) {
        return res.status(410).json({ error: 'Printed pass has already been used', code: 'PASS_ALREADY_USED' });
      }

      resolvedUserId = pass.userId;
      if (pass.singleUse) {
        consumedPassId = pass.id;
      }
    }

    if (!resolvedUserId) {
      return res.status(400).json({ error: 'userId or passToken is required' });
    }

    // Contextual authorization: an operator cannot target an arbitrary
    // youth via roster or walk-in methods. Each path has its own rule.
    if (method === 'roster') {
      const [rsvp] = await db.select({ id: eventRsvps.id })
        .from(eventRsvps)
        .where(and(
          eq(eventRsvps.userId, resolvedUserId),
          eq(eventRsvps.eventId, session.eventId),
          eq(eventRsvps.status, 'confirmed')
        ))
        .limit(1);
      if (!rsvp) {
        return res.status(403).json({
          error: 'Youth is not on this event roster. Use walk-in with a justification instead.',
          code: 'NOT_ON_ROSTER',
        });
      }
    }

    if (method === 'walk-in') {
      const trimmedJustification = (walkinJustification || '').trim();
      if (trimmedJustification.length < 3) {
        return res.status(400).json({
          error: 'Walk-in requires a short justification string.',
          code: 'WALKIN_JUSTIFICATION_REQUIRED',
        });
      }
    }

    const [userRecord] = await db.select({ id: users.id, isMinor: users.isMinor })
      .from(users)
      .where(eq(users.id, resolvedUserId))
      .limit(1);

    if (!userRecord) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Consent snapshot: for minors on consent-gated events we fetch the
    // active signed consent_receipt at check-in time and persist its id
    // on the attendance_records row. Snapshot is immutable — later
    // withdrawal of the underlying consent does not rewrite history.
    let consentReceiptSnapshotId: string | null = null;

    if (userRecord.isMinor && session.eventId) {
      const [eventInfo] = await db.select({ programId: programEvents.programId })
        .from(programEvents)
        .where(eq(programEvents.id, session.eventId))
        .limit(1);

      if (eventInfo) {
        const [signedConsent] = await db.select({
          id: consentRequests.id,
          receiptId: consentReceipts.id,
        })
          .from(consentRequests)
          .leftJoin(consentReceipts, and(
            eq(consentReceipts.requestId, consentRequests.id),
            isNull(consentReceipts.withdrawnAt)
          ))
          .where(and(
            eq(consentRequests.youthId, resolvedUserId),
            eq(consentRequests.programId, eventInfo.programId),
            eq(consentRequests.status, 'signed')
          ))
          .limit(1);

        if (!signedConsent) {
          logger.warn({ userId: resolvedUserId, eventId: session.eventId, programId: eventInfo.programId }, 'Attendance blocked: minor lacks signed parental consent');
          return res.status(403).json({ error: 'Parental consent required for minor check-in', code: 'CONSENT_REQUIRED' });
        }

        consentReceiptSnapshotId = signedConsent.receiptId || null;
      }
    }

    const [existing] = await db.select({ id: attendanceRecords.id })
      .from(attendanceRecords)
      .where(and(
        eq(attendanceRecords.userId, resolvedUserId),
        eq(attendanceRecords.sessionId, id)
      ))
      .limit(1);

    const isKiosk = method === 'kiosk';

    if (existing) {
      if (isKiosk) {
        return res.status(409).json({ ok: false, message: 'Already checked in' });
      }
      return res.status(409).json({ error: 'Already checked in to this session', code: 'DUPLICATE' });
    }

    const [record] = await db.insert(attendanceRecords).values({
      sessionId: id,
      userId: resolvedUserId,
      method,
      checkedInBy: isKiosk ? null : workerId,
      notes: notes || null,
      consentReceiptId: consentReceiptSnapshotId,
      walkinJustification: method === 'walk-in' ? (walkinJustification || '').trim() : null,
    }).returning();

    // Consume printed pass on first successful check-in.
    if (consumedPassId) {
      await db.update(attendancePasses)
        .set({ usedAt: new Date(), active: false, updatedAt: new Date() })
        .where(eq(attendancePasses.id, consumedPassId));
    }

    logger.info({
      sessionId: id,
      userId: resolvedUserId,
      method,
      consentReceiptId: consentReceiptSnapshotId,
      walkIn: method === 'walk-in',
    }, 'Attendance recorded');

    try {
      const now = new Date();
      const [acceptedReferral] = await db.select({ id: referrals.id })
        .from(referrals)
        .where(and(
          eq(referrals.youthId, resolvedUserId),
          eq(referrals.eventId, session.eventId),
          eq(referrals.status, 'accepted')
        ))
        .limit(1);

      if (acceptedReferral) {
        await db.update(referrals)
          .set({ status: 'attended', outcome: 'attended', outcomeAt: now, updatedAt: now })
          .where(eq(referrals.id, acceptedReferral.id));

        logger.info({ referralId: acceptedReferral.id, userId: resolvedUserId }, 'Referral outcome: attended');
      }
    } catch (refErr) {
      logger.error({ err: refErr }, 'Non-blocking: failed to update referral outcome');
    }

    if (isKiosk) {
      return res.status(201).json({ ok: true, message: 'Checked in successfully' });
    }

    const [checkedInUser] = await db.select({
      displayName: users.displayName,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, resolvedUserId))
    .limit(1);

    res.status(201).json({
      record,
      user: checkedInUser ? {
        displayName: checkedInUser.displayName,
        email: checkedInUser.email,
      } : null,
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Already checked in to this session', code: 'DUPLICATE' });
    }
    logger.error({ err: error, context: 'attendance-check-in' }, 'Error recording attendance');
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

router.get('/:id/records', requireWorker, async (req: Request, res: Response) => {
  try {
    const orgId = (req.session as any).organizationId;
    const { id } = req.params;

    const [session] = await db.select()
      .from(attendanceSessions)
      .where(and(eq(attendanceSessions.id, id), eq(attendanceSessions.orgId, orgId)))
      .limit(1);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status === 'open') {
      const rotated = await rotateIfStale(session.id, session.sessionToken, session.tokenRotatedAt);
      if (rotated) {
        session.sessionToken = rotated.sessionToken;
        session.tokenRotatedAt = rotated.tokenRotatedAt;
      }
    }

    const records = await db.select({
      id: attendanceRecords.id,
      userId: attendanceRecords.userId,
      method: attendanceRecords.method,
      checkedInAt: attendanceRecords.checkedInAt,
      notes: attendanceRecords.notes,
      displayName: users.displayName,
      email: users.email,
    })
    .from(attendanceRecords)
    .innerJoin(users, eq(attendanceRecords.userId, users.id))
    .where(eq(attendanceRecords.sessionId, id))
    .orderBy(desc(attendanceRecords.checkedInAt));

    res.json({ session, records, count: records.length });
  } catch (error) {
    logger.error({ err: error, context: 'attendance-records' }, 'Error fetching attendance records');
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

router.get('/active', requireWorker, async (req: Request, res: Response) => {
  try {
    const orgId = (req.session as any).organizationId;

    const sessions = await db.select({
      id: attendanceSessions.id,
      eventId: attendanceSessions.eventId,
      programId: attendanceSessions.programId,
      status: attendanceSessions.status,
      sessionToken: attendanceSessions.sessionToken,
      tokenRotatedAt: attendanceSessions.tokenRotatedAt,
      createdAt: attendanceSessions.createdAt,
      eventName: programEvents.eventName,
      dayOfWeek: programEvents.dayOfWeek,
      startTime: programEvents.startTime,
      endTime: programEvents.endTime,
      programTitle: programs.title,
    })
    .from(attendanceSessions)
    .innerJoin(programEvents, eq(attendanceSessions.eventId, programEvents.id))
    .innerJoin(programs, eq(attendanceSessions.programId, programs.id))
    .where(and(
      eq(attendanceSessions.orgId, orgId),
      eq(attendanceSessions.status, 'open')
    ))
    .orderBy(desc(attendanceSessions.createdAt));

    const sessionsWithCounts = await Promise.all(sessions.map(async (s) => {
      const rotated = await rotateIfStale(s.id, s.sessionToken, s.tokenRotatedAt);
      const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
        .from(attendanceRecords)
        .where(eq(attendanceRecords.sessionId, s.id));
      return {
        ...s,
        ...(rotated ? { sessionToken: rotated.sessionToken, tokenRotatedAt: rotated.tokenRotatedAt } : {}),
        checkedInCount: countResult?.count || 0,
      };
    }));

    res.json({ sessions: sessionsWithCounts });
  } catch (error) {
    logger.error({ err: error, context: 'attendance-active-sessions' }, 'Error fetching active sessions');
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.get('/events', requireWorker, async (req: Request, res: Response) => {
  try {
    const orgId = (req.session as any).organizationId;

    const events = await db.select({
      eventId: programEvents.id,
      eventName: programEvents.eventName,
      dayOfWeek: programEvents.dayOfWeek,
      startTime: programEvents.startTime,
      endTime: programEvents.endTime,
      locationName: programEvents.locationName,
      programId: programEvents.programId,
      programTitle: programs.title,
    })
    .from(programEvents)
    .innerJoin(programs, eq(programEvents.programId, programs.id))
    .where(and(
      eq(programs.orgId, orgId),
      eq(programEvents.active, true)
    ))
    .orderBy(programs.title, programEvents.dayOfWeek);

    res.json({ events });
  } catch (error) {
    logger.error({ err: error, context: 'attendance-events' }, 'Error fetching org events');
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.get('/roster/:sessionId', requireWorker, async (req: Request, res: Response) => {
  try {
    const orgId = (req.session as any).organizationId;
    const { sessionId } = req.params;

    const [session] = await db.select()
      .from(attendanceSessions)
      .where(and(eq(attendanceSessions.id, sessionId), eq(attendanceSessions.orgId, orgId)))
      .limit(1);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { eventRsvps } = await import('../schema.extras.js');
    const rsvped = await db.select({
      userId: eventRsvps.userId,
      displayName: users.displayName,
      email: users.email,
      rsvpStatus: eventRsvps.status,
    })
    .from(eventRsvps)
    .innerJoin(users, eq(eventRsvps.userId, users.id))
    .where(and(
      eq(eventRsvps.eventId, session.eventId),
      eq(eventRsvps.status, 'confirmed')
    ));

    const checkedIn = await db.select({ userId: attendanceRecords.userId })
      .from(attendanceRecords)
      .where(eq(attendanceRecords.sessionId, sessionId));

    const checkedInSet = new Set(checkedIn.map(r => r.userId));

    const roster = rsvped.map(r => ({
      userId: r.userId,
      displayName: r.displayName,
      email: r.email,
      checkedIn: checkedInSet.has(r.userId),
    }));

    res.json({ roster });
  } catch (error) {
    logger.error({ err: error, context: 'attendance-roster' }, 'Error fetching roster');
    res.status(500).json({ error: 'Failed to fetch roster' });
  }
});

export default router;
