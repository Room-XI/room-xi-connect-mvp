# Pilot Delta Map — Room XI Connect 3-Portal Pilot

**Authoritative spec:** `attached_assets/Room_XI_Connect_Final_SOT_Spec_v1.0_*.md` + the 13 docs in `room_xi_connect_final_handoff_package_*.zip`.

**Locked pilot portals:** Youth · Parent · Operator (Room 11 internal team)

**Out of pilot:** standalone Staff/Youth-Worker portal, standalone Admin portal, tournaments, journaling, proactive AI, sentiment, social/DMs, broad Ximi companion behavior, self-serve multi-tenant org SaaS.

> Legacy Staff and Admin *capabilities* the pilot still needs (attendance operations, org oversight, audit logs, feature flags, incidents) fold into the single **Operator** portal for Room 11. They are not separate portals in pilot v1.

---

## STAYS (reused as-is by the new pilot path)

### Backend foundations
- `server/db.ts` / `server/db.js` — Neon + Drizzle connection
- `server/logger.ts` — Pino structured logger with secret redaction
- `server/middleware/correlationId.ts` — per-request UUID
- `server/middleware/cors.ts`
- `server/middleware/errorHandler.ts`
- `server/middleware/security.ts` — CSP, CSRF (`validateCsrfToken`), `noCacheForSensitiveRoutes`, session factories
- `server/middleware/rateLimit.ts` — `writeLimiter`, `adminLimiter`
- `server/middleware/accountLockout.ts`
- `server/middleware/validate.ts` — Zod request validator
- `server/middleware/differentialPrivacy.ts`
- `server/services/email.js` + providers (`email.gmail.js`, `email.sendgrid.js`, `email.console.js`)
- `server/services/crisisEscalation.ts`, `server/services/crisisFollowup.ts`
- `server/services/moderation.ts` (crisis keyword detection — reused by pilot Ximi)
- `server/services/programSearch.ts` (deterministic search reused by pilot Ximi)
- `server/services/peerInsights.ts`, `communityLookup.ts`, `differentialPrivacy.ts`

### Backend core tables (reused via import in `server/schema.pilot.ts`)
- `users`
- `organizations`, `org_members`
- `programs`, `program_events`
- `saved_programs`
- `safety_plans`, `safety_plan_shares`
- `account_lockouts`
- `admin_logs`, `audit_trail`

### Canonical pilot tables already in repo (reused, not recreated)
- `consent_templates`, `consent_requests`, `consent_receipts`, `consent_audit_events`, `parent_magic_links`
- `event_rsvps`
- `attendance_sessions`, `attendance_records`, `attendance_passes`
- `import_jobs`, `listing_verifications`
- `support_requests`
- `report_runs`
- `referrals` (extended)

### Frontend foundations
- `src/styles.css`, `tailwind.config.js` — Cosmic Garden design tokens
- `src/i18n/` — EN/FR translations
- `src/lib/` — shared API + CSRF + offline helpers
- `src/hooks/` — reusable hooks (auth, mood, geo)
- `src/ui/` — primitive components
- `src/components/CrisisButton.tsx`, `FloatingCrisisButton.tsx`, `CrisisDetectionModal.tsx`
- `src/components/MoodOrb.tsx` + `GradientMoodOrb.tsx` (youth Home anchor per §10 design canon)
- `src/components/LanguageSwitcher.tsx`
- Safety route family: `SafetyResources.tsx`, `SafetyProfile.tsx`, `SafetyPlan.tsx`, `SafetyPlanShare.tsx`

### Tests kept relevant
- `server/__tests__/bola.test.ts` (71 tests — BOLA guards)
- `server/__tests__/parent-forbidden.test.ts` (16 tests — parent data leak prevention)
- `server/__tests__/consent-rsvp.test.ts` — consent cascade integrity
- `server/__tests__/auth.test.ts`
- `server/__tests__/accountLockout.test.ts`

