/**
 * server/routes/consent.js — SIGNUP-TIME consent + DSAR surface.
 *
 * This file is NOT the pilot consent runtime. Pilot program-consent
 * decisions (sign / decline / withdraw) live exclusively in
 * `server/pilot/consent/consentEngine.ts`, exposed via
 * `/api/pilot/consent` (mounted in server/index.js).
 *
 * What lives here:
 *   - Guardian-token verification flow consumed by `src/routes/VerifyConsent.tsx`:
 *       GET  /details/:token       JSON for the React verifier
 *       POST /submit/:token        Guardian submits the verification PIN
 *       GET  /view/:token          Server-rendered HTML landing page
 *       POST /agree/:token         Server-rendered HTML form submit
 *       GET  /confirm/:token       Server-rendered HTML confirmation page
 *       GET  /guardian-status      Youth checks "is my guardian verified?"
 *       POST /resend-guardian      Youth re-sends the verification email
 *   - Platform legal-consent + DSAR surface consumed by
 *     `src/routes/Settings.tsx` and `src/ui/me/PrivacyDashboard.tsx`:
 *       GET  /                     List user's platform consents
 *       GET  /my-consents          Same data as a {type: value} map
 *       POST /                     Update a platform consent value
 *       GET  /audit-trail          User-scoped consent audit
 *       GET  /export-data          DSAR export (PIPA right of access)
 *       POST /delete-account       DSAR delete (PIPA right of erasure)
 *       GET  /consent-audit/export Admin-only CSV of consent audit log
 *   - Older guardian helpers retained for compatibility:
 *       POST /guardian/request-verification, POST /guardian/verify/:token,
 *       GET  /guardian/status
 *
 * What was REMOVED in T041 (now served by the late 410 lockdown via
 * `PILOT_DISABLED_CONSENT_PREFIXES` in `server/pilot/flags.ts`):
 *   - POST /withdraw                 → /api/pilot/consent/requests/:id/withdraw
 *   - GET  /mature-minor/status      → none (out-of-pilot)
 *   - POST /mature-minor/submit      → none (out-of-pilot)
 *   - GET  /mature-minor/questions   → none (out-of-pilot)
 */
import express from 'express';
import { db } from '../db.js';
import { consents, consentEvents, profiles, consentAuditLog, xids, guardianVerifications, users, matureMinorAssessments } from '../schema.js';
import { parents, parentLinks } from '../schema.extras.js';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { Parser } from 'json2csv';
import {
  generateGuardianToken,
  verifyGuardianWithPIN,
  checkGuardianVerificationStatus,
  getConsentAuditTrail,
  exportUserData,
  deleteUserData,
} from '../services/consent.js';
import { sendGuardianVerificationEmail, sendInitialConsentEmail, sendConfirmationEmail, sendConsentCompleteEmail, sendConsentWithdrawalStaffNotification, sendParentPasswordSetupEmail } from '../services/email.js';
import { consentNoticeV1, CONSENT_NOTICE_VERSION, confirmationSuccessPage, pendingConfirmationPage, expiredLinkPage } from '../services/consentNotices.js';
import { getPublicUrl } from '../utils/publicUrl.ts';
import { debugLog } from '../utils/logger.ts';
import logger from '../logger.ts';
import { hashToken, verifyToken } from '../utils/tokenHash.ts';

const router = express.Router();

/**
 * SECURITY NOTE: Guardian consent token verification
 * 
 * Tokens are stored as SHA256 hashes in the database. When verifying:
 * 1. We hash the incoming token
 * 2. Use the hash for indexed database lookup (O(log n), no timing leak)
 * 3. The database performs the comparison, not application code
 * 
 * This approach is secure because:
 * - Tokens are one-way hashed (SHA256) before storage
 * - Database indexed lookups don't expose timing information
 * - An attacker with database access only sees hashes, not plaintext tokens
 * - The verifyToken function with constant-time comparison is available
 *   for cases where application-level comparison is needed
 */

// ========== JSON API ENDPOINTS FOR REACT COMPONENT ==========

/**
 * GET /consent/details/:token
 * Get consent details as JSON for React component
 */
