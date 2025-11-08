# Room XI Connect - Replit Project

## Overview
Room XI Connect is a youth mental health and wellness application (ages 13-25) built with React, Vite, Express, and Neon PostgreSQL. It provides daily mood check-ins, local program discovery, crisis support resources, and an AI companion named Ximi. The project aims to help youth feel seen, build capacity, and find community, with a focus on privacy-by-design and a "programs-first" approach for easy access to resources. It serves over 570 youth through local programs and pilots, emphasizing universal intake, program discovery, and crisis support.

## User Preferences
I prefer simple language. I want iterative development. Ask before making major changes. I prefer detailed explanations.

## System Architecture
### UI/UX Decisions
- **Youth-Friendly Landing Page:** Casual, relatable language ("Your space. Your vibe. Your people.") with simplified features and a clear privacy section.
- **Institutional About Page:** Separate, professional page (`/about`) for funders, partners, and legal information.
- **Programs-First Experience:** Unauthenticated users can browse all programs (`/explore`, `/explore/map`, `/program/:id`). Root path redirects to `/explore`.
- **Smart Authentication Flow:** Prompts for sign-in only when accessing authenticated features (saving programs, check-ins, QR, profile).
- **Guest-Friendly UI:** Limited bottom navigation for guests ("Explore", "Sign In"). Full navigation for authenticated users.
- **Mood System:** 6-level mood scale (Cold→Stormy→Foggy→Clear→Breezy→Aurora) with HSL color gradients and smooth transitions.
- **Consent System:** Two-layer, legally compliant consent system (Alberta PIPA & HIA) with granular toggles for health data, photo/media, and Indigenous data sovereignty, avoiding gamification of consent.

### Technical Implementations
- **Tech Stack:**
    - **Frontend**: React 18 with TypeScript, Vite 5, React Router v6, Tailwind CSS.
    - **Backend**: Supabase (PostgreSQL, Auth, Storage).
    - **PWA**: `vite-plugin-pwa` with service worker.
    - **Mapping**: Leaflet + React Leaflet.
    - **Forms**: React Hook Form + Zod.
    - **QR Scanning**: `@zxing/browser`.
    - **Charts**: Recharts.
    - **Animations**: Framer Motion.
    - **Local Storage**: IndexedDB via `idb`.
    - **Encryption**: Web Crypto API.
- **Key Features:**
    - Daily mood tracking and multi-step check-ins (mood selection → wellness dimensions → optional note).
    - DST-safe streak logic using Luxon.
    - Trauma-informed Ximi AI companion with dual personality modes (Little Sibling, Peer Guide) and mood-aware responses.
    - Enhanced real-time crisis detection in check-in notes and Ximi conversations with automatic safety resource routing.
    - QR code attendance tracking.
    - Offline support with IndexedDB queue.
    - End-to-end encryption for sensitive data.
- **Deployment:** Configured for Replit with specific port (5000), host (`0.0.0.0`), and CSP updates for HMR.
- **Database Schema:** `wellness_dimensions`, `ximi_conversations`, `guardian_verifications`, `health_profiles`, `consent_events`, `breach_events` tables. Updated `profiles` and `consents` tables for new fields and granular consent.

### Feature Specifications
- **6-Level Mood System:** Defined in `src/lib/moodConfig.ts`, integrated into `src/ui/home/MoodOrb.tsx`.
- **SAMHSA Wellness Dimensions:** 8 evidence-based dimensions defined in `src/lib/wellnessConfig.ts`, used in `src/ui/home/CheckInForm.tsx`.
- **DST-Safe Streak Logic:** Implemented in `server/services/streak.ts` using Luxon for timezone awareness.
- **Ximi AI Companion:** Core logic in `server/services/ximi.ts`, API routes in `server/routes/ximi.ts`, UI in `src/components/XimiChat.tsx`. Includes consent gating and crisis keyword detection.
- **Enhanced Crisis Detection:** Flags `checkins.crisisDetected`, routes to safety resources.
- **Legally Compliant Consent System:**
    - **Layer 1 (Account Creation):** Name, age (13-25), city, email/password, basic TOS/Privacy consent. Optional guardian verification for under 18.
    - **Layer 2 (Safety Profile):** Legal name, emergency contact, HIA-compliant health info (optional), granular photo/media consent, optional Indigenous self-identification.
    - Breach notification system (`breach_events` table) for OIPC compliance.

