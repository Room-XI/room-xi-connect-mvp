import express, { Request, Response } from 'express';
import { db } from '../db.js';
import { healthProfiles } from '../schema.js';
import { eq } from 'drizzle-orm';
import { encryptHealthProfile, decryptHealthProfile } from '../lib/encryption.ts';
import { grantConsent } from '../services/consent.ts';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [profile] = await db
      .select()
      .from(healthProfiles)
      .where(eq(healthProfiles.userId, req.session.userId))
      .limit(1);

    if (!profile) {
      return res.json(null);
    }

    const decrypted = decryptHealthProfile(profile);
    res.json(decrypted);
  } catch (error) {
    console.error('Get health profile error:', error);
    res.status(500).json({ error: 'Failed to get health profile' });
  }
});

router.put('/', async (req: Request, res: Response) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.session.userId;
    const {
      allergies,
      medicalConditions,
      medications,
      accessibilityNeeds,
      dietaryRestrictions,
      parqStatus,
      healthDataConsent
    } = req.body;

    const [existingProfile] = await db
      .select()
      .from(healthProfiles)
      .where(eq(healthProfiles.userId, userId))
      .limit(1);

    const healthFieldsToEncrypt: Record<string, string | undefined> = {};
    if ('allergies' in req.body) healthFieldsToEncrypt.allergies = allergies;
    if ('medicalConditions' in req.body) healthFieldsToEncrypt.medicalConditions = medicalConditions;
    if ('medications' in req.body) healthFieldsToEncrypt.medications = medications;
    if ('accessibilityNeeds' in req.body) healthFieldsToEncrypt.accessibilityNeeds = accessibilityNeeds;
    if ('dietaryRestrictions' in req.body) healthFieldsToEncrypt.dietaryRestrictions = dietaryRestrictions;

    const encryptedFields = encryptHealthProfile(healthFieldsToEncrypt);

    const updateData: Record<string, any> = {
      updatedAt: new Date()
    };

    if ('allergies' in req.body) updateData.allergies = encryptedFields.allergies;
    if ('medicalConditions' in req.body) updateData.medicalConditions = encryptedFields.medicalConditions;
    if ('medications' in req.body) updateData.medications = encryptedFields.medications;
    if ('accessibilityNeeds' in req.body) updateData.accessibilityNeeds = encryptedFields.accessibilityNeeds;
    if ('dietaryRestrictions' in req.body) updateData.dietaryRestrictions = encryptedFields.dietaryRestrictions;

    if (parqStatus !== undefined) {
      updateData.parqStatus = parqStatus;
      if (parqStatus === 'completed') {
        updateData.parqCompletedAt = new Date();
      }
    }

    if (healthDataConsent !== undefined) {
      updateData.healthDataConsent = Boolean(healthDataConsent);
      if (healthDataConsent && !existingProfile?.healthConsentGrantedAt) {
        updateData.healthConsentGrantedAt = new Date();
        updateData.healthConsentIp = req.ip;
        updateData.healthConsentUserAgent = req.headers['user-agent'] || 'unknown';
      }
    }

    let result;
    if (existingProfile) {
      [result] = await db
        .update(healthProfiles)
        .set(updateData)
        .where(eq(healthProfiles.userId, userId))
        .returning();
    } else {
      [result] = await db
        .insert(healthProfiles)
        .values({
          userId,
          ...updateData,
          createdAt: new Date()
        })
        .returning();
    }

    if (healthDataConsent !== undefined && healthDataConsent !== existingProfile?.healthDataConsent) {
      await grantConsent({
        userId,
        consentType: 'health_data',
        value: Boolean(healthDataConsent),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        grantedBy: 'self',
      });
    }

    const decrypted = decryptHealthProfile(result);
    res.json(decrypted);
  } catch (error) {
    console.error('Update health profile error:', error);
    res.status(500).json({ error: 'Failed to update health profile' });
  }
});

router.delete('/', async (req: Request, res: Response) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [existingProfile] = await db
      .select({ healthDataConsent: healthProfiles.healthDataConsent })
      .from(healthProfiles)
      .where(eq(healthProfiles.userId, req.session.userId))
      .limit(1);

    if (!existingProfile) {
      return res.json({ success: true, message: 'No health profile to delete' });
    }

    await db
      .delete(healthProfiles)
      .where(eq(healthProfiles.userId, req.session.userId));

    if (existingProfile.healthDataConsent) {
      await grantConsent({
        userId: req.session.userId,
        consentType: 'health_data',
        value: false,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        grantedBy: 'self',
      });
    }

    res.json({ success: true, message: 'Health profile deleted' });
  } catch (error) {
    console.error('Delete health profile error:', error);
    res.status(500).json({ error: 'Failed to delete health profile' });
  }
});

export default router;
