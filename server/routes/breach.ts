/**
 * Breach Notification Routes (PIPA Compliance)
 * Alberta PIPA requires notification within 72 hours
 */

import express, { Request, Response } from 'express';
import { db } from '../db.js';
import { breachEvents } from '../schema.js';
import { desc, eq } from 'drizzle-orm';
import '../types/session.d.ts';
import logger from '../logger.ts';

const router = express.Router();

/**
 * Middleware to require admin session (for use under /api/admin/breach)
 */
const requireAdminSession = (req: Request, res: Response, next: any) => {
  if (!req.session?.isAdminSession) {
    return res.status(401).json({ error: 'Admin session required' });
  }
  // CSRF validation for mutating operations
  if (req.method !== 'GET') {
    const csrfToken = req.headers['x-csrf-token'];
    if (!csrfToken || csrfToken !== req.session.adminCsrfToken) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
  }
  next();
};

/**
 * Get all breach events (Admin only)
 */
router.get('/', requireAdminSession, async (req: Request, res: Response) => {
  try {
    
    const breaches = await db.select()
      .from(breachEvents)
      .orderBy(desc(breachEvents.discoveredAt));
    
    res.json({ data: breaches });
  } catch (error) {
    logger.error({ err: error, context: 'breach-list' }, 'Get breaches error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create breach event (Admin only)
 */
router.post('/', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const {
      breachType,
      severity,
      affectedUserCount,
      affectedUserIds,
      description,
      oipcNotificationRequired,
      discoveredAt,
    } = req.body;
    
    // Validation
    const validBreachTypes = [
      'unauthorized_access',
      'data_loss',
      'ransomware',
      'insider_threat',
      'accidental_disclosure',
      'other'
    ];
    
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    
    if (!validBreachTypes.includes(breachType)) {
      return res.status(400).json({ error: 'Invalid breach type' });
    }
    
    if (!validSeverities.includes(severity)) {
      return res.status(400).json({ error: 'Invalid severity' });
    }
    
    if (!description || description.trim().length === 0) {
      return res.status(400).json({ error: 'Description is required' });
    }
    
    // Create breach event
    const [breach] = await db.insert(breachEvents)
      .values({
        breachType,
        severity,
        affectedUserCount: affectedUserCount || null,
        affectedUserIds: affectedUserIds || null,
        description: description.trim(),
        oipcNotificationRequired: oipcNotificationRequired === true,
        discoveredAt: discoveredAt ? new Date(discoveredAt) : new Date(),
      })
      .returning();
    
    // Log critical breach
    if (severity === 'critical' || severity === 'high') {
      logger.error({
        context: 'breach-critical',
        id: breach.id,
        type: breachType,
        severity,
        affectedCount: affectedUserCount,
      }, 'CRITICAL BREACH EVENT CREATED');
    }
    
    res.status(201).json({ data: breach });
  } catch (error) {
    logger.error({ err: error, context: 'breach-create' }, 'Create breach error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update breach event (Admin only)
 */
router.patch('/:id', requireAdminSession, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Allowed update fields
    const allowedFields = [
      'oipcNotifiedAt',
      'oipcNotificationMethod',
      'oipcReferenceNumber',
      'individualsNotifiedAt',
      'notificationMethod',
      'guardiansNotifiedAt',
      'remediationSteps',
      'remediationCompletedAt',
    ];
    
    const updateData: any = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }
    
    updateData.updatedAt = new Date();
    
    const [breach] = await db.update(breachEvents)
      .set(updateData)
      .where(eq(breachEvents.id, id))
      .returning();
    
    if (!breach) {
      return res.status(404).json({ error: 'Breach event not found' });
    }
    
    res.json({ data: breach });
  } catch (error) {
    logger.error({ err: error, context: 'breach-update' }, 'Update breach error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
