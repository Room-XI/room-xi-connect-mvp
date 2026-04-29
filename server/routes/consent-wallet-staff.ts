import express, { Request, Response } from 'express';
import { db } from '../db.js';
import {
  consentTemplates,
  consentRequests,
  consentAuditEvents,
  parentLinks,
} from '../schema.extras.js';
import { users } from '../schema.js';
import { eq, and, desc, inArray } from 'drizzle-orm';
import logger from '../logger.ts';

const router = express.Router();

function logAuditEvent(
  tx: any,
  requestId: string | null,
  actorId: string,
  actorType: string,
  action: string,
  metadata: any,
  req: Request
) {
  return tx.insert(consentAuditEvents).values({
    requestId,
    actorId,
    actorType,
    action,
    metadata,
    ipAddress: req.headers['x-forwarded-for']?.toString() || req.socket?.remoteAddress || null,
    userAgent: req.headers['user-agent'] || null,
  });
}

const requireAuth = (req: Request, res: Response, next: any) => {
  if (!(req.session as any)?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

async function getStaffOrgIds(userId: string): Promise<string[]> {
  const { profiles, orgMembers } = await import('../schema.js');
  
  const [profile] = await db.select({ isAdmin: profiles.isAdmin })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  if (profile?.isAdmin) {
    return ['__admin__'];
  }

  const memberships = await db.select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(and(eq(orgMembers.userId, userId), eq(orgMembers.active, true)));

  return memberships.map(m => m.orgId);
}

const requireStaffOrAdmin = async (req: Request, res: Response, next: any) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const orgIds = await getStaffOrgIds(userId);
  if (orgIds.length === 0) {
    return res.status(403).json({ error: 'Staff or admin access required' });
  }

  (req as any).staffOrgIds = orgIds;
  (req as any).isSystemAdmin = orgIds.includes('__admin__');
  next();
};

router.post('/templates', requireAuth, requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const { name, description, consentType, bodyText, orgId, requiredFields } = req.body;
    const userId = (req.session as any).userId;
    const staffOrgIds = (req as any).staffOrgIds as string[];
    const isSystemAdmin = (req as any).isSystemAdmin as boolean;

    if (!name || !consentType) {
      return res.status(400).json({ error: 'Name and consentType are required' });
    }

    const validTypes = ['platform', 'program', 'data_sharing', 'photo_media', 'field_trip', 'medical', 'custom'];
    if (!validTypes.includes(consentType)) {
      return res.status(400).json({ error: `Invalid consentType. Must be one of: ${validTypes.join(', ')}` });
    }

    if (orgId && !isSystemAdmin && !staffOrgIds.includes(orgId)) {
      return res.status(403).json({ error: 'You can only create templates for your own organization' });
    }

    const resolvedOrgId = orgId || (isSystemAdmin ? null : staffOrgIds[0] || null);

    const [template] = await db.insert(consentTemplates).values({
      name,
      description: description || null,
      consentType,
      bodyText: bodyText || null,
      orgId: resolvedOrgId,
      requiredFields: requiredFields || [],
      createdBy: userId,
    }).returning();

    await logAuditEvent(db, null, userId, 'staff', 'template_created', {
      templateId: template.id,
      name,
      consentType,
      orgId: resolvedOrgId,
    }, req);

    res.status(201).json({ template });
  } catch (error) {
    logger.error({ err: error, context: 'consent-wallet-create-template' }, 'Error creating consent template');
    res.status(500).json({ error: 'Failed to create template' });
  }
});

router.get('/templates', requireAuth, requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const staffOrgIds = (req as any).staffOrgIds as string[];
    const isSystemAdmin = (req as any).isSystemAdmin as boolean;

    let query = db.select({
      id: consentTemplates.id,
      name: consentTemplates.name,
      description: consentTemplates.description,
      consentType: consentTemplates.consentType,
      version: consentTemplates.version,
      active: consentTemplates.active,
      orgId: consentTemplates.orgId,
      createdAt: consentTemplates.createdAt,
    })
    .from(consentTemplates)
    .where(eq(consentTemplates.active, true))
    .orderBy(desc(consentTemplates.createdAt));

    let templates = await query;

    if (!isSystemAdmin) {
      templates = templates.filter(t => 
        t.orgId === null || staffOrgIds.includes(t.orgId)
      );
    }

    res.json({ templates });
  } catch (error) {
    logger.error({ err: error, context: 'consent-wallet-list-templates' }, 'Error listing templates');
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

router.post('/requests', requireAuth, requireStaffOrAdmin, async (req: Request, res: Response) => {
  try {
    const { templateId, youthId, parentId, programId, expiresInDays } = req.body;
    const userId = (req.session as any).userId;
    const staffOrgIds = (req as any).staffOrgIds as string[];
    const isSystemAdmin = (req as any).isSystemAdmin as boolean;

    if (!templateId || !youthId) {
      return res.status(400).json({ error: 'templateId and youthId are required' });
    }

    const [template] = await db.select()
      .from(consentTemplates)
      .where(and(eq(consentTemplates.id, templateId), eq(consentTemplates.active, true)))
      .limit(1);

    if (!template) {
      return res.status(404).json({ error: 'Template not found or inactive' });
    }

    if (!isSystemAdmin && template.orgId && !staffOrgIds.includes(template.orgId)) {
      return res.status(403).json({ error: 'You can only use templates from your own organization' });
    }

    const [youth] = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.id, youthId))
      .limit(1);

    if (!youth) {
      return res.status(404).json({ error: 'Youth not found' });
    }

    let resolvedParentId = parentId || null;
    if (!resolvedParentId) {
      const links = await db.select({ parentId: parentLinks.parentId })
        .from(parentLinks)
        .where(eq(parentLinks.userId, youthId))
        .limit(1);

      if (links.length > 0) {
        resolvedParentId = links[0].parentId;
      }
    }

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [request] = await db.insert(consentRequests).values({
      templateId,
      youthId,
      parentId: resolvedParentId,
      programId: programId || null,
      status: 'pending',
      expiresAt,
      createdBy: userId,
    }).returning();

    await logAuditEvent(db, request.id, userId, 'staff', 'request_created', {
      templateId,
      youthId,
      parentId: resolvedParentId,
      programId: programId || null,
    }, req);

    res.status(201).json({ request });
  } catch (error) {
    logger.error({ err: error, context: 'consent-wallet-create-request' }, 'Error creating consent request');
    res.status(500).json({ error: 'Failed to create consent request' });
  }
});

export default router;
