## Overview
Room XI Connect is a youth mental health and wellness application (ages 13-25) providing daily mood check-ins, local program discovery, crisis support, and an AI companion named Ximi. The project aims to empower youth by connecting them with resources and community, with a strong focus on privacy-by-design and a "programs-first" approach. It currently serves over 570 youth, emphasizing universal intake, program discovery, and robust crisis support.

## User Preferences
I prefer simple language. I want iterative development. Ask before making major changes. I prefer detailed explanations. Journal feature is disabled for now.

## System Architecture
### UI/UX Decisions
The application features a youth-friendly landing page, a professional "About" page, and a "programs-first" experience. Authentication is smart, prompting sign-in only for authenticated features. A 6-level mood scale with HSL color gradients is used for mood tracking. A two-layer, legally compliant consent system (Alberta PIPA & HIA) with granular toggles is implemented, avoiding gamification. The mood orb uses brand design tokens with a teal-to-gold mist aesthetic and trauma-informed pastel tones. High-contrast accessibility mode is implemented.

### Technical Implementations
The tech stack includes React 18 with TypeScript, Vite 5, React Router v6, Tailwind CSS for the frontend, and Express/Neon PostgreSQL (Drizzle ORM) for the backend. Key features include daily mood tracking with DST-safe streak logic, a trauma-informed AI companion (Ximi) with a unified warm-yet-grounded personality and real-time crisis detection, QR code attendance tracking, offline support via IndexedDB, and end-to-end encryption for sensitive data. Geo-spatial privacy is ensured using H3 Hex Bucketing with dual k-anonymity thresholds and Laplace noise. The 7-day canvas-based gradient mood orb features a smooth, dreamy pastel aesthetic with pixel-perfect canvas rendering, HSL color interpolation, Gaussian blur, saturation reduction, lightness increase, and smoothstep-based center blending. It includes HiDPI/retina display support, per-day mood aggregation with Variability and Consistency Index analytics, ambient page background tint, privacy-safe PNG export, and accessibility features.

A comprehensive admin dashboard provides real-time analytics and monitoring with role-based access control, live statistics widgets, Recharts visualizations, and an audit log viewer. The admin login implements session regeneration, rate limiting, and bcrypt password hashing. A Demographics Research System allows youth to self-identify across three dimensions (sexual orientation, racial/ethnic identity, gender identity), kept private from parents. Guardian verification separately collects parent perceptions. The admin dashboard features a Demographics Comparison component. A Profile Progress Meter tracks required fields for youth. A Disclosure Request System allows parents to request access to their youth's demographics data, with youth approval/denial and audit logging. Push notifications are implemented via the Web Push API for daily check-in reminders. A Capacitor Mobile Wrapper provides iOS and Android native app functionality.

### Feature Specifications
The application utilizes a 6-level mood system and SAMHSA Wellness Dimensions. Ximi AI includes consent gating, crisis keyword detection, and a persistent "not a clinician" disclaimer. A legally compliant consent system involves basic consent and a second layer for a "Safety Profile" with optional health information. A breach notification system is in place for OIPC compliance. Authenticated users must complete a daily check-in before browsing programs, managed by an "Explore Gate." Ximi proactively supports users during mood declines based on statistical mood variance detection. A dedicated consent flow for Ximi AI requires explicit user opt-in. An outcome tracking system enables youth to share program experiences and view privacy-safe peer insights, utilizing k-anonymity and differential privacy. A Real-Time Event Finder enables discovery of programs currently running in Edmonton with time-based filtering, supporting recurring, one-time, seasonal, and overnight events. The Programs tab uses a grouped view that combines recurring events into single program entries with weekly schedule summaries.

