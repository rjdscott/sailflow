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
- **3D hero loft: head and foot sections** (`src/ui/three/loft.ts`,
  presentation only, not in the solver). The solver reports flying shape at the
  quarter, half and three-quarter heights only, and the two ends it does not
  report dominate the silhouette people judge (ADR 0014). Chords at both ends
  are published — Class Rules G.3/G.4.3 foot and top widths — but the shape is
  extrapolated:
  - **Foot**: the quarter section's camber, draft position and entry, and
    `FOOT_TWIST_RAD` = 0. Assumed. The foot is on the boom or between tack and
    lead, so the sheeting angle *is* its angle; the core's own per-height twist
    multipliers [0.3, 0.65, 1.0] extrapolate to −0.05 there, so this agrees
    with the solver to within a degree.
  - **Head**: `HEAD_CAMBER_FACTOR` = 0.6 of the three-quarter camber, with
    entry scaled by the same factor (the core's entry is
    `atan(2·camber/draftPos)`, near-linear in camber at these depths), the
    three-quarter draft position, and twist extrapolated linearly off the
    half-to-three-quarter ramp. All assumed. 0.6 keeps the head visibly flatter
    than the ¾ section without collapsing it to a plane; nothing published
    gives a J/70 head camber.
- **3D hero: first-frame budget** 50 ms (`FIRST_FRAME_BUDGET_MS`,
  `src/ui/three/SailHero.svelte`). Assumed, and committed in ADR 0014: over it,
  the 2D plan view keeps the hero slot. Three frames at 60 Hz is the most a
  picture may cost before it reads as a stall on the screen you drag sliders
  on. Not a measurement — no phone was profiled. `?freeze=1` exempts the view
  so the CI screenshot is deterministic under software rendering.
- **3D hero: forestay sag direction** `SAG_FORWARD_FRACTION` = 0.35
  (`src/ui/three/rig3d.ts`). Assumed. Sag is jib-load driven and bows the stay
  forward as well as to leeward; only the two directions are claimed, not the
  split. Illustrative hull stations, spar radii and scene colours in
  `src/ui/three/{hull,rig3d,SailView3D}.svelte` are drawing furniture, tagged
  `prov: assumed` at each literal, and the caption labels the hull illustrative.

### Cockpit instruments (`src/core/solve/instruments.ts`, all tier C but `pctPolar`)

- **Main leech stall fraction.** `1 − exp(−3·dev / (band + 2·stallScale))` on
  the sheeting model's over-trim deviation, zero anywhere the sail is not
  over-trimmed. The two constants are assumed: the deviation at which the
  whole leech counts as stalled is two stall e-folds past the groove band,
  and the exponent 3 puts the reading at 0.95 there. **Known ceiling:** with
  the fitted `aero.sheet.stallScaleDeg` of 30° the reachable upwind range is
  about 0 to 0.11 — mainsheet hard on at 20 kt reads 0.11 — so the North
  guide's 50–70 % band shown on the gauge is not reachable upwind and the
  reading is a "more trimmed / less trimmed" direction, not a percentage to
  hit. Downwind, where the boom cannot go far enough out, it reaches ~0.96
  and behaves as intended. Upgrade path: give the stall meter its own scale
  (the twist range across the leech) rather than borrowing the lift-loss
  e-fold, once there is evidence for one.
- **Jib leech spreader stripe.** Athwartships offset of the leech at the
  spreader height = jib chord there × sin(clew sheeting angle + twist at ¾
  height), with the luff taken as on the centreline; the index is linear
  between the painted 18" and 20" stripes. The chord comes from the class
  girth stations (published), the two angles from the invented sheeting and
  flying-shape layers, and the straight-chord geometry is assumed. Only the
  direction is claimed — lead aft and sheet eased both open the leech
  outboard. At the base trim the model reads about −0.6 (inside the 18"
  stripe), so the absolute inches are not calibrated against a boat.
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
