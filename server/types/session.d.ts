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
    adminId?: string;
    consents?: Record<string, boolean>;
    email?: string;
    firstName?: string;
    age?: number;
    csrfToken?: string;
    requiresGuardianVerification?: boolean;
    guardianVerifiedAt?: string | null;
    // Phase 2: Youth Worker session
    youthWorkerId?: string;
    organizationId?: string;
    isYouthWorkerSession?: boolean;
    youthWorkerRole?: string;
    // Phase 2: Parent session (extended)
    parentId?: string;
    isParentSession?: boolean;
  }
}
