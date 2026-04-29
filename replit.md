# Room XI Connect

## Overview
Room XI Connect is a youth-safe platform (ages 13-25) designed to engage young people with relevant programs, support their well-being through daily mood check-ins, and provide access to crisis support. The platform prioritizes privacy, a "programs-first" approach, universal intake, and robust crisis intervention capabilities. Its core purpose is to connect youth with essential services and foster a supportive community, leveraging AI for program discovery while ensuring safety and data protection.

## User Preferences
I prefer simple language. I want iterative development. Ask before making major changes. I prefer detailed explanations.

## System Architecture
### UI/UX Decisions
The application features a youth-friendly design with a "programs-first" experience, requiring authentication only for secured features. A 6-level mood scale utilizes HSL color gradients and brand design tokens. A legally compliant two-layer consent system is implemented. Accessibility features include high-contrast mode, 44x44px touch targets, visible focus states, and ARIA landmarks. Portal login pages are visually distinct.

### Technical Implementations
The platform is built with React 18, TypeScript, Vite 5, React Router v6, and Tailwind CSS for the frontend, complemented by an Express/Neon PostgreSQL backend with Drizzle ORM. It employs a multi-portal architecture for Youth, Parent, Org, Admin, and Youth Worker roles, each with isolated session management.

**Core Features:**
- **Daily Mood Tracking:** Includes DST-safe streak logic and SAMHSA Wellness Dimensions integration.
- **Ximi Program Finder:** An AI-powered assistant for program search, scheduling, suggestions, and Q&A, returning structured JSON. It includes a real-time Crisis Safety System for keyword detection and privacy-preserving notifications.
- **Consent Wallet Engine:** A canonical system for managing program consent, handling requests, receipts, and audit events.
- **Parent Portal Scope (Pilot):** Limited to consent wallet functionality, with a strict deny-by-default/allow-list middleware for other routes to ensure data privacy.
- **Attendance Sessions:** Staff-controlled hybrid execution (roster, scan, kiosk, walk-in) with session token rotation, dynamic youth passes, and contextual authorization.
- **Event RSVPs + Schedule:** Allows youth to RSVP to program events, with parental consent workflows for minors and an RSVP state machine (pending_consent, confirmed, blocked, cancelled).
- **Geo-spatial Privacy:** Uses H3 Hex Bucketing with dual k-anonymity thresholds and Laplace noise for location-based program discovery.
- **Support Request System (flag-gated):** Enables youth to submit support requests, managed by workers via an inbox system, disabled by default for pilot v1.
- **Closed-Loop Referral System:** Staff/operator referrals of youth to program events, with youth acceptance/decline workflows and automated outcome tracking based on attendance.
- **Verified Supply + Import + Auto-Sunset:** Manages program listings with verification, CSV import, and automated sunsetting for stale entries.
- **Reporting Packs + CSV Exports:** Provides org-scoped reports on key metrics with on-demand CSV exports.
- **Production Hardening & Safety:** Includes CSRF protection, database transactions, input validation, structured logging, CSP, and audit logging.

**Authentication:** Implements a canonical pilot authentication path with strict 6-digit PINs for youth, optional email, and guardian email for minors. Parent authentication uses magic links. Legacy authentication paths are retired.

**Pilot Architecture:** The system has undergone significant refactoring to establish a canonical pilot runtime, removing legacy code paths and enforcing strict routing and permissioning for pilot-specific functionalities. As of T041 the legacy back-office route family is fully retired — `server/routes/admin.js`, `server/routes/breach.ts`, `server/routes/org.js`, the `server/routes/org/*` subrouter directory, `server/routes/transparency.js`, and the `/api/consent-wallet` legacy alias mount have all been deleted. The single `mountPilotRoutes(app)` function now owns every `/api/*` mount; the late 410 lockdown (driven by `PILOT_DISABLED_API_PREFIXES` in `server/pilot/flags.ts`) is the sole surface that responds for `/api/admin*`, `/api/org*`, `/api/transparency`, and `/api/consent-wallet*`. Canonical guards and scope manifests define granular permissions for youth, parent, and operator roles.

**Consent Surfaces (post-T041):**
- `/api/pilot/consent` — canonical pilot program-consent runtime (parent decisions: sign / decline / withdraw). Backed by `server/pilot/consent/consentEngine.ts` and tables `consent_templates`, `consent_requests`, `consent_receipts`, `consent_audit_events`, `parent_magic_links`.
- `/api/consent` — surviving non-pilot surface in `server/routes/consent.js`: signup-time guardian-token verification (`/details`, `/submit`, `/view`, `/agree`, `/confirm`, `/guardian-status`, `/resend-guardian`) and platform legal/DSAR endpoints (`/`, `/my-consents`, `/audit-trail`, `/export-data`, `/delete-account`, `/consent-audit/export`). The legacy program-consent handlers (`/withdraw`, `/mature-minor/*`) were removed from the router and now 410 via the early consent lockdown.
- `/api/consent-wallet` — retired alias; 410 via `PILOT_DISABLED_API_PREFIXES`.

**Naming Convention Notes:**
- Most pilot endpoints live under `/api/pilot/*` (auth, consent, etc.).
- The Parent Portal adapter intentionally keeps the legacy `/api/parent-portal` mount path. The surface is intentionally tiny (3 GET endpoints + 1 PUT), and it is bounded by a deny-by-default `pilotDataGate` middleware that 403s any non-allow-listed path. Renaming would touch the frontend (`api.parentPortal.*`), the session cookie scope, and the parent-forbidden test fixture for negligible security gain — see the comment block at the top of `server/routes/parent-portal.js` for the full rationale.

