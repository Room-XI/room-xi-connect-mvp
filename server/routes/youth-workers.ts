import express from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "../db.js";
import * as schema from "../schema.ts";
import * as schemaExtensions from "../schema-extensions.ts";
import { eq, and, desc, sql } from "drizzle-orm";
import logger from "../logger.ts";
import { validateCsrfToken, generateCsrfToken } from "../middleware/security.ts";
import { encryptHealthData, decryptHealthData } from "../lib/encryption.ts";
import { Parser } from "@json2csv/plainjs";
import { DateTime } from "luxon";
import { requireRole, requireOrgScope } from "../middleware/permissions.ts";

const router = express.Router();

router.get("/csrf-token", (req, res) => {
  const token = generateCsrfToken(req as any);
  res.json({ csrfToken: token });
});

// Youth Worker Login
router.post("/login", async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const worker = await db.query.youthWorkers?.findFirst({
      where: eq(schemaExtensions.youthWorkers.email, email.toLowerCase()),
    });

    if (!worker) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, worker.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!worker.active) {
      return res.status(403).json({ error: "Account is deactivated" });
    }

    // Get organization info
    const org = await db.query.organizations?.findFirst({
      where: eq(schema.organizations.id, worker.organizationId),
    });

    const existingCsrfToken = (req.session as any)?.csrfToken || null;
    req.session.regenerate((err) => {
      if (err) {
        return next(err);
      }

      req.session.youthWorkerId = worker.id;
      req.session.organizationId = worker.organizationId;
      req.session.isYouthWorkerSession = true;
      req.session.youthWorkerRole = worker.role;

      if (existingCsrfToken) {
        (req.session as any).csrfToken = existingCsrfToken;
      } else {
        generateCsrfToken(req as any);
      }

      res.status(200).json({
        id: worker.id,
        email: worker.email,
        firstName: worker.firstName,
        lastName: worker.lastName,
        role: worker.role,
        organization: org ? { id: org.id, name: org.name } : null,
      });
    });
  } catch (error) {
    logger.error({ error, context: "youth-workers" }, "Login error");
    next(error);
  }
});

// Youth Worker Logout
router.post("/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }
    res.clearCookie("worker.sid");
    res.status(200).json({ message: "Logged out successfully" });
  });
});

// Get current youth worker session
router.get("/me", (req, res) => {
  if (req.session && req.session.youthWorkerId) {
    return res.status(200).json({
      youthWorkerId: req.session.youthWorkerId,
      organizationId: req.session.organizationId,
      role: req.session.youthWorkerRole,
    });
  }
  res.status(401).json({ error: "Not authenticated" });
});

const requireYouthWorkerAuth = requireRole('youth_worker');

// Get assigned youth list
router.get("/my-youth", requireYouthWorkerAuth, requireOrgScope(), async (req, res, next) => {
  const youthWorkerId = req.session.youthWorkerId!;
  const sessionOrgId = req.session.organizationId as string;

  logger.info({ 
    youthWorkerId, 
    action: "my_youth_list_access", 
    context: "youth-workers" 
  }, "Youth worker accessing assigned youth list");

  try {
    // Cross-org filter (C11/M3): only surface assignments pinned to the
    // worker's CURRENT org. A worker who moved orgs immediately drops
    // their pre-move list.
    const assignments = await db
      .select({
        id: schemaExtensions.youthWorkerAssignments.id,
        youthId: schemaExtensions.youthWorkerAssignments.youthId,
        consentStatus: schemaExtensions.youthWorkerAssignments.consentStatus,
        consentLevel: schemaExtensions.youthWorkerAssignments.consentLevel,
        requestedAt: schemaExtensions.youthWorkerAssignments.requestedAt,
        respondedAt: schemaExtensions.youthWorkerAssignments.respondedAt,
      })
      .from(schemaExtensions.youthWorkerAssignments)
      .where(and(
        eq(schemaExtensions.youthWorkerAssignments.youthWorkerId, youthWorkerId),
        eq(schemaExtensions.youthWorkerAssignments.organizationId, sessionOrgId),
      ));

    // Get youth profiles for granted assignments
    const grantedAssignments = assignments.filter(a => a.consentStatus === "granted");
    const youthProfiles: any[] = [];

    for (const assignment of grantedAssignments) {
      const profile = await db.query.profiles?.findFirst({
        where: eq(schema.profiles.userId, assignment.youthId),
        columns: {
          preferredName: true,
          firstName: true,
        }
      });
      const displayName = profile?.preferredName || profile?.firstName || "Youth";
      youthProfiles.push({
        ...assignment,
        profile: { displayName },
      });
    }

    res.status(200).json({
      granted: youthProfiles,
      pending: assignments.filter(a => a.consentStatus === "pending"),
    });
  } catch (error) {
    logger.error({ error, context: "youth-workers" }, "Error fetching assigned youth");
    next(error);
  }
});

