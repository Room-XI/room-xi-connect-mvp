import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // Session & Security
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  ENCRYPTION_SECRET: z.string().min(32, 'ENCRYPTION_SECRET must be at least 32 characters for AES-256').optional(),
  SAFETY_PLAN_TOKEN_PEPPER: z.string().optional(),
  JWT_SECRET: z.string().optional(), // Required in production (validated at module load)
  XID_PEPPER: z.string().optional(), // Required in production (validated at module load)
  
  // Email Configuration
  EMAIL_PROVIDER: z.enum(['sendgrid', 'gmail']).default('gmail'),
  GMAIL_USER: z.string().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_FROM_NAME: z.string().default('Room XI Connect'),
  STAFF_NOTIFICATION_EMAIL: z.string().optional(),
  
  // Push Notifications
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_EMAIL: z.string().default('mailto:security@roomxiconnect.org'),
  
  // CORS
  ALLOWED_ORIGINS: z.string().default(''), // Required in production
  
  // AI Integration
  AI_INTEGRATIONS_OPENAI_API_KEY: z.string().optional(),
  AI_INTEGRATIONS_OPENAI_BASE_URL: z.string().optional(),
  
  // Admin Portal
  ADMIN_USERNAME: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN_ACCESS_CODE: z.string().optional(),
  
  // Public URLs (for email links)
  PUBLIC_URL: z.string().optional(),
  PUBLIC_BASE_URL: z.string().optional(), // Legacy - prefer PUBLIC_URL
  REPLIT_APP_URL: z.string().optional(),
  REPLIT_DEPLOYMENT_URL: z.string().optional(),
  REPLIT_DEV_DOMAIN: z.string().optional(),
  REPLIT_DOMAINS: z.string().optional(),
  
  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  
  // Data Retention
  RETENTION_XIMI_DAYS: z.coerce.number().default(0),
  RETENTION_CHECKINS_DAYS: z.coerce.number().default(0),
});

function validateEnv() {
  const isDev = process.env.NODE_ENV !== 'production';
  
  if (isDev) {
    const devDefaults: Record<string, string> = {
      SESSION_SECRET: 'room-xi-dev-secret-DEVELOPMENT-ONLY-32chars',
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/roomxi',
    };
    
    for (const [key, value] of Object.entries(devDefaults)) {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
  
  const parsed = envSchema.safeParse(process.env);
  
  if (!parsed.success) {
    const errors = parsed.error.issues.map(issue => 
      `  - ${issue.path.join('.')}: ${issue.message}`
    ).join('\n');
    
    throw new Error(`Environment validation failed:\n${errors}`);
  }
  
  const env = parsed.data;
  
  if (env.NODE_ENV === 'production') {
    // ENCRYPTION_SECRET is required in production for health data encryption
    if (!env.ENCRYPTION_SECRET) {
      throw new Error('ENCRYPTION_SECRET is required in production for health data encryption (must be at least 32 characters)');
    }
    
    // SAFETY_PLAN_TOKEN_PEPPER is required in production for safety plan share token hashing
    if (!env.SAFETY_PLAN_TOKEN_PEPPER) {
      throw new Error('SAFETY_PLAN_TOKEN_PEPPER is required in production for safety plan share link security (must be at least 32 characters)');
    }
    
    // JWT_SECRET is required in production for skip token generation
    if (!env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required in production for JWT token signing (must be at least 32 characters)');
    }
    
    // XID_PEPPER is required in production for XID hashing
    if (!env.XID_PEPPER) {
      throw new Error('XID_PEPPER is required in production for secure XID generation');
    }
    
    // ALLOWED_ORIGINS is required in production for CORS security
    if (!env.ALLOWED_ORIGINS) {
      throw new Error('ALLOWED_ORIGINS is required in production - set to your deployed domain(s), comma-separated');
    }
    
    if (env.EMAIL_PROVIDER === 'gmail') {
      if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) {
        throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD are required in production when using gmail provider');
      }
    }
    
    if (env.EMAIL_PROVIDER === 'sendgrid') {
      if (!env.SENDGRID_API_KEY) {
        throw new Error('SENDGRID_API_KEY is required in production when using sendgrid provider');
      }
    }
    
    if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD) {
      console.warn('Warning: ADMIN_USERNAME and ADMIN_PASSWORD should be set in production');
    }
    
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
      console.warn('Warning: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY not set - push notifications will be disabled');
    }
    
    // Warn if PUBLIC_URL is not set (email links may not work)
    if (!env.PUBLIC_URL && !env.REPLIT_DEPLOYMENT_URL && !env.REPLIT_APP_URL) {
      console.warn('Warning: PUBLIC_URL not set - consent email links may not work correctly');
    }
  }
  
  return env;
}

const env = validateEnv();

export default env;
export type Env = z.infer<typeof envSchema>;
