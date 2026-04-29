import express, { Request, Response } from 'express';
import { db } from '../db.js';
import {
  consentTemplates,
  consentRequests,
  consentReceipts,
} from '../schema.extras.js';
import { eq, and, desc, inArray } from 'drizzle-orm';
import logger from '../logger.ts';
import {
  signConsentRequest,
  declineConsentRequest,
  withdrawConsentRequest,
  ConsentRequestNotFoundError,
  ConsentRequestBadStatusError,
  ConsentRequestExpiredError,
} from '../pilot/consent/consentEngine.ts';

const router = express.Router();

const requireParent = (req: Request, res: Response, next: any) => {
  if (!(req.session as any)?.parentId) {
    return res.status(401).json({ error: 'Parent authentication required' });
  }
  next();
};

/**
 * Translate a typed consent-engine error into an HTTP response. Anything
 * the engine doesn't classify is treated as a 500 — preserving the
 * pre-T007 behavior of opaque server errors for unknown failures.
 */
function sendEngineError(res: Response, err: unknown, contextLabel: string): void {
  if (
    err instanceof ConsentRequestNotFoundError
    || err instanceof ConsentRequestBadStatusError
    || err instanceof ConsentRequestExpiredError
  ) {
    res.status(err.httpStatus).json({ error: err.message, code: err.code });
    return;
  }
  logger.error({ err, context: contextLabel }, 'Consent engine error');
  res.status(500).json({ error: 'Internal consent error' });
}

function reqIp(req: Request): string | null {
  return req.headers['x-forwarded-for']?.toString() || req.socket?.remoteAddress || null;
}
function reqUa(req: Request): string | null {
  return req.headers['user-agent'] || null;
}

router.get('/requests', requireParent, async (req: Request, res: Response) => {
  try {
    const parentId = (req.session as any).parentId;
    const statusFilter = req.query.status as string || 'pending';

    const validStatuses = ['pending', 'signed', 'declined', 'withdrawn', 'expired', 'all'];
    if (!validStatuses.includes(statusFilter)) {
      return res.status(400).json({ error: 'Invalid status filter' });
    }

    let conditions = [eq(consentRequests.parentId, parentId)];
    if (statusFilter !== 'all') {
      conditions.push(eq(consentRequests.status, statusFilter));
    }

    const requests = await db.select({
      id: consentRequests.id,
      templateId: consentRequests.templateId,
      youthId: consentRequests.youthId,
      programId: consentRequests.programId,
      status: consentRequests.status,
      expiresAt: consentRequests.expiresAt,
      createdAt: consentRequests.createdAt,
      templateName: consentTemplates.name,
      templateDescription: consentTemplates.description,
      templateType: consentTemplates.consentType,
      templateBody: consentTemplates.bodyText,
      templateVersion: consentTemplates.version,
    })
    .from(consentRequests)
    .innerJoin(consentTemplates, eq(consentRequests.templateId, consentTemplates.id))
    .where(and(...conditions))
    .orderBy(desc(consentRequests.createdAt));

    const { profiles } = await import('../schema.js');
    const youthIds = [...new Set(requests.map(r => r.youthId))];
    let youthNames: Record<string, string> = {};
    if (youthIds.length > 0) {
      const youthProfiles = await db.select({
        userId: profiles.userId,
        preferredName: profiles.preferredName,
        firstName: profiles.firstName,
      })
      .from(profiles)
      .where(inArray(profiles.userId, youthIds));

      for (const p of youthProfiles) {
        youthNames[p.userId] = p.preferredName || p.firstName || 'Youth';
      }
    }

    const enrichedRequests = requests.map(r => ({
      ...r,
      youthName: youthNames[r.youthId] || 'Youth',
    }));

    res.json({ requests: enrichedRequests });
  } catch (error) {
    logger.error({ err: error, context: 'consent-wallet-list-requests' }, 'Error listing consent requests');
    res.status(500).json({ error: 'Failed to list consent requests' });
  }
});

// T007 (Phase 2): the three decision endpoints below are thin HTTP
// adapters. All consent state transitions happen in the canonical engine
// (server/pilot/consent/consentEngine.ts). The router only:
//   - extracts session + body inputs
//   - calls the engine helper
//   - maps typed engine errors to HTTP status codes via sendEngineError()

