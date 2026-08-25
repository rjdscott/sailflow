# What the app should change

- **Date:** 2026-08-25
- **Scope:** turning [`01`](01-asymmetric-aerodynamics.md),
  [`02`](02-flying-shape.md) and [`03`](03-trimming-best-practice.md) into
  concrete changes to `src/ui/three/kite.ts`, `src/core/shape/flying.ts`, the
  Gennaker panel, and `ASSUMPTIONS.md`.
- **This is analysis, not a decision.** ADR 0017 is the standing decision
  this would revise; its own "Revisit when" clause names exactly the trigger
  that has now fired — "a downwind shape dataset exists (photographs with
  sheet positions, or a class coach's curl-onset table)". Half of that has
  arrived: a full-scale photogrammetric dataset (`F1`) exists for the J/80.
  The curl-onset table still does not.

---

## 1. The headline

ADR 0017 chose a UI-side, tier-C mapping on the reasoning that "there is no
calibration data for kite shape versus sheet, so the physics would be
invented". That reasoning was **half right and is now half stale**:

- **Still true:** nothing measures kite shape *versus sheet position*. Curl
  onset as a function of how far the sheet is eased remains unmeasured, and
  must stay tier C.
- **No longer true:** kite shape *versus apparent wind angle* is measured, at
  full scale, on the J/70's sprit-tacked sister boat, with stated accuracy
  (`F1`, `F2`). And several constants that ADR 0017 marked assumed are not
  free at all — they are pinned by published sail dimensions the repo already
  carries in `data/boats/j70.json`.

So the split to aim for is: **shape-versus-AWA becomes published; the
clew and luff-bow geometry become derived from the class dimensions;
shape-versus-sheet stays assumed and stays labelled.**

---

## 2. Corrections to `src/ui/three/kite.ts`

Ordered by how wrong the current drawing is, worst first.

### 2.1 The luff bows to the wrong side downwind — outright error

`kiteGeometry` builds `bow` as
`scaled(norm([SAG_FORWARD_FRACTION, 0, lee(side)]), d)` — forward and **to
leeward**, unconditionally.

Measured, the direction flips with apparent wind angle: the whole luff is on
the leeward side at AWA ~64°, and by 120–141° it has rotated "to the windward
side" and "across the centreline" (`F1`, `F2`; see
[`02`](02-flying-shape.md) §3.2). The J/70's own downwind optimum sits at
142–174° TWA (`T8`), which is entirely inside the windward-luff regime.

The app therefore draws the luff on the wrong side of the boat at the angles
the kite is actually used at — and simultaneously ships a coaching cue about
"rotating the sail to weather" that the picture contradicts.

**Change:** the sag direction must be a function of apparent wind angle, with
the crossing somewhere in 100–120° AWA. That requires plumbing AWA into
`kiteGeometry`, which currently takes only `DownControls`, a rig and a side.
Note this is *not* the thing ADR 0017 refused: AWA is a solver output, not an
invented control-to-physics link.

**Provenance after:** `prov: published` for the two endpoint directions
(`F1`, `F2`); `prov: assumed` for the crossing angle, because neither source
brackets it more tightly than "between 64° and 124°".

### 2.2 The clew is treated as free when it is pinned — and the leech carries 25–40 % too much cloth

Two faces of the same omission. `kite.ts` places the clew at
`tack + chordDir(sheetRad) × KITE_CHORDS.foot` and lets the leech emerge from
the loft. Integrating that emergent leech gives **11.0–12.4 m** against the
sail's published leech of **8 800 mm** ([`02`](02-flying-shape.md) §6).

The published leech and foot lengths pin the clew to a circle: it is at the
intersection of a sphere of radius ≈ leech about the head and a sphere of
radius ≈ foot about the tack. The sheet picks a point on that circle. Solved
on the app's own head and tack, the straight head-to-clew distance at full
trim is **8.71 m** — within 1 % of the published 8.800 m, exactly what an edge
in tension with a little round should give.

The immediate visible consequence: **easing the sheet lifts the clew**, about
0.3 m per 10° of ease across the app's own 25°–60° range. `chordDir` has no
vertical component, so the app holds the clew at the tack's height always.
The derived construction raises it **1.28 m** over that range, against
Deparday's measured **1.4 m** of clew rise from AWA 64° to 141° (`F1`) — two
independent routes to the same number.

