# Security Implementation Guide

## Overview
This document outlines the comprehensive security implementation for Room XI Connect, covering database security, consent management, breach notification, and compliance with Alberta's PIPA and HIA regulations.

---

## 1. Database Security

### Architecture Note: Application-Level Security

**IMPORTANT**: Room XI Connect uses **Neon PostgreSQL with Express sessions**, NOT Supabase auth. This means:

1. **Security is enforced at the application level** (Express middleware + query filtering)
2. **RLS policies exist for defense-in-depth** but are NOT actively enforced
3. **Connection pooling prevents session-variable-based RLS** from working

### Row Level Security (RLS) Policies (Defense-in-Depth)

**Location**: `supabase/policies.sql`

RLS policies exist as a defense-in-depth measure. If you later migrate to a system with per-user database connections (like Supabase), these policies will protect data at the database level.

**Current Security Enforcement** (Application Level):

### Middleware Protection

**Location**: `server/middleware/rls.ts`

```typescript
// Require authentication
router.get('/profile', requireAuth, async (req, res) => {
  // Only authenticated users can access
  const userId = req.session.userId;
  // ... query filtered by userId
});

// Require admin privileges
router.get('/admin/users', requireAdmin, async (req, res) => {
  // Only admins can access
});

// Require specific consents
router.post('/checkin', requireConsent(['terms_of_use', 'data_collection']), async (req, res) => {
  // Only users with granted consents can access
});
```

**Query-Level Filtering**:
```typescript
// Always filter by user ID from session
const checkins = await db.select().from(checkins)
  .where(eq(checkins.userId, req.session.userId));

// Never trust client input for user ID
const profile = await db.select().from(profiles)
  .where(eq(profiles.userId, req.session.userId)); // ✅ Safe
```

---

## 2. Consent Management

### Consent Types

**Layer 1 (Account Creation)**:
- `terms_of_use`
- `privacy_notice`
- `data_collection`

**Layer 2 (Optional Features)**:
- `photo_internal`
- `photo_social_media`
- `photo_website`
- `photo_fundraising`
- `photo_story`
- `analytics_opt_in`
- `ai_personalization`
- `crash_reporting`
- `marketing_email`
- `marketing_sms`

### Consent Event Logging

All consent changes are automatically logged to `consent_events` table with:
- Actor (youth, guardian, staff, system)
- Event type (granted, revoked, updated, requested, verified)
- Old and new values
- IP address and user agent
- Timestamp

**Implementation**: Database trigger in `supabase/policies.sql`

### Consent Gates

**Location**: `server/middleware/consent.ts`

```typescript
// Require specific consents
router.post('/checkin', requireConsent(['terms_of_use', 'data_collection']), async (req, res) => {...});

// Require Ximi consent
router.post('/ximi/chat', requireXimiConsent(), async (req, res) => {...});

// Require account completion
router.get('/programs/saved', requireAccountComplete(), async (req, res) => {...});
```

### Guardian Verification

**Ages**: Required for users under 16  
**Method**: Email verification with PIN  
**Expiry**: 30 minutes  
**Implementation**: `server/routes/consent.js` + `server/services/email.js`

**Flow**:
1. Youth provides guardian email during signup
2. System sends verification email to guardian
3. Guardian clicks link, enters 6-digit PIN, provides name
4. System records verification with timestamp and IP
5. Youth can proceed with account setup

---

## 3. Breach Notification (PIPA Compliance)

### 72-Hour Requirement

Alberta PIPA requires notification to OIPC within 72 hours of discovering a breach.

**Breach Types**:
- `unauthorized_access`
- `data_loss`
- `ransomware`
- `insider_threat`
- `accidental_disclosure`
- `other`

**Severity Levels**:
- `critical`: Health data, youth under 16, credentials, 100+ users
- `high`: Emergency contacts, guardian info, 10-99 users
- `medium`: Check-in notes, program preferences, 1-9 users
- `low`: Public data only, no PII

