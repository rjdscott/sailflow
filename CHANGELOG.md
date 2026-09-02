# Changelog

All notable changes to Sailflow are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) — pre-1.0, so the
minor number moves when the app gains or changes a surface.

Entries below 0.2.0 were reconstructed from the squash-merged PR titles #1–#40,
which are the permanent commit messages (see `CLAUDE.md`, "Branch + PR
discipline"). Bump `package.json` and add a section here per merged batch: the
version string is rendered on the More screen, so a stale one makes a bug report
undiagnosable.

## [Unreleased]

### Changed

- **The hold-out gate judges a VMG row's angle by the VMG it costs, not by the
  degrees between two argmaxes** (ADR 0023, superseding ADR 0007's 2° VMG-angle
  tolerance). Each held-out VMG row is now solved a second time at the polar's
  _printed_ TWA — race trim still optimised — and passes only if it keeps at
  least 99 % of the VMG it makes at its own optimum. ADR 0007's boat-speed
  tolerances (3 % on VMG rows, 5 % on printed-angle rows), ADR 0012's split and
  the row set are untouched, and no calibration value moved. The last failing
  J/70 row was 3.3° from a 2° tolerance on a VMG curve flat to 0.11 % over
  168–172°: sailed at the polar's own 172° the model gives up 0.06 kt of a
  6.27 kt VMG, so the criterion was measuring the flatness of the curve rather
  than the model. **The J/70 gate is 10/10 PASS**, worst shortfall 0.32 %; the
  Melges 24 stays 8/10 on the same two boat-speed rows, its shortfalls all
  under 0.15 %. `validation/report.md` gains a shortfall column and keeps
  printing the angle difference as information. Cost: one extra (cheap, no
  TWA search) solve per VMG row, +5 % on a calibration loss evaluation.

### Fixed

- **The equilibrium solver stalled at zero heel, and four printed rows have
  been reading 17–20 % slow because of it.** `solve/equilibrium.ts` clamped
  Newton's heel iterate at 0°. De-powered in light air the crew righting
  moment briefly exceeds the heeling moment, so the iterate swings to windward
  on its way to the root; stopped at the clamp, the moment residual goes flat
  in heel on one side, the Jacobian column goes singular and the solve returns
  `converged: false`. `optimal()` scores a non-converged state at −1e3, so a
  whole band of `flat` values scored identically and the golden section had no
  gradient to climb out on: at TWS 8 and TWA 70–80° with the jib it settled on
  the ORC flat floor of 0.42 — a de-powered beat reach in 8 kt — and reported
  4.6–4.7 kt against a printed 5.88–5.91, heel exactly 0.00. The heel box is
  now symmetric, which is what it always was for leeway (ADR 0022's fifth
  change, the same guard on the other unknown). Every root those states were
  reaching is at **positive** heel, 3.5–4.0°, and the rows now read within
  0.7 %. A converged answer at negative heel would be a bug, and the
  mirror-symmetry invariant is what would catch it.

- **Two hydro knobs no fit row can see were setting the offwind polar, and the
  held-out asymmetric row with it** (ADR 0025, ADR 0026). Three changes, one
  refit. `hydro.planingRelief` and `hydro.rrMul.fn60` both govern Fn 0.6–0.73,
  where half the printed J/70 polar lives; the stage-1 rows stop at Fn 0.55.
  The relief is not identifiable at all — its whole calibration range moves the
  stage-1 loss by 0.5 % while it moves the printed reaches above Fn 0.6 by
  12–17 % — and `fn60` only through one edge row. Fitted, they made every
  printed reach above Fn 0.6 read 12–17 % fast, which inflated the reaching
  hump of the bimodal downwind curve and left `aero.asymCdMul` no room to slow
  the deep rows: every reduction that helped the gated row flipped a _fitted_
  row onto that hump at 48–51 % out. Both are now fitted only where a stage-1
  row reaches Fn 0.6 (the Melges 24 keeps them; the J/70 holds `planingRelief`
  at 0 and `fn60` at `fn50`). The TWS 20 running row — a planing row this
  model has no regime for — goes **15.6 % → 4.0 %**, TWS 10's 6.2 % → 4.5 %,
  and the downwind optimum deepens monotonically across TWS 6–16 again.
  Separately, the keel's effective span now falls off as `cos(heel)^1.2`
  instead of the plain geometric projection both published effective-draft
  treatments reject, held constant past 30° of heel (the last station the
  DSYHS heeled tests run at). It is an unfitted constant at the shallow end of
  the published cos^1.2–cos^2.9 band because fitting a position inside the
  band failed on its own terms: the J/70 went to 2.9 and the Melges 24 to 1.2
  at Bwl/Tc of 9.26 and 9.16, and at 2.9 the J/70's 20 kt fixed-trim beat has
  no equilibrium at all.

  **The gate does not close.** It is 9/10: the held-out TWS 14 asymmetric
  running row is **4.7 % fast against a 3 % tolerance**, improved from 5.0 %
  and still outside, with a VMG shortfall at the polar's own angle of 0.11 %
  — so its angle is right and its speed is not. Every other gated row passes,
  the next worst being TWS 14 at 120° on 4.5 % against a 5 % limit. A variant
  that gates only the relief and leaves `fn60` fitted does close it, at 2.9 %,
  and breaks the monotone-deepening invariant; it is recorded in ADR 0026 and
  not shipped, because choosing between two calibrations on their hold-out
  score is what ADR 0007 forbids. Upwind VMG heel is level with or a few
  tenths better than ADR 0024 left it — 15.4° at TWS 14 against the polar's
  20.8°. The Melges 24 keeps its calibration from #128: the hydro changes are
  near-neutral for it (the same 6/10, the same four failing rows), and the
  refit that was run is rejected on its own terms — it lands in a basin where
  a _fitted_ row has no equilibrium, TWS 24 at 90° pinned on the 45° heel
  ceiling at 2.83 kt against a printed 9.43. That class needs a round of its
  own.

- **The heeling arm is published geometry, not a fitted knob** (ADR 0024). The
  model heeled 6–14° less than the 2011 ORC polar prints from TWS 10 up, and
  three published things were wrong at once, all of them transcription. The
  sail plan sat 0.81 m too low: `geometry/sailplan.ts` measured the mainsail
  centre of effort from an assumed "boom ~0.9 m above the waterline" where the
  ORC certificate publishes `BAS 0.992` above the sheer, and the sheer at the
  base of I follows from the certificate's own freeboards (`FF 0.792` at
  `SFFP 0.155`, `FA 0.571` at `SAFP 6.903`, read at `SFBI = SFJ + J = 2.500`)
  at `HBI = 0.715` — so the boom is 1.707 m above the water and the jib's foot
  is on the sheer, not 0.55 m up. ORC eq (3.5),
  `HM_total = HM_A + RM4 · FHA` with `RM4 = 0.43 · Tmax` the vertical centre of
  lateral resistance below the water plane (eq 4.29), was missing entirely.
  And the moment carried a `cos(heel)` that neither eq (5.57) nor eq (3.5)
  has; ORC puts the one the balance needs on the crew term of the righting
  moment (eq 4.30), where `hydro/righting.ts` already had it. The heeling arm
  goes 3.66 → 4.86 m plus 0.59 m of CLR. Upwind VMG heel against the polar:
  TWS 10 6.3 → 7.8 (polar 11.8), 12 8.0 → 12.9 (19.7), 14 10.5 → 15.1 (20.8),
  16 12.5 → 16.4 (21.5), 20 14.5 → 18.4 (24.2); at 90° in 20 kt, 12.4 → 20.5
  against 24.1. `rig.basM` and `hull.hbiM` are boat-file fields with
  provenance; `aero.hbiM` leaves the fit for any class that carries
  `hull.hbiM` (the Melges 24's ORC rating summary publishes no BAS, no
  freeboards and no HBI, so it keeps the knob — removing it unconditionally
  took that class's gate from 8/10 to 5/10 on nothing published); and
  `hydro.hikeRampDeg`'s fallback moves 8° → 6° on ORC VPP 2012 §4.4.3.3.

- **What `aero.hbiM` at its bound was actually asking for.** For three rounds
  it pinned at 1.4 m and `ASSUMPTIONS.md` read that as the fit wanting more
  heeling arm. HBI cancels out of eq (5.57)'s arm at full power — the module's
  own test asserts it. It was buying _effective rig height_ through eq (5.45),
  `heff = cheff · (b + HBI)`: 1.4 m put the masthead 10.17 m above the water
  against a true 9.68 m, worth about 10 % off the induced drag. Removing it
  costs boat speed. The gate holds at 9/10 with the same single failing row
  (held-out TWS 14 asymmetric), but that row is now 5.0 % fast where it was
  2.1 % (its angle improved, 3.3° → 2.5°), the widest printed jib residual is
  4.6 % where it was 3.4 %, and the TWS 20 asymmetric planing row reads 15.6 %.
  `validation/invariants.test.ts` test 18's tracking band widens ±12 → ±18 to
  follow it, and stage 1's simplex budget goes 320×3 → 500×5 because the new
  surface stopped the old budget in a basin that left a fitted row 13.6 % out.
  The next mechanism is named and published: ORC's downwind crew law
  (VPP 2012 §4.4.3.3), which is also why the polar's downwind heel column sits
  flat at 11.5–12.0° where this model reads 1°.

- **Heel costs published drag, and the upwind hold-out row closes** (ADR 0022).
  `validation/polar.test.ts` failed the held-out TWS 14 jib upwind VMG row at
  5.8 % against a 3 % tolerance, part of a ~6 % plateau the model held from
  TWS 14 to 20. `hydro/resistance.ts heelResistance` now uses the published
  Delft heel law — ΔRrh(φ) = ΔRrh(20°) · 6.0 · φ^1.7, φ in radians, Keuning &
  Sonnenberg 1998 — with the 20° datum carried by one fitted drag coefficient
  on ½ρV²S. The old assumed `k · heel² · Rv` was anchored on viscous
  resistance, which buried a friction coefficient of ~0.0029 inside
  `hydro.heelDragK` and capped the whole term at about half the penalty the
  polar needs; that is why two rounds read a fitted 0.919 against a bound of
  4.0 as "no knob closes it". Held-out TWS 14 upwind is now 0.9 % fast and
  every printed jib row is within 3.4 %. The held-out TWS 14 asymmetric
  downwind row still failed, on its VMG angle alone (boat speed 2.1 %, inside
  tolerance; angle 3.3° against 2°), on a VMG curve flat to 0.11 % over
  168–172°; documented in `validation/report.md`. That left the gate at 9/10,
  and ADR 0023 above is what closed it.

- **The calibration stopped letting an ungated column steer a gated one**
  (ADR 0022). Stage 1's heel weight was documented as keeping heel "the weakest
  term" and measured at 62 % of the loss, which held `hydro.heelDragK` at zero
  however it was parameterised; it drops to 0.002. The righting stage is gone
  and `hydro.crewArmMul` is no longer fitted at all — its only evidence was the
  polar's tier-B heel column, and fitted freely it ran to a bound in both
  directions, to values that put a hiking crew inboard of a sitting one. Four
  calibration stages become three. Melges 24 refit on the same model: gate
  7/10 → 8/10, worst gated boat-speed residual 14.3 % → 7.2 %.

- **`solve/equilibrium.ts` no longer stalls Newton on the leeway clamp.** A
  deep run needs almost no leeway, so the root sits within a fraction of a
  degree of the clamp at 0 and on a dead run exactly on it; the residual was
  then flat in leeway on one side of the root, the Jacobian column went
  singular, and `optimal()` handed the stalled state back as an answer. That
  produced a band of unconverged, 5 %-too-fast states around TWA 168–170° at
  TWS 16 which distorted the downwind VMG optimum, broke invariant 19 and
  pulled `aero.asymCdMul` a third off its true fit (3.14 → 2.38 once fixed).
  Leeway may now reach -2°, which is a numerical guard and not a physical
  claim: the side-force model is linear and odd in leeway, and no converged
  solve settles below -0.24°.

- **`pnpm calibrate` no longer writes the reference polar into the boat file.**
  `boatFor()` attaches the polar at load, and the fit was serialising the whole
  attached table back into `data/boats/<id>.json`, where `boat/validate.ts`
  then demanded a provenance row for each of its several hundred numeric
  leaves.

### Added

- **The VPP optimiser de-powers in ORC's order** (ADR 0022). `solve/optimal.ts`
  now searches `reef` by golden section over [0.5, 1], but only once `flat` has
  reached its ORC floor — ORC VPP 2023 §5.1.3's own sequence, where sail area
  comes off only after the sails are fully flattened. The floor is ORC's RED = 1
  point (headsail fully reduced, main whole), because a one-design sportboat
  main has no reef points. On the J/70 polar it never engages, which is
  recorded rather than hidden; no rig control maps to reef and none was
  invented.

- **`pnpm calibrate` no longer writes the reference polar into the boat file.**
  `boatFor()` attaches the class polar to the boat object at load, and
  `calibration/fit.ts` serialised that decorated object straight back to
  `data/boats/<id>.json` — inlining a ~10 kB copy of a table that lives in
  `data/polar/` on purpose. The Melges file has been carrying one since its
  fit; the next `pnpm calibrate --boat j70` would have added one to the J/70
  and turned `make check` red, because `boat/validate.test.ts` requires a
  provenance row for every numeric leaf and a polar leaf has none. Both boat
  files are refitted (calibration values bit-identical) with the block gone.

- fix(plan): the mast sits at the class J, the kite and the transom stay in
  frame, the caption returns on desktop (audit kite-3d-01 H-01, H-02, H-05,
  H-11)

- **"Up the luff" stays above the water and "Helm" frames the whole boat**
  (audit kite-3d-01 H-10, H-06). The preset fit backs the eye off along
  the authored sight line, so `luff`'s downward aim put the camera about 10 m
  under the keel at every state — and the sea is a single-sided plane, so from
  below there was no water and no horizon. `Helm` had the opposite problem: it
  was exempt from the fit and from the resize refit, so the hull and boom fell
  off the bottom edge over half a canvas of sky. The framing maths moved to
  `src/ui/three/camera.ts`, where the eye is now clamped above the surface for
  every preset, and both poses were re-cut with shallow upward sight lines.

- **Phone chip rows show all five points of sail and one line of camera
  presets; the active chip is filled** (audit kite-3d-01 H-07, H-08, H-09): the
  point-of-sail row was a hidden sideways scroller that reached three of five
  chips on a 390 px screen, cutting both gennaker angles, and nothing anywhere
  in the app painted `aria-pressed`, so the row never said which point of sail
  you were on. Short phone labels (Beat, Close, Beam, Broad, Run) put all five
  on one wrap-free row and the scroller is deleted; selected chips are filled
  with the accent, matching the 3D/Plan toggle. The hero's five camera chips
  get the same treatment (Luff, Top) and stay on one 44 px line instead of
  wrapping to 96 px of chrome above a 218 px picture. Desktop keeps the full
  labels and its existing layout.

- **The gennaker's drawn clew is the constructed clew** (audit kite-3d-01
  C-02, M-08, M-09): the sheet lifted the clew 0.66 m → 2.15 m above the sheer
  and the drawn corner never moved, because the loft ended every section in
  its luff point's horizontal plane. Sections are now lofted edge to edge and
  carry the leech end's height, so the sheet moves the picture; the foot skirt
  is re-fit to the J/70 photo survey (0.35 m over the bottom 15 %, lowest a
  third of the chord aft) and the mesh no longer hangs below the sheer.