**Change:** derive the clew from `sails.asym.leechMm` and `sails.asym.footMm`
rather than swinging an assumed chord; parametrise the sheet as the angle
around that circle. `SHEET_TRIM_DEG = 25` and `SHEET_EASE_DEG = 60` survive as
the *band* — both sit inside the circle's achievable 18°–89° — but they become
a choice of arc, not an invented clew distance.

**Provenance after:** `prov: derived` from published class dimensions.

### 2.3 Luff bow magnitude: keep the model, tighten the cap, question the geometry

Good news first. `kite.ts` inverts a parabolic arc-length approximation and
lands **within 3 %** of the exact circular-arc sagitta at every control state
([`02`](02-flying-shape.md) §3.1); the file now says 3 % too. Keep it.

`SAG_MAX_FRACTION = 0.3` of the luff (3.24 m) is looser than the circular-arc
bound at every state except halyard-eased, where it binds slightly. It is
doing almost no work and can be replaced by the arc bound itself — which is
derived rather than assumed, and is the physically correct ceiling.

The open question is not the magnitude model but the geometry it runs on. The
app's tack and head give the J/70 a **16.4 % luff excess** over the tack–head
distance, against the **8.9 % measured** on the J/80 (`F1`). At the J/80's
ratio the J/70's tack–head distance would be 9.92 m, not the 9.28 m drawn.
Either the J/70's class-maximum kite really is that much rounder-luffed on its
short rig, or the drawn head or tack is misplaced. **Resolvable by measuring a
photograph; do not paper over it.**

**Provenance after:** `prov: derived` for the arc-length inversion and the
cap; the 16.4 %-vs-8.9 % discrepancy gets its own `ASSUMPTIONS.md` row as an
open question.

### 2.4 Tack height range is about double the J/70 evidence

`TACK_MIN_M = 0.05` plus `TACK_TRAVEL_M = 0.6` gives 0.65 m of travel. The
J/70-specific figures span **0 to 12 inches (0–0.30 m)** and disagree sharply
among themselves — North's old guide says ease 6–12 in, the speed guide says
4–5 in, the five-modes article says "a few inches" and only above 9 kt, and
Doyle says two-block it at the sprit end, full stop
([`03`](03-trimming-best-practice.md) §4). The broader sportboat literature
reaches 18 in (0.45 m) (`F7`, `F11`).

**Change:** `TACK_TRAVEL_M` to ~0.30 m for the J/70, and show the source
spread as a band in the panel rather than picking one number. Add the missing
conditionality: tack ease helps only when running — on a reach it "just
move[s] the sail to leeward and increase[s] heeling" (`F7`).

**Provenance after:** `prov: published` (rule-of-thumb band, contested), with
all four J/70 figures listed.

### 2.5 The halyard drop is unsupported

`HALYARD_DROP_M = 1.2`. The advice "ease the halyard 6–12 inches" is
**folklore that could not be sourced to any sailmaker publication**. North's
own sportboat article and Westaway both say the opposite — "The halyard should
always be fully hoisted" (`F9`). The only numbered instance found is a
sailor's account of J/70 wing-on-wing "beast mode", easing tack and halyard
1–3 feet each (`F15`), and North's Melges 24 guide permits halyard ease only in
very light air, warning the sail becomes "more uncontrollable, especially in
chop" (`F7`).

**Change:** default 0; expose 0–0.3 m for light-air deep modes and up to
0.9 m for wing-on-wing only, with the documented consequence being
*instability*, not a shape gain. The existing `explain.ts` copy for
`kiteHalyard` currently sells halyard ease as a projection gain; that is the
folklore and should be rewritten.

**Provenance after:** `prov: assumed`, but with the contradiction recorded —
this is a case where the honest move is to say the sources disagree with the
app's current behaviour.

### 2.6 `FLYING_CHORD_FRACTION` is inside the measured band but should not be uniform

0.85, applied at every station. Deparday's measured chord/curve-length ratio
per stripe runs **0.75–1.00** (`F1`, Fig 3.2), so 0.85 is a defensible middle.
But the ratio varies with height *and* with AWA: at AWA 64° the roundest
section is at mid-height; at deeper angles the ratio increases monotonically
with height. It is also physically a *consequence* of camber, not an
independent constant — a section's chord is short because the section is deep.

