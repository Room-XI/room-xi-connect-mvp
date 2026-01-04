import express from 'express';
import { db, pool } from '../db.js';
import { attendance, programs, profiles, checkins, orgMembers, xids, users, programEvents } from '../schema.js';
import { eq, sql, desc, and, gte, lte, count, countDistinct } from 'drizzle-orm';
import { Parser } from '@json2csv/plainjs';
import { DateTime } from 'luxon';

const router = express.Router();

router.get('/dashboard/stats', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, req.session.userId))
      .limit(1);

    if (!profile || !profile.isAdmin) {
      return res.status(403).json({ error: 'Organization admin access required' });
    }

    const edmontonNow = DateTime.now().setZone('America/Edmonton');
    const thirtyDaysAgo = edmontonNow.minus({ days: 30 }).startOf('day').toJSDate();

    const [
      totalUsersResult,
      activeUsersResult,
      totalCheckinsResult,
      avgMoodResult,
      programsCountResult,
      thisMonthAttendanceResult
    ] = await Promise.all([
      db.select({ count: count() }).from(users),
      
      db.select({ count: sql`COUNT(DISTINCT ${checkins.userId})` })
        .from(checkins)
        .where(gte(checkins.timestamp, thirtyDaysAgo)),
      
      db.select({ count: count() }).from(checkins),
      
      db.select({ avgMood: sql`ROUND(AVG(${checkins.moodLevel16})::numeric, 2)` })
        .from(checkins)
        .where(gte(checkins.timestamp, thirtyDaysAgo)),
      
      db.select({ count: count() }).from(programs),
      
      db.select({ count: count() })
        .from(attendance)
        .where(gte(attendance.timestamp, thirtyDaysAgo))
    ]);

    const totalUsers = Number(totalUsersResult[0]?.count || 0);
    const activeUsers = Number(activeUsersResult[0]?.count || 0);
    const totalCheckins = Number(totalCheckinsResult[0]?.count || 0);
    const avgMood = Number(avgMoodResult[0]?.avgMood || 0);
    const programsCount = Number(programsCountResult[0]?.count || 0);
    const thisMonthAttendance = Number(thisMonthAttendanceResult[0]?.count || 0);

    res.json({
      totalUsers,
      activeUsers,
      totalCheckins,
      avgMood,
      programsCount,
      thisMonthAttendance
    });
  } catch (error) {
    console.error('Error fetching org dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch org dashboard stats' });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, req.session.userId))
      .limit(1);

    if (!profile || !profile.isAdmin) {
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

router.get('/programs', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, req.session.userId))
      .limit(1);

    if (!profile || !profile.isAdmin) {
      return res.status(403).json({ error: 'Organization admin access required' });
    }

    const programList = await db
      .select({
        id: programs.id,
        title: programs.title,
        organizer: programs.organizer,
      })
      .from(programs)
      .orderBy(programs.title);

    res.json(programList);
  } catch (error) {
    console.error('Error fetching programs:', error);
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
});

