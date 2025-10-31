/**
 * Express Session Type Definitions
 * Extends express-session to include our custom session data
 */

import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    isAdmin?: boolean;
    consents?: Record<string, boolean>;
    email?: string;
    firstName?: string;
    age?: number;
  }
}
