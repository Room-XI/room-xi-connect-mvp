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
  consentEvents,
  users,
  consents,
  emergencyContacts,
} from '../schema.js';
import { parentLinks, youthDemographics, parents } from '../schema.extras.js';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { Parser } from '@json2csv/plainjs';

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
  
  // Get co-guardians (other than the current parent)
  // We look for confirmed guardian verifications for this youth
  const allGuardians = await db
    .select({
      name: guardianVerifications.guardianName,
      role: guardianVerifications.guardianRole,
      email: guardianVerifications.guardianContactValue,
    })
    .from(guardianVerifications)
    .where(
      and(
        eq(guardianVerifications.userId, youthId),
        eq(guardianVerifications.status, 'confirmed')
      )
    );

  // We need to identify which one is the "current" parent to exclude them from "co-guardians"
  // The parent session has parentId, but guardianVerifications uses email/hash
  const [currentParent] = await db
    .select({ email: parents.email })
    .from(parents)
    .where(eq(parents.id, parentId))
    .limit(1);

  const coGuardians = allGuardians
    .filter(g => g.email.toLowerCase() !== currentParent?.email?.toLowerCase())
    .map(g => ({
      name: g.name || 'Anonymous Guardian',
      role: g.role || 'secondary'
    }));

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
    coGuardians,
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

