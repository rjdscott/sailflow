# 02 — Plan view

*Scope: the plan hero at 1440×900 and 390×844. Shots `shots/desktop-<state>-plan.png`
for all nine states, `shots/phone-ch-plan.png`, `shots/phone-brk-plan.png`,
`shots/phone-run-plan.png`, `shots/phone-run-ease-plan.png`, plus
`shots/desktop-ch-page.png` and `shots/desktop-ch-leeward.png` for cross-checks.
Files: `src/ui/race/PlanView.svelte`, `src/ui/race/boat.ts`,
`src/ui/race/telltales.ts`, `src/ui/three/kite.ts`, `src/ui/three/SailHero.svelte`,
`src/ui/screens/Race.svelte`, `data/boats/j70.json`.*

<a id="h-11"></a>
### H-11 — The mast is drawn 0.77 m too far aft, and the whole deck plan hangs off it

The plan view steps the rig at an assumed 0.45·LOA instead of the boat file's own
J, so it draws a foretriangle 33 % longer than a J/70's, a jib clew on the wrong
side of the mast, and a slot that disagrees with the 3D hero of the same trim.

**Evidence.**
- `src/ui/race/boat.ts:41` `export const MAST_STATION = 0.45`, tagged
  `prov: assumed — the boat JSON carries no deck plan`. `data/boats/j70.json`
  carries `rig.jM = 2.34` and `hull.loaM = 6.91`, i.e. 0.339·LOA. Drawn station
  3.11 m aft of the stem against a real 2.34 m: an error of 0.77 m, 11 % of LOA,
  on a 2.34 m foretriangle base.
- The plan tacks the jib at the stem (`PlanView.svelte:61` `TACK = ORIGIN`), so
  the jib clew lands 2.45·cos 12.95° = 2.39 m aft of the stem, 0.72 m *forward*
  of the drawn mast. In 3D the same clew lands 0.05 m *aft* of the mast, because
  `src/ui/three/conventions.ts:59` uses `jM` as `STEM_X` and
  `src/ui/three/hull.ts:75` hangs the transom off that. The two pictures of one
  boat disagree about where its rig is stepped, across the toggle the hero card
  exposes: `shots/desktop-ch-plan.png` against `shots/desktop-ch-top.png`, and
  `shots/desktop-br-plan.png` against `shots/desktop-br-top.png`.
- Visible in `shots/desktop-ch-plan.png` and `shots/desktop-br-plan.png` as a
  clear gap between the jib clew and the main luff, against a jib leech almost
  touching the mast in the bow region of `shots/desktop-ch-leeward.png`. The mast
  circle sits at the aft end of a cabin trunk that runs to 0.44·LOA, with the
  boom tip at 0.87·LOA instead of 0.76 and the main drawn inside the cockpit.
- The gennaker is then stretched to bridge the error.
  `PlanView.svelte:143` `KITE_SCALE_X = (MAST.y − (ORIGIN.y + D.spritTip.y)) /
  SPRIT_TIP_X` = (0.45·6.91 + 1.495) / (2.34 + 1.495) = 1.201: the kite's plan
  projection is 20.1 % longer fore-and-aft than athwartships at every asym state
  (`toPlan`, `PlanView.svelte:144-147`). The comment at `PlanView.svelte:137-142`
  names the wrong mast station as the reason the projection has to be
  anisotropic, so the error is conceded in-repo and worked around rather than
  fixed.
- The stretch exists only to absorb this 0.77 m disagreement, and it costs a
  sheeting angle. `KITE_SCALE_X` measures 25.21 px/m fore-and-aft against
  `L.scale` 21 px/m athwartships, a ratio of 1.2007, and since `clewOnCircle`
  (`src/ui/three/kite.ts:483`) returns the clew offset as
  `[-r cos θ, dy, lee·r sin θ]`, the model's plan tack-to-clew angle is
  `sheetRad` by construction. The drawing turns 47.5° into
  `atan(tan 47.5° / 1.2007)` = 42.3° at the run, and 55.0/40.0° into 49.9/34.9°
  at the band's ends: about 5.2° tighter at every sheet setting. Both refutation
  passes reproduced the arithmetic. The sailor lens held that anchoring the
  projection on the mast and the sprit tip is the least-lying option available
  given the wrong hull, since dropping `KITE_SCALE_X` without moving the mast
  would tack the kite 0.77 m aft of the drawn bowsprit tip; that is why the
  stretch is filed here as a consequence of the mast station rather than as its
  own finding.

