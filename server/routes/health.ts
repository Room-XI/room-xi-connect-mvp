import express from 'express';
import type { Request, Response } from 'express';
import { db } from '../db.js';
import { pool } from '../db.js';
import { sql } from 'drizzle-orm';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const checks: any = {
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
  } catch (error: any) {
    checks.status = 'unhealthy';
    checks.checks.database = {
      status: 'unhealthy',
      error: error.message
    };
  }

  try {
    const sessionTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'session'
      );
    `);
    const sessionTableExists = sessionTableCheck.rows[0]?.exists || false;
    checks.checks.sessionStore = {
      status: sessionTableExists ? 'healthy' : 'unhealthy',
      tableExists: sessionTableExists
    };
    if (!sessionTableExists) {
      checks.status = 'unhealthy';
    }
  } catch (error: any) {
    checks.checks.sessionStore = {
      status: 'unhealthy',
      error: error.message
    };
    checks.status = 'unhealthy';
  }

  checks.responseTime = Date.now() - startTime;

  const statusCode = checks.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(checks);
});

router.get('/deep', async (req: Request, res: Response) => {
  const checks: any = {};
  let hasCriticalFailure = false;
  let hasNonCriticalFailure = false;

  const dbStart = Date.now();
  try {
    await pool.query('SELECT 1');
    checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
  } catch (error) {
    checks.database = { status: 'error', latencyMs: Date.now() - dbStart };
    hasCriticalFailure = true;
  }

  const emailProvider = process.env.EMAIL_PROVIDER;
  if (emailProvider) {
    const providerKeyMap: Record<string, string> = {
      resend: 'RESEND_API_KEY',
      sendgrid: 'SENDGRID_API_KEY',
      mailgun: 'MAILGUN_API_KEY',
    };
    const requiredKey = providerKeyMap[emailProvider.toLowerCase()];
    checks.email = { status: (!requiredKey || process.env[requiredKey]) ? 'ok' : 'not_configured' };
  } else {
    checks.email = { status: 'not_configured' };
  }

  const hasAiKey = !!(process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY);
  checks.ai = { status: hasAiKey ? 'ok' : 'not_configured' };
  if (!hasAiKey) hasNonCriticalFailure = true;

  const hasVapid = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  checks.vapid = { status: hasVapid ? 'ok' : 'not_configured' };
  if (!hasVapid) hasNonCriticalFailure = true;

  const hasEncryption = !!process.env.ENCRYPTION_SECRET;
  checks.encryption = { status: hasEncryption ? 'ok' : 'missing' };
  if (!hasEncryption) hasCriticalFailure = true;

  let status = 'healthy';
  if (hasCriticalFailure) status = 'unhealthy';
  else if (hasNonCriticalFailure) status = 'degraded';

  const statusCode = status === 'unhealthy' ? 503 : 200;
  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    checks,
  });
});

router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

router.get('/ready', async (req: Request, res: Response) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

export default router;
