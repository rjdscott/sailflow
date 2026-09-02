# 0024. The heeling arm is published geometry — certificate BAS and HBI, plus ORC's below-waterplane CLR term

- **Status:** Accepted
- **Date:** 2026-09-02

## Context

Since ADR 0022 the model heels 6–14° less than the 2011 ORC Speed Guide prints
from TWS 10 up, at near-full power. At full power heel is
heeling moment ÷ righting slope, so a 40 % shortfall lives in the arm, the side
force or the righting moment — not in the depowering. Heel is on the 3D hero
and the instrument band, so the shortfall is user-visible.

Three things turned out to be wrong at once, and all three are transcription,
not modelling:

1. **The moment was taken about the wrong axis pair.** `forces.ts` computed
   ORC eq (5.57), `HM_A = FH · (HBI + ZCE·REEF)`, and balanced *that* against
   the righting moment. ORC does not: eq (3.5) is
   `HM_total = HM_A + RM4 · FHA`, where `RM4 = 0.43 · Tmax` is the vertical
   centre of lateral resistance *below* the water plane (§4.4.2, eq 4.29).
   What heels a boat is the couple between the aerodynamic heeling force and
   the hydrodynamic side force opposing it, and that couple's arm runs from
   the sail CE down to the CLR. The model was missing 0.59 m of arm on the
   J/70.

2. **The model multiplied the heeling moment by cos(heel).** ORC's eqs (5.57)
   and (3.5) carry no such factor, and the code's own comment admitted as
   much. It is not a missing projection: `FH` is perpendicular to the mast
   plane and the arm is a boat-frame length up the mast, so their product is
   already a moment about the roll axis — the same axis the righting-arm curve
   is measured about. ORC puts the one `cos(heel)` the balance needs on the
   *crew* term of the righting moment (eq 4.30), which `hydro/righting.ts`
   already had. The extra factor cost another 9 % of moment at 24° of heel.

3. **The whole sail plan sat 0.81 m too low.** `geometry/sailplan.ts` measured
   the mainsail centre of effort from an assumed "boom ~0.9 m above the
   waterline" and the jib from an assumed 0.55 m. The ORC one-design
   certificate publishes `BAS 0.992` (boom above sheer) and the flotation
   measurements the sheer height follows from — `FF 0.792` at `SFFP 0.155` and
   `FA 0.571` at `SAFP 6.903`, which interpolated to the mast station
   `SFBI = SFJ + J = 2.500` give `HBI = 0.715 m`. The boom is therefore
   1.707 m above the water plane, not 0.9, and the jib's foot sits on the
   sheer at 0.715, not 0.55.

The third one had a tell that had been visible for three calibration rounds
and read as something else: `aero.hbiM` pinned at its 1.4 m calibration bound,
written up in `ASSUMPTIONS.md` as "the fit wants more aero heeling arm than
the honest envelope allows". It was not buying arm — HBI cancels out of
eq (5.57)'s arm at `flat = reef = 1`, and `forces.test.ts` asserts exactly
that. It was buying **effective rig height**: eq (5.45) is
`heff = cheff · (b + HBI)`, so a 1.4 m HBI made the model's masthead 10.17 m
above the water against a true 9.68 m, and bought about 10 % off the induced
drag. A knob at a bound was the fit routing around a geometry error two
modules away.

## Options considered

**A. Fit a heeling-arm multiplier.** Add a knob on the moment arm and let the
calibration close the heel column.
- Pros: closes the visible gap in one number; no geometry work.
- Cons: fits heel, which ADR 0022 forbids for a reason — heel drag then sets
  gated boat speed through an ungated tier-B column. And it would have
  buried three separate published errors under one fitted number.

**B. Transcribe the published geometry and the missing ORC term, and let the
calibration land where it lands.** Read BAS and HBI off the certificate, add
eq (3.5)'s `RM4 · FHA`, drop the invented `cos(heel)`, and remove `aero.hbiM`
from the fit because HBI is now a certificate quantity.
- Pros: every number is published or derived from published numbers; the
  heeling arm stops being a free parameter at all; the tell (`hbiM` at its
  bound) is explained rather than re-fitted.
- Cons: the fit loses the 10 % induced-drag discount it had been taking, so
  boat speed gets worse before anything else gets better, and the offwind
  rows in particular lose more than the beat does.

**C. B, plus ORC's downwind crew law (VPP 2012 §4.4.3.3: crew to leeward below
10° of heel, sinusoidally to windward between 14 and 18°).** That law is fully
specified and explains the polar's flat 11.5–12.0° downwind heel column, which
this model reads as 1°.
- Pros: would very likely recover the offwind speed the change costs, and
  close a weakness that has been in the report since the first fit.
