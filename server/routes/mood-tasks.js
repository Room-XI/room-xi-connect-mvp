import express from "express";
import { db } from "../db.js";
import { moodTasks, eventRsvps, attendanceRecords, attendanceSessions } from "../schema.extras.js";
import { and, eq, isNull, lte, sql } from "drizzle-orm";
import logger from "../logger.ts";

const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
};

router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    const incompleteTasks = await db
      .select()
      .from(moodTasks)
      .where(
        and(
          eq(moodTasks.userId, userId),
          isNull(moodTasks.completedAt)
        )
      )
      .orderBy(moodTasks.dueAt);

    res.json({
      tasks: incompleteTasks.map((task) => ({
        id: task.id,
        programEventId: task.programEventId,
        type: task.type,
        dueAt: task.dueAt,
        createdAt: task.createdAt,
      })),
    });
  } catch (error) {
    logger.error({ err: error, context: 'mood-tasks-list' }, 'Error fetching mood tasks');
    res.status(500).json({ error: "Failed to fetch mood tasks" });
  }
});

router.get("/due", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const now = new Date();

    const dueTasks = await db
      .select()
      .from(moodTasks)
      .where(
        and(
          eq(moodTasks.userId, userId),
          isNull(moodTasks.completedAt),
          lte(moodTasks.dueAt, now)
        )
      )
      .orderBy(moodTasks.dueAt);

    res.json({
      tasks: dueTasks.map((task) => ({
        id: task.id,
        programEventId: task.programEventId,
        type: task.type,
        dueAt: task.dueAt,
        createdAt: task.createdAt,
      })),
    });
  } catch (error) {
    logger.error({ err: error, context: 'mood-tasks-due' }, 'Error fetching due mood tasks');
    res.status(500).json({ error: "Failed to fetch due tasks" });
  }
});

router.post("/:id/complete", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    const [task] = await db
      .select()
      .from(moodTasks)
      .where(eq(moodTasks.id, id));

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    if (task.userId !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (task.completedAt) {
      return res.status(400).json({ error: "Task already completed" });
    }

    await db
      .update(moodTasks)
      .set({ completedAt: new Date() })
      .where(eq(moodTasks.id, id));

    res.json({ ok: true });
  } catch (error) {
    logger.error({ err: error, context: 'mood-tasks-complete' }, 'Error completing mood task');
    res.status(500).json({ error: "Failed to complete task" });
  }
});

router.post("/create", requireAuth, async (req, res) => {
  try {
    const { programEventId, type, dueAt } = req.body;
    const userId = req.session.userId;

    if (!programEventId || !type || !dueAt) {
      return res.status(400).json({ 
        error: "programEventId, type, and dueAt are required" 
      });
    }

    if (!['pre', 'post'].includes(type)) {
      return res.status(400).json({ error: "type must be 'pre' or 'post'" });
    }

    // IDOR hardening: a youth may only create a mood-task for an event
    // they are actually attending. Without this check any authenticated
    // user could spam tasks tied to arbitrary programEventIds, polluting
    // another youth's program data plane and the mood reminder queue.
    // Two valid proofs of participation:
    //   (1) a CONFIRMED RSVP for this event (parent consent cleared,
    //       so a pre/post mood reminder is appropriate), OR
    //   (2) a recorded attendance row for this event (the youth has
    //       actually been checked in, so a post reminder is warranted
    //       even if the RSVP was bypassed via walk-in).
    // pending_consent RSVPs do NOT qualify — until the parent signs we
    // should not be queuing program-linked data for the youth.
    const [confirmedRsvp] = await db
      .select({ id: eventRsvps.id })
      .from(eventRsvps)
      .where(and(
        eq(eventRsvps.userId, userId),
        eq(eventRsvps.eventId, programEventId),
        eq(eventRsvps.status, 'confirmed'),
      ))
      .limit(1);

    let attendanceProof = null;
    if (!confirmedRsvp) {
      const rows = await db
        .select({ id: attendanceRecords.id })
        .from(attendanceRecords)
        .innerJoin(
          attendanceSessions,
          eq(attendanceRecords.sessionId, attendanceSessions.id)
        )
        .where(and(
          eq(attendanceRecords.userId, userId),
          eq(attendanceSessions.eventId, programEventId),
        ))
        .limit(1);
      attendanceProof = rows[0] ?? null;
    }

    if (!confirmedRsvp && !attendanceProof) {
      return res.status(403).json({
        error: "You must have a confirmed RSVP or attendance record for this event",
        code: "MOOD_TASK_NO_PARTICIPATION",
      });
    }

    const [task] = await db
      .insert(moodTasks)
      .values({
        userId,
        programEventId,
        type,
        dueAt: new Date(dueAt),
      })
      .returning();

    res.json({
      task: {
        id: task.id,
        userId: task.userId,
        programEventId: task.programEventId,
        type: task.type,
        dueAt: task.dueAt,
        createdAt: task.createdAt,
      },
    });
  } catch (error) {
    logger.error({ err: error, context: 'mood-tasks-create' }, 'Error creating mood task');
    res.status(500).json({ error: "Failed to create task" });
  }
});

export default router;