**Impact.** Everything hung off the station inherits the error: jib clew, boom
tip, cabin trunk, cockpit, and the kite's fore-and-aft scale. The slot, which is
the one thing a plan view exists to show, is drawn 0.77 m wider than the boat's,
and it is the thing the shared-projection machinery was built to keep consistent
between the two heroes. Sheeting angles are unaffected, since they are measured
off the mast and the tack, so nobody mis-trims from this; what is falsified is
the geometry the trainer is teaching. The two refutation passes split on
severity, one holding H and one holding C, on exactly that line; the audit holds
H because nobody mis-trims from it.

**Fix.** `export const MAST_STATION = boat.rig.jM / boat.hull.loaM` at
`boat.ts:41` (0.339 here, correct for any class carrying `jM`). It is not free:
`CABIN_HALF` (`boat.ts:74-77`, trunk 0.16→0.44) and `COCKPIT_HALF`
(`boat.ts:78-81`) are hand-tuned to the wrong station and must move with it, or
the spar stands in the middle of the cockpit; `deck().chainplates`
(`boat.ts:130-133`) is drawn at `MAST_STATION` and at 0.339·LOA would land about
3 cm outside the `HULL_HALF` sheerline, so the chainplates need their own aft,
swept station. `src/ui/three/hull.ts:53-59` claims its `STATIONS` match the plan
outline by eye, so that agreement wants re-checking. Once the station is right,
`KITE_SCALE_X` collapses to `L.scale`. `boat.test.ts` holds no mast or
chainplate clearance assertion at all, so add one rather than re-baselining
silently.

<a id="h-01"></a>
### H-01 — On desktop the plan drawing overflows the hero card: no transom, no heel readout

At every state at 1440×900 the svg is taller than its slot, so the hull's stern
and the in-picture heel tag are cut off below the card.

**Evidence.**
- `shots/desktop-ch-plan.png`, `shots/desktop-cr-plan.png`,
  `shots/desktop-br-plan.png`, `shots/desktop-brk-plan.png`,
  `shots/desktop-run-plan.png`: both sheer lines and the cockpit's aft edge run
  down and stop dead on a hard horizontal cut, with no transom drawn, and
  `Heel …°` never appears.
- Pixel scan of `shots/desktop-ch-plan.png`: card background srgb(26,26,26) runs
  through y = 444, panel srgb(36,36,36) from y = 446. Scale from the two rose
  label baselines (viewBox y 87 and 96 render 20 px apart) is 2.22 px/unit with
  viewBox y = 0 at y ≈ 48, so the transom (viewBox y 183.1) lands at y ≈ 454 and
  the heel tag baseline (`PLAN_LAYOUT.heelTag.y = 186`, `boat.ts:375`) at
  y ≈ 461, 16 px below the card; the svg box overshoots by about 26 px. Columns
  x = 98..110, the tag's centre, are pure background at every row 425-443.
  Panel-band onset measured at y = 446 in all nine desktop plan crops, so it is
  layout, not state.
- Same state on the phone renders correctly: `shots/phone-ch-plan.png` shows the
  full transom and `Heel 8°`, which rules out an intentional crop.
- Cause: `src/ui/three/SailHero.svelte:364` sets `--hero-h: 100cqh` on a
  `container-type: size` slot; `PlanView.svelte:478-484` gives the svg
  `height: var(--hero-h); max-height: none` at ≥1024, with the grid gap still to
  pay for. The cut is enforced by `.hero-boat { overflow: hidden }` at
  `src/ui/screens/Race.svelte:936-938`, inside the ≥1280 block.

**Impact.** The primary desktop layout draws a boat with no stern, which is the
first thing a sailor notices, and drops the only heel figure printed inside the
picture (the band still carries `HEEL`, but the drawn tilt is capped at 25° and
the tag is not). The desktop plan card also leaves roughly two thirds of its
width empty to the right of the rose while clipping vertically, so the
height-driven sizing is buying nothing.

