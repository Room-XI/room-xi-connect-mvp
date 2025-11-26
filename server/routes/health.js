import express from 'express';
import { db } from '../db.js';
import { sql } from 'drizzle-orm';

const router = express.Router();

router.get('/', async (req, res) => {
  const startTime = Date.now();
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {}
  };

  try {
    const dbStart = Date.now();
    await db.execute(sql`SELECT 1`);
    checks.checks.database = {
      status: 'healthy',
      responseTime: Date.now() - dbStart
    };
  } catch (error) {
    checks.status = 'unhealthy';
    checks.checks.database = {
      status: 'unhealthy',
      error: error.message
    };
  }

  checks.responseTime = Date.now() - startTime;

  const statusCode = checks.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(checks);
});

router.get('/live', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

router.get('/ready', async (req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

export default router;