router.get('/details/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const tokenHash = hashToken(token);
    
    const [verification] = await db.select({
      id: guardianVerifications.id,
      userId: guardianVerifications.userId,
      status: guardianVerifications.status,
      expiresAt: guardianVerifications.expiresAt,
      guardianContactValue: guardianVerifications.guardianContactValue,
      guardianName: guardianVerifications.guardianName,
      guardianRole: guardianVerifications.guardianRole,
    })
    .from(guardianVerifications)
    .where(eq(guardianVerifications.initialConsentToken, tokenHash))
    .limit(1);

    if (!verification) {
      return res.status(404).json({ error: 'Invalid or expired consent request' });
    }

    if (new Date() > new Date(verification.expiresAt)) {
      return res.status(410).json({ error: 'This consent request has expired' });
    }

    if (verification.status === 'confirmed') {
      return res.status(400).json({ error: 'Consent has already been confirmed', alreadyConfirmed: true });
    }

    if (verification.status !== 'pending_initial_consent' && verification.status !== 'pending_confirmation') {
      return res.status(400).json({ error: `Consent cannot be processed. Current status: ${verification.status}` });
    }

    const [profile] = await db.select({
      firstName: profiles.firstName,
    })
    .from(profiles)
    .where(eq(profiles.userId, verification.userId))
    .limit(1);

    const youthName = profile?.firstName || 'Your child';

    const formNonce = crypto.randomBytes(32).toString('hex');
    await db.update(guardianVerifications)
      .set({ formNonce })
      .where(eq(guardianVerifications.id, verification.id));
    
    res.json({
      youthName,
      guardianName: verification.guardianName,
      guardianRole: verification.guardianRole,
      status: verification.status,
      expiresAt: verification.expiresAt,
      scope: 'guardian_consent',
      formNonce,
    });
  } catch (error) {
    logger.error({ err: error, context: 'consent-details' }, 'Consent details error');
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

/**
 * POST /consent/submit/:token
 * Handle consent action (grant/deny) from React component
 */
router.post('/submit/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const tokenHash = hashToken(token);
    const { action, guardian_dob, _nonce } = req.body;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (!action || !['grant', 'deny'].includes(action)) {
      return res.status(400).json({ ok: false, error: 'Invalid action. Must be "grant" or "deny".' });
    }

    if (!guardian_dob) {
      return res.status(400).json({ ok: false, error: 'Guardian date of birth is required.' });
    }

    const age = Math.floor(
      (new Date().getTime() - new Date(guardian_dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );

    if (age < 18) {
      return res.status(400).json({ ok: false, error: 'You must be 18 or older to provide consent.' });
    }

    const [verification] = await db.select()
    .from(guardianVerifications)
    .where(eq(guardianVerifications.initialConsentToken, tokenHash))
    .limit(1);

    if (!verification) {
      return res.status(404).json({ ok: false, error: 'Invalid or expired consent request.' });
    }

    if (!_nonce || !verification.formNonce || _nonce !== verification.formNonce) {
      return res.status(403).json({ ok: false, error: 'Form expired. Please reload the page and try again.' });
    }

    if (verification.status === 'confirmed') {
      return res.status(400).json({ ok: false, error: 'Consent has already been confirmed.' });
    }

    if (verification.status !== 'pending_initial_consent') {
      return res.status(400).json({ ok: false, error: `Consent cannot be processed. Current status: ${verification.status}` });
    }

    if (new Date() > new Date(verification.expiresAt)) {
      return res.status(410).json({ ok: false, error: 'This consent request has expired.' });
    }

    if (action === 'deny') {
      await db.update(guardianVerifications)
        .set({
          status: 'denied',
          formNonce: null,
          initialConsentAt: new Date(),
          initialConsentIp: ipAddress,
          initialConsentUserAgent: userAgent,
        })
        .where(eq(guardianVerifications.id, verification.id));

      await db.insert(consentEvents).values({
        userId: verification.userId,
        actor: 'guardian',
        eventType: 'guardian_consent_denied',
        consentKey: 'guardian_verification',
        newValue: false,
        ipAddress,
        userAgent,
        notes: `Guardian denied consent. Version: ${CONSENT_NOTICE_VERSION}`,
      });

      return res.json({ ok: true, message: 'Your response has been recorded. Consent was denied.' });
    }

    const confirmationToken = crypto.randomBytes(32).toString('hex');

    await db.update(guardianVerifications)
      .set({
        status: 'pending_confirmation',
        formNonce: null,
        initialConsentAt: new Date(),
        initialConsentIp: ipAddress,
        initialConsentUserAgent: userAgent,
        confirmationToken: confirmationToken,
        confirmationSentAt: new Date(),
      })
      .where(eq(guardianVerifications.id, verification.id));

    const [profile] = await db.select({
      firstName: profiles.firstName,
    })
    .from(profiles)
    .where(eq(profiles.userId, verification.userId))
    .limit(1);

    const youthName = profile?.firstName || 'Your child';
    const baseUrl = getPublicUrl(req);
    const confirmationLink = `${baseUrl}/api/consent/confirm/${confirmationToken}`;

    try {
      await sendConfirmationEmail({
        guardianEmail: verification.guardianContactValue,
        youthName,
        confirmationLink,
      });
    } catch (emailError) {
      logger.error({ err: emailError, context: 'consent-submit-email' }, 'Failed to send confirmation email');
    }

    await db.insert(consentEvents).values({
      userId: verification.userId,
      actor: 'guardian',
      eventType: 'guardian_consent_initial',
      consentKey: 'guardian_verification',
      newValue: true,
      ipAddress,
      userAgent,
      notes: `Guardian initial consent granted. Confirmation email sent. Version: ${CONSENT_NOTICE_VERSION}`,
    });

    res.json({ 
      ok: true, 
      message: 'Thank you! A confirmation email has been sent. Please check your inbox and click the confirmation link to complete the consent process.',
      pendingConfirmation: true,
    });
  } catch (error) {
    logger.error({ err: error, context: 'consent-submit' }, 'Consent submit error');
    res.status(500).json({ ok: false, error: 'Something went wrong. Please try again.' });
  }
});

// ========== TWO-STEP EMAIL PLUS CONSENT FLOW ==========

/**
 * GET /consent/view/:token
 * Display the full consent notice for parent to review
 */
router.get('/view/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const tokenHash = hashToken(token);
    
    const [verification] = await db.select({
      id: guardianVerifications.id,
      userId: guardianVerifications.userId,
      status: guardianVerifications.status,
      expiresAt: guardianVerifications.expiresAt,
      guardianContactValue: guardianVerifications.guardianContactValue,
    })
    .from(guardianVerifications)
    .where(eq(guardianVerifications.initialConsentToken, tokenHash))
    .limit(1);

    if (!verification) {
      return res.status(404).send(expiredLinkPage());
    }

    if (verification.status !== 'pending_initial_consent') {
      return res.status(400).send(`
        <html><body style="font-family: sans-serif; padding: 40px; text-align: center;">
        <h1>Consent Already Processed</h1>
        <p>This consent form has already been submitted. Current status: ${verification.status}</p>
        </body></html>
      `);
    }

    if (new Date() > new Date(verification.expiresAt)) {
      return res.status(410).send(expiredLinkPage());
    }

    // Generate a one-time form nonce for CSRF protection
    const formNonce = crypto.randomBytes(32).toString('hex');
    await db.update(guardianVerifications)
      .set({ formNonce })
      .where(eq(guardianVerifications.id, verification.id));

    const [profile] = await db.select({
      firstName: profiles.firstName,
    })
    .from(profiles)
    .where(eq(profiles.userId, verification.userId))
    .limit(1);

    const youthName = profile?.firstName || 'Your child';
    
    res.send(consentNoticeV1(youthName, token, formNonce));
  } catch (error) {
    logger.error({ err: error, context: 'consent-view' }, 'Consent view error');
    res.status(500).send('<html><body><h1>Error</h1><p>Something went wrong. Please try again.</p></body></html>');
  }
});

