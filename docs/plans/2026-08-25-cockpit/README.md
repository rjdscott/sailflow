# Cockpit: Race mode as a control centre that a beginner can read and a Grand Prix trimmer can drive

- **Status:** 🟡 In progress

The owner's 2026-08-25 ask: redesign Race mode as a cockpit — controls in
logical groups, each visual beside the controls that move it, a tasteful
dark instrument look, a real 3D sail view, intuitive and easy to control.
Governed by [ADR 0014](../../adr/0014-three-js-sail-view-behind-lazy-chunk-and-perf-gate.md)
(3D view) and [ADR 0015](../../adr/0015-cockpit-panels-by-sail-system-with-density-tiers.md)
(panels, instrument cell, density tiers). Evidence in
[research 2026-08-25-cockpit](../../research/2026-08-25-cockpit/).

## Scope

Race screen rebuilt as four sail-system panels around a 3D hero, with an
instrument bar, three density tiers, A/B compare and a scripted puff
replay; tokens v2 (dark-first) across the shell; Dock, Log, Drills, More
restyled to the new tokens without IA changes; an adversarial UX audit
(ux-03) at the end.

## Non-goals

- Time-domain physics, gust fields, steering (Epic 2). The puff replay is
  a scripted sequence of steady-state solves.
- Physics re-fit; `pnpm validate` hold-out result must not change.
- Redesign of Dock, Log, Drills IA.
- Multiplayer, accounts.

## Layout (desktop ≥ 1280 px, one screen, no scroll)

```
Conditions rail: PoS chips · TWS stepper · sea · crew · sailset · committed-rig chip
Instrument bar:  BSP [bug+trend] · %POLAR · VMG [bug+trend] · TWA · HEEL gauge + HELM load · verdict
┌ MAINSAIL ─────┬ HERO 3D sail/rig (presets) ─┬ HEADSAIL ─────┐
│ controls      │ 2D plan view fallback       │ controls      │
│ section stack │                             │ section stack │
│ leech stall   │                             │ spreader gauge│
│ batten cue    │                             │ sag indicator │
├ HELM & CONDITIONS: heel/helm pair · mode · crew fore-aft ────┤
├ RIG (dock-gated): committed rig · gear-chart row · rake/prebend┤
└ Actions: Optimise + Apply · A/B previous · Log this trim ─────┘
```

Phone (< 720 px): same panels stacked, hero first, sticky panel tabs,
each panel keeps its visual beside its controls.

## Phases

| NN | Phase | Status | Last update |
|----|-------|--------|-------------|
| 00 | [Research and decisions](phase-00-research-and-decisions.md) | 🟡 In progress | 2026-08-25 |
| 01 | [Tokens v2 and cockpit primitives](phase-01-tokens-and-primitives.md) | 🔵 Not started | none |
| 02 | [Core instrument outputs and the instrument bar](phase-02-instruments.md) | 🔵 Not started | none |
| 03 | [Mainsail and Headsail panels](phase-03-sail-panels.md) | 🔵 Not started | none |
| 04 | [3D hero view](phase-04-three-d-hero.md) | 🔵 Not started | none |
| 05 | [Helm and Rig panels, actions, puff replay](phase-05-helm-rig-actions.md) | 🔵 Not started | none |
| 06 | [Phone, restyle, audit ux-03, close-out](phase-06-phone-restyle-audit.md) | 🔵 Not started | none |

Order: 00 → 01 → 02 ∥ 04 → 03 → 05 → 06. Cut order under pressure: puff
replay → A/B → 3D presets and tweens (keep one view) → Analyse tier. Never
cut: the instrument-cell contract, tests, provenance, ADRs.

## Critical files

- Reused: `src/ui/components/Slider.svelte`, `src/ui/race/{store,optimum}.svelte.ts`,
  `src/ui/race/{geometry,boat,rigLayout}.ts`, `src/ui/race/{RigElevation,PlanView}.svelte`,
  `src/ui/format.ts`, `src/ui/keys.ts`, `src/lib/telemetry.ts`,
  `src/core/shape/sheeting.ts`, `src/core/reference/polar.ts`,
  `data/tuning/*.json`, `src/ui/tokens.css`, `src/app.css`,
  `src/ui/stores/settings.svelte.ts`.
- New: `src/ui/instruments/*`, `src/ui/race/panels/*`,
  `src/ui/race/{InstrumentBar,PuffReplay}.svelte`, `src/ui/race/{verdict,puff}.ts`,
  `src/ui/three/*`, `src/core/solve/instruments.ts`,
  `docs/audits/2026-08-25-ux-03/*`.

## Top risks

1. The `three` chunk exceeds 150 KB gzip. The lazy chunk keeps first load
   unchanged regardless; the measured number lands in phase 04's log and
   ADR 0014's Related.
2. Sign conventions (twist, entry, leeward) drift between core, 2D and 3D.
   One `src/ui/three/conventions.ts` with asserted tests.
3. Head and foot extrapolation from the ¼ ½ ¾ sections dominates the 3D
   silhouette. Explicit, configurable, an ASSUMPTIONS row.
4. Three density tiers triple the UI surface. The tier is a data attribute
   on panels and cells, not three component trees.
5. New core instrument outputs are tier C inventions. Labelled, banded,
   disagreement panel unaffected, hold-out gate unchanged.
6. One-screen desktop overflows at 1280×720. Phase 01 adds a Playwright
   layout check at 1280×720 and 1440×900.

## Implements

- ADR 0014, ADR 0015; research 2026-08-25-cockpit; decision log rows 35–43.
