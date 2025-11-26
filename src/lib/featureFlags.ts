/**
 * Feature flags for Room XI Connect
 * These can be controlled via environment variables
 */

type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

function getEnv(key: string, defaultValue?: string): string | undefined {
  // Vite environment variables
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return (import.meta.env as Record<string, string>)[key] ?? defaultValue;
  }
  // Fallback for SSR or other environments
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] ?? defaultValue;
  }
  return defaultValue;
}

// Suppress React Router and other framework warnings
export const FEATURE_SUPPRESS_WARNINGS = 
  String(getEnv('VITE_SUPPRESS_WARNINGS', 'false')).toLowerCase() === 'true';

// Strict router mode (require auth for protected routes)
export const FEATURE_ROUTER_STRICT = 
  String(getEnv('VITE_ROUTER_STRICT', 'true')).toLowerCase() === 'true';

// Log level control
export const LOG_LEVEL: LogLevel = 
  (getEnv('VITE_LOG_LEVEL', 'info') as LogLevel) || 'info';

// API base URL
export const API_BASE = getEnv('VITE_API_BASE', '/api') || '/api';

// Feature toggles for specific features
export const FEATURES = {
  // Push notifications (requires VAPID keys)
  PUSH_NOTIFICATIONS: String(getEnv('VITE_ENABLE_PUSH', 'false')).toLowerCase() === 'true',
  
  // Ximi AI companion
  XIMI_ENABLED: String(getEnv('VITE_ENABLE_XIMI', 'true')).toLowerCase() === 'true',
  
  // Demographics disclosure system
  DISCLOSURE_SYSTEM: String(getEnv('VITE_ENABLE_DISCLOSURE', 'true')).toLowerCase() === 'true',
  
  // Offline mode
  OFFLINE_MODE: String(getEnv('VITE_ENABLE_OFFLINE', 'true')).toLowerCase() === 'true',
};
