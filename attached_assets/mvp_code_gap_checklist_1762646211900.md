# Room XI Connect — MVP Code Gap Checklist (Auto Review)

This checklist reflects gaps between your finalized handoff and the current ZIP (`room-xi-connect-mvp.zip`). It is prioritized from **blockers** to **quick wins**.

## 🔴 Blockers (ship before QA)
1. **Backend/API absent**: Frontend calls `/api/*` via `src/lib/api.ts` but no server/handlers are included. Implement or point to a running backend for:
   - `/api/checkins` (create/list/summary with *Explore Gate* compliance)
   - `/api/privacy/*` (audit log + consent updates)
   - `/api/org/*` (dashboard + exports)
   - `/api/xid/*` (attendance)
   - `/api/geo/*` (aggregates with Laplace noise + N≥7)
2. **Explore 8 a.m. Gate not enforced**: `src/routes/Explore.tsx` renders without a guard. Add a route guard/hook to require post‑08:00 check‑in (Edmonton time) or skip token.
3. **Geo anonymization not implemented**: No `h3-js` import, no hex bucketing, no noise pipeline. Implement server-side H3 r=8 aggregation + Laplace noise (ε=0.5) + N≥7 filter. Never return raw lat/lng.
4. **Weekly Snapshot hook incomplete**: `src/hooks/useWeeklySnapshot.ts` contains ellipses (`...`), missing the Edmonton time zone logic and week boundary checks.
5. **Transparency dashboard data**: `src/components/TransparencyDashboard.tsx` references stats but no data source. Wire to `/api/org/*` summaries that already apply DP and k-anonymity.

## 🟠 High Priority
6. **High-contrast mode**: No `prefers-contrast` CSS. Add outlines/shadows for the Orb and key UI.
7. **Pattern overlays not wired**: `MoodOrb.tsx` shows a *Toggle patterns* button that only logs. Render dot/line textures per hue in the canvas draw pipeline.
8. **Timezone correctness**: Use Luxon `setZone('America/Edmonton', { keepLocalTime: false })` for gate timing, snapshot at Sunday 08:00, and streaks.
9. **Consent reminder policy**: UI exists in `PrivacyCenter`, but enforce monthly reminder cap server-side. Add audit log rows for each reminder sent.
10. **Ximi triggers**: Heuristic exists but no variance/cooldown logic surfaced in UI. Add: 15% drop or weekly variance >0.4 prompt, 48h cooldown, opt-out respected.
11. **WCAG AA**: Add keyboard focus order tests and form labels across routes; add `aria-live` for async statuses.

## 🟡 Medium Priority
12. **Reduced motion**: Present in `MoodOrb.tsx` and `styles.css`, confirm all other animations respect it (`AnimatePresence`, route transitions).
13. **Low power mode persistence**: Persist low power toggle to local storage and expose in Settings.
14. **Color key**: Ensure copy is i18n-backed and matches `MOODS` tone metaphors.
15. **CSV/Export controls**: Ensure exports are DP-safe and Canada-only residency flagged in metadata.
16. **Error states**: Add explicit Empty/Loading/Error views for Explore, Map, Dashboard, OrbTimelapse.

## 🟢 Quick Wins
17. Add `@media (prefers-contrast: more)` CSS with subtle contour overlay for the Orb.
18. Add unit tests for `moodGradient` and `moodOrbRenderer` mappings.
19. Add a tiny `useExploreGate` hook with drift window and skip token helper.
20. Add `robots.txt` and `security.txt` stubs.
