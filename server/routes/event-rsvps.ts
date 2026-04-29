import express, { Request, Response } from 'express';
import { db } from '../db.js';
import { eventRsvps, parentLinks } from '../schema.extras.js';
import { programEvents, programs, users } from '../schema.js';
import { eq, and, ne, desc, isNull, or, inArray, sql } from 'drizzle-orm';
import { DateTime } from 'luxon';
import logger from '../logger.ts';
import {
  findOrCreateConsentRequest,
  type Executor,
  rsvpStatusForConsent,
  ConsentTemplateUnavailableError,
} from '../pilot/consent/consentEngine.ts';

const router = express.Router();

const requireAuth = (req: Request, res: Response, next: any) => {
  if (!(req.session as any)?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required' });
    }

    const [event] = await db.select({
      id: programEvents.id,
      programId: programEvents.programId,
      eventName: programEvents.eventName,
      active: programEvents.active,
      capacity: programEvents.capacity,
    })
    .from(programEvents)
    .where(eq(programEvents.id, eventId))
    .limit(1);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!event.active) {
      return res.status(400).json({ error: 'Event is no longer active' });
    }

    const [user] = await db.select({ isMinor: users.isMinor })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Audit C6: wrap the existing-RSVP read, capacity check, consent-request
    // creation, and RSVP insert/update in a single transaction so a failure
    // partway through can never leave a half-written RSVP without its
    // matching consent_request (or vice versa). Mirrors the referrals.ts
    // accept handler which already does this.
    type TxResult =
      | { kind: 'noop'; rsvp: any }
      | { kind: 'created'; rsvp: any; status: string }
      | { kind: 'capacity_full' }
      | { kind: 'guardian_required' }
      | { kind: 'template_unavailable'; status: number; message: string; code: string };

    const result = await db.transaction(async (tx): Promise<TxResult> => {
      const [existing] = await tx.select()
        .from(eventRsvps)
        .where(and(
          eq(eventRsvps.userId, userId),
          eq(eventRsvps.eventId, eventId)
        ))
        .limit(1);

      if (existing && existing.status !== 'cancelled') {
        return { kind: 'noop', rsvp: existing };
      }

      if (event.capacity) {
        const activeCount = await tx.select({ id: eventRsvps.id })
          .from(eventRsvps)
          .where(and(
            eq(eventRsvps.eventId, eventId),
            ne(eventRsvps.status, 'cancelled')
          ));

        if (activeCount.length >= event.capacity) {
          return { kind: 'capacity_full' };
        }
      }

      let status = 'confirmed';
      let consentRequestId: string | null = null;

      if (user?.isMinor) {
        const [parentLink] = await tx.select({ parentId: parentLinks.parentId })
          .from(parentLinks)
          .where(eq(parentLinks.userId, userId))
          .limit(1);

        if (!parentLink) {
          // Minor without a linked parent cannot proceed — no one can consent.
          // Fail closed (was previously a stuck 'pending_consent' with no
          // consentRequestId, which could never be resolved).
          return { kind: 'guardian_required' };
        }

        try {
          // Canonical consent runtime: single source of truth for
          // consent_request creation. Idempotent — reuses any open
          // (pending/signed) request for this (youth, parent, program).
          // Pass `tx` so the consent_request + audit_event rows live
          // inside our transaction and are rolled back together with
          // the RSVP if anything below throws. The structural cast
          // matches what consentEngine itself does internally to bridge
          // the Drizzle PgTransaction <-> Executor (= typeof db) shapes.
          const snapshot = await findOrCreateConsentRequest(tx as unknown as Executor, {
            youthId: userId,
            parentId: parentLink.parentId,
            programId: event.programId,
            source: 'event_rsvp',
            actorId: userId,
            actorType: 'youth',
            sourceMetadata: { eventId },
            ipAddress:
              req.headers['x-forwarded-for']?.toString()
              || req.socket?.remoteAddress
              || null,
            userAgent: req.headers['user-agent'] || null,
          });
          consentRequestId = snapshot.id;
          status = rsvpStatusForConsent(snapshot.status);
        } catch (err) {
          if (err instanceof ConsentTemplateUnavailableError) {
            return {
              kind: 'template_unavailable',
              status: err.httpStatus,
              message: err.message,
              code: err.code,
            };
          }
          throw err;
        }
      }

      let rsvp;
      if (existing && existing.status === 'cancelled') {
        const [updated] = await tx.update(eventRsvps)
          .set({
            status,
            consentRequestId,
            cancelledAt: null,
            cancelReason: null,
            updatedAt: new Date(),
          })
          .where(eq(eventRsvps.id, existing.id))
          .returning();
        rsvp = updated;
      } else {
        const [created] = await tx.insert(eventRsvps).values({
          userId,
          eventId,
          programId: event.programId,
          status,
          consentRequestId,
        }).returning();
        rsvp = created;
      }

      return { kind: 'created', rsvp, status };
    });

    if (result.kind === 'noop') {
      return res.status(200).json({
        message: 'Already RSVPed',
        rsvp: result.rsvp,
      });
    }
    if (result.kind === 'capacity_full') {
      return res.status(409).json({ error: 'Event is full', code: 'EVENT_FULL' });
    }
    if (result.kind === 'guardian_required') {
      return res.status(409).json({
        error: 'Guardian link required before RSVP.',
        code: 'GUARDIAN_LINK_REQUIRED',
      });
    }
    if (result.kind === 'template_unavailable') {
      return res.status(result.status).json({
        error: result.message,
        code: result.code,
      });
    }

    logger.info({ userId, eventId, status: result.status }, 'Event RSVP created');

    res.status(201).json({
      rsvp: result.rsvp,
      message: result.status === 'pending_consent'
        ? 'RSVP created — waiting for parental consent'
        : 'RSVP confirmed',
    });
  } catch (error: any) {
    logger.error({ err: error, context: 'event-rsvps-create' }, 'Error creating event RSVP');
    res.status(500).json({ error: 'Failed to create RSVP' });
  }
});