// Request assignment to a youth
router.post("/assign", requireYouthWorkerAuth, requireOrgScope(), validateCsrfToken, async (req, res, next) => {
  const { youthEmail } = req.body;
  const youthWorkerId = req.session.youthWorkerId!;
  // requireOrgScope() guarantees this is set; cast once for both the
  // existing-check WHERE clause and the INSERT below.
  const organizationId = req.session.organizationId as string;

  logger.info({ 
    youthWorkerId, 
    action: "assignment_request_attempt", 
    targetEmail: youthEmail ? "[REDACTED]" : null,
    context: "youth-workers" 
  }, "Youth worker attempting to request assignment");

  if (!youthEmail) {
    return res.status(400).json({ error: "youthEmail is required" });
  }

  try {
    // Find youth by email
    const youth = await db.query.users?.findFirst({
      where: eq(schema.users.email, youthEmail.toLowerCase()),
    });

    if (!youth) {
      logger.info({ 
        youthWorkerId, 
        action: "assignment_request_failed", 
        reason: "youth_not_found",
        context: "youth-workers" 
      }, "Assignment request failed: youth not found");
      return res.status(404).json({ error: "Youth not found" });
    }

    // Check if assignment already exists IN THIS ORG. Cross-org filter
    // (C11/M3): a worker who previously held an OrgB assignment for the
    // same youth must still be able to create a fresh OrgA assignment
    // when they move orgs. Only same-org duplicates are blocked here.
    const [existing] = await db
      .select()
      .from(schemaExtensions.youthWorkerAssignments)
      .where(and(
        eq(schemaExtensions.youthWorkerAssignments.youthWorkerId, youthWorkerId),
        eq(schemaExtensions.youthWorkerAssignments.youthId, youth.id),
        eq(schemaExtensions.youthWorkerAssignments.organizationId, organizationId),
      ))
      .limit(1);

    if (existing) {
      logger.info({ 
        youthWorkerId, 
        youthId: youth.id,
        action: "assignment_request_duplicate", 
        existingStatus: existing.consentStatus,
        context: "youth-workers" 
      }, "Assignment request rejected: already exists");
      return res.status(409).json({ error: "Assignment request already exists", status: existing.consentStatus });
    }

    // Create assignment request — pin org_id from the session so
    // cross-org tightening (C11/M3) works: an assignment is bound to
    // the org the worker held when it was granted, not the worker's
    // current org if they later move.
    const [assignment] = await db.insert(schemaExtensions.youthWorkerAssignments).values({
      youthWorkerId: youthWorkerId,
      youthId: youth.id,
      organizationId,
      consentStatus: "pending",
    }).returning();

    logger.info({ 
      youthWorkerId, 
      youthId: youth.id, 
      action: "assignment_request_created",
      context: "youth-workers" 
    }, "Created youth worker assignment request");

    res.status(201).json({ message: "Assignment request sent", id: assignment.id });
  } catch (error) {
    logger.error({ error, context: "youth-workers" }, "Error creating assignment");
    next(error);
  }
});

// Get youth dashboard data (for granted assignments only)
router.get("/youth/:youthId/dashboard", requireYouthWorkerAuth, requireOrgScope(), async (req, res, next) => {
  const { youthId } = req.params;
  const youthWorkerId = req.session.youthWorkerId!;
  const sessionOrgId = req.session.organizationId as string;

  try {
    // Verify consent BEFORE any data access. Cross-org filter (C11/M3):
    // the assignment must have been granted while the worker was in
    // *this* session's org, not just any org the worker has ever been in.
    const [assignment] = await db
      .select()
      .from(schemaExtensions.youthWorkerAssignments)
      .where(and(
        eq(schemaExtensions.youthWorkerAssignments.youthWorkerId, youthWorkerId),
        eq(schemaExtensions.youthWorkerAssignments.youthId, youthId),
        eq(schemaExtensions.youthWorkerAssignments.organizationId, sessionOrgId),
        eq(schemaExtensions.youthWorkerAssignments.consentStatus, "granted")
      ))
      .limit(1);

    if (!assignment) {
      logger.info({ 
        youthWorkerId, 
        youthId, 
        action: "dashboard_access_denied", 
        reason: "no_consent", 
        context: "youth-workers" 
      }, "Blocked dashboard access attempt");
      return res.status(403).json({ error: "Access denied" });
    }

    const consentLevel = assignment.consentLevel as any || {};

    // Build dashboard based on consent level
    const dashboard: any = {
      consentStatus: assignment.consentStatus,
      consentLevel: consentLevel,
    };
    const deniedScopes: string[] = [];

    // Mood timeline (if consented) - verify share_mood_timeline flag
    if (consentLevel.share_mood_timeline !== false) {
      const recentCheckins = await db.query.checkins?.findMany({
        where: eq(schema.checkins.userId, youthId),
        orderBy: [desc(schema.checkins.timestamp)],
        limit: 30,
        columns: {
          moodType: true,
          moodLevel16: true,
          timestamp: true,
        }
      });
      dashboard.moodTimeline = recentCheckins;
    } else {
      deniedScopes.push("share_mood_timeline");
    }

    // Program engagement (if consented) - verify share_program_engagement flag
    if (consentLevel.share_program_engagement !== false) {
      const recentCheckinsCount = await db.query.checkins?.findMany({
        where: eq(schema.checkins.userId, youthId),
        limit: 30,
      });
      dashboard.programAttendance = recentCheckinsCount?.length || 0;
    } else {
      deniedScopes.push("share_program_engagement");
    }

    // Check-in streak (if consented) - verify share_checkin_streak flag
    if (consentLevel.share_checkin_streak !== false) {
      const profile = await db.query.profiles?.findFirst({
        where: eq(schema.profiles.userId, youthId),
        columns: { streakCount: true }
      });
      dashboard.currentStreak = profile?.streakCount || 0;
    } else {
      deniedScopes.push("share_checkin_streak");
    }

    // Audit log for any denied scopes
    if (deniedScopes.length > 0) {
      logger.info({
        youthWorkerId,
        youthId,
        action: "dashboard_partial_access",
        deniedScopes,
        context: "youth-workers",
      }, "Dashboard access partially restricted due to consent levels");
    }

    res.status(200).json(dashboard);
  } catch (error) {
    logger.error({ error, youthId, context: "youth-workers" }, "Error fetching youth dashboard");
    next(error);
  }
});

