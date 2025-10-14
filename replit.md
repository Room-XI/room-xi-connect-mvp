# Room XI Connect - Replit Project

## Overview
Room XI Connect is a youth mental health and wellness application built with React, Vite, and Supabase. It provides daily check-ins, local program discovery, and crisis support resources for young people.

## Recent Changes

### Youth-Friendly Landing Page & Donate Button (October 14, 2025)

Redesigned the landing page to speak directly to youth with casual, authentic language while creating a separate page for institutional messaging:

1. **Login Page Transformation (Youth-Focused)**
   - Updated hero: "Your space. Your vibe. Your people." instead of mission statement
   - Casual, relatable copy: "Find free programs, connect with your community, and get support when you need it"
   - Simplified features: "Find Programs", "Track Your Journey", "Get Help" (not institutional jargon)
   - Privacy section speaks to youth: "We only collect what's needed to keep you safe at programs. You control what gets shared."
   - Removed stats, partners, and institutional content from main app

2. **Donate Button**
   - Fixed position top-right with gold background
   - Links to Zeffy donation form: https://www.zeffy.com/en-CA/donation-form/build-the-room-xi-youth-hub-in-edmonton
   - Heart icon for warmth

3. **New About Page (/about)**
   - Created separate institutional page for funders, parents, partners
   - Contains: Room 11 Foundation mission, challenge/solution, privacy by design, who we serve, impact stats (570+ youth), partners, legal compliance (PIPA/HIA)
   - Professional tone with complete organizational information
   - Clear back navigation to main app
   - Donate CTA at bottom

4. **Navigation Updates**
   - "Learn More about Room 11" link in login footer → routes to /about
   - About page has back button → returns to /auth/login
   - Clean separation: youth see casual app, stakeholders get formal details

## Recent Changes

### Legally Compliant Consent System Implementation (October 14, 2025)

Implemented a comprehensive two-layer consent system that addresses all major legal red flags for Alberta PIPA and HIA compliance:

#### **Red Flags Fixed:**

1. **Health Data Separation (HIA Compliance)**
   - Created separate `health_profiles` table with dedicated consent tracking
   - Health data (allergies, medications, medical conditions) requires explicit HIA-compliant consent
   - Separate IP/user agent tracking for health consent audit trail

2. **Individual Age Selection**
   - Users select exact age (13-25) instead of age brackets
   - Age 13+ can provide meaningful consent per PIPEDA guidelines
   - Under 13 blocked from signup (federal requirement)

3. **Granular Photo/Media Consent**
   - 5 separate consent toggles, each independently revocable:
     - Internal program documentation
     - Social media posts
     - Website/marketing materials  
     - Fundraising materials
     - Story/testimonial use (requires additional written consent)
   - Complies with PIPA purpose limitation principle

4. **Breach Notification System**
   - `breach_events` table tracks incidents with severity levels
   - 72-hour OIPC notification tracking (Alberta PIPA requirement)
   - Automatic guardian notification for affected minors
   - Remediation tracking and evidence storage

5. **Indigenous Data Sovereignty**
   - Optional Indigenous self-identification with OCAP principles disclosure
   - Clear explanation of data ownership, control, access, and possession
   - Community/Nation field for cultural context

6. **No Gamification of Consent**
   - XP points awarded only for non-consent actions (profile completion, program attendance)
   - Consent actions never trigger rewards (prevents coercion under PIPA)

7. **Guardian Verification (Optional for 13+)**
   - Age 13+ can self-consent (meaningful consent capacity)
   - Guardian verification optional but recommended for under 18 (trust/credibility)
   - Email/SMS verification links with 15-minute expiration
   - Alberta Digital ID placeholder for future integration (no public API available yet)
   - Verification tracking with consent events audit trail

#### **Two-Layer Consent System:**

