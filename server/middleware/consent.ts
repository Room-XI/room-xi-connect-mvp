/**
 * Consent Middleware
 * Enforces consent requirements before accessing features
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../db.ts';
import { consents, privacyConsents } from '../schema.ts';
import { consentRequests } from '../schema.extras.ts';
import { eq, and } from 'drizzle-orm';
import '../types/session.d.ts';

const LEGACY_CONSENT_TYPES = new Set([
  'terms_of_use',
  'privacy_notice',
  'data_collection',
  'ai_personalization',
]);

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
 * Used ONLY for legal/signup consents (terms, privacy, data collection, AI personalization).
 * 
 * IMPORTANT: This checks the legacy `consents` table for basic legal consent.
 * For program-level parental consent, use the canonical consent engine
 * (consent_requests / consent_receipts / consent_audit_events) via the
 * consent-wallet routes. Never use this middleware to gate program participation.
 * 
 * Usage:
 *   router.post('/checkin', requireConsent(['terms_of_use', 'data_collection']), async (req, res) => {
 *     // User has granted required legal consents
 *   });
 */
export function requireConsent(consentTypes: string | string[]) {
  const types = Array.isArray(consentTypes) ? consentTypes : [consentTypes];

  const invalidTypes = types.filter(t => !LEGACY_CONSENT_TYPES.has(t));
  if (invalidTypes.length > 0) {
    throw new Error(
      `requireConsent() must only be used for legal/signup consent types ` +
      `(${[...LEGACY_CONSENT_TYPES].join(', ')}). ` +
      `For program-level consent, use requireProgramConsent(). ` +
      `Invalid types: ${invalidTypes.join(', ')}`
    );
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

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
 * Middleware: Require program-level parental consent via the canonical consent engine.
 * Checks consent_requests status ('signed') for the given program.
 * A 'signed' status implies a receipt exists (created atomically during the sign flow).
 * Use this (not requireConsent) for any route that gates program participation.
 */
export function requireProgramConsent(programIdParam: string = 'programId') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const programId = req.params[programIdParam] || req.body?.programId;
    if (!programId) {
      return res.status(400).json({ error: 'Program ID required' });
    }

    const [cr] = await db
      .select()
      .from(consentRequests)
      .where(
        and(
          eq(consentRequests.youthId, userId),
          eq(consentRequests.programId, programId),
          eq(consentRequests.status, 'signed')
        )
      )
      .limit(1);

    if (!cr) {
      return res.status(403).json({
        error: 'Program consent required',
        code: 'PROGRAM_CONSENT_REQUIRED',
        programId,
        message: 'Parental consent is required for this program',
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