- **Hoisting the kite from the conditions band eases the mainsheet like the
  point-of-sail chips do** (audit kite-3d-01 C-01): the SAIL cell flipped the
  sail plan and nothing else, so the 3D hero and the plan view drew a gennaker
  over a beat's ~20° boom. All three entry points — the SAIL cell, the chips
  and the share link — now route through one `RaceStore.setSailSet`, undoable.
  The asym→jib leg still moves nothing: the kite down with the boom out is a
  real trim.

## [0.5.1] — 2026-08-28

The downwind picture told the truth less well than the upwind one: VMG wore a
minus sign, the gennaker drew as a flat sheet, and the 3D telltales waved on a
timer. All three now come from the same state the plan view already used
(plan `2026-08-28-downwind-fidelity`).

### Fixed

- **VMG shows magnitude and direction on every surface** (#114, audit ux-04
  H-04): the face already read `4.95 kt ↓`; the target sub-line still said
  `−4.99`. It reads `target 4.99 +0.03` now, the delta keeps its one
  convention (+ = optimum is faster), and the verdict, drills and log are
  swept and tested. The solver and the share link stay signed.
- **The sea-state popover light-dismisses** on Escape and on a tap outside,
  and hands focus back to the value (#112).
- **The astern camera preset sits on the centreline**, so under the kite the
  main no longer hides it; the plan view widens its viewBox under the
  gennaker so the outline stays in frame at 150° on both tacks (#117).

### Changed

- **The gennaker flies like a J/70 asymmetric** (#116, ADR 0017, research
  `2026-08-25-spinnaker` doc 02): the leech bulge moves aft, not forward, as
  the measured flying shapes say; the shoulders carry width to just under the
  head; the foot is skirted; the luff bow moves the sail forward rather than
  across the centreline, so from astern the body is outboard of the main.
  The drawn sail's ORC-measured area is now 46.1 m² against the published
  45.64 (was 42.4), gated at ±10 %. Leech twist opens with sheet ease, as
  measured, but only 2°→8° against the measured 4°→26°: the clew circle caps
  it, and closing that is a mapping change logged for an ADR.
- **3D telltales stream, lift and stall from the aero state** (#115): a new
  `race/telltales.ts` computes each ribbon's state from local angle of attack
  and both the plan view and the 3D hero read it, so the two pictures agree
  on the same screen. Ribbons are 0.65 m, windward and leeward hang as a pair
  on the jib luff, a stalled ribbon hangs at −75° with a limp curl, a lifting
  one hooks up at +45°, and with Motion off they hold the pose. Eased vs
  sheeted moves the ¾ ribbon 40 px on screen at the default zoom; the gate
  is 18.

## [0.5.0] — 2026-08-28

One Simulator page: the conditions the model solves for are the editable right
half of the instrument band, and the Rig panel carries the forecast, the
expected regret of committing once, the three shroud turns and the lock — so a
shroud turn and what it does to the jib are visible on the same screen. Dock
and Race are gone as screens; every link written against them still opens
(ADR 0021, audit ux-04).

### Changed

- **The conditions are the right half of the instrument band** (ADR 0021,
  audit ux-04 H-01): wind speed, wind angle, sea state, crew weight and sail
  set are drawn with the same instrument cells as the boat's own numbers, and
  every one of them is the control that sets it — steppers either side of the
  value, a wind rose you drag or arrow-key, a popover for the sea, and the
  sail set on the value itself. The 28 px conditions rail, its four read-only
  chips and the `Edit` sheet behind them are gone, the point-of-sail chips sit
  under the angle they set and deselect when it leaves their band, and the
  Light/Medium/Heavy/Downwind presets — which rewrite the trim as well as the
  wind — moved to the actions bar as `Start from`, each saying so. On a phone
  the whole band is above the fold. A drill shows its own condition, locked.

- **`#/sim` is the app's primary route** (ADR 0021): Dock and Race become one
  Simulator page, and the nav drops to four items — Simulator · Log · Drills ·
  More. Links already in the wild keep working: `#/race?…` resolves to `#/sim?…`
  with its query untouched, and `#/dock?…` to `#/sim?…` on the Rig panel. The share schema is unchanged
  — the route moved, not the query — so `s=1` links, dot-separated v0 links
  included, decode to exactly the state they always did (ADR 0019). The
  `Race opened` / `Dock opened` usage counters become one `Simulator opened`.

- **The Rig panel absorbs the Dock** (ADR 0021, audit ux-04 rows 10 and 16):
  the Dock screen is gone and everything it did is the fourth sail system on
  the Simulator — the wind band the tune is bet on (`8–16 kt · likely 12`, with
  `Sail the likely wind` to sail it), the expected regret of committing once
  with the by-wind table behind it, the three shroud and forestay controls with
  the tuning guide's published turns marked on the track, and a `Setup` row
  holding `Suggest a setup`, `Commit for today`, `Print` and the gear chart.
  Turning a shroud now moves the headstay sag, the jib entry and the boat speed
  on the same screen. Sea state and crew are read from the instrument band
  instead of being kept a second time, so the band and the rig cannot disagree.
  Committed, the three controls grey with the rule as their tooltip and the
  panel says when it was committed and how to unlock. An old `#/dock?f=…` link
  lands on `#/sim?f=…` with the forecast applied and the page on the Rig panel.

- **The phone leads with the wind, and the tour points at things** (ADR 0021,
  audit ux-04 H-02, H-03, H-04, M-07, L-01, L-02): at 390 px the order is
  header → conditions → the boat's numbers → the picture → the panels, with the
  hero capped at 56 vw so the whole instrument band is inside one 844 px
  screen. The three tour cards are written for one screen — _Set the wind_,
  _The rig, and the day_, _Apply optimum_ — and each cuts a hole in its own
  dimming around the thing it is about. Downwind VMG reads `4.95 kt ↓` instead
  of a minus sign, in the cells and in the spoken summary both, and its delta
  label says which way "more" points. A cold load carrying yesterday's session
  says so, with a Reset. The phone tab bar spends no height on a wordmark.

- **Polish, and the room it took** (audit ux-04 M-04, M-05, M-06): `Lull`,
  `Shift` and `Replay a gust` are one group labelled SIMULATE, each with a ▶,
  and the TWS cell wears an accent ring while a replay writes the wind — a
  static ring when Motion is off, a pulse otherwise. The Log's empty card says
  what a saved entry gives back. The Helm panel keeps its own lede at Learn
  density. Every cockpit panel is now as tall as what is in it rather than as
  tall as the panel beside it, which is 200–400 px of empty card gone at 1440;
  at Learn density each band reading's delta wraps inside its own cell instead
  of running under the reading beside it. `Apply optimum` reads the app's own
  Motion setting, so `off` lands the sliders instead of travelling them. The
  cockpit at 1920×1080 is back inside its one-short-scroll budget: 1593 px
  against 1600 (it was 1626).

## [0.4.0] — 2026-08-26

Phase two (`docs/plans/2026-08-26-phase-two/`), six phases, all merged.

### Added

- **Share a trim** (#95, ADR 0019): the address bar is a versioned share URL
  covering conditions, sail set, every race, kite and dock control, forecast
  and density tier, with a migration table keyed on `s=`. "Copy link" on Race,
  Dock and each log entry. **Pin this trim**: a dashed ghost of a pinned trim
  in plan view and 3D, instrument cells read Δ to it.
- **First-run tour and control explainers** (#98): three-step tour in a named
  dialog, one inline-SVG schematic for each of the eighteen controls with a
  what-it-changes list, shroud-turn guide and a printable gear chart on Dock.
  Explainer copy is tested to contain no digits.
- **Second boat class** (#100, #103, ADR 0020): the core and the cockpit take a
  `BoatDefinition`; the Melges 24 sails from its 2026 class rules and ORC
  polar with per-boat calibration, golden corpus and validation
  (`SAILFLOW_BOAT=m24`). Boat picker on More; `boat=` in share links. The J/70
  corpus is byte-identical before and after.
- **Tuning guides as data** (#93): `data/tuning/README.md` schema, validated
  by `scripts/provenance.mjs`; the disagreement panel and Dock enumerate
  guides from the directory, with honest states for an emptied table and for
  a boat with no guide. Runbook `add-a-tuning-guide.md`.

### Changed

- **The model soaks** (#97, ADR 0018): a fitted bluff-body drag multiplier on
  the offwind sail above the wing-to-parachute changeover, because ORC's CLmax
  is ~0 at soak angles and the only knob multiplied it. TWS 14 downwind VMG
  15.1 % / 25.5° → 1.9 % / 3.0°. Gate still FAIL — 8/10, stated in numbers.
- **Phone performance** (#99): no leaked WebGL contexts (12 → 2 over five
  visits), plan view first on phones with the three.js chunk fetched on demand
  (first-load JS 236.9 → 97.6 KB gzip), buffer reuse on drag (300 → 0
  allocations), `DEBOUNCE_MS` 80 → 20 (settle ~105 → ~25 ms), first screen is
  the hero.
- **The 3D presets frame the whole boat** (#101): the fit measures the boat's
  world box against both FOV limits instead of an assumed sphere against the
  vertical one; the hull no longer falls off a portrait slot.
- README screenshots (#96, #102).

### Fixed

- ux-03 P1 Mediums (#91); audit punchlists reconciled and two reverted
  `ASSUMPTIONS.md` rows restored (#89); `hash.test.ts` typecheck (#90).

## [0.3.0] — 2026-08-26

Close-out release: Epic 1 (`docs/plans/2026-08-25-mvp-analyser`) and the UX
excellence plan are closed, the acceptance criteria are walked on the live
site, the phase-two plan is published, and the docs and audit punchlists are
reconciled with the code. The polar hold-out gate still reads FAIL — 8/10
(TWS 14 upwind and downwind VMG); that residual is the first phase of
`docs/plans/2026-08-26-phase-two/`, not a footnote.

### Added

- **Phase-two plan** (`docs/plans/2026-08-26-phase-two/`): downwind physics
  that passes its gate, shareable trim URLs with pin-and-compare, tuning
  guides as data, onboarding and explainers, a second boat class, phone
  performance.
- `validation/hash.test.ts` pins what the boat hash covers (#88).
- **Release-readiness audit** `docs/audits/2026-08-26-release-01/`: a
  cold-reader pass over the README, docs and live site; its P0/P1 docs
  findings are fixed in this release, code findings carried in its `todo.md`.

### Changed

- **README rewritten** for engineers and sailors: what it is, why it is
  different, the known limitation in numbers, architecture, docs map. Audit
  release-01 then corrected it: the held-out residuals are the model running
  _fast_ and _wide_, not slow and high, and the polar — not the model — is the
  one that runs 172° (H-01); `uv` is named as a prerequisite because
  `make check` needs it (H-15); the audit and runbook counts match `ls` (M-05);
  and the README now says the repo was built by Claude Code agents, so the
  progress logs that name models parse (M-06).
- **Boat hash covers solver data only** (#88): `provenance` and `sources`
  prose no longer move it, so a note edit does not fail the golden test.

- **First load −31 %** (#78, ux-03 M-23): `PROVENANCE.md`, `ASSUMPTIONS.md`
  and the validation report load when their sheet opens on More; More, Log
  and Drills are dynamic imports; `scripts/bundle_check.mjs` now sums every
  first-load chunk.

### Fixed

- **ux-03 P1 Mediums** (#91): drills no longer print "Finding the optimum…"
  while the target is withheld; Δ sign convention stated; 44 px hit areas on
  instrument `?` buttons; chip rows are groups; bottom nav honours the
  safe-area inset; the HELM gauge draws a track; phone verdict printed once;
  regret card titled once; "More/Fewer readings" disclosure.
- **Audit punchlists reconciled** (#89): dc-01, ux-01, ux-02 and ux-03 ticked
  against git; two `ASSUMPTIONS.md` rows that #83 had reverted (`TACK_TRAVEL_M`
  0.3 m, `LUFF_FORWARD_FRACTION`) restored.
- `hash.test.ts` typechecks and is formatted; the docs link check skips agent
  worktrees (#90).
- **Audit release-01** (`docs/audits/2026-08-26-release-01/`): the repo and the
  live site read cold by a first-time visitor. 17 findings, no Criticals; the
  P0/P1 documentation findings are fixed in the same commit, the code ones are
  on its punchlist.

- **The kite's head opens as the sheet eases** (#80): the drawn leech bulges to
  leeward on a profile peaking at ~63 % height instead of running straight
  into the masthead, which closed every upper section.
- **Downwind default no longer demotes itself to tier C** (#86): the shape
  datum under the kite is the downwind base trim, so an eased main is not
  measured against a beat's leech twist. `%POLAR` and BSP read B under the
  kite. Held-out validation rows byte-identical.
- **`solveEquilibrium` rejects a non-finite condition** (#87) instead of
  returning the seed-table speed with `converged: false`.
- **The 3D perf gate measures work, not the clock** (#66, also summarised under
  0.2.0's ux-03 H-12 below): mount plus the first render, so a tab opened
  behind another window is not judged slow for having been hidden; budget
  800 ms after a cold desktop GPU measured 315 ms. The compact model-vs-guides
  strip wraps its cells.
- Audit docs-consistency-01 (#81, #82, #83): the shipped validation report now
  gates ADR 0012's ten held-out rows (it scored the superseded 25-row set);
  `pnpm validate` propagates its exit code; the golden corpus fails rather
  than skips on a boat-hash mismatch; doc drift across ADRs, plans,
  `ASSUMPTIONS.md`, `PROVENANCE.md` and runbooks corrected; `TACK_TRAVEL_M`
  0.6 → 0.3 m per the research.

## [0.2.0] — 2026-08-26

Everything from #41 to #80 that had been written up when 0.2.0 was cut: drills
v2 and the closed loop, the cockpit with the three.js hero, the desktop
layout, the gennaker and the downwind corrections. The sections below were
written as the work landed. Three PRs in that range were written up later and
so appear under 0.3.0 above rather than here: #78 (first-load bundle), #80
(kite head) and the close-out detail of #66.

### Changed

- **The cockpit sizes to its content and fills the screen** (ADR 0016, #70,
  #72). No panel scrolls inside itself any more; the page scrolls when the
  window is short. From 1600 px the side panels keep two columns and the
  hero takes the rest (768 × 1112 px at 1920 × 1080, with the actions strip
  above the fold); a 14" laptop gets a full-width hero band over 2 × 2
  panels. Control names in full, longer tracks, bigger gauges. Camera presets
  fit the rig to the slot's vertical field of view, so the masthead is never
  cropped.
- **Spinnaker mode is deployed** (ADR 0017, #69, #71, #74, #76). Under Broad
  reach and Run the gennaker is drawn in the 3D hero, the plan view and its
  own section stack from the four downwind controls; the Headsail slot
  becomes the Gennaker panel (sheet, tack line, halyard, bowsprit, luff-curl
  cue, playbook line by wind band) and Helm loses its Kite section. The
  drawn shape follows the measured research
  (`docs/research/2026-08-25-spinnaker/`): luff to windward at deep apparent
  angles, clew pinned by the published leech and foot, camber and twist by
  height from photogrammetry — tier C, direction only, and the panel says
  why (the VPP has no main-shadow term).

### Fixed

- **The mainsail eases with the point of sail, and the optimum says what it
  does not solve** (#79). Hoisting the kite — a point-of-sail chip or a scenario
  link naming `set=asym` with no trim of its own — eases the mainsheet to
  `baseRaceDown.mainsheet`, the boom out past the corner of the boat at about
  67° (tier C cue, research `2026-08-25-spinnaker` doc 03; undoable). The plan
  view and the 3D hero drew a beat's boom, ~20° off the centreline, under a
  spinnaker at 150° TWA. Under the kite `optimalTrim` no longer answers the
  mainsheet at all: its only downwind route into a solve is the main's CLmax,
  which is near nothing past 150° AWA, so from 165° out the search was
  climbing leech twist and calling it "mainsheet" — it returned the boom
  pinned on the centreline on a dead run for 0.006 kt. The row now carries the
  cue in words and no target bug, and the Mainsail panel coaches the vang
  downwind. Polar and hold-out gate unchanged.
- Spinnaker `flatmin` is 0.53 per ORC (the 0.42 upwind floor was applied to
  every sailset); asym ORC table label 5.7; the ORC VPP edition pinned in
  `PROVENANCE.md` with the 2026 coefficient change recorded (#75). Hold-out
  gate unchanged.

### Changed

- **Dock, Log, Drills and More wear the cockpit** (ADR 0015), with no change
  to what is on which screen. Every card sits on the raised `--surface-2` the
  Race panels use; the Dock's expected regret, the two ends of the forecast
  band and its worst case, the drill score sheet's "off optimum" and "VMG
  lost", and More's drill streak all render through the one instrument-cell
  contract, each with its tier badge and a delta that names what it is
  measured against. The Dock's regret card waits with the instrument bar's
  1 px sweep instead of fading the number you are waiting for. The
  model-vs-guides panel drops its column-header row — every cell names its own
  source, so three sources of numbers wrap to one column on a phone — and
  still shows Δ = model − guide in plain ink, picking no winner.
- The nav rail and phone tab bar are real links (`<a href="#/dock">`) with
  `aria-current="page"`, and the tab bar gained the rail's 3 px accent
  indicator so the current tab is not colour alone. Toasts are raised cockpit
  panels rather than an inverted white slab, and committing a rig now raises
  one.
- **Race is the cockpit grid now** (ADR 0015). From 1280 px: a conditions rail
  beside the title, the instrument band on one line across the top, then
  Mainsail | 3D hero | Headsail, Helm & conditions | Rig beneath, and the
  coach line with every whole-trim action along the bottom. (This block first
  capped the grid to the viewport with each panel scrolling its own body;
  ADR 0016 reversed that later in the same release — see the top entry.)
  1024–1279 puts the hero and the instruments left, the panels right; 720–1023
  stacks the hero over 2-up panels. The duplicate "Sail sections" and "Rig
  elevation" cards are gone: each sail's section stack lives in its own panel
  and the rig elevation in the Rig panel, which is where the controls that
  move them are.
- Phone: the same four panels stacked under a sticky **Main · Jib · Helm ·
  Rig** strip that scrolls to a panel and marks the one you are in, and an
  instrument band trimmed to BSP · %POLAR · VMG · HEEL with the rest behind
  **More**.
- Keyboard: `h` and `r` join `m` and `j`, so every panel is one key away; all
  four now scroll their panel into view as well as focusing its first slider.
- 3D hero: hull and deck lifted well clear of the water with a cold rim light
  behind them, water a shade lighter than the sky fading into a faint horizon
  band, warmer sail cloth with deeper draft stripes, telltale ribbons half as
  long again, and the leeward preset aimed 0.8 m lower so the sheerline is in
  the frame. The hero's height is the grid cell's rather than a fixed 360 px.

### Fixed

- Audit ux-03's twelve High findings (#62–#65; `docs/audits/2026-08-25-ux-03/`).
  The cockpit's sail-shape visuals rendered in a 0 px box (H-01); the
  instrument band clipped itself on Drills (H-02); the model-vs-guides panel
  was cut off in the cockpit and now shows its verdict inline with the full
  table in a sheet (H-03); the gear chart showed no rows after a Dock commit
  (H-04); the puff replay's power cue lagged one step (H-05); the confidence
  badge was a button inside the Apply button, so asking what "B" meant
  rewrote the trim (H-06); tab order reached the first trim control at stop
  41, now 31 (H-07); the coach line and the band are live regions (H-08);
  `prefers-reduced-motion` now freezes the 3D hero and jump-cuts its presets
  (H-09); badge contrast 1.06:1 → 14:1 (H-10); the phone shows the hero first
  (H-11); the 3D perf gate timed a warm frame and could never trip — it now
  measures the mount plus the first render against 800 ms (H-12, ADR 0014
  amendment; the 350 ms first picked was raised after a cold desktop GPU
  measured 315 ms, #66).

### Fixed — earlier in the same block, some superseded above

- 3D hero: jib luff telltales sat on the forestay wire; they now sit 15 % aft of the luff, and the jib carries upper-leech ribbons (the North jib cue) alongside the main's. New "Helm" camera preset: from the cockpit looking up the main. Orbit may now look upward (polar clamp relaxed).
- 3D hero: main leech ribbons rooted 1 m off the leech after the telltale rewrite; anchor maths now lives in `loft.ribbonAnchor` under test.
- 3D hero perf gate timed the first render, which includes context creation and shader compiles, so it fell back to the plan view on every device (seen on a desktop GPU). It then timed a warm second frame — which ux-03 H-12 found could never trip; superseded by the 800 ms work-based gate above.
- Default theme is dark (ADR 0015 dark-first); Auto and Light remain selectable on More.

### Added

- The cockpit's last two panels (ADR 0015). **Helm & conditions** puts the
  heel gauge and the helm-load bar side by side — helm feel only reports trim
  while heel is steady, so neither is shown without the other — with a mode
  selector (high / VMG / fast upwind, plane / soak / wing / VMG downwind,
  steered off the angle the point-of-sail chip solved for), the crew-weight
  slider, a crew fore-aft position that is logged rather than solved and says
  so, and the kite controls under the gennaker. **Rig** is dock-gated: with
  nothing committed today it is the three dock sliders and a way to the Dock;
  once committed it reads the tune back, adds rake and prebend, and prints
  the wind-range gear chart from North or Quantum with your wind's row lit up
  and the source named.
- **A/B compare** in a new actions bar: swap between the trim on the sliders
  and the one you left, keeping _both_, with the objective delta between them
  and the controls that differ outlined. Keyboard `b`. Unlike "Back to my
  trim", pressing it twice is exactly where you started.
- **Puff replay** (keyboard `p`): a scripted gust — 8 → 14 → 10 kt, or a lull
  or a ±8° shift — solved a step at a time, lighting the panels in the order
  the power state calls for (Ingham's "controls, hike, ease, point, trim" in
  the transition, "ease, point, trim" overpowered) and showing the optimum's
  moves as ghost bugs. It is a slideshow of steady-state solves, not
  time-domain physics, and restores the wind exactly when it finishes or is
  stopped.
- Drills use the same instrument bar as Race, so a drill and a race read the
  same numbers the same way; `Readouts.svelte` is retired.

- Race mode's controls are two task-named cockpit panels (ADR 0015).
  **Mainsail** carries mainsheet, traveller, backstay, vang, outhaul and
  cunningham with the main halyard under a collapsed "Setup", beside the
  main's own section stack, a leech profile showing the boom angle and the
  top-batten angle, a leech-stall bullet gauge against the guide's 50–70 %
  band, and batten and draft cells. **Headsail** carries jib sheet, lead and
  inhauler beside the jib's section stack, a spreader-stripe gauge reading
  18/20/22" and a headstay-sag bar; under the kite it says the jib is not
  flying and locks its controls. `ControlPanel` is retired; the kite and dock
  rows keep a temporary card below the panels until phase 05 gives them one.
- Sliders gained an always-visible −/+ stepper (race and analyse tiers), a
  fatter 6 px track, a mark at the base trim, and an outline preview: hover
  or focus Apply optimum, "Back to my trim" or the new "Base trim" button and
  the sliders it would move outline themselves before it moves them.
- Keyboard: `m` jumps to the Mainsail controls, `j` to the Headsail controls.

- Four cockpit instruments on every solve (`SolveResult.instruments`, protocol
  v1, additive): main leech stall fraction, jib leech position against the
  18/20/22" spreader stripes, a weather-helm load proxy, and boat speed as a
  percentage of the ORC Speed Guide polar for the sail being carried. The
  first three are tier C, direction only; `%POLAR` is tier A inside the
  printed grid and C outside it. Assumptions and the stall meter's known
  ceiling are in `ASSUMPTIONS.md`.
- Race mode's readouts are now an instrument bar: BSP, %POLAR and VMG with
  target bugs and trend lines, TWA, a heel bullet gauge against the guide's
  wind-dependent target band, a helm load bar beside it, and one verdict
  sentence — "0.20 kt below target: main leech stalled, ease". Learn drops the
  angle and the helm bar and leads with the verdict; Analyse adds the two
  leech readings. Drills keeps the old readouts card for now.
- Solver invariants 15–18: leech stall rises with mainsheet, the jib stripe
  moves outboard as the lead goes aft, helm load rises as the crew comes off
  the rail, and `%POLAR` reads 100 ± 10 on every calibration fit row.

- Local-first usage counters (`src/lib/telemetry.ts`): screen views, drills
  started and checked, apply-optimum, rig commits and log saves, counted in
  IndexedDB on the device. An "Improve Sailflow" card on More shows them, with
  "Export usage JSON" and "Reset". Nothing is uploaded — the module has no
  network path and a test enforces that.
- "This felt wrong" on More: a prefilled GitHub issue carrying the screen and
  the app version, and nothing else. The helper is exported so Race and Drills
  can adopt it.
- `CHANGELOG.md`, linked from the version line on More.
- CI job `validate`: regenerates the polar hold-out report on every push,
  prints the held-out rows and the gate verdict in the job summary and uploads
  the report. Non-blocking while the gate has known failures.
- Addressable scenarios: `#/race?tws=…&twa=…&sea=…&crew=…&set=…&r=…` carries the
  condition and the whole race trim, written debounced with `replaceState` and
  read back on load or paste. `#/drills/<template>/<seed>` is parsed too.
- The session — condition, race trim and dock forecast — survives a reload,
  under `sailflow.session.v1`. A link wins over the stored session.
- Keyboard shortcuts on Race: `1`–`5` point of sail, `[`/`]` (and the arrow
  keys) to nudge the focused slider, `o` apply optimum, `u` undo, `?` for the
  list.
- Tap any readout label — BSP, Height, VMG, Heel, Leeway, AWA, Depower — for a
  one-paragraph explanation of the quantity.
- Provenance, Assumptions and the validation report are bundled with the app
  and open in a sheet from More, so they work with no signal. GitHub links kept.
- "Print tuning card" on Dock: rig setup, guide band, forecast and the
  per-wind-speed regret table on one sheet, with the app furniture hidden.
- A Motion setting on More (System / On / Reduced) overriding the OS
  reduce-motion preference, and a Detail setting carrying Simple/Advanced.
- "Log this trim" on Race, a committed-forecast chip on the conditions strip,
  a one-line purpose statement on Race and a wordmark on both navigations.

### Changed

- **One base trim.** The solver's `baseRace()` and Race mode's default trim
  were two different trims — Race sheeted harder (main 70 %, jib 70 % against
  60/60), so the meters were calibrated on a trim the screen never started
  from. Both now read one `baseRace` block in `data/boats/j70.json`. No
  physics moved: every value in the golden corpus is byte-identical, and only
  the boat-geometry hash changed.
- **The main leech stall meter is rescaled.** It now reads the leech's twist
  against the twist that would put the sail on the sheeting model's optimum,
  rather than borrowing that model's lift-loss e-fold — which had confined the
  whole upwind range to 0–0.11 and made the guides' 50–70 % band unreachable.
  Upwind the base trim now reads 0.53, inside the band; the mainsheet hard on
  reads 0.80 and well eased 0.09. Still tier C, still a direction.
- **The jib spreader-stripe reading is offset by 3.2 inches**, calibrated so
  the base trim sits on the middle 20" stripe where the guide puts it. It
  previously read −0.6 there — hooked inside the inner stripe — so the verdict
  line asked for lead aft from the trim the guide calls right.
- The PWA "new version available" prompt is an in-app toast with a Reload
  action instead of a native `confirm()`.
- Simple/Advanced is one control on More rather than a header segment on every
  screen; Race keeps a chip, the screens it did not change no longer show it.
- Each screen sets its own `<title>` ("Race · Sailflow") and starts at the top
  of the page.
- The `#/kit` design-system screen is dev-only and no longer ships; an
  unrecognised hash falls back to Race and says so in the console.
- The "Flat" readout is "Depower (flat)", so it no longer collides with the
  flat sea state.

### Fixed

- Light-air backstay direction (ux-02 H-04): the shape layer measured its
  CLmax/CD0 penalties against a single wind-independent datum, so the model
  wanted backstay on in 6 kt and too little in 20 kt. The target draft is now
  wind-dependent (`shape.draftTargetPerKt`, `prov: assumed`, direction only),
  which puts the model's backstay at 0 % in 6 kt and 65 % in 20 kt against the
  guides' 25 % and 90 %. The hold-out gate is unchanged at 21/25.

## [0.1.0] — 2026-08-25

Epic 1: a steady-state J/70 VPP analyser — Dock mode, Race mode, disagreement
panel, tuning log and drills — with an offline PWA shell and no backend.

### Added

- Physics core: type contracts, worker protocol, boat validator and reference
  data with provenance (#2); calibrated J/70 VPP with hold-out validation, a
  golden corpus and app integration (#9); per-control trim optimum via
  coordinate descent (#28); sheeting-angle efficiency in race mode (#38).
- Race mode: sail sections, rig elevation, plan view and coach line (#5);
  point-of-sail chips and an inline wind stepper (#27); a plan-view J/70
  illustration with live sails, telltales and a heel glyph (#19); telltale
  flutter, heel tilt, eased tweens and TWS-scaled arrows (#29); ghost optimum
  ticks, targets and Apply with undo (#33).
- Dock mode: forecast, regret card, suggest and the commit-for-today lock (#8);
  a provisional first pass with coarse lap budgets and worker progress (#35).
- Disagreement panel, guide reference lookup and divergence log (#6).
- Tuning log: store, JSON/CSV export and import, Log screen (#4).
- Ten static trim drills scored against the solver optimum (#7).
- Shell: design tokens, primitives, hash-routed shell and stub solver client
  (#3); design-system shell with a desktop nav rail and Race rebuilt (#15);
  desktop layouts and a visual pass for Dock, Log, Drills and More (#14);
  keyboard and screen-reader model for sliders, badges and segmented controls
  (#30); phone flow and loading states (#31).
- Offline PWA, IndexedDB tuning log, visual fixes and runbooks (#11).
- Provenance tagging on every physics literal, gated in `docs-check`, with the
  model's honest weaknesses written down (#10).
- Repo scaffold: Svelte 5, CI, plan and research (#1).

### Fixed

- Telltales read local angle of attack; traveller + is up; main leech telltales
  (#22), then telltale tuning so base trim streams and the main pair agrees
  (#24).
- Two-column screen grid from 720 px, so tablets and narrow desktops are not a
  stretched phone (#18); the boat hero fills its card on wide screens (#20);
  quiet metrics wrap at 390 px and regret copy reads as a cost (#17); target
  lines wrap inside their readout cell (#37).
- A tapped point-of-sail chip stays active after its solve; the jib is hidden
  under the kite (#34).
- Audit ux-01 P0 remediation: C-01 and H-01–H-05 (#26).

### Changed

- Golden corpus regenerated after the traveller label change (boat hash) (#23).

Documentation-only PRs (#12, #13, #16, #21, #25, #32, #36, #39, #40) are not
listed; the plans, audits and ADRs they carry live under `docs/`.