### Breach Management API

**Location**: `server/routes/breach.ts`

**Create breach event** (Admin only):
```bash
POST /api/breach
{
  "breachType": "unauthorized_access",
  "severity": "high",
  "affectedUserCount": 25,
  "description": "...",
  "oipcNotificationRequired": true
}
```

**Update breach event** (Admin only):
```bash
PATCH /api/breach/:id
{
  "oipcNotifiedAt": "2024-10-31T14:15:00Z",
  "oipcNotificationMethod": "phone",
  "oipcReferenceNumber": "2024-BR-1234",
  "individualsNotifiedAt": "2024-10-31T16:00:00Z",
  "remediationSteps": "...",
  "remediationCompletedAt": "2024-11-01T10:00:00Z"
}
```

### Runbook

**Location**: `BREACH_RUNBOOK.md`

Comprehensive step-by-step procedures for:
1. Immediate containment (0-4 hours)
2. Severity classification (4-8 hours)
3. OIPC notification (within 72 hours)
4. Individual notification (within 72 hours)
5. Remediation (ongoing)
6. Post-incident review (2 weeks)

**OIPC Contact**: 780-422-6860 | generalinfo@oipc.ab.ca

---

## 4. Security Headers

**Location**: `server/middleware/security.ts`

### Content Security Policy (CSP)
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self' ws: wss:;
frame-ancestors 'none';
```

**TODO**: Remove `unsafe-inline` and `unsafe-eval` by implementing nonces

### Other Headers
- **Referrer-Policy**: `no-referrer` (don't leak URLs)
- **Permissions-Policy**: Restrict camera, microphone, geolocation
- **X-Content-Type-Options**: `nosniff` (prevent MIME sniffing)
- **X-Frame-Options**: `DENY` (prevent clickjacking)
- **Cross-Origin-Opener-Policy**: `same-origin` (isolate context)
- **Strict-Transport-Security**: Force HTTPS (production only)

### Cache Control

Sensitive routes (`/api/`, `/me`, `/profile`, `/checkin`) have:
```
Cache-Control: no-store, no-cache, must-revalidate, private
```

---

## 5. Data Retention & Auto-Deletion

### 30-Day Unconsented Account Deletion

**Script**: `scripts/cleanup-unconsented-accounts.ts`

**Purpose**: Automatically delete accounts that haven't granted basic consents after 30 days (PIPA compliance)

**Run manually**:
```bash
# Dry run (preview only)
npm run cleanup:unconsented

# Execute deletion
npm run cleanup:unconsented -- --execute
```

**Cron schedule** (recommended):
```cron
0 2 * * * # Daily at 2 AM
```

**Logic**:
1. Find users created >30 days ago
2. Check if they have granted `terms_of_use` consent
3. Log consent event with reason
4. Delete user (CASCADE deletes related records)

---

## 6. Audit Trail

All admin and sensitive actions are logged to `audit_trail` table with:
- Timestamp
- User ID
- Organization ID (if applicable)
- Action type
- Table name
- Record ID
- Record data (JSONB)
- IP address
- User agent
- Session ID
- Result (success/failure)
- Error message
- Duration (ms)

**Helper function**: `logAuditTrail()` in `server/middleware/rls.ts`

---

## 7. Type Safety & Code Quality

### ESLint Configuration

**File**: `.eslintrc.cjs`

- Warns on `: any` usage
- Enforces React hooks rules
- Detects unused variables
- Recommends `const` over `let`

**Run**:
```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
```

### Prettier Configuration

**File**: `.prettierrc.cjs`

- Single quotes
- 2-space indentation
- Semicolons
- 100 character line width

**Run**:
```bash
npm run format        # Format all files
npm run format:check  # Check formatting
```

### TypeScript

**Run**:
```bash
npm run typecheck     # Type checking without building
```

---

## 8. Testing

### Test Files

**Unit tests**:
- `src/lib/__tests__/crypto.test.ts` - Encryption/decryption
- `src/lib/__tests__/queue.test.ts` - Offline queue

**Component tests**:
- `src/ui/home/__tests__/MoodOrb.test.tsx` - Mood orb rendering

**Run**:
```bash
npm test              # Run all tests
npm run test:ui       # Open Vitest UI
```

### Accessibility Testing

**Package**: `@axe-core/react` (installed)

**Usage**:
```typescript
import { axe } from '@axe-core/react';