**Layer 1: Account Creation (60 seconds)**
- Required at signup for all users:
  - Name (first, last, preferred/nickname)
  - Individual age selection (13-25)
  - City and optional postal code
  - Email/password for login
  - Acceptance of Terms of Use, Privacy Notice, Data Collection consent
- For users under 18:
  - Optional guardian contact (email or phone) for verification
  - Verification link sent to guardian with 15-min expiration
  - Account usable immediately, guardian approval adds credibility

**Layer 2: Safety Profile (Before First In-Person Program)**
- Required once before attending any in-person session:
  - Legal first and last name (for emergency identification)
  - Emergency contact (name, phone, relationship - must be different from guardian)
  - Health information (optional, requires separate HIA consent):
    - Allergies
    - Medical conditions
    - Current medications
    - Accessibility needs
    - Dietary restrictions
  - Photo/media consent (5 separate granular toggles, all optional and revocable)
  - Optional Indigenous self-identification (OCAP principles disclosed)
- Awards +30 XP upon completion (for profile completion, not consent)

#### **Database Schema Updates:**

New tables created:
- `guardian_verifications`: Tracks guardian approval requests and verification status
- `health_profiles`: HIA-compliant health data storage with separate consent
- `consent_events`: Complete audit trail for all consent actions (PIPA requirement)
- `breach_events`: Breach incident tracking with OIPC notification compliance

Updated `profiles` table with:
- Individual age field (13-25)
- Layer 1 fields: first_name, last_name, preferred_name, city, postal_code
- Layer 2 fields: legal names, emergency contact details
- Indigenous identity fields (optional, OCAP-compliant)
- Progress tracking: account_complete, safety_profile_complete, program_profile_complete
- XP points (never awarded for consent actions)

Updated `consents` table with granular consent types:
- terms_of_use, privacy_notice, data_collection (Layer 1)
- photo_internal, photo_social_media, photo_website, photo_fundraising, photo_story (Layer 2)
- analytics_opt_in, ai_personalization, crash_reporting
- marketing_email, marketing_sms

#### **New Routes & Components:**

- `/auth/signup`: Multi-step signup flow with age-appropriate consent
- `/safety-profile`: Layer 2 safety information collection before program attendance
- Updated `/auth/login`: Links to new signup flow

#### **Compliance Documentation:**

Research confirmed:
- Federally incorporated non-profits in Alberta are subject to **Alberta PIPA** (not PIPEDA)
- Age 13+ can provide meaningful consent under PIPEDA (applied to PIPA)
- Mature minor doctrine (14-16+) applies but requires case-by-case assessment
- Health data triggers **Health Information Act** requirements (separate from PIPA)
- Alberta Digital ID has no public API yet (ATB Ventures Oliu platform requires partnership)

## Recent Changes

### Landing Page & Guest Experience Improvements (October 13, 2025)

Enhanced the guest experience and created a comprehensive landing page:

1. **Room 11 Foundation Landing Page**
   - Transformed `/auth/login` into a full landing page that serves both marketing and sign-in purposes
   - Hero section with Room 11 mission: "Help youth ages 13 to 25 feel seen, build capacity, and find community"
   - Comprehensive "About" sections explaining the challenge youth face and Room 11's solutions
   - Impact stats: 570+ youth served across local programs and pilots
   - Updated partner showcase: CanManDan, JumpStart, Allendale Community, Duggan Community, YMCA of Northern Alberta, OTB Basketball

2. **Updated Solution Messaging**
   - Publicly highlights: Universal Intake, Program Discovery, and Crisis Support
   - Daily check-ins remain a feature but not emphasized in public marketing (auth-required feature)
   - Privacy-by-design messaging with non-identifying XID and clear consent

3. **AI Companion Privacy**
   - Ximi AI assistant now hidden from guest users
   - Only authenticated users see the AI companion
   - Reduces clutter for guests exploring programs

4. **Enhanced CTAs**
   - "Explore Programs" button for immediate guest access
   - "Sign In" scroll anchor for returning users
   - "Continue as guest" option below sign-in form

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
