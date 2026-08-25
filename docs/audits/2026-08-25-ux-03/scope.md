# Scope contract

- **Surfaces in scope:** the Race cockpit (`src/ui/screens/Race.svelte`,
  `src/ui/race/**`, `src/ui/race/panels/*`, `src/ui/instruments/*`,
  `src/ui/three/*`, `src/ui/components/{Panel,InstrumentCell,BulletGauge,ConfidenceBadge,Slider}.svelte`),
  the shell (`src/App.svelte`, `src/ui/components/BottomNav.svelte`,
  `src/ui/router.svelte.ts`, `src/ui/tokens.css`, `src/app.css`), and the
  phase-06 restyle of Dock, Log, Drills and More
  (`src/ui/screens/{Dock,Log,Drills,More}.svelte`, `src/ui/dock/**`,
  `src/ui/drills/**`, `src/ui/disagree/**`) as those screens are reached from
  the cockpit.
- **Out of scope:** solver accuracy and physics (own plan; `pnpm validate`
  hold-out unchanged by ADR 0015). Information architecture of Dock, Log and
  Drills (plan non-goal). Items already ticked in
  [`ux-02/todo.md`](../2026-08-25-ux-02/todo.md) unless re-observed as a
  regression; unticked ux-02 items are re-reported only where this audit adds
  new evidence or a new mechanism.
- **Lens:** cockpit UX against [ADR 0015](../../adr/0015-cockpit-panels-by-sail-system-with-density-tiers.md)
  (four sail-system panels, one instrument-cell contract, three density tiers,
  one screen at ≥ 1280 px) and [ADR 0014](../../adr/0014-three-js-sail-view-behind-lazy-chunk-and-perf-gate.md)
  (3D hero behind a lazy chunk and a first-frame gate); accessibility
  (contrast, keyboard, reduced motion, screen reader on the cells); phone
  (390×844 and 360×740); performance (bundle, 3D, solve latency). Findings cite
  the numbered principle they violate in
  [research 01 §3](../../research/2026-08-25-cockpit/01-instrument-and-simulator-ux.md).
- **Commit:** `6bf6dd0` (phase 05 merged; phase 06's desktop-grid, phone and
  restyle tasks ticked, the audit task open).
- **Method:** fan-out, five lenses on Opus (novice in the Learn tier, expert
  trimmer in the Analyse tier, accessibility, phone, performance and the 3D
  hero), one adversarial refuter on Opus per High or Critical, synthesis by
  Fable. Every measurement is a Playwright reproduction against the production
  build served at `127.0.0.1:4321`, fresh browser context per shot because the
  app persists tier, conditions and trim in `localStorage`. Where a refuter
  corrected or downgraded a finding, the corrected version is what is published
  and the refuter's reason is stated in the finding text. Evidence in
  `evidence/`: lens shots are prefixed by lens, refuter reproductions by
  `verify-`.
