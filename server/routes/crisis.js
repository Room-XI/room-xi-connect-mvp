import express from 'express';
import { db } from '../db.js';
import { crisisSupports } from '../schema.js';
import logger from '../logger.ts';

const router = express.Router();

// Get all crisis supports
router.get('/', async (req, res) => {
  try {
    const supports = await db.select().from(crisisSupports);
    res.json(supports);
  } catch (error) {
    logger.error({ err: error, context: 'crisis-supports-get' }, 'Get crisis supports error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