/**
 * POST /consent/agree/:token
 * Handle parent's initial consent agreement (Step 1)
 * After this, send confirmation email (Step 2)
 */
router.post('/agree/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const tokenHash = hashToken(token);
    const { _nonce } = req.body;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const [verification] = await db.select()
    .from(guardianVerifications)
    .where(eq(guardianVerifications.initialConsentToken, tokenHash))
    .limit(1);

    if (!verification) {
      return res.status(404).send(expiredLinkPage());
    }

    // Validate one-time form nonce (CSRF protection)
    if (!_nonce || !verification.formNonce || _nonce !== verification.formNonce) {
      return res.status(403).send(`
        <html><body style="font-family: sans-serif; padding: 40px; text-align: center;">
        <h1>Form Expired</h1>
        <p>This form has expired or was already submitted. Please reload the consent page and try again.</p>
        <a href="/api/consent/view/${token}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px;">Reload Consent Page</a>
        </body></html>
      `);
    }

    if (verification.status !== 'pending_initial_consent') {
      return res.status(400).send(`
        <html><body style="font-family: sans-serif; padding: 40px; text-align: center;">
        <h1>Consent Already Processed</h1>
        <p>This consent form has already been submitted.</p>
        </body></html>
      `);
    }

    if (new Date() > new Date(verification.expiresAt)) {
      return res.status(410).send(expiredLinkPage());
    }

    const confirmationToken = crypto.randomBytes(32).toString('hex');

    // Clear the form nonce after use (one-time token) and update status
    await db.update(guardianVerifications)
      .set({
        status: 'pending_confirmation',
        formNonce: null, // Clear nonce after use
        initialConsentAt: new Date(),
        initialConsentIp: ipAddress,
        initialConsentUserAgent: userAgent,
        confirmationToken: confirmationToken,
        confirmationSentAt: new Date(),
      })
      .where(eq(guardianVerifications.id, verification.id));

    const [profile] = await db.select({
      firstName: profiles.firstName,
    })
    .from(profiles)
    .where(eq(profiles.userId, verification.userId))
    .limit(1);

    const youthName = profile?.firstName || 'Your child';
    const baseUrl = getPublicUrl(req);
    const confirmationLink = `${baseUrl}/api/consent/confirm/${confirmationToken}`;

    await sendConfirmationEmail({
      guardianEmail: verification.guardianContactValue,
      youthName,
      confirmationLink,
    });

    res.send(pendingConfirmationPage(verification.guardianContactValue));
  } catch (error) {
    logger.error({ err: error, context: 'consent-agree' }, 'Consent agree error');
    res.status(500).send('<html><body><h1>Error</h1><p>Something went wrong. Please try again.</p></body></html>');
  }
});

