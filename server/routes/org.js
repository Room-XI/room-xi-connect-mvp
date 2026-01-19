import express from 'express';
import { db, pool } from '../db.js';
import { attendance, programs, profiles, checkins, orgMembers, xids, users, programEvents, outcomeEvents, peerSuccessInsights, referrals, organizations } from '../schema.js';
import { eq, sql, desc, and, gte, lte, count, countDistinct, ilike, or, ne } from 'drizzle-orm';
import { Parser } from '@json2csv/plainjs';
import { DateTime } from 'luxon';
import logger from '../logger.ts';

const router = express.Router();

// Middleware to verify organization membership and role (admin or facilitator)
const verifyOrgAccess = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userOrgs = await db
      .select({ 
        orgId: orgMembers.orgId,
        role: orgMembers.role 
      })
      .from(orgMembers)
      .where(and(
        eq(orgMembers.userId, req.session.userId),
        eq(orgMembers.active, true)
      ));

    if (userOrgs.length === 0) {
      // Fallback check for global admin if not in orgMembers
      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, req.session.userId))
        .limit(1);
      
      if (profile?.isAdmin) {
        req.userOrgIds = []; // Global admin sees all or needs special handling
        req.isGlobalAdmin = true;
        return next();
      }
      return res.status(403).json({ error: 'Organization access required' });
    }

    req.userOrgIds = userOrgs.map(o => o.orgId);
    req.userRoles = userOrgs.map(o => o.role);
    next();
  } catch (error) {
    logger.error({ err: error, context: 'org-access-verify' }, 'Org access verification error');
    res.status(500).json({ error: 'Internal server error during authorization' });
  }
};

router.get('/status', verifyOrgAccess, (req, res) => {
  res.json({
    authenticated: true,
    hasOrgAccess: true,
    orgIds: req.userOrgIds,
    isGlobalAdmin: req.isGlobalAdmin || false
  });
});

router.get('/dashboard/stats', verifyOrgAccess, async (req, res) => {
  try {
    const edmontonNow = DateTime.now().setZone('America/Edmonton');
    const thirtyDaysAgo = edmontonNow.minus({ days: 30 }).startOf('day').toJSDate();

    // Filter by organization if not global admin
    const orgFilter = req.isGlobalAdmin ? null : sql`${programs.orgId} = ANY(${req.userOrgIds}::uuid[])`;

    const [
      programsCountResult,
      thisMonthAttendanceResult,
      uniqueParticipantsResult
    ] = await Promise.all([
      db.select({ count: count() })
        .from(programs)
        .where(orgFilter ? orgFilter : undefined),
      
      db.select({ count: count() })
        .from(attendance)
        .innerJoin(programs, eq(attendance.programId, programs.id))
        .where(and(
          gte(attendance.timestamp, thirtyDaysAgo),
          orgFilter ? orgFilter : undefined
        )),
      
      db.select({ count: countDistinct(attendance.xidId) })
        .from(attendance)
        .innerJoin(programs, eq(attendance.programId, programs.id))
        .where(orgFilter ? orgFilter : undefined)
    ]);

    const programsCount = Number(programsCountResult[0]?.count || 0);
    const thisMonthAttendance = Number(thisMonthAttendanceResult[0]?.count || 0);
    const totalParticipants = Number(uniqueParticipantsResult[0]?.count || 0);

    res.json({
      totalUsers: totalParticipants, // Scoped to org
      activeUsers: totalParticipants, // Simplified for org view
      totalCheckins: 0, // Org dashboard might not need global checkin counts
      avgMood: 0,
      programsCount,
      thisMonthAttendance
    });
  } catch (error) {
    logger.error({ err: error, context: 'org-dashboard-stats' }, 'Error fetching org dashboard stats');
    res.status(500).json({ error: 'Failed to fetch org dashboard stats' });
  }
});

