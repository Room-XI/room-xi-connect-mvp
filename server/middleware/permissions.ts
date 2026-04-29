import { Request, Response, NextFunction } from 'express';
import { db } from '../db.js';
import { parentLinks } from '../schema.extras.js';
import { eq, and } from 'drizzle-orm';
import logger from '../logger.ts';
import '../types/session.d.ts';

declare global {
  namespace Express {
    interface Request {
      parentYouthLink?: {
        parentId: string;
        userId: string;
        relation: string;
        verifiedAt: Date | null;
      };
    }
  }
}

export function requireOwnership(
  getResourceUserId: (req: Request) => Promise<string | null> | string | null
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const resourceUserId = await getResourceUserId(req);
      if (!resourceUserId) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      if (resourceUserId !== sessionUserId) {
        logger.warn(
          {
            context: 'bola-blocked',
            sessionUserId,
            resourceUserId,
            method: req.method,
            path: req.originalUrl,
          },
          'BOLA attempt blocked: user tried to access another user\'s resource'
        );
        return res.status(403).json({ error: 'Not authorized' });
      }

      next();
    } catch (error) {
      logger.error({ err: error, context: 'permissions-ownership' }, 'Ownership check failed');
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}

export async function verifyParentYouthLink(parentId: string, youthId: string) {
  const [link] = await db
    .select()
    .from(parentLinks)
    .where(
      and(
        eq(parentLinks.parentId, parentId),
        eq(parentLinks.userId, youthId)
      )
    )
    .limit(1);

  return link || null;
}

export function requireParentYouthLink(
  getYouthId: (req: Request) => string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parentId = req.session?.parentId;
      if (!parentId) {
        return res.status(401).json({ error: 'Parent authentication required' });
      }

      const youthId = getYouthId(req);
      if (!youthId) {
        return res.status(400).json({ error: 'Youth ID is required' });
      }

      const link = await verifyParentYouthLink(parentId, youthId);
      if (!link) {
        logger.warn(
          {
            context: 'bola-blocked',
            parentId,
            youthId,
            method: req.method,
            path: req.originalUrl,
          },
          'BOLA attempt blocked: parent tried to access unlinked youth\'s data'
        );
        return res.status(403).json({ error: 'Not authorized to access this youth\'s data' });
      }

      req.parentYouthLink = link;
      next();
    } catch (error) {
      logger.error({ err: error, context: 'permissions-parent-link' }, 'Parent-youth link check failed');
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}

export function requireSessionUserOrLinkedParent(
  getUserId: (req: Request) => string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetUserId = getUserId(req);
      if (!targetUserId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      if (req.session?.userId === targetUserId) {
        return next();
      }

      if (req.session?.parentId) {
        const link = await verifyParentYouthLink(
          req.session.parentId,
          targetUserId
        );
        if (link) {
          req.parentYouthLink = link;
          return next();
        }
      }

      logger.warn(
        {
          context: 'bola-blocked',
          sessionUserId: req.session?.userId,
          sessionParentId: req.session?.parentId,
          targetUserId,
          method: req.method,
          path: req.originalUrl,
        },
        'BOLA attempt blocked: unauthorized access to user resource'
      );
      return res.status(403).json({ error: 'Not authorized' });
    } catch (error) {
      logger.error({ err: error, context: 'permissions-user-or-parent' }, 'Auth check failed');
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}

export function requireRole(role: 'admin' | 'youth_worker' | 'parent') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (role === 'admin') {
      if (!req.session?.isAdminSession) {
        logger.warn(
          {
            context: 'bola-blocked',
            sessionUserId: req.session?.userId,
            requiredRole: role,
            method: req.method,
            path: req.originalUrl,
          },
          'BOLA attempt blocked: non-admin tried to access admin route'
        );
        return res.status(403).json({ error: 'Admin privileges required' });
      }
    } else if (role === 'youth_worker') {
      if (!req.session?.youthWorkerId) {
        return res.status(401).json({ error: 'Youth worker authentication required' });
      }
    } else if (role === 'parent') {
      if (!req.session?.parentId) {
        return res.status(401).json({ error: 'Parent authentication required' });
      }
    }
    next();
  };
}

export function requireSelf(paramKey: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction) => {
    const sessionUserId = req.session?.userId;
    if (!sessionUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const targetId = req.params[paramKey];
    if (!targetId) {
      return res.status(400).json({ error: `${paramKey} parameter is required` });
    }

    if (targetId !== sessionUserId) {
      logger.warn(
        {
          context: 'bola-blocked',
          sessionUserId,
          targetId,
          paramKey,
          method: req.method,
          path: req.originalUrl,
        },
        'BOLA attempt blocked: user tried to access another user\'s resource via param'
      );
      return res.status(403).json({ error: 'Not authorized' });
    }

    next();
  };
}

export function requireOrgScope(paramKey?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const sessionOrgId = req.session?.organizationId;
    if (!sessionOrgId) {
      logger.warn(
        {
          context: 'bola-blocked',
          sessionYouthWorkerId: req.session?.youthWorkerId,
          method: req.method,
          path: req.originalUrl,
        },
        'BOLA attempt blocked: session missing org scope'
      );
      return res.status(403).json({ error: 'Organization scope required' });
    }

    if (paramKey) {
      const targetOrgId = req.params[paramKey] || req.body?.[paramKey];
      if (targetOrgId && targetOrgId !== sessionOrgId) {
        logger.warn(
          {
            context: 'bola-blocked',
            sessionOrgId,
            targetOrgId,
            paramKey,
            method: req.method,
            path: req.originalUrl,
          },
          'BOLA attempt blocked: cross-org access attempt'
        );
        return res.status(403).json({ error: 'Not authorized for this organization' });
      }
    }

    next();
  };
}

export function requireLinkedChild(paramKey: string = 'youthId') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parentId = req.session?.parentId;
      if (!parentId) {
        return res.status(401).json({ error: 'Parent authentication required' });
      }

      const youthId = req.params[paramKey];
      if (!youthId) {
        return res.status(400).json({ error: `${paramKey} parameter is required` });
      }

      const link = await verifyParentYouthLink(parentId, youthId);
      if (!link) {
        logger.warn(
          {
            context: 'bola-blocked',
            parentId,
            youthId,
            paramKey,
            method: req.method,
            path: req.originalUrl,
          },
          'BOLA attempt blocked: parent tried to access non-linked child data'
        );
        return res.status(403).json({ error: 'Not authorized to access this youth\'s data' });
      }

      req.parentYouthLink = link;
      next();
    } catch (error) {
      logger.error({ err: error, context: 'permissions-linked-child' }, 'Linked child check failed');
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}

export function requireOrgMember() {
  return (req: Request, res: Response, next: NextFunction) => {
    const hasOrgSession = req.session?.organizationId || req.session?.isAdminSession;
    if (!hasOrgSession) {
      logger.warn(
        {
          context: 'bola-blocked',
          sessionUserId: req.session?.userId,
          method: req.method,
          path: req.originalUrl,
        },
        'BOLA attempt blocked: non-org-member tried to access org resource'
      );
      return res.status(403).json({ error: 'Organization membership required' });
    }
    next();
  };
}
