import express from 'express';
import { db } from '../db.js';
import {
  profiles,
  checkins,
  programs,
  youthPrivacySettings,
  guardianVerifications,
  attendance,
  xids,
} from '../schema.js';
import { parentLinks, youthDemographics } from '../schema.extras.js';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';

const router = express.Router();

const requireParent = (req, res, next) => {
  if (!req.session?.parentId) {
    return res.status(401).json({ error: 'Parent authentication required' });
  }
  next();
};

async function verifyParentYouthLink(parentId, youthId) {
  const [link] = await db
    .select()
    .from(parentLinks)
    .where(
      and(
        eq(parentLinks.parentId, parentId),
        eq(parentLinks.userId, youthId)
      )
    )
    .limit(1);
  
  return link;
}

async function getYouthPrivacySettings(youthId) {
  let [settings] = await db
    .select()
    .from(youthPrivacySettings)
    .where(eq(youthPrivacySettings.userId, youthId))
    .limit(1);

  if (!settings) {
    return {
      parentCanSeeMood: true,
      parentCanSeeDemographics: false,
      parentCanSeeAttendance: true,
      parentCanSeeXimiChats: false,
      hiddenProgramIds: [],
    };
  }

  return {
    parentCanSeeMood: settings.parentCanSeeMood ?? true,
    parentCanSeeDemographics: settings.parentCanSeeDemographics ?? false,
    parentCanSeeAttendance: settings.parentCanSeeAttendance ?? true,
    parentCanSeeXimiChats: settings.parentCanSeeXimiChats ?? false,
    hiddenProgramIds: settings.hiddenProgramIds || [],
  };
}

async function getFilteredYouthData(youthId, parentId) {
  const privacySettings = await getYouthPrivacySettings(youthId);
  
  const hiddenCategories = [];
  
  const [profile] = await db
    .select({
      firstName: profiles.firstName,
      preferredName: profiles.preferredName,
      age: profiles.age,
      city: profiles.city,
      streakCount: profiles.streakCount,
      lastCheckinDate: profiles.lastCheckinDate,
      mood: profiles.mood,
    })
    .from(profiles)
    .where(eq(profiles.userId, youthId))
    .limit(1);

  let moodData = null;
  if (privacySettings.parentCanSeeMood) {
    const recentCheckins = await db
      .select({
        id: checkins.id,
        timestamp: checkins.timestamp,
        checkinDate: checkins.checkinDate,
        moodLevel16: checkins.moodLevel16,
        moodType: checkins.moodType,
        wellnessDimensions: checkins.wellnessDimensions,
      })
      .from(checkins)
      .where(eq(checkins.userId, youthId))
      .orderBy(desc(checkins.timestamp))
      .limit(14);

    const totalCheckins = await db
      .select({ count: sql`count(*)::int` })
      .from(checkins)
      .where(eq(checkins.userId, youthId));

    const avgMood = recentCheckins.length > 0
      ? recentCheckins.reduce((sum, c) => sum + c.moodLevel16, 0) / recentCheckins.length
      : null;

    moodData = {
      recentCheckins: recentCheckins.map(c => ({
        date: c.checkinDate,
        moodLevel: c.moodLevel16,
        moodType: c.moodType,
      })),
      totalCheckins: totalCheckins[0]?.count || 0,
      averageMood: avgMood ? Math.round(avgMood * 10) / 10 : null,
      currentMood: profile?.mood || null,
      streakCount: profile?.streakCount || 0,
      lastCheckinDate: profile?.lastCheckinDate || null,
    };
  } else {
    hiddenCategories.push('mood');
  }

  let attendanceData = null;
  if (privacySettings.parentCanSeeAttendance) {
    const [userXid] = await db
      .select({ id: xids.id })
      .from(xids)
      .where(
        and(
          eq(xids.userId, youthId),
          sql`${xids.tombstonedAt} IS NULL`
        )
      )
      .limit(1);

    if (userXid) {
      let attendanceRecords = await db
        .select({
          id: attendance.id,
          programId: attendance.programId,
          timestamp: attendance.timestamp,
          method: attendance.method,
          programTitle: programs.title,
          programTags: programs.tags,
          programOrganizer: programs.organizer,
        })
        .from(attendance)
        .leftJoin(programs, eq(attendance.programId, programs.id))
        .where(eq(attendance.xidId, userXid.id))
        .orderBy(desc(attendance.timestamp))
        .limit(50);

      if (privacySettings.hiddenProgramIds && privacySettings.hiddenProgramIds.length > 0) {
        attendanceRecords = attendanceRecords.filter(
          a => !privacySettings.hiddenProgramIds.includes(a.programId)
        );
      }

      attendanceData = {
        records: attendanceRecords.map(a => ({
          programId: a.programId,
          programTitle: a.programTitle,
          organizer: a.programOrganizer,
          timestamp: a.timestamp,
          method: a.method,
        })),
        totalAttendance: attendanceRecords.length,
        hiddenProgramCount: privacySettings.hiddenProgramIds?.length || 0,
      };
    } else {
      attendanceData = {
        records: [],
        totalAttendance: 0,
        hiddenProgramCount: 0,
      };
    }
  } else {
    hiddenCategories.push('attendance');
  }

  let demographicsData = null;
  if (privacySettings.parentCanSeeDemographics) {
    const [youthDemo] = await db
      .select()
      .from(youthDemographics)
      .where(eq(youthDemographics.userId, youthId))
      .limit(1);

    if (youthDemo) {
      demographicsData = {
        answers: youthDemo.answers || {},
        updatedAt: youthDemo.updatedAt,
      };
    }
  } else {
    hiddenCategories.push('demographics');
  }

  if (!privacySettings.parentCanSeeXimiChats) {
    hiddenCategories.push('ximiChats');
  }

  return {
    profile: {
      firstName: profile?.firstName || null,
      preferredName: profile?.preferredName || null,
      age: profile?.age || null,
      city: profile?.city || null,
    },
    privacySettings: {
      moodVisible: privacySettings.parentCanSeeMood,
      attendanceVisible: privacySettings.parentCanSeeAttendance,
      demographicsVisible: privacySettings.parentCanSeeDemographics,
      ximiChatsVisible: privacySettings.parentCanSeeXimiChats,
    },
    moodData,
    attendanceData,
    demographicsData,
    hiddenCategories,
  };
}

