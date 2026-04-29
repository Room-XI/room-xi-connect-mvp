/**
 * Pilot Permission Scopes — CANONICAL.
 *
 * Authoritative scope manifest for the 3-portal pilot. This file is the
 * single source of truth that the runtime, tests, and code review consult
 * to confirm "what each portal can / cannot see or do".
 *
 * Per SOT §09_PERMISSIONS_MATRIX.
 */

export type PilotPortal = 'youth' | 'parent' | 'operator';

export interface PortalScope {
  /** Read scopes the portal is permitted to access. */
  reads: ReadonlyArray<string>;
  /** Write scopes the portal is permitted to perform. */
  writes: ReadonlyArray<string>;
  /** Scopes the portal MUST NEVER see (defense-in-depth declaration). */
  forbidden: ReadonlyArray<string>;
}

export const YOUTH_SCOPE: PortalScope = Object.freeze({
  reads: Object.freeze([
    'self.profile',
    'self.saved_programs',
    'self.schedule',
    'self.attendance_pass',
    'self.referrals',
    'self.checkins',
    'self.mood_history',
    'public.verified_listings',
    'public.events',
  ]),
  writes: Object.freeze([
    'self.rsvp.create',
    'self.rsvp.cancel',
    'self.intake',
    'self.checkin',
    'self.support_request', // gated by ENABLE_SUPPORT_INBOX
  ]),
  forbidden: Object.freeze([
    'other_youth.*',
    'org.admin.*',
    'parent.consent.decisions',
  ]),
});

export const PARENT_SCOPE: PortalScope = Object.freeze({
  reads: Object.freeze([
    'linked_youth.consent_requests',
    'linked_youth.consent_receipts',
    'linked_youth.consent_status',
    'self.parent_profile',
  ]),
  writes: Object.freeze([
    'linked_youth.consent.sign',
    'linked_youth.consent.decline',
    'linked_youth.consent.withdraw',
  ]),
  forbidden: Object.freeze([
    'linked_youth.program_names',
    'linked_youth.schedule',
    'linked_youth.attendance',
    'linked_youth.mood',
    'linked_youth.support',
    'linked_youth.referrals',
    'linked_youth.ximi_data',
    'linked_youth.documents.detail',
    'linked_youth.emergency_contacts',
    'unlinked_youth.*',
  ]),
});

export const OPERATOR_SCOPE: PortalScope = Object.freeze({
  reads: Object.freeze([
    'own_org.programs',
    'own_org.events',
    'own_org.supply',
    'own_org.attendance_sessions',
    'own_org.attendance_records',
    'own_org.referrals',
    'own_org.consent_requests',
    'own_org.staff',
    'own_org.verifications',
    'own_org.reports',
    'own_org.imports',
    'consented_youth.case_notes',
    'consented_youth.dashboard',
  ]),
  writes: Object.freeze([
    'own_org.programs.create',
    'own_org.programs.update',
    'own_org.events.create',
    'own_org.attendance_sessions.open',
    'own_org.attendance_sessions.close',
    'own_org.attendance_records.create',
    'own_org.referrals.create',
    'own_org.referrals.update',
    'own_org.consent_templates.create',
    'own_org.consent_requests.create',
    'own_org.imports.create',
    'own_org.verifications.update',
    'own_org.staff.invite',
    'own_org.attendance_passes.print',
  ]),
  forbidden: Object.freeze([
    'other_org.*',
    'youth.cross_org_data',
    'admin.global.*',
  ]),
});

export const PILOT_SCOPES: Readonly<Record<PilotPortal, PortalScope>> = Object.freeze({
  youth: YOUTH_SCOPE,
  parent: PARENT_SCOPE,
  operator: OPERATOR_SCOPE,
});

/**
 * Active runtime mounts for the canonical pilot path. Source of truth for
 * documentation + cutover audit. Anything outside these prefixes is either
 * (a) shared infra (health, csrf, crisis hotline, transparency), or
 * (b) gated to 410 / 403 via flags or pilotDataGate.
 *
 * T038 (Phase 3 mount switch): the values here are the EXACT prefixes that
 * `mountPilotRoutes(app)` registers in `server/index.js`. The runtime test
 * `pilot-cutover-runtime.test.ts` walks `app._router.stack` under
 * PILOT_MODE=true and asserts every `app.use('/api/...', ...)` mount is
 * present in this allow-list (plus the small infra/system list below).
 */
