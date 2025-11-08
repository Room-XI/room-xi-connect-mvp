/**
 * Skip Token API Routes
 * Generates temporary JWT tokens for guest users
 */

import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Use a default secret if JWT_SECRET not set (for development only)
const JWT_SECRET = process.env.JWT_SECRET || 'room-xi-dev-secret-change-in-production';

/**
 * POST /api/skip-token
 * Generate a temporary JWT token with 10-minute expiry for guest users
 */
router.post('/', async (req, res) => {
  try {
    const { guestId } = req.body;
    
    // Generate guest ID if not provided
    const id = guestId || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create token payload
    const payload = {
      guestId: id,
      isGuest: true,
      createdAt: new Date().toISOString()
    };

    // Sign token with 10-minute expiry
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '10m',
      issuer: 'room-xi-connect',
      audience: 'guest-users'
    });

    res.json({
      token,
      guestId: id,
      expiresIn: 600, // 10 minutes in seconds
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });

  } catch (error) {
    console.error('Error generating skip token:', error);
    res.status(500).json({ error: 'Failed to generate skip token' });
  }
});

/**
 * POST /api/skip-token/verify
 * Verify a skip token is valid
 */
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'room-xi-connect',
      audience: 'guest-users'
    });

    res.json({
      valid: true,
      guestId: decoded.guestId,
      expiresAt: new Date(decoded.exp * 1000).toISOString()
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ valid: false, error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ valid: false, error: 'Invalid token' });
    }
    console.error('Error verifying skip token:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

export default router;
