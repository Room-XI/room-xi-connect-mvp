/**
 * Pilot Parent Auth — canonical implementation.
 *
 * SOT §04 LOCKED RULES:
 * - magic link is the default auth method
 * - password fallback gated by ENABLE_PARENT_PASSWORD_FALLBACK
 * - magic links are one-time use (usedAt set on consume)
 * - expiry: 15 minutes (MAGIC_LINK_EXPIRY_MS)
 * - per-email cooldown: 60s; per-IP: 10 requests / 15 min
 * - non-enumerating responses
 * - session.regenerate() on consume
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import type { Request, Response } from 'express';
import { and, eq, gt, isNull } from 'drizzle-orm';

import { db } from '../../db.js';
import { parents, parentMagicLinks } from '../../schema.extras.js';
import { hashToken } from '../../utils/tokenHash.js';
import logger from '../../logger.js';
import { getPublicUrl } from '../../utils/publicUrl.js';
import {
  PilotParentMagicLinkRequestSchema,
  PilotParentPasswordLoginSchema,
} from '../validation/schemas.js';
import { ENABLE_PARENT_PASSWORD_FALLBACK } from '../flags.js';

const MAGIC_LINK_COOLDOWN_MS = 60 * 1000;
const MAGIC_LINK_EXPIRY_MS = 15 * 60 * 1000;
const MAGIC_LINK_IP_WINDOW_MS = 15 * 60 * 1000;
const MAGIC_LINK_MAX_PER_IP = 10;

const ipTracker: Map<string, { windowStart: number; count: number }> =
  new Map();

function checkIpLimit(ip: string): boolean {
  const now = Date.now();
  const key = ip || 'unknown';
  const rec = ipTracker.get(key);
  if (!rec || now - rec.windowStart > MAGIC_LINK_IP_WINDOW_MS) {
    ipTracker.set(key, { windowStart: now, count: 1 });
    return true;
  }
  if (rec.count >= MAGIC_LINK_MAX_PER_IP) return false;
  rec.count++;
  return true;
}

function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err: unknown) => (err ? reject(err) : resolve()));
  });
}

function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((err: unknown) => (err ? reject(err) : resolve()));
  });
}

/**
 * POST /api/pilot/auth/parent/magic-link
 * Always returns the same success response to prevent account enumeration.
 */
export async function requestParentMagicLinkPilot(
  req: Request,
  res: Response
): Promise<Response | void> {
  const SUCCESS = {
    success: true,
    message:
      'If an account exists with this email, you will receive a sign-in link.',
  };

  const parsed = PilotParentMagicLinkRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    // Still non-enumerating — respond 400 with generic message.
    return res.status(400).json({ error: 'A valid email is required.' });
  }

  try {
    const email = parsed.data.email.toLowerCase().trim();
    const ip =
      req.ip || (req.socket as { remoteAddress?: string })?.remoteAddress || 'unknown';

    if (!checkIpLimit(ip)) {
      logger.warn(
        { ip, context: 'pilot-parent-magic-link-ip-limit' },
        'Magic link IP limit exceeded'
      );
      return res.json(SUCCESS);
    }

    const [parent] = await db
      .select({ id: parents.id })
      .from(parents)
      .where(eq(parents.email, email))
      .limit(1);

    if (!parent) return res.json(SUCCESS);

    // Per-email cooldown.
    const recent = await db
      .select({ id: parentMagicLinks.id })
      .from(parentMagicLinks)
      .where(
        and(
          eq(parentMagicLinks.email, email),
          gt(
            parentMagicLinks.createdAt,
            new Date(Date.now() - MAGIC_LINK_COOLDOWN_MS)
          )
        )
      )
      .limit(1);
    if (recent.length > 0) return res.json(SUCCESS);

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MS);

    await db.insert(parentMagicLinks).values({
      email,
      tokenHash,
      expiresAt,
    });

    try {
      const baseUrl = getPublicUrl(req);
      // Canonical pilot consume URL — kept stable for email templates.
      const magicLink = `${baseUrl}/api/pilot/auth/parent/magic-link/${token}`;
      const { sendParentMagicLinkEmail } = await import(
        '../../services/email.js'
      );
      await sendParentMagicLinkEmail({ email, magicLink });
    } catch (e) {
      logger.error(
        { err: e, context: 'pilot-parent-magic-link-email' },
        'Magic link email send failed'
      );
    }

    return res.json(SUCCESS);
  } catch (error) {
    logger.error(
      { err: error, context: 'pilot-parent-magic-link' },
      'Magic link request error'
    );
    return res.json(SUCCESS); // Still non-enumerating on unexpected error.
  }
}

/**
 * GET /api/pilot/auth/parent/magic-link/:token
 *
 * Side-effect-free confirmation page. Email/Slack/iMessage clients
 * silently GET URLs in messages to render previews — if this handler
 * consumed the token (set usedAt, regenerated session) the link would
 * be burned before the parent ever clicked it. Instead, GET renders a
 * minimal HTML page with a one-click POST form back to the same URL.
 * The POST is what actually consumes the token.
 *
 * The form submits without CSRF: the token in the URL IS the auth
 * proof (it was emailed to the parent's verified inbox), and the
 * post-consume `regenerateSession` rotates any session-bound CSRF
 * secret immediately.
 */
