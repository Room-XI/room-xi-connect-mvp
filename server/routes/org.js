import express from 'express';
import { db, pool } from '../db.js';
import { attendance, programs, profiles, checkins, orgMembers, xids, users, programEvents, outcomeEvents, peerSuccessInsights } from '../schema.js';
import { eq, sql, desc, and, gte, lte, count, countDistinct } from 'drizzle-orm';
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

    // Get aggregated outcome data
    const [stats] = await db
      .select({
        totalResponses: count(outcomeEvents.id),
        avgHelpfulness: sql`AVG(${outcomeEvents.helpfulnessRating})`,
        recommendCount: sql`COUNT(*) FILTER (WHERE ${outcomeEvents.wouldRecommend} = true)`
      })
      .from(outcomeEvents)
      .where(and(
        eq(outcomeEvents.programId, programId),
        eq(outcomeEvents.attended, true)
      ));

    const totalResponses = Number(stats?.totalResponses || 0);

    if (totalResponses < K_ANONYMITY) {
      return res.json({
        totalResponses,
        anonymized: true,
        message: `Privacy protection: Data suppressed until at least ${K_ANONYMITY} responses are collected.`,
        averageHelpfulness: null,
        wouldRecommendPercentage: null
      });
    }

    const averageHelpfulness = stats.avgHelpfulness ? Math.round(Number(stats.avgHelpfulness) * 10) / 10 : null;
    const wouldRecommendPercentage = totalResponses > 0 
      ? Math.round((Number(stats.recommendCount) / totalResponses) * 100) 
      : 0;

    res.json({
      totalResponses,
      anonymized: false,
      averageHelpfulness,
      wouldRecommendPercentage
    });
  } catch (error) {
    logger.error({ err: error, context: 'org-program-outcomes' }, 'Error fetching program outcomes');
    res.status(500).json({ error: 'Failed to fetch program outcomes' });
  }
});

export default router;
