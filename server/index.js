import express from 'express';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';
import { verifyEmailConfig } from './services/email.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PgStore = pgSession(session);

async function createServer() {
  const app = express();
  
  // Verify email configuration on startup
  await verifyEmailConfig();
  
  app.use(express.json());
  app.use(cookieParser());
  app.use(session({
    store: new PgStore({
      pool,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'room-xi-connect-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    }
  }));

  // Import API routes
  const { default: authRoutes } = await import('./routes/auth.js');
  const { default: programRoutes } = await import('./routes/programs.js');
  const { default: checkinRoutes } = await import('./routes/checkins.js');
  const { default: profileRoutes } = await import('./routes/profile.js');
  const { default: xidRoutes } = await import('./routes/xid.js');
  const { default: consentRoutes } = await import('./routes/consent.js');
  const { default: crisisRoutes } = await import('./routes/crisis.js');
  const { default: ximiRoutes } = await import('./routes/ximi.ts');

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/programs', programRoutes);
  app.use('/api/checkins', checkinRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/xid', xidRoutes);
  app.use('/api/consent', consentRoutes);
  app.use('/api/crisis', crisisRoutes);
  app.use('/api/ximi', ximiRoutes);

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });

  app.use(vite.middlewares);

  const port = process.env.PORT || 5000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${port}`);
  });
}

createServer().catch(console.error);