**Change:** low priority. Keep 0.85 as a scalar until camber becomes
AWA-dependent (§3), at which point the chord ratio should fall out of the
camber rather than be set beside it.

### 2.7 The curl can stop being a boolean

`curl: ease >= CURL_EASE_THRESHOLD` drives limp ribbons and a dashed outline.
Everything about the curl *except its onset* is measured (`F1`, Ch. 4):

| Property | Measured | Currently drawn |
|---|---|---|
| Where it starts | **3/4 height**, before the 1/2-height stripe | not modelled |
| How it travels | a spanwise wave propagating **downwards** | not modelled |
| Which way it folds | toward the **windward** side | not modelled |
| Extent | **0 to ~10 %** of section curve length | not modelled |
| Frequency | f·√S / AWS ≈ 0.9 → **f ≈ 0.133 · AWS Hz** on the J/70's 45.64 m² (≈ 0.67 Hz at 5 m/s AWS) | not modelled |
| Size, by mode | 50 mm tight / 150 mm nominal / 300 mm deep (`F6`, `F11`, `F9`) | not modelled |
| **Onset vs sheet position** | **nobody has measured this** | `CURL_EASE_THRESHOLD = 0.55` |

Also worth teaching, because it reframes the cue: **flapping was present in
every stable optimum-trim run** (`F1`). Curl is not an error state, it is what
correct trim looks like — in displacement modes. And Viola & Flay measured the
cost of killing it: over-sheeting moves trailing-edge separation from 60 % to
50 % of chord and loses drive (`F5`).

One caution on determinism: an animated curl needs a clock, and `src/core`
never calls `Date`. The frequency belongs in the UI layer with the rest of the
drawing, not in the solver.

### 2.8 New invariants worth testing

`kite.test.ts` currently holds directions and sign conventions. Three
measured invariants could now be held as *magnitudes*, scaled from `F1` by
area (linear as √area, volume as area^1.5):

| Invariant | J/80 measured | J/70 target |
|---|---|---|
| Max depth off the head–tack–clew plane | 3.1–3.3 m | **2.60–2.77 m** |
| Volume between sail and HTC plane | 110 ± 3 m³, **constant with AWA** | **~65 m³** |
| Projected area onto HTC plane | 80 % → 72 % of cloth as AWA 64° → 141° | **36.5 → 33.0 m²** |
| Leech path length | — | **8.80 m**, from the class dimension |

The constant-volume result is the most valuable: **rotation to weather is a
fixed-volume deformation**. A drawn kite that rotates while its belly stays
put is drawing the wrong thing, and a test can catch that.

---

## 3. `src/core/shape/flying.ts`: `asymShape` can become published

This is the part ADR 0017 did not consider, and it deserves care.

ADR 0017 refused option A ("DownControls enter `FlyingShapeFn`") because kite
shape versus *sheet* is uncalibrated. That reasoning holds. But `asymShape`'s
constants are not a function of the sheet — they are a function of apparent
wind angle, which the solver already knows. Making them AWA-dependent from
published measurements is not the invented physics ADR 0017 rejected; it is
the opposite.

Measured against Deparday Table 3.1 at running angles (`F1`):

| Quantity | `asymShape` today | Measured at AWA 124° | Measured at AWA 64° |
|---|---|---|---|
| Camber, quarter height | 17 % | ~30 % | ~28 % |
| Camber, half height | 17 % | 24 % | 26 % |
| Camber, three-quarter height | 14.5 % | ~19 % | ~17 % |
| Draft position, all heights | 45 % (constant) | 41–49 % below 4/6, **67 % at 5/6** | 39–49 %, **61 % at 5/6** |
| Twist, foot to head | 12 ° | **26 °** | **4 °** |

Three findings:

1. **The model is roughly 40 % too flat** at running angles, and its
   `[1.0, 1.0, 0.85]` per-height profile has the wrong shape — the real sail
   is fullest at **1/6–2/6 height**, not uniformly full to mid-height.
2. **Draft position must move aft with height**, sharply above 4/6. The
   existing `DRAFT_POS_MAX = 0.6` clamp would truncate the measured 61–67 %.
3. **Twist is the biggest single error.** 12° is about right for a tight
   reach and **less than half** the measured value at the angles the kite is
   used at. Foot-to-top twist runs 4° at 64°, >20° at 96°, 26° at 124°,
   28° at 141° (`F1`, Fig 3.3).

