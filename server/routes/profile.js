import express from 'express';
import { db } from '../db.js';
import { profiles } from '../schema.js';
import { eq } from 'drizzle-orm';
import { requireDataConsent } from '../middleware/consent.ts';

const router = express.Router();

// Get profile
router.get('/', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, req.session.userId)).limit(1);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update profile
router.put('/', requireDataConsent(), async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const allowedFields = [
      'firstName', 'lastName', 'preferredName', 'age', 'dateOfBirth',
      'city', 'postalCode', 'legalFirstName', 'legalLastName',
      'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelationship',
      'indigenousIdentity', 'indigenousCommunity',
      'accountComplete', 'safetyProfileComplete', 'programProfileComplete',
      'weights', 'scores',
      'highVisibility', 'patternOverlay', 'showColorKey'
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.updatedAt = new Date();

    const [updated] = await db.update(profiles)
      .set(updates)
      .where(eq(profiles.userId, req.session.userId))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
