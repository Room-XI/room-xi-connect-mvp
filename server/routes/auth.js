import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { db } from '../db.js';
import { users, profiles, guardianVerifications } from '../schema.js';
import { eq } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { generateCsrfToken } from '../middleware/security.ts';
import { sendGuardianVerificationEmail, sendPasswordResetEmail } from '../services/email.js';
import { sendVerificationEmail, verifyEmail, resendVerificationEmail } from '../services/emailVerification.ts';
import { validateBody } from '../middleware/validate.ts';
import { registerSchema, loginSchema, deleteAccountSchema, addGuardianSchema } from '../schemas/auth.ts';
import { lookupCommunity, normalizePostalCode } from '../services/communityLookup.ts';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimit.ts';
import { getPublicUrl } from '../utils/publicUrl.ts';
import { checkAccountLockout, recordFailedLogin, clearFailedLogin } from '../middleware/accountLockout.ts';

const router = express.Router();

/**
 * Calculate age from date of birth
 * Returns null if date is invalid
 */
function calculateAge(dateOfBirth) {
  const dob = DateTime.fromISO(dateOfBirth);
  
  // CRITICAL: Validate DateTime is valid before calculating age
  if (!dob.isValid) {
    return null;
  }
  
  const now = DateTime.now();
  const age = Math.floor(now.diff(dob, 'years').years);
  
  // Additional validation: ensure age is a valid number
  if (!Number.isFinite(age) || age < 0) {
    return null;
  }
  
  return age;
}

