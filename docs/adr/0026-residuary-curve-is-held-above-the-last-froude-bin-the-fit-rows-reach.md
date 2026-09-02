# 0026. The residuary curve is held above the last Froude bin the fit rows reach, not fitted through it

- **Status:** Accepted
- **Date:** 2026-09-02

## Context

Calibration stage 1 fits the hull against the printed jib rows, and its own
docstring claimed those rows "span Fn 0.26 (6 kt beating) to Fn 0.70 (20 kt at
90 deg)". They do not. Measured on the polar's *printed* boat speeds, the
J/70's twenty stage-1 rows top out at **Fn 0.55**.

Two fitted knobs govern what happens above that.

- `hydro.planingRelief` sheds residuary resistance on a ramp from Fn 0.5 to
  Fn 1.0. It is an invented knob with a code fallback of zero, and
  `validation/report.md` has carried it as a weakness since the first fit:
  "the model has no planing regime to fit". Exactly one stage-1 row feels the
  ramp at all — TWS 20 at 90°, at 11 % of it — and it is not identifiable at
  all: swept over its whole calibration range with everything else frozen it
  moves the stage-1 loss by **0.5 %** (2.7732e-2 at zero, 2.7605e-2 at 0.40,
  2.8149e-2 at 0.90), a spread smaller than the difference between successive
  fits of the same model.
- `hydro.rrMul.fn60` is the residuary multiplier at Fn 0.6, the base curve's
  last node, above which `lerpTable` holds it constant. No row reaches the
  node, but the TWS 20 / 90° row sits at Fn 0.553 and so carries 53 % of the
  bin's interpolation weight, and the loss *is* shaped by it: a minimum near
  1.3 (2.7615e-2) against 2.8932e-2 at 1.9 and 9.4320e-2 at 0.9.

So the two knobs fail different tests. The relief the loss cannot see at all;
`fn60` it can see, but only through one row at the edge of the range, and it
then applies whatever that row implies to the whole Fn 0.6–0.73 band where
half the printed polar lives.

The polar says both extrapolations were wrong. Every printed row above Fn 0.6
is an asymmetric reach and the model was **12–17 % fast** on all of them:
TWS 16 at 135° 14.5 %, TWS 20 at 135° 16.6 %, at 150° 17.4 %, and the TWS 20
running VMG row 15.6 %.

That was not only a fitted-row problem. The J/70's downwind VMG curve is
bimodal — a reaching hump near 145°, a soak hump near 168° — and an inflated
Fn 0.6+ region tips the balance to the reaching one. Two separate failures
followed. `aero.asymCdMul` is the one knob that can slow the deep rows, and
the held-out TWS 14 running row needed slowing at 5.0 % against a 3 %
tolerance; every reduction that fixed it flipped a *fitted* row onto the
reaching hump at 48–51 % out, so stage 2's loss would not go there. And with
`fn60` fitted free, the model's own TWS 16 downwind optimum landed on that
reaching hump — 133.9° against a printed 174.0°, 9.98 kt against 8.75 — which
`validation/invariants.test.ts` 19 caught as a break in the monotone deepening
of the downwind optimum with wind speed.

## Options considered

**A. Leave both fitted.** No change.
- Pros: nothing to justify.
- Cons: a knob the loss cannot see at all, and a knob one edge row
  extrapolates across a third of the polar, together producing a 12–17 %
  error band and a red invariant. "The optimiser chose it" is not evidence.

**B. Delete `hydro.planingRelief` from the model and pin `fn60`.**
- Pros: smallest model; the honest statement that this is a displacement
  model.
- Cons: throws the relief away for the Melges 24 too, whose stage-1 rows run
  to Fn 0.65 with four rows inside the ramp — a class where it genuinely *is*
  fitted. Removing a term because one class cannot constrain it punishes the
  class that can.

**C. Widen the stage-1 row set until it reaches the regime.** Add the printed
asymmetric reaches to the hydro stage.
- Pros: constrains both knobs with data rather than rules, and the data
  exists — the polar prints rows out to Fn 0.73.
- Cons: it changes the fit row set, which this round was scoped not to touch,
  and it puts asymmetric rows into the stage whose whole purpose is to fit
  hydro *before* any asymmetric aero knob exists. It is the right next move
  and it deserves its own round.

**D. Gate only the relief on coverage, and leave `fn60` fitted.** The
narrower rule, justified by identifiability alone.
- Pros: the strongest possible evidence for the one knob it covers — a loss
  that cannot see a parameter has no business choosing it.
- Cons: **tried, and the result is on record.** It closed the gate at 10/10
  with the held-out TWS 14 running row at 2.9 %, and it broke invariant 19:
  `fn60` fitted to 1.148 put the TWS 16 downwind optimum on the planing reach
  described above. A calibration that passes the hold-out and fails a model
  invariant is not a better calibration, and choosing between the two on the
  hold-out score is the thing ADR 0007 exists to forbid. The invariant is the
  model-side evidence that one edge row is not enough to carry that band.

**E. Hold the whole curve above the last bin the rows reach** (chosen). Fit
both knobs only when a stage-1 row's printed speed reaches the base curve's
last node, Fn 0.6; unfitted, `planingRelief` holds its code default of 0 and
`fn60` falls back to `fn50`.
- Pros: one rule, one threshold, read off the source table rather than the
  model, deterministic and checkable by hand. It removes free parameters
  rather than adding any. "No coverage, so no change" is the rule `lerpTable`
  already applies at the ends of every table in the module, moved one bin down
  because the rows stop one bin down. And it follows the conditional-knob
  pattern ADR 0024 established for `aero.hbiM`.