// Get youth profile data (for granted assignments only)
router.get("/youth/:youthId", requireYouthWorkerAuth, requireOrgScope(), async (req, res, next) => {
  const { youthId } = req.params;
  const youthWorkerId = req.session.youthWorkerId!;
  const sessionOrgId = req.session.organizationId as string;

  try {
    // MUST verify consent BEFORE any data access. Cross-org filter (C11/M3).
    const [assignment] = await db
      .select()
      .from(schemaExtensions.youthWorkerAssignments)
      .where(and(
        eq(schemaExtensions.youthWorkerAssignments.youthWorkerId, youthWorkerId),
        eq(schemaExtensions.youthWorkerAssignments.youthId, youthId),
        eq(schemaExtensions.youthWorkerAssignments.organizationId, sessionOrgId),
        eq(schemaExtensions.youthWorkerAssignments.consentStatus, "granted")
      ))
      .limit(1);

    if (!assignment) {
      logger.info({ 
        youthWorkerId, 
        youthId, 
        action: "profile_access_denied", 
        reason: "no_consent", 
        context: "youth-workers" 
      }, "Blocked access attempt");
      return res.status(403).json({ error: "Access denied" });
    }

    const consentLevel = assignment.consentLevel as any || {};
    const profileData: any = {};
    const deniedScopes: string[] = [];

    // Get basic profile info (always available for granted assignments)
    const profile = await db.query.profiles?.findFirst({
      where: eq(schema.profiles.userId, youthId),
      columns: {
        preferredName: true,
        firstName: true,
        city: true,
        createdAt: true,
      }
    });

    profileData.displayName = profile?.preferredName || profile?.firstName || "Youth";
    profileData.city = profile?.city;
    profileData.memberSince = profile?.createdAt;
    profileData.consentStatus = assignment.consentStatus;
    profileData.consentLevel = consentLevel;

    // Mood timeline data (if consented)
    if (consentLevel.share_mood_timeline !== false) {
      const recentCheckins = await db.query.checkins?.findMany({
        where: eq(schema.checkins.userId, youthId),
        orderBy: [desc(schema.checkins.timestamp)],
        limit: 7,
        columns: {
          moodType: true,
          moodLevel16: true,
          timestamp: true,
        }
      });
      profileData.recentMoods = recentCheckins;
    } else {
      deniedScopes.push("share_mood_timeline");
    }

    // Program engagement data (if consented)
    if (consentLevel.share_program_engagement !== false) {
      const totalCheckins = await db.query.checkins?.findMany({
        where: eq(schema.checkins.userId, youthId),
      });
      profileData.totalCheckIns = totalCheckins?.length || 0;
    } else {
      deniedScopes.push("share_program_engagement");
    }

    // Check-in streak (if consented)
    if (consentLevel.share_checkin_streak !== false) {
      const streakProfile = await db.query.profiles?.findFirst({
        where: eq(schema.profiles.userId, youthId),
        columns: { streakCount: true, lastCheckinDate: true }
      });
      profileData.currentStreak = streakProfile?.streakCount || 0;
      profileData.lastCheckinDate = streakProfile?.lastCheckinDate;
    } else {
      deniedScopes.push("share_checkin_streak");
    }

    // Audit log for denied scopes
    if (deniedScopes.length > 0) {
      logger.info({
        youthWorkerId,
        youthId,
        action: "profile_partial_access",
        deniedScopes,
        context: "youth-workers",
      }, "Profile access partially restricted due to consent levels");
    }

    res.status(200).json(profileData);
  } catch (error) {
    logger.error({ error, youthId, context: "youth-workers" }, "Error fetching youth profile");
    next(error);
  }
});

// Get youth mood history (for sparkline chart, requires share_mood_timeline consent)
router.get("/youth/:youthId/mood-history", requireYouthWorkerAuth, requireOrgScope(), async (req, res, next) => {
  const { youthId } = req.params;
  const youthWorkerId = req.session.youthWorkerId!;
  const sessionOrgId = req.session.organizationId as string;

  try {
    // MUST verify consent BEFORE any data access. Cross-org filter (C11/M3).
    const [assignment] = await db
      .select()
      .from(schemaExtensions.youthWorkerAssignments)
      .where(and(
        eq(schemaExtensions.youthWorkerAssignments.youthWorkerId, youthWorkerId),
        eq(schemaExtensions.youthWorkerAssignments.youthId, youthId),
        eq(schemaExtensions.youthWorkerAssignments.organizationId, sessionOrgId),
        eq(schemaExtensions.youthWorkerAssignments.consentStatus, "granted")
      ))
      .limit(1);

    if (!assignment) {
      logger.info({ 
        youthWorkerId, 
        youthId, 
        action: "mood_history_access_denied", 
        reason: "no_consent", 
        context: "youth-workers" 
      }, "Blocked mood history access attempt");
      return res.status(403).json({ error: "Access denied" });
    }

    const consentLevel = assignment.consentLevel as any || {};

    // Verify explicit consent for mood timeline
    if (consentLevel.share_mood_timeline === false) {
      logger.info({ 
        youthWorkerId, 
        youthId, 
        action: "mood_history_access_denied", 
        reason: "mood_timeline_not_consented", 
        context: "youth-workers" 
      }, "Blocked mood history access: youth has not consented to mood timeline sharing");
      return res.status(403).json({ error: "Access denied" });
    }

    // Fetch mood history for sparkline (last 30 days)
    const moodHistory = await db.query.checkins?.findMany({
      where: eq(schema.checkins.userId, youthId),
      orderBy: [desc(schema.checkins.timestamp)],
      limit: 30,
      columns: {
        moodType: true,
        moodLevel16: true,
        timestamp: true,
        checkinDate: true,
      }
    });

    res.status(200).json({ moodHistory: moodHistory || [] });
  } catch (error) {
    logger.error({ error, youthId, context: "youth-workers" }, "Error fetching youth mood history");
    next(error);
  }
});

