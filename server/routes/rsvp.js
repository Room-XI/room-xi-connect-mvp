/**
 * RSVP Routes
 * Handles program interest/RSVP functionality
 */
import { Router } from 'express';
import { db } from '../db.ts';
import { rsvps, programs } from '../schema.ts';
import { eq, and } from 'drizzle-orm';
import logger from '../logger.ts';

const router = Router();

/**
 * POST /api/programs/:id/rsvp - Express interest in a program
 */
router.post('/:id/rsvp', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id: programId } = req.params;

    // Verify program exists
    const [program] = await db.select({ id: programs.id })
      .from(programs)
      .where(eq(programs.id, programId))
      .limit(1);

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    // Check if already RSVPed
    const [existing] = await db.select()
      .from(rsvps)
      .where(and(eq(rsvps.userId, userId), eq(rsvps.programId, programId)))
      .limit(1);

    if (existing) {
      return res.status(200).json({ 
        message: 'Already interested',
        rsvp: existing
      });
    }

    // Create RSVP
    const [newRsvp] = await db.insert(rsvps)
      .values({
        userId,
        programId,
        status: 'interested'
      })
      .returning();

    logger.info({ userId, programId }, 'User expressed interest in program');

    res.status(201).json({
      message: 'Interest registered',
      rsvp: newRsvp
    });
  } catch (error) {
    logger.error({ error }, 'Error creating RSVP');
    res.status(500).json({ error: 'Failed to register interest' });
  }
});

/**
 * DELETE /api/programs/:id/rsvp - Remove interest in a program
 */
router.delete('/:id/rsvp', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id: programId } = req.params;

    // Delete RSVP
    const deleted = await db.delete(rsvps)
      .where(and(eq(rsvps.userId, userId), eq(rsvps.programId, programId)))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'RSVP not found' });
    }

    logger.info({ userId, programId }, 'User removed interest in program');

    res.json({ message: 'Interest removed' });
  } catch (error) {
    logger.error({ error }, 'Error deleting RSVP');
    res.status(500).json({ error: 'Failed to remove interest' });
  }
});

/**
 * GET /api/programs/:id/rsvp - Check if user has RSVPed to a program
 */
router.get('/:id/rsvp', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.json({ interested: false });
    }

    const { id: programId } = req.params;

    const [rsvp] = await db.select()
      .from(rsvps)
      .where(and(eq(rsvps.userId, userId), eq(rsvps.programId, programId)))
      .limit(1);

    res.json({ 
      interested: !!rsvp,
      rsvp: rsvp || null
    });
  } catch (error) {
    logger.error({ error }, 'Error checking RSVP');
    res.status(500).json({ error: 'Failed to check interest' });
  }
});

/**
 * GET /api/user/rsvps - Get all programs user has expressed interest in
 */
router.get('/user/rsvps', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRsvps = await db.select({
      programId: rsvps.programId,
      status: rsvps.status,
      createdAt: rsvps.createdAt,
      programTitle: programs.title,
      programOrganizer: programs.organizer,
      programLocation: programs.location,
    })
      .from(rsvps)
      .leftJoin(programs, eq(rsvps.programId, programs.id))
      .where(eq(rsvps.userId, userId));

    res.json({ rsvps: userRsvps });
  } catch (error) {
    logger.error({ error }, 'Error fetching user RSVPs');
    res.status(500).json({ error: 'Failed to fetch interests' });
  }
});

export default router;
