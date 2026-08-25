# 0012. The calibration hold-out is split by wind speed, not by sailing angle

- **Status:** Accepted
- **Date:** 2026-08-25

## Context

ADR 0007 fitted the model only on VMG rows and held out the 60°, 90° and 120°
rows at every wind speed. The first fit produced a model within 2 % on the
held-out VMG rows but 7–15 % off on reaching rows at 6–8 kt (too slow) and
14–20 kt (too fast): the reaching regime lives at Froude numbers 0.5–0.7 that
no VMG row visits, so the residuary-resistance multipliers for those bins
were fitted only on downwind asymmetric rows and the light-air viscous/form
regime was never constrained at all. A hold-out that removes an entire
physical regime from the fit does not test generalisation; it guarantees the
regime is wrong.

## Options considered

**A. Keep ADR 0007 and loosen the reaching tolerance.**
- Pros: no re-fit.
- Cons: hides a real model deficiency behind a wider gate.

**B. Split by wind speed** (chosen): fit every printed row (VMG up/down and
60/90/120°) at TWS 6, 10, 12, 16, 20; hold out every row at TWS 8 and 14.
- Pros: every regime is represented in the fit; the hold-out still contains
  10 rows the optimiser never saw, spanning light and medium air.
- Cons: fewer angles are "pure" hold-outs; interpolation in TWS is an easier
  test than extrapolation in angle.

**C. Leave-one-TWS-out cross-validation.**
- Pros: strongest statement.
- Cons: seven fits at several minutes each per iteration of the model.

## Decision

**We will fit on all polar rows at TWS 6, 10, 12, 16 and 20 and validate on
all rows at TWS 8 and 14, keeping ADR 0007's tolerances (VMG rows: 3 % boat
speed, 2° angle; 60/90/120° rows: 5 % boat speed), because a hold-out that
excludes a regime cannot pass without luck and cannot fail informatively.**
The stage-4 rig calibration split (North bands 8–10 and 12–16 fitted, all
else held out) is unchanged.

## Consequences

Easier: the gate becomes achievable and meaningful; the report shows the
same 25 rows with a clear FIT/HELD-OUT label per TWS. Harder: fewer
independent angles. Committed to: `validation/compare.ts` `FIT_TWS` and
`HOLDOUT_TWS` constants shared by calibration and validation. Supersedes the
split in ADR 0007; tolerances there remain in force.

**Revisit when:** a second data source arrives (ADR 0007 trigger), or the
model gains a knob that only reaching rows constrain.

### Consequences — 2026-08-26 note (audit docs-consistency-01)

The constants are `HELD_OUT_TWS` in `validation/compare.ts` and `FIT_TWS`
derived in `calibration/fit.ts:159`, not `FIT_TWS`/`HOLDOUT_TWS` in
`compare.ts` as committed above; the intent (one shared source) holds (M-15).

## Related

- Supersedes the fit/hold-out split of [ADR 0007](0007-calibration-and-validation-are-separate-with-a-held-out-gate.md)
- `validation/report.md` first-fit table (this session)
