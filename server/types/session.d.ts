/**
 * Express Session Type Definitions
 * Extends express-session to include our custom session data
 */

import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    isAdmin?: boolean;
    isAdminSession?: boolean;
    adminAccessGranted?: boolean;
    adminCsrfToken?: string;
    consents?: Record<string, boolean>;
    email?: string;
    firstName?: string;
    age?: number;
    csrfToken?: string;
    requiresGuardianVerification?: boolean;
    guardianVerifiedAt?: string | null;
  }
}
