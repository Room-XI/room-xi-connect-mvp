import express from "express";
import bcrypt from "bcrypt";
import { db } from "../db.js";
import * as schema from "../schema.ts";
import * as schemaExtensions from "../schema-extensions.ts";
import { eq, and, desc } from "drizzle-orm";
import logger from "../logger.ts";

const router = express.Router();

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

    req.session.regenerate((err) => {
      if (err) {
        return next(err);
      }

      req.session.youthWorkerId = worker.id;
      req.session.organizationId = worker.organizationId;
      req.session.isYouthWorkerSession = true;
      req.session.youthWorkerRole = worker.role;

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
    res.clearCookie("org.sid");
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

// Middleware for youth worker auth
function requireYouthWorkerAuth(req: any, res: any, next: any) {
  if (!req.session?.youthWorkerId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

// Get assigned youth list
router.get("/my-youth", requireYouthWorkerAuth, async (req, res, next) => {
  const youthWorkerId = req.session.youthWorkerId!;
  
  logger.info({ 
    youthWorkerId, 
    action: "my_youth_list_access", 
    context: "youth-workers" 
  }, "Youth worker accessing assigned youth list");

  try {
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
      .where(eq(schemaExtensions.youthWorkerAssignments.youthWorkerId, youthWorkerId));

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
router.post("/assign", requireYouthWorkerAuth, async (req, res, next) => {
  const { youthEmail } = req.body;
  const youthWorkerId = req.session.youthWorkerId!;

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

    // Check if assignment already exists
    const [existing] = await db
      .select()
      .from(schemaExtensions.youthWorkerAssignments)
      .where(and(
        eq(schemaExtensions.youthWorkerAssignments.youthWorkerId, youthWorkerId),
        eq(schemaExtensions.youthWorkerAssignments.youthId, youth.id)
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

    // Create assignment request
    const [assignment] = await db.insert(schemaExtensions.youthWorkerAssignments).values({
      youthWorkerId: youthWorkerId,
      youthId: youth.id,
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
router.get("/youth/:youthId/dashboard", requireYouthWorkerAuth, async (req, res, next) => {
  const { youthId } = req.params;
  const youthWorkerId = req.session.youthWorkerId!;

  try {
    // Verify consent BEFORE any data access
    const [assignment] = await db
      .select()
      .from(schemaExtensions.youthWorkerAssignments)
      .where(and(
        eq(schemaExtensions.youthWorkerAssignments.youthWorkerId, youthWorkerId),
        eq(schemaExtensions.youthWorkerAssignments.youthId, youthId),
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
    const dashboard: any = {};
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
router.get("/youth/:youthId", requireYouthWorkerAuth, async (req, res, next) => {
  const { youthId } = req.params;
  const youthWorkerId = req.session.youthWorkerId!;

  try {
    // MUST verify consent BEFORE any data access
    const [assignment] = await db
      .select()
      .from(schemaExtensions.youthWorkerAssignments)
      .where(and(
        eq(schemaExtensions.youthWorkerAssignments.youthWorkerId, youthWorkerId),
        eq(schemaExtensions.youthWorkerAssignments.youthId, youthId),
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
router.get("/youth/:youthId/mood-history", requireYouthWorkerAuth, async (req, res, next) => {
  const { youthId } = req.params;
  const youthWorkerId = req.session.youthWorkerId!;

  try {
    // MUST verify consent BEFORE any data access
    const [assignment] = await db
      .select()
      .from(schemaExtensions.youthWorkerAssignments)
      .where(and(
        eq(schemaExtensions.youthWorkerAssignments.youthWorkerId, youthWorkerId),
        eq(schemaExtensions.youthWorkerAssignments.youthId, youthId),
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

export default router;
