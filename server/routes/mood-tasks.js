import express from "express";
import { db } from "../db.js";
import { moodTasks } from "../schema.extras.js";
import { and, eq, isNull, lte } from "drizzle-orm";

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
    console.error("Error fetching mood tasks:", error);
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
    console.error("Error fetching due mood tasks:", error);
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
    console.error("Error completing mood task:", error);
    res.status(500).json({ error: "Failed to complete task" });
  }
});

router.post("/create", async (req, res) => {
  try {
    const { userId, programEventId, type, dueAt } = req.body;

    if (!userId || !programEventId || !type || !dueAt) {
      return res.status(400).json({ 
        error: "userId, programEventId, type, and dueAt are required" 
      });
    }

    if (!['pre', 'post'].includes(type)) {
      return res.status(400).json({ error: "type must be 'pre' or 'post'" });
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
    console.error("Error creating mood task:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
});

export default router;