**Fix.** Let the svg fit rather than fill: in `PlanView.svelte:478-484` pair
`height: var(--hero-h)` with `max-height: 100%` and `min-height: 0`, or set
`--hero-h: calc(100cqh - var(--space-3))` at `SailHero.svelte:364`; either way
the `overflow: hidden` rule at `Race.svelte:936-938` has to be part of the fix,
not a surprise afterwards. Width-fitting the svg with `max-height: 100%` also
uses the empty right-hand band. Add a regression test asserting the svg's
rendered height is not greater than the slot's.

<a id="h-02"></a>
### H-02 — The gennaker is clipped by the plan viewBox: the luff bow at every kite state, the clew at full ease

The asym window was widened athwartships and never vertically, so the sail's
forward bow is guillotined at every gennaker state, and at full ease the clew
runs off the left edge as well.

**Evidence.**
- A probe script run through PlanView's own projection
  (`PlanView.svelte:143-147`, `165-179`) gives minimum polygon y of −4.6 (tr,
  AWA 69), −13.2 (brk, 93), −11.5 (run, 118), −2.6 (deep, 159), −10.1
  (run-trim), −12.9 (run-ease), against a viewBox that starts at y = 0
  (`PlanView.svelte:54-58` sets `${ORIGIN.x - L.asymHalfW} 0 ${L.asymHalfW*2}
  ${L.h}`). Per-point luff series for the run state: 6.6, −6.0, −11.5, −10.0,
  −1.5, 14.1, 36.8, 66.5, 103.3. Leech y stays in 85-121 in every case, so only
  the luff is cut.
- Visible as a hard flat top on the sail in `shots/desktop-run-plan.png`,
  `shots/desktop-brk-plan.png`, `shots/desktop-deep-plan.png`,
  `shots/desktop-run-ease-plan.png`, `shots/phone-run-plan.png`,
  `shots/phone-brk-plan.png`, about 29 px of drawing at desktop scale
  (2.22 px/unit). A blue-channel scan puts the topmost sail row at 52 for brk,
  run, deep and run-trim and 53 for run-ease, each with a flat wide top run.
  Re-running the geometry with the boat-group heel rotation applied
  (`PlanView.svelte:266-271`) shows `tr` is the exception: tilt −12° lifts its
  −4.6 bow back to +2.1 and the sail is whole in `shots/desktop-tr-plan.png`.
- Left edge, full ease: the same probe gives clew plan x = −17.19 for run-ease
  (kiteSheet 0, tackLine 0, kiteHalyard 100, sprit 100) against a viewBox left
  edge of `ORIGIN.x − asymHalfW` = 76 − 90 = −14 (`boat.ts:387`). A pixel scan
  of the desktop plan shots (blue-stroke mask, y 120-445) gives minimum x of 13
  for run-ease against 20 for run and 43 for run-trim, with the viewBox edge at
  x = 12.4: the sail is cut on the frame, with fill present at x = 13 and no
  stroke on that boundary. Visible in `shots/desktop-run-ease-plan.png`.
- A sweep over kiteSheet, tackLine, kiteHalyard and sprit at AWA 118 clips the
  left edge in 83 of 225 combinations, worst overshoot 7.36 units, onset around
  kiteSheet 30. `boat.ts:379-386` admits `asymHalfW` was sized at the shipping
  default (kiteSheet 50) and is "not a sweep of every kite control".
- Test gap: `boat.test.ts:429-443` bounds the kite in x only; no y bound is ever
  asserted.
- Reproduced independently by the gennaker pass, through the same `toPlan` with
  33 luff and 33 leech samples: minimum drawn y of −4.6u (tr), −13.6u (brk),
  −11.8u (run), −2.6u (deep), −10.2u (run-trim), −13.3u (run-ease), against a
  frame that starts at y = 0. run-ease also over-runs x, reaching 93.8u from the
  origin against `asymHalfW` 90, i.e. 3.2u past the edge on both tacks, and that
  extreme point is the clew corner itself. `boat.test.ts:429-444` checks x only,
  at `kiteSheet` 50 only, at AWA 150 only, so it passes green while six states
  are clipped. Sized from that sweep the fix is `asymTop: -18` (4.4u of headroom
  over the worst −13.6) and `asymHalfW: 96` (2.2u over 93.8).

