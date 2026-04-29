# Security Architecture Documentation

**Room XI Connect**  
**Version:** 1.0  
**Last Updated:** January 2026  
**Classification:** Internal / Auditor Review

---

## 1. Overview

Room XI Connect is a youth-safe platform serving users ages 13-25 in Edmonton, Alberta. The platform enables mood check-ins, program discovery, and AI-powered program search through an AI Program Finder named "Ximi."

### Security Philosophy

- **Privacy-by-Design:** Data minimization, purpose limitation, and consent-first architecture
- **Youth-Focused:** Enhanced protections for minors under 16, including guardian consent requirements
- **Transparency:** Users can view exactly what data is collected and how it's used
- **Consent-First:** No data processing occurs without explicit, informed consent

### Target Compliance Frameworks

- Personal Information Protection Act (PIPA) - Alberta
- Personal Information Protection and Electronic Documents Act (PIPEDA) - Federal
- Health Information Act (HIA) - Alberta (considerations noted)

---

## 2. Authentication & Authorization

### 2.1 Session Management

Sessions are backed by PostgreSQL using `connect-pg-simple` for persistence and reliability.

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Absolute Timeout | 4 hours | Limits session hijacking window |
| Inactivity Timeout | 30 minutes | Protects unattended sessions |
| Cookie Flags | `httpOnly`, `secure` (prod), `sameSite: strict` | Prevents XSS and CSRF |
| Session Store | PostgreSQL (`session` table) | Survives server restarts, enables session revocation |

```javascript
// Session configuration (server/index.js)
cookie: {
  secure: env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'strict',
  maxAge: 1000 * 60 * 60 * 4, // 4 hours
}
```

### 2.2 Password Security

| Parameter | Value | Implementation |
|-----------|-------|----------------|
| Hashing Algorithm | bcrypt | Industry standard, adaptive cost |
| Cost Factor | 12 rounds | ~250ms hash time, OWASP recommended |
| Salt | Automatic (bcrypt) | Unique per password |

```javascript
// Password hashing (server/routes/auth.js)
const passwordHash = await bcrypt.hash(password, 12);
```

### 2.3 Account Lockout

Protection against brute-force attacks with progressive lockout.

| Parameter | Value |
|-----------|-------|
| Max Failed Attempts | 5 |
| Lockout Duration | 30 minutes |
| Tracking Method | In-memory Map (per-email) |
| Cleanup Interval | 5 minutes |

```javascript
// Implementation (server/middleware/accountLockout.ts)
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
```

### 2.4 Guardian Verification Flow (Email Plus)

Users under 16 require guardian consent using a two-step "Email Plus" verification flow:

1. **Step 1 - Initial Consent:** Guardian receives email with link to consent notice page. Guardian reviews full consent notice and clicks "I Agree."
2. **Step 2 - Confirmation:** Guardian receives second email with confirmation link. Clicking confirms consent with IP/User-Agent logging.

| Field | Purpose |
|-------|---------|
| `verificationToken` | Links consent to youth account |
| `initialConsentToken` | Step 1 click tracking |
| `confirmationToken` | Step 2 confirmation |
| `consentNoticeVersion` | Audit trail for consent version |
| `initialConsentIp` / `confirmedIp` | Evidence for PIPA compliance |

### 2.5 Mature Minor Doctrine Support

Alberta's Mature Minor Doctrine allows youth who demonstrate sufficient maturity to consent to certain services without guardian approval. The system supports:

- Age-based automatic thresholds (16+ can self-consent)
- Maturity assessment workflows for 13-15 year olds
- Documented consent evidence for audit purposes

---

## 3. Data Protection

### 3.1 Encryption at Rest

| Layer | Implementation |
|-------|----------------|
| Database | Neon PostgreSQL with encryption at rest (AES-256) |
| Sensitive Fields | Hashed using bcrypt (guardian contact info) |
| API Keys | Environment variables, never stored in code |

### 3.2 Encryption in Transit

| Control | Implementation |
|---------|----------------|
| HTTPS | Enforced in production |
| HSTS | `max-age=31536000; includeSubDomains; preload` |
| TLS | 1.2+ (Replit/Neon infrastructure) |

```javascript
// HSTS header (server/middleware/security.ts)
if (process.env.NODE_ENV === 'production') {
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
}
```

