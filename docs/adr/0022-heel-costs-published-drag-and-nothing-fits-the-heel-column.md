# 0022. Heel drag from the published Delft law, reef as the optimiser's second stage, and nothing fitted to the polar's heel column

- **Status:** Accepted
- **Date:** 2026-09-02

## Context

The held-out gate (ADR 0007 tolerances, ADR 0012 split) failed on two rows at
TWS 14 kt: the jib upwind VMG row 5.8 % fast, and the asymmetric downwind VMG
row 3.0° off its angle. The upwind failure was not local to 14 kt. The ORC
Speed Guide holds the beat at 5.89–5.95 kt from TWS 14 to 20; the model held
6.23–6.34 across the same band, ~6 % fast at the held-out 14 and at the fitted
16 and 20 as well.

Two previous rounds had looked for the missing drag in the residuary curve and
in added resistance in waves, and `validation/report.md` recorded both as
negative results: finer Froude knots made the hold-out worse, and ORC's
added-resistance-in-waves term fixed TWS 6–8 without touching the beat.

The diagnosis that survived was heel. Sorting every printed jib row by heel
angle, not by wind speed or Froude number, orders the boat-speed residuals
almost monotonically: rows at 0–5° of heel came out 3–5 % *slow*, rows at
20–29° came out 6–8 % *fast*, and rows at the same Froude number but different
heel sat on opposite sides of the polar. At TWS 16 the model's heel matched the
polar's 21.5° exactly and the boat was still 5.9 % fast, which says the drag
missing at that state is a function of heel and not of speed.

The model had a heel drag term and it was assumed, not published:
`Rheel = k · heel² · Rv`. Two things were wrong with it. The exponent was a
guess. And it was anchored on *viscous* resistance, which carries a friction
coefficient of ~0.0029, so the fitted knob was really a drag coefficient
divided by 0.0029: even pushed to its calibration bound of 4.0 the whole term
could only reach a heeled drag coefficient of about 0.0016, roughly half what
the polar's plateau needs. Two rounds of calibration had read the fitted 0.92
against that bound of 4.0 and concluded "no available knob closes it". The knob
was not too small. It was anchored to the wrong quantity.

It was also being held down. Stage 1's loss weights heel at 0.02 and its own
docstring says that weight "keeps heel the weakest term". Measured, the heel
term was 62 % of the stage-1 loss: the model heels 5–13° less than the 2011
polar prints at TWS 12–20, and a 10° miss squared dwarfs a 6 % speed miss. Heel
drag slows the boat, a slower boat heels less, so the one mechanism the *gated*
speed rows needed was the one the *ungated* heel column punished hardest. With
that weight in place the fit drove `hydro.heelDragK` to zero however it was
parameterised.

Behind the weight sat a whole stage. Stage 3 refitted `hydro.crewArmMul` — the
crew's righting arm — against the heel column alone, at weight 1.0, *after*
stage 1 had frozen the hull. That was survivable while heel drag was
negligible. It stopped being survivable the moment heel cost real drag, because
the crew arm sets the heel angle and the heel angle now sets a large part of the
resistance: a righting pass run after a frozen hydro fit silently invalidates
it.

Separately, ORC's own de-powering routine has two stages and this app
implemented one. `aero/orc/depower.ts` has implemented the RED decomposition
since Epic 1, but nothing ever searched it: `shape/toOrc.ts` set reef to 0.95
only at the everything-on control stops, and `solve/optimal.ts` searched flat
alone.

## Options considered

**A. Keep `k · heel² · Rv` and raise its bound.** Lift the calibration ceiling
from 4.0 to whatever reaches a heeled drag coefficient of ~0.003.
- Pros: smallest possible diff; the shape is roughly right, since `Rv` is
  `q·S·Cf(1+k)` and `Cf` varies only ~10 % over the whole speed range.
- Cons: leaves the exponent a guess when a published one exists, and leaves the
  knob meaning "drag coefficient ÷ 0.0029", which is why two rounds misread it.
  Raising a bound without understanding why the fit wanted more is how the
  first two rounds got here.