### Parental Consent System (Updated Dec 2025)
A comprehensive PIPA/PIPEDA compliant two-tier parental consent system:
- **Two-Tier Model**: Room XI consent (youth's own) vs parent consent (third-party program sharing)
- **Email Plus Flow**: Two-step consent with 16-field audit trail, versioned legal text (v1.1-2025-01-17)
- **Web Share API**: "Share with parent" button with clipboard fallback for consent links
- **Youth Privacy Settings**: Youth can control what parents see (mood, programs, demographics)
- **Mature Minor Doctrine**: Alberta law allows youth 14+ to control sensitive data independently
- **Soft Consent Withdrawal**: If parent withdraws, youth keeps full app access; only parent portal disabled
- **Mature Minor Assessment**: 5-question capacity evaluation triggered after withdrawal (80% threshold)
- **Parent Portal**: Filtered data view based on youth privacy settings with hidden category disclosures
- **Audit Trail**: 24-hour consent link expiry, IP/UA tracking, staff notifications on withdrawal

Database tables: `guardianVerifications`, `youth_privacy_settings`, `mature_minor_assessments`, `consentEvents`
Key files: `server/routes/consent.js`, `server/routes/parent-portal.js`, `src/components/YouthPrivacySettings.tsx`, `src/components/MatureMinorAssessment.tsx`

### Consent-as-a-Service (Added Dec 2025)
Foundation for external organizations to request verified parental consent through Room XI's infrastructure:
- **Partner Organizations**: Schools, community programs, and youth service providers can register as partners
- **8 Consent Scopes**: field_trip, photo_release, video_release, medical_emergency, program_participation, transportation, overnight_activity, media_consent
- **API Authentication**: Bearer token auth with client_id + client_secret, scope-based access control
- **Reuses Existing Infrastructure**: Links to guardianVerifications table, leverages existing audit trail
- **Privacy-First Design**: Partners see only consent status (granted/denied), never youth personal data

API Endpoints:
- `GET /api/partners/health` - API status and available scopes
- `GET /api/partners/scopes` - Full scope list with descriptions
- `POST /api/partners/consent-request` - Request consent (stubbed, returns not_implemented)
- `GET /api/partners/consent-status/:id` - Check consent status
- `GET /api/partners/my-consents` - List partner's consent requests

Database tables: `partner_organizations`, `consent_delegations`, `consent_delegation_events`
Key file: `server/routes/partner-consent.js`

Status: Foundation in place. Endpoints return "not_implemented" until partner integrations go live. Positioned for funder presentations as ecosystem infrastructure.

### Location-Based Discovery (Updated Nov 2025)
A compact "Show nearby" toggle replaces the previous card-based location UI. Features include:
- Three radius options: 1km (~12 min walk), 2km (default, ~25 min walk), 5km (~60 min/transit)
- 2km default optimized for Edmonton youth based on transit/bike research
- Permission state handling (prompt, granted, denied) with retry functionality
- localStorage persistence for both location preference and radius selection
- ProgramMap shows radius circle overlay and filters markers within selected distance
- All list views (ProgramList, TodayList) automatically filter and sort by distance when enabled
- Distance badges displayed on program cards when location is active

### Community & Ward Assignment
During registration, users provide a Canadian postal code which is used to:
- Identify their Edmonton neighbourhood/community
- Assign them to one of Edmonton's 12 wards using FSA (Forward Sortation Area) lookup
- Display this information in their Settings page under "Your Community"

The FSA-to-ward mapping is approximate and uses a local lookup table (`server/services/communityLookup.ts`). For FSAs that span multiple wards, users are assigned "Pending Verification" status which staff can update during onboarding. TODO: Replace with City of Edmonton Open Data API for accurate ward boundaries.

### Edmonton Youth Programs Database
The database contains over 75 comprehensive Edmonton youth resources across categories such as Mental Health, LGBTQ+ & 2Spirit, Indigenous, Arts & Creative, Sports & Recreation, Employment & Career, and Crisis Support.

### Testing Infrastructure (Added Dec 2025)
The project includes comprehensive testing infrastructure:
- **Unit Tests (Vitest)**: Run with `npm test` - 12 passing tests, 3 expected failures for browser-specific APIs (crypto, IndexedDB)
- **E2E Tests (Playwright)**: Run with `npm run test:e2e` - API smoke tests work; browser tests require additional system dependencies
- **Privacy Smoke Tests**: Run with `npm run smoke:privacy` - Tests authentication requirements on privacy endpoints
- **Route Crawl Tests**: Run with `npm run test:e2e:routes` - Tests public and auth-required routes
- **Consent Enforcement Tests**: Run with `npm run smoke:consent` - Tests consent/CSRF enforcement on protected endpoints

Key test files:
- `tests/e2e/routes.spec.ts` - Public and auth-required route testing
- `tests/e2e/smoke-privacy.spec.ts` - Privacy API authentication checks
- `tests/e2e/consent-enforcement.spec.ts` - Consent and CSRF enforcement checks
- `playwright.config.ts` - Playwright configuration

Note: Browser-based E2E tests require Chromium system dependencies. API-only tests (24+ tests) pass in Replit environment.

### Consent Enforcement (Added Dec 2025)
Server-side enforcement of privacy consent toggles is implemented in `server/middleware/consent.ts`:

**Privacy Consent Types** (from `privacy_consents` table):
- `location` - Required for `/api/geo/*` endpoints
- `reflections` - Required for `/api/outcomes` POST/PUT endpoints
- `research` - Checked when aggregating user data in peerInsights service
- `orb` - Available for future orb sharing features
- `notifications` - Checked by notification scheduler

**Implementation Pattern**:
```typescript
import { checkPrivacyConsent, requirePrivacyConsent } from '../middleware/consent.ts';

// Middleware approach (block route)
router.post('/share', requirePrivacyConsent('location'), handler);

// Inline check approach (custom handling)
const consent = await checkPrivacyConsent(userId, 'reflections');
if (!consent.reflections) return res.status(403).json({ code: 'CONSENT_REQUIRED' });
```

**Key Files**:
- `server/middleware/consent.ts` - Consent check helpers and middleware
- `server/routes/geo.js` - Location consent enforcement
- `server/routes/outcomes.ts` - Reflections consent enforcement
- `server/services/peerInsights.ts` - Research consent filtering (already implemented)

## External Dependencies
- **Neon PostgreSQL:** Primary database backend.
- **Replit AI (OpenAI-compatible API):** Powers the Ximi AI companion (gpt-4o-mini).
- **Luxon:** JavaScript library for date and time handling.
- **Zeffy:** Donation platform.
- **Nodemailer:** Used for sending guardian verification emails via Gmail SMTP.
- **h3-js:** H3 hexagon geo-spatial indexing library.
- **html2canvas:** DOM-to-image library for mood orb PNG export.