### 3.3 Offline Queue Encryption

Client-side offline data is encrypted using the Web Crypto API before storage in IndexedDB.

| Parameter | Value |
|-----------|-------|
| Algorithm | AES-GCM |
| Key Length | 256 bits |
| IV | Random 12 bytes per encryption |
| Storage | IndexedDB (`room-xi-crypto` database) |

```typescript
// Client-side encryption (src/lib/crypto.ts)
export async function encryptData(data: any): Promise<string> {
  const key = await getOrCreateDeviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    dataBuffer
  );
  // Returns base64 encoded IV + ciphertext
}
```

### 3.4 Sensitive Field Handling

| Field Type | Protection |
|------------|------------|
| Passwords | bcrypt hash (12 rounds) |
| Guardian Contact | bcrypt hash + encrypted storage |
| Reset Tokens | Cryptographically random (32 bytes) |
| CSRF Tokens | Cryptographically random (32 bytes) |

---

## 4. Access Control

### 4.1 Role-Based Access

| Role | Access Level |
|------|--------------|
| Guest | Public programs, transparency dashboard |
| Youth | Personal data, check-ins, Ximi AI, programs |
| Parent | Linked youth dashboard (with consent) |
| Organization | Program management, aggregated analytics |
| Admin | Full system access, KPI dashboards |

### 4.2 Consent Middleware

Two middleware functions enforce consent-based access:

**`requireConsent(consentTypes)`** - Enforces basic legal consents:
- `terms_of_use`
- `privacy_notice`
- `data_collection`
- `ai_personalization`

**`requirePrivacyConsent(consentTypes)`** - Enforces feature-specific privacy toggles:
- `location` - Location sharing
- `orb` - Mood Orb sharing
- `reflections` - Reflection sharing
- `notifications` - Push notifications
- `research` - Research participation

```javascript
// Usage example (server/index.js)
app.use('/api/checkins', validateCsrfToken, requireGuardianVerification, writeLimiter, checkinRoutes);
app.use('/api/geo', validateCsrfToken, writeLimiter, geoRoutes); // geo routes check location consent internally
```

### 4.3 Privacy Toggles Enforcement

Each privacy-sensitive endpoint checks the relevant toggle before processing:

```typescript
// Location consent check (server/routes/geo.js)
const consent = await checkPrivacyConsent(req.session.userId, 'location');
if (!consent.location) {
  return res.status(403).json({ 
    error: 'Consent required',
    code: 'CONSENT_REQUIRED',
    missingConsents: ['location']
  });
}
```

### 4.4 CSRF Protection

| Control | Implementation |
|---------|----------------|
| Token Generation | 32-byte cryptographically random |
| Token Storage | Server-side session |
| Validation | Header (`X-CSRF-Token`) or body (`_csrf`) |
| Exempt Methods | GET, HEAD, OPTIONS |

```javascript
// CSRF validation (server/middleware/security.ts)
export function validateCsrfToken(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  if (!token || token !== req.session.csrfToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
}
```

---

## 5. Privacy Controls

### 5.1 Two-Layer Consent System

**Layer 1: Basic Consents** (Required for account creation)
- Terms of Use acceptance
- Privacy Notice acknowledgment
- Data Collection consent

**Layer 2: Safety Profile Consents** (Optional, feature-gating)
- Location sharing
- Orb visualization sharing
- Reflection sharing
- Push notifications
- Research participation

### 5.2 Granular Privacy Toggles

Users can independently control each privacy setting via the Privacy Center:

| Toggle | Default | Controls |
|--------|---------|----------|
| Location Sharing | OFF | Geo-aggregation features |
| Orb Sharing | OFF | Community orb visualization |
| Reflections Sharing | OFF | Anonymous reflection sharing |
| Notifications | OFF | Push notification delivery |
| Research Participation | OFF | Anonymized research data inclusion |

### 5.3 Data Export (GDPR Right to Portability)

Users can export their personal data in machine-readable format:
- Profile information
- Check-in history
- Consent records
- Program interactions

### 5.4 Account Deletion