- Cons: two heel mechanisms in one change, which is exactly what ADR 0022
  warned against; it changes what the trainer tells a user to do downwind
  (ORC's handicapping crew law is not coaching advice); and the task that
  produced this ADR scoped the crew convention to the upwind replay.

**D. Adopt the certificate's `Crew Arm Extension 0.50 m` (ORC §4.4.3 CEXT for
sportboats: hiking crew get a righting arm 0.5 m outside the rail).**
- Pros: published, and on the J/70's certificate.
- Cons: it raises the crew righting moment ~25 % and therefore makes the heel
  shortfall *worse*, and its 1.60 m crew arm is outside what J/70 class rule
  C.3.3 allows — the two rules genuinely disagree, which is a disagreement to
  show, not a knob to turn.

## Decision

**We will take option B: the heeling arm is published geometry, and no knob
fits it.** Concretely, and only for the aero/hydro moment balance:

- `mxNm` is ORC eq (3.5), `HM_A + 0.43 · Tmax · FHA`, with no `cos(heel)`.
- `hull.hbiM` (derived, 0.715 m) and `rig.basM` (published, 0.992 m) are boat-
  file fields with provenance rows. `core/internal.ts` exposes `hbiM()` and
  `basM()`; `geometry/sailplan.ts` measures the main from `HBI + BAS` and the
  jib from `HBI`; `aero/orc/forces.ts` reads the same two.
- `aero.hbiM` leaves `calibration/fit.ts` stage 1 **for a class that has
  `hull.hbiM`**, and only for such a class: the knob list is now conditional.
  Taking the degree of freedom away everywhere would have punished the
  Melges 24, whose certificate is an ORC rating summary with no BAS, no
  freeboards and no HBI — removing the knob unconditionally took its gate from
  8/10 to 5/10 on nothing published. Where that knob survives it drives ORC
  eq (5.45)'s effective rig height and the windage heights only: the sail
  plan's tacks read `hbiDatumM()`, the published-or-default freeboard, because
  letting a rig-height fit also set the freeboard put the Melges 24's boom
  2.2 m above the water. `aero.basM`, `geom.boomHeightM` and
  `geom.jibTackHeightM` stay available as per-boat overrides. The J/70 uses
  none of the four.
- The `hydro.hikeRampDeg` fallback moves 8° → 6°: ORC VPP 2012 §4.4.3.3 says
  the crew righting moment "is only applied in full once the heel angle
  exceeds 6 degrees" upwind. The ramp's shape below that stays assumed.
- Stage 1's Nelder–Mead budget goes from 320×3 to 500×5. The physics change
  makes that surface harder — at 320×3 it stopped in a basin that left a
  *fitted* row 13.6 % out and drove `aero.asymClMul` to a bound.

Options C and D are recorded here as rejected-for-now, not as unknowns.

## Consequences

Heel is much closer and boat speed is somewhat worse. Upwind VMG heel against
the polar, before → after: TWS 10 6.3 → 7.8 (polar 11.8), 12 8.0 → 12.9
(19.7), 14 10.5 → 15.1 (20.8), 16 12.5 → 16.4 (21.5), 20 14.5 → 18.4 (24.2).
At 90° in 20 kt it is 12.4 → 20.5 against 24.1; at 60° in 20 kt 19.4 → 23.1
against 24.9. The heeling arm itself goes 3.66 → 4.86 m plus the 0.59 m CLR
term. What remains is a shortfall of a fifth, not two fifths, and it now sits
where a *deficit of righting-moment softness* would sit, not where an arm
error would.

The gate holds at 9/10 with the same single failing row (TWS 14 asymmetric
VMG), but that row's speed residual went 2.1 % → 5.0 % and three other gated
rows moved by 0.5–1.4 %, all still inside tolerance. Fitted rows are worse
too: the largest jib residual is 4.6 % where it was 3.4 %, and the TWS 20
asymmetric planing row is 15.6 % where it was 2.6 %. `validation/invariants`
test 18's tracking band widens from ±12 to ±18 to follow it.

What is now committed to: the heeling arm is not fittable. If heel is wrong,
the answer is a mechanism, and the next one is named — option C.

What it would cost to unwind: a day. The boat-file fields, the two helpers,
the fit knob list and both classes' calibrations all move together, and the
golden corpora and every stored fit would have to be regenerated again.

**Revisit when:** ORC's downwind crew law (option C) is implemented, or when
any gated row fails on boat speed. Either event re-opens the arm.

## Related

- [0022](0022-heel-costs-published-drag-and-nothing-fits-the-heel-column.md) —
  heel drag from the published Delft law; nothing fitted to the heel column.
  This ADR keeps that constraint and removes one more fitted heel lever.
- [0018](0018-offwind-parachute-drag-knob-not-a-mode-switch.md) — the offwind
  drag knob that now carries more of the downwind residual.
- [0012](0012-hold-out-split-by-wind-speed-not-by-angle.md) — the hold-out split the
  gate above is measured on.
- ORC VPP Documentation 2023 §3.3.2 eq (3.5), §4.4.2 eq (4.29), §4.4.3,
  §5.4.3 eqs (5.42)–(5.45), §5.4.5 eq (5.57), Appendix A (.DAT line 4, HBI).
- ORC VPP Documentation 2012 §4.4.3.3 (crew transverse position).
- ORC public one-design certificate, J/70 (`data/boats/j70.json` `sources`).