**Pilot Directory Layout (post-T042):** The `server/pilot/` and `src/pilot/` directories are scoped tightly to what is actually wired and running.
- `server/pilot/` holds the canonical runtime: `flags.ts`, `routes/pilotAuth.ts`, `consent/consentEngine.ts`, the `auth/`, `permissions/`, and `validation/` service modules, plus the `README.md` source-of-truth doc. The four 7-line per-portal stubs (`routes/{public,youth,parent,operator}.ts`) were removed in T008; the `attendance/`, `listings/`, `reporting/`, and `dto/` placeholder subdirectories (nine zero-importer files between them — six `export const fooPlaceholder = true;` stubs plus three unreferenced DTO interface files) were removed in T042 because they were misleading "in progress" markers for work that never landed (or that was already implemented under existing `server/routes/*` paths). The pilot surface stays prefix-flat (one `app.use(...)` per surface) inside `mountPilotRoutes(app)`.
- `src/pilot/` holds only the four files the canonical router actually uses: `router.tsx`, `routes/parent/Wallet.tsx`, `routes/parent/RequestDetail.tsx`, and `README.md`. T042 deleted thirteen unreferenced scaffolding files (per-portal layouts, route barrels, `lib/{api,auth,permissions}.ts` placeholders, and the never-wired pilot youth/parent login + signup pages); the legacy `src/routes/auth/Login.tsx` and `src/routes/ParentLogin.tsx` are what the router lazy-imports for those flows.
- An operator-portal frontend is open follow-up work (no current consumer). The backend has the scaffolding (`OPERATOR_SCOPE`, `requireOperatorOrgScope`, `consent-wallet-staff`) but no client UI yet.

**Cross-Org Isolation:** Youth-worker assignments snapshot `organization_id` at creation time (not derived from the worker's current org). All `/youth/:youthId/*` handlers in `server/routes/youth-workers.ts` filter the assignment lookup by `(worker_id, youth_id, organization_id = session.organizationId, granted)`, so a worker who moves between orgs immediately loses access to their pre-move assignments. Regression: `server/__tests__/cross-org-isolation.test.ts`.

**Schema Drops (post-T043):** Per audit findings C7+C14, the following deprecated database objects were dropped via `server/migrations/20260429_drop_deprecated_tables.sql`:
- **Tables:** `weekly_orb_snapshots`, `tournaments`, `tournament_teams`, `tournament_team_members`, `tournament_invites`, `tournament_registrations`, `tournament_games`, `tournament_standings` (Drizzle definitions also removed from `server/schema.ts`). Defensive `DROP IF EXISTS` for `achievements`, `orb_snapshots`, `partner_consents` (not in dev DB but protected for legacy environments).
- **Views:** All eight `kpi_*` views (`kpi_daily_checkin_rate`, `kpi_streak_completion`, `kpi_explore_unlock`, `kpi_optin_rates`, `kpi_staff_dashboard_use`, `kpi_referral_conversion`, `kpi_crisis_routing`, `kpi_dashboard_summary`) — created by `20251107_kpi_views.sql`, never wired to any frontend.
- **Read-path cleanup performed alongside the drop:** the tournament-game schedule join in `server/services/programSearch.ts` (Ximi `getUserSchedule`), the tournament registrations query in `server/routes/youth-workers.ts` (`/youth/:youthId/schedule` — now returns RSVPs only with empty `tournaments: []`), and `server/utils/tournamentNotifications.ts` (zero importers, deleted). `server/seed-demo.js` lost its tournament demo block + cleanup.
- **Deliberately excluded** (live writers found during re-audit): `sentiment_analyses` (written by `sentimentOrchestrator.ts` from `checkins.ts` on every check-in) and the four `xip_*` tables (writers in `routes/xip.ts`, gated behind `ENABLE_XIP=false` but code still present). Both families remain in schema and DB; a follow-up is appropriate when the corresponding feature surfaces are formally retired.
- **Migration approach note:** A handcrafted forward SQL migration was used (matching the existing `server/migrations/*.sql` pattern of 15 prior files) rather than `npm run db:push --force`. The latter prompted to mass-rename critical pilot tables (`audit_log`, `youth_workers`, `ai_interventions`, `disclosure_requests`, `youth_worker_assignments`, `parent_youth_consent`) to `emergency_contacts` because of pre-existing drift between the handcrafted-migration baseline and the Drizzle schema. The 410 lockdowns in `PILOT_DISABLED_API_PREFIXES` for `/api/tournaments`, `/api/achievements`, `/api/kpi`, `/api/orb-snapshots` were intentionally retained — even with the tables gone, the registry documents the retired surfaces and the lockdown still serves any stray requests.

## External Dependencies
- **Neon PostgreSQL:** Primary database.
- **Replit AI (OpenAI-compatible API):** Powers the Ximi AI Program Finder (gpt-4o-mini).
- **Luxon:** Date and time handling.
- **Nodemailer:** For sending guardian verification emails.
- **h3-js:** Geo-spatial indexing.
- **html2canvas:** For exporting mood orb data as images.
- **qrcode.react:** For QR code generation.