---

## REBUILD IN CLEAN PILOT PATH

Everything that the 3-portal pilot runtime touches gets rebuilt inside `server/pilot/` and `src/pilot/` for clarity and auditability. Rebuilt does **not** mean re-invented — concrete logic is ported from existing working code with tightened scope per SOT.

### Server (`server/pilot/`)
| Path | Purpose |
|---|---|
| `routes/public.ts` | Public Explore + Program Detail (no auth) |
| `routes/youth.ts` | Youth portal API |
| `routes/parent.ts` | Parent portal API (consent only) |
| `routes/operator.ts` | Operator portal API (Room 11 internal) |
| `auth/youthAuth.ts` | Email-optional signup, 6-digit PIN, login_code |
| `auth/parentAuth.ts` | Magic link default, password fallback flagged off |
| `consent/consentEngine.ts` | Canonical consent runtime |
| `attendance/sessions.ts` / `passes.ts` / `checkin.ts` | Staff-controlled hybrid attendance |
| `reporting/reports.ts` | 5 report packs |
| `listings/listings.ts` / `imports.ts` | Verified supply + CSV import + auto-sunset |
| `permissions/guards.ts` / `scopes.ts` | Pilot-specific BOLA guards |
| `dto/youth.ts` / `parent.ts` / `operator.ts` | Response shapes (parent DTOs enforce forbidden-field list) |
| `validation/schemas.ts` | Zod validation |

### Schema
| File | Purpose |
|---|---|
| `server/schema.pilot.ts` | Canonical pilot schema manifest; references reusable core tables; lists PILOT_CANONICAL_TABLES used by migration/QA tooling |

### Client (`src/pilot/`)
| Path | Purpose |
|---|---|
| `router.tsx` | Pilot router |
| `layouts/YouthLayout.tsx` | Locked 4-tab bottom nav |
| `layouts/ParentLayout.tsx` | Trust-first simple shell |
| `layouts/OperatorLayout.tsx` | Denser internal shell |
| `routes/public/` | Explore + Program Detail (public) |
| `routes/youth/` | Home, Explore, Schedule, ProgramDetail, Saved, AttendancePass, Referrals, Intake, CheckIn, Safety, More, Settings |
| `routes/parent/` | Login, Verify, Dashboard, ConsentWallet, ConsentRequests, ChildConsentStatus, Settings |
| `routes/operator/` | Dashboard, Programs, Events, Import, VerificationQueue, Reports, Staff, ConsentPolicies, Settings |
| `components/shared/` + per-portal component folders | UI building blocks |
| `lib/api.ts`, `lib/auth.ts`, `lib/permissions.ts` | Client infra |

---

## QUARANTINE (disable; do not delete yet)

Quarantined paths remain in the repo so the current build keeps running while the pilot path is built. They will be removed or route-disabled portal-by-portal once the pilot path overtakes them.

### Already disabled at route level (return 410 Gone) — keep
- `/api/tournaments`, `/api/join`, `/api/tools`, `/api/ai`, `/api/sentiment`