export const PILOT_CANONICAL_PREFIXES = Object.freeze({
  /* ---- Pilot auth (canonical) ---- */
  youthAuth: '/api/pilot/auth/youth',
  parentAuth: '/api/pilot/auth/parent',

  /* ---- Pilot consent wallet (canonical) ---- */
  parentConsent: '/api/pilot/consent',
  // T041: /api/consent-wallet legacy alias removed. The frontend was always
  // pointed at /api/pilot/consent; no consumer remained. The prefix now 410s
  // via PILOT_DISABLED_API_PREFIXES.

  /* ---- Parent portal (consent-only via pilotDataGate allow-list) ---- */
  parentPortal: '/api/parent-portal',

  /* ---- Public / stateless ---- */
  health: '/api/health',
  crisis: '/api/crisis',
  // T041: /api/transparency retired (no pilot consumer). Now 410s via
  // PILOT_DISABLED_API_PREFIXES. Future trust dashboard, if built, should
  // mount under /api/pilot/transparency to keep the canonical pilot prefix.
  /** Token-based guardian-verification + signup-time legal agreements. */
  consentGuardianTokens: '/api/consent',
  /** Public + authenticated browse + RSVP under user.sid (3 mounts share prefix). */
  programs: '/api/programs',
  events: '/api/events',

  /* ---- Youth (user.sid) ---- */
  quotes: '/api/quotes',
  checkins: '/api/checkins',
  profile: '/api/profile',
  xid: '/api/xid',
  ximi: '/api/ximi',
  privacy: '/api/privacy',
  notifications: '/api/notifications',
  push: '/api/push',
  orb: '/api/orb',
  skipToken: '/api/skip-token',
  moodDrop: '/api/mood-drop',
  geo: '/api/geo',
  outcomes: '/api/outcomes',
  consentStatus: '/api/consent-status',
  consentWalletAdmin: '/api/consent-wallet-admin',
  eventRsvps: '/api/event-rsvps',
  attendancePass: '/api/attendance-pass',
  referralsYouth: '/api/referrals/youth',
  /** Flag-gated (ENABLE_SUPPORT_INBOX); registers a 410 handler when off. */
  supportRequests: '/api/support-requests',
  demographics: '/api/demographics',
  moodTasks: '/api/mood-tasks',
  qr: '/api/qr',
  disclosure: '/api/disclosure',
  healthProfile: '/api/health-profile',
  safetyPlan: '/api/safety-plan',

  /* ---- Operator / youth worker (worker.sid) ---- */
  youthWorkers: '/api/youth-workers',
  attendanceSessions: '/api/attendance-sessions',
  referralsStaff: '/api/referrals/staff',
  /** Worker-issued printed passes — must mount BEFORE /api/attendance-pass. */
  attendancePassPrint: '/api/attendance-pass/print',
  /** Worker support inbox — flag-gated (ENABLE_SUPPORT_INBOX). */
  supportRequestsWorker: '/api/support-requests/worker',

  /* ---- Admin-session admin tooling kept inside pilot mount ---- */
  /**
   * Feature-flag + analytics admin endpoints stay inside `mountPilotRoutes`
   * because they are scoped to the admin.sid session and have no out-of-band
   * pilot consumer. The legacy `/api/admin` and `/api/org` back-office routes
   * (which DID have rich UIs) live in `mountLegacyRoutes` and are skipped
   * under PILOT_MODE.
   */
  featureFlags: '/api/feature-flags',
  analytics: '/api/analytics',

  /* ---- Pilot meta. ----
   * NOTE: `/api/pilot/status` is intentionally NOT listed here. It is
   * registered as a single `targetApp.get('/api/pilot/status', ...)` handler
   * inside mountPilotRoutes, not as a `targetApp.use('/api/pilot/status', ...)`
   * prefix mount, so it does not appear in the recorded use-call set the
   * stack-walk regression test enumerates. Keeping it out preserves the
   * manifest-equality invariant (every entry here must be an `app.use` mount).
   */
});

/**
 * Flag-gated `/api/*` prefixes that mountPilotRoutes(app) registers ONLY when
 * a feature flag is on. When the flag is off, the same prefix is served by
 * the late 410 lockdown via `PILOT_DISABLED_API_PREFIXES`. The two sets are
 * therefore mutually exclusive at runtime — never both registered.
 *
 * The stack-walk regression test in `pilot-cutover-runtime.test.ts` consumes
 * this map to compute the allow-list for any combination of feature flags.
 */
export const PILOT_FLAG_GATED_PREFIXES = Object.freeze({
  /** /api/xip mounts only when ENABLE_XIP=true; otherwise served by lockdown. */
  xip: { prefix: '/api/xip', flag: 'ENABLE_XIP' },
  /** Worker support inbox mounts only when ENABLE_SUPPORT_INBOX=true. */
  supportRequestsWorker: { prefix: '/api/support-requests/worker', flag: 'ENABLE_SUPPORT_INBOX' },
  /** Youth support requests mount only when ENABLE_SUPPORT_INBOX=true. */
  supportRequests: { prefix: '/api/support-requests', flag: 'ENABLE_SUPPORT_INBOX' },
}) satisfies Readonly<Record<string, { prefix: string; flag: string }>>;

