/**
 * Pilot feature flags — client mirror of server/pilot/flags.ts.
 *
 * Read from Vite env at build time. Server is still the runtime authority:
 * disabled API prefixes return 410 regardless of these client flags.
 * These flags control UI visibility only.
 */

function boolEnv(name: string, defaultValue: boolean): boolean {
  const v = import.meta.env[name as keyof ImportMetaEnv];
  if (v === undefined || v === null || v === '') return defaultValue;
  return v === 'true' || v === '1' || v === 'yes' || v === true;
}

/** Master pilot cutover switch. */
export const PILOT_MODE = boolEnv('VITE_PILOT_MODE', true);

/** Out-of-pilot features — must stay hidden in UI. */
export const ENABLE_TOURNAMENTS = boolEnv('VITE_ENABLE_TOURNAMENTS', false);
export const ENABLE_JOURNALING = boolEnv('VITE_ENABLE_JOURNALING', false);
export const ENABLE_AI_INTERVENTIONS = boolEnv('VITE_ENABLE_AI_INTERVENTIONS', false);
export const ENABLE_DEMOS = boolEnv('VITE_ENABLE_DEMOS', false);

/** Pending product decisions — off by default for pilot v1. */
export const ENABLE_XIP = boolEnv('VITE_ENABLE_XIP', false);
export const ENABLE_SUPPORT_INBOX = boolEnv('VITE_ENABLE_SUPPORT_INBOX', false);

/**
 * Parent password fallback (mirrors server `ENABLE_PARENT_PASSWORD_FALLBACK`).
 * Magic link is the canonical parent auth in pilot v1; password setup, reset,
 * forgot-password, and change-password UIs are hidden when this is false.
 */
export const ENABLE_PARENT_PASSWORD_FALLBACK = boolEnv(
  'VITE_ENABLE_PARENT_PASSWORD_FALLBACK',
  false
);

/**
 * Legacy admin/org/worker standalone portals.
 *
 * The finalized pilot uses 3 portals: Youth, Parent, Operator.
 * The Operator portal consolidates staff/admin/org. Until Operator ships,
 * legacy portals remain mounted (access-gated) so internal teams keep
 * working. Flip this to false once Operator is the sole back-office surface.
 */
export const ENABLE_LEGACY_PORTALS = boolEnv('VITE_ENABLE_LEGACY_PORTALS', true);