### To quarantine during pilot cutover
| Area | Current location | Plan |
|---|---|---|
| Tournament UI | previously removed | stay removed |
| Proactive AI admin page | previously removed | stay removed |
| Youth Worker portal (standalone) | `src/routes/youth-worker/`, `server/routes/youth-workers.ts`, `server/routes/attendance-sessions.ts`, `server/routes/referrals.ts` (worker half), `server/routes/support-requests.ts` (worker half) | Capabilities fold into Operator portal. Legacy routes will return 410 once pilot operator surfaces are live. |
| Standalone Admin portal | `src/routes/admin/`, `server/routes/admin.js`, `server/routes/feature-flags.ts`, `server/routes/analytics.ts`, `server/routes/breach.ts` | Oversight capabilities fold into Operator portal. Legacy admin routes 410 after migration. |
| Standalone Org portal | `src/routes/org/`, `server/routes/org.js`, `server/routes/org/*` | Merge into single Operator portal. |
| Legacy consent runtime | `server/routes/consent.js`, `server/routes/consent-auto.js`, `server/routes/partner-consent.js`, legacy tables `consents`, `consent_events`, `privacy_consents`, `parent_youth_consent`, `consent_delegations` | Mark as migration-only; disable at runtime; DB rows preserved. |
| Legacy generic RSVP | `server/routes/rsvp.js`, table `rsvps` | Retire; `event_rsvps` is canonical. |
| Legacy generic attendance | table `attendance` | Retire; `attendance_sessions` + `attendance_records` are canonical. |
| Journaling | table `journal_entries`, any `/journal` surface | Disable runtime; preserve table for migration. |
| Ximi companion | `ximi_conversations` table, any non-program-finder prompts | Runtime locked to program-finder only (partly done); tables preserved. |
| Proactive AI / Sentiment services | `server/services/proactiveAI.ts`, `server/services/sentimentOrchestrator.ts`, `server/routes/sentiment.ts`, `server/routes/ai.ts` | Routes 410 (done); services kept read-only for audit. |
| Legacy parent overexposure | `src/routes/parent/MyChildren.tsx`, `src/routes/parent/Documents.tsx`, full `ParentDashboard.tsx` | Reduce parent UI to consent-wallet-only; forbidden fields enforced by `parent-forbidden.test.ts`. |
| Legacy youth auth surfaces | `src/routes/auth/Register.tsx`, `Signup.tsx`, `Reset.tsx`, `UpdatePassword.tsx`, `VerifyEmail.tsx` | Replaced by pilot email-optional PIN + login_code flow. |
| Demo routes | `src/routes/demos/*` | Gated behind `ENABLE_DEMOS=false` in production. |
| XiP points (10-level) | `src/routes/XiPPointsSystem.tsx`, `server/routes/xip.ts`, `XiPWidget.tsx` | **Decision pending** from product. Recommend disable for pilot v1. |
| Support inbox (unstaffed) | `src/routes/SupportRequest.tsx`, `server/routes/support-requests.ts`, worker support pages | Feature-flag `ENABLE_SUPPORT_INBOX=false` by default. |

### Feature flags to add
- `ENABLE_PILOT_ONLY_SURFACES`
- `ENABLE_XIMI_PROGRAM_FINDER_ONLY`
- `ENABLE_TOURNAMENTS=false`
- `ENABLE_JOURNALING=false`
- `ENABLE_AI_INTERVENTIONS=false`
- `ENABLE_DEMOS=false`
- `ENABLE_SUPPORT_INBOX=false`
- `ENABLE_XIP=false` *(pending product call)*
- `SCHOOL_TENANT_DETERMINISTIC_MODE=true`

---

## Pending product decisions (blocking full pilot path activation)

1. **XiP points** — keep or disable? Recommend disable for v1.
2. **Support inbox default** — flag on or off? Recommend off unless Room 11 has a staffed SLA.
3. **Parent password fallback** — confirm flagged off by default. Recommend yes.

---

## Build order after this step (per SOT §11 and the user's staged prompts)

1. **Prompt 1 — Pilot lockdown** (route-level disable pass aligned to this delta map)
2. **Prompt 2 — Pilot auth** (youth PIN + login_code, parent magic link)
3. **Prompt 3 — Consent engine** as single runtime authority
4. **Prompt 4 — Event RSVP + Schedule** in pilot path
5. **Prompt 5 — Attendance spine** in pilot path
6. **Prompt 6 — Referrals** (closed loop)
7. **Prompt 7 — Verified supply + import + auto-sunset**
8. **Prompt 8 — Reporting** (5 packs)
9. **Prompt 9 — Permissions hardening + forbidden-field tests**
10. **Prompt 10 — QA + a11y + build hardening**
