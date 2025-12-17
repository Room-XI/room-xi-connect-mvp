import express from 'express';
import { db } from '../db.js';
import { consents, consentEvents, profiles, consentAuditLog, xids, guardianVerifications, users, matureMinorAssessments } from '../schema.js';
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
import { sendGuardianVerificationEmail, sendInitialConsentEmail, sendConfirmationEmail, sendConsentCompleteEmail, sendConsentWithdrawalStaffNotification } from '../services/email.js';
import { consentNoticeV1, CONSENT_NOTICE_VERSION, confirmationSuccessPage, pendingConfirmationPage, expiredLinkPage } from '../services/consentNotices.js';

const router = express.Router();

// ========== TWO-STEP EMAIL PLUS CONSENT FLOW ==========

/**
 * GET /consent/view/:token
 * Display the full consent notice for parent to review
 */
router.get('/view/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const [verification] = await db.select({
      id: guardianVerifications.id,
      userId: guardianVerifications.userId,
      status: guardianVerifications.status,
      expiresAt: guardianVerifications.expiresAt,
      guardianContactValue: guardianVerifications.guardianContactValue,
    })
    .from(guardianVerifications)
    .where(eq(guardianVerifications.initialConsentToken, token))
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

    const [profile] = await db.select({
      firstName: profiles.firstName,
    })
    .from(profiles)
    .where(eq(profiles.userId, verification.userId))
    .limit(1);

    const youthName = profile?.firstName || 'Your child';
    
    res.send(consentNoticeV1(youthName, token));
  } catch (error) {
    console.error('Consent view error:', error);
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
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const [verification] = await db.select()
    .from(guardianVerifications)
    .where(eq(guardianVerifications.initialConsentToken, token))
    .limit(1);

    if (!verification) {
      return res.status(404).send(expiredLinkPage());
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

    await db.update(guardianVerifications)
      .set({
        status: 'pending_confirmation',
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
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const confirmationLink = `${baseUrl}/api/consent/confirm/${confirmationToken}`;

    await sendConfirmationEmail({
      guardianEmail: verification.guardianContactValue,
      youthName,
      confirmationLink,
    });

    res.send(pendingConfirmationPage(verification.guardianContactValue));
  } catch (error) {
    console.error('Consent agree error:', error);
    res.status(500).send('<html><body><h1>Error</h1><p>Something went wrong. Please try again.</p></body></html>');
  }
});

/**
 * GET /consent/confirm/:token
 * Handle final confirmation click from second email (Step 2)
 * This completes the consent process
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
      console.error('Failed to send consent complete email:', emailError);
    }

    await db.insert(consentEvents).values({
      userId: verification.userId,
      actor: 'guardian',
      eventType: 'guardian_consent_confirmed',
      consentKey: 'guardian_verification',
      newValue: true,
      ipAddress,
      userAgent,
      notes: `Two-step Email Plus consent confirmed. Version: ${CONSENT_NOTICE_VERSION}`,
    });

    res.send(confirmationSuccessPage(youthName));
  } catch (error) {
    console.error('Consent confirm error:', error);
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

    const [verification] = await db.select({
      id: guardianVerifications.id,
      status: guardianVerifications.status,
      guardianContactValue: guardianVerifications.guardianContactValue,
      guardianName: guardianVerifications.guardianName,
      expiresAt: guardianVerifications.expiresAt,
      consentNoticeSentAt: guardianVerifications.consentNoticeSentAt,
      verifiedAt: guardianVerifications.verifiedAt,
    })
    .from(guardianVerifications)
    .where(eq(guardianVerifications.userId, req.session.userId))
    .limit(1);

    if (!verification) {
      return res.json({ required: false, status: null });
    }

    const isExpired = new Date() > new Date(verification.expiresAt);

    res.json({
      required: true,
      status: verification.status,
      guardianEmail: verification.guardianContactValue,
      guardianName: verification.guardianName,
      sentAt: verification.consentNoticeSentAt,
      expiresAt: verification.expiresAt,
      verifiedAt: verification.verifiedAt,
      isExpired: isExpired && verification.status !== 'confirmed',
      canResend: isExpired || ['pending_initial_consent', 'pending_confirmation'].includes(verification.status),
    });
  } catch (error) {
    console.error('Guardian status check error:', error);
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

    const [verification] = await db.select()
      .from(guardianVerifications)
      .where(eq(guardianVerifications.userId, req.session.userId))
      .limit(1);

    if (!verification) {
      return res.status(404).json({ error: 'No guardian verification found' });
    }

    if (verification.status === 'confirmed') {
      return res.status(400).json({ error: 'Guardian has already verified consent' });
    }

    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.update(guardianVerifications)
      .set({
        initialConsentToken: newToken,
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

    const [profile] = await db.select({
      firstName: profiles.firstName,
    })
    .from(profiles)
    .where(eq(profiles.userId, req.session.userId))
    .limit(1);

    const youthName = profile?.firstName || 'Your child';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['host'] || req.headers['x-forwarded-host'];
    const baseUrl = host ? `${protocol}://${host}` : 'https://localhost:5000';
    const consentViewUrl = `${baseUrl}/api/consent/view/${newToken}`;

    try {
      await sendInitialConsentEmail({
        guardianEmail: verification.guardianContactValue,
        guardianName: verification.guardianName || 'Guardian',
        youthName,
        consentLink: consentViewUrl,
        expiresIn: '24 hours',
      });
    } catch (emailError) {
      console.error('Failed to resend consent email:', emailError);
      return res.status(500).json({ error: 'Failed to send email. Please try again.' });
    }

    res.json({ 
      success: true, 
      message: 'Consent request resent successfully',
      expiresAt: newExpiry.toISOString(),
      consentLink: consentViewUrl,
    });
  } catch (error) {
    console.error('Resend guardian consent error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    console.error('Get consents error:', error);
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
    console.error('Get consents map error:', error);
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
      console.error('Failed to log to consent audit log:', auditError);
      // Don't fail the request if audit logging fails
    }

    res.json(result);
  } catch (error) {
    console.error('Update consent error:', error);
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
    
    const verificationLink = `${req.protocol}://${req.get('host')}/guardian/verify/${token}`;
    
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
    console.error('Guardian verification request error:', error);
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
    console.error('Guardian verification error:', error);
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
    console.error('Guardian status check error:', error);
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
    console.error('Audit trail error:', error);
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
    console.error('Data export error:', error);
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
        console.error('Session destroy error:', err);
      }
    });
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Account deletion error:', error);
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
    console.error('Consent audit export error:', error);
    res.status(500).json({ 
      error: 'Failed to export consent audit log',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========== SOFT CONSENT WITHDRAWAL FLOW ==========

/**
 * POST /consent/withdraw
 * Allow guardian to withdraw consent (soft withdrawal - youth keeps access)
 * This triggers the mature minor assessment on next youth login
 */
router.post('/withdraw', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const withdrawalTimestamp = new Date();

    // Find the guardian verification for this user (could be parent session or youth session with verification)
    const { youthUserId } = req.body;
    const targetUserId = youthUserId || req.session.userId;

    // Get the guardian verification
    const [verification] = await db.select()
      .from(guardianVerifications)
      .where(eq(guardianVerifications.userId, targetUserId))
      .limit(1);

    if (!verification) {
      return res.status(404).json({ error: 'No guardian verification found for this user' });
    }

    // Verify the request is from an authorized source (the guardian's email match or admin)
    // For now, we allow the youth to request withdrawal on behalf of the parent 
    // (parent would have clicked a link in email that sets up this session)

    if (verification.status === 'consent_withdrawn') {
      return res.status(400).json({ error: 'Consent has already been withdrawn' });
    }

    // Update guardian verification to withdrawn status
    await db.update(guardianVerifications)
      .set({
        status: 'consent_withdrawn',
        withdrawnAt: withdrawalTimestamp,
        withdrawalIp: ipAddress,
        withdrawalUserAgent: userAgent,
      })
      .where(eq(guardianVerifications.id, verification.id));

    // Get youth and user details for notification
    const [profile] = await db.select({
      firstName: profiles.firstName,
      lastName: profiles.lastName,
    })
    .from(profiles)
    .where(eq(profiles.userId, targetUserId))
    .limit(1);

    const [user] = await db.select({
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

    const youthName = profile?.firstName 
      ? `${profile.firstName}${profile.lastName ? ' ' + profile.lastName : ''}`
      : 'Youth User';

    // Log to consent events
    await db.insert(consentEvents).values({
      userId: targetUserId,
      actor: 'guardian',
      eventType: 'consent_withdrawn',
      consentKey: 'guardian_verification',
      oldValue: true,
      newValue: false,
      ipAddress,
      userAgent,
      notes: `Soft consent withdrawal - youth retains app access. Parent portal disabled, third-party sharing stopped.`,
    });

    // Log to consent audit log
    try {
      const [userXid] = await db.select({ xidHash: xids.xidHash })
        .from(xids)
        .where(eq(xids.userId, targetUserId))
        .limit(1);

      const userXidHash = userXid?.xidHash || `user_${targetUserId.substring(0, 8)}`;
      const ipHash = ipAddress 
        ? crypto.createHash('sha256').update(ipAddress).digest('hex').substring(0, 16)
        : null;

      await db.insert(consentAuditLog).values({
        userXid: userXidHash,
        consentType: 'guardian_consent',
        action: 'withdrawn',
        previousValue: true,
        newValue: false,
        source: 'guardian',
        ipAddressHash: ipHash,
        userAgent,
      });
    } catch (auditError) {
      console.error('Failed to log to consent audit log:', auditError);
    }

    // Send staff notification email
    try {
      await sendConsentWithdrawalStaffNotification({
        youthName,
        youthEmail: user?.email || 'Unknown',
        parentEmail: verification.guardianContactValue,
        withdrawalTimestamp: withdrawalTimestamp.toLocaleString('en-CA', {
          timeZone: 'America/Edmonton',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        youthId: targetUserId,
      });
    } catch (emailError) {
      console.error('Failed to send staff notification email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Consent withdrawn successfully. Youth retains access to the app.',
      details: {
        youthAccessMaintained: true,
        parentPortalDisabled: true,
        thirdPartySharingStopped: true,
        matureMinorAssessmentRequired: true,
      },
    });
  } catch (error) {
    console.error('Consent withdrawal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== MATURE MINOR ASSESSMENT ENDPOINTS ==========

/**
 * GET /consent/mature-minor/status
 * Check if the current user needs to complete a mature minor assessment
 */
router.get('/mature-minor/status', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if there's a consent withdrawal for this user
    const [verification] = await db.select({
      id: guardianVerifications.id,
      status: guardianVerifications.status,
      withdrawnAt: guardianVerifications.withdrawnAt,
    })
    .from(guardianVerifications)
    .where(eq(guardianVerifications.userId, req.session.userId))
    .limit(1);

    // If no verification or not withdrawn, no assessment needed
    if (!verification || verification.status !== 'consent_withdrawn') {
      return res.json({
        assessmentRequired: false,
        reason: verification ? 'consent_active' : 'no_guardian_verification',
      });
    }

    // Check if assessment was already completed after withdrawal
    const [existingAssessment] = await db.select({
      id: matureMinorAssessments.id,
      completedAt: matureMinorAssessments.completedAt,
      meetsCapacityCriteria: matureMinorAssessments.meetsCapacityCriteria,
    })
    .from(matureMinorAssessments)
    .where(
      and(
        eq(matureMinorAssessments.userId, req.session.userId),
        eq(matureMinorAssessments.triggeredBy, 'consent_withdrawal')
      )
    )
    .orderBy(desc(matureMinorAssessments.completedAt))
    .limit(1);

    // Check if assessment was completed after the withdrawal
    if (existingAssessment && verification.withdrawnAt) {
      const assessmentDate = new Date(existingAssessment.completedAt);
      const withdrawalDate = new Date(verification.withdrawnAt);
      
      if (assessmentDate >= withdrawalDate) {
        return res.json({
          assessmentRequired: false,
          assessmentCompleted: true,
          completedAt: existingAssessment.completedAt,
          meetsCapacityCriteria: existingAssessment.meetsCapacityCriteria,
        });
      }
    }

    // Assessment is required
    res.json({
      assessmentRequired: true,
      reason: 'consent_withdrawn',
      withdrawnAt: verification.withdrawnAt,
    });
  } catch (error) {
    console.error('Mature minor status check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /consent/mature-minor/submit
 * Submit the mature minor assessment responses
 */
router.post('/mature-minor/submit', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { responses } = req.body;

    if (!responses || typeof responses !== 'object') {
      return res.status(400).json({ error: 'Assessment responses are required' });
    }

    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const completedAt = new Date();

    // Get the guardian verification to link the assessment
    const [verification] = await db.select({
      id: guardianVerifications.id,
    })
    .from(guardianVerifications)
    .where(eq(guardianVerifications.userId, req.session.userId))
    .limit(1);

    // Calculate assessment score
    // Each question has: answer (yes/no/unsure), explanation (optional)
    // Questions that should have "yes" answers for capacity: q1, q2, q3, q4, q5
    const expectedAnswers = {
      q1_understands_purpose: 'yes',
      q2_not_substitute_professional: 'yes',
      q3_knows_crisis_resources: 'yes',
      q4_data_security_awareness: 'yes',
      q5_can_make_decisions: 'yes',
    };

    let correctAnswers = 0;
    const totalQuestions = Object.keys(expectedAnswers).length;

    for (const [key, expectedValue] of Object.entries(expectedAnswers)) {
      if (responses[key]?.answer === expectedValue) {
        correctAnswers++;
      }
    }

    const assessmentScore = Math.round((correctAnswers / totalQuestions) * 100);
    const meetsCapacityCriteria = assessmentScore >= 80; // 4 out of 5 correct

    // Store the assessment
    const [assessment] = await db.insert(matureMinorAssessments).values({
      userId: req.session.userId,
      triggeredBy: 'consent_withdrawal',
      guardianVerificationId: verification?.id || null,
      responses,
      assessmentScore,
      meetsCapacityCriteria,
      ipAddress,
      userAgent,
      completedAt,
    }).returning();

    // Log to consent events
    await db.insert(consentEvents).values({
      userId: req.session.userId,
      actor: 'self',
      eventType: 'mature_minor_assessment_completed',
      consentKey: 'mature_minor_capacity',
      newValue: meetsCapacityCriteria,
      ipAddress,
      userAgent,
      notes: `Assessment score: ${assessmentScore}%. Meets capacity criteria: ${meetsCapacityCriteria}`,
    });

    res.json({
      success: true,
      assessmentId: assessment.id,
      assessmentScore,
      meetsCapacityCriteria,
      message: meetsCapacityCriteria 
        ? 'Assessment completed. You have demonstrated understanding of the app and your rights.'
        : 'Assessment completed. Some answers suggest you may benefit from additional support. Staff may reach out.',
    });
  } catch (error) {
    console.error('Mature minor assessment submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /consent/mature-minor/questions
 * Get the mature minor assessment questions
 */
router.get('/mature-minor/questions', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const questions = [
      {
        id: 'q1_understands_purpose',
        text: 'Do you understand that Room XI Connect is for finding programs and tracking your wellness?',
        description: 'This app helps you discover local programs, track your mood, and access wellness resources.',
        type: 'yes_no_explain',
      },
      {
        id: 'q2_not_substitute_professional',
        text: 'Do you understand this app is not a substitute for professional help?',
        description: 'Room XI Connect provides resources and support, but it does not replace professional counseling or medical care.',
        type: 'yes_no_explain',
      },
      {
        id: 'q3_knows_crisis_resources',
        text: 'If you are in crisis, do you know how to reach a crisis helpline?',
        description: 'In an emergency, you can call 988 (Suicide & Crisis Lifeline) or 911. The app also provides crisis resources.',
        type: 'yes_no_explain',
      },
      {
        id: 'q4_data_security_awareness',
        text: 'Do you understand your data is stored securely and you can delete your account anytime?',
        description: 'Your information is encrypted and stored in Canada. You can request to delete all your data at any time.',
        type: 'yes_no_explain',
      },
      {
        id: 'q5_can_make_decisions',
        text: 'Are you able to make decisions about your personal information?',
        description: 'This means you can decide what information to share and understand the consequences of those decisions.',
        type: 'yes_no_explain',
      },
    ];

    res.json({ questions });
  } catch (error) {
    console.error('Mature minor questions fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
