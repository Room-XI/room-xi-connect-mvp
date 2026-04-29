/**
 * Pilot Auth Routers — canonical auth surface for pilot v1.
 *
 * Two separate routers mounted under different session middleware:
 *   /api/pilot/auth/youth/*   (userSession)
 *   /api/pilot/auth/parent/*  (parentSession)
 *
 * Youth:
 *   POST /register           — signup (strict 6-digit PIN)
 *   POST /login              — email+PIN or loginCode+PIN
 *   POST /logout
 *   GET  /me                 — current youth session
 *   GET  /csrf               — CSRF token (youth namespace)
 *
 * Parent:
 *   POST /magic-link         — request link (rate-limited, non-enumerating)
 *   GET  /magic-link/:token  — consume (one-time, session regen)
 *   POST /password           — fallback (flag-gated)
 *   POST /logout
 *   GET  /me                 — current parent session + linked youth
 *   GET  /csrf               — CSRF token (parent namespace)
 */

import { Router, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';

import {
  registerYouthPilot,
  loginYouthPilot,
  logoutYouthPilot,
} from '../auth/youthAuth.js';
import {
  requestParentMagicLinkPilot,
  consumeParentMagicLinkPilot,
  renderParentMagicLinkConfirmPilot,
  loginParentWithPasswordPilot,
  logoutParentPilot,
} from '../auth/parentAuth.js';
import { authLimiter } from '../../middleware/rateLimit.js';
import { generateCsrfToken } from '../../middleware/security.js';
import { validateCsrfToken } from '../../middleware/security.js';
import { db } from '../../db.js';
import { users, profiles } from '../../schema.js';
import { parents } from '../../schema.extras.js';
import {
  getLinkedYouth,
  createOrRefreshParentInvite,
  getPendingInvites,
  acceptParentInvite,
} from '../../services/parentInvite.js';
import {
  verifyEmail as verifyEmailService,
  resendVerificationEmail,
} from '../../services/emailVerification.js';
import logger from '../../logger.js';

export const pilotYouthAuthRouter: Router = Router();
pilotYouthAuthRouter.post('/register', authLimiter, registerYouthPilot);
pilotYouthAuthRouter.post('/login', authLimiter, loginYouthPilot);
pilotYouthAuthRouter.post('/logout', logoutYouthPilot);

pilotYouthAuthRouter.get('/csrf', (req: Request, res: Response) => {
  const token = generateCsrfToken(req);
  res.json({ csrfToken: token });
});

/**
 * POST /api/pilot/auth/youth/parent-invite
 *
 * Authenticated youth invites a parent/guardian by email. Mirrors the
 * legacy /api/parent-auth/invite handler but lives on the pilot surface
 * so it survives PILOT_DISABLED_AUTH_PREFIXES.
 */
pilotYouthAuthRouter.post(
  '/parent-invite',
  validateCsrfToken,
  authLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const email = String(req.body?.email ?? '').trim();
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email is required' });
      }

      const [profile] = await db
        .select({
          preferredName: profiles.preferredName,
          firstName: profiles.firstName,
        })
        .from(profiles)
        .where(eq(profiles.userId, userId))
        .limit(1);

      const youthName =
        profile?.preferredName || profile?.firstName || undefined;

      const invite = await createOrRefreshParentInvite(
        userId,
        email,
        youthName
      );

      return res.json({
        success: true,
        invite: {
          id: invite.id,
          email: invite.email,
          expiresAt: invite.expiresAt,
        },
      });
    } catch (error) {
      logger.error(
        { err: error, context: 'pilot-youth-parent-invite' },
        'Failed to send parent invite'
      );
      return res.status(500).json({ error: 'Failed to send invitation' });
    }
  }
);

/**
 * GET /api/pilot/auth/youth/parent-invites/pending
 */
pilotYouthAuthRouter.get(
  '/parent-invites/pending',
  async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      const invites = await getPendingInvites(userId);
      // SECURITY: never expose the invite token over an authenticated
      // youth session. Possession of the token alone is sufficient to
      // accept the invite and establish a parent.sid (the token is the
      // proof that the parent controls the invited inbox). Returning it
      // here would let the youth bypass that proof.
      const safe = invites.map((i: any) => ({
        id: i.id,
        email: i.email,
        createdAt: i.createdAt,
        expiresAt: i.expiresAt,
      }));
      return res.json({ invites: safe });
    } catch (error) {
      logger.error(
        { err: error, context: 'pilot-youth-parent-invites-pending' },
        'Failed to load pending parent invites'
      );
      return res.status(500).json({ error: 'Failed to load invites' });
    }
  }
);

/**
 * GET /api/pilot/auth/youth/verify-email/:token
 *
 * Public. Confirms a youth email-verification token. The verification
 * email links to the React `/auth/verify-email/:token` page which calls
 * this endpoint.
 */
pilotYouthAuthRouter.get(
  '/verify-email/:token',
  async (req: Request, res: Response) => {
    try {
      const token = String(req.params.token ?? '');
      if (!token) {
        return res
          .status(400)
          .json({ success: false, error: 'Verification token is required' });
      }
      const result = await verifyEmailService(token);
      if (!result.success) {
        return res
          .status(400)
          .json({ success: false, error: result.message });
      }
      return res.json({ success: true, message: result.message });
    } catch (error) {
      logger.error(
        { err: error, context: 'pilot-youth-verify-email' },
        'Email verification failed'
      );
      return res
        .status(500)
        .json({ success: false, error: 'Verification failed' });
    }
  }
);

