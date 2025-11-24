import { Router } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db.js';
import { users } from '../schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

// Access code stored securely
const ACCESS_CODE = '1458';

// Admin credentials
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'roomxi';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin11';

// Rate limiting for access attempts
const accessAttempts = new Map();

// Verify access code
router.post('/verify-access', async (req, res) => {
  try {
    const { code } = req.body;
    const ip = req.ip;

    // Rate limiting
    const attempts = accessAttempts.get(ip) || 0;
    if (attempts > 5) {
      return res.status(429).json({ 
        message: 'Too many attempts. Please try again later.' 
      });
    }

    if (code !== ACCESS_CODE) {
      accessAttempts.set(ip, attempts + 1);
      setTimeout(() => accessAttempts.delete(ip), 300000); // Reset after 5 minutes
      return res.status(401).json({ 
        message: 'Invalid access code' 
      });
    }

    // Clear attempts on success
    accessAttempts.delete(ip);

    // Grant access in session
    req.session.adminAccessGranted = true;
    
    // Generate admin-specific CSRF token
    const adminCsrfToken = crypto.randomBytes(32).toString('hex');
    req.session.adminCsrfToken = adminCsrfToken;

    res.json({ 
      success: true,
      csrfToken: adminCsrfToken 
    });
  } catch (error) {
    console.error('Access verification error:', error);
    res.status(500).json({ 
      message: 'Access verification failed' 
    });
  }
});

// Get admin CSRF token (only if access granted)
router.get('/csrf-token', (req, res) => {
  if (!req.session.adminAccessGranted) {
    return res.status(401).json({ 
      message: 'Access not granted' 
    });
  }

  if (!req.session.adminCsrfToken) {
    req.session.adminCsrfToken = crypto.randomBytes(32).toString('hex');
  }

  res.json({ 
    csrfToken: req.session.adminCsrfToken 
  });
});

// Admin login (requires access granted)
router.post('/login', async (req, res) => {
  try {
    // Check access granted
    if (!req.session.adminAccessGranted) {
      return res.status(401).json({ 
        message: 'Access not granted. Please enter access code first.' 
      });
    }

    // Validate admin CSRF token
    const csrfToken = req.headers['x-csrf-token'];
    if (!csrfToken || csrfToken !== req.session.adminCsrfToken) {
      return res.status(403).json({ 
        message: 'Invalid or missing CSRF token' 
      });
    }

    const { username, password } = req.body;

    // Validate credentials
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Create admin session
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).json({ 
          message: 'Session error' 
        });
      }

      req.session.isAdminSession = true;
      req.session.adminAccessGranted = true;
      req.session.adminCsrfToken = crypto.randomBytes(32).toString('hex');

      res.json({
        success: true,
        message: 'Admin login successful',
        csrfToken: req.session.adminCsrfToken
      });
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      message: 'Login failed' 
    });
  }
});

// Check admin status
router.get('/status', (req, res) => {
  res.json({
    isAdmin: req.session.isAdminSession === true,
    hasAccess: req.session.adminAccessGranted === true
  });
});

// Admin logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ 
        message: 'Logout failed' 
      });
    }
    res.json({ 
      success: true 
    });
  });
});

export default router;