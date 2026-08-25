# Scope contract

- **Surfaces in scope:** every screen (`src/ui/screens/*`, `src/ui/race/**`, `src/ui/dock/**`, `src/ui/drills/**`, `src/ui/log/**`, `src/lib/drills.ts`, `data/drills/j70-static.json`), first-run experience, navigation, and the Drills learning loop as a whole.
- **Out of scope:** solver accuracy (own plan); items already open in `ux-01` todo (phase 06) unless re-observed.
- **Lens:** category-leading UX ("easy and intuitive"), plus learning science and engagement for Drills. Both personas equally.
- **Commit:** `ee8e84e` (after ux-01 remediation PRs #26–#38).
- **Method:** fan-out, seven lenses on Opus (first-run/intuitiveness, information architecture + navigation, drills pedagogy, drills engagement + benchmark, log + more screens, desktop study-session flow, product strategy "what next"), one adversarial refuter per High/Critical, synthesis by Fable. Evidence in `evidence/` from the dev build at this commit; phone Race/Dock shots are from before ux-01 (marked `-pre-ux01`).
