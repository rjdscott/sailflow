# Epic 1: a validated J/70 rig-tune and trim analyser, live on GitHub Pages, that the owner uses before every regatta day

- **Status:** 🟡 In progress
- **Started:** 2026-08-25
- **Owner:** Rob Scott, executed autonomously by Claude (Fable orchestrating, Sonnet/Opus subagents)

## Scope

Steady-state VPP analyser. Race mode (running rigging), Dock mode (shrouds,
rake, forestay committed against a forecast range per J/70 rule C.9.5),
disagreement panel vs North and Quantum guides, tuning log, ~10 static drills,
PWA offline. Svelte 5 + Vite + TS, pure `src/core`, worker protocol, golden
corpus, hold-out validation gate.

## Non-goals (later epics)

Time-domain simulation, steering, wind field, replay, spaced repetition,
three.js, Rust, multiplayer, accounts, backend.

## Phases

| NN | Phase | Status | Last update |
|----|-------|--------|-------------|
| 00 | Repo hygiene + tooling | 🟢 Completed | 2026-08-25 |
| 01 | Contracts + data | 🟢 Completed | 2026-08-25 |
| 02 | Solver + calibration + validation | 🟡 In progress | 2026-08-25 |
| 03 | Design system + app shell | 🟢 Completed | 2026-08-25 |
| 04 | Race mode | 🟢 Completed | 2026-08-25 |
| 05 | Dock mode | 🟢 Completed | 2026-08-25 |
| 06 | Disagreement panel + tuning log | 🟢 Completed | 2026-08-25 |
| 07 | Drills | 🟢 Completed | 2026-08-25 |
| 08 | PWA, polish, docs close-out | 🟡 In progress | 2026-08-25 |

Order: 00 → 01 → 02 ∥ 03 → 04 ∥ 05 → 06 → 07 → 08. Phase 03 builds against a
stub worker so it does not wait on 02. **No phase ≥ 04 starts until 02 is 🟢.**

## Critical files

`src/core/types.ts`, `src/worker/protocol.ts`, `src/core/solve/equilibrium.ts`,
`src/core/shape/toOrc.ts`, `src/core/solve/dock.ts`, `calibration/fit.ts`,
`validation/report.md`, `data/boats/j70.json`, `src/ui/tokens.css`,
`src/ui/Slider.svelte`.

## Architecture summary

See [research 04-decision-log](../../research/2026-08-25-sailing-sim-landscape/04-decision-log.md)
for why; ADRs 0003–0011 for what. Core layout: `geometry → rig → shape →
aero/orc + aero/shape → hydro → solve`. Solver: 3-DOF [V, heel, leeway] damped
Newton, fixed seeds, deterministic. Calibration: 4 staged Nelder-Mead fits;
validation = held-out TWS 8/14 + TWA 60/90/120. Dock score = expected regret
(s/mile) over a triangular forecast pmf. Confidence tiers A/B/C via one
`tierFor()`.

## Top risks

1. Solver misses hold-out tolerance; UI blocked. Mitigation: 03 on stub; tolerances re-justified only via ADR supersede.
2. Calibration at TWS 10/16 makes disagreement panel agree by construction there. Hold out other bands + Quantum; label "calibrated here".
3. Dock batch solves slow on phone. 1-kt grid, cache, measure in 02.
4. Overfit (7 polar points, ~12 knobs). No new knob without new hold-out.
5. Third-party data in public repo. One JSON per source, provenance inline.
6. Session loss mid-run. This README + progress logs are the resume point.

## Implements

- Research: [2026-08-25-sailing-sim-landscape](../../research/2026-08-25-sailing-sim-landscape/)
- ADRs: 0003 core/UI boundary, 0004 TS now / Rust at Epic 3, 0005 Svelte, 0006 aero split + tiers, 0007 calibration/validation, 0008 third-party data committed, 0009 dock scoring, 0010 persistence, 0011 2D only (written in the phase that first needs each)
