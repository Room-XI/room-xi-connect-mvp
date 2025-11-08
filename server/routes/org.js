import express from 'express';
import { db } from '../db.js';
import { attendance, programs, profiles, checkins, orgMembers, xids } from '../schema.js';
import { eq, sql, desc, and, gte, lte } from 'drizzle-orm';
import { Parser } from '@json2csv/plainjs';
import { DateTime } from 'luxon';

const router = express.Router();

router.get('/dashboard', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, req.session.userId))
      .limit(1);

    if (!profile || !['org_admin', 'admin'].includes(profile.role)) {
      return res.status(403).json({ error: 'Organization admin access required' });
    }

    res.json({
      totalAttendance: 0,
      uniqueParticipants: 0,
      programs: [],
      recentActivity: [],
    });
  } catch (error) {
    console.error('Error fetching org dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch org dashboard' });
  }
});

router.get('/export', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, req.session.userId))
      .limit(1);

    if (!profile) {
      return res.status(403).json({ error: 'Profile not found' });
    }

    const userOrgs = await db
      .select({ orgId: orgMembers.orgId })
      .from(orgMembers)
      .where(and(
        eq(orgMembers.userId, req.session.userId),
        eq(orgMembers.active, true)
      ));

    if (userOrgs.length === 0) {
      return res.status(403).json({ error: 'No organization membership found' });
    }

    const orgIds = userOrgs.map(o => o.orgId);

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
        sql`${programs.orgId} = ANY(${orgIds}::uuid[])`
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
    console.error('Error exporting attendance report:', error);
    res.status(500).json({ error: 'Failed to export attendance report' });
  }
});

export default router;
