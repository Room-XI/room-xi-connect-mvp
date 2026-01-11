import type { Request, Response, NextFunction } from 'express';
import logger from '../logger.ts';

const ALLOWED_ORIGINS_ENV = process.env.ALLOWED_ORIGINS || '';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Parse allowed origins from environment
const allowlist: string[] = ALLOWED_ORIGINS_ENV
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// In production, ALLOWED_ORIGINS must be explicitly set
if (IS_PRODUCTION && allowlist.length === 0) {
  logger.error({ context: 'cors' }, 'FATAL: ALLOWED_ORIGINS environment variable is required in production');
  throw new Error('ALLOWED_ORIGINS environment variable is required in production. Set to your deployed domain(s), comma-separated.');
}

// Only add localhost defaults in development/test
if (!IS_PRODUCTION && allowlist.length === 0) {
  allowlist.push('capacitor://localhost');
  allowlist.push('http://localhost');
  allowlist.push('http://localhost:5000');
  allowlist.push('http://localhost:5173');
  
  // Replit domain support - add from environment
  const replitDomains = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN;
  if (replitDomains) {
    replitDomains.split(',').forEach(domain => {
      const trimmed = domain.trim();
      if (trimmed) {
        allowlist.push(`https://${trimmed}`);
      }
    });
  }
  
  logger.info({ context: 'cors', origins: allowlist }, 'Using default localhost origins in development');
}

/**
 * Check if an origin matches a wildcard domain pattern
 * Properly handles *.replit.dev matching sub.replit.dev, foo.bar.replit.dev, etc.
 */
function matchesWildcard(origin: string, pattern: string): boolean {
  // Pattern like "https://*.replit.dev"
  if (!pattern.includes('*.')) return false;
  
  try {
    const originUrl = new URL(origin);
    const patternParts = pattern.replace('https://*.', '').replace('http://*.', '');
    
    // Extract the base domain from pattern (e.g., "replit.dev" from "https://*.replit.dev")
    const baseDomain = patternParts;
    
    // Check if the origin hostname ends with the base domain
    // e.g., "foo.replit.dev".endsWith("replit.dev") = true
    // e.g., "foo.bar.replit.dev".endsWith("replit.dev") = true
    if (originUrl.hostname === baseDomain || originUrl.hostname.endsWith('.' + baseDomain)) {
      // Also verify the protocol matches
      const patternProtocol = pattern.startsWith('https://') ? 'https:' : 'http:';
      return originUrl.protocol === patternProtocol;
    }
    
    return false;
  } catch {
    return false;
  }
}

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  
  // Always set Vary: Origin when origin-based decisions are made
  res.setHeader('Vary', 'Origin');
  
  if (!origin) {
    return next();
  }
  
  const isAllowed = allowlist.some(allowed => {
    // Exact match
    if (allowed === origin) return true;
    
    // Handle subdomain wildcard: "https://*.domain.com" matches "https://sub.domain.com"
    if (allowed.includes('*.')) {
      return matchesWildcard(origin, allowed);
    }
    
    return false;
  });
  
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  
  if (req.method === 'OPTIONS') {
    if (isAllowed) {
      return res.status(204).end();
    } else {
      logger.warn({ context: 'cors', origin, allowlist }, 'CORS request blocked - origin not in allowlist');
      return res.status(403).json({ error: 'CORS_NOT_ALLOWED', message: 'Origin not allowed' });
    }
  }
  
  next();
}

export default corsMiddleware;