/**
 * GET /consent/confirm/:token
 * Handle final confirmation click from second email (Step 2)
 * This completes the consent process and creates parent account
 */
router.get('/confirm/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const [verification] = await db.select()
    .from(guardianVerifications)
    .where(eq(guardianVerifications.confirmationToken, token))
    .limit(1);

    if (!verification) {
      return res.status(404).send(expiredLinkPage());
    }

    if (verification.status === 'confirmed') {
      const [profile] = await db.select({ firstName: profiles.firstName })
        .from(profiles)
        .where(eq(profiles.userId, verification.userId))
        .limit(1);
      return res.send(confirmationSuccessPage(profile?.firstName || 'Your child'));
    }

    if (verification.status !== 'pending_confirmation') {
      return res.status(400).send(`
        <html><body style="font-family: sans-serif; padding: 40px; text-align: center;">
        <h1>Invalid Status</h1>
        <p>This consent link cannot be processed. Current status: ${verification.status}</p>
        </body></html>
      `);
    }

    if (new Date() > new Date(verification.expiresAt)) {
      return res.status(410).send(expiredLinkPage());
    }

    const confirmedAt = new Date();

    await db.update(guardianVerifications)
      .set({
        status: 'confirmed',
        confirmedAt: confirmedAt,
        confirmedIp: ipAddress,
        confirmedUserAgent: userAgent,
        verifiedAt: confirmedAt,
        verifiedByIp: ipAddress,
      })
      .where(eq(guardianVerifications.id, verification.id));

    const [profile] = await db.select({
      firstName: profiles.firstName,
    })
    .from(profiles)
    .where(eq(profiles.userId, verification.userId))
    .limit(1);

    const youthName = profile?.firstName || 'Your child';
    const guardianEmail = verification.guardianContactValue.toLowerCase().trim();
    const guardianName = verification.guardianName || null;
    const baseUrl = getPublicUrl(req);

    // Create or update parent account with password setup token
    const passwordSetupToken = crypto.randomBytes(32).toString('hex');
    const passwordSetupExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    let parentId;
    const [existingParent] = await db.select()
      .from(parents)
      .where(eq(parents.email, guardianEmail))
      .limit(1);

    if (existingParent) {
      // Update existing parent with new verification link
      parentId = existingParent.id;
      if (!existingParent.passwordHash) {
        // Only update token if they haven't set a password yet
        await db.update(parents)
          .set({
            name: guardianName || existingParent.name,
            guardianVerificationId: verification.id,
            passwordSetupToken,
            passwordSetupExpires,
            updatedAt: new Date(),
          })
          .where(eq(parents.id, existingParent.id));
      } else {
        // Already has password, just update verification ID
        await db.update(parents)
          .set({
            guardianVerificationId: verification.id,
            updatedAt: new Date(),
          })
          .where(eq(parents.id, existingParent.id));
      }
    } else {
      // Create new parent account
      const [newParent] = await db.insert(parents)
        .values({
          email: guardianEmail,
          name: guardianName,
          guardianVerificationId: verification.id,
          passwordSetupToken,
          passwordSetupExpires,
        })
        .returning();
      parentId = newParent.id;
    }

    // Create parent-youth link if it doesn't exist
    const [existingLink] = await db.select()
      .from(parentLinks)
      .where(and(
        eq(parentLinks.parentId, parentId),
        eq(parentLinks.userId, verification.userId)
      ))
      .limit(1);

    if (!existingLink) {
      await db.insert(parentLinks).values({
        parentId,
        userId: verification.userId,
        relation: verification.guardianRole || 'guardian',
        verifiedAt: confirmedAt,
      });
    } else if (!existingLink.verifiedAt) {
      await db.update(parentLinks)
        .set({ verifiedAt: confirmedAt })
        .where(eq(parentLinks.id, existingLink.id));
    }

    // Send consent complete email
    try {
      await sendConsentCompleteEmail({
        guardianEmail: verification.guardianContactValue,
        youthName,
        consentDate: confirmedAt.toLocaleDateString('en-CA', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Edmonton'
        }),
      });
    } catch (emailError) {
      logger.error({ err: emailError, context: 'consent-confirm-email' }, 'Failed to send consent complete email');
    }

    // Send password setup email if parent hasn't set password yet
    const shouldSendPasswordEmail = !existingParent?.passwordHash;
    if (shouldSendPasswordEmail) {
      try {
        const passwordSetupLink = `${baseUrl}/parent/set-password/${passwordSetupToken}`;
        await sendParentPasswordSetupEmail({
          guardianEmail,
          guardianName,
          youthName,
          passwordSetupLink,
        });
        logger.info({ context: 'consent-confirm', email: '[REDACTED]' }, 'Parent password setup email sent');
      } catch (emailError) {
        logger.error({ err: emailError, context: 'consent-confirm-password-email' }, 'Failed to send parent password setup email');
      }
    }

    await db.insert(consentEvents).values({
      userId: verification.userId,
      actor: 'guardian',
      eventType: 'guardian_consent_confirmed',
      consentKey: 'guardian_verification',
      newValue: true,
      ipAddress,
      userAgent,
      notes: `Two-step Email Plus consent confirmed. Version: ${CONSENT_NOTICE_VERSION}. Parent account ${existingParent ? 'linked' : 'created'}.`,
    });

    res.send(confirmationSuccessPage(youthName));
  } catch (error) {
    logger.error({ err: error, context: 'consent-confirm' }, 'Consent confirm error');
    res.status(500).send('<html><body><h1>Error</h1><p>Something went wrong. Please try again.</p></body></html>');
  }
});

