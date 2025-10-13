# Room XI Connect - Replit Project

## Overview
Room XI Connect is a youth mental health and wellness application built with React, Vite, and Supabase. It provides daily check-ins, local program discovery, and crisis support resources for young people.

## Recent Changes

### Programs-First Experience (October 13, 2025)

Implemented a "programs-first" browsing experience to reduce friction and allow all youths to discover programs without signing in:

1. **Public Program Browsing**
   - Unauthenticated users can now browse all programs without logging in
   - Public routes: `/explore`, `/explore/map`, `/program/:id`
   - Root path (`/`) redirects to `/explore` for better discovery

2. **Smart Authentication Flow**
   - Protected routes (`/home`, `/qr`, `/me`) redirect guests to `/explore`
   - Sign-in prompts appear when users try to use auth-required features:
     - Saving/bookmarking programs
     - Daily mood check-ins
     - QR code attendance
     - Personal profile and settings

3. **Guest-Friendly UI**
   - Bottom navigation shows only "Explore" and "Sign In" for guests
   - Authenticated users see full navigation (Home, Explore, QR, Me)
   - "Saved" tab hidden for guests; shows sign-in prompt if accessed directly
   - Program cards redirect to login when guests try to save

4. **Always-Available Features**
   - Crisis support ("Get help") button always visible, regardless of auth status
   - Program browsing and map view fully functional without account

### Vercel to Replit Migration (October 12, 2025)
Successfully migrated the project from Vercel to Replit with the following changes:

1. **Port Configuration**
   - Updated Vite dev server to run on port 5000 (Replit requirement)
   - Configured host to `0.0.0.0` for external access
   - Added `allowedHosts: true` to accept Replit development URLs
   - Updated both `vite.config.ts` and `package.json` scripts

2. **TypeScript Configuration**
   - Added missing `tsconfig.node.json` for Vite config type checking
   - Resolved build configuration issues

3. **React Import Fix**
   - Fixed missing React import in `src/lib/queue.ts`
   - Updated to use direct imports: `import { useState, useEffect } from 'react'`

4. **CSP Updates for Development**
   - Added `ws:` to Content Security Policy to allow Vite HMR WebSocket connections
   - This enables hot module replacement in development

5. **Service Worker Management**
   - Disabled service worker registration in development mode
   - Added automatic unregistration of service workers in dev to prevent caching issues
   - Service worker remains active in production builds

6. **Deployment Configuration**
   - Set up autoscale deployment for the static React app
   - Configured build command: `npm run build`
   - Configured preview command for production serving

## Project Architecture

### Tech Stack
- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Routing**: React Router v6
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Styling**: Tailwind CSS
- **PWA**: vite-plugin-pwa with service worker
- **Maps**: Leaflet + React Leaflet
- **Forms**: React Hook Form + Zod validation
- **QR Scanning**: @zxing/browser
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Local Storage**: IndexedDB via idb
- **Encryption**: Web Crypto API

### Key Features
- **Programs-first browsing** - Discover programs without signing in
- Daily mood tracking and check-ins (requires auth)
- Local program/activity discovery with map view (public)
- Crisis support resources (always available)
- QR code attendance tracking (requires auth)
- Save/bookmark favorite programs (requires auth)
- Offline support with IndexedDB queue
- PWA capabilities
- End-to-end encryption for sensitive data

## Environment Variables

Required secrets (already configured in Replit Secrets):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous/public key

Optional environment variables (see DEPLOYMENT.md for full list):
- `VITE_MAP_TILES_URL` - Custom map tile server URL
- `VITE_MAP_ATTRIBUTION` - Map attribution text
- Feature flags for PWA, offline mode, etc.

## Development

### Running Locally
```bash
npm install
npm run dev
```

The app will be available at http://localhost:5000

### Building for Production
```bash
npm run build
npm run preview
```

### Testing
```bash
npm test          # Run tests
npm run test:ui   # Run tests with UI
```

## User Preferences
(To be added as preferences are discovered)

## Notes
- Service workers are disabled in development to prevent caching issues
- The app uses Replit's built-in secrets management for API keys
- Port 5000 is required for Replit deployment
- CSP includes `ws:` for development HMR (Vite WebSocket hot reload)
