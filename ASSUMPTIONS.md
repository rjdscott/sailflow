# Assumptions

Free parameters and assumed values, their current numbers, and how each was
chosen. Where calibration fits a value, the fit residual and hold-out
residual are recorded here by `calibration/fit.ts`.

The rig-bend-to-sail-shape sensitivity layer (`src/core/aero/shape`) is
invented for this app: sign-correct by construction and tested for it,
magnitude unknown. Outputs that depend on it carry tier B or C (ADR 0006).

## Where the model is honestly weak (2026-08-25 fit)

- **Upwind speed plateau.** The ORC polar holds 5.79–5.95 kt from 12 to 20 kt;
  linear residuary bins 0.1 Fn apart cannot build that wall, so the model is
  ~5 % slow at 6 kt and ~6–8 % fast at 16–20 kt. Held-out TWS 14 upwind misses
  the 3 % gate by 2.8 points. Candidate fix: a finer Fn table or a wave-making
  hump term (Epic 2).
- **Asymmetric optimum angle.** ORC's downwind optimum jumps 150° → 172°
  between 12 and 16 kt at nearly constant speed; the model stays near 147°.
  A single CL multiplier (`aero.asymClMul`) cannot shape an angle error.
- **Downwind heel** prints 11.7° in the polar; the model gives 0.5–2°. No
  knob touches it; not gated.
- **Dock-setup sensitivity.** In VPP mode `optimal()` overrides the
  shape-derived `flat`, so a dock setup enters only as a small coefficient
  perturbation and the setup ranking is nearly wind-independent. Stage 4 could
  not separate the North 8–10 and 12–16 kt bands; all six rig/shape knobs sit
  on their bounds. Dock-mode regrets are therefore small and tier-B in
  practice until race controls are optimised through the shape layer.
- `hydro.heelDragK` fitted at ~2× the value `hydro/resistance.ts` assumes;
  `aero.hbiM` pinned at its 1.4 m upper bound (the fit wanted more heeling
  arm). Both are the fit compensating for missing physics, not measurements.
- **Drill medals**: gold ≤ 1 %, silver ≤ 3 %, bronze ≤ 6 % VMG loss
  (`src/lib/drills.ts`, assumed).
- **Dock forecast pmf**: triangular on a 1-kt grid with a 5 % floor (ADR 0009, assumed).
- **Plan-view drawing** (`src/ui/race/boat.ts`, presentation only, not in the
  solver): mast step at 0.45·LOA; boom angle ≈ 6° + (100 − mainsheet)·0.25° +
  traveller·0.08°; jib sheeting angle ≈ 7° + jibLead·0.4° + (100 − jibSheet)·0.15°.
  Sign-correct, magnitude assumed; the figcaption says so.

<!-- generated: do not edit below this line -->

## Assumed boat parameters