if (process.env.NODE_ENV !== 'production') {
  axe(React, ReactDOM, 1000);
}
```

---

## 9. Admin Role System

### Admin Privileges

**Database**: `profiles.is_admin` column (boolean)

**Enforcement**:
1. **Middleware**: `requireAdmin()` checks `req.session.isAdmin`
2. **RLS Policies**: `app_is_admin()` function
3. **Frontend**: Admin routes gated by role check

**Admin Routes**:
- `/admin` - Admin dashboard
- `/api/breach` - Breach management
- `/api/admin/*` - Admin-only APIs

**Setting admin**:
```sql
UPDATE profiles SET is_admin = true WHERE user_id = '<user-id>';
```

---

## 10. Environment Variables

**Required for security features**:

```bash
# Database
DATABASE_URL=postgresql://...

# Session
SESSION_SECRET=random-secret-key-change-in-production

# Email (Guardian verification)
GMAIL_USER=roomxi.ent@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# AI (Ximi companion)
AI_INTEGRATIONS_OPENAI_API_KEY=...
AI_INTEGRATIONS_OPENAI_BASE_URL=...
```

**Never commit secrets to version control!**

---

## 11. Compliance Checklist

### Alberta PIPA (Personal Information Protection Act)
- ✅ Consent before data collection
- ✅ Granular consent options
- ✅ Audit trail of consent changes
- ✅ Guardian verification for youth under 16
- ✅ 72-hour breach notification to OIPC
- ✅ Individual breach notification
- ✅ Right to access (data export)
- ✅ Right to deletion
- ✅ 30-day deletion for unconsented accounts

### Alberta HIA (Health Information Act)
- ✅ Separate health data consent
- ✅ Health profiles table with dedicated consent
- ✅ Enhanced security for health data
- ✅ Breach notification for health data

### Best Practices
- ✅ Row Level Security (RLS)
- ✅ Security headers (CSP, COEP, COOP)
- ✅ Encrypted offline data
- ✅ Session-based authentication
- ✅ Type safety (TypeScript)
- ✅ Code quality tools (ESLint, Prettier)
- ✅ Automated testing
- ✅ Accessibility checking

---

## 12. Migration Guide

### Applying Security Updates

**1. Run database migrations**:
```bash
# Apply comprehensive schema
psql $DATABASE_URL -f supabase/migrations/20241031000000_init_comprehensive.sql

# Apply RLS policies
psql $DATABASE_URL -f supabase/policies.sql
```

**2. Update server startup** (`server/index.js`):
```javascript
import { securityHeaders, noCacheForSensitiveRoutes } from './middleware/security.js';

// Apply security headers
app.use(securityHeaders);
app.use(noCacheForSensitiveRoutes);
```

**3. Add consent gates to routes**:
```javascript
import { requireConsent, requireAccountComplete } from './middleware/consent.js';

router.post('/api/checkins', requireConsent(['terms_of_use', 'data_collection']), ...);
```

**4. Set up cron for cleanup**:
```bash
# Add to crontab
0 2 * * * cd /path/to/project && npm run cleanup:unconsented -- --execute
```

---

## Contact & Support

**Internal Security Lead**: [Name]  
**OIPC**: 780-422-6860 | generalinfo@oipc.ab.ca  
**Legal Counsel**: [Law firm]  

**Report Security Issues**: security@roomxiconnect.org
