# Room XI Connect - Replit Project

## Overview
Room XI Connect is a youth mental health and wellness application built with React, Vite, and Supabase. It provides daily check-ins, local program discovery, and crisis support resources for young people.

## Recent Changes (October 12, 2025)

### Vercel to Replit Migration
Successfully migrated the project from Vercel to Replit with the following changes:

1. **Port Configuration**
   - Updated Vite dev server to run on port 5000 (Replit requirement)
   - Configured host to `0.0.0.0` for external access
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
- Daily mood tracking and check-ins
- Local program/activity discovery with map view
- Crisis support resources
- QR code attendance tracking
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