router.get('/outcomes/:programId', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, req.session.userId))
      .limit(1);

    if (!profile || !profile.isAdmin) {
      return res.status(403).json({ error: 'Organization admin access required' });
    }

    const { programId } = req.params;
    const edmontonNow = DateTime.now().setZone('America/Edmonton');
    const threeMonthsAgo = edmontonNow.minus({ months: 3 }).startOf('day').toJSDate();

    const [uniqueParticipantsResult] = await db
      .select({ count: countDistinct(attendance.xidId) })
      .from(attendance)
      .where(eq(attendance.programId, programId));
    const uniqueParticipants = Number(uniqueParticipantsResult?.count || 0);

    const [totalSessionsResult] = await db
      .select({ count: count() })
      .from(programEvents)
      .where(eq(programEvents.programId, programId));
    const totalSessions = Number(totalSessionsResult?.count || 0);

    const [totalAttendanceResult] = await db
      .select({ count: count() })
      .from(attendance)
      .where(eq(attendance.programId, programId));
    const totalAttendance = Number(totalAttendanceResult?.count || 0);

    const attendanceRate = totalSessions > 0 && uniqueParticipants > 0
      ? Math.min(100, Math.round((totalAttendance / (totalSessions * uniqueParticipants)) * 100))
      : 0;

    const attendanceRecords = await db
      .select({
        xidId: attendance.xidId,
        timestamp: attendance.timestamp,
      })
      .from(attendance)
      .where(eq(attendance.programId, programId));

    const xidIds = [...new Set(attendanceRecords.map(a => a.xidId))];

    let avgMoodBefore = null;
    let avgMoodAfter = null;

    if (xidIds.length > 0) {
      const xidRecords = await db
        .select({ id: xids.id, userId: xids.userId })
        .from(xids)
        .where(sql`${xids.id} = ANY(${xidIds}::uuid[])`);

      const userIdToXidTimestamps = new Map();
      for (const record of attendanceRecords) {
        const xidRecord = xidRecords.find(x => x.id === record.xidId);
        if (xidRecord) {
          if (!userIdToXidTimestamps.has(xidRecord.userId)) {
            userIdToXidTimestamps.set(xidRecord.userId, []);
          }
          userIdToXidTimestamps.set(xidRecord.userId, [...userIdToXidTimestamps.get(xidRecord.userId), record.timestamp]);
        }
      }

      const userIds = [...userIdToXidTimestamps.keys()];

      if (userIds.length > 0) {
        const allCheckins = await db
          .select({
            userId: checkins.userId,
            timestamp: checkins.timestamp,
            moodLevel: checkins.moodLevel16,
          })
          .from(checkins)
          .where(sql`${checkins.userId} = ANY(${userIds}::uuid[])`);

        let beforeMoods = [];
        let afterMoods = [];

        for (const [userId, attendanceTimes] of userIdToXidTimestamps.entries()) {
          const userCheckins = allCheckins.filter(c => c.userId === userId);

          for (const attendanceTime of attendanceTimes) {
            const attendanceDate = new Date(attendanceTime);
            const dayBefore = new Date(attendanceDate);
            dayBefore.setDate(dayBefore.getDate() - 1);
            const dayAfter = new Date(attendanceDate);
            dayAfter.setDate(dayAfter.getDate() + 1);

            const beforeCheckin = userCheckins.find(c => {
              const checkinDate = new Date(c.timestamp);
              return checkinDate >= dayBefore && checkinDate < attendanceDate;
            });

            const afterCheckin = userCheckins.find(c => {
              const checkinDate = new Date(c.timestamp);
              return checkinDate > attendanceDate && checkinDate <= dayAfter;
            });

            if (beforeCheckin) beforeMoods.push(beforeCheckin.moodLevel);
            if (afterCheckin) afterMoods.push(afterCheckin.moodLevel);
          }
        }

        if (beforeMoods.length > 0) {
          avgMoodBefore = Math.round((beforeMoods.reduce((a, b) => a + b, 0) / beforeMoods.length) * 10) / 10;
        }
        if (afterMoods.length > 0) {
          avgMoodAfter = Math.round((afterMoods.reduce((a, b) => a + b, 0) / afterMoods.length) * 10) / 10;
        }
      }
    }

    const moodImprovement = avgMoodBefore !== null && avgMoodAfter !== null
      ? Math.round((avgMoodAfter - avgMoodBefore) * 10) / 10
      : null;

    const attendanceCounts = {};
    for (const record of attendanceRecords) {
      attendanceCounts[record.xidId] = (attendanceCounts[record.xidId] || 0) + 1;
    }
    const repeatAttendees = Object.values(attendanceCounts).filter(c => c > 1).length;
    const retentionRate = uniqueParticipants > 0
      ? Math.round((repeatAttendees / uniqueParticipants) * 100)
      : 0;

    const attendanceOverTime = await db
      .select({
        date: sql`DATE(${attendance.timestamp})`,
        count: count(),
      })
      .from(attendance)
      .where(and(
        eq(attendance.programId, programId),
        gte(attendance.timestamp, threeMonthsAgo)
      ))
      .groupBy(sql`DATE(${attendance.timestamp})`)
      .orderBy(sql`DATE(${attendance.timestamp})`);

    const attendanceTimeline = attendanceOverTime.map(row => ({
      date: row.date,
      attendees: Number(row.count),
    }));

    const sessionsPerWeek = await db
      .select({
        week: sql`TO_CHAR(DATE_TRUNC('week', ${attendance.timestamp}), 'YYYY-"W"IW')`,
        count: count(),
      })
      .from(attendance)
      .where(and(
        eq(attendance.programId, programId),
        gte(attendance.timestamp, threeMonthsAgo)
      ))
      .groupBy(sql`DATE_TRUNC('week', ${attendance.timestamp})`)
      .orderBy(sql`DATE_TRUNC('week', ${attendance.timestamp})`);

    const sessionsTimeline = sessionsPerWeek.map(row => ({
      week: row.week,
      sessions: Number(row.count),
    }));

    res.json({
      uniqueParticipants,
      attendanceRate,
      avgMoodBefore,
      avgMoodAfter,
      moodImprovement,
      retentionRate,
      attendanceTimeline,
      sessionsTimeline,
    });
  } catch (error) {
    console.error('Error fetching program outcomes:', error);
    res.status(500).json({ error: 'Failed to fetch program outcomes' });
  }
});

export default router;
