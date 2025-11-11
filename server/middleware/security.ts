/**
 * Security Headers Middleware
 * Implements CSP, COEP, COOP, and other security headers
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Apply security headers to all responses
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' ws: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  
  // Referrer Policy - don't leak URLs to external sites
  res.setHeader('Referrer-Policy', 'no-referrer');
  
  // Permissions Policy - restrict dangerous features
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), payment=()'
  );
  
  // X-Content-Type-Options - prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // X-Frame-Options - prevent clickjacking (backup to CSP frame-ancestors)
  res.setHeader('X-Frame-Options', 'DENY');
  
  // X-XSS-Protection - legacy XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Cross-Origin-Opener-Policy - isolate browsing context
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  
  // Cross-Origin-Embedder-Policy - require CORP for resources
  // NOTE: This might break some external resources - test thoroughly
  // res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  
  // Cross-Origin-Resource-Policy - restrict cross-origin resource loading
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  
  // Strict-Transport-Security - force HTTPS (only in production)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  next();
}

/**
 * Apply cache control headers
 * Prevents caching of sensitive data
 */
export function noCacheForSensitiveRoutes(req: Request, res: Response, next: NextFunction) {
  const sensitivePaths = ['/api/', '/me', '/profile', '/checkin'];
  
  if (sensitivePaths.some(path => req.path.startsWith(path))) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
}

/**
 * Rate limiting configuration
 * (Requires express-rate-limit package - not installed yet)
 */
export const rateLimitConfig = {
  // General API rate limit
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
  },
  
  // Auth endpoints rate limit (stricter)
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later.',
  },
  
  // Password reset (very strict)
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: 'Too many password reset attempts, please try again later.',
  },
};

/**
 * CSRF Protection
 */
import crypto from 'crypto';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    email?: string;
    csrfToken?: string;
    requiresGuardianVerification?: boolean;
    guardianVerifiedAt?: string | null;
    age?: number;
  }
}

/**
 * Generate a CSRF token for the session
 */
export function generateCsrfToken(req: Request): string {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

/**
 * Middleware to validate CSRF tokens on state-changing requests
 */
export function validateCsrfToken(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF validation for GET, HEAD, OPTIONS (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Get token from header or body
  const token = req.headers['x-csrf-token'] || req.body._csrf;

  // Validate token
  if (!token || token !== req.session.csrfToken) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'Your session may have expired. Please refresh the page and try again.'
    });
  }

  next();
}

/**
 * Middleware to enforce guardian verification for users under 16
 */
export function requireGuardianVerification(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check if user is under 16 and not yet verified
  if (req.session.requiresGuardianVerification && !req.session.guardianVerifiedAt) {
    return res.status(403).json({
      error: 'Guardian verification required',
      message: 'You need guardian approval to access this feature. Please check your guardian\'s email for a verification link.',
      requiresGuardianVerification: true
    });
  }

  next();
}
