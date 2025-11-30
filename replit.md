## Overview
Room XI Connect is a youth mental health and wellness application (ages 13-25) providing daily mood check-ins, local program discovery, crisis support, and an AI companion named Ximi. The project aims to empower youth by connecting them with resources and community, with a strong focus on privacy-by-design and a "programs-first" approach. It currently serves over 570 youth through local programs and pilots, emphasizing universal intake, program discovery, and robust crisis support.

## User Preferences
I prefer simple language. I want iterative development. Ask before making major changes. I prefer detailed explanations. Journal feature is disabled for now.

## System Architecture
### UI/UX Decisions
The application features a youth-friendly landing page, a professional "About" page, and a "programs-first" experience for unauthenticated users. Authentication is smart, prompting sign-in only for authenticated features. UI adapts for guests versus authenticated users. A 6-level mood scale with HSL color gradients is used for mood tracking. A two-layer, legally compliant consent system (Alberta PIPA & HIA) with granular toggles is implemented, avoiding gamification. The mood orb uses brand design tokens to create a "living sphere of blended light" with a teal-to-gold mist aesthetic, using trauma-informed pastel tones. High-contrast accessibility mode is implemented.

### Technical Implementations
The tech stack includes React 18 with TypeScript, Vite 5, React Router v6, Tailwind CSS for the frontend, and Express/Neon PostgreSQL (Drizzle ORM) for the backend. Key features include daily mood tracking with DST-safe streak logic, a trauma-informed AI companion (Ximi) with dual personality modes and real-time crisis detection, QR code attendance tracking, offline support via IndexedDB, and end-to-end encryption for sensitive data. Geo-spatial privacy is ensured using H3 Hex Bucketing with dual k-anonymity thresholds and Laplace noise.

The 7-day canvas-based gradient mood orb features a smooth, dreamy pastel aesthetic with pixel-perfect canvas rendering, HSL color interpolation, Gaussian blur, saturation reduction, lightness increase, and smoothstep-based center blending. It includes HiDPI/retina display support, per-day mood aggregation with Variability and Consistency Index analytics, ambient page background tint, privacy-safe PNG export, accessibility features (high-contrast, pattern overlays, color key drawer), and 30-day historical timelapse browsing.

A comprehensive admin dashboard provides real-time analytics and monitoring with role-based access control, live statistics widgets, Recharts visualizations, and an audit log viewer. The dashboard is accessible via a separate admin login system using credentials stored in environment variables (ADMIN_USERNAME and ADMIN_PASSWORD). The admin login endpoint implements session regeneration for security, rate limiting to prevent brute-force attacks, and bcrypt password hashing. Admin sessions are tracked separately from user sessions using the `isAdminSession` flag. A dedicated admin login modal is available on the main login page for authorized personnel. The API layer includes automatic CSRF token retry logic that handles stale tokens gracefully.

A Demographics Research System enables analysis of family communication gaps around identity. Youth self-identify across three dimensions (sexual orientation, racial/ethnic identity, gender identity) during signup, kept completely private from parents. Guardian verification separately collects parent perceptions of their child's identity, stored in a separate table. The admin dashboard features a Demographics Comparison component showing alignment percentages, identity disclosure patterns, and analysis of which identities youth are most/least comfortable sharing with parents.

A Profile Progress Meter on the Me/Profile page shows youth their demographics completion percentage, tracking required fields (age, gender, ethnicity, postal_code) with a visual progress bar and encouraging message to complete their profile.

A Disclosure Request System allows parents to request access to view their youth's demographics data. Youth receive pending disclosure requests and can approve or deny them. The system includes audit logging for all disclosure actions and request expiration after 30 days.

Push notifications are implemented via the Web Push API, including subscription management, user permission control, and scheduled daily check-in reminders. A Capacitor Mobile Wrapper provides iOS and Android native app functionality.

### Feature Specifications
The application utilizes a 6-level mood system and SAMHSA Wellness Dimensions. Ximi AI includes consent gating, crisis keyword detection, and a persistent "not a clinician" disclaimer banner in the chat interface. A legally compliant consent system involves basic consent and a second layer for a "Safety Profile" with optional health information and granular media consent. A breach notification system is in place for OIPC compliance. Authenticated users must complete a daily check-in by 8 AM (Edmonton time) before browsing programs, managed by an "Explore Gate." Ximi proactively supports users during mood declines based on a statistical mood variance detection service.