**Impact.** The forward bow of the free luff is what makes a gennaker not a
headsail, and it is the shape `LUFF_FORWARD_FRACTION` was raised to 1.1 to
produce; the picture amputates it at every angle the kite is carried, so the
sail reads as a flat-topped triangle. Full ease is the far end of the "ease
until the luff curls, then trim" cue the app teaches, and that is the state whose
clew the frame cuts off.

**Fix.** Give `PLAN_LAYOUT` (`boat.ts:361-388`) an `asymTopY` beside
`asymHalfW`, about −20 viewBox units, and use it at `PlanView.svelte:54-58`:
`${ORIGIN.x - L.asymHalfW} ${L.asymTopY} ${L.asymHalfW*2} ${L.h - L.asymTopY}`.
Size both bounds from a sweep of `kiteGeometry` over kiteSheet, tackLine,
kiteHalyard and sprit 0-100 at both AWA extremes, with the heel rotation
applied, not from one default; the measured sweep needs `asymHalfW` at 97 or
more. Assert both bounds in `boat.test.ts` the way the heel sweep is already
asserted.

<a id="h-03"></a>
### H-03 — The plan kite outline self-intersects into a bowtie on the reaching states

On the two reaching angles a J/70 carries the kite on most, the projected sail
outline crosses itself and draws an X.

**Evidence.**
- A probe script running a segment-intersection sweep over the 17-point polygon
  built at `PlanView.svelte:165-179` reports `tr awa69: selfIntersections=1
  5-16` and `brk awa93: selfIntersections=1 5-16`: luff segment 5 crosses edge
  16, the closing `Z` from the clew back to the tack.
- Plainly visible in `shots/desktop-tr-plan.png` (AWA 69, a large X), and
  `shots/desktop-brk-plan.png` and `shots/phone-brk-plan.png` (AWA 93, a small X
  just below the sprit tip). `shots/desktop-run-plan.png` at AWA 118 has no
  crossing, so the amplitude tracks AWA exactly as `kite.ts:556` predicts. Both
  crossing edges terminate at the sprit-tip vertex shared with the kite path,
  which rules out the main's outline overlapping the kite.
- Root cause: the path is the projection of three edges (luff, leech, straight
  foot), and the luff bows forward past the tack (`LUFF_FORWARD_FRACTION` 1.1,
  `kite.ts`), so its projection crosses the tack-to-clew line. The 3D loft does
  not have the problem because it spans sections from the bowed luff to
  `leechAt` and hangs a foot skirt, so its lower edge is not a straight line.
  SVG's default nonzero fill rule keeps the small lobe above the crossing
  filled, so the artefact reads as a stroked X plus a spurious triangle rather
  than as a hole.

**Impact.** The sail reads as folded back on itself. It is the single ugliest
artefact in the picture, and it appears on the two reaching angles the class
sails under the kite most.

**Fix.** Stop projecting three edges and project the loft the 3D hero already
builds: take `kite.sections(shape)`, project each section's luff end and its
`leechAt` end, and draw the polygon luff ends down then leech ends back. That is
the same silhouette 3D shows, cannot self-intersect, and drops the straight-foot
approximation the plan invents. The minimum alternative is to clip the closing
edge at its first crossing with the luff.

<a id="h-04"></a>
### H-04 — The four jib luff telltales are drawn along the chord, with the masthead ribbon on the clew

Four telltales documented as heights up the luff are placed as fractions along
one section's chord, so the top station is drawn exactly at the jib clew.

**Evidence.**
- `src/ui/race/telltales.ts:20-21` `JIB_LUFF_STATIONS = [0.25, 0.5, 0.75, 1]`,
  documented as "fractions of luff length, tack to head". `boat.ts:185-193`
  confirms `at` is a height fraction, used in the twist term.
- `PlanView.svelte:209-216` places them with `sailPoints(TACK, jibClew,
  jib.half, side, 4).slice(1)`, i.e. at 25/50/75/100 % along the chord, tack to
  clew. Station 1.0 lands on the clew, and the ribbon rect is `x=3.5 width=13`
  (`PlanView.svelte:327`) rotated by `streamDeg`, so it starts 3.5 px aft of the
  clew and extends 13 px beyond the sail into open water.
