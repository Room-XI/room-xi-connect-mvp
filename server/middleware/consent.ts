/**
 * Consent Middleware
 * Enforces consent requirements before accessing features
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../db.js';
import { consents } from '../schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * Check if user has granted specific consent(s)
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
 * Middleware: Require consent before accessing endpoint
 * 
 * Usage:
 *   router.post('/checkin', requireConsent(['terms_of_use', 'data_collection']), async (req, res) => {
 *     // User has granted required consents
 *   });
 */
export function requireConsent(consentTypes: string | string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const types = Array.isArray(consentTypes) ? consentTypes : [consentTypes];
    const consentMap = await checkConsent(req.session.userId, types);
    
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
 * Middleware: Require Ximi AI consent
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
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if basic consents are granted
    const basicConsents = await checkConsent(req.session.userId, [
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
