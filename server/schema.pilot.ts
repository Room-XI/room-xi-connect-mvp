/**
 * Pilot Schema — canonical Drizzle schema for the 3-portal finalized pilot.
 *
 * This file is the single source of truth for pilot runtime tables.
 * It REFERENCES reusable core tables from existing schema files where safe
 * (users, organizations, org_members, programs, program_events).
 *
 * STATUS: scaffolding — table stubs declared for shape visibility only.
 * Concrete column definitions are filled in during each feature prompt per
 * the SOT §07_FINAL_SCHEMA_SPEC and the PR order in 11_REPO_TRANSITION_PLAN.
 *
 * Legacy tables NOT imported here (quarantined for migration-only reference):
 *   - consents, consent_events, privacy_consents, parent_youth_consent,
 *     consent_delegations  (legacy consent)
 *   - rsvps                 (legacy generic RSVP)
 *   - attendance            (legacy generic attendance)
 *   - journal_entries       (journaling — disabled)
 *   - ximi_conversations    (broad AI companion — disabled)
 *   - ai_interventions      (proactive AI — disabled)
 *   - tournament tables     (out of pilot — dropped in T043)
 *
 * Reused from existing schema:
 *   - users                 → server/schema.ts
 *   - organizations         → server/schema.ts
 *   - org_members           → server/schema.ts
 *   - programs              → server/schema.ts
 *   - program_events        → server/schema.ts
 *   - safety_plans          → server/schema.ts
 *   - safety_plan_shares    → server/schema.ts
 *   - saved_programs        → server/schema.ts
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

// ─── Consent Engine (canonical) ──────────────────────────────────────────
// Tables: consent_templates, consent_requests, consent_receipts,
// consent_audit_events, parent_magic_links
// See: server/schema.extras.ts (existing canonical definitions will be
// consolidated or re-exported here during Prompt 3).
export const PILOT_CONSENT_TABLES = [
  'consent_templates',
  'consent_requests',
  'consent_receipts',
  'consent_audit_events',
  'parent_magic_links',
] as const;

// ─── RSVP & Schedule ─────────────────────────────────────────────────────
// Table: event_rsvps (event-level only; legacy `rsvps` retired)
export const PILOT_RSVP_TABLES = ['event_rsvps'] as const;

// ─── Attendance Spine ────────────────────────────────────────────────────
// Tables: attendance_sessions, attendance_records, attendance_passes
export const PILOT_ATTENDANCE_TABLES = [
  'attendance_sessions',
  'attendance_records',
  'attendance_passes',
] as const;

// ─── Referrals ───────────────────────────────────────────────────────────
// Tables: referrals (extended), referral_suggestions, referral_outcomes
export const PILOT_REFERRAL_TABLES = [
  'referrals',
  'referral_suggestions',
  'referral_outcomes',
] as const;

// ─── Verified Supply ─────────────────────────────────────────────────────
// Tables: import_jobs, listing_verifications + programs.* verification cols
export const PILOT_SUPPLY_TABLES = ['import_jobs', 'listing_verifications'] as const;

// ─── Reporting ───────────────────────────────────────────────────────────
// Table: report_runs
export const PILOT_REPORTING_TABLES = ['report_runs'] as const;

// ─── Support ─────────────────────────────────────────────────────────────
// Table: support_requests (feature-flagged)
export const PILOT_SUPPORT_TABLES = ['support_requests'] as const;

// ─── Youth auth artifacts ────────────────────────────────────────────────
// login_code lives on users table; account_lockouts already exists.

/**
 * Full canonical pilot table list — used by migration tooling and QA.
 */
export const PILOT_CANONICAL_TABLES = [
  ...PILOT_CONSENT_TABLES,
  ...PILOT_RSVP_TABLES,
  ...PILOT_ATTENDANCE_TABLES,
  ...PILOT_REFERRAL_TABLES,
  ...PILOT_SUPPLY_TABLES,
  ...PILOT_REPORTING_TABLES,
  ...PILOT_SUPPORT_TABLES,
] as const;

export type PilotCanonicalTable = (typeof PILOT_CANONICAL_TABLES)[number];