/**
 * GET /consent/guardian-status
 * Get current user's guardian consent status (for Settings page)
 */
router.get('/guardian-status', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const verifications = await db.select({
      id: guardianVerifications.id,
      status: guardianVerifications.status,
      guardianContactValue: guardianVerifications.guardianContactValue,
      guardianName: guardianVerifications.guardianName,
      guardianRole: guardianVerifications.guardianRole,
      expiresAt: guardianVerifications.expiresAt,
      consentNoticeSentAt: guardianVerifications.consentNoticeSentAt,
      verifiedAt: guardianVerifications.verifiedAt,
    })
    .from(guardianVerifications)
    .where(eq(guardianVerifications.userId, req.session.userId))
    .orderBy(desc(guardianVerifications.createdAt));

    if (verifications.length === 0) {
      return res.json({ required: false, guardians: [] });
    }

    const guardians = verifications.map(v => {
      const isExpired = new Date() > new Date(v.expiresAt);
      return {
        id: v.id,
        status: v.status,
        guardianEmail: v.guardianContactValue,
        guardianName: v.guardianName,
        guardianRole: v.guardianRole,
        sentAt: v.consentNoticeSentAt,
        expiresAt: v.expiresAt,
        verifiedAt: v.verifiedAt,
        isExpired: isExpired && v.status !== 'confirmed',
        canResend: isExpired || ['pending_initial_consent', 'pending_confirmation'].includes(v.status),
      };
    });

    res.json({
      required: true,
      guardians
    });
  } catch (error) {
    logger.error({ err: error, context: 'consent-guardian-status' }, 'Guardian status check error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /consent/resend-guardian
 * Resend guardian consent email with new token (for expired or unread links)
 */
router.post('/resend-guardian', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    debugLog('Resend Guardian', 'Starting for userId:', req.session.userId);

    const [verification] = await db.select()
      .from(guardianVerifications)
      .where(eq(guardianVerifications.userId, req.session.userId))
      .limit(1);

    if (!verification) {
      debugLog('Resend Guardian', 'No verification found for userId:', req.session.userId);
      return res.status(404).json({ error: 'No guardian verification found' });
    }

    debugLog('Resend Guardian', 'Found verification:', verification.id, 'status:', verification.status);

    if (verification.status === 'confirmed') {
      return res.status(400).json({ error: 'Guardian has already verified consent' });
    }

    const newToken = crypto.randomBytes(32).toString('hex');
    const newTokenHash = hashToken(newToken);
    const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    debugLog('Resend Guardian', 'Updating verification with new token, expiry:', newExpiry.toISOString());

    // Store the HASH of the token, not the plaintext
    await db.update(guardianVerifications)
      .set({
        initialConsentToken: newTokenHash,
        status: 'pending_initial_consent',
        expiresAt: newExpiry,
        consentNoticeSentAt: new Date(),
        confirmationToken: null,
        confirmationSentAt: null,
        initialConsentAt: null,
        initialConsentIp: null,
        initialConsentUserAgent: null,
      })
      .where(eq(guardianVerifications.id, verification.id));

    debugLog('Resend Guardian', 'Database updated successfully');

    const [profile] = await db.select({
      firstName: profiles.firstName,
    })
    .from(profiles)
    .where(eq(profiles.userId, req.session.userId))
    .limit(1);

    const youthName = profile?.firstName || 'Your child';
    const baseUrl = getPublicUrl(req);
    // Use the PLAINTEXT token in the email link (guardian clicks this)
    const consentViewUrl = `${baseUrl}/api/consent/view/${newToken}`;

    debugLog('Resend Guardian', 'Sending email to:', verification.guardianContactValue, 'link:', consentViewUrl);

    try {
      await sendInitialConsentEmail({
        guardianEmail: verification.guardianContactValue,
        guardianName: verification.guardianName || 'Guardian',
        youthName,
        consentLink: consentViewUrl,
      });
      debugLog('Resend Guardian', 'Email sent successfully');
      
      res.json({ 
        success: true, 
        message: 'Consent request sent successfully!',
        emailSent: true,
        expiresAt: newExpiry.toISOString(),
        consentLink: consentViewUrl,
      });
    } catch (emailError) {
      logger.error({ err: emailError, context: 'consent-resend-guardian-email' }, 'Email send failed');
      
      res.status(207).json({ 
        success: false, 
        message: 'Email could not be sent. Please share the link directly with your parent/guardian.',
        emailSent: false,
        emailError: emailError.message || 'Email delivery failed',
        expiresAt: newExpiry.toISOString(),
        consentLink: consentViewUrl,
      });
    }
  } catch (error) {
    logger.error({ err: error, context: 'consent-resend-guardian' }, 'Unexpected error');
    res.status(500).json({ error: 'Failed to resend consent. Please try again.' });
  }
});

