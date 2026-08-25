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
  - **Tack**: on the bowsprit at `sprit`% of `bowspritOuterMm` (1.495 m,
    published, Class Rules C.9.4), `TACK_MIN_M` = 0.05 m above it strapped
    down, rising by `TACK_TRAVEL_M` = 0.6 m eased. **Assumed and known wide**:
    the J/70-specific figures span 0–12 in (0–0.30 m) across four North and
    Doyle sources and disagree among themselves; the sportboat literature
    reaches 18 in. Narrowing it and showing the band is doc 04 §2.4, not done.
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
    control state (doc 02 §3.1). `SAG_MAX_FRACTION` = 0.3 of the luff is still
    assumed and does almost no work; the arc bound is looser nearly everywhere.
  - **Leech bulge** (`leechBulgeProfile`, `chordForArc`): the leech stands
    out to leeward and forward of the straight head→clew line by
    `LEECH_BULGE_MIN_M` = 0.4 m trimmed, plus `LEECH_BULGE_TRAVEL_M` = 0.7 m
    at full ease, on `sin(π·t^1.5)` (peak ~63 % of the leech), 0.4 of it
    forward. **Assumed** — read off the owner's J/70 photographs (2026-08-26)
    and the twist-opens-with-ease direction in research doc 02 §5; no measured
    leech profile exists. A straight leech into the masthead made every upper
    section hook inboard, so the top read closed and the sheet could not open
    it. The cloth length stays the published 8.8 m: the straight head→clew
    chord is solved numerically from the bulged arc (`chordForArc`).
  - **Luff bow direction** (`luffLateral`): the athwartships share of the bow
    runs **+1 (leeward) at AWA 64°** to **−1 (windward, across the centreline)
    at AWA 141°**. **Published for the two endpoints** — Deparday has "the
    whole luff on the leeward side" at 64° and "the luff rotating to the
    windward side" deeper (`F1`); Motta et al. have it moving "more to
    windward, towards and across the centreline" (`F2`). The **crossover**
    falls out as their midpoint, 102.5°, inside the 100–120° band doc 04 §2.1
    proposes — but nothing brackets it tighter than "between 64° and 124°", so
    the crossover, the linear ramp and the equal windward excursion are
    **assumed**. This corrected an outright error: the luff bowed to leeward
    unconditionally, the wrong side of the boat at the 142–174° TWA the J/70
    runs at, while the app taught a cue about rotating the sail to weather that
    the picture contradicted. The bow's *magnitude* is unchanged at every angle.
  - **Clew** (`clewOnCircle`): **derived** from the published leech (8.800 m)
    and foot (5.700 m). The clew is where a sphere of radius = leech about the
    head meets one of radius = foot about the tack — a circle — and the sheet
    picks a point on it (doc 02 §6, doc 04 §2.2). It replaces `tack +
    chordDir(sheet) × KITE_CHORDS.foot`, under which the drawn leech carried
    **25–40 % more cloth than the sail has** (11.0–12.4 m against 8.800 m).
    Two consequences, both tested: head-to-clew *is* the published leech, and
    **easing the sheet lifts the clew** — ~0.3 m per 10°, ~1.1 m across the
    app's 25°–60° band, against Deparday's measured 1.4 m of clew rise from
    AWA 64° to 141°. Two independent routes to about the same number.
  - **Sheeting angle**: `SHEET_TRIM_DEG` = 25° to `SHEET_EASE_DEG` = 60°.
    **Assumed**, but now a choice of *arc* on a derived circle rather than an
    invented clew distance; both sit inside the circle's achievable 18°–89°.
    Claimed: eased is forward, outboard and up; trimmed aft, inboard and down.
  - **Luff curl**: `CURL_EASE_THRESHOLD` = 0.55 of sheet travel. **Assumed and
    it stays that way** — curl onset against sheet position is unmeasured
    anywhere in the literature, so this is a geometric threshold, not an aero
    one, and every surface showing it says so. Everything *except* the onset is
    now measured (`F1` Ch. 4, doc 02 §5): the curl **begins at ¾ height**,
    propagates **downwards** as a spanwise wave, and folds toward the
    **windward** side, which is why `SailView3D.svelte`'s
    `CURL_RIBBON_HEIGHTS` runs top-down 0.75 → 0.5 and the ribbons fold across
    the boat rather than drooping. Not drawn yet, and worth teaching: flapping
    was present in every stable optimum-trim run, so curl is what correct trim
    looks like, not an error state.
  - **Open question, not papered over**: the app's tack and head give the J/70
    a **16.4 % luff excess** over the tack-to-head distance against the
    **8.9 % measured** on the J/80. At the J/80's ratio the tack-to-head
    distance would be 9.92 m, 0.64 m more than drawn. Either a class-maximum
    kite really is that much rounder-luffed on a short rig, or the drawn head
    or tack is misplaced. Resolvable by measuring a photograph (doc 04 §2.3).
  - **Plan-view projection** (`src/ui/race/PlanView.svelte`): athwartships at
    the plan's own scale, fore-and-aft anchored at the mast and the bowsprit
    tip, because the plan's assumed mast station (0.45·LOA) is not the rig's J.
    The kite hangs off a straight, unraked spar there: a plan view has no third
    axis. Presentation only.
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
  residuals up to 10.8 % — and the value is tier A only inside the printed
  TWS range and TWA grid for the sail being carried, tier C outside it.
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
| `baseRaceDown.mainsheet` | 15 | the mainsheet under the kite, same 0-100 scale as baseRace: eased until the boom is out past the corner of the boat, leech on the leeward shroud. 15 % is about 67 degrees of boom through shape/sheeting.ts boomAngle, mid the 60-80 degree band of research 2026-08-25-spinnaker doc 03 sections 2.1 (T3) and 2.2 (T2). Tier C cue, not a solve: see core/solve/optimalTrim notSolved |
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
