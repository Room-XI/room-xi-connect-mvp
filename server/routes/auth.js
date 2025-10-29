import express from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db.js';
import { users, profiles } from '../schema.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, age, dateOfBirth } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
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
    await db.insert(profiles).values({
      userId: newUser.id,
      firstName: firstName || null,
      lastName: lastName || null,
      age: age || null,
      dateOfBirth: dateOfBirth || null,
    });

    // Set session
    req.session.userId = newUser.id;
    req.session.email = newUser.email;

    res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
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

    // Find user
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Set session
    req.session.userId = user.id;
    req.session.email = user.email;

    res.json({
      user: {
        id: user.id,
        email: user.email,
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

export default router;
