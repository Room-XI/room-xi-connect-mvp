/**
 * Pilot Permission Guards — CANONICAL.
 *
 * Per SOT §09_PERMISSIONS_MATRIX. This module is the single import surface
 * for permission middleware used by the 3-portal pilot runtime
 * (Youth · Parent · Operator). It re-exports the battle-tested guards in
 * `server/middleware/permissions.ts` under pilot-canonical names plus adds
 * thin operator-session helpers.
 *
 * Every guard logs blocked attempts via the underlying middleware
 * (context: 'bola-blocked') for audit.
 */

import type { Request, Response, NextFunction } from 'express';
import logger from '../../logger.ts';
import {
  requireOwnership,
  requireRole,
  requireSelf,
  requireOrgScope,
  requireLinkedChild,
  requireParentYouthLink,
  requireSessionUserOrLinkedParent,
  verifyParentYouthLink,
} from '../../middleware/permissions.ts';

/* ──────────────────────────────────────────────────────────────────── */
/* Session-presence guards                                             */
/* ──────────────────────────────────────────────────────────────────── */

/** Youth session present (req.session.userId set). */
export function requireYouthSession(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  return next();
}

/** Parent session present (req.session.parentId set). Wraps requireRole('parent'). */
export const requireParentSession = requireRole('parent');

/**
 * Operator session present. In the pilot, "operator" = Room 11 youth worker
 * with an org scope. We require both youthWorkerId and organizationId so the
 * downstream code can safely scope queries.
 */
export function requireOperatorSession(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.youthWorkerId) {
    return res.status(401).json({ error: 'Operator authentication required' });
  }
  if (!req.session?.organizationId) {
    logger.warn(
      {
        context: 'bola-blocked',
        sessionYouthWorkerId: req.session.youthWorkerId,
        method: req.method,
        path: req.originalUrl,
      },
      'Operator session missing organization scope',
    );
    return res.status(403).json({ error: 'Operator org scope required' });
  }
  return next();
}

/* ──────────────────────────────────────────────────────────────────── */
/* Resource-ownership guards                                           */
/* ──────────────────────────────────────────────────────────────────── */

/**
 * Youth self-scope: param value must equal session userId.
 * Use on `/youth/me/...` style routes that take an explicit id param.
 */
export const requireYouthSelf = requireSelf;

/**
 * Youth owns the resource referenced by id (lookup-driven).
 * Pass a function that returns the resource owner's userId.
 */
export const requireYouthOwnsResource = requireOwnership;

/** Parent → linked youth (req.params[paramKey], default 'youthId'). */
export const requireParentLinkedYouth = requireLinkedChild;

/** Operator scoped to own organization. */
export const requireOperatorOrgScope = requireOrgScope;

/* ──────────────────────────────────────────────────────────────────── */
/* Re-exports for convenience                                          */
/* ──────────────────────────────────────────────────────────────────── */

export {
  requireOwnership,
  requireRole,
  requireSelf,
  requireOrgScope,
  requireLinkedChild,
  requireParentYouthLink,
  requireSessionUserOrLinkedParent,
  verifyParentYouthLink,
};
