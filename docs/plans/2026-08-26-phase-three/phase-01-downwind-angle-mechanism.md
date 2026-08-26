# Phase 01: Downwind angle — implement it, pass the gate

- **Status:** 🔵 Not started

## Goal

`pnpm validate` reads PASS on both TWS 8 and TWS 14 `asym vmgDn` rows
(≤ 3 % / ≤ 2°) with the phase-00 mechanism, the jib golden corpus
byte-identical under the code change alone, and the bimodal search intact.

## Tasks

- [ ] Implement the ADR's mechanism in `src/core/aero/orc/` (or amend the target per the ADR); every literal `prov:`-tagged or an `ASSUMPTIONS.md` row.
- [ ] Failing-first invariant: downwind optimum at TWS 14 within 2° of the polar; keep invariant 19 (soak branch exists, optimum non-decreasing with TWS).
- [ ] `pnpm calibrate` on the ADR 0012 fit set; hold-out untouched.
- [ ] `pnpm golden`: jib cases byte-identical under the code change alone (verify with HEAD's calibration block before recalibrating, as phase-two 01 did).
- [ ] `tierFor`: promote downwind `bs` to A inside the grid and optimum TWA to B **only if** both gated downwind rows pass on angle as well as speed; tests.
- [ ] Downwind heel: leave the column alone unless the phase-00 second source confirms it; say so in `ASSUMPTIONS.md`.
- [ ] README "Known limitation", `ASSUMPTIONS.md` weak points, `validation/report.md`, phase-two 01 file (link forward) updated in the same PR.

## Verification

```bash
make check
pnpm validate            # PASS on the two downwind rows; exit code reflects the whole gate
pnpm golden && git diff --stat validation/golden/j70
```

## Artifacts

Updated `validation/report.md`, `calibration/residuals.json`, golden corpus, ADR from phase 00 marked Accepted.

## Progress log