| Path | Value | Note |
|---|---|---|
| `controls.forestayMm.max` | 40 | see controls.forestayMm.min |
| `controls.forestayMm.min` | 0 | range not published in Class Rules; app convention for a workable forestay length adjustment sweep |
| `controls.forestayMm.step` | 2 | see controls.forestayMm.min |
| `controls.inhauler.max` | 100 | see controls.inhauler.min |
| `controls.inhauler.min` | 0 | discrepancy: brief lists inhauler as a race-mode control, but Class Rules F.4.2 purchase table has no 'Inhauler' entry; range and purchase are unregulated app assumptions |
| `controls.jibLead.max` | 10 | see controls.jibLead.min |
| `controls.jibLead.min` | 0 | jib lead car hole count not specified in Class Rules; app convention, typical 10-hole car track |
| `controls.jibLead.step` | 1 | see controls.jibLead.min |
| `controls.kiteHalyard.max` | 100 | see controls.kiteHalyard.min |
| `controls.kiteHalyard.min` | 0 | discrepancy: Class Rules F.4.1 lists a Gennaker Halyard minimum line diameter (6mm) but F.4.2 purchase table has no Gennaker Halyard purchase entry; range and purchase are unregulated app assumptions |
| `controls.lowerTurns.max` | 6 | see controls.lowerTurns.min |
| `controls.lowerTurns.min` | -6 | range not published in Class Rules; app convention, mirrors upperTurns |
| `controls.lowerTurns.step` | 0.5 | see controls.lowerTurns.min |
| `controls.upperTurns.max` | 6 | see controls.upperTurns.min |
| `controls.upperTurns.min` | -6 | range not published in Class Rules; app convention for a workable turns sweep either side of a dock-tuning base setting |
| `controls.upperTurns.step` | 0.5 | see controls.upperTurns.min |
| `hull.bwlM` | 1.916 | estimated as 0.85 x max beam (typical waterline/max-beam ratio for a flared-topside sportboat hull); no published bwl found |
| `hull.gmM` | 0.676 | estimated as 0.30 x beamM, a rule-of-thumb GM/beam ratio for high-initial-stability bulb-keel sportboats; not backed out from the ORC cert's RM Measured (18.5 kg.m) because the certificate's reference heel angle for that figure could not be confirmed |
| `hull.keelAreaM2` | 0.529 | estimated as keelSpanM x assumed average chord 0.45 m (typical thin high-aspect fin/bulb chord for a sportboat); no published keel area or chord found |
| `hull.keelSpanM` | 1.176 | estimated as draftM x 0.85, allowing ~15% of draft for hull depth above the keel root; no published keel span found |
| `hull.kgM` | 0.484 | estimated as 0.35 x draftM, a rule-of-thumb VCG fraction for a ballast-(bulb)-dominated fin-keel sportboat; ORC cert's VCGD/VCGM (0.034/0.024) and RM figures use a different reference baseline and were not used, since the conversion could not be verified against the ORC VPP Documentation in this pass |
| `hull.lwlM` | 6.691 | ORC cert reports IMS measurement length 'L' = 6.691 m; not an explicit LWL definition but the closest published proxy for a plumb-bow hull, so used directly rather than a fresh estimate |
| `rig.chainplateYM` | 1 | assumed 1.00 m athwartship offset, approximating a rail-mounted chainplate typical of shroud-base sportboats; not published |
| `rig.mastLenM` | 8.5 | estimated as rig.iM + 0.5 m for typical gooseneck-to-deck and masthead-fitting allowance; not published |
| `rig.spreaderLenM` | 0.55 | assumed 0.55 m, typical swept-spreader length for this boat size; not published |
| `rig.spreaderZM` | 4.4 | estimated as 0.55 x rig.iM, a typical single-spreader height fraction; not published |
| `rig.sweepDeg` | 20 | assumed 20 degrees, typical swept-spreader angle for a rig with no runners/checkstays (ORC cert confirms Runners/Checkstays: 0); not published |

## Calibrated free parameters

| Knob | Value | Stage | Fit loss |
|---|---|---|---|
| `hydro.formFactor` | 0.0296571 | 1 hydro-jib | 0.1388 |
| `hydro.rrMul.fn20` | 0.364214 | 1 hydro-jib | 0.1388 |
| `hydro.rrMul.fn30` | 0.812076 | 1 hydro-jib | 0.1388 |
| `hydro.rrMul.fn40` | 0.974563 | 1 hydro-jib | 0.1388 |
| `hydro.rrMul.fn50` | 1.63226 | 1 hydro-jib | 0.1388 |
| `hydro.rrMul.fn60` | 1.69371 | 1 hydro-jib | 0.1388 |
| `hydro.planingRelief` | 0.153826 | 1 hydro-jib | 0.1388 |
| `hydro.keelLiftSlope` | 0.751711 | 1 hydro-jib | 0.1388 |
| `hydro.heelDragK` | 1.09438 | 1 hydro-jib | 0.1388 |
| `aero.hbiM` | 1.4 | 1 hydro-jib | 0.1388 |
| `aero.asymClMul` | 1.01107 | 2 asym | 0.4739 |
| `hydro.crewArmMul` | 0.768062 | 3 righting | 0.01014 |
| `rig.EI` | 685000 | 4 rig-shape | 15.99 |
| `rig.turnsToN` | 100 | 4 rig-shape | 15.99 |
| `rig.sagK` | 25 | 4 rig-shape | 15.99 |
| `shape.bendToDraft` | 0.36 | 4 rig-shape | 15.99 |
| `shape.sagToDraft` | 0.0003 | 4 rig-shape | 15.99 |
| `shape.sheetToTwist` | 0.15 | 4 rig-shape | 15.99 |

Fit set: TWS 6/10/12/16/20 kt; held out: TWS 8/14 kt (ADR 0012 (fit/hold-out split), 0007 (tolerances)). Per-point residuals: `calibration/residuals.json`.