A dedicated consent flow for Ximi AI requires explicit user opt-in, displaying comprehensive information about Ximi and its privacy-first design. Backend enforcement ensures all chat requests require user consent. An outcome tracking system enables youth to share program experiences and view privacy-safe peer insights, utilizing k-anonymity and differential privacy for aggregation.

A Real-Time Event Finder enables discovery of programs currently running in Edmonton with time-based filtering. It uses a `program_events` database table supporting recurring, one-time, seasonal, and overnight events. Backend API endpoints provide "happening now," "today," "this-weekend," and "later" event listings with Luxon timezone handling for Edmonton.

The Programs tab uses a grouped view that combines recurring events into single program entries with weekly schedule summaries (e.g., "Tue, Thu 4-5pm"). This eliminates duplicate listings for programs running on multiple days. The Today tab continues to show individual events scheduled for that specific day. Overnight programs (22:00-06:00) are filtered out of the day programs view.

### Edmonton Youth Programs Database (November 2025)
The programs database contains 75+ comprehensive Edmonton youth resources including:
- **Mental Health**: Kickstand, Y Mind, CASA Mental Health, AHS AccessMHA, ACCESS Open Minds
- **LGBTQ+ & 2Spirit**: CHEW Project, Rainbow Alliance, Pride Centre, Skipping Stone, Edmonton 2 Spirit Society
- **Indigenous**: Canadian Native Friendship Centre, Bent Arrow, Native Counselling Services, Hope for Wellness Helpline
- **Arts & Creative**: Edmonton Musical Theatre, Citadel Theatre, City Arts Centre, Creation Space, iHuman Youth Society
- **Sports & Recreation**: Edmonton Grads Basketball, True North Basketball, Hockey Edmonton, JHL Ball Hockey, City of Edmonton rec programs
- **Employment & Career**: Prospect Youth Employment Services, YOUCAN Verto Project, EmployAbilities Learn 2 Earn, BGS Career Ventures
- **Crisis Support**: Kids Help Phone, YESS Emergency Shelter, Sexual Assault Centre of Edmonton

### Developer Utilities
A feature flags module (`src/lib/featureFlags.ts`) allows runtime toggling of features like FEATURE_SUPPRESS_WARNINGS. A centralized logger utility (`src/lib/logger.ts`) replaces console.log statements throughout the codebase. Both useMoodGradient and useExploreGate hooks check for user authentication before making API calls to prevent 401 errors for unauthenticated visitors.

### Guardian Email Enhancements
Guardian invitation emails now include comprehensive Room XI overview explaining the platform's purpose, crisis support contacts (Kids Help Phone), links to the About page and Privacy Policy, and clear privacy notes explaining what parents can and cannot see.

## External Dependencies
- **Neon PostgreSQL:** Primary database backend (via DATABASE_URL).
- **Replit AI (OpenAI-compatible API):** Powers the Ximi AI companion (gpt-4o-mini).
- **Luxon:** JavaScript library for date and time handling.
- **Zeffy:** Donation platform.
- **Nodemailer:** Used for sending guardian verification emails via Gmail SMTP.
- **h3-js:** H3 hexagon geo-spatial indexing library.
- **html2canvas:** DOM-to-image library for mood orb PNG export.

## Security Notes
- Session-based authentication with custom CSRF middleware (csurf package removed)
- Hardened Content Security Policy (CSP) - no unsafe-inline/eval in production
- Admin credentials stored in environment secrets (ADMIN_USERNAME, ADMIN_PASSWORD)
- Rate limiting on authentication endpoints
- Health check endpoints: /health, /health/live, /health/ready for monitoring
- Automated data retention scheduler runs daily at 3 AM Edmonton time
- Mandatory reporting clause added to Terms of Service (Section 9)
- Remaining known vulnerability: esbuild (requires Vite 7.x upgrade - breaking change)
- React Router v7_startTransition flag warning is expected - not supported in current react-router-dom version

