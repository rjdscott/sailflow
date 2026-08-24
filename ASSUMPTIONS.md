# Assumptions

Free parameters and assumed values, their current numbers, and how each was
chosen. Where calibration fits a value, the fit residual and hold-out
residual are recorded here by `calibration/fit.ts`.

The rig-bend-to-sail-shape sensitivity layer (`src/core/aero/shape`) is
invented for this app: sign-correct by construction and tested for it,
magnitude unknown. Outputs that depend on it carry tier B or C (ADR 0006).

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
| `hydro.rrMul.fn20` | 1.40204 | 1 hydro-upwind | 0.03328 |
| `hydro.rrMul.fn30` | 0.983551 | 1 hydro-upwind | 0.03328 |
| `hydro.rrMul.fn40` | 0.912722 | 1 hydro-upwind | 0.03328 |
| `hydro.keelLiftSlope` | 0.653849 | 1 hydro-upwind | 0.03328 |
| `hydro.heelDragK` | 3.72397 | 1 hydro-upwind | 0.03328 |
| `aero.hbiM` | 2.8869 | 1 hydro-upwind | 0.03328 |
| `hydro.rrMul.fn50` | 1.42742 | 2 hydro-downwind | 0.2635 |
| `hydro.rrMul.fn60` | 0.970451 | 2 hydro-downwind | 0.2635 |
| `hydro.planingRelief` | 0.0503042 | 2 hydro-downwind | 0.2635 |
| `hydro.crewArmMul` | 0.928272 | 3 righting | 0.02189 |
| `rig.EI` | 1500000 | 4 rig-shape | 12.00 |
| `rig.turnsToN` | 100 | 4 rig-shape | 12.00 |
| `rig.sagK` | 15 | 4 rig-shape | 12.00 |
| `shape.bendToDraft` | 1.38069 | 4 rig-shape | 12.00 |
| `shape.sagToDraft` | 0.0001 | 4 rig-shape | 12.00 |
| `shape.sheetToTwist` | 0.6 | 4 rig-shape | 12.00 |

Fit set: TWS 6/10/12/16/20 kt; held out: TWS 8/14 kt (ADR 0007). Per-point residuals: `calibration/residuals.json`.
