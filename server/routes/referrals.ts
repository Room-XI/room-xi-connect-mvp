import express, { Request, Response } from 'express';
import { db } from '../db.js';
import { referrals, programs, programEvents, users } from '../schema.js';
import { eventRsvps, parentLinks } from '../schema.extras.js';
import { youthWorkers, youthWorkerAssignments } from '../schema-extensions.js';
import { eq, and, desc, inArray, or, isNull, ilike, sql } from 'drizzle-orm';
import logger from '../logger.ts';
import {
  findOrCreateConsentRequest,
  rsvpStatusForConsent,
  ConsentTemplateUnavailableError,
} from '../pilot/consent/consentEngine.ts';

const staffRouter = express.Router();
const youthRouter = express.Router();

const requireWorker = (req: Request, res: Response, next: any) => {
  if (!(req.session as any)?.youthWorkerId) {
    return res.status(401).json({ error: 'Worker authentication required' });
  }
  next();
};

const requireAuth = (req: Request, res: Response, next: any) => {
  if (!(req.session as any)?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

staffRouter.post('/create', requireWorker, async (req: Request, res: Response) => {
  try {
    const workerId = (req.session as any).youthWorkerId;
    const orgId = (req.session as any).organizationId;
    const { youthId, programId, eventId, notes } = req.body;

    if (!youthId || !programId) {
      return res.status(400).json({ error: 'youthId and programId are required' });
    }

    const [assignment] = await db.select({ youthId: youthWorkerAssignments.youthId })
      .from(youthWorkerAssignments)
      .where(and(
        eq(youthWorkerAssignments.youthWorkerId, workerId),
        eq(youthWorkerAssignments.youthId, youthId)
      ))
      .limit(1);

    if (!assignment) {
      return res.status(403).json({ error: 'Youth is not assigned to you' });
    }

    const [program] = await db.select({ id: programs.id, title: programs.title, orgId: programs.orgId })
      .from(programs)
      .where(eq(programs.id, programId))
      .limit(1);

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    if (program.orgId !== orgId) {
      return res.status(403).json({ error: 'Cannot refer to programs outside your organization' });
    }

    if (eventId) {
      const [event] = await db.select({ id: programEvents.id })
        .from(programEvents)
        .where(and(eq(programEvents.id, eventId), eq(programEvents.programId, programId)))
        .limit(1);

      if (!event) {
        return res.status(404).json({ error: 'Event not found for this program' });
      }
    }

    const [existing] = await db.select({ id: referrals.id, status: referrals.status })
      .from(referrals)
      .where(and(
        eq(referrals.youthId, youthId),
        eq(referrals.programId, programId),
        inArray(referrals.status, ['sent', 'accepted'])
      ))
      .limit(1);

    if (existing) {
      return res.status(409).json({
        error: 'An active referral already exists for this youth and program',
        existingStatus: existing.status,
      });
    }

    const [referral] = await db.insert(referrals).values({
      referredBy: workerId,
      youthId,
      programId,
      eventId: eventId || null,
      fromOrgId: orgId,
      toOrgId: orgId,
      status: 'sent',
      sentAt: new Date(),
      notes: notes || null,
    }).returning();

    logger.info({ referralId: referral.id, youthId, programId, workerId }, 'Referral created');

    res.status(201).json({ referral });
  } catch (error) {
    logger.error({ err: error, context: 'referral-create' }, 'Error creating referral');
    res.status(500).json({ error: 'Failed to create referral' });
  }
});

staffRouter.get('/list', requireWorker, async (req: Request, res: Response) => {
  try {
    const orgId = (req.session as any).organizationId;
    const statusFilter = req.query.status as string | undefined;

    let conditions = [eq(referrals.fromOrgId, orgId)];
    if (statusFilter && ['sent', 'accepted', 'declined', 'attended', 'missed'].includes(statusFilter)) {
      conditions.push(eq(referrals.status, statusFilter));
    }

    const results = await db.select({
      id: referrals.id,
      youthId: referrals.youthId,
      programId: referrals.programId,
      eventId: referrals.eventId,
      status: referrals.status,
      notes: referrals.notes,
      outcome: referrals.outcome,
      outcomeAt: referrals.outcomeAt,
      sentAt: referrals.sentAt,
      acceptedAt: referrals.acceptedAt,
      declinedAt: referrals.declinedAt,
      declinedReason: referrals.declinedReason,
      createdAt: referrals.createdAt,
      youthName: users.displayName,
      programTitle: programs.title,
      eventName: programEvents.eventName,
    })
    .from(referrals)
    .innerJoin(users, eq(referrals.youthId, users.id))
    .innerJoin(programs, eq(referrals.programId, programs.id))
    .leftJoin(programEvents, eq(referrals.eventId, programEvents.id))
    .where(and(...conditions))
    .orderBy(desc(referrals.createdAt))
    .limit(100);

    res.json({ referrals: results });
  } catch (error) {
    logger.error({ err: error, context: 'referral-list' }, 'Error listing referrals');
    res.status(500).json({ error: 'Failed to list referrals' });
  }
});

staffRouter.get('/youth-search', requireWorker, async (req: Request, res: Response) => {
  try {
    const workerId = (req.session as any).youthWorkerId;
    const q = (req.query.q as string || '').trim();
    if (!q || q.length < 2) {
      return res.json({ users: [] });
    }

    const pattern = `%${q}%`;

    const results = await db.selectDistinct({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
    })
    .from(users)
    .innerJoin(youthWorkerAssignments, eq(users.id, youthWorkerAssignments.youthId))
    .where(
      and(
        eq(youthWorkerAssignments.youthWorkerId, workerId),
        or(
          ilike(users.email, pattern),
          ilike(users.displayName, pattern)
        )
      )
    )
    .limit(10);

    res.json({ users: results });
  } catch (error) {
    logger.error({ err: error, context: 'referral-youth-search' }, 'Error searching youth');
    res.status(500).json({ error: 'Failed to search' });
  }
});

staffRouter.get('/programs', requireWorker, async (req: Request, res: Response) => {
  try {
    const orgId = (req.session as any).organizationId;

    const results = await db.select({
      id: programs.id,
      title: programs.title,
      description: programs.description,
    })
    .from(programs)
    .where(eq(programs.orgId, orgId))
    .orderBy(programs.title);

    res.json({ programs: results });
  } catch (error) {
    logger.error({ err: error, context: 'referral-programs' }, 'Error fetching programs');
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
});

staffRouter.get('/programs/:programId/events', requireWorker, async (req: Request, res: Response) => {
  try {
    const orgId = (req.session as any).organizationId;
    const { programId } = req.params;

    const [program] = await db.select({ id: programs.id, orgId: programs.orgId })
      .from(programs)
      .where(eq(programs.id, programId))
      .limit(1);

    if (!program || program.orgId !== orgId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const results = await db.select({
      id: programEvents.id,
      eventName: programEvents.eventName,
      dayOfWeek: programEvents.dayOfWeek,
      startTime: programEvents.startTime,
      endTime: programEvents.endTime,
      locationName: programEvents.locationName,
    })
    .from(programEvents)
    .where(and(
      eq(programEvents.programId, programId),
      eq(programEvents.active, true)
    ))
    .orderBy(programEvents.dayOfWeek);

    res.json({ events: results });
  } catch (error) {
    logger.error({ err: error, context: 'referral-events' }, 'Error fetching events');
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

staffRouter.get('/:id', requireWorker, async (req: Request, res: Response) => {
  try {
    const orgId = (req.session as any).organizationId;
    const { id } = req.params;

    const [referral] = await db.select({
      id: referrals.id,
      youthId: referrals.youthId,
      programId: referrals.programId,
      eventId: referrals.eventId,
      status: referrals.status,
      notes: referrals.notes,
      outcome: referrals.outcome,
      outcomeAt: referrals.outcomeAt,
      sentAt: referrals.sentAt,
      acceptedAt: referrals.acceptedAt,
      declinedAt: referrals.declinedAt,
      declinedReason: referrals.declinedReason,
      createdAt: referrals.createdAt,
      youthName: users.displayName,
      programTitle: programs.title,
      eventName: programEvents.eventName,
    })
    .from(referrals)
    .innerJoin(users, eq(referrals.youthId, users.id))
    .innerJoin(programs, eq(referrals.programId, programs.id))
    .leftJoin(programEvents, eq(referrals.eventId, programEvents.id))
    .where(and(eq(referrals.id, id), eq(referrals.fromOrgId, orgId)))
    .limit(1);

    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    res.json({ referral });
  } catch (error) {
    logger.error({ err: error, context: 'referral-detail' }, 'Error fetching referral');
    res.status(500).json({ error: 'Failed to fetch referral' });
  }
});

youthRouter.get('/inbox', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;

    const results = await db.select({
      id: referrals.id,
      programId: referrals.programId,
      eventId: referrals.eventId,
      status: referrals.status,
      notes: referrals.notes,
      sentAt: referrals.sentAt,
      createdAt: referrals.createdAt,
      programTitle: programs.title,
      programDescription: programs.description,
      eventName: programEvents.eventName,
      dayOfWeek: programEvents.dayOfWeek,
      startTime: programEvents.startTime,
      endTime: programEvents.endTime,
      locationName: programEvents.locationName,
      referrerFirstName: youthWorkers.firstName,
      referrerLastName: youthWorkers.lastName,
    })
    .from(referrals)
    .innerJoin(programs, eq(referrals.programId, programs.id))
    .leftJoin(programEvents, eq(referrals.eventId, programEvents.id))
    .leftJoin(youthWorkers, eq(referrals.referredBy, youthWorkers.id))
    .where(eq(referrals.youthId, userId))
    .orderBy(desc(referrals.createdAt))
    .limit(50);

    const mapped = results.map(r => ({
      ...r,
      referrerName: [r.referrerFirstName, r.referrerLastName].filter(Boolean).join(' ') || null,
      referrerFirstName: undefined,
      referrerLastName: undefined,
    }));

    const pending = mapped.filter(r => r.status === 'sent');
    const responded = mapped.filter(r => r.status !== 'sent');

    res.json({ pending, responded, total: mapped.length });
  } catch (error) {
    logger.error({ err: error, context: 'referral-inbox' }, 'Error fetching referral inbox');
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
});

youthRouter.get('/count', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;

    const pending = await db.select({ id: referrals.id })
      .from(referrals)
      .where(and(
        eq(referrals.youthId, userId),
        eq(referrals.status, 'sent')
      ));

    res.json({ count: pending.length });
  } catch (error) {
    res.json({ count: 0 });
  }
});

youthRouter.post('/:id/accept', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const { id } = req.params;

    const [referral] = await db.select()
      .from(referrals)
      .where(and(eq(referrals.id, id), eq(referrals.youthId, userId)))
      .limit(1);

    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    if (referral.status !== 'sent') {
      return res.status(400).json({ error: 'Referral has already been responded to' });
    }

    const now = new Date();

    await db.transaction(async (tx) => {
      await tx.update(referrals)
        .set({ status: 'accepted', acceptedAt: now, updatedAt: now })
        .where(eq(referrals.id, id));

      if (referral.eventId) {
        const [existing] = await tx.select()
          .from(eventRsvps)
          .where(and(
            eq(eventRsvps.userId, userId),
            eq(eventRsvps.eventId, referral.eventId)
          ))
          .limit(1);

        // Only (re)create RSVP when there is none OR existing is in a
        // terminal revivable state (cancelled/blocked). Active states
        // (confirmed, pending_consent) are left intact.
        const revivable = !existing || existing.status === 'cancelled' || existing.status === 'blocked';

        if (revivable) {
          const [user] = await tx.select({ isMinor: users.isMinor })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

          let rsvpStatus = 'confirmed';
          let consentRequestId: string | null = null;

          if (user?.isMinor) {
            const [parentLink] = await tx.select({ parentId: parentLinks.parentId })
              .from(parentLinks)
              .where(eq(parentLinks.userId, userId))
              .limit(1);

            if (!parentLink) {
              // Fail closed: minor without a linked guardian cannot RSVP.
              throw Object.assign(new Error('Guardian link required before accepting referral.'), {
                httpStatus: 409,
                code: 'GUARDIAN_LINK_REQUIRED',
              });
            }

            try {
              // Canonical consent runtime: same engine that backs RSVP.
              // Passing `tx` keeps everything inside the referral
              // transaction so a downstream failure rolls everything back.
              const snapshot = await findOrCreateConsentRequest(tx as any, {
                youthId: userId,
                parentId: parentLink.parentId,
                programId: referral.programId!,
                source: 'referral_accept',
                actorId: userId,
                actorType: 'youth',
                sourceMetadata: { referralId: referral.id, eventId: referral.eventId },
                ipAddress:
                  req.headers['x-forwarded-for']?.toString()
                  || req.socket?.remoteAddress
                  || null,
                userAgent: req.headers['user-agent'] || null,
              });
              rsvpStatus = rsvpStatusForConsent(snapshot.status);
              consentRequestId = snapshot.id;
            } catch (err) {
              if (err instanceof ConsentTemplateUnavailableError) {
                throw Object.assign(new Error(err.message), {
                  httpStatus: err.httpStatus,
                  code: err.code,
                });
              }
              throw err;
            }
          }

          if (existing) {
            await tx.update(eventRsvps)
              .set({
                status: rsvpStatus,
                consentRequestId,
                cancelledAt: null,
                cancelReason: null,
                updatedAt: now,
              })
              .where(eq(eventRsvps.id, existing.id));
          } else {
            await tx.insert(eventRsvps).values({
              userId,
              eventId: referral.eventId,
              programId: referral.programId!,
              status: rsvpStatus,
              consentRequestId,
            });
          }
        }

        logger.info({ referralId: id, userId, eventId: referral.eventId }, 'Referral accepted, RSVP created');
      }
    });

    res.json({ success: true, status: 'accepted' });
  } catch (error: any) {
    if (error?.httpStatus && error?.code) {
      return res.status(error.httpStatus).json({ error: error.message, code: error.code });
    }
    logger.error({ err: error, context: 'referral-accept' }, 'Error accepting referral');
    res.status(500).json({ error: 'Failed to accept referral' });
  }
});

youthRouter.post('/:id/decline', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const { id } = req.params;
    const { reason } = req.body;

    const [referral] = await db.select()
      .from(referrals)
      .where(and(eq(referrals.id, id), eq(referrals.youthId, userId)))
      .limit(1);

    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    if (referral.status !== 'sent') {
      return res.status(400).json({ error: 'Referral has already been responded to' });
    }

    const now = new Date();

    await db.update(referrals)
      .set({
        status: 'declined',
        declinedAt: now,
        declinedReason: reason || null,
        updatedAt: now,
      })
      .where(eq(referrals.id, id));

    logger.info({ referralId: id, userId }, 'Referral declined');

    res.json({ success: true, status: 'declined' });
  } catch (error) {
    logger.error({ err: error, context: 'referral-decline' }, 'Error declining referral');
    res.status(500).json({ error: 'Failed to decline referral' });
  }
});

export { staffRouter, youthRouter };