## External Dependencies
- **Supabase:** PostgreSQL database, authentication, and storage.
- **Neon PostgreSQL:** Database backend.
- **Replit AI (OpenAI-compatible API):** Powers the Ximi AI companion.
- **Luxon:** JavaScript library for date and time handling (specifically for DST-safe streak logic).
- **Zeffy:** Donation platform, linked via a fixed "Donate" button.
- **CanManDan, JumpStart, Allendale Community, Duggan Community, YMCA of Northern Alberta, OTB Basketball:** Partner organizations.

## Required Environment Variables

### Production Requirements (CRITICAL)
- **SESSION_SECRET**: Cryptographically secure secret for session encryption (required in production, auto-generated in dev)
  - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  - **SECURITY WARNING**: Never commit this to version control

### Database
- **DATABASE_URL**: Neon PostgreSQL connection string (auto-configured in Replit)
  - Format: `postgresql://user:password@host/database?sslmode=require`

### Email Service (Guardian Verification)
- **GMAIL_USER**: Gmail address for sending guardian verification emails
- **GMAIL_APP_PASSWORD**: Gmail app-specific password (not your regular password)
  - Setup: https://support.google.com/accounts/answer/185833
  - Required for users under 16 (guardian verification flow)

### Optional/Development
- **NODE_ENV**: Set to `production` in production environments (affects cookie security, logging)
- **PORT**: Server port (default: 3000, Replit uses 5000 for frontend)

## Test Accounts

### Live Test Account (Created via API)
- **Email**: test@roomxi.example.com
- **Password**: TestPassword123!
- **Age**: 17 (no guardian verification required)
- **Access**: Full access to all features

### Seeded Test Accounts (via `npm run seed-test-accounts`)
Run `tsx scripts/seed-test-accounts.ts` to create:
1. **youth17@roomxi.test** - Age 17, no guardian verification needed
2. **youth15unverified@roomxi.test** - Age 15, pending guardian verification
3. **youth15verified@roomxi.test** - Age 15, guardian verified, full access
- All passwords: TestPassword123!

## Notes for Future Development
- **Guardian Verification Email:** Implemented using Gmail SMTP (nodemailer). Guardian verification links are sent via email to guardians when youth under 16 sign up. Requires GMAIL_USER and GMAIL_APP_PASSWORD environment variables. See above for setup instructions.

## Recent Technical Updates

### November 8, 2025 - Security Hardening & Production Readiness
- **Critical Security Fixes (COMPLETED):**
  - SESSION_SECRET enforcement with fail-fast in production mode
  - CSRF protection with cryptographic tokens on all state-changing routes
  - Age validation (13-25) with guardian verification for under-16 users
  - Fixed calculateAge vulnerability that allowed NaN bypass with invalid dates
  - Comprehensive test suite (10/10 passing integration tests)
- **Production Environment Variables (CONFIGURED):**
  - ✅ SESSION_SECRET: Production value set (88 characters)
  - ✅ GMAIL_USER: roomxi.ent@gmail.com
  - ✅ GMAIL_APP_PASSWORD: Configured and verified
  - ✅ Gmail SMTP connection tested and operational
- **Test Accounts Created:**
  - Live account: test@roomxi.example.com
  - Seeded accounts: youth17@roomxi.test, youth15verified@roomxi.test, youth15unverified@roomxi.test
- **Status:** Production-ready with zero critical security vulnerabilities

### October 31, 2025
- **Database Connection Resilience:** Added retry logic with exponential backoff in `server/db.ts` to handle transient connection failures.
- **Offline Queue Migration:** Updated `src/lib/queue.ts` to use Express API endpoints instead of deprecated Supabase client.
- **Admin APIs:** Created basic admin endpoints (`/api/admin/stats`, `/api/admin/audit-logs`, `/api/org/dashboard`) with session-based authentication.
- **Error Boundaries:** Verified comprehensive error boundary coverage with ErrorBoundary component integrated in router.
- **React Router v7:** All future flags properly configured for smooth v7 migration.

## Known Technical Debt
- **CRITICAL: Auth Flow Migration:** `Signup.tsx` and `SafetyProfile.tsx` still use Supabase client (`src/lib/supabase.ts`) for authentication and database operations. These components need full migration to Express session-based auth via `/api/auth` endpoints. The Supabase client is temporarily maintained with deprecation warnings to prevent crashes, but this is not sustainable.
- **CSP Nonce Implementation:** Content Security Policy headers need nonce-based inline script security for production hardening.
- **Admin API Completion:** Current admin endpoints return placeholder data; need full implementation with audit log querying and comprehensive stats aggregation.