- `shots/desktop-ch-plan.png`, `shots/desktop-cr-plan.png` and
  `shots/phone-ch-plan.png` all show one green ribbon near the tack then three
  amber ones marching aft to the clew. In a crop of `shots/desktop-br-plan.png`
  the cambered curve and the chord converge on a grey telltale dot with the
  ribbon streaming past the trailing edge.
- The 3D hero places the same four stations correctly:
  `src/ui/three/SailView3D.svelte:598` `LUFF_TELLTALE_CHORD = 0.15` with
  `:763-771` looping `nearestColumn(jib, LUFF_TELLTALE_CHORD)` over
  `jib.stripeRows` (heights), and `:773-780` reserving the clew (`jib.M - 1`)
  for the separate `jibLeech` ribbons. The plan's station-1.0 luff ribbon
  occupies the exact spot the 3D view uses for leech physics.
- The shared seam does not catch it: `tests/ui/race-3d.spec.ts:248` locates
  `[data-sail="jibLuff"][data-at="0.75"]` in the plan and compares its *state*
  to the 3D handle, so the two views are certified to agree on state while
  disagreeing on place. Attributes are published at `PlanView.svelte:320-322`.

**Impact.** Jib luff telltales on a J/70 live within 150 mm of the luff at four
heights. Drawn from mid-chord to the clew they read as foot telltales, and the
ribbon a sailor would take for the bottom one is in fact the masthead station.
The main's leech telltales (`PlanView.svelte:217-226`) *are* drawn at
leech-like positions, which trains the reader to map ribbon position to place on
the sail, and then the jib's four break that mapping.

**Fix.** A plan has no height axis, so either fan all four just aft of the luff
(fixed small chord fraction, say 0.08, offset perpendicular to the chord by
station index, so the fan reads as four heights in one place) or draw one ribbon
per sail in plan and leave the height stack to the 3D hero. Keep `data-at` as
the height either way, and make `telltales.test.ts` assert the drawn point is
near the luff rather than near the clew.

<a id="h-05"></a>
### H-05 — The caption and the "?" explainer do not render on desktop, in either hero mode

A `@media (min-width: 1280px)` rule clips the caption to one pixel, so the
drawn-not-solved disclosure and the explainer that opens it are unreachable on
desktop.

