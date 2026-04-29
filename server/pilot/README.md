# `server/pilot/` — Canonical Pilot Runtime

This directory holds the canonical (post-T041 / T042) pilot runtime: the
flags, routers, services, and guards that own every `/api/pilot/*` surface
and the late 410 lockdown for retired prefixes.

Anything outside this directory under `server/routes/` is either non-pilot
infrastructure that survived (health, csrf, etc.) or a youth/parent/
operator surface that the pilot mount layer wires up directly. Anything
that was a placeholder stub for a future-but-never-wired feature has been
deleted.

## Mounted surface

The single `mountPilotRoutes(app)` function in `server/index.js` owns
every `/api/*` mount. Under `PILOT_MODE`:

1. An **early lockdown** registers a 410 handler for every prefix in
   `PILOT_DISABLED_CONSENT_PREFIXES` (`/api/consent/withdraw`,
   `/api/consent/mature-minor*`) and `PILOT_DISABLED_AUTH_PREFIXES`
   (`/api/auth`, `/api/parent-auth`). These short-circuit before any
   pilot router that lives under the same `/api/*` prefix tree gets a
   chance to match.

2. The **canonical pilot routers** are mounted. Source of truth is
   `server/index.js` lines ~244–493 — this README only summarises by
   session class:

   - **Admin/operator surfaces (`admin.sid` / `user.sid`):**
     `/api/feature-flags`, `/api/analytics`, `/api/consent-status`,
     `/api/consent-wallet-admin`.
   - **Worker surfaces (`worker.sid`):** `/api/youth-workers`,
     `/api/attendance-sessions`, `/api/referrals/staff`,
     `/api/attendance-pass/print`, `/api/support-requests/worker`
     (when `ENABLE_SUPPORT_INBOX` is on).
   - **Parent surfaces (`parent.sid`):** `/api/parent-portal` (bounded
     by deny-by-default `pilotDataGate` to a 4-endpoint allowlist),
     `/api/pilot/consent` (the canonical consent wallet runtime).
   - **Youth surfaces (`user.sid`):** `/api/programs`, `/api/events`,
     `/api/quotes`, `/api/checkins`, `/api/profile`, `/api/xid`,
     `/api/ximi`, `/api/privacy`, `/api/notifications`, `/api/push`,
     `/api/orb`, `/api/skip-token`, `/api/mood-drop`, `/api/geo`,
     `/api/outcomes`, `/api/event-rsvps`, `/api/attendance-pass`,
     `/api/referrals/youth`, `/api/support-requests` (when
     `ENABLE_SUPPORT_INBOX` is on), `/api/demographics`,
     `/api/mood-tasks`, `/api/qr`, `/api/disclosure`, `/api/consent`
     (signup-time guardian-token verification + DSAR endpoints only —
     legacy program-consent paths 410 via the early lockdown).
   - **Public/unauthenticated surfaces:** `/api/crisis`. (`/api/partners`
     was retired with no live pilot caller — explicitly **not** mounted.)
   - **Pilot auth (custom session middleware):**
     `/api/pilot/auth/youth/*` (`pilotYouthAuthRouter`) and
     `/api/pilot/auth/parent/*` (`pilotParentAuthRouter`), both defined
     in `server/pilot/routes/pilotAuth.ts`.

3. A **late lockdown** registers a 410 handler for every prefix in
   `PILOT_DISABLED_API_PREFIXES` — currently 14 prefixes including
   `/api/admin*`, `/api/org*`, `/api/transparency`, `/api/consent-wallet`,
   `/api/tournaments`, `/api/join`, `/api/journaling`,
   `/api/ai-interventions`, `/api/demos`, `/api/xip`,
   `/api/support-requests` (when the support-inbox flag is off),
   `/api/achievements`, `/api/kpi`, `/api/orb-snapshots`. With the
   T041 deletions these prefixes have **no** legacy router to fall
   through to — the lockdown is the only surface that responds.

The boot log line `Pilot lockdown active (PILOT_MODE=true): 14 API
prefix(es) return 410` is the runtime confirmation.

## Subdirectories

| Path                        | Contents                                                                 |
| --------------------------- | ------------------------------------------------------------------------ |
| `auth/`                     | `youthAuth.ts`, `parentAuth.ts` — service modules invoked by `routes/pilotAuth.ts`. |
| `consent/consentEngine.ts`  | Canonical pilot program-consent runtime (sign / decline / withdraw / receipts / audit). Backed by `consent_templates`, `consent_requests`, `consent_receipts`, `consent_audit_events`, `parent_magic_links`. |
| `permissions/scopes.ts`     | `PILOT_CANONICAL_PREFIXES`, `PILOT_LEGACY_RETIREMENTS`, `OPERATOR_SCOPE`, `PARENT_PORTAL_FORBIDDEN_PATHS`. Source of truth for what counts as pilot vs retired. |
| `permissions/guards.ts`     | Express middleware: `pilotDataGate`, `requireParentSession`, `requireYouthSession`, `requireOperatorOrgScope`. |
| `validation/schemas.ts`     | Shared zod schemas for body/query validation across pilot routers.       |
| `flags.ts`                  | `PILOT_MODE`, every `ENABLE_*` feature flag, and the three lockdown prefix lists (`PILOT_DISABLED_API_PREFIXES`, `PILOT_DISABLED_CONSENT_PREFIXES`, `PILOT_DISABLED_AUTH_PREFIXES`). |
| `routes/pilotAuth.ts`       | The two `pilot{Youth,Parent}AuthRouter` Express routers.                 |

## What's intentionally NOT here

- **Per-portal route stubs** (`routes/{public,youth,parent,operator}.ts`).
  These were 7-line `/ping` placeholders that never had an importer;
  deleted in T008. The mount layout is intentionally **prefix-flat** —
  each surface gets its own session middleware, CSRF gate, and rate
  limiter at mount time, which is awkward to express as a single
  sub-router.

- **Pilot service stubs** (`attendance/{checkin,passes,sessions}.ts`,
  `listings/{imports,listings}.ts`, `reporting/reports.ts`). These were
  `export const fooPlaceholder = true;` files staged for "Prompt N"
  wiring that was either superseded by existing routers (attendance is
  already implemented in `server/routes/attendance-sessions.ts` +
  `attendance-pass.ts`) or never picked up. Deleted in T042 because
  they were unreferenced and gave a false impression of in-progress
  work. If/when these subsystems get a fresh implementation it should
  be wired immediately, not staged as a stub.

- **Per-portal DTO type files** (`dto/{operator,parent,youth}.ts`).
  Aspirational TypeScript interfaces with no consumer, deleted in T042.
  Response shapes are defined inline in their owning route handlers.
  The privacy contract for parent responses (no program names,
  schedules, attendance, etc.) is enforced at runtime by the
  deny-by-default `pilotDataGate` in `permissions/guards.ts`, not by
  a type definition.

- **A real operator portal**. Operator session/permission scaffolding
  (`OPERATOR_SCOPE`, `requireOperatorOrgScope`, the consent-wallet
  staff router at `/api/consent-wallet-admin`) exists, but a dedicated
  `/api/operator/*` URL family has no current consumer — Room 11 staff
  use the existing `/api/youth-workers` + `/api/consent-wallet-admin`
  surfaces. Building out a dedicated operator portal is open follow-up
  work.
