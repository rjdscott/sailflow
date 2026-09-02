# Assumptions

Free parameters and assumed values, their current numbers, and how each was
chosen. Where calibration fits a value, the fit residual and hold-out
residual are recorded here by `calibration/fit.ts`.

What is gated: `scripts/prov_check.py` requires a `prov:` tag beside every
numeric literal in `src/core`, and `scripts/provenance.mjs --check` regenerates
the tables below the generated marker from `data/boats/j70.json`. The
hand-written bullets in this file and the `prov:` tags in `src/ui` are
honour-code — audit docs-consistency-01 found several drifted (H-04, H-05,
M-26–M-28) and fixed them; widening the checker is on its punchlist (H-14).

The rig-bend-to-sail-shape layer (`src/core/shape`, applied to the ORC baseline
through `src/core/aero/shape`) is invented for this app: sign-correct by construction and tested for it,
magnitude unknown. Outputs that depend on it carry tier B or C (ADR 0006).

## Where the model is honestly weak (2026-09-02 fit, ADR 0022)

- **The upwind speed plateau is closed, and how it closed is worth reading.**
  It was ~6 % fast from 14 to 20 kt for two rounds and was written up here as a
  model limit that "nothing available closes". That was wrong in a specific,
  instructive way (ADR 0022). The missing drag *was* heel drag, and the reason
  the fit would not use it was not that the mechanism was absent but that
  `heelResistance` was anchored on viscous resistance, burying a factor
  Cf(1+k) ≈ 0.0029 inside `hydro.heelDragK` — so a knob reading 0.919 against
  a bound of 4.0 looked like a lever the fit had declined, when it was really
  a lever that topped out at about half the needed penalty. Compounding it,
  the stage-1 heel weight of 0.02 was measured at 62 % of the loss rather than
  the "weakest term" its own docstring claimed, and heel drag makes the heel
  column worse, so the fit was paid to keep it at zero. The lesson: a knob
  sitting well inside its bound is only evidence of "no headroom" if you have
  checked what else in the loss is holding it there. Every printed jib row is
  now within 3.4 % on boat speed, held-out and fitted alike.
- **The offwind sail's deep-angle drag is fitted, not measured.**
  `aero.asymCdMul` multiplies ORC Table 5.7's CD0 above AWA 115°, ramped to
  full at 150° (ADR 0018). It exists because the only earlier offwind knob
  multiplied CLmax, which ORC puts at 0.100 by AWA 150 — no authority over a
  soak at all, so the fit had nothing to turn and the model made 264 N of
  drive at TWS 14 / TWA 172° where 351 N is needed. The fitted **2.377** puts
  the rated-area CD at AWA 130–150 inside the published wind-tunnel band of
  0.83–1.39, once the historical 0.72 asymmetric efficiency factor is undone —
  inside the band, but the band is wide and the reference-area reconciliation
  is an inference. It is standing in for a mechanism the model does not
  contain: ORC gives the spinnaker `bk = 1` at every angle, so the main's
  shadow on the kite is absent and the sprit and the tack line act on nothing.
- **The worst residual anywhere is now a hump switch, not a speed error.** The
  fitted TWS 12 asymmetric row reads 8.6 % fast at 151.3° against a printed
  162.5°: the model's downwind VMG is bimodal (below) and 12 kt is where the
  reaching and soak humps cross, so the optimiser takes the reaching one. It is
  the one row in the whole polar outside 3.4 %.
- **The downwind optimum is compressed, and it is no longer a gate failure.**
  Held-out TWS 14 downwind sits 3.3° high of the polar's printed 172.0°, which
  failed ADR 0007's 2° tolerance until ADR 0023 replaced that criterion with the
  VMG the angle actually costs. It costs 0.11 %: the model's downwind VMG at
  TWS 14 is flat to **0.11 % over 168–172°**, and sailed at the polar's own 172°
  the model does 6.32 kt against 6.26, i.e. **1.0 % fast** — the boat is right,
  the argmax on a flat curve is not. The compression itself is unchanged and
  still tier C: the polar's optimum runs 141.9° → 174.0° over TWS 6–16, the
  model's is stuck in 168–169° from 14 kt up. It needs a second mechanism, not a
  better number. (Before ADR 0018 the model stayed near 147° at every wind speed
  and missed by 25.5°.)
- **Downwind VMG is bimodal.** A reaching hump near 145°, a soak hump near
  168°, a trough between, and the two cross between TWS 10 and 12. `optimal()`
  scans a 6° grid before it golden-section refines, which usually picks the
  global hump rather than whichever one the bracket happened to contain — but
  not at the crossing itself: the fitted TWS 12 row lands on the reaching hump
  and reads 8.6 % fast;
  calibration stage 2 scans a 5 × 8 grid before its simplex for the same
  reason. Near the crossing the dock-setup ranking is genuinely jumpy — about
  0.19 s/mile, a tenth of the tie band the UI already refuses to resolve
  inside, and invariant 10 carries that slack with the reason written down.
- **Downwind heel** prints 11.7° in the polar; the model gives 0.8–1.1°. No
  knob touches it; not gated. Deliberately not chased: that column is constant
  at 11.7–12.0° across TWS 6 to 16, which is not the signature of a solved
  heel.
- **Dock-setup sensitivity.** In VPP mode `optimal()` overrides the
  shape-derived `flat`, so a dock setup enters only as a small coefficient
  perturbation and the setup ranking is nearly wind-independent. Stage 3
  (the rig/shape stage; it was stage 4 until ADR 0022 deleted the righting
  pass) could not separate the North 8–10 and 12–16 kt bands; five of the six
  rig/shape knobs sit on their bounds. Dock-mode regrets are therefore small, and the score is
  **tier B, by design** (decided 2026-08-26, audit docs-consistency-01 M-06):
  the regret sums an upwind leg the model fits and a downwind leg it does
  not, so it is capped at B in `dock.ts` however good the upwind half is.
  Above 20 kt it is tier C, as `tierFor` already says.