router.get("/profile", requireYouthWorkerAuth, async (req, res, next) => {
  try {
    const youthWorkerId = req.session.youthWorkerId as string;
    const worker = await db.query.youthWorkers?.findFirst({
      where: eq(schemaExtensions.youthWorkers.id, youthWorkerId),
    });
    if (!worker) return res.status(404).json({ error: "Worker not found" });

    const org = await db.query.organizations?.findFirst({
      where: eq(schema.organizations.id, worker.organizationId),
    });

    res.status(200).json({
      worker: {
        id: worker.id,
        email: worker.email,
        firstName: worker.firstName,
        lastName: worker.lastName,
        role: worker.role,
        active: worker.active,
        createdAt: worker.createdAt,
      },
      organization: org ? { id: org.id, name: org.name, type: org.type } : null,
    });
  } catch (error) {
    logger.error({ error, context: "youth-workers-profile" }, "Error fetching worker profile");
    next(error);
  }
});

router.post("/change-password", requireYouthWorkerAuth, validateCsrfToken, async (req, res, next) => {
  try {
    const youthWorkerId = req.session.youthWorkerId as string;
    const { currentPassword, newPassword } = req.body || {};

    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      return res.status(400).json({ error: "currentPassword and newPassword are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const worker = await db.query.youthWorkers?.findFirst({
      where: eq(schemaExtensions.youthWorkers.id, youthWorkerId),
    });
    if (!worker) return res.status(404).json({ error: "Worker not found" });

    const ok = await bcrypt.compare(currentPassword, worker.passwordHash);
    if (!ok) return res.status(401).json({ error: "Current password is incorrect" });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db
      .update(schemaExtensions.youthWorkers)
      .set({ passwordHash })
      .where(eq(schemaExtensions.youthWorkers.id, youthWorkerId));

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error({ error, context: "youth-workers-change-password" }, "Error changing password");
    next(error);
  }
});

// ============================================================
// CASE NOTES & REPORTS ROUTES
// ============================================================

