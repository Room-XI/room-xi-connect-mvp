import { Request, Response, NextFunction } from 'express';
import { db } from '../db.js';
import { users } from '../schema.js';
import { eq } from 'drizzle-orm';
import logger from '../logger.ts';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

const failedAttempts = new Map<string, { count: number; lockedUntil: number | null }>();

export function checkAccountLockout(req: Request, res: Response, next: NextFunction) {
  const email = req.body?.email?.toLowerCase();
  
  if (!email) {
    return next();
  }
  
  const record = failedAttempts.get(email);
  
  if (record && record.lockedUntil) {
    if (Date.now() < record.lockedUntil) {
      const remainingMinutes = Math.ceil((record.lockedUntil - Date.now()) / 60000);
      logger.warn({ email }, `Account locked. Attempt blocked. Unlocks in ${remainingMinutes} minutes.`);
      return res.status(429).json({ 
        error: 'Account temporarily locked',
        message: `Too many failed login attempts. Please try again in ${remainingMinutes} minutes.`,
        lockedUntil: new Date(record.lockedUntil).toISOString()
      });
    } else {
      failedAttempts.delete(email);
    }
  }
  
  next();
}

export function recordFailedLogin(email: string): void {
  const normalizedEmail = email.toLowerCase();
  const record = failedAttempts.get(normalizedEmail) || { count: 0, lockedUntil: null };
  
  record.count += 1;
  
  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    logger.warn({ email: normalizedEmail, attempts: record.count }, 'Account locked due to too many failed attempts');
  }
  
  failedAttempts.set(normalizedEmail, record);
}

export function clearFailedLogin(email: string): void {
  failedAttempts.delete(email.toLowerCase());
}

setInterval(() => {
  const now = Date.now();
  for (const [email, record] of failedAttempts.entries()) {
    if (record.lockedUntil && now > record.lockedUntil + LOCKOUT_DURATION_MS) {
      failedAttempts.delete(email);
    }
  }
}, 5 * 60 * 1000);