There is a supporting AWA curve from a second programme: foot camber
**17 % at 60° → 25 % at 80° → 31 % at 100° → 37 % at 120°**, draft moving
**34 % → 45 %** aft (`F2`, Table 1).

**The honesty caveat, and it is not small.** These are J/80 measurements. The
shape parameters are dimensionless and the boats are close siblings, but
transferring them is still an inference. The correct tag is **`prov: derived`
— from `F1`, by dimensionless transfer from the J/80 — not `prov: published`.**
Anything tagged `published` should be a number measured on a J/70 or stated in
its class rules.

---

## 3a. Corrections outside the drawn kite

**`FLAT_MIN_BASE = 0.42` is the upwind floor, applied downwind.** ORC gives
spinnakers and headsails set flying **`flatmin = 0.53`**, and records that the
baseline minimum changed to 0.53 in 2024
([`01`](01-asymmetric-aerodynamics.md) §2.4). The repo's `depower.ts` applies
`clampFlat` unconditionally and `forces.ts:284` calls it for every sailset,
`asym` included. **Check whether the downwind optimum ever drives `flat` below
0.53** — if it does, the solver is depowering past what ORC permits, and the
fix is a sailset-dependent floor. Related: ORC couples `flat` with `reef`
downwind (area scales as `A · reef²`) and enforces a soft heel ceiling of
≈ 21.5° under spinnaker, neither of which the repo models.

**Pin the ORC edition, not just the document.** ORC materially changed the
asym-on-centreline coefficients between 2024 and 2026 — CL at 130° AWA rose
0.372 → 0.592, a 59 % increase, which raises derived drive at 130–150° by
~36 % — while the 2026 revision list mentions nothing and a standing footnote
still claims the last single-sail coefficient change was in 2016. The tables
also renumbered (5.6/5.7/5.8 → 5.8/5.9/5.10). `PROVENANCE.md` should carry the
edition year and ideally a file hash, and `sails.asym.orcTable` should name
both the number and the edition.

**Whether the twist function applies under spinnaker is undecided in the
source.** Eq. 5.49 (2023) / 5.40 (2026) sits under the general centre-of-effort
section, but the spinnaker has its own hard-coded CEH and an effective-height
formula ORC explicitly calls simpler and AWA-independent. The repo carries
`TWIST_K_FLAT = 0.406`, the 2023 value; the 2026 form uses 0.500 plus an
overlap term. This is an `ASSUMPTIONS.md` row, not a silent choice.

**A newer polar exists.** The repo's `data/polar/orc-j70.json` is the 2012 ORC
speed guide (VPP 2011 1.02). An ORC one-design certificate on **VPP 2021** is
published, corroborated by a scraped 2024 fleet dataset of 25 J/70
certificates. The two disagree substantially in mid-range: the 2012 guide sweeps
to 174° at 16 kt TWS, the 2021 certificate never goes deeper than 150.8° and
gives 11 % more VMG at 20 kt. **The 2021 shape agrees far better with what the
sailmakers describe**, which softens the ORC-vs-sailmaker conflict in §5. Worth
adding as a second source with the delta shown rather than replacing the first.

**One claimed artefact checked and rejected.** Research flagged that ORC
certificates can back-derive the printed 150° row as `RunVMG / cos 30°`.
Checked against the committed data, the identity holds only at TWS 10 and only
because the optimum there is itself 150.7°; every other row is a genuine
independent solve ([`01`](01-asymmetric-aerodynamics.md) §4.2). **The repo's
150° rows are sound.** Recorded so the claim does not propagate.

**Two aero numbers that should reach the UI.** Trim sensitivity: **25 %
difference in drive between 0° and −10° of trim, against under 1 % between
sails of very different twist** — ten degrees of trim error costs an order of
magnitude more than sail choice. And the quantified curl payoff: easing to the
verge of curling is worth **up to 15 % more drive at AWA 100°**, a gain that
**vanishes as AWA decreases**. That is independent physical confirmation of the
mode-conditional sheet cue in §5, and it is a far better motivation for the
curl cue than "sailmakers say so".

## 3b. Two documentation corrections