router.post('/:id/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const { id } = req.params;
    const { reason } = req.body;

    const [rsvp] = await db.select()
      .from(eventRsvps)
      .where(and(eq(eventRsvps.id, id), eq(eventRsvps.userId, userId)))
      .limit(1);

    if (!rsvp) {
      return res.status(404).json({ error: 'RSVP not found' });
    }

    if (rsvp.status === 'cancelled') {
      return res.status(400).json({ error: 'RSVP already cancelled' });
    }

    await db.update(eventRsvps)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: reason || null,
        updatedAt: new Date(),
      })
      .where(eq(eventRsvps.id, id));

    logger.info({ userId, rsvpId: id }, 'Event RSVP cancelled');

    res.json({ ok: true, message: 'RSVP cancelled' });
  } catch (error) {
    logger.error({ err: error, context: 'event-rsvps-cancel' }, 'Error cancelling event RSVP');
    res.status(500).json({ error: 'Failed to cancel RSVP' });
  }
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const now = DateTime.now().setZone('America/Edmonton');
    const todayDate = now.toFormat('yyyy-MM-dd');

    const rsvps = await db.select({
      id: eventRsvps.id,
      eventId: eventRsvps.eventId,
      programId: eventRsvps.programId,
      status: eventRsvps.status,
      consentRequestId: eventRsvps.consentRequestId,
      createdAt: eventRsvps.createdAt,
      eventName: programEvents.eventName,
      dayOfWeek: programEvents.dayOfWeek,
      startTime: programEvents.startTime,
      endTime: programEvents.endTime,
      locationName: programEvents.locationName,
      address: programEvents.address,
      occursOnDate: programEvents.occursOnDate,
      isRecurring: programEvents.isRecurring,
      eventActive: programEvents.active,
      programTitle: programs.title,
      programOrganizer: programs.organizer,
      programFree: programs.free,
    })
    .from(eventRsvps)
    .innerJoin(programEvents, eq(eventRsvps.eventId, programEvents.id))
    .innerJoin(programs, eq(eventRsvps.programId, programs.id))
    .where(and(
      eq(eventRsvps.userId, userId),
      ne(eventRsvps.status, 'cancelled'),
      eq(programEvents.active, true)
    ))
    // Surfaces status IN ('confirmed','pending_consent','blocked') —
    // 'blocked' means canonical consent was declined/withdrawn by the
    // parent on /api/pilot/consent/*, so the youth should see the
    // blocked pill on their schedule rather than have the item vanish.
    .orderBy(desc(eventRsvps.createdAt));

    const enriched = rsvps
      .map(r => {
        let nextDate: string | null = null;

        if (r.occursOnDate) {
          nextDate = r.occursOnDate;
        } else if (r.dayOfWeek) {
          const dayIndex: Record<string, number> = {
            'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
            'Friday': 5, 'Saturday': 6, 'Sunday': 7
          };
          const targetDay = dayIndex[r.dayOfWeek];
          const currentDay = now.weekday;
          let daysUntil = targetDay - currentDay;
          if (daysUntil < 0) daysUntil += 7;
          if (daysUntil === 0) {
            nextDate = todayDate;
          } else {
            nextDate = now.plus({ days: daysUntil }).toFormat('yyyy-MM-dd');
          }
        }

        return {
          ...r,
          nextDate,
        };
      })
      .filter(r => {
        if (r.occursOnDate && r.occursOnDate < todayDate) {
          return false;
        }
        return true;
      });

    enriched.sort((a, b) => {
      if (!a.nextDate && !b.nextDate) return 0;
      if (!a.nextDate) return 1;
      if (!b.nextDate) return -1;
      if (a.nextDate !== b.nextDate) return a.nextDate.localeCompare(b.nextDate);
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    res.json({ rsvps: enriched });
  } catch (error) {
    logger.error({ err: error, context: 'event-rsvps-me' }, 'Error fetching user RSVPs');
    res.status(500).json({ error: 'Failed to fetch RSVPs' });
  }
});

router.get('/event-fullness', requireAuth, async (req: Request, res: Response) => {
  try {
    const eventIds = (req.query.eventIds as string || '').split(',').filter(Boolean);
    if (eventIds.length === 0) {
      return res.json({ fullness: {} });
    }

    const eventsWithCapacity = await db.select({
      id: programEvents.id,
      capacity: programEvents.capacity,
    })
    .from(programEvents)
    .where(inArray(programEvents.id, eventIds));

    const fullness: Record<string, { capacity: number | null; count: number; full: boolean }> = {};

    for (const ev of eventsWithCapacity) {
      if (ev.capacity) {
        const [result] = await db.select({ count: sql<number>`count(*)::int` })
          .from(eventRsvps)
          .where(and(
            eq(eventRsvps.eventId, ev.id),
            ne(eventRsvps.status, 'cancelled')
          ));

        const count = result?.count || 0;
        fullness[ev.id] = {
          capacity: ev.capacity,
          count,
          full: count >= ev.capacity,
        };
      } else {
        fullness[ev.id] = { capacity: null, count: 0, full: false };
      }
    }

    res.json({ fullness });
  } catch (error) {
    logger.error({ err: error, context: 'event-rsvps-fullness' }, 'Error checking event fullness');
    res.status(500).json({ error: 'Failed to check event fullness' });
  }
});

export default router;