function getTimeRangeStartDate(timeRange: string): Date | null {
  const now = new Date();
  if (timeRange === '7days') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (timeRange === '30days') {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return null;
}

router.get("/case-notes/summary", requireYouthWorkerAuth, requireOrgScope(), async (req, res, next) => {
  const orgId = req.session.organizationId as string;
  const youthWorkerId = req.session.youthWorkerId!;
  const timeRange = (req.query.timeRange as string) || 'all';
  const youthId = req.query.youthId as string | undefined;

  try {
    // BOLA hardening: when the caller scopes to a single youth, that
    // youth must be on this worker's active+granted assignment list.
    // Org binding is enforced THREE ways: (1) requireOrgScope() guarantees
    // the worker has a valid org session, (2) the assignment lookup is
    // pinned to (worker, youth, organizationId = sessionOrgId) so an
    // assignment created while the worker was in a different org cannot
    // re-authorize them after a move (C11/M3), and (3) the case_notes
    // query below also filters by org_id.
    if (youthId) {
      const [assignment] = await db
        .select({ id: schemaExtensions.youthWorkerAssignments.id })
        .from(schemaExtensions.youthWorkerAssignments)
        .where(and(
          eq(schemaExtensions.youthWorkerAssignments.youthWorkerId, youthWorkerId),
          eq(schemaExtensions.youthWorkerAssignments.youthId, youthId),
          eq(schemaExtensions.youthWorkerAssignments.organizationId, orgId),
          eq(schemaExtensions.youthWorkerAssignments.consentStatus, "granted"),
        ))
        .limit(1);
      if (!assignment) {
        logger.info({
          youthWorkerId, youthId, orgId,
          action: "case_notes_summary_denied",
          reason: "no_assignment_or_consent",
          context: "youth-workers",
        }, "Blocked case notes summary access");
        return res.status(403).json({ error: "No granted assignment for this youth" });
      }
    }

    const startDate = getTimeRangeStartDate(timeRange);

    let query = sql`SELECT id, youth_id, category, created_at FROM case_notes WHERE org_id = ${orgId}`;
    if (youthId) {
      query = sql`${query} AND youth_id = ${youthId}`;
    }
    if (startDate) {
      query = sql`${query} AND created_at >= ${startDate.toISOString()}`;
    }

    const result = await db.execute(query);
    const rows = result.rows || [];

    const youthIds = new Set<string>();
    const byCategory: Record<string, number> = {};

    for (const row of rows) {
      youthIds.add(row.youth_id as string);
      const cat = (row.category as string) || 'general';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }

    logger.info({
      action: "case_notes_summary",
      orgId,
      timeRange,
      youthId: youthId || null,
      totalNotes: rows.length,
      context: "youth-workers",
    }, "Case notes summary accessed");

    res.status(200).json({
      totalNotes: rows.length,
      youthCount: youthIds.size,
      byCategory,
    });
  } catch (error) {
    logger.error({ error, context: "youth-workers" }, "Error fetching case notes summary");
    next(error);
  }
});

router.get("/case-notes/export", requireYouthWorkerAuth, requireOrgScope(), async (req, res, next) => {
  const orgId = req.session.organizationId as string;
  const youthWorkerId = req.session.youthWorkerId!;
  const timeRange = (req.query.timeRange as string) || 'all';
  const youthId = req.query.youthId as string | undefined;

  try {
    // BOLA hardening (matches /case-notes/summary and /case-notes GET).
    // Single-youth export must prove the requesting worker actually
    // holds a granted assignment for that youth IN THIS ORG (C11/M3).
    // Without this any worker in the org could decrypt another worker's
    // notes by passing ?youthId=, and a worker who moved orgs could
    // use a stale assignment to export the new org's notes.
    if (youthId) {
      const [assignment] = await db
        .select({ id: schemaExtensions.youthWorkerAssignments.id })
        .from(schemaExtensions.youthWorkerAssignments)
        .where(and(
          eq(schemaExtensions.youthWorkerAssignments.youthWorkerId, youthWorkerId),
          eq(schemaExtensions.youthWorkerAssignments.youthId, youthId),
          eq(schemaExtensions.youthWorkerAssignments.organizationId, orgId),
          eq(schemaExtensions.youthWorkerAssignments.consentStatus, "granted"),
        ))
        .limit(1);
      if (!assignment) {
        logger.info({
          youthWorkerId, youthId, orgId,
          action: "case_notes_export_denied",
          reason: "no_assignment_or_consent",
          context: "youth-workers",
        }, "Blocked case notes export");
        return res.status(403).json({ error: "No granted assignment for this youth" });
      }
    }

    const startDate = getTimeRangeStartDate(timeRange);

    let query = sql`SELECT id, youth_id, author_user_id, note_encrypted, category, tags, created_at FROM case_notes WHERE org_id = ${orgId}`;
    if (youthId) {
      query = sql`${query} AND youth_id = ${youthId}`;
    }
    if (startDate) {
      query = sql`${query} AND created_at >= ${startDate.toISOString()}`;
    }
    query = sql`${query} ORDER BY created_at DESC`;

    const result = await db.execute(query);
    const rows = result.rows || [];

    const csvLines: string[] = ['id,youth_id,category,tags,note,created_at'];
    for (const row of rows) {
      const encVal = row.note_encrypted;
      const encStr = typeof encVal === 'string' ? encVal : JSON.stringify(encVal);
      const decrypted = decryptHealthData(encStr) || '';
      const escapedNote = `"${decrypted.replace(/"/g, '""')}"`;
      const tagsVal = Array.isArray(row.tags) ? (row.tags as string[]).join(';') : '';
      csvLines.push(
        `${row.id},${row.youth_id},${row.category || 'general'},"${tagsVal}",${escapedNote},${row.created_at}`
      );
    }

    logger.info({
      action: "case_notes_export",
      orgId,
      timeRange,
      youthId: youthId || null,
      rowCount: rows.length,
      context: "youth-workers",
    }, "Case notes exported");

    res.status(200).json({ csv: csvLines.join('\n') });
  } catch (error) {
    logger.error({ error, context: "youth-workers" }, "Error exporting case notes");
    next(error);
  }
});

router.get("/case-notes", requireYouthWorkerAuth, requireOrgScope(), async (req, res, next) => {
  const youthId = req.query.youthId as string;
  const youthWorkerId = req.session.youthWorkerId!;
  const orgId = req.session.organizationId as string;

  if (!youthId) {
    return res.status(400).json({ error: "youthId query parameter is required" });
  }

  try {
    // Cross-org filter (C11/M3): assignment must be pinned to this
    // session's org, not just any org the worker has ever been in.
    const [assignment] = await db
      .select()
      .from(schemaExtensions.youthWorkerAssignments)
      .where(and(
        eq(schemaExtensions.youthWorkerAssignments.youthWorkerId, youthWorkerId),
        eq(schemaExtensions.youthWorkerAssignments.youthId, youthId),
        eq(schemaExtensions.youthWorkerAssignments.organizationId, orgId),
        eq(schemaExtensions.youthWorkerAssignments.consentStatus, "granted")
      ))
      .limit(1);

    if (!assignment) {
      logger.info({
        youthWorkerId,
        youthId,
        action: "case_notes_access_denied",
        reason: "no_consent",
        context: "youth-workers",
      }, "Blocked case notes access attempt");
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await db.execute(
      sql`SELECT id, youth_id, author_user_id, note_encrypted, category, tags, created_at
          FROM case_notes
          WHERE youth_id = ${youthId} AND org_id = ${orgId}
          ORDER BY created_at DESC`
    );

    const notes = (result.rows || []).map((row: any) => {
      const encVal = row.note_encrypted;
      const encStr = typeof encVal === 'string' ? encVal : JSON.stringify(encVal);
      const decrypted = decryptHealthData(encStr);
      return {
        id: row.id,
        note: decrypted || '',
        category: row.category || 'general',
        tags: row.tags || [],
        createdAt: row.created_at,
      };
    });

    logger.info({
      youthWorkerId,
      youthId,
      action: "case_notes_accessed",
      noteCount: notes.length,
      context: "youth-workers",
    }, "Case notes accessed");

    res.status(200).json(notes);
  } catch (error) {
    logger.error({ error, context: "youth-workers" }, "Error fetching case notes");
    next(error);
  }
});

router.post("/case-notes", requireYouthWorkerAuth, requireOrgScope(), validateCsrfToken, async (req, res, next) => {
  const { youthId, note, category, tags } = req.body || {};
  const youthWorkerId = req.session.youthWorkerId!;
  const orgId = req.session.organizationId as string;

  if (!youthId || !note) {
    return res.status(400).json({ error: "youthId and note are required" });
  }

  try {
    // Cross-org filter (C11/M3): same as /case-notes GET — assignment
    // must be pinned to this session's org.
    const [assignment] = await db
      .select()
      .from(schemaExtensions.youthWorkerAssignments)
      .where(and(
        eq(schemaExtensions.youthWorkerAssignments.youthWorkerId, youthWorkerId),
        eq(schemaExtensions.youthWorkerAssignments.youthId, youthId),
        eq(schemaExtensions.youthWorkerAssignments.organizationId, orgId),
        eq(schemaExtensions.youthWorkerAssignments.consentStatus, "granted")
      ))
      .limit(1);

    if (!assignment) {
      logger.info({
        youthWorkerId,
        youthId,
        action: "case_note_create_denied",
        reason: "no_consent",
        context: "youth-workers",
      }, "Blocked case note creation attempt");
      return res.status(403).json({ error: "Access denied" });
    }

    const noteId = crypto.randomUUID();
    const encrypted = encryptHealthData(note);
    const noteCategory = category || 'general';
    const noteTags: string[] = Array.isArray(tags) ? tags : [];

    const tagsArray = noteTags.length > 0
      ? sql.raw(`ARRAY[${noteTags.map(t => `'${t.replace(/'/g, "''")}'`).join(',')}]::text[]`)
      : sql`'{}'::text[]`;

    await db.execute(sql`
      INSERT INTO case_notes (id, org_id, youth_id, author_user_id, note_encrypted, category, tags)
      VALUES (${noteId}, ${orgId}, ${youthId}, ${youthWorkerId}, ${JSON.stringify(encrypted)}::jsonb, ${noteCategory}, ${tagsArray})
    `);

    logger.info({
      youthWorkerId,
      youthId,
      noteId,
      action: "case_note_created",
      category: noteCategory,
      context: "youth-workers",
    }, "Case note created");

    res.status(201).json({
      id: noteId,
      note,
      category: noteCategory,
      tags: noteTags,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error, context: "youth-workers" }, "Error creating case note");
    next(error);
  }
});

// ============================================================
// CONSENT REQUESTS ROUTES
// ============================================================

router.get("/consent-requests", requireYouthWorkerAuth, requireOrgScope(), async (req, res, next) => {
  const youthWorkerId = req.session.youthWorkerId!;
  const sessionOrgId = req.session.organizationId as string;

  try {
    // Cross-org filter (C11/M3): only surface consent requests pinned
    // to the worker's CURRENT org so a post-move worker can't see or
    // act on assignments from their previous org.
    const assignments = await db
      .select({
        id: schemaExtensions.youthWorkerAssignments.id,
        youthId: schemaExtensions.youthWorkerAssignments.youthId,
        consentStatus: schemaExtensions.youthWorkerAssignments.consentStatus,
        consentLevel: schemaExtensions.youthWorkerAssignments.consentLevel,
        requestedAt: schemaExtensions.youthWorkerAssignments.requestedAt,
        respondedAt: schemaExtensions.youthWorkerAssignments.respondedAt,
      })
      .from(schemaExtensions.youthWorkerAssignments)
      .where(and(
        eq(schemaExtensions.youthWorkerAssignments.youthWorkerId, youthWorkerId),
        eq(schemaExtensions.youthWorkerAssignments.organizationId, sessionOrgId),
      ))
      .orderBy(desc(schemaExtensions.youthWorkerAssignments.requestedAt));

    const requests: any[] = [];

    for (const assignment of assignments) {
      const profile = await db.query.profiles?.findFirst({
        where: eq(schema.profiles.userId, assignment.youthId),
        columns: {
          preferredName: true,
          firstName: true,
        }
      });
      const displayName = assignment.consentStatus === "granted"
        ? (profile?.preferredName || profile?.firstName || "Youth")
        : `Youth-${assignment.youthId.slice(0, 6)}`;

      requests.push({
        ...assignment,
        displayName,
      });
    }

    logger.info({
      youthWorkerId,
      action: "consent_requests_list",
      count: requests.length,
      context: "youth-workers",
    }, "Consent requests list accessed");

    res.status(200).json(requests);
  } catch (error) {
    logger.error({ error, context: "youth-workers" }, "Error fetching consent requests");
    next(error);
  }
});

router.post("/consent-requests", requireYouthWorkerAuth, requireOrgScope(), validateCsrfToken, async (req, res, next) => {
  const { youthId, requestedScopes } = req.body || {};
  const youthWorkerId = req.session.youthWorkerId!;
  const sessionOrgId = req.session.organizationId as string;

  if (!youthId) {
    return res.status(400).json({ error: "youthId is required" });
  }

  try {
    // Cross-org filter (C11/M3): the assignment we're flipping back to
    // 'pending' must be the one pinned to the worker's CURRENT org.
    const [existing] = await db
      .select()
      .from(schemaExtensions.youthWorkerAssignments)
      .where(and(
        eq(schemaExtensions.youthWorkerAssignments.youthWorkerId, youthWorkerId),
        eq(schemaExtensions.youthWorkerAssignments.youthId, youthId),
        eq(schemaExtensions.youthWorkerAssignments.organizationId, sessionOrgId),
      ))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "No assignment found for this youth" });
    }

    if (existing.consentStatus === "pending") {
      return res.status(409).json({ error: "A consent request is already pending", status: "pending" });
    }

    await db
      .update(schemaExtensions.youthWorkerAssignments)
      .set({
        consentStatus: "pending",
        requestedAt: new Date(),
        respondedAt: null,
      })
      .where(eq(schemaExtensions.youthWorkerAssignments.id, existing.id));

    logger.info({
      youthWorkerId,
      youthId,
      action: "consent_request_created",
      requestedScopes: requestedScopes || "all",
      context: "youth-workers",
    }, "New consent request created for additional access");

    res.status(201).json({ message: "Consent request sent", status: "pending" });
  } catch (error) {
    logger.error({ error, context: "youth-workers" }, "Error creating consent request");
    next(error);
  }
});

