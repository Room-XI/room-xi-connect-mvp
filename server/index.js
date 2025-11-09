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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PgStore = pgSession(session);

async function createServer() {
  const app = express();
  
  // CRITICAL SECURITY: Enforce SESSION_SECRET in production
  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is required in production. Set a strong random secret.');
  }
  
  // Verify email configuration on startup
  await verifyEmailConfig();
  
  // Apply security headers
  const { applySecurity } = await import('./middleware/applySecurity.ts');
  applySecurity(app);
  
  app.use(express.json());
  app.use(cookieParser());
  app.use(session({
    store: new PgStore({
      pool,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'room-xi-dev-secret-DEVELOPMENT-ONLY',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict', // CSRF protection
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    }
  }));

  // Import security middleware
  const { validateCsrfToken, requireGuardianVerification } = await import('./middleware/security.ts');
  
  // Import rate limiters
  const { authLimiter, writeLimiter } = await import('./middleware/rateLimit.ts');

  // Import API routes
  const { default: authRoutes } = await import('./routes/auth.js');
  const { default: programRoutes } = await import('./routes/programs.js');
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
  const { default: journalRoutes } = await import('./routes/journal.js');
  const { default: achievementsRoutes } = await import('./routes/achievements.js');
  const { default: kpiRoutes } = await import('./routes/kpi.js');
  const { default: orbSnapshotsRoutes } = await import('./routes/orbSnapshots.js');
  const { default: quotesRoutes } = await import('./routes/quotes.js');
  const { default: notificationsRoutes } = await import('./routes/notifications.js');
  const { default: orbRoutes } = await import('./routes/orb.js');
  const { default: skipTokenRoutes } = await import('./routes/skip-token.js');
  const { default: moodDropRoutes } = await import('./routes/mood-drop.js');
  const { default: geoRoutes } = await import('./routes/geo.js');

  // API routes (public - no CSRF protection needed for GET, but POST/PUT/DELETE will be validated)
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/programs', programRoutes);
  app.use('/api/crisis', crisisRoutes);
  app.use('/api/transparency', transparencyRoutes);
  
  // Protected routes requiring CSRF token with rate limiting
  app.use('/api/checkins', validateCsrfToken, requireGuardianVerification, writeLimiter, checkinRoutes);
  app.use('/api/profile', validateCsrfToken, writeLimiter, profileRoutes);
  app.use('/api/xid', validateCsrfToken, requireGuardianVerification, writeLimiter, xidRoutes);
  app.use('/api/consent', validateCsrfToken, writeLimiter, consentRoutes);
  app.use('/api/ximi', validateCsrfToken, requireGuardianVerification, writeLimiter, ximiRoutes);
  app.use('/api/journal', validateCsrfToken, requireGuardianVerification, writeLimiter, journalRoutes);
  app.use('/api/admin', validateCsrfToken, writeLimiter, adminRoutes);
  app.use('/api/org', validateCsrfToken, writeLimiter, orgRoutes);
  app.use('/api/privacy', validateCsrfToken, writeLimiter, privacyRoutes);
  app.use('/api/achievements', validateCsrfToken, writeLimiter, achievementsRoutes);
  app.use('/api/kpi', validateCsrfToken, kpiRoutes);
  app.use('/api/orb-snapshots', validateCsrfToken, writeLimiter, orbSnapshotsRoutes);
  app.use('/api/quotes', validateCsrfToken, writeLimiter, quotesRoutes);
  app.use('/api/notifications', validateCsrfToken, writeLimiter, notificationsRoutes);
  app.use('/api/orb', validateCsrfToken, writeLimiter, orbRoutes);
  app.use('/api/skip-token', validateCsrfToken, writeLimiter, skipTokenRoutes);
  app.use('/api/mood-drop', validateCsrfToken, writeLimiter, moodDropRoutes);
  app.use('/api/geo', validateCsrfToken, writeLimiter, geoRoutes);

  // Production or development mode
  if (process.env.NODE_ENV === 'production') {
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

  const port = process.env.PORT || 5000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${port}`);
    
    // Initialize the scheduler for weekly orb snapshots
    initializeScheduler();
  });
}

createServer().catch(console.error);
