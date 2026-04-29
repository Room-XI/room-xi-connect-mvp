/**
 * Pilot Youth Auth — canonical implementation.
 *
 * SOT §04 LOCKED RULES:
 * - email optional
 * - required signup: display name, DOB, 6-digit PIN
 * - under 16: guardian email required (phone optional, records only)
 * - login methods: email+PIN (if email) OR login_code+PIN (always)
 * - non-enumerating error messages
 * - session.regenerate() on every auth boundary change (rotates CSRF)
 *
 * Heavy lifting (bcrypt, lockout, login-code generation, community
 * lookup, guardian email consent flow) is shared with the legacy
 * /api/auth/* surface. This module is the *pilot-path boundary* —
 * strict 6-digit PIN everywhere, no legacy leniency.
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';

import { db } from '../../db.js';
import { users, profiles, guardianVerifications } from '../../schema.js';
import { accountLockouts } from '../../schema.js';
import { generateUniqueLoginCode } from '../../utils/loginCode.js';
import { hashToken } from '../../utils/tokenHash.js';
import { sendVerificationEmail } from '../../services/emailVerification.js';
import logger from '../../logger.js';
import { calculateAge } from '../../utils/age.js';
// ^ shared util; matches the inline helper in server/routes/auth.ts
import {
  recordFailedLogin,
  clearFailedLogin,
} from '../../middleware/accountLockout.js';
import {
  lookupCommunity,
  lookupCommunityEnhanced,
  normalizePostalCode,
} from '../../services/communityLookup.js';
import {
  PilotYouthRegisterSchema,
  PilotYouthLoginSchema,
} from '../validation/schemas.js';
import { getPublicUrl } from '../../utils/publicUrl.js';

// Generic, non-enumerating copy. Do not tell the client *why* the
// credential pair was rejected.
const GENERIC_LOGIN_ERROR = 'Invalid credentials';
const GENERIC_SERVER_ERROR = 'Something went wrong. Please try again.';

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

export async function registerYouthPilot(
  req: Request,
  res: Response
): Promise<Response | void> {
  const parsed = PilotYouthRegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  const {
    displayName,
    dateOfBirth,
    pin,
    email,
    guardianEmail,
    guardianName,
    guardianPhone, // stored on profile notes only; not used for delivery in pilot
    postalCode,
  } = parsed.data;

  try {
    const age = calculateAge(dateOfBirth);
    if (age === null) {
      return res.status(400).json({ error: 'Invalid date of birth' });
    }
    if (age < 13 || age > 25) {
      return res
        .status(400)
        .json({ error: 'Room XI Connect is for ages 13–25.' });
    }

    const isMinor = age < 16;
    if (isMinor && !guardianEmail) {
      return res
        .status(400)
        .json({ error: 'Guardian email is required for users under 16.' });
    }

    if (email) {
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);
      if (existing.length > 0) {
        // Generic message — do not confirm existence, but we cannot
        // silently succeed since the client needs to know signup failed.
        return res
          .status(400)
          .json({ error: 'Unable to create account with those details.' });
      }
    }

    const pinHash = await bcrypt.hash(pin, 12);
    const loginCode = await generateUniqueLoginCode();

    let communityName: string | null = null;
    let wardName: string | null = null;
    let normalizedPostal: string | null = null;
    if (postalCode) {
      normalizedPostal = normalizePostalCode(postalCode);
      let info: { community: string; ward: string } | null = null;
      try {
        info = await lookupCommunityEnhanced(postalCode);
      } catch (e) {
        logger.warn(
          { err: e, context: 'pilot-youth-register-gis' },
          'GIS lookup failed'
        );
      }
      if (!info) info = lookupCommunity(postalCode);
      if (info) {
        communityName = info.community;
        wardName = info.ward;
      }
    }

    const [newUser] = await db
      .insert(users)
      .values({
        email: email ? email.toLowerCase() : null,
        passwordHash: null,
        displayName,
        dateOfBirth,
        pinHash,
        loginCode,
        isMinor,
        guardianEmail: guardianEmail ? guardianEmail.toLowerCase() : null,
      })
      .returning();

    await db.insert(profiles).values({
      userId: newUser.id,
      preferredName: displayName,
      age,
      dateOfBirth,
      postalCode: normalizedPostal,
      communityName,
      wardName,
    });

    if (email) {
      try {
        await sendVerificationEmail(newUser.id, email);
      } catch (e) {
        logger.error(
          { err: e, context: 'pilot-youth-register-email' },
          'Verification email failed'
        );
      }
    }

    let guardianVerification: {
      guardianEmail: string;
      consentLink: string;
      status: string;
    } | null = null;

    if (isMinor && guardianEmail) {
      try {
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const initialConsentToken = crypto.randomBytes(32).toString('hex');
        const initialConsentTokenHash = hashToken(initialConsentToken);
        const contactHash = await bcrypt.hash(guardianEmail.toLowerCase(), 10);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const { CONSENT_NOTICE_VERSION } = await import(
          '../../services/consentNotices.js'
        );

        await db.insert(guardianVerifications).values({
          userId: newUser.id,
          guardianContactType: 'email',
          guardianContactValue: guardianEmail.toLowerCase(),
          guardianContactHash: contactHash,
          guardianName: guardianName || null,
          verificationToken,
          verificationMethod: 'email_plus',
          initialConsentToken: initialConsentTokenHash,
          consentNoticeVersion: CONSENT_NOTICE_VERSION,
          consentNoticeSentAt: new Date(),
          status: 'pending_initial_consent',
          expiresAt,
        });

        const { sendInitialConsentEmail } = await import(
          '../../services/email.js'
        );
        const baseUrl = getPublicUrl(req);
        const consentLink = `${baseUrl}/api/consent/view/${initialConsentToken}`;
        await sendInitialConsentEmail({
          guardianEmail: guardianEmail.toLowerCase(),
          guardianName: guardianName || null,
          youthName: displayName,
          consentLink,
        });
        guardianVerification = {
          guardianEmail: guardianEmail.toLowerCase(),
          consentLink,
          status: 'pending_initial_consent',
        };
      } catch (e) {
        logger.error(
          { err: e, context: 'pilot-youth-register-guardian' },
          'Guardian verification setup failed'
        );
      }
    }

    // Note: guardianPhone is accepted but not stored anywhere in pilot v1
    // (records-only per SOT; no pilot column yet).
    if (guardianPhone) {
      logger.info(
        { userId: newUser.id, context: 'pilot-youth-register-guardian-phone' },
        'Guardian phone provided (not stored in pilot v1)'
      );
    }

    // New session → new CSRF token automatically.
    await regenerateSession(req);
    (req.session as any).userId = newUser.id;
    (req.session as any).email = newUser.email;
    (req.session as any).age = age;
    (req.session as any).requiresGuardianVerification = isMinor;
    (req.session as any).guardianVerifiedAt = isMinor
      ? null
      : new Date().toISOString();
    await saveSession(req);

    return res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName,
        loginCode,
        age,
        requiresGuardianVerification: isMinor,
      },
      ...(guardianVerification ? { guardianVerification } : {}),
    });
  } catch (error) {
    logger.error(
      { err: error, context: 'pilot-youth-register' },
      'Pilot youth register error'
    );
    return res.status(500).json({ error: GENERIC_SERVER_ERROR });
  }
}

export async function loginYouthPilot(
  req: Request,
  res: Response
): Promise<Response | void> {
  const parsed = PilotYouthLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    // Generic error — do not leak which field failed.
    return res.status(400).json({ error: GENERIC_LOGIN_ERROR });
  }

  const { loginCode, email, pin } = parsed.data;

  try {
    const identifier = loginCode
      ? loginCode.toUpperCase().trim()
      : (email as string).toLowerCase().trim();

    const lockoutKey = loginCode
      ? `pin:${identifier.toLowerCase()}`
      : `pin-email:${identifier}`;

    const [lockoutRecord] = await db
      .select()
      .from(accountLockouts)
      .where(eq(accountLockouts.email, lockoutKey))
      .limit(1);

    if (lockoutRecord?.lockedUntil) {
      const until = new Date(lockoutRecord.lockedUntil).getTime();
      if (Date.now() < until) {
        const mins = Math.ceil((until - Date.now()) / 60000);
        return res.status(429).json({
          error: 'Account temporarily locked',
          message: `Too many failed attempts. Try again in ${mins} minutes.`,
        });
      }
      await db
        .delete(accountLockouts)
        .where(eq(accountLockouts.email, lockoutKey));
    }

    const baseSelect = {
      id: users.id,
      email: users.email,
      pinHash: users.pinHash,
      loginCode: users.loginCode,
      displayName: users.displayName,
      dateOfBirth: users.dateOfBirth,
      isMinor: users.isMinor,
    } as const;

    const [user] = loginCode
      ? await db
          .select(baseSelect)
          .from(users)
          .where(eq(users.loginCode, identifier))
          .limit(1)
      : await db
          .select(baseSelect)
          .from(users)
          .where(eq(users.email, identifier))
          .limit(1);

    if (!user || !user.pinHash) {
      await recordFailedLogin(lockoutKey);
      return res.status(401).json({ error: GENERIC_LOGIN_ERROR });
    }

    const ok = await bcrypt.compare(pin, user.pinHash);
    if (!ok) {
      await recordFailedLogin(lockoutKey);
      return res.status(401).json({ error: GENERIC_LOGIN_ERROR });
    }

    await clearFailedLogin(lockoutKey);

    let age: number | null = null;
    if (user.dateOfBirth) age = calculateAge(user.dateOfBirth);

    let guardianVerifiedAt: Date | string | null = null;
    const requiresGuardianVerification = age !== null && age < 16;
    if (requiresGuardianVerification) {
      const [v] = await db
        .select({ verifiedAt: guardianVerifications.verifiedAt })
        .from(guardianVerifications)
        .where(eq(guardianVerifications.userId, user.id))
        .limit(1);
      if (v?.verifiedAt) guardianVerifiedAt = v.verifiedAt;
    }

    // Rotate session + CSRF on privilege transition.
    await regenerateSession(req);
    (req.session as any).userId = user.id;
    (req.session as any).email = user.email;
    (req.session as any).age = age;
    (req.session as any).requiresGuardianVerification =
      requiresGuardianVerification;
    (req.session as any).guardianVerifiedAt =
      guardianVerifiedAt ||
      (requiresGuardianVerification ? null : new Date().toISOString());
    await saveSession(req);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        age,
        requiresGuardianVerification,
        guardianVerifiedAt: (req.session as any).guardianVerifiedAt,
      },
    });
  } catch (error) {
    logger.error(
      { err: error, context: 'pilot-youth-login' },
      'Pilot youth login error'
    );
    return res.status(500).json({ error: GENERIC_SERVER_ERROR });
  }
}

export async function logoutYouthPilot(
  req: Request,
  res: Response
): Promise<Response | void> {
  return new Promise<Response | void>((resolve) => {
    req.session.destroy((err) => {
      if (err) {
        logger.error(
          { err, context: 'pilot-youth-logout' },
          'Logout session destroy error'
        );
        return resolve(res.status(500).json({ error: GENERIC_SERVER_ERROR }));
      }
      res.clearCookie('connect.sid');
      resolve(res.json({ ok: true }));
    });
  });
}