**B. Adopt the DSYHS heeled-residuary polynomial whole.** ΔRrh(20°) as
Keuning & Sonnenberg's regression in Lwl/Bwl, Bwl/Tc and LCB, scaled by their
heel law.
- Pros: fully published, no fitted magnitude at all.
- Cons: it needs the canoe-body draft Tc and LCB, neither of which is a measured
  field on the boat file, and the published *scale factor* on those coefficients
  is genuinely unresolved — transcriptions of the same table divide them by 100,
  by 1000, or not at all. A number whose order of magnitude the sources
  contradict is not provenance, it is a coin flip with a citation attached.

**C. Adopt the published heel law, fit the magnitude.** Keuning & Sonnenberg's
ΔRrh(φ) = ΔRrh(20°) · 6.0 · φ^1.7 with φ in radians, and carry ΔRrh(20°) as one
fitted drag coefficient on q·S.
- Pros: the exponent, the constant and the radian convention are published and
  self-checking (6·(20°)^1.7 = 1.0025, so the law is normalised at 20° by
  construction, which pins all three at once). Because it is normalised there,
  the knob reads as exactly one thing: the drag coefficient the hull picks up at
  20° of heel, against a flat-plate friction coefficient of ~0.0028 that anyone
  can sanity-check.
- Cons: the Froude dependence is assumed, not published — the published version
  of it is locked inside the polynomial option B cannot use.

**D. Also replace `cos(heel)` on the keel span with a published Teff(heel).**
Both ORC's pre-2013 effective-draft chart and the DSYHS effective-draft
polynomial say the knockdown is nearer cos^1.2 to cos^2.9, steepening with
beam/draft ratio, so the model's plain cos is too weak.
- Pros: a second published correction pointing the same way.
- Cons: a second heel mechanism fitted in the same round makes neither
  attributable, and the DSYHS form needs Tc, which we do not have. The gate can
  be closed without it.

**E. Leave the heel column fitted, and tune around it.** Keep stage 3, tighten
its bounds until it stops running to a bound.
- Pros: keeps a published-ish heel angle.
- Cons: bounds tight enough to stop it are bounds that make it a constant with
  extra steps. And it is the wrong trade on principle: the heel column is tier B
  and ungated, boat speed is tier B and gated.

## Decision

**We will take option C for the heel law, add reef as the optimiser's second
stage, and stop fitting anything to the polar's heel column** — because the
piece of the Delft model that is unambiguously published is the heel
*dependence*, and the piece that is ambiguous is the one we can replace with a
single readable coefficient.

Concretely, five changes:

1. `hydro/resistance.ts` computes
   `ΔRrh = heelDragK · 6.0 · φ_rad^1.7 · ½ρV²S`. The bracketed law is
   Keuning & Sonnenberg 1998; `heelDragK` is the heeled drag coefficient at the
   law's 20° datum, fitted. This is **not** cited to ORC: ORC has published no
   closed-form heel drag since its 2013 hydro model, and its 2012 closed form is
   a different model with a hull-form-dependent exponent.

2. `solve/optimal.ts` searches reef in [0.5, 1] by golden section, **only** once
   flat has reached its ORC floor, which is ORC VPP 2023 §5.1.3's own order. The
   floor of 0.5 is ORC's RED = 1 point — headsail fully reduced, main still
   whole — because a one-design sportboat main has no reef points. A reef that
   does not beat the flat-floored score is not taken. No UI mapping: the rig
   controls have no reef channel and none is invented here.

3. Stage 1's heel weight drops from 0.02 to 0.002, which is the weight at which
   the docstring's claim — that heel is the weakest term — is actually true
   (~30 % of the stage-1 loss instead of 62 %).

4. `hydro.crewArmMul` is removed from the fit entirely and the righting stage is
   deleted; the four calibration stages become three. It holds its code default
   of 1, which is what the multiplier is *defined* to mean — the hardest crew CG
   the class hiking rule allows — and which is exactly the condition
   `validation/compare.ts` replays the polar under.

5. `solve/equilibrium.ts` lets leeway go to -2° instead of clamping it at 0.
   This is a numerical guard, not a physical claim. A deep run needs almost no
   leeway, so the root sits within a fraction of a degree of the clamp and on a
   dead run exactly on it; clamped, the residual is flat in leeway on one whole
   side of the root, the Jacobian column goes singular, and Newton stalls with
   `converged: false` — which `optimal()` then handed back as an answer. It was
   producing a band of unconverged, 5 %-too-fast states around TWA 168–170° at
   TWS 16, which distorted the TWA optimum, broke invariant 19's monotonicity
   and pulled `aero.asymCdMul` a third of the way off its true fit. It was found
   only because that invariant went red; the diff is one constant.

