/**
 * Authentication & Authorization Middleware
 * 
 * IMPORTANT: This project uses application-level security, NOT database-level RLS.
 * Security is enforced through:
 * 1. Express middleware (this file)
 * 2. Query-level filtering by req.session.userId
 * 3. Audit logging
 * 
 * RLS policies exist in the database for defense-in-depth, but are not actively
 * enforced due to connection pooling (Neon opens new connections per query).
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    isAdmin?: boolean;
    consents?: Record<string, boolean>;
    lastActivity?: number;
  }
}

/**
 * NOTE: setRLSContext and applyRLS are NOT USED in this architecture.
 * They are kept here for reference in case of future migration to per-user
 * database connections (like Supabase).
 * 
 * For Neon + Express sessions, use requireAuth, requireAdmin, and
 * query-level filtering instead.
 */

/**
 * Middleware to require authenticated user
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * Middleware to require admin privileges
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!req.session?.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  
  next();
}

/**
 * Middleware to check consent status
 * Prevents access to features requiring consent before consent is granted
 */
export function requireConsent(consentType: string | string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const requiredConsents = Array.isArray(consentType) ? consentType : [consentType];
    const userConsents = req.session?.consents || {};

    const missingConsents = requiredConsents.filter(
      (consent) => !userConsents[consent]
    );

    if (missingConsents.length > 0) {
      return res.status(403).json({
        error: 'Consent required',
        missingConsents,
        message: 'You must grant consent before accessing this feature'
      });
    }

    next();
  };
}

/**
 * Audit logging helper
 */
export async function logAuditTrail(
  pool: Pool,
  params: {
    userId?: string;
    orgId?: string;
    action: string;
    tableName: string;
    recordId?: string;
    recordData?: any;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    result?: string;
    errorMessage?: string;
    durationMs?: number;
  }
) {
  try {
    await pool.query(
      `INSERT INTO audit_trail (
        user_id, org_id, action, table_name, record_id, 
        record_data, ip_address, user_agent, session_id,
        result, error_message, duration_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        params.userId || null,
        params.orgId || null,
        params.action,
        params.tableName,
        params.recordId || null,
        params.recordData ? JSON.stringify(params.recordData) : null,
        params.ipAddress || null,
        params.userAgent || null,
        params.sessionId || null,
        params.result || 'success',
        params.errorMessage || null,
        params.durationMs || null,
      ]
    );
  } catch (error) {
    console.error('Failed to log audit trail:', error);
    // Don't throw - audit logging failures shouldn't break app
  }
}