- **`hydro.heelDragK` is a drag coefficient now, and reads as one.** Since
  ADR 0022 the heel increment is
  `heelDragK · 6.0 · φ_rad^1.7 · ½ρV²S`, where the bracketed law is Keuning &
  Sonnenberg 1998 and is normalised at 20° of heel by construction. So the
  fitted **0.00281** means "the hull picks up a drag coefficient of 0.0028 at
  20° of heel", against a flat-plate friction coefficient of about the same
  size — i.e. heeling to 20° roughly doubles the hull's skin-friction-scale
  drag. That is a claim a reader can weigh. The *Froude* dependence is still
  assumed: the published ΔRrh(20°) is a DSYHS polynomial needing the
  canoe-body draft Tc and LCB, neither measured here, and its published scale
  factor is contradicted across transcriptions by a factor of 1000
  (PROVENANCE.md). The calibration bound of 0.02 is set so that a fit reaching
  it is visibly reporting a missing mechanism rather than a heel penalty.
- **`hydro.crewArmMul` is no longer fitted at all** (ADR 0022). It holds its
  code default of 1, which is what the multiplier is defined to mean: the
  hardest crew CG the class hiking rule allows, which is the condition the
  polar is replayed under. Its only evidence was the polar's heel column, and
  once heel cost real drag a knob fitted on that ungated tier-B column was
  setting gated boat speed. Fitted freely it ran to a bound both ways — 0.20
  and 0.60, values that put a hiking crew inboard of a sitting one.
- **Reef is searched and never engages, which is itself the finding.**
  `optimal()` now runs ORC's second de-powering stage (§5.1.3: reef only once
  flat has floored), golden-sectioned over reef ∈ [0.5, 1] — 0.5 being ORC's
  RED = 1 point, headsail fully reduced with the main still whole, because a
  one-design sportboat main has no reef points. Across all 182 rows of the
  J/70 polar it is never taken: the beat reaches the ORC flat floor only on the
  ungated dead-run rows, and there reefing loses. `shape.reefAtMaxDepower`
  (0.95, assumed) still supplies reef in *race* mode at the everything-on
  control stops; the VPP path overrides it. No rig control maps to reef and
  none was invented (ADR 0022).
- `aero.hbiM` is still pinned at its 1.4 m upper bound: the fit wants more
  aero heeling arm than the honest envelope allows. That is the fit
  compensating for missing physics, not a measurement, and it is the same
  direction as the heel deficit below.
- **Heel is now an output nothing fits.** The model reads 10.5° where the 2011
  polar prints 20.8° at TWS 14, and 6–14° low across TWS 10–20. That is
  reported as a disagreement rather than absorbed into a knob. Two published
  sources — ORC's pre-2013 effective-draft chart and the DSYHS effective-draft
  polynomial — agree that `hydro/keel.ts`'s plain `cos(heel)` on the keel span
  is too weak, nearer cos^1.2 to cos^2.9 and steepening with beam/draft ratio.
  Adopting that is the next candidate mechanism; it was left out of ADR 0022
  so that one heel mechanism at a time stays attributable.
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
- **The shape datum is per sail set** (`shape/base.ts` `baseRaceDown()`,
  assumed). The deltas in `shape/toOrc.ts` claim to be "relative to the
  guide's base setup", and under the kite that setup is not a beat's
  mainsheet: the downwind reference is `baseRace()` with the mainsheet at
  `baseRaceDown.mainsheet` (15 %, boom ≈ 67°, out past the corner of the
  boat). Only the mainsheet differs; every other control keeps the upwind
  base, because no other one has a published downwind setting to move it to.
  Measured against the upwind datum instead, the app's own downwind default
  read ≈ 2.2° of invented twist deviation — `shapeInfluence` 0.135 against a
  `SHAPE_DEMOTE_THRESHOLD` of 0.08 — so boat speed and `pctPolar` were demoted
  to tier C on a screen the sailor had not touched. The demote rule (ADR 0006)
  was right; its reference was wrong downwind. `solve/optimal.ts` seeds its
  downwind rows from the same datum so a VPP row is not scored as one whole
  sheet ease of deviation. This is a datum, not a claim about speed: the
  mainsheet is still `notSolved` under the kite (`solve/optimalTrim.ts`), and
  a main genuinely pinned near the centreline on a run still demotes.
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
- **Dock forecast pmf**: triangular on a 1-kt grid with a floor of 5 % of the
  peak weight before normalisation (≈1 % probability after it, so the range
  ends count but lightly; `src/core/solve/dock.ts`, ADR 0009, assumed).
  Decided 2026-08-26 (audit docs-consistency-01 M-05): kept as coded — the
  floor is there so the ends never vanish, not so they carry 5 % of the
  weight.
- **Plan-view drawing** (`src/ui/race/boat.ts`, presentation only, not in the
  solver). The mast step is *not* assumed any more: it is `rig.jM / hull.loaM`
  = 0.339·LOA, the boat file's own foretriangle base, which is the same datum
  `src/ui/three/conventions.ts` `STEM_X` gives the 3D hero. It was an assumed
  0.45·LOA until 2026-09-02, 0.77 m aft of the boat's, and audit
  `kite-3d-01` H-11 found every deck feature and the whole gennaker
  projection hanging off the error. Still assumed around it: the trunk and
  cockpit outlines (hand-drawn, rescaled about the end that does not touch the
  spar so the trunk still ends at the mast and the well still ends at the
  transom), and the chainplate station, `(jM + chainplateYM·tan sweepDeg)/LOA`
  = 0.391·LOA — derived from the boat file, but the swept-shroud reduction
  behind it is the assumption. Also assumed: boom angle = clamp(6° + 0.0085·(100 − mainsheet)²
  − traveller·0.08°, 2°, 90°) — quadratic so 70 % sheet is ~12° and 0 % reaches
  90°, and the traveller *subtracts* (up to windward closes the boom); jib
  sheeting angle = clamp(4° + jibLead·0.35° + 0.0045·(100 − jibSheet)², 2°, 90°).
  The same two formulas live in `src/core/shape/sheeting.ts` and are pinned
  equal by test. Sign-correct, magnitude assumed; the figcaption says so.
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
- **3D hero: first-frame budget** 800 ms (`FIRST_FRAME_BUDGET_MS`,
  `src/ui/three/SailHero.svelte`). Assumed but measurement-anchored, per
  ADR 0014's 2026-08-25 amendment: the work of mount plus the first render
  (excluding any wait for a rendering step), over it the 2D plan view keeps
  the hero slot. Measured 60–137 ms unthrottled to 605–609 ms at 20× CPU
  under SwiftShader, and 315 ms cold / 52 ms warm on an RTX 4070 Ti. The
  Decision's original 50 ms (three frames at 60 Hz) timed a warm second
  render and never tripped (ux-03 H-12). `?freeze=1` exempts the view so
  the CI screenshot is deterministic under software rendering.