/**
 * POST /api/pilot/auth/youth/resend-verification
 *
 * Authenticated. Resends the verification link to the youth's stored
 * email. CSRF-protected.
 */
pilotYouthAuthRouter.post(
  '/resend-verification',
  validateCsrfToken,
  authLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      const result = await resendVerificationEmail(userId);
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      return res.json({ success: true, message: result.message });
    } catch (error) {
      logger.error(
        { err: error, context: 'pilot-youth-resend-verification' },
        'Resend verification failed'
      );
      return res.status(500).json({ error: 'Resend verification failed' });
    }
  }
);

pilotYouthAuthRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const { userId, requiresGuardianVerification, guardianVerifiedAt } =
      req.session;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
        profile: profiles,
      })
      .from(users)
      .leftJoin(profiles, eq(users.id, profiles.userId))
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Strip admin flag before returning profile to the youth client.
    const profile = user.profile;
    const safeProfile = profile
      ? (() => {
          const { isAdmin: _isAdmin, ...rest } = profile;
          return rest;
        })()
      : {};

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        ...safeProfile,
        requiresGuardianVerification: requiresGuardianVerification ?? false,
        guardianVerifiedAt: guardianVerifiedAt ?? null,
      },
    });
  } catch (error) {
    logger.error(
      { err: error, context: 'pilot-youth-me' },
      'Pilot youth /me error'
    );
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export const pilotParentAuthRouter: Router = Router();
// authLimiter layers on top of the in-handler IP-window limiter.
pilotParentAuthRouter.post(
  '/magic-link',
  authLimiter,
  requestParentMagicLinkPilot
);
// H3 hardening: GET renders a confirmation page (no DB write) so that
// email/Slack/iMessage link prefetch can't silently burn the token.
// POST performs the actual consume. Two POST paths are mounted:
//   /magic-link/:token         — back-compat with same-URL form posts
//   /magic-link/:token/consume — explicit canonical contract per spec
// Both map to the same handler. The token in the URL is the auth
// proof; session regen rotates any CSRF secret post-consume.
pilotParentAuthRouter.get(
  '/magic-link/:token',
  renderParentMagicLinkConfirmPilot
);
pilotParentAuthRouter.post(
  '/magic-link/:token',
  consumeParentMagicLinkPilot
);
pilotParentAuthRouter.post(
  '/magic-link/:token/consume',
  consumeParentMagicLinkPilot
);
pilotParentAuthRouter.post(
  '/password',
  authLimiter,
  loginParentWithPasswordPilot
);
pilotParentAuthRouter.post('/logout', logoutParentPilot);

/**
 * GET /api/pilot/auth/parent/accept/:token
 *
 * Accept a parent invite. Mirrors the legacy /api/parent-auth/accept/:token
 * GET handler — token in URL is single-use, no body, no CSRF (the requester
 * is following an email link from a fresh browser tab and has no session
 * yet). On success a parent.sid session is established; the React
 * /parent/accept/:token page then redirects to /parent.
 */
pilotParentAuthRouter.get(
  '/accept/:token',
  async (req: Request, res: Response) => {
    try {
      const token = String(req.params.token ?? '');
      if (!token) {
        return res
          .status(400)
          .json({ success: false, error: 'Invitation token is required' });
      }

      const result = await acceptParentInvite(token);

      // Establish a parent session so the redirect to /parent works without
      // a separate magic-link round-trip. Mirrors legacy behavior.
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err: unknown) =>
          err ? reject(err) : resolve()
        );
      });
      req.session.parentId = result.parentId;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: unknown) => (err ? reject(err) : resolve()));
      });

      return res.json({
        success: true,
        parentId: result.parentId,
        userId: result.userId,
      });
    } catch (error: any) {
      const message = error?.message || 'Failed to accept invitation';
      logger.warn(
        { err: error, context: 'pilot-parent-accept-invite' },
        'Parent accept invite failed'
      );
      const status = /not found|expired|already/i.test(message) ? 400 : 500;
      return res.status(status).json({ success: false, error: message });
    }
  }
);

pilotParentAuthRouter.get('/csrf', (req: Request, res: Response) => {
  const token = generateCsrfToken(req);
  res.json({ csrfToken: token });
});

pilotParentAuthRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const { parentId } = req.session;
    if (!parentId) {
      return res.status(401).json({
        authenticated: false,
        error: 'Parent authentication required',
      });
    }

    const [parent] = await db
      .select({
        id: parents.id,
        email: parents.email,
        name: parents.name,
        lastLoginAt: parents.lastLoginAt,
        createdAt: parents.createdAt,
      })
      .from(parents)
      .where(eq(parents.id, parentId))
      .limit(1);

    if (!parent) {
      return res
        .status(404)
        .json({ authenticated: false, error: 'Parent not found' });
    }

    const linkedYouth = await getLinkedYouth(parentId);

    return res.json({
      authenticated: true,
      parent: {
        id: parent.id,
        email: parent.email,
        name: parent.name,
        lastLoginAt: parent.lastLoginAt,
        createdAt: parent.createdAt,
      },
      linkedYouth,
    });
  } catch (error) {
    logger.error(
      { err: error, context: 'pilot-parent-me' },
      'Pilot parent /me error'
    );
    return res.status(500).json({ error: 'Internal server error' });
  }
});