## Key Files
- `server/routes/demographics.js` - Demographics API with progress endpoint
- `server/routes/disclosure.js` - Disclosure request system endpoints
- `server/routes/health.js` - Health check endpoints for monitoring
- `server/routes/programs.js` - Programs API with search, filtering, and geolocation
- `server/routes/events.js` - Events API with grouped programs, today, and happening-now endpoints
- `server/services/scheduler.js` - Background scheduler with data retention and guardian reminders
- `server/middleware/security.ts` - Security headers and CSRF protection
- `server/services/moderation.ts` - OpenAI content moderation wrapper for Ximi
- `server/services/aiTransparency.ts` - Aggregate AI metrics recording (no content logging)
- `server/routes/analytics.ts` - Privacy-safe aggregate analytics (admin-only)
- `src/components/ProfileProgress.tsx` - Visual profile completion meter
- `src/components/XimiChat.tsx` - AI companion with persistent disclaimer banner
- `src/routes/TermsOfService.tsx` - Terms including mandatory reporting clause
- `src/lib/featureFlags.ts` - Feature flag management
- `src/lib/logger.ts` - Centralized logging utility
- `src/hooks/useMoodGradient.ts` - Auth-aware mood gradient hook
- `src/hooks/useExploreGate.ts` - Auth-aware explore gate hook
- `server/services/parentInvite.ts` - Enhanced guardian email service

## Recent Changes (November 30, 2025) - Production Hardening & Cleanup
- **Journal Feature Removed**: Removed all journal-related routes, components, and UI (Journal.tsx, LivingJournal.tsx, journal.js). Database table retained for historical data export compliance.
- **Content Moderation**: Added OpenAI moderation wrapper for Ximi chat (server/services/moderation.ts) as second safety layer beyond crisis keywords
- **AI Transparency**: Added aggregate-only metrics tracking (server/services/aiTransparency.ts) - counts total messages, crisis detections, moderation flags without logging content
- **Privacy-Safe Analytics**: Added /api/analytics endpoints (admin-only) for aggregate mood trends, crisis counts, program engagement
- **Configurable Data Retention**: Added RETENTION_XIMI_DAYS and RETENTION_CHECKINS_DAYS environment variables for optional cleanup of old data
- **Guardian Reminders**: Scheduler now sends one reminder email after 7 days for unverified guardians, tracking via reminder_sent_at column
- **TypeScript Server Config**: Added tsconfig.server.json and npm run typecheck:server for server-specific type checking
- **Rate Limiting Tightened**: Auth endpoints now limited to 15 requests/15min, admin endpoints to 5 requests/15min

## Previous Changes (November 28, 2025)
- Implemented grouped programs view: Programs tab now shows each program once with weekly schedule summary
- Added `/api/events/programs-grouped` endpoint for program-centric browsing
- Today tab continues showing individual daily events
- Filtered overnight programs (22:00-06:00) from day programs view
- Created reproducible seed file for Edmonton youth programs

## Changes (November 26, 2025)
- Removed duplicate "Youth Maker & Tech Club" program from database
- Deleted unused files: OrgDashboard.tsx (341 lines), ui/home/MoodOrb.tsx (135 lines)
- Removed legacy supabase/ folder (app uses Neon PostgreSQL, not Supabase)
- Moved test files from root to tests/ folder
- Consolidated duplicate documentation (removed DEVELOPER-HANDOFF.md, README_V2.md)
- Added persistent "I'm not a clinician" disclaimer banner to Ximi chat interface
- Added Section 9 (Mandatory Reporting) to Terms of Service with Alberta legal references
- Renumbered Terms of Service sections 10-15
- Added 45+ new Edmonton youth programs covering mental health, LGBTQ+, Indigenous, arts, sports, employment
- Total programs in database: 75

## Cleanup Completed
- Removed: `supabase/` folder, `src/routes/org/OrgDashboard.tsx`, `src/ui/home/MoodOrb.tsx`
- Removed: `DEVELOPER-HANDOFF.md`, `README_V2.md`
- Removed: `src/routes/Journal.tsx`, `src/components/LivingJournal.tsx`, `server/routes/journal.js` (journal feature disabled)
- Moved to tests/: `test-e2e.js`, `test-ximi.js`, `test-ximi.ts`, `test-ximi-integration.js`, `test-parent-consent.js`, `test-low-power-mode.html`