**Evidence.**
- `PlanView.svelte:375-384` renders the caption ("Bow up, … Sheeting angles are
  read off the controls.") plus the `?` button that opens the explainer sheet at
  `:421-447`. `shots/phone-ch-plan.png` and `shots/phone-run-plan.png` show both.
- In every desktop plan shot the flank column starts at the legend row: a crop
  of `shots/desktop-ch-plan.png` over x 340-1320, y 0-60 is empty card
  background down to the legend at y ≈ 57, and y 110-230 below the readouts is
  empty too.
- The rule is `src/ui/screens/Race.svelte:975-983`, inside the ≥1280 block
  opened at `:773`:
  `.hero-boat :global(.caption) { position: absolute; width: 1px; height: 1px;
  overflow: hidden; clip: rect(0 0 0 0); }`. Its stated rationale, that the
  caption repeats the chip titles, is false on inspection: the chips are camera
  presets, the caption is provenance.
- Scope is both hero modes, not just plan. `src/ui/three/SailView3D.svelte:1144-1152`
  renders its own `p.caption` ("Sails lofted from the solved sections; hull
  illustrative … The gennaker is drawn, not solved…") inside `.hero-boat`, so the
  same rule hides it; `shots/desktop-run-page.png` and
  `shots/desktop-brk-page.png` show the stage running to the bottom of the card
  with no caption under it.
- The clipped `?` stays keyboard-focusable, so it is an invisible one-pixel
  control rather than a missing element.

**Impact.** The explainer sheet is the only place the app says the gennaker
outline is drawn rather than solved (ADR 0017), that sheeting angles come off
the controls rather than sheet loads, and that the heel lean is illustrative and
capped. None of that is reachable on desktop, in either picture, which is the
honesty rule the project holds itself to.

**Fix.** Drop the clip for the plan view's flank, where the caption sits beside
the boat and costs no hero height (the flank is roughly 390×980 px holding two
lines of text, so there is no space argument). If height is genuinely scarce in
3D, move the `?` button out of the `<p class="caption">` first, so the prose can
be dropped without taking the only explainer trigger with it, and do not leave a
clipped focusable button in the tab order.

<a id="m-01"></a>
### M-01 — The bowsprit is drawn fully extended at every state, in both pictures

Both hero views draw the full 1.495 m spar upwind and at any sprit setting below
100, while the kite's tack slides along it. The side elevation, on the same
screen, retracts it.

**Evidence.**
- Plan: `src/ui/race/boat.ts:128` and `:134` build `spritTip` and the tapered
  `sprit` path from `DIMS.spritM` unconditionally; nothing in `deck()` reads
  `race.controls.down.sprit`. 3D: `src/ui/three/rig3d.ts:127`
  `[stem, [STEM_X + boat.rig.bowspritOuterMm / 1000, 0, 0]]` is hard-coded to
  the full 1495 mm.
- Visible with the jib up in `shots/desktop-ch-plan.png`,
  `shots/desktop-cr-plan.png`, `shots/desktop-br-plan.png`,
  `shots/phone-ch-plan.png`, and in the bow region of
  `shots/desktop-ch-leeward.png`: a 31-unit spar projecting from the stem at
  TWA 40.
- `src/ui/three/kite.ts:537` tacks the gennaker at
  `STEM_X + SPRIT_M * pct(down.sprit)`, so below sprit 100 the tack floats
  mid-spar with nothing at the tip.
- The repo already encodes the correct convention on a third surface:
  `src/ui/race/rigLayout.ts:189-190` cites Class Rules C.9.4(b)(1) ("only under
  gennaker"), `:201` defaults `spritOut = false`, `:261` collapses the spar to
  the stem when retracted, and `src/ui/race/RigElevation.svelte:29-31` passes
  `{ jibUp, spritOut: !jibUp }`, locked by `rigLayout.test.ts:48-55`. Same boat,
  same state, two different bows.
- `src/ui/race/boat.test.ts:103-104` asserts the wrong behaviour
  unconditionally (`expect(d.spritTip.y).toBeCloseTo(-DIMS.spritM * SCALE)`), so
  it must be updated rather than allowed to block the fix.

**Impact.** A J/70 sails upwind with the sprit retracted, and the drag penalty
is something crews are drilled on; drawing it permanently out under the jib
teaches the opposite. It also makes the one control that visibly shortens the
boat's silhouette look inert.

**Fix.** Copy `rigLayout`'s existing gate rather than inventing a second
mechanism: extend the spar only when the gennaker is set, with `pct(down.sprit)`
on top for the extension, applied in both `boat.ts` `deck()` and `rig3d.ts:127`
so plan, 3D and elevation agree. A percentage alone is not enough, because
`store.svelte.ts:45` seeds `sprit` from `baseRaceDown.sprit` = 100 and it keeps
that value across a sailset change. `boat.ts:134`'s hard-coded root half-widths
(−1.7 / 1.7) need to survive a zero-length spar. `data/boats/j70.json:962-965`
records that the pole is either all the way out or the kite is not up, so a
boolean gate is defensible on its own and the percentage is polish.

## Checked and not reported

Read `PlanView.svelte`, `race/boat.ts`, `race/telltales.ts`, `three/kite.ts`
(`BARE_SPAR`, `kiteGeometry`, `clewOnCircle`), `three/conventions.ts`,
`SailHero.svelte` CSS, `core/shape/flying.ts` `asymShape` and `j70.json`; viewed
all nine desktop plan shots, four phone plan and plan-page shots, and the
`*-top.png` 3D cross-checks (the "Top-down" preset is oblique and the boat is
small in frame, so only gross comparisons were possible); ran the shipped
geometry through PlanView's own projection with a probe script for the kite
footprint, clip bounds and self-intersection, and sampled pixels to locate the
card edge. Correct and not reported: rose arrow directions and TWA/AWA ordering
on starboard tack at all nine angles; hull proportions (drawn max beam 2.234 m
at 0.60 LOA against a class 2.254 m, transom 1.85 m); drawn bowsprit length
1.495 m; the port/starboard mirror via `Side`; the kite tack landing on the
drawn sprit tip; the curl dash cue and the kite-under-main z-order; the jib
being furled and its telltales dropped under the gennaker; the eased main and
~67° boom staying in frame at deep; and the phone's heel tag, caption and legend
rendering correctly.
