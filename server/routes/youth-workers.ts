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
  try {
    const youthWorkerId = req.session.youthWorkerId!;
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

  if (!youthEmail) {
    return res.status(400).json({ error: "youthEmail is required" });
  }

  try {
    // Find youth by email
    const youth = await db.query.users?.findFirst({
      where: eq(schema.users.email, youthEmail.toLowerCase()),
    });

    if (!youth) {
      return res.status(404).json({ error: "Youth not found" });
    }

    const youthWorkerId = req.session.youthWorkerId!;

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
      return res.status(409).json({ error: "Assignment request already exists", status: existing.consentStatus });
    }

    // Create assignment request
    const [assignment] = await db.insert(schemaExtensions.youthWorkerAssignments).values({
      youthWorkerId: youthWorkerId,
      youthId: youth.id,
      consentStatus: "pending",
    }).returning();

    logger.info({ 
      youthWorkerId: req.session.youthWorkerId, 
      youthId: youth.id, 
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
    // Verify consent
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
      return res.status(403).json({ error: "No consent to view this youth's data" });
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

export default router;
