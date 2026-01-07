import { Request, Response, NextFunction } from 'express';
import { db } from '../db.js';
import { accountLockouts } from '../schema.js';
import { eq } from 'drizzle-orm';
import logger from '../logger.ts';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export async function checkAccountLockout(req: Request, res: Response, next: NextFunction) {
  const email = req.body?.email?.toLowerCase();
  
  if (!email) {
    return next();
  }
  
  try {
    const [record] = await db
      .select()
      .from(accountLockouts)
      .where(eq(accountLockouts.email, email))
      .limit(1);
    
    if (record && record.lockedUntil) {
      const lockedUntilTime = new Date(record.lockedUntil).getTime();
      const now = Date.now();
      
      if (now < lockedUntilTime) {
        const remainingMinutes = Math.ceil((lockedUntilTime - now) / 60000);
        logger.warn({ email }, `Account locked. Attempt blocked. Unlocks in ${remainingMinutes} minutes.`);
        return res.status(429).json({ 
          error: 'Account temporarily locked',
          message: `Too many failed login attempts. Please try again in ${remainingMinutes} minutes.`,
          lockedUntil: record.lockedUntil.toISOString()
        });
      } else {
        await db
          .delete(accountLockouts)
          .where(eq(accountLockouts.email, email));
      }
    }
    
    next();
  } catch (error) {
    logger.error({ error, email }, 'Error checking account lockout status');
    next();
  }
}

export async function recordFailedLogin(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase();
  
  try {
    const [existing] = await db
      .select()
      .from(accountLockouts)
      .where(eq(accountLockouts.email, normalizedEmail))
      .limit(1);
    
    if (existing) {
      const newCount = existing.failedAttempts + 1;
      const shouldLock = newCount >= MAX_FAILED_ATTEMPTS;
      const lockedUntil = shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null;
      
      await db
        .update(accountLockouts)
        .set({
          failedAttempts: newCount,
          lockedUntil,
          updatedAt: new Date(),
        })
        .where(eq(accountLockouts.email, normalizedEmail));
      
      if (shouldLock) {
        logger.warn({ email: normalizedEmail, attempts: newCount }, 'Account locked due to too many failed attempts');
      }
    } else {
      await db
        .insert(accountLockouts)
        .values({
          email: normalizedEmail,
          failedAttempts: 1,
          lockedUntil: null,
        });
    }
  } catch (error) {
    logger.error({ error, email: normalizedEmail }, 'Error recording failed login attempt');
  }
}

export async function clearFailedLogin(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase();
  
  try {
    await db
      .delete(accountLockouts)
      .where(eq(accountLockouts.email, normalizedEmail));
  } catch (error) {
    logger.error({ error, email: normalizedEmail }, 'Error clearing failed login record');
  }
}