- **3D hero: forestay sag direction** `SAG_FORWARD_FRACTION` = 0.35
  (`src/ui/three/rig3d.ts`). Assumed. Sag is jib-load driven and bows the stay
  forward as well as to leeward; only the two directions are claimed, not the
  split. Illustrative hull stations, spar radii and scene colours in
  `src/ui/three/{hull.ts,rig3d.ts,SailView3D.svelte}` are drawing furniture, tagged
  `prov: assumed` at each literal, and the caption labels the hull illustrative.
- **3D hero: gennaker luff bow direction** `LUFF_FORWARD_FRACTION` = 1.1
  (`src/ui/three/kite.ts`). Assumed. How far the free luff bows forward, as a
  fraction of how far it bows athwartships. Far higher than the forestay's
  0.35 above because a forestay is held at both ends and a luff flown off a
  sprit is not; only the two directions are claimed, not the split. It was
  itself called `SAG_FORWARD_FRACTION` until 2026-08-26 — two exported
  constants, one name, two values, one row between them.
  Raised from 0.6 on 2026-08-28: the split is what decides whether the sail's
  *body* sits to leeward, because the bow's magnitude is fixed by the cloth
  surplus (2.4–2.5 m). At 0.6 the mid-luff went 2.1 m to windward at running
  angles — past the windward rail — and dragged the whole sail onto the
  centreline. Measured on the drawn loft at AWA 150°, the half-height
  section's centroid was 0.87 m to leeward of the mast against the mainsail's
  1.04 m: the kite's body was *inboard of the main*, and from astern it sat
  behind it with only its edges showing. At 1.1 that centroid is 1.26 m. The
  luff still crosses to windward at deep angles — that direction is published
  (`luffLateral`) and untouched — by 1.5 m instead of 2.1. The same change
  takes the tight-reach half width from 2.86 m to 4.16 m against a published
  5.560, which is most of the reaching narrowness recorded below.
- **Gennaker flying shape** (`src/core/shape/flying.ts` `asymShape`, tier C).
  Camber, draft position and twist by height are **derived** from Deparday's
  full-scale J/80 photogrammetry at AWA 124°, a running angle (`F1` Table 3.1;
  research `docs/research/2026-08-25-spinnaker` doc 02 §2, doc 04 §3). Derived
  and not published: the J/80 is the J/70's sprit-tacked sister and the shape
  parameters are dimensionless, but **the transfer is the inference**. Camber
  `[0.30, 0.24, 0.19]` of chord at the quarter, half and three-quarter heights
  (was 0.17 × `[1.0, 1.0, 0.85]`, ~40 % too flat and flat-then-taper where the
  measured sail is fullest low); draft position `[0.46, 0.48, 0.58]` (was 0.45
  at every height — right low down, wrong up high); twist base 26° at the
  three-quarter height (was 12°, the single biggest error: 12° suits a tight
  reach and the kite is used at 26–28°). `DRAFT_MAX` raised 0.25 → 0.32,
  derived from the same table's 15–32 % measured band; the upwind sails are
  nowhere near it. The per-height twist multipliers `[0.5, 0.8, 1.0]` stay
  assumed — doc 02 §2 says they approximate the measured ramp reasonably.
  **This moved the solver.** Doc 04 §3 assumed the flying shape does not reach
  the numbers; it does, through `shape/toOrc.ts`, which measures mean draft
  against the same shape at the base state, so changing the asym constants
  shifts the denominator of the draft deviation and with it `flat` and the
  coefficient deltas. The movement is confined to downwind rows — no jib or
  upwind golden case changed at all, held-out rows moved ≤ 0.12 % in boat speed
  against a 3 % gate, the worst fit-row move is 0.58 % at TWS 20, and the ADR
  0007 gate verdict in `validation/report.md` is unchanged (21/25, same failing
  rows, same worst residuals). Nothing was tuned to keep it that way. Still not
  modelled: the shape is constant when camber, draft and twist are all strongly
  AWA-dependent (`F2`: camber 17 → 37 %, draft 34 → 45 % over AWA 60 → 120°).
  That is an upgrade `FlyingShapeFn` cannot express today, and it is *not* what
  ADR 0017 refused — kite shape versus *sheet* is unmeasured and stays out.
