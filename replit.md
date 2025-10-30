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

## Notes for Future Development
- **Guardian Verification Email:** Implemented using Gmail SMTP (nodemailer). Guardian verification links are sent via email to guardians when youth under 16 sign up. Requires GMAIL_USER and GMAIL_APP_PASSWORD environment variables. See DEVELOPER_HANDOFF.md for setup instructions.