**`data/boats/j70.json` names the wrong ORC table.** `sails.asym.orcTable` is
`"5.6"`, which is the **symmetric spinnaker** table; the J/70's
centreline-tacked gennaker is **Table 5.7**
([`01`](01-asymmetric-aerodynamics.md) §2.1). The solver is unaffected —
`tables.ts` hardcodes `ASYM_TABLE` from 5.7 and transcribes it correctly, and
`validate.ts` only checks the string is one of five known numbers — so this is
mislabelled provenance, not a behaviour bug. One-character fix, and exactly
the kind of quiet mislabelling the project's provenance rules exist to catch.

**The blanketing gap deserves to be said out loud in the UI.** ORC §5.6.3
gives the spinnaker `bk(β) = 1` at every apparent wind angle, and a sloop's
mainsail factor is identically 1 too. **The VPP has no term for the main
shadowing the kite** ([`01`](01-asymmetric-aerodynamics.md) §2.4). That is the
specific reason the sprit and tack line cannot reach a number: they act on a
mechanism the model does not contain. `explain.ts` currently says downwind is
"the weakest part of any parametric VPP" for the sprit — true, but vague.
Naming the missing term is more useful and more honest, and it applies to the
tack line as well, whose copy does not carry the caveat at all.

---

## 4. What can honestly leave tier C

