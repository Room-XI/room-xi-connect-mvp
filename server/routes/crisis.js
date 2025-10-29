import express from 'express';
import { db } from '../db.js';
import { crisisSupports } from '../schema.js';

const router = express.Router();

// Get all crisis supports
router.get('/', async (req, res) => {
  try {
    const supports = await db.select().from(crisisSupports);
    res.json(supports);
  } catch (error) {
    console.error('Get crisis supports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