- **Gennaker geometry from the downwind controls** (`src/ui/three/kite.ts`,
  presentation only, not in the solver; ADR 0017). The four downwind controls
  move the drawn sail and nothing else, and both pictures say so. Research
  `docs/research/2026-08-25-spinnaker` took most of this block off `assumed`;
  the tags are per constant and `kite.test.ts` holds every claim.
  - **Chords**: the ORC spinnaker girth parabola through (0, foot 5.700 m),
    (½, half width 5.560 m), (1, 0) — the same distribution
    `core/geometry/sailplan.ts` integrates for the rated area — scaled by
    `FLYING_CHORD_FRACTION` = 0.85. **Assumed.** The measured chord/curve
    ratio per stripe runs 0.75–1.00 (`F1` Fig 3.2), so 0.85 is the middle of a
    published band but is not itself measured, and it is physically a
    consequence of camber rather than a constant beside it. Only "shorter,
    never longer" is claimed; the head chord is zero, the parabola's own answer.
    Note what this block does *not* do: it feeds `sectionStack`, whose chord
    field `kiteGeometry.sections` then discards, because each drawn section
    spans from the bowed luff to the drawn leech. The girth parabola sets the
    solver's rated area; the leech sets the silhouette (see Leech bulge).
  - **Tack**: on the bowsprit at `sprit`% of `bowspritOuterMm` (1.495 m,
    published, Class Rules C.9.4), `TACK_MIN_M` = 0.05 m above it strapped
    down, rising by `TACK_TRAVEL_M` = 0.3 m eased — **inside the J/70 band**.
    The J/70-specific figures span 0–12 in (0–0.30 m) across four North and
    Doyle sources and disagree among themselves; the sportboat literature
    reaches 18 in, but this is a J/70. Doc 04 §2.4's narrowing is applied
    (0.6 m → 0.3 m); showing the source spread as a band in the panel rather
    than one number is the half of that recommendation still outstanding.
  - **Head**: masthead at `kiteHalyard` = 100, dropping `HALYARD_DROP_M` =
    1.2 m at 0. **Assumed, and the sources contradict it**: "ease the halyard
    6–12 inches" could not be sourced to any sailmaker publication, and North
    and Westaway both say the halyard should always be fully hoisted. The
    honest default is 0 with a documented penalty of *instability*, not a shape
    gain (doc 04 §2.5); the control is unchanged and the conflict recorded.
  - **Luff sag magnitude**: the drawn luff carries the sail's own luff length
    (10.800 m, published), so the surplus over the tack-to-head distance bows
    it; magnitude inverts `L ≈ c(1 + 8/3·(d/c)²)`. **Derived, and
    corroborated** — within **3 %** of the exact circular-arc sagitta at every
    control state (doc 02 §3.1). `SAG_MAX_FRACTION` = 0.3 of the luff (3.24 m)
    is still assumed and does no work: it is looser than the parabola bow at
    every control state (2.46 m at the default trim, 3.00 m at the slackest),
    so it never binds. Doc 04 §2.3 proposes the circular-arc bound instead,
    which is derived rather than assumed; not done.
  - **Leech bulge** (`leechBulgeProfile`, `chordForArc`): the leech stands
    out from the straight head→clew line by `LEECH_BULGE_MIN_M` = 0.7 m
    trimmed, plus `LEECH_BULGE_TRAVEL_M` = 1.1 m at full ease, on
    `sin(π·t^1.6)` (peak ~65 % of the leech), in the direction
    `chordDir(sheetRad + twist)` — see **Leech twist** below. **Assumed in
    amount, published in direction.** A straight leech into the masthead made every upper section
    hook inboard, so the top read closed and the sheet could not open it. The
    cloth length stays the published 8.8 m: the straight head→clew chord is
    solved numerically from the bulged arc (`chordForArc`).
    - *Direction.* Was a fixed vector 66° off the centreline. Near the head
      the luff and the leech both converge on the masthead, so that vector
      *was* the head's chord angle — it pinned the top of the sail whatever
      the sheet did, and is half of why the drawn twist ran backwards. It is
      now `chordDir(sheetRad + twist)`, which is how a published twist range
      reaches a drawing whose section angles are otherwise emergent.
    - *Amount and peak height.* A fit, not a measurement — no measured leech
      profile exists for any asymmetric, and doc 02 §6 constrains the leech's
      *length* and nothing else. These are the values at which the drawn sail
      measures within ±8 % of the published 45.64 m² on ORC's own formula
      across the whole sheet band at the angles the kite is used at, with a
      half width of 5.14–6.01 m against the class's 5.560. The travel is
      fitted to the clew as well as to the shoulders: the bulge shortens the
      head→clew chord and so lifts the clew, and 1.1 m of travel lifts it
      1.42 m against Deparday's measured 1.4 m (`F1`).
    - *Why it matters* (plan `2026-08-28-downwind-fidelity` phase 02, from
      the owner's 0.5.0 report "the spinnaker doesn't look the right shape"):
      every section of this loft spans from the bowed luff to `leechAt`, so
      the leech **is** the silhouette. At 0.4 m/+0.7 m the drawn half width
      was 4.79–5.15 m against a published 5.560 (7–14 % narrow, at exactly
      the height a spinnaker carries its shoulders), and the whole sail
      measured 39.9–42.4 m² on ORC's formula against 45.64. It read as a big
      headsail because at those dimensions it was one.
  - **Foot skirt** (`FOOT_SKIRT_M` = 0.35 m over `FOOT_SKIRT_SPAN` = 0.15 of
    the height, drawn by `loft.ts`'s `Section.dropM`): the foot hangs below
    the straight tack→clew line, blended away by 15 % of the height with zero
    slope at both ends. **Derived** — photo survey 2026-09-02 (audit
    `kite-3d-01`, `05-photo-survey.md`), n = 13: the foot sags 0.25–0.40 m
    below the tack–clew chord in 10 of the 13, the deepest 0.7 m, and never
    lifts above it; 0.35 m is the mid-band. Was 0.55 m over 0.3 of the height,
    **assumed** at ~10 % of the foot because nothing published gives a J/70
    foot round — the class rules cap the *straight* foot at 5 700 mm and say
    nothing about the cloth in it. The survey replaces that assumption with a
    measured band; 0.55 m sat above its 90th percentile. Only the sign is
    claimed as a hard invariant: below the tack–clew line, never above, with
    both corners still pinned — so no published dimension moves. (That last
    clause was false until the C-02 fix below, and is true again now: the
    drawn foot row ends on the clew itself.) A main's foot is on a boom and a
    jib's on the deck; a gennaker's is a free edge with nothing under it, and
    drawn as a straight line to the sprit it is the clearest single tell that
    the picture is of a headsail.
  - **Skirt low point** (`loft.ts:SKIRT_LOW_POINT_EXPONENT` = 0.63): the sag
    runs as `sin(π·x^k)` along the chord, which peaks at x = ½^(1/k) — a
    third of the chord aft of the tack rather than at mid-foot. **Derived** —
    the same photo survey (n = 13): the foot is lowest about a third of the
    way aft from the tack. Zero at both ends either way, so it moves no
    corner. Only sails that set `dropM` are shaped by it; the main and the jib
    are untouched.
  - **Loft rise term** (`loft.ts:Section.riseM`, set by `kite.ts:sections`):
    each section is lofted from its luff knot to its *leech* knot and carries
    the height difference between them, so the drawn surface reaches the clew
    the published leech and foot already pin (`clewOnCircle`). **Derived**, no
    new number — it is bookkeeping, not a fit. Until 2026-09-02 the loft kept
    only the horizontal part of each section's chord vector and ended every
    row in its luff point's horizontal plane, so the constructed clew rose
    0.66 → 2.15 m above the sheer across the sheet band while the drawn corner
    stayed at tack height and moved 0.000 m, and the mesh hung 0.35–0.50 m
    below the sheer (audit `kite-3d-01` C-02). The main and the jib set no
    `riseM` and are drawn exactly as before. What it cost, recorded rather
    than papered over: the drawn foot-to-head twist at ¾ height narrowed from
    2.3°→8.0° to 1.7°→4.4° across the sheet band (against `F1`'s measured
    4°→26°, already an open item), the drawn ORC area moved from 0.903–1.001
    of rated to 0.898–1.003, and the half-height centroid from 1.24 m to
    1.17 m to leeward (against the main's 1.04).
  - **Open question, not papered over**: the app's tack and head give the J/70
    a **16.4 % luff excess** over the tack-to-head distance against the
    **8.9 % measured** on the J/80. At the J/80's ratio the tack-to-head
    distance would be 9.92 m, 0.64 m more than drawn. Either a class-maximum
    kite really is that much rounder-luffed on a short rig, or the drawn head
    or tack is misplaced. Resolvable by measuring a photograph (doc 04 §2.3).
  - **Plan-view projection** (`src/ui/race/PlanView.svelte`): the plan's own
    scale on both axes, athwartships and fore-and-aft, about the mast. Nothing
    assumed in the mapping — with the mast stepped at the rig's own J it is
    the identity the two heroes share, and the kite's tack lands on the drawn
    bowsprit tip (asserted in `boat.test.ts`). It used to be anisotropic, a
    1.2× fore-and-aft stretch bridging the old assumed 0.45·LOA mast station,
    which drew every sheeting angle about 5° tighter than the model's (audit
    `kite-3d-01` H-11). What is still assumed: the kite hangs off a straight,
    unraked spar, because a plan view has no third axis. Presentation only.
  - **Downwind playbook bands** (`src/ui/race/downwind.ts`, copy only): the
    Gennaker panel's mode line keys off four wind-speed boundaries — wing-on-wing
    from 10 kt, tack-up soaking above 9 kt, lazy planing from 13 kt, and the
    curl cue withdrawn above 15 kt. These are the sailmakers' own numbers, not
    the app's, from research `2026-08-25-spinnaker` doc 03 §§2–3 (`T2` `T4`
    `T5` `T6`), and each is `prov:` tagged at its constant. They select a
    sentence and never a number: nothing downstream reads them. Where the
    sources disagree the panel shows the spread rather than a value — the
    running tack ease is quoted as the corpus's 0–12 in across four J/70
    sources (doc 03 §4), because averaging four irreconcilable figures would
    invent a fifth.
  - **The 0–100 slider mapping** for every downwind control is **assumed**: no
    source defines physical control travel against a UI range.
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
  exactly. **Resolved in cockpit phase 05:** Race mode's `BASE_RACE` used to
  be a harder-sheeted trim than `baseRace()` (jib sheet 70 % against 60 %) and
  read about −0.45 there. Both now read the one `baseRace` block in
  `data/boats/j70.json`, so the trim the sliders start on is the trim these
  meters are calibrated on.
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
  residuals up to 10.8 %. **Tier (decided 2026-08-26, audit
  docs-consistency-01 M-07):** the ratio takes the *lower* of the grid tier
  (A inside the printed TWA grid for the sail being carried, C outside it)
  and the tier of the boat speed it divides (`tierFor('bs')`), so it can
  never read more confident than its own numerator — tier A under the jib
  inside the polar's 6–20 kt range, tier B under the kite, tier C off the
  grid or outside that range. The band is drawn only when the tier is B or C;
  a tier-A `pctPolar` carries no band, as `tiered()` does everywhere else.
- **Verdict thresholds** (`src/ui/race/verdict.ts`, presentation only):
  stall > 0.7 reads stalled, < 0.3 upwind reads under-trimmed, stripe < 0.5
  reads hooked, |helm| > 1.2 reads heavy, and a gap under 0.02 kt reads on
  target. All assumed, all above or below the bands the guides publish.
- **Heel gauge top of scale** `HEEL_SCALE_MAX` = 25°
  (`src/ui/instruments/gauges.ts`), assumed: past 25° a J/70 is not being
  sailed, it is being survived. Drawing range only — the value and its band
  are unaffected.

### Modes, crew position and the puff replay (cockpit phase 05)

- **Mode angle offsets** (`src/ui/race/store.svelte.ts`, `MODE_OFFSET_DEG`).
  Upwind: high −3°, VMG 0, fast +3°, applied to the angle the close-hauled
  chip solved for. Sailing World's "The Mechanics of Mode" (research 02 S11)
  says modes are a deliberate 3–10° deviation from VMG but publishes no
  per-mode angle, so 3° — the tight end of its own range — is the app's
  choice. Downwind: plane −10°, soak +8°, wing +15° off the run's solved
  angle, assumed outright; the five-downwind-modes article (S15) describes
  the modes qualitatively (backstay %, vang, crew position) and prints no
  angles. **What is claimed is the sign and the ordering only** — heat it up
  to plane, drop down to soak, square away to wing — not the magnitudes. The
  angle then goes through the ordinary solver, so everything downstream of it
  is as honest as any other angle you could have typed.
- **Crew fore-aft is not modelled at all.** The solver takes crew *weight*,
  never its position, so the Fwd/Mid/Aft control changes no number on the
  screen. It carries a C badge saying so, and it exists so the tuning log can
  record what the crew was actually doing. Adding it to the physics means a
  longitudinal trim term in the hydro layer, which is Epic 2.
- **Puff sequences** (`src/ui/race/puff.ts`): gust 8→14→10 kt, lull
  14→8→12 kt and a ±8° shift, each over six steps. Teaching sequences, not a
  measured gust profile; nothing is fitted to them and the app solves each
  step as an ordinary steady state. The replay is a slideshow of steady-state
  solves — there is no time-domain physics behind it (Epic 2), and the UI
  says "replay", never "simulate".
- **Power-state thresholds** (`powerState`): full power is `aero.flat` ≥ 0.98
  and overpowered is `flat` < 0.9, both assumed — `flat` is the ORC VPP
  depowering parameter, and where along it "the sails are flattened" begins
  is a judgement. The heel half of the test is the North guide's published
  heel band (above). The three-state split itself is SailZing's (S9) and the
  order of work per state is Ingham's (S10); only the two numbers are ours.
- **Replay step timing** `PUFF_STEP_MS` = 1600 ms, with a 200 ms poll and a
  3 s cap while waiting for the optimum search to answer
  (`src/ui/race/puffPlayer.svelte.ts`). Presentation only: long enough to
  read the panels lighting up, and the wait means the ghost bugs on screen
  belong to the step you are looking at.

<!-- generated: do not edit below this line -->

## Assumed boat parameters

### `data/boats/j70.json`

| Path | Value | Note |
|---|---|---|
| `baseRace.backstay` | 30 | the app's own reading of the North guide's base wind band onto the 0-100 control scales; the guide publishes qualitative settings ("Firm", "Snug", "5-6 holes showing"), not percentages. This is the datum every shape delta in core/shape/toOrc.ts is measured against and the trim the cockpit's leech-stall and spreader-stripe meters are calibrated on, so the solver and Race mode's default trim read the one block instead of keeping two |
| `baseRace.cunningham` | 20 | see baseRace.backstay |
| `baseRace.inhauler` | 30 | see baseRace.backstay |
| `baseRace.jibHalyard` | 50 | see baseRace.backstay |
| `baseRace.jibLead` | 5 | see baseRace.backstay |
| `baseRace.jibSheet` | 60 | see baseRace.backstay |
| `baseRace.mainHalyard` | 50 | see baseRace.backstay |
| `baseRace.mainsheet` | 60 | see baseRace.backstay |
| `baseRace.outhaul` | 50 | see baseRace.backstay |
| `baseRace.traveller` | 0 | see baseRace.backstay |
| `baseRace.vang` | 30 | see baseRace.backstay |
| `baseRaceDown.kiteHalyard` | 100 | the four gennaker controls the race screen starts from, on the same 0-100 scale as baseRace, moved here from a literal in src/ui/race/store.svelte.ts so they carry provenance like every other datum. Halyard two-blocked at the masthead before the sheet is touched: North and Westaway both say the hoist should always be full (research 2026-08-25-spinnaker doc 04 section 2.5), so 100 is the honest default |
| `baseRaceDown.kiteSheet` | 50 | kite sheet mid-range, to be trimmed to the curl. Tier C cue, not a solve: core/solve/optimalTrim does not solve the downwind sheet. See baseRaceDown.kiteHalyard |
| `baseRaceDown.mainsheet` | 15 | the mainsheet under the kite, same 0-100 scale as baseRace: eased until the boom is out past the corner of the boat, leech on the leeward shroud. 15 % is about 67 degrees of boom through shape/sheeting.ts boomAngle, inside the 60-87 degree band the solver's own downwind descent reaches between 135 and 165 degrees TWA (plan 2026-08-25-desktop-kite phase 04 log, app-convention); research 2026-08-25-spinnaker doc 03 section 2.1 (T3) supplies only the qualitative cue, out past the corner of the boat. Tier C cue, not a solve: see core/solve/optimalTrim notSolved. Also the downwind shape datum: core/shape/base.ts baseRaceDown() measures the toOrc deltas from this mainsheet under the kite, so the correct ease is zero deviation instead of enough shapeInfluence to demote the downwind default to tier C (ASSUMPTIONS.md) |
| `baseRaceDown.sprit` | 100 | sprit fully out. On a J/70 the pole is either all the way out or the kite is not up, so 100 is class practice rather than a chosen midpoint. See baseRaceDown.kiteHalyard |
| `baseRaceDown.tackLine` | 50 | tack line mid-range, a trim control the sailor is expected to move rather than a setting: the J/70 sources disagree between two-block-it and ease 4-12 in (research 2026-08-25-spinnaker doc 03 section 4, doc 04 section 2.4), so the app starts in the middle of the band instead of picking a side. See baseRaceDown.kiteHalyard |
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

### `data/boats/m24.json`

| Path | Value | Note |
|---|---|---|
| `baseRace.backstay` | 30 | no Melges 24 tuning guide is committed under data/tuning/, so unlike the J/70's this base trim is not a reading of a published guide: it is the mid-band starting point the app opens on, and the datum every shape delta in core/shape/toOrc.ts is measured against. The disagreement panel shows the honest no-guide-for-this-boat state rather than quoting the J/70's tables at a different rig |
| `baseRace.cunningham` | 20 | see baseRace.backstay |
| `baseRace.inhauler` | 30 | see baseRace.backstay |
| `baseRace.jibHalyard` | 50 | see baseRace.backstay |
| `baseRace.jibLead` | 5 | see baseRace.backstay |
| `baseRace.jibSheet` | 60 | see baseRace.backstay |
| `baseRace.mainHalyard` | 50 | see baseRace.backstay |
| `baseRace.mainsheet` | 60 | see baseRace.backstay |
| `baseRace.outhaul` | 50 | see baseRace.backstay |
| `baseRace.traveller` | 0 | see baseRace.backstay |
| `baseRace.vang` | 30 | see baseRace.backstay |
| `baseRaceDown.kiteHalyard` | 100 | halyard two-blocked at the masthead before the sheet is touched. App convention, same as the J/70's |
| `baseRaceDown.kiteSheet` | 50 | kite sheet mid-range, to be trimmed to the curl. core/solve/optimalTrim does not solve the downwind sheet. App convention, same as the J/70's |
| `baseRaceDown.mainsheet` | 15 | the mainsheet under the kite, on the same 0-100 scale as baseRace: eased until the boom is out past the corner of the boat. Same app convention and the same value as the J/70's, which shape/sheeting.ts turns into about 67 degrees of boom; the sheeting model is class-independent, so the number carries across where a guide reading would not. Tier C cue, not a solve |
| `baseRaceDown.tackLine` | 50 | tack line mid-range: a trim control the sailor is expected to move, not a setting. App convention, same as the J/70's |
| `controls.forestayMm.max` | 40 | range not published in the class rules; app convention for a workable forestay length adjustment sweep. F.3.3 offers both an adjustable and a fixed forestay system, and the choice may not change during an event |
| `controls.forestayMm.min` | 0 | range not published in the class rules; app convention for a workable forestay length adjustment sweep. F.3.3 offers both an adjustable and a fixed forestay system, and the choice may not change during an event |
| `controls.forestayMm.step` | 2 | range not published in the class rules; app convention for a workable forestay length adjustment sweep. F.3.3 offers both an adjustable and a fixed forestay system, and the choice may not change during an event |
| `controls.inhauler.max` | 100 | discrepancy: the app's control set carries an inhauler, but the Melges 24 class rules have no inhauler — Appendix H's purchase table lists none, and the only windward-sheeting system it permits is on the mainsail traveller (.30). Range and purchase are unregulated app assumptions, as they are on the J/70 |
| `controls.inhauler.min` | 0 | discrepancy: the app's control set carries an inhauler, but the Melges 24 class rules have no inhauler — Appendix H's purchase table lists none, and the only windward-sheeting system it permits is on the mainsail traveller (.30). Range and purchase are unregulated app assumptions, as they are on the J/70 |
| `controls.inhauler.step` | 5 | discrepancy: the app's control set carries an inhauler, but the Melges 24 class rules have no inhauler — Appendix H's purchase table lists none, and the only windward-sheeting system it permits is on the mainsail traveller (.30). Range and purchase are unregulated app assumptions, as they are on the J/70 |
| `controls.jibLead.max` | 10 | the class rules leave the jib sheet car's pin position optional (Appendix H .14) and publish no hole count; app convention, a typical 10-hole car track, the same as the J/70's |
| `controls.jibLead.min` | 0 | the class rules leave the jib sheet car's pin position optional (Appendix H .14) and publish no hole count; app convention, a typical 10-hole car track, the same as the J/70's |
| `controls.jibLead.step` | 1 | the class rules leave the jib sheet car's pin position optional (Appendix H .14) and publish no hole count; app convention, a typical 10-hole car track, the same as the J/70's |
| `controls.lowerTurns.max` | 6 | turns on the shroud rigging screws either side of a boat's own base tune, not an absolute setting: F.6.1 lets the rigging screws be adjusted while racing but publishes no travel. App convention, the same sweep as the J/70's |
| `controls.lowerTurns.min` | -6 | turns on the shroud rigging screws either side of a boat's own base tune, not an absolute setting: F.6.1 lets the rigging screws be adjusted while racing but publishes no travel. App convention, the same sweep as the J/70's |
| `controls.lowerTurns.step` | 0.5 | turns on the shroud rigging screws either side of a boat's own base tune, not an absolute setting: F.6.1 lets the rigging screws be adjusted while racing but publishes no travel. App convention, the same sweep as the J/70's |
| `controls.upperTurns.max` | 6 | turns on the shroud rigging screws either side of a boat's own base tune, not an absolute setting: F.6.1 lets the rigging screws be adjusted while racing but publishes no travel. App convention, the same sweep as the J/70's |
| `controls.upperTurns.min` | -6 | turns on the shroud rigging screws either side of a boat's own base tune, not an absolute setting: F.6.1 lets the rigging screws be adjusted while racing but publishes no travel. App convention, the same sweep as the J/70's |
| `controls.upperTurns.step` | 0.5 | turns on the shroud rigging screws either side of a boat's own base tune, not an absolute setting: F.6.1 lets the rigging screws be adjusted while racing but publishes no travel. App convention, the same sweep as the J/70's |
| `crew.minKg` | 262 | the Melges 24 class rules publish no crew weight limit at all — C.2.1(a) limits the crew to 3-6 persons and says nothing about weight — so the slider's lower stop has no source. Taken as 0.75 x crew.maxKg, the same span the J/70's published 255-340 kg limits describe. Only the range of the crew-weight slider depends on it; the polar is replayed at maxKg |
| `hull.bwlM` | 2.117 | estimated as 0.85 x max beam, the J/70 file's documented method for the same unpublished field; no published waterline beam found |
| `hull.gmM` | 0.747 | estimated as 0.30 x beam, the J/70 file's documented method. Unlike the J/70 this class has no RM Measured to prefer over it: the ORC public feed publishes a Stability_Index but no righting moment per degree, so hull.rmMeasuredKgMPerDeg is absent and hydro/righting.ts falls back to this GM |
| `hull.keelAreaM2` | 0.589 | estimated as keelSpanM x an assumed 0.45 m average chord, the J/70 file's documented method; no published keel area or chord found. The class rules limit the combined fin and bulb weight (E.3.6, 300-313 kg) but publish no planform |
| `hull.keelSpanM` | 1.308 | estimated as 0.85 x draft, allowing ~15 % of draft for hull depth above the keel root; the J/70 file's documented method for the same unpublished field |
| `hull.kgM` | 0.539 | estimated as 0.35 x draft, a rule-of-thumb VCG fraction for a bulb-ballasted fin-keel sportboat; the J/70 file's documented method. The ORC public certificate carries no hydrostatics at all (ADR 0020) |
| `hull.lwlM` | 7.289 | ORC certificate IMSL (VPP sailing length) 7.289 m, used as LWL. ADR 0020 warns that IMSL is not LWL and that citing it as published would be an invented number wearing a citation, so it is recorded as assumed: on this plumb-bow hull it is the closest published proxy, the same reading the J/70 file makes of its own IMS 'L'. Cross-check: the J/70's LWL/LOA ratio (6.691/6.910) applied to this LOA gives 7.271 m, 0.25 % away |
| `sails.jib.halfMm` | 1347 | straight-leech triangle, 0.50 x LP. See sails.jib.quarterMm |
| `sails.jib.quarterMm` | 2020 | not published: G.4.3 limits the jib's luff, leech, foot and top width but no girths, because G.4.2(d) requires the leech to be negative (hollow) and an unroached sail needs no girth cap. Taken as the straight-leech triangle, 0.75 x LP. On the J/70 the same method gives 1838 mm against a published 1860, about 1 % low; on this sail, whose leech is hollow rather than straight, it is an over-estimate instead |
| `sails.jib.threeQuarterMm` | 674 | straight-leech triangle, 0.25 x LP. See sails.jib.quarterMm |
| `sails.main.quarterMm` | 3250 | not published: G.3.4 limits the half, three-quarter and top widths but not the quarter width. Linear interpolation between the published foot (3800 mm) and half (2700 mm) widths. On the J/70, whose quarter width is published, the same method gives 2505 against a published 2570 mm, so it reads about 2.6 % low |
| `sails.main.upperMm` | 928 | not published: G.3.4 limits no 7/8 width. Linear interpolation between the published three-quarter (1680 mm) and top (175 mm) widths. On the J/70, whose upper width is published, the same method gives 894 against a published 880 mm, so it reads about 1.6 % high |


## Calibrated free parameters

### `data/boats/j70.json`

| Knob | Value | Stage | Fit loss |
|---|---|---|---|
| `hydro.formFactor` | 0.0551343 | 1 hydro-jib | 0.03206 |
| `hydro.rrMul.fn20` | 0.339165 | 1 hydro-jib | 0.03206 |
| `hydro.rrMul.fn30` | 0.577778 | 1 hydro-jib | 0.03206 |
| `hydro.rrMul.fn40` | 0.90711 | 1 hydro-jib | 0.03206 |
| `hydro.rrMul.fn50` | 1.47954 | 1 hydro-jib | 0.03206 |
| `hydro.rrMul.fn60` | 1.57943 | 1 hydro-jib | 0.03206 |
| `hydro.planingRelief` | 0.0710006 | 1 hydro-jib | 0.03206 |
| `hydro.keelLiftSlope` | 0.868973 | 1 hydro-jib | 0.03206 |
| `hydro.heelDragK` | 0.00280636 | 1 hydro-jib | 0.03206 |
| `aero.hbiM` | 1.4 | 1 hydro-jib | 0.03206 |
| `aero.asymClMul` | 1 | 2 asym | 0.07119 |
| `aero.asymCdMul` | 2.37713 | 2 asym | 0.07119 |
| `rig.EI` | 685000 | 3 rig-shape | 9.595 |
| `rig.turnsToN` | 600 | 3 rig-shape | 9.595 |
| `rig.sagK` | 25.7145 | 3 rig-shape | 9.595 |
| `shape.bendToDraft` | 0.36 | 3 rig-shape | 9.595 |
| `shape.sagToDraft` | 0.0003 | 3 rig-shape | 9.595 |
| `shape.sheetToTwist` | 0.15 | 3 rig-shape | 9.595 |

Fit set: TWS 6/10/12/16/20 kt; held out: TWS 8/14 kt (ADR 0012 (fit/hold-out split), 0007 (tolerances)). Per-point residuals: `calibration/residuals.json`.

### `data/boats/m24.json`

| Knob | Value | Stage | Fit loss |
|---|---|---|---|
| `hydro.formFactor` | 0.0668674 | 1 hydro-jib | 0.1618 |
| `hydro.rrMul.fn20` | 0.570873 | 1 hydro-jib | 0.1618 |
| `hydro.rrMul.fn30` | 0.703886 | 1 hydro-jib | 0.1618 |
| `hydro.rrMul.fn40` | 0.891931 | 1 hydro-jib | 0.1618 |
| `hydro.rrMul.fn50` | 1.11332 | 1 hydro-jib | 0.1618 |
| `hydro.rrMul.fn60` | 1.74111 | 1 hydro-jib | 0.1618 |
| `hydro.planingRelief` | 0.098259 | 1 hydro-jib | 0.1618 |
| `hydro.keelLiftSlope` | 1.95961 | 1 hydro-jib | 0.1618 |
| `hydro.heelDragK` | 0.000603292 | 1 hydro-jib | 0.1618 |
| `aero.hbiM` | 1.4 | 1 hydro-jib | 0.1618 |
| `aero.asymClMul` | 1.1 | 2 asym | 0.09846 |
| `aero.asymCdMul` | 2.55284 | 2 asym | 0.09846 |

Fit set: TWS 4/6/10/12/16/20/24 kt; held out: TWS 8/14 kt (ADR 0012 (fit/hold-out split), 0007 (tolerances)). Per-point residuals: `calibration/residuals-m24.json`.