export async function renderParentMagicLinkConfirmPilot(
  req: Request,
  res: Response
): Promise<Response | void> {
  const { token } = req.params;
  if (!token || typeof token !== 'string' || token.length < 32) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).send('Invalid or expired link.');
  }
  // Do NOT touch the database here. The whole point of the two-step
  // is that GET is observable but inert.
  const escaped = token.replace(/[^a-zA-Z0-9]/g, '');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  return res.status(200).send(`<!doctype html>
<html><head><meta charset="utf-8"><title>Sign in to Room XI Connect</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:linear-gradient(135deg,#F0EDE6,#E8E5DE)}.c{background:#fff;padding:40px;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,.1);text-align:center;max-width:420px}h1{color:#2C4A3E;margin-top:0}p{color:#4A5F57;line-height:1.5}button{background:#2C4A3E;color:#fff;border:0;padding:14px 28px;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer;margin-top:12px}button:hover{background:#1f3a30}small{color:#6B7670;display:block;margin-top:18px}</style>
</head><body><div class="c">
<h1>Sign in to Room XI Connect</h1>
<p>Click the button below to finish signing in to your parent account. This link works only once.</p>
<form method="POST" action="/api/pilot/auth/parent/magic-link/${escaped}/consume">
  <button type="submit">Continue to my account</button>
</form>
<small>If you did not request this link, you can safely close this page.</small>
</div></body></html>`);
}

/**
 * POST /api/pilot/auth/parent/magic-link/:token
 * Consumes (one-time) and redirects to /parent.
 */
export async function consumeParentMagicLinkPilot(
  req: Request,
  res: Response
): Promise<Response | void> {
  try {
    const { token } = req.params;
    if (!token || typeof token !== 'string' || token.length < 32) {
      return res.status(400).send('Invalid or expired link.');
    }
    const tokenHash = hashToken(token);

    const [link] = await db
      .select()
      .from(parentMagicLinks)
      .where(
        and(
          eq(parentMagicLinks.tokenHash, tokenHash),
          isNull(parentMagicLinks.usedAt),
          gt(parentMagicLinks.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!link) {
      return res.status(400).send(`
        <html><head><title>Link Expired</title>
          <style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:linear-gradient(135deg,#F0EDE6,#E8E5DE)}.c{background:#fff;padding:40px;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,.1);text-align:center;max-width:400px}h1{color:#2C4A3E}p{color:#4A5F57}a{color:#e11d48}</style>
        </head><body><div class="c"><h1>Link Expired or Invalid</h1><p>This sign-in link has expired or already been used.</p><p><a href="/parent/login">Request a new sign-in link</a></p></div></body></html>
      `);
    }

    // Mark used atomically-ish: flip usedAt before issuing session.
    await db
      .update(parentMagicLinks)
      .set({ usedAt: new Date() })
      .where(eq(parentMagicLinks.id, link.id));

    const [parent] = await db
      .select()
      .from(parents)
      .where(eq(parents.email, link.email))
      .limit(1);
    if (!parent) return res.status(400).send('Account not found.');

    await db
      .update(parents)
      .set({ lastLoginAt: new Date() })
      .where(eq(parents.id, parent.id));

    // Regenerate session — rotates CSRF token too.
    await regenerateSession(req);
    (req.session as any).parentId = parent.id;
    (req.session as any).isParentSession = true;
    await saveSession(req);

    return res.redirect('/parent');
  } catch (error) {
    logger.error(
      { err: error, context: 'pilot-parent-magic-link-consume' },
      'Magic link consume error'
    );
    return res.status(500).send('Internal server error');
  }
}

/**
 * POST /api/pilot/parent-auth/password
 * Only available when ENABLE_PARENT_PASSWORD_FALLBACK is true. 410 otherwise.
 */
export async function loginParentWithPasswordPilot(
  req: Request,
  res: Response
): Promise<Response | void> {
  if (!ENABLE_PARENT_PASSWORD_FALLBACK) {
    return res.status(410).json({
      error: 'Password login is disabled in the pilot.',
      hint: 'Use the magic-link sign-in flow.',
    });
  }

  const parsed = PilotParentPasswordLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  try {
    const email = parsed.data.email.toLowerCase().trim();
    const [parent] = await db
      .select()
      .from(parents)
      .where(eq(parents.email, email))
      .limit(1);
    if (!parent || !parent.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(parsed.data.password, parent.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    await db
      .update(parents)
      .set({ lastLoginAt: new Date() })
      .where(eq(parents.id, parent.id));

    await regenerateSession(req);
    (req.session as any).parentId = parent.id;
    (req.session as any).isParentSession = true;
    await saveSession(req);

    return res.json({
      parent: { id: parent.id, email: parent.email, name: parent.name },
    });
  } catch (error) {
    logger.error(
      { err: error, context: 'pilot-parent-password-login' },
      'Parent password login error'
    );
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

export async function logoutParentPilot(
  req: Request,
  res: Response
): Promise<Response | void> {
  return new Promise<Response | void>((resolve) => {
    req.session.destroy((err) => {
      if (err) {
        logger.error(
          { err, context: 'pilot-parent-logout' },
          'Logout error'
        );
        return resolve(res.status(500).json({ error: 'Logout failed' }));
      }
      res.clearCookie('connect.sid');
      resolve(res.json({ ok: true }));
    });
  });
}
