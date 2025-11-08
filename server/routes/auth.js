import express from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db.js';
import { users, profiles, guardianVerifications } from '../schema.js';
import { eq } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { generateCsrfToken } from '../middleware/security.ts';
import { sendGuardianVerificationEmail } from '../services/email.js';

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

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, dateOfBirth, guardianEmail, guardianName } = req.body;

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
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const [newUser] = await db.insert(users).values({
      email,
      passwordHash,
    }).returning();

    // Create profile
    const [newProfile] = await db.insert(profiles).values({
      userId: newUser.id,
      firstName: firstName || null,
      lastName: lastName || null,
      age: userAge,
      dateOfBirth: dateOfBirth,
    }).returning();

    // Handle guardian verification for users under 16
    if (requiresGuardianVerification) {
      // Generate verification token
      const crypto = await import('crypto');
      const bcrypt = await import('bcrypt');
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const contactHash = await bcrypt.hash(guardianEmail.toLowerCase(), 10);
      
      // Set expiration to 30 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      // Create guardian verification request
      const [verification] = await db.insert(guardianVerifications).values({
        userId: newUser.id,
        guardianContactType: 'email',
        guardianContactValue: guardianEmail,
        guardianContactHash: contactHash,
        verificationToken: verificationToken,
        verificationMethod: 'email_link',
        expiresAt: expiresAt,
      }).returning();

      // Send verification email
      try {
        await sendGuardianVerificationEmail({
          guardianEmail: guardianEmail,
          youthName: firstName || 'your child',
          verificationLink: `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/api/auth/verify-guardian/${verificationToken}`
        });
      } catch (emailError) {
        console.error('Failed to send guardian verification email:', emailError);
        // Don't fail registration, but log the error
      }
    }

    // Set session with guardian verification status
    req.session.userId = newUser.id;
    req.session.email = newUser.email;
    req.session.age = userAge;
    req.session.requiresGuardianVerification = requiresGuardianVerification;
    req.session.guardianVerifiedAt = requiresGuardianVerification ? null : new Date().toISOString();

    res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        age: userAge,
        requiresGuardianVerification,
        guardianVerifiedAt: req.session.guardianVerifiedAt,
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

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
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check guardian verification status
    let guardianVerifiedAt = null;
    let requiresGuardianVerification = false;
    
    if (user.profile && user.profile.age && user.profile.age < 16) {
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

    // Set session with guardian verification status
    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.age = user.profile?.age || null;
    req.session.requiresGuardianVerification = requiresGuardianVerification;
    req.session.guardianVerifiedAt = guardianVerifiedAt || (requiresGuardianVerification ? null : new Date().toISOString());

    res.json({
      user: {
        id: user.id,
        email: user.email,
        age: user.profile?.age,
        requiresGuardianVerification,
        guardianVerifiedAt: req.session.guardianVerifiedAt,
      }
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

// Delete account
router.delete('/account', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { confirm } = req.body;
    if (confirm !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({ error: 'Confirmation required' });
    }

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

export default router;