router.get("/youth/:youthId/schedule", requireYouthWorkerAuth, requireOrgScope(), async (req, res, next) => {
  try {
    const { youthId } = req.params;
    const youthWorkerId = req.session.youthWorkerId!;
    const sessionOrgId = req.session.organizationId as string;

    // Cross-org filter (C11/M3): assignment must be pinned to this session's org.
    const [assignment] = await db
      .select()
      .from(schemaExtensions.youthWorkerAssignments)
      .where(and(
        eq(schemaExtensions.youthWorkerAssignments.youthWorkerId, youthWorkerId),
        eq(schemaExtensions.youthWorkerAssignments.youthId, youthId),
        eq(schemaExtensions.youthWorkerAssignments.organizationId, sessionOrgId),
        eq(schemaExtensions.youthWorkerAssignments.consentStatus, "granted")
      ))
      .limit(1);

    if (!assignment) {
      logger.info({
        youthWorkerId,
        youthId,
        action: "schedule_access_denied",
        reason: "no_consent",
        context: "youth-workers",
      }, "Blocked schedule access attempt");
      return res.status(403).json({ error: "Access denied" });
    }

    // T043: tournament registrations removed — tournaments + tournament_*
    // tables dropped (out-of-pilot scope). Schedule now returns RSVPs only.
    const rsvps = await db
      .select({
        programTitle: schema.programs.title,
        programId: schema.programs.id,
        status: schema.rsvps.status,
        createdAt: schema.rsvps.createdAt,
      })
      .from(schema.rsvps)
      .innerJoin(schema.programs, eq(schema.rsvps.programId, schema.programs.id))
      .where(eq(schema.rsvps.userId, youthId));

    logger.info({
      youthWorkerId,
      youthId,
      action: "schedule_accessed",
      rsvpCount: rsvps.length,
      context: "youth-workers",
    }, "Youth schedule accessed");

    res.status(200).json({
      tournaments: [],
      rsvps: rsvps,
    });
  } catch (error) {
    logger.error({ error, youthId: req.params.youthId, context: "youth-workers" }, "Error getting youth schedule");
    next(error);
  }
});

