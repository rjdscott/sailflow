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
- **Target draft depth versus wind speed.** `shape/toOrc.ts` scores a section's
  CLmax and CD0 penalty against the depth the breeze wants, not against the
  base setup: `shape.draftTargetPerKt` 0.025 of the base draft per knot away
  from `shape.draftTargetRefKt` 12 kt, clamped to ±`shape.draftTargetSpan`
  0.25. All three are assumed; only the direction — full in light air, flat in
  breeze — is claimed, and it comes from the two guides' published backstay
  bands, not from a measurement. Without it the penalty was a well centred on
  one wind band, so flattening paid at every wind speed and the model's own
  optimum inverted the guides (audit ux-02 H-04). `flat` still measures from
  the base setup, as ORC §5.1.3 defines it.
- **Drill medals**: gold ≤ 1 %, silver ≤ 3 %, bronze ≤ 6 % VMG loss
  (`src/lib/drills.ts`, assumed).
- **Drill medals** (schema v2, ADR 0013): decided on distance to the answer
  key in legal control steps — gold 0, silver ≤ 2, bronze ≤ 5 — with the v1
  VMG-loss bands (≤ 1 / 3 / 6 %) kept as a second gate, so a trim on the key's
  shape but measurably slow drops a band (`src/lib/drills.ts`, assumed).
  Matching or beating the key's objective is gold whatever the distance: the
  key is a local optimum reached from the drill's own start.
- **Drill validity**: a generated start must converge and lose ≥ 3 % against
  its own answer key, else the generator walks to the next seed
  (`START_LOSS_MIN_PCT`, `src/lib/drills.ts`, assumed — twice the gold loss
  gate and above the held-out upwind VMG error). Fault magnitudes in
  `data/drills/j70-templates.json` are assumed and gated by that test; each
  template's base trim is the model's own optimum at its condition.
- **Drill spacing**: SM-2 ease/interval recurrence (Woźniak 1990) with an
  assumed medal → quality map (gold 5, silver 4, bronze 3, no medal 1, minus
  one for a revealed hint) — `src/lib/spacing.ts`.
- **Dock forecast pmf**: triangular on a 1-kt grid with a 5 % floor (ADR 0009, assumed).
- **Plan-view drawing** (`src/ui/race/boat.ts`, presentation only, not in the
  solver): mast step at 0.45·LOA; boom angle ≈ 6° + (100 − mainsheet)·0.25° +
  traveller·0.08°; jib sheeting angle ≈ 7° + jibLead·0.4° + (100 − jibSheet)·0.15°.
  Sign-correct, magnitude assumed; the figcaption says so.
- **Leech-profile drawing** (`src/ui/race/geometry.ts` `leechProfile`,
  presentation only): the main's chord at the foot, ¼, ½ and ¾ heights is
  taken as 1 / 0.78 / 0.56 / 0.34 of the foot — assumed, a roughly triangular
  main — and the leech's drawn offset is that chord swung out by the boom
  angle plus the section's twist, the same construction the spreader-stripe
  reading uses. The profile stops at the top batten (the ¾ station): the
  flying-shape layer reports no head section and the drawing does not invent
  one. `battenAngleDeg` is that station's twist, unchanged.
- **Headstay-sag bar range** (`src/ui/race/SagIndicator.svelte`): 0–45 mm,
  assumed — the model's own golden corpus spans 8–42 mm across the polar and
  both rigs, so the bar is scaled to hold it. Drawing range only.

### Cockpit instruments (`src/core/solve/instruments.ts`, all tier C but `pctPolar`)

- **Main leech stall fraction.** A logistic on the *twist* deviation:
  `1 / (1 + exp(−(twistDev + 56°) / 45°))`, where `twistDev = dev / 0.25` is
  the head twist the leech would need for the sheeting model's mid-height
  angle of attack to land on its optimum, minus the twist it has. The two
  constants are calibrated, not fitted: the centre (−56°) puts the base trim
  (`baseRace()`, upwind at 10 kt) at 0.53, inside the guide's 50–70 % band,
  and the width (45°) puts mainsheet hard on at 0.80, above the band, and
  mainsheet eased to 30 % at 0.09, below it. The offset is large because the
  sheeting layer's optimum angle of attack is its *lift-maximising* one,
  which sits far tighter than the trim the guides call base — so the meter is
  anchored on the guide's base trim rather than on the model's own optimum.
  Downwind, where the boom cannot go far enough out, it still reads ~1.0.
  **What it is not:** a percentage of ribbons measured on a boat. It is tier
  C, a direction with a band drawn on it, and the whole upwind range from
  eased to pinned spans roughly 0.02 to 0.85. Superseded the phase-02
  scaling, which borrowed the 30° lift-loss e-fold and left the entire upwind
  range inside 0–0.11 with the guide's band unreachable.
- **Jib leech spreader stripe.** Athwartships offset of the leech at the
  spreader height = jib chord there × sin(clew sheeting angle + twist at ¾
  height), with the luff taken as on the centreline; the index is linear
  between the painted 18" and 20" stripes. The chord comes from the class
  girth stations (published), the two angles from the invented sheeting and
  flying-shape layers, and the straight-chord geometry is assumed. Only the
  direction is claimed — lead aft and sheet eased both open the leech
  outboard. A **3.2" offset** is added before the index is taken: the chord
  is swung about a luff taken as on the centreline while the stripes are
  painted outboard from the mast, which is neither the same point nor the
  same station. It is calibrated, not measured — the value is the one that
  puts the base trim (`baseRace()`, upwind at 10 kt) on the middle 20" stripe,
  where the North guide's base setting puts the jib leech; without it the
  model read −0.6 there and the verdict called for lead aft from the trim the
  guide calls right. The lead car then walks ±1.35 stripes over ±3 holes,
  which rounds to the 22" and 18" stripes but is not calibrated to hit them
  exactly. Race mode's own `BASE_RACE` is a harder-sheeted trim than
  `baseRace()` (jib sheet 70 % against 60 %) and reads about −0.45 there; the
  two base trims should be reconciled.
- **Helm load reference** `HELM_REF_NM` = 300 N·m, assumed: the yaw moment of
  a well-powered J/70 upwind at 12–14 kt with the crew hiking, chosen so 1.0
  reads "firm" and the cockpit's 1.2 "heavy helm" threshold trips when heel
  runs away. The target bug on the helm bar sits at 0.3, likewise assumed.
  The lever itself — `ceHeight · sin(heel)` — is geometry; what is assumed is
  that a yaw moment scaled this way reads as helm feel at all, and it is only
  diagnostic while heel is steady (North Speed Guide), which is why the heel
  gauge is beside it.
- **`pctPolar` band** ±3 percentage points, assumed: the slack in
  interpolating a table printed 2 kt apart. It is not a claim about the
  model's accuracy — `validation/report.md` records fit-row boat-speed
  residuals up to 10.8 % — and the value is tier A only inside the printed
  TWS range and TWA grid for the sail being carried, tier C outside it.
- **Verdict thresholds** (`src/ui/race/verdict.ts`, presentation only):
  stall > 0.7 reads stalled, < 0.3 upwind reads under-trimmed, stripe < 0.5
  reads hooked, |helm| > 1.2 reads heavy, and a gap under 0.02 kt reads on
  target. All assumed, all above or below the bands the guides publish.

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