router.get('/dashboard', verifyOrgAccess, async (req, res) => {
  try {
    const orgFilter = req.isGlobalAdmin ? null : sql`${programs.orgId} = ANY(${req.userOrgIds}::uuid[])`;

    const recentAttendance = await db
      .select({
        id: attendance.id,
        timestamp: attendance.timestamp,
        programTitle: programs.title,
        method: attendance.method
      })
      .from(attendance)
      .innerJoin(programs, eq(attendance.programId, programs.id))
      .where(orgFilter ? orgFilter : undefined)
      .orderBy(desc(attendance.timestamp))
      .limit(10);

    const [attendanceStats] = await db
      .select({
        totalAttendance: count(attendance.id),
        uniqueParticipants: countDistinct(attendance.xidId)
      })
      .from(attendance)
      .innerJoin(programs, eq(attendance.programId, programs.id))
      .where(orgFilter ? orgFilter : undefined);

    res.json({
      totalAttendance: Number(attendanceStats?.totalAttendance || 0),
      uniqueParticipants: Number(attendanceStats?.uniqueParticipants || 0),
      programs: [],
      recentActivity: recentAttendance,
    });
  } catch (error) {
    logger.error({ err: error, context: 'org-dashboard' }, 'Error fetching org dashboard');
    res.status(500).json({ error: 'Failed to fetch org dashboard' });
  }
});

