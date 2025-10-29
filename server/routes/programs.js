import express from 'express';
import { db } from '../db.js';
import { programs, savedPrograms } from '../schema.js';
import { eq, and, sql } from 'drizzle-orm';

const router = express.Router();

// Get all programs
router.get('/', async (req, res) => {
  try {
    const allPrograms = await db.select().from(programs);
    res.json(allPrograms);
  } catch (error) {
    console.error('Get programs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get program by ID
router.get('/:id', async (req, res) => {
  try {
    const [program] = await db.select().from(programs).where(eq(programs.id, req.params.id)).limit(1);
    
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    res.json(program);
  } catch (error) {
    console.error('Get program error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get saved programs for user
router.get('/saved/list', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const saved = await db.select({
      program: programs,
      savedAt: savedPrograms.createdAt,
    })
    .from(savedPrograms)
    .innerJoin(programs, eq(savedPrograms.programId, programs.id))
    .where(eq(savedPrograms.userId, req.session.userId));

    res.json(saved);
  } catch (error) {
    console.error('Get saved programs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save a program
router.post('/saved/:programId', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await db.insert(savedPrograms).values({
      userId: req.session.userId,
      programId: req.params.programId,
    }).onConflictDoNothing();

    res.status(201).json({ message: 'Program saved' });
  } catch (error) {
    console.error('Save program error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unsave a program
router.delete('/saved/:programId', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await db.delete(savedPrograms).where(
      and(
        eq(savedPrograms.userId, req.session.userId),
        eq(savedPrograms.programId, req.params.programId)
      )
    );

    res.json({ message: 'Program unsaved' });
  } catch (error) {
    console.error('Unsave program error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