| Claim | Tier now | Tier available | Basis |
|---|---|---|---|
| Target TWA / BSP / VMG by TWS, downwind | — | **A** | `T8`, already committed at `data/polar/orc-j70.json`. ORC VPP output for this exact class |
| Jib-only downwind baseline (kite's worth: +0.5 kt at 10 kt, +0.8 kt at 20 kt DDW) | — | **A** | `T8` |
| Sail dimensions: luff 10.800, leech 8.800, foot 5.700, half 5.560 m; sprit 1 495 mm | published | published | J/70 Class Rules G.5.3, C.9.4 (`T9`) |
| Clew position, and the leech-length constraint | assumed | **derived** | class dimensions + spherical intersection; corroborated by `F1` clew travel |
| Luff sag magnitude and its cap | assumed | **derived** | arc-length inversion, within 3 % of exact circular arc |
| Camber / draft / twist by height and AWA | assumed | **derived** (from `F1`, `F2`, by J/80 transfer) | §3 |
| Luff bow *direction* vs AWA | assumed (and wrong) | **published** for the endpoints | `F1`, `F2` |
| Curl origin, travel, fold direction, extent, frequency | assumed | **published** | `F1` Ch. 4 |
| Curl size by mode (50/150/300 mm) | assumed | published rule-of-thumb, contested | `F6`, `F11`, `F9` |
| Tack ease range | assumed | published rule-of-thumb, **contested 0–12 in** | `T2`, `T4`, `T5`, `T7` |
| Max depth, volume, projected-area invariants | absent | **derived** (scaled from `F1`) | §2.8 |
| RRS 42 pumping allowance | absent | **A** | J/70 Class Rules C.1.1(b) (`T9`) — quoted rule text |
| Planing thresholds and heel targets | absent | published, **contested 5–15 °** | `T1`, `T4`, `T6` |
| ORC minimum `flat` under spinnaker = 0.53 | absent (0.42 applied) | **published** | `A1` §5.1, footnote 3 |
| Trim sensitivity: 25 % drive loss for 10° of trim error | absent | **published** | `A13` |
| Drive gain from easing to the curl: up to 15 % at AWA 100°, vanishing at lower AWA | absent | **published** | `A14`, `A13` |
| Rudder drag vs angle: 5° ≈ 3.4×, 10° ≈ 10.7× zero-lift drag | absent | **published** (dinghy rudder, 4.5 kt) | `A18` |
| Whether the ORC twist function applies under spinnaker | absent | **stays assumed** | the source does not say (`A1`) |
| Windward-heel speed gain | absent | **stays assumed** | no source anywhere publishes a measured gain |
| Planing threshold in Froude terms | absent | **stays assumed** | `A21` gives Fn 0.60–0.74, Faltinsen 1.0–1.2 — a factor of 1.7 |
| **Curl onset as a function of sheet position** | assumed | **stays assumed** | nobody has measured it. `CURL_EASE_THRESHOLD` remains tier C |
| Mapping of a 0–100 UI slider to physical control travel | assumed | **stays assumed** | no source defines it for any control |
| `FLYING_CHORD_FRACTION` exact value | assumed | stays assumed (band 0.75–1.00 published) | `F1` Fig 3.2 |
| `SHEET_TRIM_DEG` / `SHEET_EASE_DEG` endpoints | assumed | stays assumed (inside a derived 18°–89° envelope) | §2.2 |

**Summary in one line:** target speeds are tier A today; the drawn geometry
can be mostly derived or published; **curl onset versus sheet stays tier C and
must keep saying so.**

---

## 5. What the Gennaker panel should show

The panel does not exist yet — the kite controls currently live in
`src/ui/race/panels/Helm.svelte`, and ADR 0017 anticipated "the Headsail slot
becomes a Gennaker panel". These are the cues the evidence supports.

**Primary visual: the luff, with the curl where it actually happens.** Draw
the curl at the **shoulder / upper luff**, propagating downward, folding to
windward, spanning up to 10 % of the section chord, pulsing at
f ≈ 0.133 · AWS Hz. Quantum's "curl along the top 50 percent of the luff"
(`T3`) is the only quantified extent any sailmaker gives. Label the *onset*
threshold as tier C, geometric, direction-only — that label is now the only
tier-C label the panel needs, which is a real improvement on labelling
everything.

**Mode banner, and it must be honest about the disagreement.** The single
most valuable thing this panel can teach is the 12–16 kt conflict: the ORC
polar says soak at **162–174°**, every sailmaker says 14–15 kt is where you
plane and you should be up at a much higher angle
([`03`](03-trimming-best-practice.md) §6). Both are right — the VPP has no
wave-surfing and no crew-kinetics model, and the class rules explicitly permit
unlimited gennaker pumping in exactly those conditions. Show the ORC target,
show the sailmaker mode, show the delta. This is the project's honesty rule
with its best possible worked example.

**Sheet cue, conditional on mode.** "Ease to the curl" is a *displacement and
soaking* technique. On a plane you trim the curl out, hold it, and gear-change
with the mainsheet (`T4`, `T6`). A trainer showing "ease to the curl" as a
universal cue teaches the wrong thing above 15 kt.

**Tack height, by mode, as a band.** Reaching: down, every source agrees.
Running: somewhere in 0–12 in, four sources spread across the whole range —
show the band and name the sources, do not pick. Add the field diagnostic,
which is better coaching than any number: ease the tack; if it rides **up or
to weather** you have rotation, if it sags to leeward, **pull it back down**
(`F6`, `F9`).

**Pumping rhythm, with the rule.** J/70 Class Rules C.1.1(b) modifies RRS
42.3(c) so the gennaker sheet "may be played without restriction" while main
and jib keep one pull per wave — gated on surfing or planing being possible
(`T9`). This is class-specific, it is tier A rule text, and it is exactly the
sort of thing a trainer should teach. Note that Doyle's guide contradicts it
(`T4`); show both, the class rule governs.

**Head rotation.** Whether the luff is projecting to windward or sagging to
leeward, driven by AWA, crossing around 100–120°. Pair with the fixed-volume
fact so the picture and the readout agree.

**Heel, by mode and with direction.** Leeward for VMG and reaching; windward
for soaking, running deep and wing-on-wing (`T3`, `T4`, `T5`). Planing target
5–15° with the three sources' numbers shown (Doyle 5–10 °, Healy <10 °,
North's tuning guide 10–15 °). And carry the upwind lesson forward: helm load
only reads true when heel is constant.

---

## 6. Proposed `ASSUMPTIONS.md` rows

Replacing the current "Gennaker geometry from the downwind controls" block.
Grouped by what the tag would become.

**Published — a number measured on a J/70 or stated in its class rules**

1. Sail dimensions: luff 10 800, leech 8 800, foot 5 700, half width
   5 560 mm; bowsprit hull-to-outer-point 1 495 mm, fully retracted unless
   the gennaker is set. J/70 Class Rules G.5.3, C.9.4.
2. RRS 42.3(c) as modified by J/70 Class Rules C.1.1(b): gennaker sheet
   played without restriction, main and jib one pull per wave, gated on
   surfing or planing being possible. Doyle's guide disagrees; class rule
   governs.
3. Crew position bounds: no crew forward of the mast except momentarily;
   at most two with legs outboard of the sheerline. C.3.3.
4. Target TWA / BSP / VMG by TWS, and the jib-only baseline — already
   `data/polar/orc-j70.json`, ORC VPP 2011 1.02, issued 2012-04-30. Tier A,
   with the 16→20 kt planing discontinuity flagged as the model's most useful
   and most suspect validation target.
5. Curl mechanism: begins at 3/4 height, propagates downward as a spanwise
   wave, folds to windward, spans 0–10 % of section curve length, at reduced
   frequency f·√S/AWS ≈ 0.9. Measured on a J/80 but a *mechanism*, not a
   dimension, so it transfers without a scaling assumption.
6. Luff bow direction: leeward at AWA ≈ 64°, windward and across the
   centreline by 120–141°.
7. ORC coefficient source for the gennaker is **Table 5.7** (Asymmetric
   Spinnaker tacked on centreline), `kpasc` 0.02648 — not Table 5.6
   (symmetric), which `data/boats/j70.json` currently names.
8. ORC blanketing for the spinnaker is `bk(β) = 1` at all angles (§5.6.3), and
   a sloop's mainsail factor is identically 1. **The VPP models no main-shadow
   effect on the kite**, which is the mechanism the sprit and tack line exist
   to fight.
9. Drive resolved from Table 5.7: maximum lift at 75° AWA, **maximum drive at
   100°**; lift supplies >100 % of net drive below 90°, 48 % at 130°, 14 % at
   150°, 0 % at 180°; the sail is a net brake at 28°.
10. ORC minimum `flat` under spinnaker is **0.53** (2024 onward), not the 0.42
    the repo applies to every sailset; `flat` and `reef` are coupled downwind
    (area as `A · reef²`) and heel is soft-capped at ≈ 21.5°.
11. Trim sensitivity: **25 %** drive difference between 0° and −10° of trim,
    against **under 1 %** between sails of very different twist.
12. Easing to the verge of curling is worth **up to 15 % drive at AWA 100°**,
    and the gain **vanishes as AWA decreases** — the physical basis for making
    the curl cue mode-conditional.
13. Rudder drag rises roughly with angle squared: **5° ≈ 3.4×** and
    **10° ≈ 10.7×** the zero-lift drag; the rudder is ~12.8 % of total
    hydrodynamic resistance.

**Derived — computed from a published number, with the derivation stated**

14. Clew position: intersection of a sphere of radius = leech about the head
   and radius = foot about the tack. Straight head-to-clew at full trim
   8.71 m against the published 8.800 m leech. Consequence: easing the sheet
   raises the clew ~0.3 m per 10°, ~1.28 m over the 25°–60° band, against
   Deparday's measured 1.4 m.
15. Luff sag magnitude: parabolic arc-length inversion, within 3 % of the
   exact circular-arc sagitta; cap = the circular-arc bound rather than
   `SAG_MAX_FRACTION = 0.3`.
16. Camber, draft position and twist by height and AWA: from Deparday Table
   3.1 and Motta Table 1, **by dimensionless transfer from the J/80**. Derived,
   not published — the transfer is the inference.
17. Shape invariants scaled from the J/80 by area: max depth off the
    head–tack–clew plane 2.60–2.77 m, volume ~65 m³ and constant with AWA,
    projected area 36.5 → 33.0 m² as AWA goes 64° → 141°.
18. Curl frequency on the J/70's 45.64 m²: f ≈ 0.133 · AWS Hz (≈ 0.67 Hz at
    AWS 5 m/s). Drawn in the UI layer, not the solver — `src/core` has no
    clock.