| Phase | Action | Timeline |
|-------|--------|----------|
| Soft Delete | Account deactivated, data retained | Immediate |
| Audit Trail | Deletion request logged in `consentEvents` | Immediate |
| Hard Delete | Personal data purged | Per retention policy |
| Anonymization | Aggregate data retained (anonymized) | Permanent |

### 5.5 Consent Withdrawal Workflow

1. User initiates withdrawal in Privacy Center
2. System logs withdrawal in `consentEvents` table
3. Related data processing stops immediately
4. Guardian notification sent (for minors)
5. Data export offered before deletion
6. Confirmation email sent to user

---

## 6. Audit Logging

### 6.1 Audit Tables

**`consentEvents`** - All consent changes with full evidence chain:
```sql
CREATE TABLE consent_events (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  actor TEXT NOT NULL,           -- 'user', 'guardian', 'system', 'admin'
  event_type TEXT NOT NULL,      -- 'grant', 'withdraw', 'expire', 'modify'
  consent_key TEXT,              -- Which consent was affected
  old_value BOOLEAN,
  new_value BOOLEAN,
  ip_address TEXT,
  user_agent TEXT,
  evidence_ref TEXT,             -- Link to supporting evidence
  notes TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`adminLogs`** - Administrative actions with before/after state:
```sql
CREATE TABLE admin_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_record JSONB,
  new_record JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

**`recommendationEvents`** - AI recommendation tracking for transparency:
```sql
CREATE TABLE recommendation_events (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  program_id UUID NOT NULL REFERENCES programs(id),
  recommendation_type TEXT NOT NULL,  -- 'proactive_nudge', 'direct_ask', etc.
  mood_trend TEXT,
  trigger_reason TEXT,
  match_score DECIMAL(3,2),
  user_action TEXT,                   -- 'viewed', 'saved', 'dismissed'
  action_timestamp TIMESTAMPTZ
);
```

### 6.2 Events Tracked

| Category | Events |
|----------|--------|
| Consent | Grant, withdraw, modify, expire, renewal |
| Authentication | Login, logout, failed attempt, lockout |
| Admin Actions | User management, data access, configuration changes |
| Data Access | Export requests, deletion requests |
| AI Interactions | Recommendations shown, user responses |

### 6.3 Retention Policy

| Data Type | Retention Period | Basis |
|-----------|------------------|-------|
| Consent Events | 7 years | PIPA audit requirements |
| Admin Logs | 7 years | Compliance documentation |
| Check-in Data | 2 years or until deletion | User preference |
| Session Data | 4 hours | Security timeout |

---

## 7. Rate Limiting & DDoS Protection

### 7.1 Rate Limit Configuration

| Endpoint Type | Window | Limit | Implementation |
|---------------|--------|-------|----------------|
| Authentication | 15 minutes | 15 requests | `authLimiter` |
| Admin Login | 15 minutes | 5 requests | `adminLimiter` |
| Password Reset | 1 hour | 5 requests | `passwordResetLimiter` |
| Write Operations | 10 minutes | 200 requests | `writeLimiter` |

### 7.2 IPv6-Aware Subnet Limiting

Rate limiting uses `express-rate-limit` with standard headers:

```javascript
// Rate limiter configuration (server/middleware/rateLimit.ts)
export const authLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  limit: 15,                  // 15 attempts
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later" },
});
```

### 7.3 Account Lockout Integration

Account lockout works alongside rate limiting:
1. Rate limiter blocks IP after threshold
2. Account lockout blocks email after 5 failed attempts
3. Both protections are independent and cumulative

---

## 8. Third-Party Integrations

### 8.1 OpenAI (Ximi AI)

| Aspect | Implementation |
|--------|----------------|
| Purpose | AI Program Finder for program search |
| Model | gpt-4o-mini (with fallback handling) |
| Data Sent | Mood type, anonymized context, user message |
| PII Excluded | Names, emails, locations, identifiers |
| API Routing | Replit AI Integrations (managed keys) |

```typescript
// Data sanitization (server/services/ximi.ts)
// Only mood type, wellness dimensions, and user message are sent
// No PII, no identifiers, no location data
enhancedMessage = `User just checked in with mood: ${context.moodType}.\n`;
if (context.wellnessDimensions) {
  enhancedMessage += `Areas affected: ${context.wellnessDimensions.join(', ')}.\n`;
}
```

