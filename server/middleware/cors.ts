import type { Request, Response, NextFunction } from 'express';

const ALLOWED_ORIGINS_ENV = process.env.ALLOWED_ORIGINS || '';

const allowlist = ALLOWED_ORIGINS_ENV
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (allowlist.length === 0) {
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
  
  // Allow all replit.dev subdomains in development
  if (process.env.NODE_ENV !== 'production') {
    allowlist.push('https://*.replit.dev');
  }
}

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  
  if (!origin) {
    return next();
  }
  
  const isAllowed = allowlist.some(allowed => {
    if (allowed === origin) return true;
    // Handle prefix wildcard: "https://*" matches "https://example.com"
    if (allowed.endsWith('*')) {
      const prefix = allowed.slice(0, -1);
      return origin.startsWith(prefix);
    }
    // Handle subdomain wildcard: "https://*.domain.com" matches "https://sub.domain.com"
    if (allowed.includes('*.')) {
      const wildcardPattern = allowed.replace('*.', '([a-zA-Z0-9-]+\\.)+');
      const regex = new RegExp(`^${wildcardPattern.replace(/\./g, '\\.')}$`);
      return regex.test(origin);
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
      return res.status(403).json({ error: 'CORS_NOT_ALLOWED', message: 'Origin not allowed' });
    }
  }
  
  next();
}

export default corsMiddleware;