**Published rule-of-thumb, contested — show the band, name the sources**

19. Tack ease when running: 0–12 in across four J/70 sources (North old guide
    6–12 in; speed guide 4–5 in; five modes "a few inches", only above 9 kt;
    Doyle two-blocked). All agree tack down when reaching.
20. Curl size: 50 mm (Nixon) / 150 mm (Ullman) / 300 mm ("a foot", the field).
21. Planing heel target: 5–10 ° (Doyle), <10 ° (Healy), 10–15 ° (North tuning
    guide).
22. Heel *direction* is a function of mode, not wind speed: leeward for
    VMG/reaching, windward for soaking/running deep/wing-on-wing.
23. Jib downwind trigger: planing state (North, Doyle) vs wind speed
    (Quantum, 13 kt). Genuine disagreement at 13–15 kt.

**Still assumed — tier C, and the label stays**

24. `CURL_EASE_THRESHOLD` = 0.55 of sheet travel. **Curl onset versus sheet
    position is unmeasured anywhere in the literature.** Geometric threshold,
    not aero, and every surface showing it says so.
25. The mapping from a 0–100 UI slider to physical control travel, for every
    downwind control. No source defines it.
26. `FLYING_CHORD_FRACTION` = 0.85. Inside the measured 0.75–1.00 band
    (Deparday Fig 3.2) but not itself measured, and physically a consequence
    of camber rather than an independent constant.
