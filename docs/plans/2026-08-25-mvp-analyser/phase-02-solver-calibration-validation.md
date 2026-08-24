# Phase 02: Solver + calibration + validation

- **Status:** 🔵 Not started

## Goal

A deterministic 3-DOF VPP for the J/70 that passes solver invariants in CI and reproduces the held-out ORC polar points within stated tolerance, with a committed report. Gate for all UI phases ≥ 04.

## Tasks

- [ ] `src/core/math/`: newton3, brent, golden, nelderMead, interp + unit tests [S]
- [ ] `src/core/geometry/`: sailplan, rig [O]
- [ ] `src/core/rig/`: beam (single EI), state → RigState [O]
- [ ] `src/core/shape/`: flying, toOrc (heuristic bridge, all gains knobs) [O]
- [ ] `src/core/aero/orc/`: coeffs (Tables 5.1/5.4/5.6–5.8), depower §5.1.3, twist §5.4.4, windage 5.10, forces [O]
- [ ] `src/core/aero/shape/sensitivity.ts` (INVENTED, header says so) [O]
- [ ] `src/core/hydro/`: resistance, keel, righting (crew + C.9.5 bound), waves [O]
- [ ] `src/core/solve/`: equilibrium, optimal, trimmed, dock, tierFor [O]
- [ ] `src/worker/` solver.worker.ts + client.ts; determinism test [S]
- [ ] `calibration/fit.ts` 4 stages; writes calibration block + ASSUMPTIONS.md table [O]
- [ ] `calibration/golden.ts` + `validation/golden/*.json` [S]
- [ ] `validation/invariants.test.ts` (12 invariants) [O]
- [ ] `validation/polar.test.ts` hold-out gate + `validation/report.ts` → `report.md` [O]
- [ ] ADRs 0006 (aero split + tiers), 0007 (calibration/validation split + tolerances)
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