/**
 * Legacy → pilot cutover map. Documents which legacy route prefixes have
 * been retired from active runtime in favor of the canonical pilot path.
 *
 * Format: legacyPrefix → { coveredBy, mechanism } where mechanism is one of:
 *   '410'      — server returns 410 Gone via PILOT_DISABLED_API_PREFIXES
 *               or PILOT_DISABLED_CONSENT_PREFIXES.
 *   '403-gate' — server returns 403 PILOT_DATA_GATE via pilotDataGate.
 *   'flag-410' — server returns 410 when feature flag is off (default off).
 *   'alias'    — legacy prefix mounts the SAME canonical router for transition.
 */
export const PILOT_LEGACY_RETIREMENTS = Object.freeze({
  '/api/tournaments': { coveredBy: 'none (out-of-pilot)', mechanism: '410' },
  '/api/join': { coveredBy: 'none (out-of-pilot)', mechanism: '410' },
  '/api/tools': { coveredBy: 'none (out-of-pilot)', mechanism: '410' },
  '/api/ai': { coveredBy: '/api/ximi (program-finder only)', mechanism: '410' },
  '/api/sentiment': { coveredBy: 'none (out-of-pilot)', mechanism: '410' },
  '/api/xip': { coveredBy: 'none (gated by ENABLE_XIP)', mechanism: 'flag-410' },
  '/api/consent-auto': { coveredBy: '/api/pilot/consent', mechanism: '410' },
  '/api/consent/withdraw': { coveredBy: '/api/pilot/consent', mechanism: '410' },
  '/api/consent/mature-minor': { coveredBy: '/api/pilot/consent', mechanism: '410' },
  '/api/parent-portal/consent/withdraw': { coveredBy: '/api/pilot/consent', mechanism: '410' },
  '/api/partners/consent-request': { coveredBy: '/api/pilot/consent', mechanism: '410' },
  '/api/partners/consent-withdraw': { coveredBy: '/api/pilot/consent', mechanism: '410' },
  '/api/parent-portal/youth-data': { coveredBy: '(no parent surface)', mechanism: '403-gate' },
  '/api/parent-portal/privacy-summary': { coveredBy: '(no parent surface)', mechanism: '403-gate' },
  '/api/parent-portal/data/export': { coveredBy: '(no parent surface)', mechanism: '403-gate' },
  '/api/parent-portal/data/delete': { coveredBy: '(no parent surface)', mechanism: '403-gate' },
  '/api/parent-portal/consent-history': { coveredBy: '/api/pilot/consent (audit)', mechanism: '403-gate' },
  '/api/parent-portal/activity-summary': { coveredBy: '(no parent surface)', mechanism: '403-gate' },
  '/api/parent-portal/children/:id/schedule': { coveredBy: '(no parent surface)', mechanism: '403-gate' },
  '/api/parent-portal/dashboard': { coveredBy: '(no parent surface)', mechanism: '403-gate' },
  '/api/parent-portal/alerts': { coveredBy: '(no parent surface)', mechanism: '403-gate' },
  '/api/parent-portal/mood-summary': { coveredBy: '(no parent surface)', mechanism: '403-gate' },
  '/api/parent-portal/documents': { coveredBy: '(no parent surface)', mechanism: '403-gate' },
  '/api/parent-portal/documents/:id/sign': { coveredBy: '/api/pilot/consent', mechanism: '403-gate' },
  '/api/parent-portal/emergency-contacts': { coveredBy: '(no parent surface)', mechanism: '403-gate' },
  '/api/support-requests': { coveredBy: '(no youth surface in v1)', mechanism: 'flag-410' },
  '/api/support-requests/worker': { coveredBy: '(no operator surface in v1)', mechanism: 'flag-410' },
  // T041: /api/consent-wallet alias mount removed; prefix now 410s.
  '/api/consent-wallet': { coveredBy: '/api/pilot/consent', mechanism: '410' },
  '/api/auth': { coveredBy: '/api/pilot/auth/youth', mechanism: '410' },
  '/api/parent-auth': { coveredBy: '/api/pilot/auth/parent', mechanism: '410' },
  // T024: gamification + analytics surfaces — no pilot UI consumer, not in scopes.
  '/api/achievements': { coveredBy: 'none (out-of-pilot gamification)', mechanism: '410' },
  '/api/kpi': { coveredBy: 'none (out-of-pilot admin analytics)', mechanism: '410' },
  '/api/orb-snapshots': { coveredBy: 'none (out-of-pilot orb timelapse)', mechanism: '410' },
  // T041: legacy back-office router files DELETED (admin.js, breach.ts,
  // org.js, server/routes/org/*, transparency.js). Under PILOT_MODE the
  // late 410 lockdown is the ONLY surface that responds; no router exists
  // to fall through to even when the master switch is off.
  '/api/admin': { coveredBy: 'none (out-of-pilot admin back-office, file deleted)', mechanism: '410' },
  '/api/admin/breach': { coveredBy: 'none (out-of-pilot PIPA breach console, file deleted)', mechanism: '410' },
  '/api/org': { coveredBy: 'none (out-of-pilot org back-office, files deleted)', mechanism: '410' },
  '/api/transparency': { coveredBy: 'none (no pilot consumer, file deleted)', mechanism: '410' },
});