// Register (rate limited to prevent abuse)
router.post('/register', authLimiter, validateBody(registerSchema), async (req, res) => {
  try {
    const { email, password, firstName, lastName, dateOfBirth, guardianEmail, guardianName, postalCode } = req.body;

    // VALIDATION
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!dateOfBirth) {
      return res.status(400).json({ error: 'Date of birth is required' });
    }

    // Calculate and validate age
    const userAge = calculateAge(dateOfBirth);
    
    // CRITICAL: Reject invalid date of birth
    if (userAge === null) {
      return res.status(400).json({ 
        error: 'Invalid date of birth',
        message: 'Please provide a valid date of birth in YYYY-MM-DD format.' 
      });
    }
    
    if (userAge < 13) {
      return res.status(400).json({ 
        error: 'Age requirement not met',
        message: 'You must be at least 13 years old to use Room XI Connect.' 
      });
    }

    if (userAge > 25) {
      return res.status(400).json({ 
        error: 'Age requirement not met',
        message: 'Room XI Connect is designed for youth ages 13-25.' 
      });
    }

    // For users under 16, guardian verification is required
    const requiresGuardianVerification = userAge < 16;
    
    if (requiresGuardianVerification && (!guardianEmail || !guardianName)) {
      return res.status(400).json({ 
        error: 'Guardian information required',
        message: 'Users under 16 need a guardian\'s email address and name for verification.' 
      });
    }

    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const [newUser] = await db.insert(users).values({
      email,
      passwordHash,
    }).returning();

    // Lookup community from postal code
    let communityName = null;
    let wardName = null;
    let normalizedPostal = null;
    
    if (postalCode) {
      normalizedPostal = normalizePostalCode(postalCode);
      const communityInfo = lookupCommunity(postalCode);
      if (communityInfo) {
        communityName = communityInfo.community;
        wardName = communityInfo.ward;
      }
    }

    // Create profile
    const [newProfile] = await db.insert(profiles).values({
      userId: newUser.id,
      firstName: firstName || null,
      lastName: lastName || null,
      age: userAge,
      dateOfBirth: dateOfBirth,
      postalCode: normalizedPostal,
      communityName: communityName,
      wardName: wardName,
    }).returning();

    // Send email verification email for all users
    try {
      await sendVerificationEmail(newUser.id, email);
    } catch (emailError) {
      console.error('Failed to send email verification email:', emailError);
    }

    // Handle guardian verification for users under 16 using two-step Email Plus consent flow
    if (requiresGuardianVerification) {
      const crypto = await import('crypto');
      const bcryptLib = await import('bcrypt');
      
      // Generate tokens for two-step consent flow
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const initialConsentToken = crypto.randomBytes(32).toString('hex');
      const contactHash = await bcryptLib.hash(guardianEmail.toLowerCase(), 10);
      
      // Set expiration to 24 hours (PIPA/PIPEDA compliant)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      // Get current consent notice version
      const { CONSENT_NOTICE_VERSION } = await import('../services/consentNotices.js');
      
      // Create guardian verification request with two-step flow
      await db.insert(guardianVerifications).values({
        userId: newUser.id,
        guardianContactType: 'email',
        guardianContactValue: guardianEmail,
        guardianContactHash: contactHash,
        guardianName: guardianName || null,
        verificationToken: verificationToken,
        verificationMethod: 'email_plus',
        initialConsentToken: initialConsentToken,
        consentNoticeVersion: CONSENT_NOTICE_VERSION,
        consentNoticeSentAt: new Date(),
        status: 'pending_initial_consent',
        expiresAt: expiresAt,
      });

      // Send initial consent email with link to view full consent notice
      try {
        const { sendInitialConsentEmail } = await import('../services/email.js');
        const baseUrl = getPublicUrl();
        
        await sendInitialConsentEmail({
          guardianEmail: guardianEmail,
          guardianName: guardianName || null,
          youthName: firstName || 'your child',
          consentLink: `${baseUrl}/api/consent/view/${initialConsentToken}`
        });
      } catch (emailError) {
        console.error('Failed to send initial consent email:', emailError);
      }
    }

    // Set session with guardian verification status
    req.session.userId = newUser.id;
    req.session.email = newUser.email;
    req.session.age = userAge;
    req.session.requiresGuardianVerification = requiresGuardianVerification;
    req.session.guardianVerifiedAt = requiresGuardianVerification ? null : new Date().toISOString();

    // CRITICAL: Explicitly save session to database to ensure persistence
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('Failed to save session after signup:', saveErr);
        // Continue anyway - session may still work via cookie
      }
      
      res.status(201).json({
        user: {
          id: newUser.id,
          email: newUser.email,
          age: userAge,
          requiresGuardianVerification,
          guardianVerifiedAt: req.session.guardianVerifiedAt,
        }
      });
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', authLimiter, checkAccountLockout, validateBody(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with profile
    const [user] = await db.select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      profile: profiles,
    })
    .from(users)
    .leftJoin(profiles, eq(users.id, profiles.userId))
    .where(eq(users.email, email))
    .limit(1);
    
    if (!user) {
      recordFailedLogin(email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!validPassword) {
      recordFailedLogin(email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Clear failed attempts on successful login
    clearFailedLogin(email);

    // TASK 6: Recalculate age from DOB on login for accurate guardian gating
    let computedAge = user.profile?.age ?? null;
    
    if (user.profile?.dateOfBirth) {
      const newAge = calculateAge(user.profile.dateOfBirth);
      if (newAge !== null) {
        computedAge = newAge;
        
        // Update stored age if it has changed (e.g., user had a birthday)
        if (!user.profile.age || user.profile.age !== newAge) {
          await db
            .update(profiles)
            .set({ age: newAge })
            .where(eq(profiles.userId, user.id));
        }
      }
    }

    // Check guardian verification status using computed age
    let guardianVerifiedAt = null;
    let requiresGuardianVerification = false;
    
    if (computedAge !== null && computedAge < 16) {
      requiresGuardianVerification = true;
      
      // Check if guardian has verified
      const [verification] = await db.select()
        .from(guardianVerifications)
        .where(eq(guardianVerifications.userId, user.id))
        .limit(1);
      
      if (verification && verification.verifiedAt) {
        guardianVerifiedAt = verification.verifiedAt;
      }
    }

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      // Set session with guardian verification status
      req.session.userId = user.id;
      req.session.email = user.email;
      req.session.age = computedAge;
      req.session.requiresGuardianVerification = requiresGuardianVerification;
      req.session.guardianVerifiedAt = guardianVerifiedAt || (requiresGuardianVerification ? null : new Date().toISOString());

      res.json({
        user: {
          id: user.id,
          email: user.email,
          age: computedAge,
          requiresGuardianVerification,
          guardianVerifiedAt: req.session.guardianVerifiedAt,
        }
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [user] = await db.select({
      id: users.id,
      email: users.email,
      emailVerified: users.emailVerified,
      profile: profiles,
    })
    .from(users)
    .leftJoin(profiles, eq(users.id, profiles.userId))
    .where(eq(users.id, req.session.userId))
    .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        ...user.profile,
        requiresGuardianVerification: req.session.requiresGuardianVerification || false,
        guardianVerifiedAt: req.session.guardianVerifiedAt || user.profile?.guardianVerifiedAt,
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add additional guardian
router.post('/add-guardian', authLimiter, validateBody(addGuardianSchema), async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { guardianEmail, guardianName, guardianRole } = req.body;
    const userId = req.session.userId;

    // Check existing guardians count
    const existingGuardians = await db.select()
      .from(guardianVerifications)
      .where(eq(guardianVerifications.userId, userId));

    if (existingGuardians.length >= 3) {
      return res.status(400).json({ 
        error: 'Maximum guardians reached',
        message: 'You can have a maximum of 3 guardians linked to your account.' 
      });
    }

    // Check if this guardian email is already added
    const alreadyExists = existingGuardians.some(g => 
      g.guardianContactValue.toLowerCase() === guardianEmail.toLowerCase()
    );

    if (alreadyExists) {
      return res.status(400).json({ error: 'This guardian has already been added' });
    }

    const crypto = await import('crypto');
    const bcryptLib = await import('bcrypt');
    
    // Generate tokens for two-step consent flow
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const initialConsentToken = crypto.randomBytes(32).toString('hex');
    const contactHash = await bcryptLib.hash(guardianEmail.toLowerCase(), 10);
    
    // Set expiration to 24 hours (PIPA/PIPEDA compliant)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // Get current consent notice version
    const { CONSENT_NOTICE_VERSION } = await import('../services/consentNotices.js');
    
    // Create guardian verification request
    await db.insert(guardianVerifications).values({
      userId: userId,
      guardianContactType: 'email',
      guardianContactValue: guardianEmail,
      guardianContactHash: contactHash,
      guardianName: guardianName || null,
      guardianRole: guardianRole || 'secondary',
      verificationToken: verificationToken,
      verificationMethod: 'email_plus',
      initialConsentToken: initialConsentToken,
      consentNoticeVersion: CONSENT_NOTICE_VERSION,
      consentNoticeSentAt: new Date(),
      status: 'pending_initial_consent',
      expiresAt: expiresAt,
    });

    // Get youth's name for the email
    const [profile] = await db.select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    
    const youthName = profile?.firstName || 'your child';

    // Send initial consent email
    try {
      const { sendInitialConsentEmail } = await import('../services/email.js');
      const baseUrl = getPublicUrl();
      
      await sendInitialConsentEmail({
        guardianEmail: guardianEmail,
        guardianName: guardianName || null,
        youthName: youthName,
        consentLink: `${baseUrl}/api/consent/view/${initialConsentToken}`
      });
    } catch (emailError) {
      console.error('Failed to send initial consent email:', emailError);
    }

    res.status(201).json({
      message: 'Additional guardian added and verification email sent.',
      status: 'pending_initial_consent'
    });
  } catch (error) {
    console.error('Add guardian error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete account
router.delete('/account', validateBody(deleteAccountSchema), async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { confirm } = req.body;

    // Delete user (cascades to all related tables)
    await db.delete(users).where(eq(users.id, req.session.userId));

    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ message: 'Account deleted successfully' });
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get CSRF token
router.get('/csrf-token', (req, res) => {
  const token = generateCsrfToken(req);
  res.json({ csrfToken: token });
});

// Verify email with token
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const result = await verifyEmail(token);

    if (!result.success) {
      if (result.message === 'Verification token has expired') {
        return res.status(410).json({ error: result.message });
      }
      return res.status(400).json({ error: result.message });
    }

    res.json({ message: result.message, emailVerified: true });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await resendVerificationEmail(req.session.userId);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({ message: result.message });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify guardian (token from email)
router.get('/verify-guardian/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find verification request
    const [verification] = await db.select()
      .from(guardianVerifications)
      .where(eq(guardianVerifications.verificationToken, token))
      .limit(1);

    if (!verification) {
      return res.status(404).json({ error: 'Invalid verification token' });
    }

    if (verification.verifiedAt) {
      return res.json({ message: 'Guardian verification already completed', alreadyVerified: true });
    }

    // Check if token has expired
    if (new Date() > verification.expiresAt) {
      return res.status(410).json({ error: 'Verification token has expired' });
    }

    // Get IP address for audit trail
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Mark as verified
    await db.update(guardianVerifications)
      .set({ 
        verifiedAt: new Date(),
        verifiedByIp: ipAddress
      })
      .where(eq(guardianVerifications.verificationToken, token));

    // Update profile
    await db.update(profiles)
      .set({ guardianVerifiedAt: new Date() })
      .where(eq(profiles.userId, verification.userId));

    res.json({ message: 'Guardian verification successful' });
  } catch (error) {
    console.error('Guardian verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Request password reset (forgot password) - rate limited to 5 requests per hour per email
router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const [user] = await db.select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    // Always return success to prevent email enumeration attacks
    // Even if user doesn't exist, we respond with success
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${normalizedEmail}`);
      return res.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    // Generate secure random token (64 characters)
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Set 24-hour expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Store token in database (invalidate any previous tokens by overwriting)
    await db.update(users)
      .set({
        passwordResetToken: resetToken,
        passwordResetExpires: expiresAt,
        passwordResetUsedAt: null, // Clear any previous usage
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Generate reset link
    const baseUrl = getPublicUrl();
    const resetLink = `${baseUrl}/auth/update-password?token=${resetToken}`;

    // Send password reset email
    try {
      await sendPasswordResetEmail({
        email: normalizedEmail,
        resetLink,
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Still return success to prevent enumeration
    }

    res.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete password reset with token
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Reset token is required' });
    }

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    if (!/(?=.*[a-z])/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
    }

    if (!/(?=.*[A-Z])/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }

    if (!/(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one number' });
    }

    // Find user with this reset token
    const [user] = await db.select()
      .from(users)
      .where(eq(users.passwordResetToken, token))
      .limit(1);

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Check if token has been used
    if (user.passwordResetUsedAt) {
      return res.status(400).json({ error: 'This reset link has already been used' });
    }

    // Check if token has expired (24 hours)
    if (!user.passwordResetExpires || new Date() > new Date(user.passwordResetExpires)) {
      return res.status(410).json({ error: 'Password reset link has expired. Please request a new one.' });
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password and invalidate the token
    await db.update(users)
      .set({
        passwordHash,
        passwordResetToken: null, // Invalidate token
        passwordResetExpires: null,
        passwordResetUsedAt: new Date(), // Mark as used for audit trail
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Destroy any active sessions for this user (security measure)
    // Note: This will require the user to log in again
    
    res.json({ message: 'Password has been reset successfully. Please log in with your new password.' });
  } catch (error) {
    console.error('Password reset completion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate reset token (for frontend to check if token is valid before showing form)
router.get('/reset-password/:token/validate', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ valid: false, error: 'Token is required' });
    }

    // Find user with this reset token
    const [user] = await db.select({
      id: users.id,
      passwordResetExpires: users.passwordResetExpires,
      passwordResetUsedAt: users.passwordResetUsedAt,
    })
    .from(users)
    .where(eq(users.passwordResetToken, token))
    .limit(1);

    if (!user) {
      return res.status(400).json({ valid: false, error: 'Invalid reset token' });
    }

    // Check if token has been used
    if (user.passwordResetUsedAt) {
      return res.status(400).json({ valid: false, error: 'This reset link has already been used' });
    }

    // Check if token has expired
    if (!user.passwordResetExpires || new Date() > new Date(user.passwordResetExpires)) {
      return res.status(410).json({ valid: false, error: 'Reset link has expired' });
    }

    res.json({ valid: true });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ valid: false, error: 'Internal server error' });
  }
});

// Update password (for authenticated users)
router.post('/update-password', async (req, res) => {
  try {
    const { newPassword, token } = req.body;

    // If token is provided, use token-based reset flow
    if (token) {
      if (!newPassword) {
        return res.status(400).json({ error: 'New password is required' });
      }

      // Validate password strength
      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
      }

      if (!/(?=.*[a-z])/.test(newPassword)) {
        return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
      }

      if (!/(?=.*[A-Z])/.test(newPassword)) {
        return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
      }

      if (!/(?=.*\d)/.test(newPassword)) {
        return res.status(400).json({ error: 'Password must contain at least one number' });
      }

      // Find user with this reset token
      const [user] = await db.select()
        .from(users)
        .where(eq(users.passwordResetToken, token))
        .limit(1);

      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      // Check if token has been used
      if (user.passwordResetUsedAt) {
        return res.status(400).json({ error: 'This reset link has already been used' });
      }

      // Check if token has expired
      if (!user.passwordResetExpires || new Date() > new Date(user.passwordResetExpires)) {
        return res.status(410).json({ error: 'Password reset link has expired. Please request a new one.' });
      }

      // Hash the new password
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Update password and invalidate the token
      await db.update(users)
        .set({
          passwordHash,
          passwordResetToken: null,
          passwordResetExpires: null,
          passwordResetUsedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      return res.json({ message: 'Password has been reset successfully.' });
    }

    // Otherwise, require authentication
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    if (!/(?=.*[a-z])/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
    }

    if (!/(?=.*[A-Z])/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }

    if (!/(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one number' });
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await db.update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.session.userId));

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