const STAFF_REPORT_TYPES = ['funnel', 'attendance_audit', 'referral_outcomes', 'consent_compliance', 'supply_summary', 'program_performance'] as const;

const STAFF_REPORT_GENERATORS: Record<string, (orgId: string) => Promise<{ fields: string[]; rows: any[] }>> = {
  async funnel(orgId) {
    const result = await db.execute(sql`
      SELECT p.title AS program_name, COUNT(DISTINCT er.id) AS total_rsvps,
        COUNT(DISTINCT er.id) FILTER (WHERE er.status = 'confirmed') AS confirmed_rsvps,
        COUNT(DISTINCT ar.id) AS attended,
        CASE WHEN COUNT(DISTINCT er.id) > 0 THEN ROUND(COUNT(DISTINCT ar.id)::numeric / COUNT(DISTINCT er.id) * 100, 1) ELSE 0 END AS conversion_pct
      FROM programs p LEFT JOIN event_rsvps er ON er.program_id = p.id AND er.status != 'cancelled'
        LEFT JOIN attendance_sessions asess ON asess.program_id = p.id
        LEFT JOIN attendance_records ar ON ar.session_id = asess.id AND ar.user_id = er.user_id
      WHERE p.org_id = ${orgId} GROUP BY p.id, p.title ORDER BY total_rsvps DESC`);
    return { fields: ['program_name', 'total_rsvps', 'confirmed_rsvps', 'attended', 'conversion_pct'], rows: result.rows };
  },
  async attendance_audit(orgId) {
    const result = await db.execute(sql`
      SELECT p.title AS program_name, pe.event_name, TO_CHAR(asess.created_at AT TIME ZONE 'America/Edmonton', 'YYYY-MM-DD') AS session_date,
        asess.status AS session_status, COUNT(ar.id) AS check_ins, STRING_AGG(DISTINCT ar.method, ', ') AS methods_used
      FROM attendance_sessions asess JOIN programs p ON p.id = asess.program_id
        LEFT JOIN program_events pe ON pe.id = asess.event_id LEFT JOIN attendance_records ar ON ar.session_id = asess.id
      WHERE asess.org_id = ${orgId} GROUP BY p.title, pe.event_name, asess.created_at, asess.status ORDER BY asess.created_at DESC`);
    return { fields: ['program_name', 'event_name', 'session_date', 'session_status', 'check_ins', 'methods_used'], rows: result.rows };
  },
  async referral_outcomes(orgId) {
    const result = await db.execute(sql`
      SELECT r.status, COUNT(*) AS total, COUNT(*) FILTER (WHERE r.outcome = 'attended') AS attended,
        COUNT(*) FILTER (WHERE r.outcome = 'missed') AS missed
      FROM referrals r WHERE r.from_org_id = ${orgId} OR r.to_org_id = ${orgId} GROUP BY r.status ORDER BY total DESC`);
    return { fields: ['status', 'total', 'attended', 'missed'], rows: result.rows };
  },
  async consent_compliance(orgId) {
    const result = await db.execute(sql`
      SELECT ct.name AS template_name, ct.consent_type, COUNT(DISTINCT cr.id) AS requests_sent,
        COUNT(DISTINCT crec.id) AS receipts_signed, COUNT(DISTINCT cr.id) FILTER (WHERE cr.status = 'pending') AS still_pending,
        CASE WHEN COUNT(DISTINCT cr.id) > 0 THEN ROUND(COUNT(DISTINCT crec.id)::numeric / COUNT(DISTINCT cr.id) * 100, 1) ELSE 0 END AS sign_rate_pct
      FROM consent_templates ct LEFT JOIN consent_requests cr ON cr.template_id = ct.id LEFT JOIN consent_receipts crec ON crec.request_id = cr.id
      WHERE ct.org_id = ${orgId} GROUP BY ct.id, ct.name, ct.consent_type ORDER BY requests_sent DESC`);
    return { fields: ['template_name', 'consent_type', 'requests_sent', 'receipts_signed', 'still_pending', 'sign_rate_pct'], rows: result.rows };
  },
  async supply_summary(orgId) {
    const result = await db.execute(sql`
      SELECT COALESCE(p.verification_status, 'unverified') AS verification_status, COUNT(*) AS program_count,
        COUNT(*) FILTER (WHERE p.stale_at IS NOT NULL AND p.sunset_at IS NULL) AS stale_count,
        COUNT(*) FILTER (WHERE p.sunset_at IS NOT NULL) AS sunset_count
      FROM programs p WHERE p.org_id = ${orgId} GROUP BY COALESCE(p.verification_status, 'unverified') ORDER BY program_count DESC`);
    return { fields: ['verification_status', 'program_count', 'stale_count', 'sunset_count'], rows: result.rows };
  },
  async program_performance(orgId) {
    const result = await db.execute(sql`
      SELECT p.title AS program_name, COALESCE(array_to_string(p.tags, ', '), '') AS tags,
        COALESCE(p.verification_status, 'unverified') AS status, COUNT(DISTINCT er.id) AS rsvp_count,
        COUNT(DISTINCT ar.id) AS attendance_count, COUNT(DISTINCT pe.id) AS event_count
      FROM programs p LEFT JOIN event_rsvps er ON er.program_id = p.id AND er.status != 'cancelled'
        LEFT JOIN attendance_sessions asess ON asess.program_id = p.id LEFT JOIN attendance_records ar ON ar.session_id = asess.id
        LEFT JOIN program_events pe ON pe.program_id = p.id
      WHERE p.org_id = ${orgId} GROUP BY p.id, p.title, p.tags, p.verification_status ORDER BY attendance_count DESC, rsvp_count DESC`);
    return { fields: ['program_name', 'tags', 'status', 'rsvp_count', 'attendance_count', 'event_count'], rows: result.rows };
  },
};

