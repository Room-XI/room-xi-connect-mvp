import express from 'express';
import { db } from '../db.js';
import { consents, consentEvents, profiles, consentAuditLog, xids, guardianVerifications, users } from '../schema.js';
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
import { sendGuardianVerificationEmail, sendInitialConsentEmail, sendConfirmationEmail, sendConsentCompleteEmail } from '../services/email.js';
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

export default router;