**Safety Features:**
- Crisis keyword detection before API call
- Content moderation on all responses
- Fallback responses for API failures
- No conversation history stored by OpenAI

### 8.2 City of Edmonton GIS

| Aspect | Implementation |
|--------|----------------|
| Purpose | Community/ward lookup from postal codes |
| Data Accessed | Public boundary data only |
| User Data Sent | Postal code (first 3 characters) |
| Integration Type | Static lookup table |

### 8.3 Email Services (SendGrid/Gmail SMTP)

| Aspect | Implementation |
|--------|----------------|
| Purpose | Transactional emails only |
| Email Types | Verification, password reset, consent requests |
| PII Transmitted | Email address, first name (for personalization) |
| Marketing | None - transactional only |
| Encryption | TLS in transit |

---

## 9. Differential Privacy

### 9.1 H3 Hex Bucketing for Geo-Aggregation

Location data is never exposed directly. All geographic queries use H3 hex bucketing:

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| H3 Resolution | 8 | ~0.46 km² hexagons |
| Minimum Users per Hex | 7 | k-anonymity threshold |
| Coordinates Exposed | Hex centroid only | Never raw lat/lng |

```javascript
// Geo aggregation (server/routes/geo.js)
const H3_RESOLUTION = 8;
const MIN_USERS_PER_HEX = 7;

// Convert to hex - raw coordinates never returned
const hex = latLngToCell(checkin.lat, checkin.lng, H3_RESOLUTION);
```

### 9.2 K-Anonymity Thresholds

| Context | Minimum N | Action if Below |
|---------|-----------|-----------------|
| Geographic Hex | 7 users | Hex suppressed |
| Aggregate Reports | 7 records | Data suppressed |
| Mood Distribution | 7 check-ins | Distribution hidden |

### 9.3 Laplace Noise Injection

Differential privacy is implemented using the Laplace mechanism:

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Epsilon (ε) | 0.5 | Privacy budget |
| Sensitivity | 1 | Max single-user impact |
| Mechanism | Laplace | Noise distribution |
| Review Cycle | Annual | Privacy parameter review |

```javascript
// Differential privacy implementation (server/lib/differentialPrivacy.js)
const DP_CONFIG = {
  epsilon: 0.5,
  minThreshold: 7,
  mechanism: 'laplace',
  enabled: process.env.NODE_ENV === 'production'
};

export function addLaplaceNoise(value, sensitivity = 1, epsilon = 0.5) {
  const scale = sensitivity / epsilon;
  const noise = randomLaplace(0, scale);
  return Math.max(0, Math.round(value + noise));
}
```

**Dual Threshold Protection:**
1. Suppress if TRUE count < 7 (prevents low-population exposure)
2. Suppress if NOISY count < 7 (prevents negative noise disclosure)

---

## 10. Compliance Summary

### 10.1 PIPA (Alberta) - COMPLIANT

| Requirement | Implementation |
|-------------|----------------|
| Collection Limitation | Consent required before collection |
| Use Limitation | Purpose-limited processing |
| Safeguards | Encryption, access controls, audit logging |
| Individual Access | Data export available |
| Challenging Compliance | Privacy Center, support channels |
| Retention Limitation | Defined retention periods |
| Openness | Transparency dashboard |
| Accountability | Documented policies, audit trails |

### 10.2 PIPEDA (Federal) - COMPLIANT

| Principle | Implementation |
|-----------|----------------|
| Accountability | Designated privacy officers, documented policies |
| Identifying Purposes | Clear consent notices, purpose specification |
| Consent | Two-layer consent system, guardian verification |
| Limiting Collection | Data minimization, only necessary fields |
| Limiting Use/Disclosure | Consent-based access controls |
| Accuracy | User can update profile anytime |
| Safeguards | Technical and organizational measures |
| Openness | Transparency dashboard, privacy policy |
| Individual Access | Data export, viewing capabilities |
| Challenging Compliance | Contact mechanisms, complaint process |

### 10.3 HIA (Health Information Act) - CONSIDERATIONS

Room XI Connect collects wellness data (mood check-ins) that may be considered health information under HIA in certain contexts.

