import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  
  DATABASE_URL: z.string().url(),
  
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  
  EMAIL_PROVIDER: z.enum(['sendgrid', 'gmail']).default('gmail'),
  GMAIL_USER: z.string().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_EMAIL: z.string().default('mailto:security@roomxiconnect.org'),
  
  ALLOWED_ORIGINS: z.string().default(''),
  
  AI_INTEGRATIONS_OPENAI_API_KEY: z.string().optional(),
  AI_INTEGRATIONS_OPENAI_BASE_URL: z.string().optional(),
  
  ADMIN_USERNAME: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  
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
  }
  
  return env;
}

const env = validateEnv();

export default env;
export type Env = z.infer<typeof envSchema>;