router.post('/consent/withdraw/:youthId', requireParent, async (req, res) => {
  try {
    const { youthId } = req.params;
    const { reason } = req.body;
    const parentId = req.session.parentId;

    const link = await verifyParentYouthLink(parentId, youthId);
    if (!link) {
      return res.status(403).json({ error: 'Not authorized to manage this youth\'s consent' });
    }

    if (!link.verifiedAt) {
      return res.status(403).json({ error: 'Your link has not been verified' });
    }

    const [verification] = await db
      .select()
      .from(guardianVerifications)
      .where(eq(guardianVerifications.userId, youthId))
      .limit(1);

    if (!verification) {
      return res.status(404).json({ error: 'No consent record found for this youth' });
    }

    await db
      .update(guardianVerifications)
      .set({
        withdrawnAt: new Date(),
        withdrawnBy: parentId,
        withdrawReason: reason || 'Parent requested withdrawal',
      })
      .where(eq(guardianVerifications.userId, youthId));

    await db.insert(consentEvents).values({
      userId: youthId,
      eventType: 'consent_withdrawn',
      eventData: {
        withdrawnBy: parentId,
        reason: reason || 'Parent requested withdrawal',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
      occurredAt: new Date(),
    });

    console.info(`[Parent Portal] Consent withdrawn for youth ${youthId} by parent ${parentId}`);

    res.json({
      success: true,
      message: 'Consent has been withdrawn. The youth\'s account access will be restricted, but their data remains safe. You can re-grant consent at any time.',
    });
  } catch (error) {
    console.error('Error withdrawing consent:', error);
    res.status(500).json({ error: 'Failed to withdraw consent' });
  }
});

router.get('/data/export/:youthId', requireParent, async (req, res) => {
  try {
    const { youthId } = req.params;
    const parentId = req.session.parentId;

    const link = await verifyParentYouthLink(parentId, youthId);
    if (!link) {
      return res.status(403).json({ error: 'Not authorized to export this youth\'s data' });
    }

    if (!link.verifiedAt) {
      return res.status(403).json({ error: 'Your link has not been verified' });
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, youthId))
      .limit(1);

    const userCheckins = await db
      .select({
        date: checkins.checkinDate,
        moodLevel: checkins.moodLevel16,
        moodType: checkins.moodType,
        dimension: checkins.dimension,
        timestamp: checkins.timestamp,
      })
      .from(checkins)
      .where(eq(checkins.userId, youthId))
      .orderBy(desc(checkins.timestamp));

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

    let attendanceRecords = [];
    if (userXid) {
      attendanceRecords = await db
        .select({
          programTitle: programs.title,
          organizer: programs.organizer,
          timestamp: attendance.timestamp,
          method: attendance.method,
        })
        .from(attendance)
        .leftJoin(programs, eq(attendance.programId, programs.id))
        .where(eq(attendance.xidId, userXid.id))
        .orderBy(desc(attendance.timestamp));
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      profile: profile ? {
        firstName: profile.firstName,
        preferredName: profile.preferredName,
        age: profile.age,
        city: profile.city,
        streakCount: profile.streakCount,
        createdAt: profile.createdAt,
      } : null,
      checkIns: userCheckins,
      attendance: attendanceRecords,
    };

    const checkinsParser = new Parser({
      fields: ['date', 'moodLevel', 'moodType', 'dimension', 'timestamp'],
    });

    const attendanceParser = new Parser({
      fields: ['programTitle', 'organizer', 'timestamp', 'method'],
    });

    let csvContent = `Room XI Connect - Data Export for ${profile?.preferredName || profile?.firstName || 'Youth'}\n`;
    csvContent += `Export Date: ${exportData.exportDate}\n\n`;
    
    csvContent += `=== PROFILE ===\n`;
    if (exportData.profile) {
      csvContent += `First Name: ${exportData.profile.firstName || 'N/A'}\n`;
      csvContent += `Preferred Name: ${exportData.profile.preferredName || 'N/A'}\n`;
      csvContent += `Age: ${exportData.profile.age || 'N/A'}\n`;
      csvContent += `City: ${exportData.profile.city || 'N/A'}\n`;
      csvContent += `Streak Count: ${exportData.profile.streakCount || 0}\n`;
      csvContent += `Account Created: ${exportData.profile.createdAt || 'N/A'}\n`;
    }
    
    csvContent += `\n=== CHECK-INS (${userCheckins.length} total) ===\n`;
    if (userCheckins.length > 0) {
      csvContent += checkinsParser.parse(userCheckins) + '\n';
    } else {
      csvContent += 'No check-ins recorded.\n';
    }

    csvContent += `\n=== PROGRAM ATTENDANCE (${attendanceRecords.length} total) ===\n`;
    if (attendanceRecords.length > 0) {
      csvContent += attendanceParser.parse(attendanceRecords) + '\n';
    } else {
      csvContent += 'No attendance records.\n';
    }

    await db.insert(consentEvents).values({
      userId: youthId,
      eventType: 'data_exported',
      eventData: {
        exportedBy: parentId,
        recordCount: {
          checkins: userCheckins.length,
          attendance: attendanceRecords.length,
        },
        ipAddress: req.ip,
      },
      occurredAt: new Date(),
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="room-xi-data-export-${youthId.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Error exporting youth data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

router.get('/emergency-contacts/:youthId', requireParent, async (req, res) => {
  try {
    const { youthId } = req.params;
    const parentId = req.session.parentId;

    const link = await verifyParentYouthLink(parentId, youthId);
    if (!link || !link.verifiedAt) {
      return res.status(403).json({ error: 'Not authorized or link not verified' });
    }

    const contacts = await db
      .select()
      .from(emergencyContacts)
      .where(eq(emergencyContacts.userId, youthId))
      .orderBy(desc(emergencyContacts.isPrimary), emergencyContacts.name);

    res.json({ success: true, contacts });
  } catch (error) {
    console.error('Error fetching emergency contacts:', error);
    res.status(500).json({ error: 'Failed to fetch emergency contacts' });
  }
});

router.post('/emergency-contacts/:youthId', requireParent, async (req, res) => {
  try {
    const { youthId } = req.params;
    const { name, relationship, phone, email, isPrimary, notes } = req.body;
    const parentId = req.session.parentId;

    const link = await verifyParentYouthLink(parentId, youthId);
    if (!link || !link.verifiedAt) {
      return res.status(403).json({ error: 'Not authorized or link not verified' });
    }

    if (!name || !relationship || !phone) {
      return res.status(400).json({ error: 'Name, relationship, and phone are required' });
    }

    if (isPrimary) {
      await db
        .update(emergencyContacts)
        .set({ isPrimary: false })
        .where(eq(emergencyContacts.userId, youthId));
    }

    const [newContact] = await db
      .insert(emergencyContacts)
      .values({
        userId: youthId,
        name,
        relationship,
        phone,
        email,
        isPrimary: !!isPrimary,
        notes,
      })
      .returning();

    res.json({ success: true, contact: newContact });
  } catch (error) {
    console.error('Error adding emergency contact:', error);
    res.status(500).json({ error: 'Failed to add emergency contact' });
  }
});

router.put('/emergency-contacts/:id', requireParent, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, relationship, phone, email, isPrimary, notes } = req.body;
    const parentId = req.session.parentId;

    const [contact] = await db
      .select()
      .from(emergencyContacts)
      .where(eq(emergencyContacts.id, id))
      .limit(1);

    if (!contact) {
      return res.status(404).json({ error: 'Emergency contact not found' });
    }

    const link = await verifyParentYouthLink(parentId, contact.userId);
    if (!link || !link.verifiedAt) {
      return res.status(403).json({ error: 'Not authorized or link not verified' });
    }

    if (isPrimary) {
      await db
        .update(emergencyContacts)
        .set({ isPrimary: false })
        .where(eq(emergencyContacts.userId, contact.userId));
    }

    const [updatedContact] = await db
      .update(emergencyContacts)
      .set({
        name,
        relationship,
        phone,
        email,
        isPrimary: !!isPrimary,
        notes,
        updatedAt: new Date(),
      })
      .where(eq(emergencyContacts.id, id))
      .returning();

    res.json({ success: true, contact: updatedContact });
  } catch (error) {
    console.error('Error updating emergency contact:', error);
    res.status(500).json({ error: 'Failed to update emergency contact' });
  }
});

router.delete('/emergency-contacts/:id', requireParent, async (req, res) => {
  try {
    const { id } = req.params;
    const parentId = req.session.parentId;

    const [contact] = await db
      .select()
      .from(emergencyContacts)
      .where(eq(emergencyContacts.id, id))
      .limit(1);

    if (!contact) {
      return res.status(404).json({ error: 'Emergency contact not found' });
    }

    const link = await verifyParentYouthLink(parentId, contact.userId);
    if (!link || !link.verifiedAt) {
      return res.status(403).json({ error: 'Not authorized or link not verified' });
    }

    await db.delete(emergencyContacts).where(eq(emergencyContacts.id, id));

    res.json({ success: true, message: 'Emergency contact removed' });
  } catch (error) {
    console.error('Error deleting emergency contact:', error);
    res.status(500).json({ error: 'Failed to delete emergency contact' });
  }
});

router.get('/consent-history/:youthId', requireParent, async (req, res) => {
  try {
    const { youthId } = req.params;
    const parentId = req.session.parentId;

    const link = await verifyParentYouthLink(parentId, youthId);
    if (!link || !link.verifiedAt) {
      return res.status(403).json({ error: 'Not authorized or link not verified' });
    }

    const history = await db
      .select()
      .from(consentEvents)
      .where(eq(consentEvents.userId, youthId))
      .orderBy(desc(consentEvents.occurredAt));

    res.json({ success: true, history });
  } catch (error) {
    console.error('Error fetching consent history:', error);
    res.status(500).json({ error: 'Failed to fetch consent history' });
  }
});

router.get('/activity-summary/:youthId', requireParent, async (req, res) => {
  try {
    const { youthId } = req.params;
    const parentId = req.session.parentId;

    const link = await verifyParentYouthLink(parentId, youthId);
    if (!link || !link.verifiedAt) {
      return res.status(403).json({ error: 'Not authorized or link not verified' });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const checkinSummary = await db
      .select({
        count: sql`count(*)::int`,
        avgMood: sql`avg(${checkins.moodLevel16})::float`,
      })
      .from(checkins)
      .where(
        and(
          eq(checkins.userId, youthId),
          sql`${checkins.timestamp} >= ${thirtyDaysAgo}`
        )
      );

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

    let attendanceCount = 0;
    if (userXid) {
      const result = await db
        .select({ count: sql`count(*)::int` })
        .from(attendance)
        .where(
          and(
            eq(attendance.xidId, userXid.id),
            sql`${attendance.timestamp} >= ${thirtyDaysAgo}`
          )
        );
      attendanceCount = result[0]?.count || 0;
    }

    res.json({
      success: true,
      summary: {
        last30Days: {
          checkins: checkinSummary[0]?.count || 0,
          averageMood: checkinSummary[0]?.avgMood ? Math.round(checkinSummary[0].avgMood * 10) / 10 : null,
          attendance: attendanceCount,
        }
      }
    });
  } catch (error) {
    console.error('Error fetching activity summary:', error);
    res.status(500).json({ error: 'Failed to fetch activity summary' });
  }
});

router.post('/data/delete/:youthId', requireParent, async (req, res) => {
  try {
    const { youthId } = req.params;
    const { reason } = req.body;
    const parentId = req.session.parentId;

    const link = await verifyParentYouthLink(parentId, youthId);
    if (!link) {
      return res.status(403).json({ error: 'Not authorized to request deletion for this youth' });
    }

    if (!link.verifiedAt) {
      return res.status(403).json({ error: 'Your link has not been verified' });
    }

    const [profile] = await db
      .select({
        firstName: profiles.firstName,
        preferredName: profiles.preferredName,
      })
      .from(profiles)
      .where(eq(profiles.userId, youthId))
      .limit(1);

    await db.insert(consentEvents).values({
      userId: youthId,
      eventType: 'deletion_requested',
      eventData: {
        requestedBy: parentId,
        reason: reason || 'Parent requested permanent deletion',
        youthName: profile?.preferredName || profile?.firstName || 'Unknown',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'pending_admin_review',
      },
      occurredAt: new Date(),
    });

    console.info(`[Parent Portal] DATA DELETION REQUEST: Youth ${youthId} (${profile?.preferredName || profile?.firstName}) - Requested by parent ${parentId}`);
    console.info(`[Parent Portal] Reason: ${reason || 'No reason provided'}`);
    console.info(`[Parent Portal] ** ADMIN ACTION REQUIRED ** - Review and process deletion request`);

    res.json({
      success: true,
      message: 'Your deletion request has been submitted. An administrator will review and process your request within 30 days, as required by privacy law. You will be notified when the deletion is complete.',
      requestId: `DEL-${Date.now()}`,
    });
  } catch (error) {
    console.error('Error requesting data deletion:', error);
    res.status(500).json({ error: 'Failed to submit deletion request' });
  }
});

export default router;
