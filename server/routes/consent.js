import express from 'express';
import { db } from '../db.js';
import { consents, consentEvents, profiles } from '../schema.js';
import { eq, and } from 'drizzle-orm';
import {
  generateGuardianToken,
  verifyGuardianWithPIN,
  checkGuardianVerificationStatus,
  getConsentAuditTrail,
  exportUserData,
  deleteUserData,
} from '../services/consent.js';
import { sendGuardianVerificationEmail } from '../services/email.js';

const router = express.Router();

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

export default router;