router.post('/requests/:id/sign', requireParent, async (req: Request, res: Response) => {
  try {
    await signConsentRequest({
      requestId: req.params.id,
      parentId: (req.session as any).parentId,
      signature: req.body?.signature,
      ipAddress: reqIp(req),
      userAgent: reqUa(req),
    });
    res.json({ ok: true, message: 'Consent signed successfully' });
  } catch (err) {
    sendEngineError(res, err, 'consent-wallet-sign');
  }
});

router.post('/requests/:id/decline', requireParent, async (req: Request, res: Response) => {
  try {
    await declineConsentRequest({
      requestId: req.params.id,
      parentId: (req.session as any).parentId,
      reason: req.body?.reason ?? null,
      ipAddress: reqIp(req),
      userAgent: reqUa(req),
    });
    res.json({ ok: true, message: 'Consent declined. Pending RSVPs have been cancelled.' });
  } catch (err) {
    sendEngineError(res, err, 'consent-wallet-decline');
  }
});

router.post('/requests/:id/withdraw', requireParent, async (req: Request, res: Response) => {
  try {
    await withdrawConsentRequest({
      requestId: req.params.id,
      parentId: (req.session as any).parentId,
      reason: req.body?.reason ?? null,
      ipAddress: reqIp(req),
      userAgent: reqUa(req),
    });
    res.json({ ok: true, message: 'Consent withdrawn successfully. Associated RSVPs have been cancelled.' });
  } catch (err) {
    sendEngineError(res, err, 'consent-wallet-withdraw');
  }
});

router.get('/wallet', requireParent, async (req: Request, res: Response) => {
  try {
    const parentId = (req.session as any).parentId;

    const receipts = await db.select({
      receiptId: consentReceipts.id,
      requestId: consentReceipts.requestId,
      signedAt: consentReceipts.signedAt,
      signature: consentReceipts.signature,
      templateVersion: consentReceipts.templateVersion,
      withdrawnAt: consentReceipts.withdrawnAt,
      templateName: consentTemplates.name,
      templateDescription: consentTemplates.description,
      templateType: consentTemplates.consentType,
      youthId: consentRequests.youthId,
      programId: consentRequests.programId,
      requestStatus: consentRequests.status,
    })
    .from(consentReceipts)
    .innerJoin(consentRequests, eq(consentReceipts.requestId, consentRequests.id))
    .innerJoin(consentTemplates, eq(consentRequests.templateId, consentTemplates.id))
    .where(eq(consentReceipts.signedBy, parentId))
    .orderBy(desc(consentReceipts.signedAt));

    const { profiles } = await import('../schema.js');
    const youthIds = [...new Set(receipts.map(r => r.youthId))];
    let youthNames: Record<string, string> = {};
    if (youthIds.length > 0) {
      const youthProfiles = await db.select({
        userId: profiles.userId,
        preferredName: profiles.preferredName,
        firstName: profiles.firstName,
      })
      .from(profiles)
      .where(inArray(profiles.userId, youthIds));

      for (const p of youthProfiles) {
        youthNames[p.userId] = p.preferredName || p.firstName || 'Youth';
      }
    }

    const wallet = receipts.map(r => ({
      ...r,
      youthName: youthNames[r.youthId] || 'Youth',
      isActive: r.requestStatus === 'signed' && !r.withdrawnAt,
    }));

    res.json({ wallet });
  } catch (error) {
    logger.error({ err: error, context: 'consent-wallet-view' }, 'Error viewing consent wallet');
    res.status(500).json({ error: 'Failed to load consent wallet' });
  }
});

router.get('/audit/:requestId', requireParent, async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const parentId = (req.session as any).parentId;

    const [request] = await db.select()
      .from(consentRequests)
      .where(and(eq(consentRequests.id, requestId), eq(consentRequests.parentId, parentId)))
      .limit(1);

    if (!request) {
      return res.status(404).json({ error: 'Consent request not found' });
    }

    const events = await db.select()
      .from(consentAuditEvents)
      .where(eq(consentAuditEvents.requestId, requestId))
      .orderBy(desc(consentAuditEvents.occurredAt));

    res.json({ events });
  } catch (error) {
    logger.error({ err: error, context: 'consent-wallet-audit' }, 'Error fetching audit trail');
    res.status(500).json({ error: 'Failed to load audit trail' });
  }
});

export default router;
