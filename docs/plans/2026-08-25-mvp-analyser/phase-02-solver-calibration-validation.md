# Phase 02: Solver + calibration + validation

- **Status:** ⏸ Deferred

## Goal

A deterministic 3-DOF VPP for the J/70 that passes solver invariants in CI and reproduces the held-out ORC polar points within stated tolerance, with a committed report. Gate for all UI phases ≥ 04.

## Tasks

- [x] `src/core/math/`: newton3, brent, golden, nelderMead, interp + unit tests [S]
- [x] `src/core/geometry/`: sailplan, rig [O]
- [x] `src/core/rig/`: beam (single EI), state → RigState [O]
- [x] `src/core/shape/`: flying, toOrc (heuristic bridge, all gains knobs) [O]
- [x] `src/core/aero/orc/`: coeffs (Tables 5.1/5.4/5.6–5.8), depower §5.1.3, twist §5.4.4, windage 5.10, forces [O]
- [x] `src/core/aero/shape/sensitivity.ts` (INVENTED, header says so) [O]
- [x] `src/core/hydro/`: resistance, keel, righting (crew + C.9.5 bound), waves [O]
- [x] `src/core/solve/`: equilibrium, optimal, trimmed, dock, tierFor [O]
- [x] `src/worker/` solver.worker.ts + client.ts; determinism test [S]
- [x] `calibration/fit.ts` 4 stages; writes calibration block + ASSUMPTIONS.md table [O]
- [x] `calibration/golden.ts` + `validation/golden/*.json` [S]
- [x] `validation/invariants.test.ts` (12 invariants) [O]
- [x] `validation/polar.test.ts` hold-out gate + `validation/report.ts` → `report.md` [O]
- [x] ADRs 0006 (aero split + tiers), 0007 (calibration/validation split + tolerances)
- [x] Runbook run-validation-and-recalibrate

## Verification

```bash
make check
pnpm validate
cat validation/report.md | head -40
```

## Artifacts

`validation/report.md` showing hold-out PASS, `validation/golden/`, `ASSUMPTIONS.md` with generated table

## Progress log

- 2026-08-25 — Modules built in parallel by four agents (math 32 tests; geometry/rig/shape 107; aero 121 with ORC 2023 tables transcribed verbatim, kheff simplified as a line between the two stated points; hydro 31 with ORC §6.8 added resistance in waves, `hydro.wavesK` default 0.06 because the published form gives ~1150 N at 6 kt for a hull far outside its regression range). Solver layer written by Fable: `equilibrium.ts` (damped Newton, fixed seeds, three seed sets), `optimal.ts` (golden on flat then TWA; race trim optimised through ORC `flat` with backstay mapped from flat — full 11-control search is Epic 2), `trimmed.ts`, `dock.ts` (ADR 0009), `tierFor.ts` (ADR 0006). Two solver bugs found by tests and fixed: (1) crew righting moment applied at full hike even at 0° heel left no equilibrium in light air → crew now hike in proportion to heel (`hydro.hikeRampDeg`, default 8°); (2) port-tack heel sign applied inside the residual clamped heel to 0 → sign now applied only on output (caught by the mirror-symmetry test). Uncalibrated numbers at TWS 10 upwind: 5.4 kt / 6.6° heel vs polar 5.9 kt / ~15°; heel needs the calibration stage. `solver.worker.ts` + dispatch tests. 333 tests green, `make check` green, WIP commit b22cc9c on `feat/solver`; main (shell) merged in. Calibration (`calibration/fit.ts`, golden) and validation (`validation/*`, `report.md`) being built by two Opus agents now. Known weaknesses recorded by the module agents: main area −3.5 % vs rated (girth trapezoids under-read the square top), beam has no P-δ term, asym shape is inert to kite controls, sag does not grow with wind, PT-2 → N conversion eyeballed.
- 2026-08-25 — Calibration + validation landed (Opus agents). Validation findings drove two solver fixes: fixed-angle `optimal` now maximises boat speed (the VMG objective at 90° minimised speed); calibration stage 4 knobs are bounded with a post-fit clamp guard so the main never saturates. ADR 0012 supersedes ADR 0007's split: fit all rows at TWS 6/10/12/16/20, hold out all rows at 8/14. Final fit (195 s, bit-identical across runs, 18 knobs in `data/boats/j70.json`): **8 of 10 held-out rows pass**; TWS 14 jib vmgUp +5.8 % (polar holds a 5.8–5.95 kt plateau from 12–20 kt that 0.1-Fn linear residuary bins cannot build) and TWS 14 asym vmgDn +15 %/−25° (ORC's optimum jumps 150→172° between 12 and 16 kt; one CL multiplier cannot shape an angle error). **Gate: FAIL, reported honestly in `validation/report.md`.** Per plan, CI runs invariants + golden (563 tests green); the polar gate runs locally via `pnpm validate` (`vitest.polar.config.ts`). Known weaknesses recorded: downwind heel 0.5–2° vs printed 11.7° (no knob touches it); dock-setup ranking is nearly wind-independent because `optimal()` overrides shape-derived flat, so stage 4 cannot separate the North bands (all six rig knobs on bounds) — needs a mechanism, not a knob (Epic 2 candidate: optimise real race controls, let sag/bend enter through the shape layer); `hydro.heelDragK` fitted at 2× its assumed value; `aero.hbiM` pinned at its bound. Integration: real worker wired into race/dock/drills, disagreement panel mounted (advanced), commit-for-today drafts a log entry, dock lap-time memo (worker starved the renderer), DataCloneError fix (JSON round-trip at the worker boundary). Browser-verified on `pnpm preview`: race solves live (5.2 kt / 10° at 10 kt), dock scores, drills open. Screenshot capture quirk: CDP needs a repaint after hash navigation (not an app bug).
- 2026-08-26 — Deferred at close-out (v0.3.0). The hold-out gate (ADR 0012) stands at **FAIL — 8/10**: TWS 14 `jib vmgUp` 5.8 % / 1.8° and TWS 14 `asym vmgDn` 15.1 % / 25.5° (the model is fast and gybes at 146.5° where the polar soaks to 172°). The upwind residual (model 6.23 kt vs polar 5.89, 1.8° wide) is a calibration-envelope problem; the downwind one is a model-structure problem — the asym aero has no VMG-down mode switch (soak vs plane), so the optimiser never finds the polar's deep soak. Both are picked up as phase 01 of `docs/plans/2026-08-26-phase-two/`. Everything else this phase promised (solver, calibration, validation harness, golden corpus, `pnpm validate` exit code) shipped and is enforced in CI.
