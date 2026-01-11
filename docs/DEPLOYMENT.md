# Room XI Connect - Production Deployment Guide

## Overview

This guide covers deploying Room XI Connect to production. The application is built with Express.js, Neon PostgreSQL, Drizzle ORM, React/Vite, and Capacitor for mobile.

**Table of Contents:**
1. [Environment Configuration](#environment-configuration)
2. [Database Setup](#database-setup)
3. [Email Provider Configuration](#email-provider-configuration)
4. [Security Configuration](#security-configuration)
5. [URL Configuration](#url-configuration)
6. [Session & Cookie Settings](#session--cookie-settings)
7. [Push Notifications](#push-notifications)
8. [Deployment Steps](#deployment-steps)
9. [Health Checks](#health-checks)
10. [Monitoring & Logging](#monitoring--logging)

---

## Environment Configuration

### Required Environment Variables

All of these variables MUST be set in production. The server will refuse to start without them:

#### Database
- **DATABASE_URL** (REQUIRED)
  - Neon PostgreSQL connection string with SSL
  - Format: `postgresql://user:password@host/database?sslmode=require`
  - Get from: https://console.neon.tech/app/projects
  - Example: `postgresql://user:pw@ep-blue-wave-12345.us-east-1.neon.tech/roomxi?sslmode=require`

#### Session & Encryption Secrets (32+ characters)
- **SESSION_SECRET** (REQUIRED)
  - Used for session encryption and CSRF token generation
  - Generate: `openssl rand -base64 32`
  - ⚠️ Must be different in each environment
  - Minimum 32 characters, preferably 64+ for production

- **ENCRYPTION_SECRET** (REQUIRED)
  - Used for health data and journal entry encryption (AES-256)
  - Generate: `openssl rand -base64 32`
  - ⚠️ Never rotate in production - encrypted data becomes unrecoverable
  - Minimum 32 characters

- **SAFETY_PLAN_TOKEN_PEPPER** (REQUIRED)
  - Used to hash tokens for safety plan public share links
  - Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  - Used in: `/api/safety-plan/share` and public view endpoints
  - ⚠️ Changing this invalidates existing share links

#### Email Configuration (REQUIRED)
Choose ONE provider:

**Option A: Gmail SMTP (Free, recommended for small deployments)**
```env
EMAIL_PROVIDER=gmail
GMAIL_USER=your-app-email@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password
EMAIL_FROM=consent@roomxiconnect.org
EMAIL_FROM_NAME=Room XI Connect
```

Setup:
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows/Mac/Linux"
3. Copy the 16-character app password
4. Use that as GMAIL_APP_PASSWORD (not your regular Gmail password)

**Option B: SendGrid (Paid, ~$15/month, recommended for scale)**
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your_api_key_here
EMAIL_FROM=no-reply@roomxiconnect.org
EMAIL_FROM_NAME=Room XI Connect
```

Setup:
1. Create account at https://sendgrid.com
2. Go to Settings > API Keys
3. Create new API key with Mail Send permission
4. Copy the key (only shown once)

#### Admin Portal
- **ADMIN_USERNAME** (Recommended)
  - Username for admin portal access
  - Example: `admin`

- **ADMIN_PASSWORD** (Recommended)
  - BCrypt hashed password for admin portal
  - ⚠️ Must be bcrypt hashed (32+ character hash starting with $2b$)
  - Never store plaintext passwords
  - Generate: Use an online bcrypt tool or `npm run hash-password`

- **ADMIN_ACCESS_CODE** (Optional)
  - Access code for admin registration
  - Used to prevent unauthorized admin account creation

#### Node Environment
- **NODE_ENV**
  - Must be set to `production` for production deployments
  - Triggers additional security checks and logging

### Optional Environment Variables

#### Push Notifications (VAPID Keys)
```env
VAPID_PUBLIC_KEY=your_vapid_public_key_here
VAPID_PRIVATE_KEY=your_vapid_private_key_here
VAPID_EMAIL=mailto:support@roomxiconnect.org
```

Generate:
```bash
npm install -g web-push
web-push generate-vapid-keys
```

These enable push notifications on web and mobile devices.

#### OpenAI / Ximi AI (Optional)
```env
AI_INTEGRATIONS_OPENAI_API_KEY=sk-your_key_here
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
```

Or use Replit AI integrations (preferred).

#### Mobile API Base URL
```env
VITE_API_BASE_URL=https://your-replit-url.repl.co
```

Used when Capacitor mobile apps need to call the API.

#### Public URL Configuration
See [URL Configuration](#url-configuration) section below.

---

## Database Setup

### Initial Setup

1. **Create Neon Project**
   - Go to https://console.neon.tech/projects
   - Create new project
   - Copy the connection string to DATABASE_URL

2. **Run Migrations**
   ```bash
   npm run db:migrate
   ```
   This creates all required tables and indexes using Drizzle migrations.

3. **Verify Schema**
   ```bash
   npm run db:check
   ```

### Database Tables

Key tables created by migrations:
- `users` - Youth user accounts
- `parents` - Guardian/parent accounts
- `organizations` - Partner organizations
- `profiles` - User profiles and demographic data
- `checkins` - Mood check-in history
- `safety_plans` - Safety plans and share links
- `session` - Express session storage
- `consent_audit_log` - Immutable consent audit log
- `push_subscriptions` - Web push subscriptions
- And 20+ more specialized tables for features

### Row-Level Security (RLS)

⚠️ **Important**: If using Supabase instead of Neon:
- RLS policies must be enabled
- See `SECURITY_ARCHITECTURE.md` for RLS policy configuration
- Neon does not enforce RLS at database level; security relies on application logic

### Backup Strategy

**Recommended:**
- Neon provides automated backups (check project settings)
- Enable 7-day backup retention minimum
- Test restore procedures quarterly
- See `docs/BACKUP_AND_RECOVERY.md` for recovery procedures

---

## Email Provider Configuration

### Pre-Deployment Checklist

- [ ] EMAIL_PROVIDER set to "gmail" or "sendgrid"
- [ ] Credentials tested with test email
- [ ] Sender email verified (check spam folder)
- [ ] Bounce handling configured (if using SendGrid)

### Testing Email Delivery

```bash
# Test invitation email
curl -X POST http://localhost:5000/api/parent-auth/send-invite \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","youthName":"Test User"}'

# Test verification email
curl -X POST http://localhost:5000/api/auth/send-verification \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Email Links

All email links use `getPublicUrl()` to generate the correct domain:
- Verification links: `/api/auth/verify-email/{token}`
- Consent links: `/api/consent/verify/{token}`
- Parent invite links: `/api/parent-auth/accept-invite/{inviteToken}`
- Safety plan share links: `/api/safety-plan/view/{shareToken}`

**The PUBLIC_URL MUST be set correctly or links will fail.**

---

## Security Configuration

### CSRF Protection

- **Enabled for all POST/PUT/DELETE operations** (except public endpoints and token-based auth)
- **CSRF token is sent via `X-CSRF-Token` header**
- Frontend automatically includes token from cookies
- Protect with: `validateCsrfToken` middleware

### Rate Limiting

Automatic rate limiting on:
- **Authentication**: 50 requests per 15 minutes per IP
- **Write Operations**: 200 requests per 10 minutes per IP
- **Admin Operations**: 100 requests per 15 minutes per IP

### Account Lockout

- 5 failed login attempts → 30 minute lockout
- Configurable in `server/config/env.ts`
- Lockout clears after duration or manual admin reset

### Password Requirements

- Minimum 12 characters
- Minimum 3 of: uppercase, lowercase, numbers, symbols
- Not in common password list

---

## URL Configuration

### Public URL for Email Links

Email links (consent, verification, invitations) use `getPublicUrl()` which checks in order:

1. **PUBLIC_URL** - Recommended for most deployments
   ```env
   PUBLIC_URL=https://roomxiconnect.org
   ```

2. **REPLIT_DEPLOYMENT_URL** - Auto-set by Replit
   ```env
   REPLIT_DEPLOYMENT_URL=my-app.replit.dev
   ```
   → Generates: `https://my-app.replit.dev`

3. **REPLIT_APP_URL** - Alternative Replit variable
   ```env
   REPLIT_APP_URL=https://my-app.replit.dev
   ```

4. **Request headers** - Falls back to HTTP request headers
   - `X-Forwarded-Host` (from load balancer)
   - `Host` header
   - Reconstructs with `X-Forwarded-Proto` or request protocol

5. **Default fallback** - `http://localhost:5000` (development only)

### Setup for Different Deployment Targets

**Replit Deployment:**
```env
PUBLIC_URL=https://my-app.replit.dev
# or let REPLIT_DEPLOYMENT_URL auto-populate
```

**Custom Domain:**
```env
PUBLIC_URL=https://roomxiconnect.org
```

**Docker/Cloud Run:**
```env
PUBLIC_URL=https://your-cloud-run-url
# OR configure via environment variable passed by platform
```

**Development:**
```env
PUBLIC_URL=http://localhost:5000
# or leave unset to use localhost fallback
```

### Verification

Test that URLs are resolved correctly:
```bash
# Check server logs on startup - should show correct URL
# Look for: "getPublicUrl resolved to: https://..."

# Send test email - check that link has correct domain
# Or check /health endpoint response headers
```

---

## Session & Cookie Settings

### Configuration

All three session types (user, parent, admin) use identical secure settings:

```javascript
cookie: {
  secure: true,           // HTTPS only in production
  httpOnly: true,         // Not accessible via JavaScript
  sameSite: 'strict',     // CSRF protection - no cross-site cookie send
  maxAge: 4 * 60 * 60 * 1000  // 4 hours
}
```

### Three Independent Session Types

**1. User/Youth Session (user.sid)**
- Stores: `userId`, `lastActivity`, etc.
- Used by: Youth users accessing their account
- Expires: 4 hours of inactivity

**2. Parent Session (parent.sid)**
- Stores: `parentId`, `lastActivity`, etc.
- Used by: Parents accessing parent portal
- Expires: 4 hours of inactivity
- Separate from user session - parent can be logged in independently

**3. Admin Session (admin.sid)**
- Stores: `isAdminSession`, `lastActivity`, etc.
- Used by: Admins accessing admin portal
- Expires: 4 hours of inactivity
- Separate from user session - admin can be logged in independently

### Inactivity Timeout

After 30 minutes of inactivity, session is destroyed:
- `req.session.lastActivity` is updated on each request
- If now - lastActivity > 30 minutes → session cleared
- User must re-login
- Response: `{ error: 'Session expired due to inactivity' }`

### Session Storage

Sessions are stored in PostgreSQL `session` table:
- Auto-created if missing (via `createTableIfMissing`)
- Survives server restart
- Expired sessions auto-cleaned by PostgreSQL

### Trust Proxy

For load balancers and reverse proxies:
```javascript
app.set('trust proxy', 1);  // Trust one proxy (Replit/Cloud Run)
```

This ensures:
- `X-Forwarded-For` header is used for client IP
- Rate limiting works correctly behind proxy
- `secure` cookie works with HTTPS proxy

### CSRF Protection

Each portal namespace has its own CSRF token endpoint:

| Portal | CSRF Token Endpoint | Cookie | Required Header |
|--------|---------------------|--------|-----------------|
| Youth  | `GET /api/csrf-token` | `user.sid` | `X-CSRF-Token` |
| Parent | `GET /api/parent-auth/csrf-token` | `parent.sid` | `X-CSRF-Token` |
| Admin  | `GET /api/admin/csrf-token` | `admin.sid` | `X-CSRF-Token` |

**Implementation:**
1. Frontend fetches CSRF token on session start
2. Token is cached per-namespace in the API client
3. All mutating requests (POST, PUT, DELETE, PATCH) require the header
4. Token is validated against the session

**Example CSRF flow:**
```bash
# Get CSRF token for youth session
curl -X GET http://localhost:5000/api/csrf-token \
  -H "Cookie: user.sid=your_session_id"
# Returns: {"csrfToken":"abc123..."}

# Use token in POST request
curl -X POST http://localhost:5000/api/mood \
  -H "Cookie: user.sid=your_session_id" \
  -H "X-CSRF-Token: abc123..." \
  -H "Content-Type: application/json" \
  -d '{"level":4}'
```

---

## Push Notifications

### Setup

1. **Generate VAPID Keys** (do this ONCE per environment)
   ```bash
   npm install -g web-push
   web-push generate-vapid-keys
   ```

2. **Add to Environment**
   ```env
   VAPID_PUBLIC_KEY=your_public_key_here
   VAPID_PRIVATE_KEY=your_private_key_here
   VAPID_EMAIL=mailto:support@roomxiconnect.org
   ```

3. **Verify in Logs**
   - Server should log: "Push notifications initialized"
   - If keys missing: "Push notifications disabled"

### Testing

1. Subscribe to notifications (frontend does this automatically)
2. Send test notification:
   ```bash
   curl -X POST http://localhost:5000/api/push/test \
     -H "Content-Type: application/json" \
     -H "Cookie: user.sid=your_session_id"
   ```

---

## Deployment Steps

### Pre-Deployment Checklist

- [ ] All environment variables set (use `docs/DEPLOYMENT_CHECKLIST.md`)
- [ ] Database migrations run: `npm run db:migrate`
- [ ] Build test passes: `npm run build`
- [ ] Security headers verified: `npm run test:security`
- [ ] E2E tests passing: `npm run test:e2e`
- [ ] Email delivery tested
- [ ] PUBLIC_URL configured correctly
- [ ] Admin credentials set (ADMIN_USERNAME, ADMIN_PASSWORD)
- [ ] VAPID keys generated (if using push notifications)

### Deployment on Replit

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Production deployment"
   git push origin main
   ```

2. **Deploy from Replit Console**
   - Go to "Publish" tab
   - Click "Deploy with Replit"
   - Select "Always on" for 24/7 hosting
   - Add environment variables from `.env.example`
   - Click "Deploy"

3. **Verify Deployment**
   - Check `/health` endpoint: `curl https://your-app.replit.dev/health`
   - Check logs for startup messages
   - Test email functionality
   - Test user login flow

### Deployment on Other Platforms

**Cloud Run:**
```bash
gcloud run deploy room-xi-connect \
  --source . \
  --platform managed \
  --region us-central1 \
  --set-env-vars DATABASE_URL=$DATABASE_URL,SESSION_SECRET=$SESSION_SECRET \
  # ... add all other env vars ...
```

**Vercel (Frontend Only):**
- Frontend deploys to Vercel
- Backend deploys to separate service (Replit, Cloud Run, etc.)
- Set `VITE_API_BASE_URL` to backend URL

**Heroku (Deprecated):**
- Not recommended - limited free tier
- Use Replit or Cloud Run instead

---

## Health Checks

### Endpoint

**GET /health**
- No authentication required
- Response: `{ status: 'ok', timestamp: '...' }`
- Used by: Load balancers, monitoring systems

### Setup Monitoring

1. **Replit Health Checks**
   - Automatically configured
   - Checks `/health` every 30 seconds

2. **Custom Monitoring**
   ```bash
   # Uptime monitoring (e.g., Uptime Robot)
   # Check: GET https://your-app.replit.dev/health
   # Interval: 5 minutes
   # Alert if: Response time > 5s or status != 200
   ```

---

## Monitoring & Logging

### Structured Logging

The application uses Pino logger with structured JSON output:

```javascript
logger.info({ context: 'auth', userId: '...' }, 'User logged in');
// Output: { level: 30, time: '...', context: 'auth', userId: '...', msg: 'User logged in' }
```

### Key Events to Monitor

- **auth** - Login attempts, password resets
- **consent** - Consent withdrawal, verification
- **email** - Delivery status, failures
- **safety-plan** - Share link access, failures
- **rate-limit** - Rate limit hits
- **session-store** - Session storage errors
- **database** - Query errors, performance

### Log Aggregation

For production, integrate with:
- **Sentry** (error tracking) - Set `SENTRY_DSN`
- **Datadog** - Agent collects structured logs
- **Google Cloud Logging** - Auto-collected on Cloud Run
- **Splunk** - Send logs via HTTP collector

### Database Metrics

Monitor these tables for trends:
- `users` - Growth of user base
- `checkins` - Daily active usage
- `consent_audit_log` - Consent withdrawal rate
- `session` - Concurrent session count

---

## Post-Deployment

### Immediate Actions (Day 1)

1. ✅ Verify health endpoint working
2. ✅ Test user signup flow
3. ✅ Test parent consent invitation
4. ✅ Test admin login
5. ✅ Check email delivery (check spam folder)
6. ✅ Verify database connectivity
7. ✅ Review logs for errors

### Ongoing Maintenance

**Weekly:**
- Check error logs for new patterns
- Verify email delivery rate > 95%
- Check database performance

**Monthly:**
- Review session storage size
- Clean old sessions if needed
- Rotate VAPID keys if compromised
- Review user signup quality

**Quarterly:**
- Test disaster recovery (backup restore)
- Security audit of environment variables
- Review rate limiting settings
- Update dependencies for security patches

---

## Troubleshooting

### Common Issues

**Email not sending:**
- Check EMAIL_PROVIDER is "gmail" or "sendgrid"
- Verify credentials are correct
- Check email in spam folder
- Look for errors in logs: `grep email logs`
- Test endpoint: `POST /api/auth/send-verification`

**Session not persisting:**
- Check DATABASE_URL is correct
- Verify `session` table exists: `SELECT * FROM session LIMIT 1`
- Check SESSION_SECRET is set
- Look for session store errors in logs

**URL in emails is wrong:**
- Check PUBLIC_URL environment variable
- Check REPLIT_DEPLOYMENT_URL if using Replit
- Verify X-Forwarded-Host header if behind proxy
- Test: `curl http://localhost:5000/health` and check domain in emails

**Cookies not working:**
- Verify `secure: true` for HTTPS
- Check `httpOnly: true` is set
- Verify `sameSite: 'strict'` is not breaking cross-site forms
- Check browser dev tools > Application > Cookies

**Push notifications not working:**
- Check VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are set
- Verify browser supports push notifications
- Check logs for "Push notifications initialized"
- Test endpoint: `POST /api/push/test`

---

## References

- [SECURITY_ARCHITECTURE.md](../SECURITY_ARCHITECTURE.md) - Security design decisions
- [SECURITY_IMPLEMENTATION.md](../SECURITY_IMPLEMENTATION.md) - Security implementation details
- [docs/BACKUP_AND_RECOVERY.md](./BACKUP_AND_RECOVERY.md) - Database backup and recovery
- [.env.example](../.env.example) - All environment variables with descriptions
- [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md) - Pre-deployment checklist

---

**Last Updated:** January 11, 2026
**Version:** 2.0 - Production Ready