27. `SHEET_TRIM_DEG` = 25 / `SHEET_EASE_DEG` = 60. Inside the derived
    18°–89° envelope, but the endpoints are a choice.
28. `HALYARD_DROP_M`. "Ease the halyard 6–12 inches" is unsourced folklore;
    North and Westaway say the halyard should always be fully hoisted.
    Default 0; the documented consequence of easing is instability, not a
    shape gain.
29. The crossing angle at which the luff moves from leeward to windward.
    Bracketed by measurement only as "between 64° and 124°".
30. Whether the ORC twist function applies under spinnaker. The document does
    not say; the spinnaker has its own CEH and an explicitly simpler,
    AWA-independent effective height.
31. Any speed gain from windward heel. **No source — sailmaker, coach or
    academic — publishes a measured figure.** Only the rudder-drag chain is
    quantified, and only upwind in waves on a dinghy rudder.
32. Any thrust coefficient for roll-pumping a keelboat. The transferable
    numbers are the flapping-foil Strouhal band (0.2–0.4) and ~20 % measured
    real-world sail-pumping efficiency.
33. The planing threshold in Froude terms: Sponberg gives Fn 0.60–0.74
    (9.1–11.2 kt), Faltinsen Fn 1.0–1.2 (15.2–18.2 kt) — a factor of 1.7, and
    on Faltinsen's criterion the J/70 never planes in the ORC data.

**Open questions, need a measurement**

34. The app's geometry gives the J/70 a 16.4 % luff excess over the tack–head
    distance; the J/80 measures 8.9 %. Either the J/70's class-maximum kite is
    genuinely much rounder-luffed on its short rig (luff/foot 1.895 against
    the J/80's 1.67), or the drawn head or tack is misplaced by ~0.6 m.
    Resolvable by measuring a photograph.

---


35. `hull.lwlM` = 6.691 m is the ORC certificate's IMS measurement length `L`,
    already tagged assumed in `PROVENANCE.md`; the published LWL is
    **6.24 m**. Hull speed 6.28 vs 6.06 kt, a 3.5 % spread. Every conclusion
    in [`01`](01-asymmetric-aerodynamics.md) §5 holds on either, but both
    should be carried rather than one silently chosen.
36. Crew weight is **+40 % of dry displacement** (700–780 lb on 812 kg) and
    the class sets no limit. No ratio computed on dry displacement describes
    the sailing boat; a planing model should use ~1 160 kg.
## 7. Cut order, if this does not all fit

Consistent with the project's stated downwind-first cut order, and ranked by
honesty gained per unit of work:

1. **The luff-bow direction flip** (§2.1) — it is the only outright error, and
   it is wrong at precisely the angles the feature exists for.
2. **The clew and leech constraint** (§2.2) — replaces three assumed constants
   with one derived construction, and fixes a 25–40 % cloth error.
3. **Camber, draft and twist from `F1`** (§3) — the largest quality gain in the
   picture, and it moves the solver's `asymShape` off invented constants.
4. **The Gennaker panel's mode banner with the ORC-vs-sailmaker delta** (§5) —
   no geometry work at all, and it is the best teaching artefact in the whole
   research.
5. **The curl, upgraded from boolean to the measured mechanism** (§2.7).
6. Tack and halyard ranges (§2.4, §2.5) — small, but they stop the app from
   teaching folklore.
7. **Check `flat` against ORC's 0.53 spinnaker floor** (§3a) — a correctness
   question in the solver, cheap to test, and the only item on this list that
   could mean the model is currently outside what ORC permits.
8. The `orcTable` label, the ORC edition pin, and the blanketing-gap wording
   (§3a, §3b) — a one-character data fix, a provenance line, and two copy
   changes; no logic touched.
9. The VPP 2021 polar as a second source alongside the 2012 guide (§3a) — data
   only, and it narrows the ORC-vs-sailmaker gap the mode banner exists to
   show.

Never cut: the tier labels, and the statement that curl onset is assumed.
