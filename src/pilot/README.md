# `src/pilot/` — Canonical Pilot Frontend

After T037 the legacy `src/router.tsx` toggle was removed and
`src/main.tsx` mounts `pilotRouter` from `src/pilot/router.tsx`
unconditionally. This directory holds the very small set of pilot-only
React surfaces. Everything else the router renders lives in `src/routes/*`,
`src/ui/*`, `src/components/*`, etc.

## Files

| Path                                | Role                                                                 |
| ----------------------------------- | -------------------------------------------------------------------- |
| `router.tsx`                        | The single `createBrowserRouter` config. Lazy-loads every page.      |
| `routes/parent/Wallet.tsx`          | Parent consent wallet page — lists pending + signed consent requests. Mounted at `/parent/wallet`. |
| `routes/parent/RequestDetail.tsx`   | Parent consent-request detail (sign / decline / withdraw). Mounted at `/parent/consent/:id`. |

## What's intentionally NOT here

- **Per-portal layout shells** (`OperatorLayout`, `YouthLayout`,
  `ParentLayout` under `src/pilot/layouts/`). These were `return null`
  scaffolding stubs with zero importers; deleted in T042. The router
  uses `src/shell/App.tsx` as the outer layout for the youth app and
  `src/routes/parent/ParentLayout.tsx` for the parent portal — those
  are the real layouts and are not pilot-specific.

- **Per-portal route barrels** (`src/pilot/routes/{operator,public,
  youth,parent/index.ts}`). Same story — placeholder files with no
  importer, deleted in T042. The router does direct lazy-imports of
  each page module.

- **Pilot client helpers** (`src/pilot/lib/{api,auth,permissions}.ts`).
  These were `export const fooPlaceholder = true;` scaffolding files
  superseded by the real helpers in `src/lib/api.ts`, `src/lib/session.ts`,
  and `src/lib/pilotFlags.ts`. Deleted in T042.

- **Pilot youth login + signup pages** (`src/pilot/routes/youth/
  Login.tsx`, `Signup.tsx`). Substantial components that were never
  wired — the router uses `src/routes/auth/Login.tsx` and the existing
  signup flow. Deleted in T042 since they were dead code; if a fresh
  pilot-specific login UI is needed later it should be reintroduced
  with an explicit router wiring at the same time.

- **A pilot-specific parent login page**. Deleted in T042 for the
  same reason — the router uses `src/routes/ParentLogin.tsx`.

## Open follow-up work

- An operator-portal frontend (no current consumer; staff still use
  the legacy youth-worker surfaces). The backend has the scaffolding
  in `server/pilot/permissions/scopes.ts` (`OPERATOR_SCOPE`) and the
  consent-wallet-staff router, but no client UI exists yet.
