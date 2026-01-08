import express from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { programs, savedPrograms, profiles, orgMembers } from '../schema.js';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { DateTime } from 'luxon';
import logger from '../logger.ts';
import { validateCsrfToken } from '../middleware/security.ts';

const router = express.Router();

// Zod validation schema for program creation/update
// Using coerce for numeric fields to handle string inputs from forms
const programSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
  long_description: z.string().max(5000, 'Long description too long').optional().nullable(),
  tags: z.array(z.string()).max(20, 'Too many tags').optional().default([]),
  free: z.preprocess(val => val === 'true' || val === true, z.boolean()).optional().default(true),
  cost_cents: z.preprocess(val => val === '' || val === null || val === undefined ? null : Number(val), z.number().int().min(0).max(1000000).nullable()).optional(),
  location_name: z.string().max(255).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  organizer: z.string().max(255).optional().nullable(),
  contact_email: z.preprocess(val => val === '' ? null : val, z.string().email('Invalid email').max(255).nullable()).optional(),
  contact_phone: z.string().max(50).optional().nullable(),
  website_url: z.preprocess(val => val === '' ? null : val, z.string().url('Invalid URL').max(500).nullable()).optional(),
  capacity: z.preprocess(val => val === '' || val === null || val === undefined ? null : Number(val), z.number().int().min(0).max(10000).nullable()).optional(),
  age_min: z.preprocess(val => val === '' || val === null || val === undefined ? null : Number(val), z.number().int().min(0).max(130).nullable()).optional(),
  age_max: z.preprocess(val => val === '' || val === null || val === undefined ? null : Number(val), z.number().int().min(0).max(130).nullable()).optional(),
  indoor: z.preprocess(val => val === 'true' || val === true, z.boolean()).optional().default(false),
  outdoor: z.preprocess(val => val === 'true' || val === true, z.boolean()).optional().default(false),
});

// Validation middleware
function validateProgram(req, res, next) {
  const result = programSchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return res.status(400).json({ error: 'Validation failed', errors });
  }
  req.validatedBody = result.data;
  next();
}

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

// Save a program (requires CSRF)
router.post('/saved/:programId', validateCsrfToken, async (req, res) => {
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

// Unsave a program (requires CSRF)
router.delete('/saved/:programId', validateCsrfToken, async (req, res) => {
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

// Create a program (org admin only, requires CSRF)
router.post('/', validateCsrfToken, validateProgram, async (req, res) => {
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

    const data = req.validatedBody;
    const [newProgram] = await db.insert(programs).values({
      title: data.title,
      description: data.description || null,
      longDescription: data.long_description || null,
      tags: data.tags || [],
      free: data.free ?? true,
      costCents: data.cost_cents || null,
      locationName: data.location_name || null,
      address: data.address || null,
      organizer: data.organizer || null,
      orgId: userOrgs[0].orgId,
      contactEmail: data.contact_email || null,
      contactPhone: data.contact_phone || null,
      websiteUrl: data.website_url || null,
      capacity: data.capacity || null,
      ageMin: data.age_min || null,
      ageMax: data.age_max || null,
      indoor: data.indoor ?? false,
      outdoor: data.outdoor ?? false,
    }).returning();

    res.status(201).json(newProgram);
  } catch (error) {
    logger.error({ err: error, context: 'programs-create' }, 'Create program error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a program (org admin only, requires CSRF)
router.put('/:id', validateCsrfToken, validateProgram, async (req, res) => {
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

    const data = req.validatedBody;
    const [updatedProgram] = await db.update(programs)
      .set({
        title: data.title,
        description: data.description || null,
        longDescription: data.long_description || null,
        tags: data.tags || [],
        free: data.free ?? true,
        costCents: data.cost_cents || null,
        locationName: data.location_name || null,
        address: data.address || null,
        organizer: data.organizer || null,
        contactEmail: data.contact_email || null,
        contactPhone: data.contact_phone || null,
        websiteUrl: data.website_url || null,
        capacity: data.capacity || null,
        ageMin: data.age_min || null,
        ageMax: data.age_max || null,
        indoor: data.indoor ?? false,
        outdoor: data.outdoor ?? false,
      })
      .where(eq(programs.id, req.params.id))
      .returning();

    res.json(updatedProgram);
  } catch (error) {
    logger.error({ err: error, context: 'programs-update' }, 'Update program error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a program (org admin only, requires CSRF)
router.delete('/:id', validateCsrfToken, async (req, res) => {
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
