# Phase 02: Solver + calibration + validation

- **Status:** 🟡 In progress

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
- [ ] `calibration/fit.ts` 4 stages; writes calibration block + ASSUMPTIONS.md table [O]
- [ ] `calibration/golden.ts` + `validation/golden/*.json` [S]
- [ ] `validation/invariants.test.ts` (12 invariants) [O]
- [ ] `validation/polar.test.ts` hold-out gate + `validation/report.ts` → `report.md` [O]
- [x] ADRs 0006 (aero split + tiers), 0007 (calibration/validation split + tolerances)
- [ ] Runbook run-validation-and-recalibrate

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
