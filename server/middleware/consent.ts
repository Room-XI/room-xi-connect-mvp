/**
 * Consent Middleware
 * Enforces consent requirements before accessing features
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../db.ts';
import { consents, privacyConsents } from '../schema.ts';
import { eq } from 'drizzle-orm';
import '../types/session.d.ts';

export type PrivacyConsentType = 'location' | 'orb' | 'reflections' | 'notifications' | 'research';

/**
 * Check if user has granted specific privacy consent(s) from privacy_consents table
 * These are the feature toggles: location, orb, reflections, notifications, research
 */
export async function checkPrivacyConsent(userId: string, consentTypes: PrivacyConsentType | PrivacyConsentType[]): Promise<Record<PrivacyConsentType, boolean>> {
  const types = Array.isArray(consentTypes) ? consentTypes : [consentTypes];
  
  const userConsents = await db.select().from(privacyConsents)
    .where(eq(privacyConsents.userId, userId))
    .limit(1);
  
  const consent = userConsents[0];
  
  const consentMap: Record<string, boolean> = {};
  types.forEach(type => {
    if (!consent) {
      consentMap[type] = false;
    } else {
      switch (type) {
        case 'location':
          consentMap[type] = consent.locationSharing === true;
          break;
        case 'orb':
          consentMap[type] = consent.orbSharing === true;
          break;
        case 'reflections':
          consentMap[type] = consent.reflectionsSharing === true;
          break;
        case 'notifications':
          consentMap[type] = consent.notificationsEnabled === true;
          break;
        case 'research':
          consentMap[type] = consent.researchParticipation === true;
          break;
        default:
          consentMap[type] = false;
      }
    }
  });
  
  return consentMap as Record<PrivacyConsentType, boolean>;
}

/**
 * Check if user has granted specific basic consent(s) from consents table
 * These are the legal/terms consents: terms_of_use, privacy_notice, data_collection, ai_personalization
 */
export async function checkConsent(userId: string, consentTypes: string | string[]): Promise<Record<string, boolean>> {
  const types = Array.isArray(consentTypes) ? consentTypes : [consentTypes];
  
  const userConsents = await db.select().from(consents)
    .where(eq(consents.userId, userId));
  
  const consentMap: Record<string, boolean> = {};
  types.forEach(type => {
    const consent = userConsents.find(c => c.consentType === type);
    consentMap[type] = consent?.value === true;
  });
  
  return consentMap;
}

/**
 * Middleware: Require privacy consent before accessing endpoint
 * Used for feature gating (location, orb, reflections, notifications, research)
 * 
 * Usage:
 *   router.post('/share-location', requirePrivacyConsent('location'), async (req, res) => {
 *     // User has granted location consent
 *   });
 */
export function requirePrivacyConsent(consentTypes: PrivacyConsentType | PrivacyConsentType[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const types = Array.isArray(consentTypes) ? consentTypes : [consentTypes];
    const consentMap = await checkPrivacyConsent(userId, types);
    
    const missingConsents = types.filter(type => !consentMap[type]);
    
    if (missingConsents.length > 0) {
      return res.status(403).json({
        error: 'Consent required',
        code: 'CONSENT_REQUIRED',
        missingConsents,
        message: 'You must grant the required consents in Privacy Center before accessing this feature',
      });
    }
    
    next();
  };
}

/**
 * Middleware: Require basic consent before accessing endpoint
 * Used for legal consents (terms, privacy, data collection)
 * 
 * Usage:
 *   router.post('/checkin', requireConsent(['terms_of_use', 'data_collection']), async (req, res) => {
 *     // User has granted required consents
 *   });
 */
export function requireConsent(consentTypes: string | string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const types = Array.isArray(consentTypes) ? consentTypes : [consentTypes];
    const consentMap = await checkConsent(userId, types);
    
    const missingConsents = types.filter(type => !consentMap[type]);
    
    if (missingConsents.length > 0) {
      return res.status(403).json({
        error: 'Consent required',
        code: 'CONSENT_REQUIRED',
        missingConsents,
        message: 'You must grant the required consents before accessing this feature',
      });
    }
    
    next();
  };
}

/**
 * Middleware: Require location consent
 */
export function requireLocationConsent() {
  return requirePrivacyConsent('location');
}

/**
 * Middleware: Require reflections consent
 */
export function requireReflectionsConsent() {
  return requirePrivacyConsent('reflections');
}

/**
 * Middleware: Require research participation consent
 */
export function requireResearchConsent() {
  return requirePrivacyConsent('research');
}

/**
 * Middleware: Require notifications consent
 */
export function requireNotificationsConsent() {
  return requirePrivacyConsent('notifications');
}

/**
 * Middleware: Require Ximi AI consent (from basic consents)
 */
export function requireXimiConsent() {
  return requireConsent('ai_personalization');
}

/**
 * Middleware: Require data collection consent
 */
export function requireDataConsent() {
  return requireConsent(['terms_of_use', 'privacy_notice', 'data_collection']);
}

/**
 * Middleware: Check if user has completed account setup
 */
export function requireAccountComplete() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const basicConsents = await checkConsent(userId, [
      'terms_of_use',
      'privacy_notice',
      'data_collection'
    ]);
    
    const missingBasicConsents = Object.entries(basicConsents)
      .filter(([_, granted]) => !granted)
      .map(([type]) => type);
    
    if (missingBasicConsents.length > 0) {
      return res.status(403).json({
        error: 'Account setup incomplete',
        code: 'ACCOUNT_INCOMPLETE',
        missingConsents: missingBasicConsents,
        message: 'Please complete account setup before accessing this feature',
      });
    }
    
    next();
  };
}

/**
 * Check if user is under age threshold (for guardian verification)
 */
export function isUserUnderAge(age: number, threshold: number = 16): boolean {
  return age < threshold;
}
