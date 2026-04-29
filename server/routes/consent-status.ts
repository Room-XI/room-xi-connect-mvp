import express, { Request, Response } from 'express';
import { db } from '../db.js';
import { consentRequests, consentTemplates } from '../schema.extras.js';
import { eq, desc } from 'drizzle-orm';
import logger from '../logger.ts';

const router = express.Router();

const requireAuth = (req: Request, res: Response, next: any) => {
  if (!(req.session as any)?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

router.get('/youth-status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;

    const requests = await db.select({
      id: consentRequests.id,
      status: consentRequests.status,
      templateName: consentTemplates.name,
      templateType: consentTemplates.consentType,
      createdAt: consentRequests.createdAt,
      expiresAt: consentRequests.expiresAt,
    })
    .from(consentRequests)
    .innerJoin(consentTemplates, eq(consentRequests.templateId, consentTemplates.id))
    .where(eq(consentRequests.youthId, userId))
    .orderBy(desc(consentRequests.createdAt));

    const summary = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      signed: requests.filter(r => r.status === 'signed').length,
      declined: requests.filter(r => r.status === 'declined').length,
      withdrawn: requests.filter(r => r.status === 'withdrawn').length,
      expired: requests.filter(r => r.status === 'expired').length,
    };

    const consentItems = requests.map(r => ({
      id: r.id,
      name: r.templateName,
      type: r.templateType,
      status: r.status,
      createdAt: r.createdAt,
    }));

    res.json({ summary, consents: consentItems });
  } catch (error) {
    logger.error({ err: error, context: 'consent-status-youth' }, 'Error fetching youth consent status');
    res.status(500).json({ error: 'Failed to load consent status' });
  }
});

export default router;