router.get('/attendance/export', verifyOrgAccess, async (req, res) => {
  try {
    const orgFilter = req.isGlobalAdmin ? null : sql`${programs.orgId} = ANY(${req.userOrgIds}::uuid[])`;

    const timeRange = req.query.timeRange || '30days';
    const edmontonNow = DateTime.now().setZone('America/Edmonton');
    let startDate;

    if (timeRange === '7days') {
      startDate = edmontonNow.minus({ days: 7 }).startOf('day').toJSDate();
    } else if (timeRange === '30days') {
      startDate = edmontonNow.minus({ days: 30 }).startOf('day').toJSDate();
    } else {
      startDate = new Date('2024-01-01');
    }

    const attendanceRecords = await db
      .select({
        date: attendance.createdAt,
        programTitle: programs.title,
        programOrganizer: programs.organizer,
        xidId: attendance.xidId,
        programOrgId: programs.orgId,
      })
      .from(attendance)
      .leftJoin(programs, eq(attendance.programId, programs.id))
      .leftJoin(xids, eq(attendance.xidId, xids.id))
      .where(and(
        gte(attendance.createdAt, startDate),
        orgFilter ? orgFilter : undefined
      ))
      .orderBy(desc(attendance.createdAt));

    const aggregated = attendanceRecords.reduce((acc, record) => {
      const dateKey = DateTime.fromJSDate(new Date(record.date))
        .setZone('America/Edmonton')
        .toFormat('yyyy-MM-dd');
      const programKey = record.programTitle || 'Unknown Program';
      const key = `${dateKey}-${programKey}`;

      if (!acc[key]) {
        acc[key] = {
          date: dateKey,
          program: programKey,
          organizer: record.programOrganizer || 'N/A',
          attendees: new Set(),
        };
      }
      acc[key].attendees.add(record.xidId);
      return acc;
    }, {});

    const csvData = Object.values(aggregated).map((entry) => ({
      Date: entry.date,
      Program: entry.program,
      Organizer: entry.organizer,
      Attendees: entry.attendees.size,
    }));

    if (csvData.length === 0) {
      csvData.push({
        Date: 'No data',
        Program: 'No attendance records found for selected time range',
        Organizer: 'N/A',
        Attendees: 0,
      });
    }

    const parser = new Parser({
      fields: ['Date', 'Program', 'Organizer', 'Attendees'],
    });
    const csv = parser.parse(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${timeRange}-${DateTime.now().toFormat('yyyy-MM-dd')}.csv"`);
    res.send(csv);
  } catch (error) {
    logger.error({ err: error, context: 'org-attendance-export' }, 'Error exporting attendance report');
    res.status(500).json({ error: 'Failed to export attendance report' });
  }
});

router.get('/programs', verifyOrgAccess, async (req, res) => {
  try {
    let query = db
      .select({
        id: programs.id,
        title: programs.title,
        organizer: programs.organizer,
        orgId: programs.orgId,
      })
      .from(programs);

    if (!req.isGlobalAdmin) {
      query = query.where(sql`${programs.orgId} = ANY(${req.userOrgIds}::uuid[])`);
    }

    const programList = await query.orderBy(programs.title);
    res.json(programList);
  } catch (error) {
    logger.error({ err: error, context: 'org-programs' }, 'Error fetching programs');
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
});

router.get('/programs/:id/attendance', verifyOrgAccess, async (req, res) => {
  try {
    const { id: programId } = req.params;

    // Verify program belongs to user's organization
    if (!req.isGlobalAdmin) {
      const [program] = await db
        .select()
        .from(programs)
        .where(and(
          eq(programs.id, programId),
          sql`${programs.orgId} = ANY(${req.userOrgIds}::uuid[])`
        ))
        .limit(1);

      if (!program) {
        return res.status(403).json({ error: 'Program not found or access denied' });
      }
    }

    const attendanceRecords = await db
      .select({
        id: attendance.id,
        xidId: attendance.xidId,
        timestamp: attendance.timestamp,
        method: attendance.method,
        site: attendance.site
      })
      .from(attendance)
      .where(eq(attendance.programId, programId))
      .orderBy(desc(attendance.timestamp));

    res.json(attendanceRecords);
  } catch (error) {
    logger.error({ err: error, context: 'org-program-attendance' }, 'Error fetching program attendance');
    res.status(500).json({ error: 'Failed to fetch program attendance' });
  }
});

router.post('/programs/:id/attendance', verifyOrgAccess, async (req, res) => {
  try {
    const { id: programId } = req.params;
    const { xidId, method, site, timestamp } = req.body;

    if (!xidId || !method) {
      return res.status(400).json({ error: 'xidId and method are required' });
    }

    // Verify program belongs to user's organization
    if (!req.isGlobalAdmin) {
      const [program] = await db
        .select()
        .from(programs)
        .where(and(
          eq(programs.id, programId),
          sql`${programs.orgId} = ANY(${req.userOrgIds}::uuid[])`
        ))
        .limit(1);

      if (!program) {
        return res.status(403).json({ error: 'Program not found or access denied' });
      }
    }

    const [record] = await db
      .insert(attendance)
      .values({
        programId,
        xidId,
        method,
        site,
        timestamp: timestamp ? new Date(timestamp) : new Date()
      })
      .returning();

    res.json(record);
  } catch (error) {
    logger.error({ err: error, context: 'org-record-attendance' }, 'Error recording attendance');
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

router.get('/programs/:id/outcomes', verifyOrgAccess, async (req, res) => {
  try {
    const { id: programId } = req.params;
    const { timeRange } = req.query;

    // Verify program belongs to user's organization
    if (!req.isGlobalAdmin) {
      const [program] = await db
        .select()
        .from(programs)
        .where(and(
          eq(programs.id, programId),
          sql`${programs.orgId} = ANY(${req.userOrgIds}::uuid[])`
        ))
        .limit(1);

      if (!program) {
        return res.status(403).json({ error: 'Program not found or access denied' });
      }
    }

    const K_ANONYMITY = 5;
    const edmontonNow = DateTime.now().setZone('America/Edmonton');
    let startDate = null;

    if (timeRange === '7days') {
      startDate = edmontonNow.minus({ days: 7 }).startOf('day').toJSDate();
    } else if (timeRange === '30days') {
      startDate = edmontonNow.minus({ days: 30 }).startOf('day').toJSDate();
    } else if (timeRange === '90days') {
      startDate = edmontonNow.minus({ days: 90 }).startOf('day').toJSDate();
    }

    const dateFilter = startDate 
      ? and(eq(outcomeEvents.programId, programId), eq(outcomeEvents.attended, true), gte(outcomeEvents.createdAt, startDate))
      : and(eq(outcomeEvents.programId, programId), eq(outcomeEvents.attended, true));

    // Get aggregated outcome data
    const [stats] = await db
      .select({
        totalResponses: count(outcomeEvents.id),
        avgHelpfulness: sql`AVG(${outcomeEvents.helpfulnessRating})`,
        recommendCount: sql`COUNT(*) FILTER (WHERE ${outcomeEvents.wouldRecommend} = true)`
      })
      .from(outcomeEvents)
      .where(dateFilter);

    const totalResponses = Number(stats?.totalResponses || 0);

    if (totalResponses < K_ANONYMITY) {
      return res.json({
        totalResponses,
        anonymized: true,
        message: `Privacy protection: Data suppressed until at least ${K_ANONYMITY} responses are collected.`,
        averageHelpfulness: null,
        wouldRecommendPercentage: null,
        outcomesTimeline: []
      });
    }

    const averageHelpfulness = stats.avgHelpfulness ? Math.round(Number(stats.avgHelpfulness) * 10) / 10 : null;
    const wouldRecommendPercentage = totalResponses > 0 
      ? Math.round((Number(stats.recommendCount) / totalResponses) * 100) 
      : 0;

    // Get timeline data for trend chart
    const timelineData = await db
      .select({
        date: sql`DATE(${outcomeEvents.createdAt})`,
        count: count(outcomeEvents.id),
        avgHelpfulness: sql`AVG(${outcomeEvents.helpfulnessRating})`
      })
      .from(outcomeEvents)
      .where(dateFilter)
      .groupBy(sql`DATE(${outcomeEvents.createdAt})`)
      .orderBy(sql`DATE(${outcomeEvents.createdAt})`);

    const outcomesTimeline = timelineData.map(row => ({
      date: row.date,
      responses: Number(row.count),
      avgHelpfulness: row.avgHelpfulness ? Math.round(Number(row.avgHelpfulness) * 10) / 10 : 0
    }));

    res.json({
      totalResponses,
      anonymized: false,
      averageHelpfulness,
      wouldRecommendPercentage,
      outcomesTimeline
    });
  } catch (error) {
    logger.error({ err: error, context: 'org-program-outcomes' }, 'Error fetching program outcomes');
    res.status(500).json({ error: 'Failed to fetch program outcomes' });
  }
});

// Create org-scoped program
router.post('/programs', verifyOrgAccess, async (req, res) => {
  try {
    if (req.userOrgIds.length === 0 && !req.isGlobalAdmin) {
      return res.status(403).json({ error: 'Organization membership required' });
    }

    const orgId = req.userOrgIds[0]; // Use first org for now
    const {
      title,
      description,
      long_description,
      tags,
      free,
      cost_cents,
      location_name,
      address,
      organizer,
      contact_email,
      contact_phone,
      website_url,
      capacity,
      age_min,
      age_max,
      indoor,
      outdoor
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const [program] = await db
      .insert(programs)
      .values({
        title,
        description: description || null,
        tags: tags || [],
        free: free ?? true,
        costCents: cost_cents || null,
        locationName: location_name || null,
        address: address || null,
        organizer: organizer || null,
        orgId,
        contactEmail: contact_email || null,
        contactPhone: contact_phone || null,
        website: website_url || null,
        ageMin: age_min || null,
        ageMax: age_max || null,
        indoor: indoor || null,
        outdoor: outdoor || null
      })
      .returning();

    logger.info({ programId: program.id, orgId }, 'Created org-scoped program');
    res.status(201).json(program);
  } catch (error) {
    logger.error({ err: error, context: 'org-create-program' }, 'Error creating program');
    res.status(500).json({ error: 'Failed to create program' });
  }
});

// Update org-scoped program
router.put('/programs/:id', verifyOrgAccess, async (req, res) => {
  try {
    const { id: programId } = req.params;

    // Verify program belongs to user's organization
    if (!req.isGlobalAdmin) {
      const [program] = await db
        .select()
        .from(programs)
        .where(and(
          eq(programs.id, programId),
          sql`${programs.orgId} = ANY(${req.userOrgIds}::uuid[])`
        ))
        .limit(1);

      if (!program) {
        return res.status(403).json({ error: 'Program not found or access denied' });
      }
    }

    const {
      title,
      description,
      long_description,
      tags,
      free,
      cost_cents,
      location_name,
      address,
      organizer,
      contact_email,
      contact_phone,
      website_url,
      capacity,
      age_min,
      age_max,
      indoor,
      outdoor
    } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = tags;
    if (free !== undefined) updateData.free = free;
    if (cost_cents !== undefined) updateData.costCents = cost_cents;
    if (location_name !== undefined) updateData.locationName = location_name;
    if (address !== undefined) updateData.address = address;
    if (organizer !== undefined) updateData.organizer = organizer;
    if (contact_email !== undefined) updateData.contactEmail = contact_email;
    if (contact_phone !== undefined) updateData.contactPhone = contact_phone;
    if (website_url !== undefined) updateData.website = website_url;
    if (age_min !== undefined) updateData.ageMin = age_min;
    if (age_max !== undefined) updateData.ageMax = age_max;
    if (indoor !== undefined) updateData.indoor = indoor;
    if (outdoor !== undefined) updateData.outdoor = outdoor;
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(programs)
      .set(updateData)
      .where(eq(programs.id, programId))
      .returning();

    logger.info({ programId }, 'Updated org-scoped program');
    res.json(updated);
  } catch (error) {
    logger.error({ err: error, context: 'org-update-program' }, 'Error updating program');
    res.status(500).json({ error: 'Failed to update program' });
  }
});

// Delete org-scoped program
router.delete('/programs/:id', verifyOrgAccess, async (req, res) => {
  try {
    const { id: programId } = req.params;

    // Verify program belongs to user's organization
    if (!req.isGlobalAdmin) {
      const [program] = await db
        .select()
        .from(programs)
        .where(and(
          eq(programs.id, programId),
          sql`${programs.orgId} = ANY(${req.userOrgIds}::uuid[])`
        ))
        .limit(1);

      if (!program) {
        return res.status(403).json({ error: 'Program not found or access denied' });
      }
    }

    await db.delete(programs).where(eq(programs.id, programId));

    logger.info({ programId }, 'Deleted org-scoped program');
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error, context: 'org-delete-program' }, 'Error deleting program');
    res.status(500).json({ error: 'Failed to delete program' });
  }
});

// Get org members
router.get('/members', verifyOrgAccess, async (req, res) => {
  try {
    if (req.userOrgIds.length === 0 && !req.isGlobalAdmin) {
      return res.status(403).json({ error: 'Organization membership required' });
    }

    const orgId = req.userOrgIds[0];

    const members = await db
      .select({
        id: orgMembers.userId,
        email: users.email,
        role: orgMembers.role,
        active: orgMembers.active,
        createdAt: orgMembers.createdAt,
        firstName: profiles.firstName,
        lastName: profiles.lastName
      })
      .from(orgMembers)
      .innerJoin(users, eq(orgMembers.userId, users.id))
      .leftJoin(profiles, eq(orgMembers.userId, profiles.userId))
      .where(eq(orgMembers.orgId, orgId))
      .orderBy(orgMembers.createdAt);

    res.json(members);
  } catch (error) {
    logger.error({ err: error, context: 'org-members-list' }, 'Error fetching org members');
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Invite new staff member
router.post('/members/invite', verifyOrgAccess, async (req, res) => {
  try {
    if (req.userOrgIds.length === 0 && !req.isGlobalAdmin) {
      return res.status(403).json({ error: 'Organization membership required' });
    }

    const orgId = req.userOrgIds[0];
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    const validRoles = ['admin', 'facilitator', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, facilitator, or viewer' });
    }

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found. They must register first.' });
    }

    // Check if already a member
    const [existingMember] = await db
      .select()
      .from(orgMembers)
      .where(and(
        eq(orgMembers.userId, existingUser.id),
        eq(orgMembers.orgId, orgId)
      ))
      .limit(1);

    if (existingMember) {
      return res.status(409).json({ error: 'User is already a member of this organization' });
    }

    // Add as member
    const [member] = await db
      .insert(orgMembers)
      .values({
        userId: existingUser.id,
        orgId,
        role,
        active: true
      })
      .returning();

    logger.info({ userId: existingUser.id, orgId, role }, 'Added new org member');
    res.status(201).json({
      id: existingUser.id,
      email: existingUser.email,
      role: member.role,
      active: member.active,
      createdAt: member.createdAt
    });
  } catch (error) {
    logger.error({ err: error, context: 'org-member-invite' }, 'Error inviting member');
    res.status(500).json({ error: 'Failed to invite member' });
  }
});

// Update member role
router.put('/members/:id/role', verifyOrgAccess, async (req, res) => {
  try {
    if (req.userOrgIds.length === 0 && !req.isGlobalAdmin) {
      return res.status(403).json({ error: 'Organization membership required' });
    }

    const orgId = req.userOrgIds[0];
    const { id: userId } = req.params;
    const { role } = req.body;

    const validRoles = ['admin', 'facilitator', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, facilitator, or viewer' });
    }

    // Verify member exists in this org
    const [existingMember] = await db
      .select()
      .from(orgMembers)
      .where(and(
        eq(orgMembers.userId, userId),
        eq(orgMembers.orgId, orgId)
      ))
      .limit(1);

    if (!existingMember) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Can't demote yourself if you're the only admin
    if (existingMember.role === 'admin' && role !== 'admin' && userId === req.session.userId) {
      const [adminCount] = await db
        .select({ count: count() })
        .from(orgMembers)
        .where(and(
          eq(orgMembers.orgId, orgId),
          eq(orgMembers.role, 'admin'),
          eq(orgMembers.active, true)
        ));

      if (Number(adminCount.count) <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last admin. Promote another member first.' });
      }
    }

    await db
      .update(orgMembers)
      .set({ role })
      .where(and(
        eq(orgMembers.userId, userId),
        eq(orgMembers.orgId, orgId)
      ));

    logger.info({ userId, orgId, role }, 'Updated org member role');
    res.json({ success: true, role });
  } catch (error) {
    logger.error({ err: error, context: 'org-member-role-update' }, 'Error updating member role');
    res.status(500).json({ error: 'Failed to update member role' });
  }
});

// Remove member from org
router.delete('/members/:id', verifyOrgAccess, async (req, res) => {
  try {
    if (req.userOrgIds.length === 0 && !req.isGlobalAdmin) {
      return res.status(403).json({ error: 'Organization membership required' });
    }

    const orgId = req.userOrgIds[0];
    const { id: userId } = req.params;

    // Verify member exists
    const [existingMember] = await db
      .select()
      .from(orgMembers)
      .where(and(
        eq(orgMembers.userId, userId),
        eq(orgMembers.orgId, orgId)
      ))
      .limit(1);

    if (!existingMember) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Can't remove yourself if you're the only admin
    if (existingMember.role === 'admin' && userId === req.session.userId) {
      const [adminCount] = await db
        .select({ count: count() })
        .from(orgMembers)
        .where(and(
          eq(orgMembers.orgId, orgId),
          eq(orgMembers.role, 'admin'),
          eq(orgMembers.active, true)
        ));

      if (Number(adminCount.count) <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last admin. Promote another member first.' });
      }
    }

    await db
      .delete(orgMembers)
      .where(and(
        eq(orgMembers.userId, userId),
        eq(orgMembers.orgId, orgId)
      ));

    logger.info({ userId, orgId }, 'Removed org member');
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error, context: 'org-member-remove' }, 'Error removing member');
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Search youth who have attended org programs
router.get('/youth', verifyOrgAccess, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.json({ youth: [] });
    }

    const orgId = req.userOrgIds[0];
    if (!orgId && !req.isGlobalAdmin) {
      return res.status(403).json({ error: 'Organization membership required' });
    }

    const searchPattern = `%${q}%`;
    
    const youthResults = await db
      .selectDistinct({
        id: users.id,
        displayName: profiles.displayName,
        lastAttendance: sql`MAX(${attendance.timestamp})`.as('last_attendance')
      })
      .from(attendance)
      .innerJoin(programs, eq(attendance.programId, programs.id))
      .innerJoin(xids, eq(attendance.xidId, xids.id))
      .innerJoin(users, eq(xids.userId, users.id))
      .innerJoin(profiles, eq(users.id, profiles.userId))
      .where(and(
        req.isGlobalAdmin ? undefined : eq(programs.orgId, orgId),
        ilike(profiles.displayName, searchPattern)
      ))
      .groupBy(users.id, profiles.displayName)
      .orderBy(desc(sql`MAX(${attendance.timestamp})`))
      .limit(20);

    res.json({ 
      youth: youthResults.map(y => ({
        id: y.id,
        displayName: y.displayName || 'Anonymous',
        lastAttendance: y.lastAttendance
      }))
    });
  } catch (error) {
    logger.error({ err: error, context: 'org-youth-search' }, 'Error searching youth');
    res.status(500).json({ error: 'Failed to search youth' });
  }
});

// Get partner organizations (other orgs to refer to)
router.get('/partner-organizations', verifyOrgAccess, async (req, res) => {
  try {
    const orgId = req.userOrgIds[0];
    
    const orgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        type: organizations.type
      })
      .from(organizations)
      .where(and(
        eq(organizations.active, true),
        orgId ? ne(organizations.id, orgId) : undefined
      ))
      .orderBy(organizations.name);

    res.json({ organizations: orgs });
  } catch (error) {
    logger.error({ err: error, context: 'org-partner-orgs' }, 'Error fetching partner organizations');
    res.status(500).json({ error: 'Failed to fetch partner organizations' });
  }
});

// Create a new referral
router.post('/referrals', verifyOrgAccess, async (req, res) => {
  try {
    const orgId = req.userOrgIds[0];
    if (!orgId) {
      return res.status(403).json({ error: 'Organization membership required to create referrals' });
    }

    const { youth_id, to_org_id, priority, summary } = req.body;

    if (!youth_id || !to_org_id) {
      return res.status(400).json({ error: 'youth_id and to_org_id are required' });
    }

    const validPriorities = ['low', 'medium', 'high'];
    const referralPriority = validPriorities.includes(priority) ? priority : 'medium';

    const [newReferral] = await db
      .insert(referrals)
      .values({
        fromOrgId: orgId,
        toOrgId: to_org_id,
        youthId: youth_id,
        priority: referralPriority,
        summary: summary || null,
        status: 'pending_consent',
        sentAt: new Date()
      })
      .returning();

    logger.info({ referralId: newReferral.id, fromOrg: orgId, toOrg: to_org_id }, 'Referral created');
    res.status(201).json({ referral: newReferral });
  } catch (error) {
    logger.error({ err: error, context: 'org-referral-create' }, 'Error creating referral');
    res.status(500).json({ error: 'Failed to create referral' });
  }
});

// Get referrals for the organization (both sent and received)
router.get('/referrals', verifyOrgAccess, async (req, res) => {
  try {
    const orgId = req.userOrgIds[0];
    if (!orgId && !req.isGlobalAdmin) {
      return res.status(403).json({ error: 'Organization membership required' });
    }

    const { status } = req.query;

    let whereClause = req.isGlobalAdmin 
      ? undefined 
      : or(eq(referrals.fromOrgId, orgId), eq(referrals.toOrgId, orgId));

    if (status && status !== 'all') {
      whereClause = and(whereClause, eq(referrals.status, status));
    }

    const referralList = await db
      .select({
        id: referrals.id,
        youthId: referrals.youthId,
        youthName: profiles.displayName,
        toOrgId: referrals.toOrgId,
        toOrgName: organizations.name,
        fromOrgId: referrals.fromOrgId,
        priority: referrals.priority,
        status: referrals.status,
        summary: referrals.summary,
        createdAt: referrals.createdAt,
        sentAt: referrals.sentAt,
        acceptedAt: referrals.acceptedAt,
        declinedAt: referrals.declinedAt,
        declinedReason: referrals.declinedReason
      })
      .from(referrals)
      .leftJoin(profiles, eq(referrals.youthId, profiles.userId))
      .leftJoin(organizations, eq(referrals.toOrgId, organizations.id))
      .where(whereClause)
      .orderBy(desc(referrals.createdAt))
      .limit(100);

    res.json({ 
      referrals: referralList.map(r => ({
        ...r,
        youthName: r.youthName || 'Anonymous'
      }))
    });
  } catch (error) {
    logger.error({ err: error, context: 'org-referrals-list' }, 'Error fetching referrals');
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
});

// Export referrals as CSV
router.get('/referrals/export', verifyOrgAccess, async (req, res) => {
  try {
    const orgId = req.userOrgIds[0];
    if (!orgId && !req.isGlobalAdmin) {
      return res.status(403).json({ error: 'Organization membership required' });
    }

    const { status } = req.query;

    let whereClause = req.isGlobalAdmin 
      ? undefined 
      : or(eq(referrals.fromOrgId, orgId), eq(referrals.toOrgId, orgId));

    if (status && status !== 'all') {
      whereClause = and(whereClause, eq(referrals.status, status));
    }

    const referralList = await db
      .select({
        id: referrals.id,
        youthName: profiles.displayName,
        toOrgName: organizations.name,
        priority: referrals.priority,
        status: referrals.status,
        summary: referrals.summary,
        createdAt: referrals.createdAt,
        sentAt: referrals.sentAt,
        acceptedAt: referrals.acceptedAt,
        declinedAt: referrals.declinedAt,
        declinedReason: referrals.declinedReason
      })
      .from(referrals)
      .leftJoin(profiles, eq(referrals.youthId, profiles.userId))
      .leftJoin(organizations, eq(referrals.toOrgId, organizations.id))
      .where(whereClause)
      .orderBy(desc(referrals.createdAt));

    const csvData = referralList.map(r => ({
      'Referral ID': r.id,
      'Youth': r.youthName || 'Anonymous',
      'To Organization': r.toOrgName || 'Unknown',
      'Priority': r.priority,
      'Status': r.status,
      'Summary': r.summary || '',
      'Created': r.createdAt ? DateTime.fromJSDate(r.createdAt).toISO() : '',
      'Sent': r.sentAt ? DateTime.fromJSDate(r.sentAt).toISO() : '',
      'Accepted': r.acceptedAt ? DateTime.fromJSDate(r.acceptedAt).toISO() : '',
      'Declined': r.declinedAt ? DateTime.fromJSDate(r.declinedAt).toISO() : '',
      'Decline Reason': r.declinedReason || ''
    }));

    const parser = new Parser();
    const csv = parser.parse(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=referrals-${DateTime.now().toISODate()}.csv`);
    res.send(csv);
  } catch (error) {
    logger.error({ err: error, context: 'org-referrals-export' }, 'Error exporting referrals');
    res.status(500).json({ error: 'Failed to export referrals' });
  }
});

export default router;
