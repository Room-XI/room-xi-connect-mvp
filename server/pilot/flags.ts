/**
 * Pilot feature flags — single source of truth.
 *
 * Read from environment variables once at startup. Defaults match the
 * finalized pilot (SOT §11 + transition pack §08). Flip via env vars in
 * the Replit secrets panel or deployment config.
 */

function boolEnv(name: string, defaultValue: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultValue;
  return v === 'true' || v === '1' || v === 'yes';
}

/**
 * Master pilot cutover switch.
 *
 * When true:
 *   - wrong-lane server routes return 410 Gone
 *   - UI entries for disabled features are suppressed
 *   - only the 3 canonical portals (Youth / Parent / Operator) are active
 *
 * Default: true (the finalized Edmonton pilot is the live shape).
 * Set PILOT_MODE=false only for legacy/regression debugging.
 */
export const PILOT_MODE = boolEnv('PILOT_MODE', true);

/** Out-of-pilot features — must remain 410 and hidden from UI. */
export const ENABLE_TOURNAMENTS = boolEnv('ENABLE_TOURNAMENTS', false);
export const ENABLE_JOURNALING = boolEnv('ENABLE_JOURNALING', false);
export const ENABLE_AI_INTERVENTIONS = boolEnv('ENABLE_AI_INTERVENTIONS', false);
export const ENABLE_DEMOS = boolEnv('ENABLE_DEMOS', false);

/** Pilot-scope features pending product decision — off by default for v1. */
export const ENABLE_XIP = boolEnv('ENABLE_XIP', false);
export const ENABLE_SUPPORT_INBOX = boolEnv('ENABLE_SUPPORT_INBOX', false);

/** Pilot architecture switches — on by default to keep pilot behavior. */
export const ENABLE_PILOT_ONLY_SURFACES = boolEnv('ENABLE_PILOT_ONLY_SURFACES', true);
export const ENABLE_XIMI_PROGRAM_FINDER_ONLY = boolEnv('ENABLE_XIMI_PROGRAM_FINDER_ONLY', true);
export const SCHOOL_TENANT_DETERMINISTIC_MODE = boolEnv('SCHOOL_TENANT_DETERMINISTIC_MODE', true);

/**
 * Parent password fallback. Magic link is the default auth path.
 * Per SOT §04 — fallback allowed but flagged off for v1.
 */
export const ENABLE_PARENT_PASSWORD_FALLBACK = boolEnv('ENABLE_PARENT_PASSWORD_FALLBACK', false);

/**
 * Prefixes that must return 410 Gone under PILOT_MODE.
 * Consumed by server/index.js to register goneHandler entries.
 */
export const PILOT_DISABLED_API_PREFIXES: ReadonlyArray<string> = Object.freeze([
  '/api/tournaments',
  '/api/join',
  '/api/tools',
  '/api/ai',
  '/api/sentiment',
  ...(ENABLE_XIP ? [] : ['/api/xip']),
  // T024: gamification + analytics surfaces flagged out-of-scope for v1 pilot.
  // No pilot portal UI consumes them and they are not in any PILOT_SCOPES read
  // set (achievements/orb-snapshots gamification ≠ self.mood_history; KPI is an
  // admin analytics dashboard outside the operator-org-scope reads).
  '/api/achievements',
  '/api/kpi',
  '/api/orb-snapshots',
  // T038 (Phase 3 mount switch) + T041 (router deletion): legacy back-office
  // routers and aliases are NOT mounted at all under PILOT_MODE. As of T041
  // the underlying router files are also deleted from `server/routes/`, so
  // these prefixes have no live handler at all — only the 410 short-circuit
  // below responds, returning LEGACY_API_RETIRED to any cached UI or script
  // still calling the old paths.
  '/api/admin',
  '/api/admin/breach',
  '/api/org',
  // T041: /api/transparency router (transparency.js) deleted. Public DP-stats
  // surface had no pilot consumer and no frontend page; future trust dashboard
  // can revive a canonical mount under /api/pilot/transparency.
  '/api/transparency',
  // T041: /api/consent-wallet alias mount removed. Canonical pilot consent
  // wallet lives at /api/pilot/consent; frontend was always pointed there.
  '/api/consent-wallet',
]);

/**
 * Legacy consent runtime paths that must NOT make consent decisions under
 * PILOT_MODE. The canonical consent engine lives at `/api/pilot/consent`
 * (and mirrored at `/api/consent-wallet`) and uses only:
 *   consent_templates · consent_requests · consent_receipts ·
 *   consent_audit_events · parent_magic_links
 *
 * Paths listed here return 410 Gone when PILOT_MODE=true. Guardian-
 * verification token flow (`/api/consent/view|agree|confirm/:token`) and
 * platform legal agreements (`/api/consent/guardian-status`,
 * `/api/consent/my-consents`) are intentionally NOT in this list — they
 * are signup-time identity checks, not program-consent decisions.
 */
export const PILOT_DISABLED_CONSENT_PREFIXES: ReadonlyArray<string> = Object.freeze([
  '/api/consent-auto',
  '/api/consent/withdraw',
  '/api/consent/mature-minor',
  '/api/parent-portal/consent/withdraw',
  '/api/partners/consent-request',
  '/api/partners/consent-withdraw',
]);

/**
 * Legacy auth surfaces that must NOT serve traffic under PILOT_MODE.
 *
 * Canonical pilot auth lives at:
 *   /api/pilot/auth/youth/*   — strict 6-digit PIN, non-enumerating errors
 *   /api/pilot/auth/parent/*  — magic-link (2-step GET-then-POST), optional
 *                               password fallback (flag-gated)
 *
 * The legacy `/api/auth` (4-digit PIN, weaker error model) and
 * `/api/parent-auth` (single-step magic link consume) surfaces would otherwise
 * let a client bypass the pilot's hardened auth path entirely. T009 (Phase 3b)
 * retires them under PILOT_MODE: the prefixes 410 here, and the legacy
 * `app.use('/api/auth', ...)` / `app.use('/api/parent-auth', ...)` mounts in
 * server/index.js are skipped entirely when PILOT_MODE=true.
 */
export const PILOT_DISABLED_AUTH_PREFIXES: ReadonlyArray<string> = Object.freeze([
  '/api/auth',
  '/api/parent-auth',
]);