Scope: the hydro layer and the VPP optimiser, for every class. Until a source
appears that resolves the DSYHS scale factor, or a class arrives whose polar
publishes a heel column we have reason to trust.

## Consequences

**What gets easier.** The upwind plateau is gone. Every printed jib row in the
J/70 polar is now within 3.3 % on boat speed, held-out and fitted alike, against
5–10 % errors at TWS 16 and 20 before. The held-out TWS 14 beat went from 5.8 %
fast to 0.9 % fast and the whole TWS 8 block improved. On the Melges 24, which
shares the model and was never touched by this round's diagnosis, the gate went
from 7/10 to 8/10 and the worst gated boat-speed residual fell from 14.3 % to
7.2 %, with every VMG angle now inside tolerance.

**What gets harder.** Heel is now an output that nothing fits, and it reads low:
10.5° against the polar's 20.8° at TWS 14. That is a real disagreement and it is
now reported as one rather than absorbed into a crew-position knob. Anyone
reading the heel number should treat it as tier B and directional.

It is worth being explicit that the fifth change is the one that recovered the
downwind row. Before it, this ADR's refit had made the held-out TWS 14
asymmetric row *worse* — 5.2 % fast against 1.9 % before — because stage 2 was
fitting `aero.asymCdMul` against a loss surface with unconverged cliffs in it,
and settled at 3.14. With the solver fixed it settles at 2.38 and the row comes
back to 2.1 %.

**What is committed to.** A fitted magnitude on a published shape, and the
claim that `heelDragK` is a drag coefficient — so a value far outside
0.001–0.01 is the model reporting a missing mechanism, not a heel penalty, and
the calibration bound of 0.02 is set to make that visible.

**What risk is accepted.** The gate does not close. One row still fails, and it
fails on one number: the held-out TWS 14 asymmetric VMG row, boat speed 2.1 %
(inside the 3 % tolerance) at a VMG angle 3.3° against a 2° one. The cause is
not heel — downwind heel is ~1° and nothing here touches it. It is the known
compressed-optimum weakness, and it is not fixable with a number: the model's
downwind VMG at TWS 14 is flat to **0.11 % over 168–172°**, so 3.3° of angle is
a plateau rather than a peak in the wrong place. Sailed at the polar's own 172°
the model does 6.32 kt against 6.26, i.e. 1.0 % fast. The boat is right; the
argmax on a flat curve is not, and no re-tuning of a drag multiplier makes an
argmax on a flat curve reliable.

The largest residual anywhere is now a fitted row and a different fault: TWS 12
asymmetric, 8.6 % fast at 151.3° against a printed 162.5°. Twelve knots is
exactly where the reaching and soak humps cross, and the optimiser takes the
reaching one. It is the only row in the whole polar outside 3.4 %.

**Revisit when:** Fossati (2009) Table 2.7 or the Keuning & Sonnenberg paper
itself resolves the ΔRrh(20°) scale factor, at which point option B becomes
available and `heelDragK` can be checked against it rather than fitted; or when
the asymmetric gets a second mechanism (blanketing, tack line, sprit) and the
downwind rows stop depending on one drag multiplier.

## Related

- [0007](0007-calibration-and-validation-are-separate-with-a-held-out-gate.md) —
  the tolerances this gate uses. Unchanged.
- [0012](0012-hold-out-split-by-wind-speed-not-by-angle.md) — the fit/hold-out
  split. Unchanged; no row moved between the sets.
- [0018](0018-offwind-parachute-drag-knob-not-a-mode-switch.md) —
  `aero.asymCdMul`, the one downwind knob whose compromise this round moved.
- [0006](0006-faithful-orc-aero-layer-plus-invented-shape-layer-with-confidence-tiers.md)
  — the published-versus-invented boundary this ADR moves the heel term across.
- `PROVENANCE.md`, "Keuning & Sonnenberg 1998" — the transcription chain behind
  the heel law, and what in it could not be verified.
- `validation/report.md` — the negative results from the two previous rounds
  (residuary knots, added resistance in waves).
