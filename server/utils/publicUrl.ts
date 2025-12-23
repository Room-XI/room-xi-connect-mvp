import type { Request } from 'express';

export function getPublicUrl(req?: Request): string {
  if (process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL.replace(/\/$/, '');
  }
  
  if (process.env.REPLIT_DEPLOYMENT_URL) {
    return `https://${process.env.REPLIT_DEPLOYMENT_URL}`;
  }
  
  if (process.env.REPLIT_APP_URL) {
    return process.env.REPLIT_APP_URL.replace(/\/$/, '');
  }
  
  if (req) {
    const forwardedHost = req.headers['x-forwarded-host'] as string;
    const host = forwardedHost || req.headers['host'] || req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    
    if (host && !host.includes('picard.replit.dev')) {
      return `${protocol}://${host}`;
    }
  }
  
  if (process.env.NODE_ENV === 'production') {
    console.warn('PUBLIC_URL not set in production - consent links may not work correctly');
  }
  
  return 'http://localhost:5000';
}

export default getPublicUrl;
