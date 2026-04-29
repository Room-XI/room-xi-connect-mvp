import express from 'express';
import http from 'http';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { pool } from './db.js';
import { verifyEmailConfig } from './services/email.provider.js';
import { initializeScheduler } from './services/scheduler.js';
import env from './config/env.ts';
import logger, { httpLogger } from './logger.ts';
import { corsMiddleware } from './middleware/cors.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { noCacheForSensitiveRoutes } from './middleware/security.ts';
import { correlationIdMiddleware } from './middleware/correlationId.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PgStore = pgSession(session);

async function createServer({ listen = true, mountStatic = true } = {}) {
  const app = express();
  const httpServer = http.createServer(app);
  
  // Trust proxy - Required for Replit deployment to get real client IPs for rate limiting
  app.set('trust proxy', 1);
  
  // Health check endpoint - must be before all other middleware for fast response
  // This is required for Replit/Cloud Run deployment health checks
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // HTTP request logging
  app.use(httpLogger);
  
  // Correlation ID for request tracing
  app.use(correlationIdMiddleware);
  
  // CORS for mobile (Capacitor) and web origins
  app.use(corsMiddleware);
  
  // Verify email configuration on startup
  const emailConfigured = await verifyEmailConfig();
  if (!emailConfigured) {
    if (env.NODE_ENV === 'production') {
      // In production, email must work for consent/verification flows
      logger.fatal('[Email] Email provider not configured - cannot start in production without email');
      process.exit(1);
    } else {
      logger.warn('[Email] Email provider not configured - some features will be unavailable');
    }
  }
  
  // Apply security headers
  const { applySecurity } = await import('./middleware/applySecurity.ts');
  applySecurity(app);
  
  app.use(express.json({ limit: '200kb' }));
  app.use(express.urlencoded({ extended: true, limit: '200kb' })); // For form submissions (consent forms)
  app.use(cookieParser());
  
  // Apply no-cache headers for sensitive routes (API, profile, auth)
  app.use(noCacheForSensitiveRoutes);
  
  // Initialize session store with error handling
  const sessionStore = new PgStore({
    pool,
    createTableIfMissing: true,
    tableName: 'session',
    errorLog: (err) => {
      logger.error({ err }, 'Session store error');
    }
  });
  
  // Verify session table exists on startup
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        PRIMARY KEY ("sid")
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);
    logger.info('Session table verified/created successfully');
  } catch (err) {
    logger.error({ err }, 'Failed to verify session table');
  }
  
  // Session factory function to create session middleware with custom cookie name
  function createSessionMiddleware(cookieName) {
    return session({
      store: sessionStore,
      name: cookieName,
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60 * 4, // 4 hours
      }
    });
  }
  
  // Create separate session middleware instances for each portal
  const userSession = createSessionMiddleware('user.sid');
  const parentSession = createSessionMiddleware('parent.sid');
  const adminSession = createSessionMiddleware('admin.sid');
  const workerSession = createSessionMiddleware('worker.sid');
  // org.sid was used by the retired /api/org back-office routes (T041).
  
  // Session activity tracking middleware factory
  function createInactivityMiddleware(cookieName) {
    return (req, res, next) => {
      // Check for any active session type (user, parent, admin, youth worker)
      const hasActiveSession = req.session && (
        req.session.userId || 
        req.session.parentId || 
        req.session.isAdminSession ||
        req.session.youthWorkerId
      );
      
      if (hasActiveSession) {
        const now = Date.now();
        const lastActivity = req.session.lastActivity || now;
        const inactivityLimit = 30 * 60 * 1000; // 30 minutes
        
        if (now - lastActivity > inactivityLimit) {
          return req.session.destroy((err) => {
            if (err) logger.error({ err }, 'Failed to destroy inactive session');
            res.clearCookie(cookieName);
            return res.status(401).json({ error: 'Session expired due to inactivity' });
          });
        }
        
        req.session.lastActivity = now;
      }
      next();
    };
  }

  // Import security middleware
  const { validateCsrfToken, requireGuardianVerification } = await import('./middleware/security.ts');
  
  // Import rate limiters
  // T033: authLimiter dropped — legacy /api/auth router was deleted; pilot
  // auth at /api/pilot/auth/* applies its own rate limiter internally.
  const { writeLimiter, adminLimiter } = await import('./middleware/rateLimit.ts');

  // Import API routes
  const { default: programRoutes } = await import('./routes/programs.ts');
  const { default: eventsRoutes } = await import('./routes/events.js');
  const { default: checkinRoutes } = await import('./routes/checkins.ts');
  const { default: profileRoutes } = await import('./routes/profile.js');
  const { default: xidRoutes } = await import('./routes/xid.js');
  const { default: consentRoutes } = await import('./routes/consent.js');
  const { default: crisisRoutes } = await import('./routes/crisis.js');
  const { default: ximiRoutes } = await import('./routes/ximi.ts');
  // T041: legacy back-office routers (admin.js, breach.ts, org.js, org/*)
  // deleted. The late 410 lockdown serves /api/admin, /api/admin/breach,
  // and /api/org via PILOT_DISABLED_API_PREFIXES.
  const { default: privacyRoutes } = await import('./routes/privacy.js');
  // T041: transparency.js router deleted. /api/transparency had no pilot
  // consumer (no frontend page, no test fixture); served by the late 410
  // lockdown via PILOT_DISABLED_API_PREFIXES. Future trust-dashboard work
  // can revive a canonical pilot route under /api/pilot/transparency.
  const { default: quotesRoutes } = await import('./routes/quotes.js');
  const { default: notificationsRoutes } = await import('./routes/notifications.ts');
  const { default: pushRoutes } = await import('./routes/push.ts');
  const { default: orbRoutes } = await import('./routes/orb.js');
  const { default: skipTokenRoutes } = await import('./routes/skip-token.js');
  const { default: moodDropRoutes } = await import('./routes/mood-drop.js');
  const { default: geoRoutes } = await import('./routes/geo.js');
  const { default: outcomesRoutes } = await import('./routes/outcomes.ts');
  const { default: demographicsRoutes } = await import('./routes/demographics.js');
  const { default: moodTasksRoutes } = await import('./routes/mood-tasks.js');
  const { default: qrRoutes } = await import('./routes/qr.js');
  const { default: disclosureRoutes } = await import('./routes/disclosure.js');
  const { default: healthRoutes } = await import('./routes/health.ts');
  const { default: analyticsRoutes } = await import('./routes/analytics.ts');
  const { default: parentPortalRoutes } = await import('./routes/parent-portal.js');
  const { default: healthProfileRoutes } = await import('./routes/healthProfile.ts');
  const { default: safetyPlanRoutes } = await import('./routes/safety-plan.js');
  const { default: consentWalletRoutes } = await import('./routes/consent-wallet.ts');
  const { default: consentWalletStaffRoutes } = await import('./routes/consent-wallet-staff.ts');
  const { default: consentStatusRoutes } = await import('./routes/consent-status.ts');
  const { default: eventRsvpRoutes } = await import('./routes/event-rsvps.ts');
  const { default: attendanceSessionRoutes } = await import('./routes/attendance-sessions.ts');
  const { default: attendancePassRoutes, workerRouter: attendancePassWorkerRoutes } = await import('./routes/attendance-pass.ts');
  const { staffRouter: referralStaffRoutes, youthRouter: referralYouthRoutes } = await import('./routes/referrals.ts');
  const { youthRouter: supportYouthRoutes, workerRouter: supportWorkerRoutes } = await import('./routes/support-requests.ts');
  
  // Phase 2 Routes - Youth Worker Portal & AI Interventions
  const { default: youthWorkerRoutes } = await import('./routes/youth-workers.ts');
  const { default: recommendationsRoutes } = await import('./routes/recommendations.js');
  const { default: rsvpRoutes } = await import('./routes/rsvp.js');
  const { default: xipRoutes } = await import('./routes/xip.ts');

  // Legacy routes disabled for pilot (410 Gone fallbacks added below)

  // Feature Flags
  const { default: featureFlagRoutes } = await import('./routes/feature-flags.ts');

  // Serve static files for server-rendered pages (consent forms, etc.)
  // These are served without CSP script-src restrictions since they're external files
  app.use('/static', express.static(path.join(__dirname, 'public'), {
    maxAge: '1h',
    etag: true
  }));

  // Health check endpoints (no auth required for monitoring)
  app.use('/health', healthRoutes);
  app.use('/api/health', healthRoutes);

  const _flags = await import('./pilot/flags.js');

  // (T041) `conditionalAdminCsrf` was the CSRF wrapper for the now-deleted
  // /api/admin verify-access + login routes. Removed with admin.js.

  /* ────────────────────────────────────────────────────────────────────
   * T041: mount layout — single canonical pilot mount function.
   *
   *   mountPilotRoutes(targetApp)  — ALWAYS registered.
   *     Owns the early consent/auth 410 short-circuit, every canonical
   *     pilot router (/api/pilot/auth, /api/pilot/consent, parent-portal
   *     consent allow-list, public/youth/operator routes, pilot infra
   *     /api/feature-flags + /api/analytics), and the late wrong-lane
   *     410 lockdown.
   *
   * The legacy back-office mount helper (`mountLegacyRoutes`) was retired
   * along with admin.js, breach.ts, org.js, org/*, transparency.js, and
   * the /api/consent-wallet alias. /api/admin, /api/admin/breach, /api/org,
   * /api/transparency, and /api/consent-wallet are now served exclusively
   * by the late 410 lockdown via PILOT_DISABLED_API_PREFIXES.
   * ──────────────────────────────────────────────────────────────────── */

  async function mountPilotRoutes(targetApp) {
    /* ── Early lockdown: legacy consent + auth 410s (PILOT_MODE only) ──
     * Must register before any pilot router that lives under the same
     * /api/* prefix tree, so Express matches the 410 first for retired
     * client paths. Self-gated by PILOT_MODE; under !PILOT_MODE the
     * lockdown is skipped (no legacy routers exist to fall through to —
     * /api/admin, /api/org, /api/transparency, /api/consent-wallet, and
     * /api/auth router files were all deleted in T033 and T041).
     */
    if (_flags.PILOT_MODE) {
      const earlyConsentGone = (_req, res) => res.status(410).json({
        error: 'Gone',
        code: 'LEGACY_API_RETIRED',
        message: 'This legacy consent endpoint is disabled. Use /api/pilot/consent (canonical consent wallet).',
      });
      for (const prefix of _flags.PILOT_DISABLED_CONSENT_PREFIXES) {
        targetApp.use(prefix, earlyConsentGone);
      }

      const earlyAuthGone = (_req, res) => res.status(410).json({
        error: 'Gone',
        code: 'LEGACY_AUTH_RETIRED',
        message: 'This legacy auth endpoint is disabled in pilot mode. Use /api/pilot/auth/youth or /api/pilot/auth/parent.',
      });
      for (const prefix of _flags.PILOT_DISABLED_AUTH_PREFIXES) {
        targetApp.use(prefix, earlyAuthGone);
      }
    }

    // ── Pilot infra on admin.sid (NOT the legacy admin UI) ──
    // Feature-flag overrides + privacy-preserving analytics counters.
    targetApp.use('/api/feature-flags', adminSession, createInactivityMiddleware('admin.sid'), validateCsrfToken, writeLimiter, featureFlagRoutes);
    targetApp.use('/api/analytics', adminSession, createInactivityMiddleware('admin.sid'), validateCsrfToken, adminLimiter, analyticsRoutes);

  // ==================== PARENT PORTAL ROUTES (parent.sid session) ====================
  // T033: legacy /api/parent-auth router file deleted; the early 410 handler
  // above serves that prefix for old clients. Pilot parent auth lives at
  // /api/pilot/auth/parent (mounted further below).
    targetApp.use('/api/parent-portal', parentSession, createInactivityMiddleware('parent.sid'), validateCsrfToken, writeLimiter, parentPortalRoutes);
  
  // Consent Wallet — CANONICAL pilot consent runtime, single source of
  // truth backed by consent_templates, consent_requests, consent_receipts,
  // consent_audit_events, parent_magic_links. Only mounted at the
  // canonical /api/pilot/consent path; the legacy /api/consent-wallet
  // alias was retired in T041 (no remaining consumer) and the prefix
  // now 410s via PILOT_DISABLED_API_PREFIXES.
    targetApp.use('/api/pilot/consent', parentSession, createInactivityMiddleware('parent.sid'), validateCsrfToken, writeLimiter, consentWalletRoutes);

  // ==================== PHASE 2: YOUTH WORKER & AI ROUTES ====================
  // Youth Worker Portal routes - uses dedicated worker session for portal isolation
  // CSRF validation is handled selectively inside the routes (login/logout/csrf-token exempt)
    targetApp.use('/api/youth-workers', workerSession, createInactivityMiddleware('worker.sid'), validateCsrfToken, writeLimiter, youthWorkerRoutes);
    targetApp.use('/api/attendance-sessions', workerSession, createInactivityMiddleware('worker.sid'), validateCsrfToken, writeLimiter, attendanceSessionRoutes);
    targetApp.use('/api/referrals/staff', workerSession, createInactivityMiddleware('worker.sid'), validateCsrfToken, writeLimiter, referralStaffRoutes);
  // Printed attendance passes are worker-issued — mount under workerSession.
  // Must register BEFORE the user-session /api/attendance-pass mount below.
    targetApp.use('/api/attendance-pass/print', workerSession, createInactivityMiddleware('worker.sid'), validateCsrfToken, writeLimiter, attendancePassWorkerRoutes);
  if (_flags.ENABLE_SUPPORT_INBOX) {
      targetApp.use('/api/support-requests/worker', workerSession, createInactivityMiddleware('worker.sid'), validateCsrfToken, writeLimiter, supportWorkerRoutes);
  } else {
      targetApp.use('/api/support-requests/worker', (_req, res) => res.status(410).json({
      error: 'Gone',
      code: 'SUPPORT_INBOX_DISABLED',
      message: 'Support inbox is disabled in this pilot build. Set ENABLE_SUPPORT_INBOX=true to enable.',
    }));
  }

  // ==================== PUBLIC/GUEST ROUTES (stateless, no session) ====================
  // These routes are publicly accessible without authentication
  // Session middleware is NOT applied to avoid unnecessary overhead and keep stateless
  
  // Stateless public routes (no session needed at all)
    targetApp.use('/api/crisis', crisisRoutes);
    // T041: /api/transparency router retired (transparency.js deleted).
    // Late 410 lockdown serves the prefix via PILOT_DISABLED_API_PREFIXES.
  
  // Consent routes - uses token-based security via email links (not session-based)
  // Parents access these via unique consent tokens, not from the React app
  // ALSO supports session-based consent updates for logged-in users (POST /)
    targetApp.use('/api/consent', userSession, writeLimiter, consentRoutes);
  
  // ==================== PUBLIC ROUTES WITH OPTIONAL SESSION ====================
  // These routes support both anonymous and authenticated access
  // Session is parsed (for logged-in users) but NO inactivity check
  // This ensures:
  // - Anonymous users: session object exists but empty, no cookies saved (saveUninitialized: false)
  // - Logged-in users: session populated from cookie, authenticated features work
  // Route handlers check req.session.userId to distinguish between guest/authenticated
  
  // Programs route - public GET, authenticated features (saved programs, write ops) need session
    targetApp.use('/api/programs', userSession, programRoutes);
  // Program recommendations route - personalized suggestions based on user profile
    targetApp.use('/api/programs', userSession, createInactivityMiddleware('user.sid'), recommendationsRoutes);
  // RSVP/Interest route - express interest in programs
    targetApp.use('/api/programs', userSession, createInactivityMiddleware('user.sid'), rsvpRoutes);
  // Events route - public GET, recommendations need session for personalization
    targetApp.use('/api/events', userSession, eventsRoutes);
  
  // ==================== QUOTES ROUTES (user.sid session) ====================
  // All quote endpoints require authentication
    targetApp.use('/api/quotes', userSession, createInactivityMiddleware('user.sid'), quotesRoutes);
  
  // ==================== USER/YOUTH ROUTES (user.sid session) ====================
  // Apply user session only to routes that require authentication
  
  // T033: legacy /api/partners (partner-consent), /api/auth, /api/parent-auth
  // routers were deleted along with their files. The early 410 handler block
  // above already serves /api/auth + /api/parent-auth for old clients.
  // /api/partners has no live caller in pilot — left unmounted.

  // ==================== PILOT AUTH (canonical pilot path) ====================
  // Strict 6-digit PIN, non-enumerating errors, rate-limited, CSRF-rotating.
  // Under PILOT_MODE this is the ONLY auth surface (T009).
  const { pilotYouthAuthRouter, pilotParentAuthRouter } = await import(
    './pilot/routes/pilotAuth.js'
  );
    targetApp.use(
    '/api/pilot/auth/youth',
    userSession,
    createInactivityMiddleware('user.sid'),
    pilotYouthAuthRouter
  );
    targetApp.use(
    '/api/pilot/auth/parent',
    parentSession,
    createInactivityMiddleware('parent.sid'),
    pilotParentAuthRouter
  );
  
  // Protected routes requiring CSRF token with rate limiting
    targetApp.use('/api/checkins', userSession, createInactivityMiddleware('user.sid'), validateCsrfToken, requireGuardianVerification, writeLimiter, checkinRoutes);
    targetApp.use('/api/profile', userSession, createInactivityMiddleware('user.sid'), validateCsrfToken, requireGuardianVerification, writeLimiter, profileRoutes);
    targetApp.use('/api/xid', userSession, createInactivityMiddleware('user.sid'), validateCsrfToken, requireGuardianVerification, writeLimiter, xidRoutes);
    targetApp.use('/api/ximi', userSession, createInactivityMiddleware('user.sid'), validateCsrfToken, requireGuardianVerification, writeLimiter, ximiRoutes);
  // T041: /api/org legacy back-office router (server/routes/org.js + the
  // entire server/routes/org/ subdirectory) was deleted. /api/org* is now
  // served only by the late 410 lockdown via PILOT_DISABLED_API_PREFIXES.
    targetApp.use('/api/privacy', userSession, createInactivityMiddleware('user.sid'), validateCsrfToken, requireGuardianVerification, writeLimiter, privacyRoutes);
  // T024+T033: achievements / kpi / orb-snapshots are out-of-scope for v1 pilot
  // and their router files were deleted. The late goneHandler block below
  // returns 410 for these prefixes via PILOT_DISABLED_API_PREFIXES.
    targetApp.use('/api/notifications', userSession, createInactivityMiddleware('user.sid'), validateCsrfToken, writeLimiter, notificationsRoutes);
    targetApp.use('/api/push', userSession, createInactivityMiddleware('user.sid'), validateCsrfToken, writeLimiter, pushRoutes);
    targetApp.use('/api/orb', userSession, createInactivityMiddleware('user.sid'), validateCsrfToken, writeLimiter, orbRoutes);
    targetApp.use('/api/skip-token', userSession, createInactivityMiddleware('user.sid'), validateCsrfToken, writeLimiter, skipTokenRoutes);
    targetApp.use('/api/mood-drop', userSession, createInactivityMiddleware('user.sid'), validateCsrfToken, writeLimiter, moodDropRoutes);
    targetApp.use('/api/geo', userSession, createInactivityMiddleware('user.sid'), validateCsrfToken, writeLimiter, geoRoutes);
    targetApp.use('/api/outcomes', userSession, createInactivityMiddleware('user.sid'), validateCsrfToken, requireGuardianVerification, writeLimiter, outcomesRoutes);
  // T033: /api/consent-auto router deleted; early 410 handler block above
  // serves the prefix via PILOT_DISABLED_CONSENT_PREFIXES.
    targetApp.use('/api/consent-status', userSession, createInactivityMiddleware('user.sid'), validateCsrfToken, writeLimiter, consentStatusRoutes);
    targetApp.use('/api/consent-wallet-admin', userSession, createInactivityMiddleware('user.sid'), validateCsrfToken, writeLimiter, consentWalletStaffRoutes);
    targetApp.use('/api/event-rsvps', userSession, createInactivityMiddleware('user.sid'), validateCsrfToken, writeLimiter, eventRsvpRoutes);
    targetApp.use('/api/attendance-pass', userSession, createInactivityMiddleware('user.sid'), validateCsrfToken, writeLimiter, attendancePassRoutes);
    targetApp.use('/api/referrals/youth', userSession, createInactivityMiddleware('user.sid'), validateCsrfToken, writeLimiter, referralYouthRoutes);
  if (_flags.ENABLE_SUPPORT_INBOX) {
      targetApp.use('/api/support-requests', userSession, createInactivityMiddleware('user.sid'), validateCsrfToken, writeLimiter, supportYouthRoutes);
  } else {
      targetApp.use('/api/support-requests', (_req, res) => res.status(410).json({
      error: 'Gone',
      code: 'SUPPORT_INBOX_DISABLED',
      message: 'Support requests are disabled in this pilot build. Contact your program worker directly.',
    }));
  }
    targetApp.use('/api/demographics', userSession, createInactivityMiddleware('user.sid'), validateCsrfToken, requireGuardianVerification, writeLimiter, demographicsRoutes);
    targetApp.use('/api/mood-tasks', userSession, createInactivityMiddleware('user.sid'), validateCsrfToken, requireGuardianVerification, writeLimiter, moodTasksRoutes);
    targetApp.use('/api/qr', userSession, createInactivityMiddleware('user.sid'), validateCsrfToken, writeLimiter, qrRoutes);
    targetApp.use('/api/disclosure', userSession, createInactivityMiddleware('user.sid'), validateCsrfToken, writeLimiter, disclosureRoutes);
    targetApp.use('/api/health-profile', userSession, createInactivityMiddleware('user.sid'), validateCsrfToken, requireGuardianVerification, writeLimiter, healthProfileRoutes);
  
  // Safety plan routes - uses token-based security for public share links (like consent routes)
  // The view/:token endpoint is public, other endpoints use requireAuth in the route handler
  // CSRF protection added for state-changing operations (create, update, delete, share)
    targetApp.use('/api/safety-plan', userSession, createInactivityMiddleware('user.sid'), validateCsrfToken, writeLimiter, safetyPlanRoutes);
  
  // XiP Points gamification system — flag-gated. When ENABLE_XIP=false (the
  // v1 pilot default) the mount is skipped entirely; the late lockdown layer
  // below serves /api/xip as 410 via PILOT_DISABLED_API_PREFIXES. This keeps
  // PILOT_CANONICAL_PREFIXES manifest-equal to what mountPilotRoutes actually
  // registers under each flag combination.
    if (_flags.ENABLE_XIP) {
      targetApp.use('/api/xip', userSession, createInactivityMiddleware('user.sid'), validateCsrfToken, writeLimiter, xipRoutes);
    }

    // ── Late lockdown — wrong-lane prefixes return 410 (PILOT_MODE only) ──
    // Source of truth: server/pilot/flags.ts. Self-gated on PILOT_MODE.
    // T041: with admin.js/breach.ts/org.js/transparency.js deleted and the
    // /api/consent-wallet alias removed, this lockdown is the ONLY surface
    // serving those prefixes — no legacy router exists to fall through to.
    const {
      PILOT_DISABLED_API_PREFIXES,
      PILOT_DISABLED_CONSENT_PREFIXES,
      PILOT_MODE,
      ENABLE_TOURNAMENTS,
      ENABLE_JOURNALING,
      ENABLE_AI_INTERVENTIONS,
      ENABLE_DEMOS,
      ENABLE_XIP,
      ENABLE_SUPPORT_INBOX,
      ENABLE_PARENT_PASSWORD_FALLBACK,
      ENABLE_XIMI_PROGRAM_FINDER_ONLY,
      SCHOOL_TENANT_DETERMINISTIC_MODE,
    } = _flags;

    const goneHandler = (_req, res) => res.status(410).json({
      error: 'Gone',
      code: 'LEGACY_API_RETIRED',
      message: 'This feature is not available in the current pilot version.',
    });
    if (PILOT_MODE) {
      for (const prefix of PILOT_DISABLED_API_PREFIXES) {
        targetApp.use(prefix, goneHandler);
      }
      // Legacy consent runtime paths — canonical engine at /api/pilot/consent
      // is now the single source of truth. These legacy endpoints are
      // quarantined (return 410) so they cannot make runtime consent decisions.
      for (const prefix of PILOT_DISABLED_CONSENT_PREFIXES) {
        targetApp.use(prefix, goneHandler);
      }
    }

    // Runtime verification endpoint — lets ops and tests confirm lockdown state.
    targetApp.get('/api/pilot/status', (_req, res) => {
      res.json({
        pilotMode: PILOT_MODE,
        activePortals: ['public', 'youth', 'parent', 'operator'],
        disabledApiPrefixes: [...PILOT_DISABLED_API_PREFIXES],
        flags: {
          ENABLE_TOURNAMENTS,
          ENABLE_JOURNALING,
          ENABLE_AI_INTERVENTIONS,
          ENABLE_DEMOS,
          ENABLE_XIP,
          ENABLE_SUPPORT_INBOX,
          ENABLE_PARENT_PASSWORD_FALLBACK,
          ENABLE_XIMI_PROGRAM_FINDER_ONLY,
          SCHOOL_TENANT_DETERMINISTIC_MODE,
        },
      });
    });

    logger.info(
      {
        context: 'pilot-lockdown',
        pilotMode: PILOT_MODE,
        disabledPrefixes: PILOT_DISABLED_API_PREFIXES,
      },
      `Pilot lockdown active (PILOT_MODE=${PILOT_MODE}): ${PILOT_DISABLED_API_PREFIXES.length} API prefix(es) return 410`
    );
  } // end mountPilotRoutes

  /* ── Mount: only canonical pilot routes (T041 — legacy mount removed) ── */
  await mountPilotRoutes(app);

  // Production or development mode
  if (!mountStatic) {
    // Skip static asset serving / Vite middleware (used by integration tests
    // that boot the real Express app without needing the SPA frontend).
  } else if (env.NODE_ENV === 'production') {
    // Serve static files from dist directory in production
    const distPath = path.resolve(__dirname, '../dist');
    
    // Serve static assets with smart caching
    app.use(express.static(distPath, {
      index: false,
      maxAge: 0, // Default to no caching, set per-file below
      setHeaders: (res, filePath) => {
        const fileName = path.basename(filePath);
        
        // Allow service worker to control all routes
        res.setHeader('Service-Worker-Allowed', '/');
        
        // Detect hashed assets (e.g., index-abc12345.js, logo.def45678.png)
        // Vite generates hashes like: assets/index-[hash].js or logo.[hash].png
        const isHashedAsset = /[.-][a-f0-9]{8,}\.(js|css|woff2?|ttf|eot|svg|png|jpe?g|gif|webp|ico)$/i.test(fileName);
        
        if (isHashedAsset) {
          // Long-term cache for hashed assets (immutable)
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          // No cache for non-hashed files (index.html, sw.js, manifest.json, etc.)
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));
    
    // SPA fallback - serve index.html for all non-API routes with no caching
    app.get('/{*splat}', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Development mode - use Vite dev server
    // Attach HMR WebSocket to our HTTP server to avoid Vite opening its own port
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { server: httpServer } },
      appType: 'spa'
    });

    app.use(vite.middlewares);
  }

  // Centralized error handler (must be last middleware)
  app.use(errorHandler);

  if (listen) {
    const port = env.PORT;
    httpServer.listen(port, '0.0.0.0', () => {
      logger.info({ port, nodeEnv: env.NODE_ENV }, '🚀 Server started');

      // Initialize the scheduler for weekly orb snapshots
      initializeScheduler();
    });
  }

  // T041: only mountPilotRoutes is exposed now — mountLegacyRoutes was
  // deleted along with the admin/breach/org routers it owned.
  return { app, httpServer, mountPilotRoutes };
}

export { createServer };

const isEntryPoint = (() => {
  try {
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
})();

if (isEntryPoint) {
  createServer().catch((err) => {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  });
}