router.get('/youth-data/:youthId', requireParent, async (req, res) => {
  try {
    const { youthId } = req.params;
    const parentId = req.session.parentId;

    const link = await verifyParentYouthLink(parentId, youthId);
    if (!link) {
      return res.status(403).json({ 
        error: 'You are not authorized to view this youth\'s data',
        code: 'NOT_LINKED'
      });
    }

    if (!link.verifiedAt) {
      return res.status(403).json({
        error: 'Your link with this youth has not been verified yet',
        code: 'NOT_VERIFIED'
      });
    }

    const filteredData = await getFilteredYouthData(youthId, parentId);

    res.json({
      success: true,
      youthId,
      relation: link.relation,
      verifiedAt: link.verifiedAt,
      ...filteredData,
    });
  } catch (error) {
    console.error('Error fetching youth data for parent:', error);
    res.status(500).json({ error: 'Failed to fetch youth data' });
  }
});

router.get('/youth-data', requireParent, async (req, res) => {
  try {
    const parentId = req.session.parentId;

    const links = await db
      .select({
        userId: parentLinks.userId,
        relation: parentLinks.relation,
        verifiedAt: parentLinks.verifiedAt,
      })
      .from(parentLinks)
      .where(eq(parentLinks.parentId, parentId));

    if (links.length === 0) {
      return res.json({
        success: true,
        youth: [],
        message: 'No linked youth accounts found',
      });
    }

    const youthDataPromises = links
      .filter(link => link.verifiedAt)
      .map(async (link) => {
        const filteredData = await getFilteredYouthData(link.userId, parentId);
        return {
          youthId: link.userId,
          relation: link.relation,
          verifiedAt: link.verifiedAt,
          ...filteredData,
        };
      });

    const youthData = await Promise.all(youthDataPromises);

    res.json({
      success: true,
      youth: youthData,
    });
  } catch (error) {
    console.error('Error fetching all youth data for parent:', error);
    res.status(500).json({ error: 'Failed to fetch youth data' });
  }
});

router.get('/privacy-summary/:youthId', requireParent, async (req, res) => {
  try {
    const { youthId } = req.params;
    const parentId = req.session.parentId;

    const link = await verifyParentYouthLink(parentId, youthId);
    if (!link) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const privacySettings = await getYouthPrivacySettings(youthId);

    const [profile] = await db
      .select({ preferredName: profiles.preferredName, firstName: profiles.firstName })
      .from(profiles)
      .where(eq(profiles.userId, youthId))
      .limit(1);

    const youthName = profile?.preferredName || profile?.firstName || 'Youth';

    const hiddenItems = [];
    if (!privacySettings.parentCanSeeMood) {
      hiddenItems.push('Mood check-ins and wellness data');
    }
    if (!privacySettings.parentCanSeeAttendance) {
      hiddenItems.push('Program attendance records');
    }
    if (!privacySettings.parentCanSeeDemographics) {
      hiddenItems.push('Identity and demographics information');
    }
    if (!privacySettings.parentCanSeeXimiChats) {
      hiddenItems.push('Ximi AI conversations');
    }
    if (privacySettings.hiddenProgramIds?.length > 0) {
      hiddenItems.push(`${privacySettings.hiddenProgramIds.length} specific program(s)`);
    }

    res.json({
      success: true,
      youthName,
      privacySettings: {
        moodVisible: privacySettings.parentCanSeeMood,
        attendanceVisible: privacySettings.parentCanSeeAttendance,
        demographicsVisible: privacySettings.parentCanSeeDemographics,
        ximiChatsVisible: privacySettings.parentCanSeeXimiChats,
        hiddenProgramCount: privacySettings.hiddenProgramIds?.length || 0,
      },
      hiddenItems,
      message: hiddenItems.length > 0 
        ? `${youthName} has chosen to keep some information private. This is their right under our privacy-first approach.`
        : `${youthName} is sharing all information with you.`,
    });
  } catch (error) {
    console.error('Error fetching privacy summary:', error);
    res.status(500).json({ error: 'Failed to fetch privacy summary' });
  }
});

export default router;