- Cons: it is a rule, not a measurement, and it is stricter than the evidence
  strictly requires for `fn60`. It costs the one fitted row that had authority
  there. And holding `fn60 = fn50` is itself an extrapolation — a flat
  multiplier, not a measured one; it is more honest than the alternative, not
  right.

## Decision

**We will fit `hydro.planingRelief` and `hydro.rrMul.fn60` only when a stage-1
row reaches Fn 0.6, and hold the residuary curve flat above the last bin the
rows reach, because a band that half the printed polar lives in and that one
edge row extrapolates is not a fitted band.**

Concretely:

- `calibration/fit.ts` computes `FIT_FN_MAX` from the **printed** boat speeds
  of the stage-1 rows and gates both knobs on `FIT_FN_MAX >= RR_FN_LAST`,
  where `RR_FN_LAST` = 0.6 is the last tabulated node of the residuary base
  curve in `hydro/resistance.ts`. Above that node the base curve is a clamped
  constant, so it is the natural edge of the fitted range.
- `hydro/resistance.ts` `residuaryMultiplier` falls back for the top bin to
  the bin below it rather than to 1. Falling back to 1 would put a *step* at
  the top of the curve on exactly the rows nothing constrains.
- The J/70 (max Fn 0.55) holds `planingRelief` = 0 and `fn60` = `fn50`.
- The Melges 24 (max Fn 0.65, four rows inside the ramp) keeps both.
- Stage 1's docstring stops claiming a Froude range the rows do not cover.

Scope: calibration stage 1 and the residuary multiplier, every class. Until a
round widens the stage-1 row set (option C), which would replace this rule
with data.

## Consequences

**What gets easier, and it is most of the polar.** Every printed row above
Fn 0.6 improves, and they are the rows the fit never saw: the TWS 20 running
VMG row — a planing row this model has no regime for — goes from **15.6 % to
4.0 %** fast, TWS 16's from 5.3 % on a flipped hump to 5.3 % on the right one,
TWS 10's from 6.2 % to 4.5 %. The downwind optimum deepens monotonically again
across TWS 6–16 (143.1 → 146.1 → 148.6 → 166.0 → 168.8 → 169.7), which is
invariant 19 green. `aero.asymCdMul` settles at 2.838 rather than 2.981.

**What does not happen: the gate does not close.** The held-out TWS 14
asymmetric running row is **4.7 % fast against a 3 % tolerance**, improved
from 5.0 % and still outside. Its VMG shortfall at the polar's printed angle
is 0.11 %, so the model's *speed* is what fails, not its angle. Nine of ten
gated rows pass, the next worst by a distance being TWS 14 at 120°, 4.5 %
against a 5 % limit. Option D is on record as a variant that closes it; it is
not shipped, because it fails invariant 19 and because picking between two
calibrations by their hold-out score is exactly what ADR 0007 forbids.

**A related finding, measured and deliberately not acted on.**
`hydro.keelLiftSlope` is **exactly** unidentifiable from these rows: the
stage-1 loss is identical to five significant figures across its whole bound
range 0.8–2.0, and the fit duly parks it on the 2.0 bound. The reason is
structural. `sideForce` is proportional to slope × leeway, and leeway is a
free unknown the equilibrium adjusts until side force balances, so the product
is pinned and the factors are not; `inducedDrag` is Fy²/(q·π·AR·A), which does
not contain the slope at all. Leeway appears nowhere in the resistance model,
so the knob moves no force, no speed and no heel — only the reported leeway
angle, which no source in this repo publishes. It should stop being fitted,
and where it lands, bound included, should be read as noise rather than as the
knob-at-a-bound signal the rest of `ASSUMPTIONS.md` teaches. Not done here: it
is a further change in a round that already carries three, and unlike these
two it is not distorting anything.

**What is committed to.** That the fitted range is a property of the row set,
and that nothing outside it gets a free parameter. And that a calibration is
judged on the model-side tests as well as on the loss — the variant this ADR
rejects had the better hold-out score and the worse model.

**What risk is accepted.** A class whose polar is later extended past Fn 0.6
gains two fitted parameters without anyone deciding to add them.
`calibration/residuals.json` records the stage-1 knob list every run, so the
change is visible; it is not announced. And `fn60 = fn50` is a flat
extrapolation that no source supports; it is only the least-committal one.

**What it would cost to unwind.** Half a day: one conditional in `fit.ts` and
one fallback in `resistance.ts`, then both classes recalibrated and both
golden corpora regenerated.

**Revisit when:** the stage-1 row set is widened to cover Fn > 0.6 on the J/70
(option C) — which is the right next round, and would replace this rule with
data; or a class arrives whose polar genuinely spans the planing regime and
the relief needs a published shape rather than a fitted fraction.

## Related

- [0007](0007-calibration-and-validation-are-separate-with-a-held-out-gate.md) —
  why the variant with the better hold-out score is not the one that ships.
- [0018](0018-offwind-parachute-drag-knob-not-a-mode-switch.md) —
  `aero.asymCdMul`, the knob whose range this frees, and the deep rows it
  carries.
- [0023](0023-vmg-gate-measures-vmg-lost-at-the-polars-angle.md) — the bimodal
  downwind curve this keeps on the right hump, and the gate criterion the
  failing row passes on angle.
- [0024](0024-the-heeling-arm-is-published-geometry-not-a-fitted-knob.md) — the
  conditional-knob pattern (`aero.hbiM`), and the round whose gate this
  narrows but does not close.
- [0025](0025-effective-draft-with-heel-takes-the-published-bands-floor-unfitted.md)
  — the other change in the same refit.
- `validation/report.md`, "Honest weaknesses" — where the planing weakness has
  been recorded since the first fit.