| Consideration | Status |
|---------------|--------|
| Health Information Classification | Mood data treated as sensitive |
| Custodian Requirements | Not a health custodian, but follows HIA principles |
| Disclosure Limitations | Strict consent-based sharing |
| Research Use | Requires explicit research consent toggle |
| Crisis Escalation | Follows duty of care protocols |

**Recommendations:**
- Consult with OIPC Alberta if expanding to clinical integrations
- Maintain separation between wellness data and clinical records
- Document any disclosures required by law

---

## 11. Cross-Border Data Processing (PIPEDA Compliance)

### 11.1 AI Program Finder (Ximi) Data Processing

The Ximi AI Program Finder utilizes OpenAI's GPT models for natural language processing. This involves cross-border data transfer subject to PIPEDA requirements.

| Aspect | Implementation |
|--------|----------------|
| Processing Location | United States (OpenAI infrastructure) |
| Data Transferred | Sanitized conversation text only |
| Consent Requirement | Explicit opt-in with cross-border disclosure |
| Consent Language | Clear disclosure that data is processed in the US |

### 11.2 User Consent for Cross-Border Transfer

**Consent Modal Requirements (XimiConsentModal.tsx):**
- Explicit disclosure that conversations are processed by OpenAI servers in the United States
- Checkbox acknowledgement required before enabling AI features
- Users can revoke consent at any time via Settings

**Consent Language Example:**
> "Your conversations with Ximi are processed using AI technology operated by OpenAI, with servers located in the United States. By enabling Ximi, you consent to your conversation data being transferred to and processed in the United States."

### 11.3 Data Minimization for AI Processing

To minimize cross-border data exposure, the following PII sanitization occurs before any data is sent to AI services:

| PII Type | Detection Pattern | Replacement |
|----------|-------------------|-------------|
| Email Addresses | Standard email regex | `[EMAIL]` |
| Phone Numbers | North American formats | `[PHONE]` |
| URLs | http/https links | `[URL]` |
| Postal Codes | Canadian format (A1A 1A1) | `[ADDRESS]` |

**Implementation (server/services/ximi.ts):**
```typescript
export function sanitizePrompt(text: string): SanitizationResult {
  // Redacts PII before sending to AI
  // Logs redaction counts for audit
  // Returns sanitized text and metadata
}
```

### 11.4 Crisis Detection (Local Processing)

**Critical Safety Feature:** Crisis detection is performed locally on the server BEFORE any data sanitization or AI processing. This ensures:

1. Crisis keywords are never redacted and can be detected
2. No delay in crisis response due to AI processing
3. Crisis detection does not depend on third-party services
4. User safety is never compromised by privacy measures

```typescript
// Crisis detection runs on ORIGINAL message (server/services/ximi.ts)
const crisisResult = detectCrisis(userMessage);
if (crisisResult.detected) {
  // Handle crisis immediately - no AI call needed
}
```

### 11.5 Third-Party Processor Agreements

| Processor | Purpose | Agreement Type | Data Residency |
|-----------|---------|----------------|----------------|
| OpenAI | Ximi AI conversations | DPA (via Replit proxy) | United States |
| Neon | Database storage | Standard ToS | Canada (AWS ca-central-1) |
| SendGrid/Gmail | Transactional email | Standard ToS | United States |

### 11.6 User Rights for Cross-Border Data

| Right | Implementation |
|-------|----------------|
| Consent Withdrawal | Settings page toggle to disable Ximi |
| Data Deletion | Request via privacy controls |
| Access | View conversation history |
| Portability | Data export available |

---

## Appendix A: Security Headers

```javascript
// Content Security Policy (server/middleware/security.ts)
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "img-src 'self' data: https: blob:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
  "object-src 'none'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join('; ');

// Additional headers
res.setHeader('Referrer-Policy', 'no-referrer');
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('X-Frame-Options', 'DENY');
res.setHeader('X-XSS-Protection', '1; mode=block');
res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
```

---

## Appendix B: Contact Information

**Privacy Inquiries:**  
Room XI Foundation  
Edmonton, Alberta  
privacy@roomxi.org

**Security Incidents:**  
security@roomxi.org

**Regulatory Contact:**  
Office of the Information and Privacy Commissioner of Alberta (OIPC)  
https://www.oipc.ab.ca

---

*This document is maintained by the Room XI Connect development team and reviewed quarterly for accuracy and compliance.*
