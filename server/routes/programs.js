import express from 'express';
import { db } from '../db.js';
import { programs, savedPrograms, profiles, orgMembers } from '../schema.js';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { DateTime } from 'luxon';
import logger from '../logger.ts';

const router = express.Router();

// Get all programs
router.get('/', async (req, res) => {
  try {
    const isAuthenticated = !!req.session.userId;
    
    let allPrograms;
    
    if (!isAuthenticated) {
      // Guest users: Show programs for the next 30 days (privacy-first with reasonable access)
      // This balances programs-first discovery with trauma-informed safeguards
      const edmontonNow = DateTime.now().setZone('America/Edmonton');
      const windowStart = edmontonNow.startOf('day').toJSDate();
      const windowEnd = edmontonNow.plus({ days: 30 }).endOf('day').toJSDate();
      
      // Show programs within next 30 days OR programs without scheduled dates
      allPrograms = await db.select().from(programs)
        .where(
          sql`${programs.nextStart} IS NULL OR (${programs.nextStart} >= ${windowStart} AND ${programs.nextStart} <= ${windowEnd})`
        )
        .limit(50); // Prevent catalog scraping
    } else {
      // Authenticated users: show all programs (no limits)
      allPrograms = await db.select().from(programs);
    }
    
    res.json(allPrograms);
  } catch (error) {
    logger.error({ err: error, context: 'programs-list' }, 'Get programs error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get program by ID
router.get('/:id', async (req, res) => {
  try {
    const [program] = await db.select().from(programs).where(eq(programs.id, req.params.id)).limit(1);
    
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    // Programs-first approach: Both guests and authenticated users can view all program details
    res.json(program);
  } catch (error) {
    logger.error({ err: error, context: 'programs-get' }, 'Get program error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get saved programs for user
router.get('/saved/list', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const saved = await db.select({
      program: programs,
      savedAt: savedPrograms.createdAt,
    })
    .from(savedPrograms)
    .innerJoin(programs, eq(savedPrograms.programId, programs.id))
    .where(eq(savedPrograms.userId, req.session.userId));

    res.json(saved);
  } catch (error) {
    logger.error({ err: error, context: 'programs-saved-list' }, 'Get saved programs error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save a program
router.post('/saved/:programId', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await db.insert(savedPrograms).values({
      userId: req.session.userId,
      programId: req.params.programId,
    }).onConflictDoNothing();

    res.status(201).json({ message: 'Program saved' });
  } catch (error) {
    logger.error({ err: error, context: 'programs-save' }, 'Save program error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unsave a program
router.delete('/saved/:programId', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await db.delete(savedPrograms).where(
      and(
        eq(savedPrograms.userId, req.session.userId),
        eq(savedPrograms.programId, req.params.programId)
      )
    );

    res.json({ message: 'Program unsaved' });
  } catch (error) {
    logger.error({ err: error, context: 'programs-unsave' }, 'Unsave program error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a program (org admin only)
router.post('/', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userOrgs = await db
      .select({ orgId: orgMembers.orgId, role: orgMembers.role })
      .from(orgMembers)
      .where(and(
        eq(orgMembers.userId, req.session.userId),
        eq(orgMembers.active, true)
      ));

    if (userOrgs.length === 0) {
      return res.status(403).json({ error: 'No organization membership found' });
    }

    const hasAdminRole = userOrgs.some(org => org.role === 'org_admin' || org.role === 'admin');
    if (!hasAdminRole) {
      return res.status(403).json({ error: 'Organization admin role required' });
    }

    const [newProgram] = await db.insert(programs).values({
      title: req.body.title,
      description: req.body.description || null,
      longDescription: req.body.long_description || null,
      tags: req.body.tags || [],
      free: req.body.free ?? true,
      costCents: req.body.cost_cents || null,
      locationName: req.body.location_name || null,
      address: req.body.address || null,
      organizer: req.body.organizer || null,
      orgId: userOrgs[0].orgId,
      contactEmail: req.body.contact_email || null,
      contactPhone: req.body.contact_phone || null,
      websiteUrl: req.body.website_url || null,
      capacity: req.body.capacity || null,
      ageMin: req.body.age_min || null,
      ageMax: req.body.age_max || null,
      indoor: req.body.indoor ?? false,
      outdoor: req.body.outdoor ?? false,
    }).returning();

    res.status(201).json(newProgram);
  } catch (error) {
    logger.error({ err: error, context: 'programs-create' }, 'Create program error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a program (org admin only)
router.put('/:id', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userOrgs = await db
      .select({ orgId: orgMembers.orgId, role: orgMembers.role })
      .from(orgMembers)
      .where(and(
        eq(orgMembers.userId, req.session.userId),
        eq(orgMembers.active, true)
      ));

    if (userOrgs.length === 0) {
      return res.status(403).json({ error: 'No organization membership found' });
    }

    const hasAdminRole = userOrgs.some(org => org.role === 'org_admin' || org.role === 'admin');
    if (!hasAdminRole) {
      return res.status(403).json({ error: 'Organization admin role required' });
    }

    const orgIds = userOrgs.map(o => o.orgId);

    const [existingProgram] = await db
      .select()
      .from(programs)
      .where(eq(programs.id, req.params.id))
      .limit(1);

    if (!existingProgram) {
      return res.status(404).json({ error: 'Program not found' });
    }

    if (!orgIds.includes(existingProgram.orgId)) {
      return res.status(403).json({ error: 'Cannot modify programs from other organizations' });
    }

    const [updatedProgram] = await db.update(programs)
      .set({
        title: req.body.title,
        description: req.body.description || null,
        longDescription: req.body.long_description || null,
        tags: req.body.tags || [],
        free: req.body.free ?? true,
        costCents: req.body.cost_cents || null,
        locationName: req.body.location_name || null,
        address: req.body.address || null,
        organizer: req.body.organizer || null,
        contactEmail: req.body.contact_email || null,
        contactPhone: req.body.contact_phone || null,
        websiteUrl: req.body.website_url || null,
        capacity: req.body.capacity || null,
        ageMin: req.body.age_min || null,
        ageMax: req.body.age_max || null,
        indoor: req.body.indoor ?? false,
        outdoor: req.body.outdoor ?? false,
      })
      .where(eq(programs.id, req.params.id))
      .returning();

    res.json(updatedProgram);
  } catch (error) {
    logger.error({ err: error, context: 'programs-update' }, 'Update program error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a program (org admin only)
router.delete('/:id', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userOrgs = await db
      .select({ orgId: orgMembers.orgId, role: orgMembers.role })
      .from(orgMembers)
      .where(and(
        eq(orgMembers.userId, req.session.userId),
        eq(orgMembers.active, true)
      ));

    if (userOrgs.length === 0) {
      return res.status(403).json({ error: 'No organization membership found' });
    }

    const hasAdminRole = userOrgs.some(org => org.role === 'org_admin' || org.role === 'admin');
    if (!hasAdminRole) {
      return res.status(403).json({ error: 'Organization admin role required' });
    }

    const orgIds = userOrgs.map(o => o.orgId);

    const [existingProgram] = await db
      .select()
      .from(programs)
      .where(eq(programs.id, req.params.id))
      .limit(1);

    if (!existingProgram) {
      return res.status(404).json({ error: 'Program not found' });
    }

    if (!orgIds.includes(existingProgram.orgId)) {
      return res.status(403).json({ error: 'Cannot delete programs from other organizations' });
    }

    await db.delete(programs).where(eq(programs.id, req.params.id));
    res.json({ message: 'Program deleted' });
  } catch (error) {
    logger.error({ err: error, context: 'programs-delete' }, 'Delete program error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
