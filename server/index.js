import express from 'express';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';
import { verifyEmailConfig } from './services/email.provider.js';
import { initializeScheduler } from './services/scheduler.js';
import env from './config/env.ts';
import logger, { httpLogger } from './logger.ts';
import { corsMiddleware } from './middleware/cors.ts';
import { errorHandler } from './middleware/errorHandler.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PgStore = pgSession(session);

async function createServer() {
  const app = express();
  
  // Trust proxy - Required for Replit deployment to get real client IPs for rate limiting
  app.set('trust proxy', 1);
  
  // HTTP request logging
  app.use(httpLogger);
  
  // CORS for mobile (Capacitor) and web origins
  app.use(corsMiddleware);
  
  // Verify email configuration on startup
  await verifyEmailConfig();
  
  // Apply security headers
  const { applySecurity } = await import('./middleware/applySecurity.ts');
  applySecurity(app);
  
  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());
  app.use(session({
    store: new PgStore({
      pool,
      createTableIfMissing: true,
    }),
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict', // CSRF protection
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    }
  }));

  // Import security middleware
  const { validateCsrfToken, requireGuardianVerification } = await import('./middleware/security.ts');
  
  // Import rate limiters
  const { authLimiter, writeLimiter, adminLimiter } = await import('./middleware/rateLimit.ts');

  // Import API routes
  const { default: authRoutes } = await import('./routes/auth.js');
  const { default: programRoutes } = await import('./routes/programs.js');
  const { default: eventsRoutes } = await import('./routes/events.js');
  const { default: checkinRoutes } = await import('./routes/checkins.js');
  const { default: profileRoutes } = await import('./routes/profile.js');
  const { default: xidRoutes } = await import('./routes/xid.js');
  const { default: consentRoutes } = await import('./routes/consent.js');
  const { default: crisisRoutes } = await import('./routes/crisis.js');
  const { default: ximiRoutes } = await import('./routes/ximi.ts');
  const { default: adminRoutes } = await import('./routes/admin.js');
  const { default: orgRoutes } = await import('./routes/org.js');
  const { default: privacyRoutes } = await import('./routes/privacy.js');
  const { default: transparencyRoutes } = await import('./routes/transparency.js');
  const { default: achievementsRoutes } = await import('./routes/achievements.js');
  const { default: kpiRoutes } = await import('./routes/kpi.js');
  const { default: orbSnapshotsRoutes } = await import('./routes/orbSnapshots.js');
  const { default: quotesRoutes } = await import('./routes/quotes.js');
  const { default: notificationsRoutes } = await import('./routes/notifications.js');
  const { default: pushRoutes } = await import('./routes/push.ts');
  const { default: orbRoutes } = await import('./routes/orb.js');
  const { default: skipTokenRoutes } = await import('./routes/skip-token.js');
  const { default: moodDropRoutes } = await import('./routes/mood-drop.js');
  const { default: geoRoutes } = await import('./routes/geo.js');
  const { default: outcomesRoutes } = await import('./routes/outcomes.ts');
  const { default: parentAuthRoutes } = await import('./routes/parent-auth.js');
  const { default: consentAutoRoutes } = await import('./routes/consent-auto.js');
  const { default: demographicsRoutes } = await import('./routes/demographics.js');
  const { default: moodTasksRoutes } = await import('./routes/mood-tasks.js');
  const { default: qrRoutes } = await import('./routes/qr.js');
  const { default: adminPortalRoutes } = await import('./routes/adminPortal.js');
  const { default: disclosureRoutes } = await import('./routes/disclosure.js');
  const { default: healthRoutes } = await import('./routes/health.js');
  const { default: analyticsRoutes } = await import('./routes/analytics.ts');
  const { default: parentPortalRoutes } = await import('./routes/parent-portal.js');

  // Health check endpoints (no auth required for monitoring)
  app.use('/health', healthRoutes);
  app.use('/api/health', healthRoutes);

  // Admin Portal routes (separate CSRF handling, stricter rate limiting)
  app.use('/api/admin-portal', adminLimiter, adminPortalRoutes);
  
  // Privacy-safe analytics (admin only)
  app.use('/api/analytics', adminLimiter, analyticsRoutes);

  // API routes (public - no CSRF protection needed for GET, but POST/PUT/DELETE will be validated)
  // Note: authLimiter is applied per-route in auth.js for login/register only (not session checks)
  app.use('/api/auth', authRoutes);
  app.use('/api/programs', programRoutes);
  app.use('/api/events', eventsRoutes);
  app.use('/api/crisis', crisisRoutes);
  app.use('/api/transparency', transparencyRoutes);
  
  // Protected routes requiring CSRF token with rate limiting
  app.use('/api/checkins', validateCsrfToken, requireGuardianVerification, writeLimiter, checkinRoutes);
  app.use('/api/profile', validateCsrfToken, writeLimiter, profileRoutes);
  app.use('/api/xid', validateCsrfToken, requireGuardianVerification, writeLimiter, xidRoutes);
  app.use('/api/consent', validateCsrfToken, writeLimiter, consentRoutes);
  app.use('/api/ximi', validateCsrfToken, requireGuardianVerification, writeLimiter, ximiRoutes);
  app.use('/api/admin', validateCsrfToken, writeLimiter, adminRoutes);
  app.use('/api/org', validateCsrfToken, writeLimiter, orgRoutes);
  app.use('/api/privacy', validateCsrfToken, writeLimiter, privacyRoutes);
  app.use('/api/achievements', validateCsrfToken, writeLimiter, achievementsRoutes);
  app.use('/api/kpi', validateCsrfToken, kpiRoutes);
  app.use('/api/orb-snapshots', validateCsrfToken, writeLimiter, orbSnapshotsRoutes);
  app.use('/api/quotes', validateCsrfToken, writeLimiter, quotesRoutes);
  app.use('/api/notifications', validateCsrfToken, writeLimiter, notificationsRoutes);
  app.use('/api/push', validateCsrfToken, writeLimiter, pushRoutes);
  app.use('/api/orb', validateCsrfToken, writeLimiter, orbRoutes);
  app.use('/api/skip-token', validateCsrfToken, writeLimiter, skipTokenRoutes);
  app.use('/api/mood-drop', validateCsrfToken, writeLimiter, moodDropRoutes);
  app.use('/api/geo', validateCsrfToken, writeLimiter, geoRoutes);
  app.use('/api/outcomes', validateCsrfToken, requireGuardianVerification, writeLimiter, outcomesRoutes);
  app.use('/api/parent-auth', validateCsrfToken, writeLimiter, parentAuthRoutes);
  app.use('/api/parent-portal', validateCsrfToken, writeLimiter, parentPortalRoutes);
  app.use('/api/consent-auto', validateCsrfToken, writeLimiter, consentAutoRoutes);
  app.use('/api/demographics', validateCsrfToken, writeLimiter, demographicsRoutes);
  app.use('/api/mood-tasks', validateCsrfToken, writeLimiter, moodTasksRoutes);
  app.use('/api/qr', validateCsrfToken, writeLimiter, qrRoutes);
  app.use('/api/disclosure', validateCsrfToken, writeLimiter, disclosureRoutes);

  // Production or development mode
  if (env.NODE_ENV === 'production') {
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
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Development mode - use Vite dev server
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });

    app.use(vite.middlewares);
  }

  // Centralized error handler (must be last middleware)
  app.use(errorHandler);

  const port = env.PORT;
  app.listen(port, '0.0.0.0', () => {
    logger.info({ port, nodeEnv: env.NODE_ENV }, '🚀 Server started');
    
    // Initialize the scheduler for weekly orb snapshots
    initializeScheduler();
  });
}

createServer().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