// ========== END TWO-STEP EMAIL PLUS CONSENT FLOW ==========

// Get user's consents
router.get('/', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userConsents = await db.select().from(consents)
      .where(eq(consents.userId, req.session.userId));

    res.json(userConsents);
  } catch (error) {
    logger.error({ err: error, context: 'consent-get' }, 'Get consents error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's consents as a map (for Privacy Dashboard)
router.get('/my-consents', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userConsents = await db.select().from(consents)
      .where(eq(consents.userId, req.session.userId));

    // Convert array to map of consentType -> value
    const consentsMap = userConsents.reduce((acc, consent) => {
      acc[consent.consentType] = consent.value;
      return acc;
    }, {});

    res.json({ data: consentsMap });
  } catch (error) {
    logger.error({ err: error, context: 'consent-map' }, 'Get consents map error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update consent
router.post('/', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { consentType, value, grantedBy = 'self' } = req.body;

    if (!consentType || value === undefined) {
      return res.status(400).json({ error: 'consentType and value are required' });
    }

    const validTypes = [
      'terms_of_use', 'privacy_notice', 'data_collection',
      'photo_internal', 'photo_social_media', 'photo_website',
      'photo_fundraising', 'photo_story',
      'analytics_opt_in', 'ai_personalization', 'crash_reporting',
      'marketing_email', 'marketing_sms'
    ];

    if (!validTypes.includes(consentType)) {
      return res.status(400).json({ error: 'Invalid consent type' });
    }

    // Get IP and user agent
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Find existing consent
    const [existing] = await db.select().from(consents)
      .where(and(
        eq(consents.userId, req.session.userId),
        eq(consents.consentType, consentType)
      ))
      .limit(1);

    let result;
    if (existing) {
      // Update
      [result] = await db.update(consents)
        .set({
          value,
          ipAddress,
          userAgent,
          grantedBy,
          updatedAt: new Date(),
        })
        .where(and(
          eq(consents.userId, req.session.userId),
          eq(consents.consentType, consentType)
        ))
        .returning();
    } else {
      // Insert
      [result] = await db.insert(consents)
        .values({
          userId: req.session.userId,
          consentType,
          value,
          ipAddress,
          userAgent,
          grantedBy,
        })
        .returning();
    }

    // Log consent event
    await db.insert(consentEvents).values({
      userId: req.session.userId,
      actor: grantedBy,
      eventType: value ? 'granted' : 'revoked',
      consentKey: consentType,
      oldValue: existing?.value || false,
      newValue: value,
      ipAddress,
      userAgent,
    });

    // Log to consent audit log with anonymized user_xid
    try {
      // Get user's XID hash
      const [userXid] = await db.select({ xidHash: xids.xidHash })
        .from(xids)
        .where(eq(xids.userId, req.session.userId))
        .limit(1);

      const userXidHash = userXid?.xidHash || `user_${req.session.userId.substring(0, 8)}`;

      // Hash IP address for privacy
      const ipHash = ipAddress 
        ? crypto.createHash('sha256').update(ipAddress).digest('hex').substring(0, 16)
        : null;

      await db.insert(consentAuditLog).values({
        userXid: userXidHash,
        consentType,
        action: value ? 'granted' : 'revoked',
        previousValue: existing?.value || null,
        newValue: value,
        source: grantedBy,
        ipAddressHash: ipHash,
        userAgent,
      });
    } catch (auditError) {
      logger.error({ err: auditError, context: 'consent-audit-log' }, 'Failed to log to consent audit log');
      // Don't fail the request if audit logging fails
    }

    res.json(result);
  } catch (error) {
    logger.error({ err: error, context: 'consent-update' }, 'Update consent error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Guardian verification - request
router.post('/guardian/request-verification', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { guardianContactType, guardianContactValue } = req.body;
    
    if (!guardianContactType || !guardianContactValue) {
      return res.status(400).json({ error: 'Guardian contact information required' });
    }
    
    // Validate contact type
    if (guardianContactType !== 'email') {
      return res.status(400).json({ error: 'Only email verification is supported at this time' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guardianContactValue)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    
    // Get youth's name for email personalization
    const [profile] = await db.select().from(profiles)
      .where(eq(profiles.id, req.session.userId))
      .limit(1);
    
    const youthName = profile?.name || 'A youth';
    
    // Generate verification token
    const token = await generateGuardianToken({
      userId: req.session.userId,
      guardianContactType,
      guardianContactValue,
    });
    
    const verificationLink = `${getPublicUrl(req)}/guardian/verify/${token}`;
    
    // Send verification email to guardian
    await sendGuardianVerificationEmail({
      guardianEmail: guardianContactValue,
      youthName,
      verificationLink,
    });
    
    res.json({
      message: 'Guardian verification email sent successfully. Please check your guardian\'s inbox.',
      pending: true,
    });
  } catch (error) {
    logger.error({ err: error, context: 'consent-guardian-request' }, 'Guardian verification request error');
    res.status(500).json({ 
      error: 'Failed to send verification email. Please try again or contact support.' 
    });
  }
});

// Guardian verification - verify with PIN
router.post('/guardian/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { pin, guardianName } = req.body;
    
    if (!pin || !guardianName) {
      return res.status(400).json({ error: 'PIN and guardian name required' });
    }
    
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    await verifyGuardianWithPIN(token, pin, guardianName, ipAddress);
    
    res.json({ message: 'Guardian verification completed successfully' });
  } catch (error) {
    logger.error({ err: error, context: 'consent-guardian-verify' }, 'Guardian verification error');
    res.status(400).json({ error: error.message || 'Failed to verify guardian' });
  }
});

// Guardian verification - check status
router.get('/guardian/status', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const status = await checkGuardianVerificationStatus(req.session.userId);
    
    res.json({ data: status });
  } catch (error) {
    logger.error({ err: error, context: 'consent-guardian-status' }, 'Guardian status check error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Privacy - audit trail
router.get('/audit-trail', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const events = await getConsentAuditTrail(req.session.userId);
    
    res.json({ data: events });
  } catch (error) {
    logger.error({ err: error, context: 'consent-audit-trail' }, 'Audit trail error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Privacy - export data (PIPA compliance)
router.get('/export-data', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const data = await exportUserData(req.session.userId);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="room-xi-data-export-${req.session.userId}.json"`);
    res.json(data);
  } catch (error) {
    logger.error({ err: error, context: 'consent-data-export' }, 'Data export error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Privacy - delete account
router.post('/delete-account', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { confirmation } = req.body;
    
    if (confirmation !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({ error: 'Confirmation text must match exactly: DELETE MY ACCOUNT' });
    }
    
    await deleteUserData(req.session.userId);
    
    req.session.destroy((err) => {
      if (err) {
        logger.error({ err, context: 'consent-delete-session' }, 'Session destroy error');
      }
    });
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    logger.error({ err: error, context: 'consent-delete-account' }, 'Account deletion error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Consent Audit Log - CSV Export (Admin only)
router.get('/consent-audit/export', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if user is admin
    const [profile] = await db.select()
      .from(profiles)
      .where(eq(profiles.userId, req.session.userId))
      .limit(1);

    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required for consent audit export' });
    }

    // Query consent audit log with optional date filters
    const { startDate, endDate } = req.query;
    
    let query = db.select().from(consentAuditLog).orderBy(desc(consentAuditLog.timestamp));
    
    // Apply date filters if provided
    if (startDate || endDate) {
      // Date filtering would be added here if needed
      // For now, return all records
    }

    const auditRecords = await query;

    if (auditRecords.length === 0) {
      return res.status(404).json({ 
        error: 'No consent audit records found',
        message: 'The consent audit log is empty'
      });
    }

    // Format data for CSV export
    const csvData = auditRecords.map(record => ({
      id: record.id,
      user_xid: record.userXid,
      consent_type: record.consentType,
      action: record.action,
      previous_value: record.previousValue !== null ? record.previousValue.toString() : '',
      new_value: record.newValue !== null ? record.newValue.toString() : '',
      source: record.source || '',
      ip_address_hash: record.ipAddressHash || '',
      user_agent: record.userAgent || '',
      timestamp: record.timestamp ? new Date(record.timestamp).toISOString() : ''
    }));

    // Convert to CSV
    const json2csvParser = new Parser({
      fields: [
        { label: 'ID', value: 'id' },
        { label: 'User XID', value: 'user_xid' },
        { label: 'Consent Type', value: 'consent_type' },
        { label: 'Action', value: 'action' },
        { label: 'Previous Value', value: 'previous_value' },
        { label: 'New Value', value: 'new_value' },
        { label: 'Source', value: 'source' },
        { label: 'IP Hash', value: 'ip_address_hash' },
        { label: 'User Agent', value: 'user_agent' },
        { label: 'Timestamp', value: 'timestamp' }
      ]
    });
    
    const csv = json2csvParser.parse(csvData);
    
    // Set headers for CSV download
    const filename = `consent-audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
    
  } catch (error) {
    logger.error({ err: error, context: 'consent-audit-export' }, 'Consent audit export error');
    res.status(500).json({ 
      error: 'Failed to export consent audit log',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


/* ──────────────────────────────────────────────────────────────────── */
/* RETIRED HANDLERS — covered by PILOT_DISABLED_CONSENT_PREFIXES        */
/* ──────────────────────────────────────────────────────────────────── */
/*
 * The following routes have been removed from this router. Under
 * PILOT_MODE they are served by the early 410 lockdown registered in
 * `mountPilotRoutes` (see `server/pilot/flags.ts`
 * PILOT_DISABLED_CONSENT_PREFIXES):
 *
 *   POST /api/consent/withdraw          → /api/pilot/consent/requests/:id/withdraw
 *   GET  /api/consent/mature-minor/*    → none (out-of-pilot)
 *   POST /api/consent/mature-minor/*    → none (out-of-pilot)
 *
 * Pilot consent decisions (sign / decline / withdraw) live in
 * `server/pilot/consent/consentEngine.ts` and are exposed via the
 * canonical wallet at `/api/pilot/consent`. The handlers that remain in
 * this file are the SIGNUP-TIME guardian-token verification flow
 * (/details, /submit, /view, /agree, /confirm, /guardian-status,
 * /resend-guardian) and the LEGAL/DSAR surface (/, /my-consents,
 * /audit-trail, /export-data, /delete-account, /consent-audit/export).
 * Those handlers are NOT pilot consent runtime — they are identity and
 * data-rights endpoints, intentionally NOT in the disabled list.
 */

export default router;
