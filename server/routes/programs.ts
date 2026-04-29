import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { programs, savedPrograms, profiles, orgMembers, checkins } from '../schema.js';
import { eq, and, sql, gte, lte, desc } from 'drizzle-orm';
import { DateTime } from 'luxon';
import logger from '../logger.ts';
import { validateCsrfToken } from '../middleware/security.ts';

const router = express.Router();

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

function validateProgram(req: Request, res: Response, next: NextFunction) {
  const result = programSchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return res.status(400).json({ error: 'Validation failed', errors });
  }
  (req as any).validatedBody = result.data;
  next();
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const isAuthenticated = !!(req.session && (req.session as any).userId);
    
    let allPrograms: any[];
    
    if (!isAuthenticated) {
      const edmontonNow = DateTime.now().setZone('America/Edmonton');
      const windowStart = edmontonNow.startOf('day').toJSDate();
      const windowEnd = edmontonNow.plus({ days: 30 }).endOf('day').toJSDate();
      
      allPrograms = await db.select().from(programs)
        .where(
          sql`(${programs.verificationStatus} IS NULL OR ${programs.verificationStatus} NOT IN ('sunset', 'rejected', 'pending', 'changes_requested'))
            AND (${programs.nextStart} IS NULL OR (${programs.nextStart} >= ${windowStart} AND ${programs.nextStart} <= ${windowEnd}))`
        )
        .limit(50);
    } else {
      allPrograms = await db.select().from(programs)
        .where(
          sql`${programs.verificationStatus} IS NULL OR ${programs.verificationStatus} NOT IN ('sunset', 'rejected', 'pending', 'changes_requested')`
        );
    }
    
    res.json(allPrograms);
  } catch (error) {
    logger.error({ err: error, context: 'programs-list' }, 'Get programs error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, categories, distance, availability, lat, lng } = req.query;
    
    let filtered: any[] = await db.select().from(programs).where(
      sql`${programs.verificationStatus} IS NULL OR ${programs.verificationStatus} NOT IN ('sunset', 'rejected', 'pending', 'changes_requested')`
    );
    
    if (q) {
      const searchLower = (q as string).toLowerCase();
      filtered = filtered.filter((program: any) => {
        const titleMatch = program.title?.toLowerCase().includes(searchLower);
        const descriptionMatch = program.description?.toLowerCase().includes(searchLower);
        const tagsMatch = program.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower));
        return titleMatch || descriptionMatch || tagsMatch;
      });
    }
    
    if (categories) {
      const categoryList = (categories as string).split(',').map(c => c.trim().toLowerCase());
      filtered = filtered.filter((program: any) => {
        return program.tags?.some((tag: string) => categoryList.includes(tag.toLowerCase()));
      });
    }
    
    if (lat && lng) {
      const userLat = parseFloat(lat as string);
      const userLng = parseFloat(lng as string);
      const maxDistance = distance ? parseFloat(distance as string) : null;
      
      filtered = filtered
        .map((program: any) => {
          if (program.lat && program.lng) {
            const progLat = parseFloat(program.lat);
            const progLng = parseFloat(program.lng);
            const dist = calculateDistance(userLat, userLng, progLat, progLng);
            return { ...program, distance: dist };
          }
          return { ...program, distance: null };
        })
        .filter((program: any) => !maxDistance || !program.distance || program.distance <= maxDistance);
    } else {
      filtered = filtered.map((program: any) => ({ ...program, distance: null }));
    }
    
    if (availability) {
      const availabilityList = (availability as string).split(',').map(a => a.trim().toLowerCase());
      filtered = filtered.filter((program: any) => {
        if (availabilityList.includes('drop-in') && program.dropIn) return true;
        if (availabilityList.includes('upcoming') && program.nextStart) return true;
        if (availabilityList.includes('free') && program.free) return true;
        return false;
      });
    }
    
    res.json(filtered);
  } catch (error) {
    logger.error({ err: error, context: 'programs-search' }, 'Search programs error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/bookmarks', async (req: Request, res: Response) => {
  try {
    if (!req.session || !(req.session as any).userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const bookmarked = await db.select({
      program: programs,
      bookmarkedAt: savedPrograms.createdAt,
    })
    .from(savedPrograms)
    .innerJoin(programs, eq(savedPrograms.programId, programs.id))
    .where(eq(savedPrograms.userId, (req.session as any).userId));

    res.json(bookmarked);
  } catch (error) {
    logger.error({ err: error, context: 'programs-bookmarks' }, 'Get bookmarks error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    if (!req.session || !(req.session as any).userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = (req.session as any).userId;

    const recentCheckins = await db.select({
      wellnessDimensions: checkins.wellnessDimensions,
      affectTags: checkins.affectTags,
      moodLevel: checkins.moodLevel16,
    })
      .from(checkins)
      .where(eq(checkins.userId, userId))
      .orderBy(desc(checkins.createdAt))
      .limit(14);

    const allPrograms = await db.select().from(programs).where(
      sql`${programs.verificationStatus} IS NULL OR ${programs.verificationStatus} NOT IN ('sunset', 'rejected', 'pending', 'changes_requested')`
    ).limit(50);

    if (allPrograms.length === 0) {
      return res.json({ recommendations: [] });
    }

    const dimensionCounts: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};
    let avgMood = 0;

    for (const c of recentCheckins) {
      if ((c as any).wellnessDimensions) {
        for (const d of (c as any).wellnessDimensions) {
          dimensionCounts[d] = (dimensionCounts[d] || 0) + 1;
        }
      }
      if ((c as any).affectTags) {
        for (const t of (c as any).affectTags) {
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        }
      }
      avgMood += ((c as any).moodLevel || 3);
    }

    if (recentCheckins.length > 0) {
      avgMood = avgMood / recentCheckins.length;
    }

    const lowMood = avgMood < 3;

    const scored = allPrograms.map((p: any) => {
      let score = 0;
      let reason = '';

      const programDims = p.wellnessDimensions || [];
      const programTags = p.tags || [];

      let dimOverlap = 0;
      for (const d of programDims) {
        if (dimensionCounts[d]) {
          dimOverlap += dimensionCounts[d];
        }
      }
      if (dimOverlap > 0) {
        score += Math.min(dimOverlap * 10, 40);
        reason = 'Matches your recent wellness focus';
      }

      let tagOverlap = 0;
      for (const t of programTags) {
        if (tagCounts[t]) {
          tagOverlap += tagCounts[t];
        }
      }
      if (tagOverlap > 0) {
        score += Math.min(tagOverlap * 8, 30);
        if (!reason) reason = 'Related to your interests';
      }

      if (lowMood && programTags.some((t: string) => ['mental-health', 'counselling', 'support', 'wellness'].includes(t))) {
        score += 20;
        reason = 'Support resource for how you\'ve been feeling';
      }

      if (p.free) score += 5;
      if (p.dropIn) score += 5;

      if (recentCheckins.length === 0) {
        score = 10 + Math.floor(Math.random() * 20);
        reason = 'Popular in your community';
        if (p.free) { score += 10; reason = 'Free program near you'; }
      }

      if (!reason) reason = 'Recommended for you';

      return {
        id: p.id,
        title: p.title,
        organizer: p.organizer || null,
        category: (programTags[0]) || null,
        location: p.locationName || null,
        nextSession: p.nextStart ? p.nextStart.toISOString() : null,
        matchReason: reason,
        matchScore: Math.min(score, 100),
      };
    });

    scored.sort((a: any, b: any) => b.matchScore - a.matchScore);

    res.json({ recommendations: scored.slice(0, 6) });
  } catch (error) {
    logger.error({ err: error, context: 'programs-recommendations' }, 'Get recommendations error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.id)) {
      return res.status(404).json({ error: 'Program not found' });
    }
    const [program] = await db.select().from(programs).where(
      and(
        eq(programs.id, req.params.id),
        sql`${programs.verificationStatus} IS NULL OR ${programs.verificationStatus} NOT IN ('sunset', 'rejected', 'pending', 'changes_requested')`
      )
    ).limit(1);
    
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    res.json(program);
  } catch (error) {
    logger.error({ err: error, context: 'programs-get' }, 'Get program error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/bookmark', validateCsrfToken, async (req: Request, res: Response) => {
  try {
    if (!req.session || !(req.session as any).userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [program] = await db.select().from(programs).where(eq(programs.id, req.params.id)).limit(1);
    
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    const [existing] = await db.select().from(savedPrograms).where(
      and(
        eq(savedPrograms.userId, (req.session as any).userId),
        eq(savedPrograms.programId, req.params.id)
      )
    ).limit(1);

    if (existing) {
      await db.delete(savedPrograms).where(
        and(
          eq(savedPrograms.userId, (req.session as any).userId),
          eq(savedPrograms.programId, req.params.id)
        )
      );
      res.json({ bookmarked: false });
    } else {
      await db.insert(savedPrograms).values({
        userId: (req.session as any).userId,
        programId: req.params.id,
      });
      res.status(201).json({ bookmarked: true });
    }
  } catch (error) {
    logger.error({ err: error, context: 'programs-bookmark-toggle' }, 'Toggle bookmark error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/saved/list', async (req: Request, res: Response) => {
  try {
    if (!req.session || !(req.session as any).userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const saved = await db.select({
      program: programs,
      savedAt: savedPrograms.createdAt,
    })
    .from(savedPrograms)
    .innerJoin(programs, eq(savedPrograms.programId, programs.id))
    .where(eq(savedPrograms.userId, (req.session as any).userId));

    res.json(saved);
  } catch (error) {
    logger.error({ err: error, context: 'programs-saved-list' }, 'Get saved programs error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/saved/:programId', validateCsrfToken, async (req: Request, res: Response) => {
  try {
    if (!req.session || !(req.session as any).userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await db.insert(savedPrograms).values({
      userId: (req.session as any).userId,
      programId: req.params.programId,
    }).onConflictDoNothing();

    res.status(201).json({ message: 'Program saved' });
  } catch (error) {
    logger.error({ err: error, context: 'programs-save' }, 'Save program error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/saved/:programId', validateCsrfToken, async (req: Request, res: Response) => {
  try {
    if (!req.session || !(req.session as any).userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await db.delete(savedPrograms).where(
      and(
        eq(savedPrograms.userId, (req.session as any).userId),
        eq(savedPrograms.programId, req.params.programId)
      )
    );

    res.json({ message: 'Program unsaved' });
  } catch (error) {
    logger.error({ err: error, context: 'programs-unsave' }, 'Unsave program error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', validateCsrfToken, validateProgram, async (req: Request, res: Response) => {
  try {
    if (!req.session || !(req.session as any).userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userOrgs = await db
      .select({ orgId: orgMembers.orgId, role: orgMembers.role })
      .from(orgMembers)
      .where(and(
        eq(orgMembers.userId, (req.session as any).userId),
        eq(orgMembers.active, true)
      ));

    if (userOrgs.length === 0) {
      return res.status(403).json({ error: 'No organization membership found' });
    }

    const hasAdminRole = userOrgs.some((org: any) => org.role === 'org_admin' || org.role === 'admin');
    if (!hasAdminRole) {
      return res.status(403).json({ error: 'Organization admin role required' });
    }

    const data = (req as any).validatedBody;
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

router.put('/:id', validateCsrfToken, validateProgram, async (req: Request, res: Response) => {
  try {
    if (!req.session || !(req.session as any).userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userOrgs = await db
      .select({ orgId: orgMembers.orgId, role: orgMembers.role })
      .from(orgMembers)
      .where(and(
        eq(orgMembers.userId, (req.session as any).userId),
        eq(orgMembers.active, true)
      ));

    if (userOrgs.length === 0) {
      return res.status(403).json({ error: 'No organization membership found' });
    }

    const hasAdminRole = userOrgs.some((org: any) => org.role === 'org_admin' || org.role === 'admin');
    if (!hasAdminRole) {
      return res.status(403).json({ error: 'Organization admin role required' });
    }

    const orgIds = userOrgs.map((o: any) => o.orgId);

    const [existingProgram] = await db
      .select()
      .from(programs)
      .where(eq(programs.id, req.params.id))
      .limit(1);

    if (!existingProgram) {
      return res.status(404).json({ error: 'Program not found' });
    }

    if (!orgIds.includes((existingProgram as any).orgId)) {
      return res.status(403).json({ error: 'Cannot modify programs from other organizations' });
    }

    const data = (req as any).validatedBody;
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

router.delete('/:id', validateCsrfToken, async (req: Request, res: Response) => {
  try {
    if (!req.session || !(req.session as any).userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userOrgs = await db
      .select({ orgId: orgMembers.orgId, role: orgMembers.role })
      .from(orgMembers)
      .where(and(
        eq(orgMembers.userId, (req.session as any).userId),
        eq(orgMembers.active, true)
      ));

    if (userOrgs.length === 0) {
      return res.status(403).json({ error: 'No organization membership found' });
    }

    const hasAdminRole = userOrgs.some((org: any) => org.role === 'org_admin' || org.role === 'admin');
    if (!hasAdminRole) {
      return res.status(403).json({ error: 'Organization admin role required' });
    }

    const orgIds = userOrgs.map((o: any) => o.orgId);

    const [existingProgram] = await db
      .select()
      .from(programs)
      .where(eq(programs.id, req.params.id))
      .limit(1);

    if (!existingProgram) {
      return res.status(404).json({ error: 'Program not found' });
    }

    if (!orgIds.includes((existingProgram as any).orgId)) {
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