router.get("/reports/types", requireYouthWorkerAuth, requireOrgScope(), (_req: any, res: any) => {
  res.json(STAFF_REPORT_TYPES);
});

router.post("/reports/run", requireYouthWorkerAuth, requireOrgScope(), validateCsrfToken, async (req: any, res: any) => {
  try {
    const orgId = req.session.organizationId as string;
    if (!orgId) return res.status(403).json({ error: "Organization context required" });

    const { reportType } = req.body;
    if (!STAFF_REPORT_TYPES.includes(reportType)) {
      return res.status(400).json({ error: `Invalid report type. Must be one of: ${STAFF_REPORT_TYPES.join(', ')}` });
    }

    const [run] = await db.insert(schema.reportRuns).values({
      orgId,
      runBy: req.session.youthWorkerId,
      reportType,
      parameters: { source: 'worker' },
      status: 'running',
    }).returning();

    try {
      const generator = STAFF_REPORT_GENERATORS[reportType];
      const { fields, rows } = await generator(orgId);
      const parser = new Parser({ fields });
      const csv = rows.length > 0 ? parser.parse(rows) : fields.join(',') + '\n';

      await db.update(schema.reportRuns)
        .set({ status: 'completed', rowCount: rows.length, fileContent: csv, completedAt: new Date() })
        .where(eq(schema.reportRuns.id, run.id));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}-${DateTime.now().toFormat('yyyy-MM-dd-HHmm')}.csv"`);
      res.setHeader('X-Report-Run-Id', run.id);
      res.send(csv);
    } catch (genErr: any) {
      await db.update(schema.reportRuns)
        .set({ status: 'failed', error: genErr.message, completedAt: new Date() })
        .where(eq(schema.reportRuns.id, run.id));
      throw genErr;
    }
  } catch (error) {
    logger.error({ err: error, context: 'worker-report-run' }, 'Error running staff report');
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to run report' });
    }
  }
});

router.get("/reports/history", requireYouthWorkerAuth, requireOrgScope(), async (req: any, res: any) => {
  try {
    const orgId = req.session.organizationId as string;
    if (!orgId) return res.status(403).json({ error: "Organization context required" });

    const runs = await db
      .select({
        id: schema.reportRuns.id,
        reportType: schema.reportRuns.reportType,
        status: schema.reportRuns.status,
        rowCount: schema.reportRuns.rowCount,
        error: schema.reportRuns.error,
        completedAt: schema.reportRuns.completedAt,
        createdAt: schema.reportRuns.createdAt,
      })
      .from(schema.reportRuns)
      .where(eq(schema.reportRuns.orgId, orgId))
      .orderBy(desc(schema.reportRuns.createdAt))
      .limit(50);

    res.json(runs);
  } catch (error) {
    logger.error({ err: error, context: 'worker-report-history' }, 'Error fetching staff report history');
    res.status(500).json({ error: 'Failed to fetch report history' });
  }
});

router.get("/reports/:runId/download", requireYouthWorkerAuth, requireOrgScope(), async (req: any, res: any) => {
  try {
    const orgId = req.session.organizationId as string;
    if (!orgId) return res.status(403).json({ error: "Organization context required" });

    const { runId } = req.params;
    const [run] = await db
      .select({
        id: schema.reportRuns.id,
        orgId: schema.reportRuns.orgId,
        reportType: schema.reportRuns.reportType,
        status: schema.reportRuns.status,
        fileContent: schema.reportRuns.fileContent,
        createdAt: schema.reportRuns.createdAt,
      })
      .from(schema.reportRuns)
      .where(and(eq(schema.reportRuns.id, runId), eq(schema.reportRuns.orgId, orgId)));

    if (!run) return res.status(404).json({ error: 'Report run not found' });
    if (run.status !== 'completed' || !run.fileContent) {
      return res.status(400).json({ error: 'Report not available for download' });
    }

    const dateStr = new Date(run.createdAt).toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${run.reportType}-${dateStr}.csv"`);
    res.send(run.fileContent);
  } catch (error) {
    logger.error({ err: error, context: 'worker-report-download' }, 'Error downloading staff report');
    res.status(500).json({ error: 'Failed to download report' });
  }
});

export default router;
