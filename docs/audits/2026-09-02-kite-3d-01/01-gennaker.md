# 01 — The gennaker

*Scope: the drawn asymmetric in the 3D hero and in the plan view, measured
against [the photo survey](05-photo-survey.md) (14 J/70 photographs, n = 13
readable). Shots `shots/desktop-<state>-<preset>.png` and `shots/crops/*.png` at
the six downwind states (tr TWA 110, brk 135, run 150 at the default trim sheet
50 / tack 50, deep 170, run-trim sheet + tack 100, run-ease sheet + tack 0), TWS
12, starboard tack, commit `60913b4`. Files: `src/ui/three/kite.ts`,
`src/ui/three/loft.ts`, `src/ui/three/conventions.ts`, `src/ui/three/rig3d.ts`,
`src/ui/three/SailView3D.svelte`, `src/ui/race/PlanView.svelte`,
`src/ui/race/boat.ts`, `src/ui/three/kite.test.ts`, `ASSUMPTIONS.md`,
`data/boats/j70.json`.*

## The clew and the foot

<a id="c-02"></a>
### C-02 — The loft never carries the clew: the drawn corner sits at tack height at every sheet setting, and the foot hangs below the sheer

This is the complaint the phase was opened on, in the owner's words "the clew of
the spinnaker is too low". The model puts the clew where the photographs do. The
renderer throws that height away and pins the sail's third corner on the deck.
One root cause, two symptoms: the drawn corner never reaches the constructed
clew, so easing the sheet lifts nothing, and the foot is drawn as a horizontal
line at the tack's height, so the cloth hangs 0.35-0.50 m below the sheer.

**Evidence.**
- The constructed clew is in the photo band. `kiteGeometry().clew` sits 0.67 /
  1.28 / 2.08 m above the sheer at kiteSheet 100 / 50 / 0, i.e. 0.08 / 0.15 /
  0.24 of an 8.5 m mast, against a photographed band of 0.12-0.30 with a median
  of 0.19 ([the photo survey](05-photo-survey.md), n = 13). The drawn corner is
  at tack height, 0.05-0.35 m or 0.006-0.041 of mast, at every one of the 15
  sheet × tack-line states.
- A probe over the real rig (`rig3d`, `SHAPE = shape.asym`, starboard, sprit
  100, halyard 100, AWA 150, tackLine 50) printing `gridRow(mesh, 0)[M-1]`
  against `kiteGeometry().clew`:

  | kiteSheet | clew | drawn corner | drop |
  |---|---|---|---|
  | 100 | `[-0.517, 0.662, -3.652]` | `[-0.517, 0.200, -3.652]` | 0.462 m |
  | 50 | `[0.056, 1.294, -4.124]` | `[0.056, 0.200, -4.124]` | 1.094 m |
  | 0 | `[0.763, 2.153, -4.387]` | `[0.763, 0.200, -4.387]` | 1.953 m |

  `cornerY − tackY` is 0.000 in all 36 states probed (AWA 110/150 × sheet
  0/50/100 × tackLine 0/50/100 × halyard 0/100, both tacks). The corner's plan
  position does track the sheet, x −0.52 to +0.76 and z −3.65 to −4.39. Its
  height moves 0.000 m.
- Mechanism, three lines. `kite.ts:594-597` `leechAt(y)` clamps `t` to 0 for
  every height below the clew, and `leechBulgeProfile(0) = 0`, so it returns the
  clew itself. `kite.ts:623-624` takes `const chord = Math.hypot(v[0], v[2])`,
  discarding the leech vector's y. `loft.ts:355-372` then builds every vertex as
  `luff + cd·x·chord + md·profile·chord` with `chordDir` and `camberDir` both
  y-zero (`conventions.ts:85,95`), so every section row is a horizontal slice at
  its luff's height. The mesh grows a vertical wall of cloth from the clew down
  to tack height, then hangs the 0.55 m skirt under that. The leech column
  measures 9.78 / 9.38 / 10.29 m at run / run-trim / run-ease against the
  published 8.800: 11-17 % of the drawn leech is cloth no published dimension
  pays for.
- Below the sheer. Mesh minimum y = −0.348 m (run), −0.498 (run-trim), −0.198
  (run-ease), against a sheer at y = 0 and `WATER_Y = -0.75` (`hull.ts:73`). The
  foot is drawn below deck level and within 0.25 m of the water, 4 m to leeward.
  No photographed boat puts the foot at the sheer, let alone under it.
- Measured on the render. `shots/desktop-run-leeward.png`,
  `shots/desktop-run-trim-leeward.png` and `shots/desktop-run-ease-leeward.png`
  show a flat trough, a squared-off aft corner and a short vertical wall below
  it. Masthead y = 122 px, sheer at the mast y = 362 px (8.5 m = 240 px,
  cross-checked against the hull's 6.91 m LOA at 190 px), kite's lowest orange
  y = 389 / 397 / 380 px for run / run-trim / run-ease. Below the sheer line in
  every state. `shots/crops/tr-astern.png` shows the scalloped notch with the
  hard vertical trailing edge above it.
- The clamp is wrong in both directions. At `kiteHalyard 0`, sheet 100, the clew
  really is below the tack (y −0.545 against tack 0.200) and the corner is
  clamped up to tack height and displaced up the leech line.
- The repo's own tests codify the defect. `kite.test.ts:497` asserts
  `foot[M-1][1]` is close to `tack[1]` to six places. `kite.test.ts:501`, in a
  test titled "ends the foot on the clew", asserts the corner is within 1 m of
  the clew and passes only because it runs at the MID / retracted-sprit state
  (0.601 m); at the trim the app opens on the same quantity is 1.094 m, and
  1.824 m eased.
- The drawn straight foot is the horizontal projection of the constructed
  5.700 m: 5.327 to 5.680 m across the sheet band.

**Impact.** The single largest geometric error in the gennaker, and the one a
sailor sees first. The picture shows a kite whose clew is on the deck and whose
foot drags at or below the sheer, which is the "this is a headsail, not a kite"
tell in its worst form. It also deletes the one behaviour `clewOnCircle` exists
to produce: `kite.ts:460-463` says easing the sheet lifts the clew about 0.3 m
per 10° of ease, and in the drawing the bottom of the sail never moves. The clew
lifts 1.45 m from run-trim to run-ease while the drawn corner lifts 0.30 m. Both
refutation passes confirmed at C, independently reproducing the probe. One
correction they returned: `kite.ts:460-463` is a doc comment, not shipped copy,
so the false statement lives in the source and the test name rather than in
user-facing text.

**Fix.** The loft has to carry the clew. Give `Section` a `riseM?: number` next
to `dropM` (the leech end's height less the luff end's), pchipped over `h`
exactly as `dropAt` is (`loft.ts:341-347`), and at `loft.ts:369` write
`positions[k+1] = p[1] + rise * x - drop * skirt(x)`, so the luff stays pinned
and the chord's outboard end lands at the leech's own height. In `kite.ts`,
parameterise both edges by the same knot rather than by height: add a
`leechPoint(t)` and in `sections` (`kite.ts:604-641`) take
`chord = Math.hypot(le[0]-luff[0], le[2]-luff[2])` and
`riseM: le[1] - luff[1]`. Keep `leechAt(y)` for `PlanView`, which traces the
identical curve over the clew-to-head span. `prov: derived`, no new number: it
makes the drawn surface carry the clew that the published leech and foot already
pin. Both passes implemented it and re-ran every published gate on both tacks at
sheets 0/25/50/75/100: `|corner − clew|` goes to 0.000 everywhere, leech arc,
half width, ORC area and the leech-bulge offsets are bit-identical, and mesh
minimum y rises from −0.348 to +0.200 / +0.083 / −0.138. Two companion test
edits are required in the same PR: `kite.test.ts:497` must be replaced by
`len(gridRow(mesh,0)[M-1], g.clew) < 0.02` at every sheet and tack-line setting,
and the skirt assertion at `kite.test.ts:643-647` must be restated as
perpendicular sag below the tack-to-clew chord, because the fixed foot row
climbs monotonically and `tack[1] − minY` becomes 0.000.

What this fix is not is a re-fit of the clew's height. Once the loft carries the
clew, the trimmed end of the band is still low: 0.08 of mast at sheet 100
against the photo floor of 0.12. Closing that is a second, smaller change to the
sheeting band or a flying-leech fraction, measured against the survey median of
0.19, and it belongs to a later P2 item rather than to this one. Do not bundle
them: this fix moves the picture 0.46-1.95 m and breaks no published constraint,
and a constant re-fit riding along would obscure that.

<a id="m-08"></a>
### M-08 — The foot skirt is twice the photographed sag, symmetric where the photos are not, and blended over the bottom 3.1 m of the sail

**Evidence.**
- `FOOT_SKIRT_M = 0.55` (`kite.ts:369`) is 0.065 of mast height. The survey puts
  the sag at 0.03-0.05 of mast (0.25-0.40 m) in 10 of 13 readable boats, with a
  single deepest reading of 0.08 (0.7 m, row E). 0.55 m sits above the top of
  the typical band, near the deepest boat in the set.
- Shape. `loft.ts:369` applies `drop * Math.sin(Math.PI * x)`, so the low point
  is at mid-chord. A probe measures the deepest foot column at chord fraction
  0.475 at every sheet setting. The survey reads the foot as lowest about a
  third aft of the tack, which is what a pinned tack and a free clew give.
- Span. `FOOT_SKIRT_SPAN = 0.3` is a fraction of the luff parameter, and
  `spine(0.3)[1]` is 2.690 m, so the drop is blended out over the bottom 32 % of
  the rig. `footSkirtM` still returns 0.444 m at h = 0.087 and 0.331 m at
  h = 0.130. (The finding as filed said 3.09 m and 36 %; the probe corrects it to
  2.690 m and 32 %, which does not move the point.)
- With C-02 unfixed the constant is not even the sag it names. The drawn foot
  row sits at constant tack height end to end, so 0.55 m is sag below a
  horizontal line while the photos measure sag below a rising chord. Measured
  against the true tack-to-clew line the drawn foot sags 1.25 m (run), 0.93
  (run-trim) and 1.82 (run-ease). `shots/desktop-run-trim-leeward.png` renders
  the foot on the water.

**Impact.** The foot reads as a bag dragging in the water rather than a free
edge with a shallow belly, and the belly is in the wrong place along the chord.
The two passes split on severity: the sailor lens dropped it to L on the grounds
that only the amplitude half is supported (in the two cleanest beam-on photos
the lowest cloth in the sail is the tack corner, so the "third aft" reading is
about absolute height rather than deviation from the chord, and a distributed
free edge sags maximally at mid-span whatever its end heights), and the code
lens held M. The audit holds M, because the amplitude alone is 1.4-2.2× the
photographed band on the constant's own stated meaning.

**Fix.** `kite.ts:369-370`: `FOOT_SKIRT_M` 0.55 → 0.35 (0.041 of mast, the
mid-band of the measured 0.03-0.05), `prov: derived` from the 2026-09-02 photo
survey. Leave `FOOT_SKIRT_SPAN` alone unless a measurement turns up: the survey
never measured the blend height, so a `prov: photo survey` tag on 0.15 would be
false labelling. If the peak is skewed aft as well, do not use `sin(π·x^0.63)`:
its slope is infinite at x = 0, giving a 25.6 mm drop 14 mm along the chord and
a kink with a normal swing right at the tack. A zero-slope skew is the same
picture without the cusp. Simulated at amplitude 0.35, span 0.15 and a skewed
peak: low point −0.348 → −0.150 m, deepest chord fraction 0.475 → 0.326, no
`kite.test.ts` assertion broken, cloth/rated 1.3152 → 1.2987 and still inside
the asserted (1, 1.35) band. Sequence this after C-02: the acceptance test
(deepest point 0.30-0.40 m below the straight tack-to-clew line) is not
satisfiable while the corner is pinned at tack height.

## Twist and the leech

<a id="h-12"></a>
### H-12 — The drawn foot-to-head twist is negative at reaching apparent wind angles, and the published twist constants do not reach the picture

Owner judgement: the two refutation passes split, and this is the audit's call
rather than a clean confirmation. The sailor lens could not refute it and
re-probed the same numbers to within a degree. The code lens refuted it, on the
framing (nothing hooks to windward) and, decisively, because the one-line fix
the original claim proposed is a measured no-op. Both halves of that are carried
below, and the finding is re-worded to what the probes actually show.

**Evidence.**
- The drawn section chords swing toward fore-and-aft going up the sail at
  reaching angles. `twistRad` at h = 0.97, in degrees, positive meaning the
  chord opens to leeward, at kiteSheet 0/25/50/75/100. First probe: AWA 69 →
  −9.9 / −18.7 / −26.0 / −31.8 / −36.4; AWA 93 → −6.1 / −12.4 / −17.4 / −21.3 /
  −24.1. Second probe, independently written: AWA 69 → −11.4 / −20.0 / −27.1 /
  −32.8 / −37.2; AWA 93 → −7.2 / −13.3 / −18.2 / −21.9 / −24.6.
- Not a degenerate-station artefact. At the well-conditioned heights, AWA 69
  sheet 100 gives −18.3° at h = 0.25 (chord 5.18 m), −29.2° at h = 0.50
  (4.55 m), −33.9° at h = 0.75 (2.99 m); AWA 69 sheet 0 gives −13.0 / −20.6 /
  −14.0; AWA 93 sheet 100 gives −12.9 / −19.8 / −22.7. The h = 0.97 chord is
  0.45-0.81 m, so that station alone would have been dismissible. These are not.
- The source the file cites measures the opposite sign. F1 gives +3 / +6 / +6 /
  +3° at 1/6 to 4/6 height at AWA 64, and a foot-to-top twist of about +4°
  (`docs/research/2026-08-25-spinnaker/02-flying-shape.md:46-52,73-74`), on the
  same metric the drawing uses, "the horizontal angle of the section chord
  relative to the foot chord" (`:43-44`). So the drawn twist is −20° to −36°
  across the trimmed three-quarters of the sheet band at AWA 69 where F1
  measures +4°. `buildSail` adds it back to `sheetRad` (`loft.ts:334`), so it
  round-trips into the drawn surface.
- Nothing hooks to windward. Probing leech-versus-luff athwartships offset at
  AWA 69, kiteSheet 100 gives dz = +2.97 / +1.91 / +0.85 / +0.32 / +0.10 /
  +0.02 m at h = 0.1 / 0.25 / 0.5 / 0.75 / 0.9 / 0.97, and the leech's deviation
  from the straight clew-to-head line is +0.04 to +1.74 m to leeward at every
  station and state probed. The leech is to leeward of the luff at every height.
  What is wrong is the chord azimuth, plus an upper leech drawn 1-2 m too far
  inboard, not a visible curl. `shots/crops/tr-astern.png` has the leech behind
  the mainsail and `shots/desktop-tr-leeward.png` is beam-on, so neither
  screenshot evidences anything either way.
- The published constants steer only the bulge direction.
  `TWIST_TRIM_DEG = 4` / `TWIST_EASE_DEG = 26` (`kite.ts:344-345`, the file's
  one bolded `published` tag) feed `bulgeDir = chordDir(sheetRad + twistTopRad)`
  at `kite.ts:578-579`. The drawn twist is emergent, computed at
  `kite.ts:625-626` as the `atan2` of `leechAt(luff[1]) − luff`, and the luff's
  bow swamps the bulge: `LUFF_FORWARD_FRACTION` 1.1 and `luffLateral(69) = 0.87`
  put mid-luff at x +3.79, z −1.48 while the bulge stands the leech off by only
  0.7-1.8 m.
- The running states are open, and they are the only ones tested.
  AWA 118 → +1.6 / −2.4 / −5.4 / −7.4 / −8.5; AWA 159 → +8.7 / +5.8 / +3.7 /
  +2.5 / +2.4. `doc 02:489` records the 2026-08-28 fix's drawn twist at
  three-quarter height as "2.3 deg -> 8.0 deg" and `:562` concludes "The
  direction is now right"; both probes reproduce those figures at AWA 159 and
  nowhere else. `kite.test.ts:657-703` asserts twist only at `AWA_RUN = 150`, so
  every reaching angle is unguarded, and `kite.ts:322-343`'s claim that the
  change made twist open with ease is unverified outside the run.

**Impact.** At the two reaching states the hero draws a sail whose sections
close toward the centreline going up, by 20-36° where the cited source measures
+4°, and the error worsens with trim. The doc comment on the file's only
published constant claims a range the drawing delivers nowhere on a reach.
Severity H rather than C on two grounds: nothing is drawn on the wrong side of
anything (the leech never crosses the luff), and the reaching states are not the
ones the trainer's downwind drills target, which are the run and the deep.

**Fix.** Not the one-liner. Both passes implemented the proposed per-height
azimuth verbatim (`leechAt` driven by `chordDir(sheetRad + twistTop·t)`,
`twistTop` 4° at AWA 64 rising to 26° at 124) and measured it: at AWA 69 sheet
100, h = 0.25 goes −18.3 → −18.4, h = 0.5 −29.2 → −29.4, h = 0.75 unchanged at
−33.9, h = 0.97 −37.2 → −36.9. Swept over AWA 60-175 × sheet {0,25,50,75,100},
the worst drawn twist goes from −37.92° to −37.95°, and at eased sheet it gets
materially worse (AWA 69 sheet 0, h = 0.97: −11.4 → −22.6). It also breaks the
shipped assertions at `kite.test.ts:675-701`, which go from trimmed 2.31 / mid
3.62 / eased 7.97 to 4.89 / 4.57 / 4.98, failing `mid > trimmed` and
`eased > 6`. The reason it cannot work is in the same probe: to zero the twist at
AWA 69 / sheet 100 / h = 0.75 the leech needs 2.49 m of outboard offset from the
luff and has 0.32 m, against a bulge ceiling of 0.66 m even aimed fully
athwartships; at h = 0.5 the requirement is 3.75 m against a 0.56 m ceiling.
Re-aiming a metre of bulge cannot cover a 2-4 m deficit.

What this needs is a design pass, sized as its own phase. The leech's per-height
azimuth has to be driven by a published twist profile, with the term that
actually sets dz at mid and upper heights (`LUFF_FORWARD_FRACTION` and the
luff bow's athwartships split) moving with it, and the emergent twist asserted
positive and monotone from h = 0.25 to h = 0.97 at AWA 69, 93, 118 and 159. Two
constraints on that pass. It must not silently follow F1 against the survey:
F1's trend is more twist running, the photo survey reads twist as larger
reaching and squarer running, and CLAUDE.md requires both shown with the delta.
And if the section-chord metric is kept, the comment must say that it is
contaminated by the luff's forward projection and is not the leech angle a
sailor reads off the water.

## Constants, documentation and tests

<a id="m-09"></a>
### M-09 — `kite.ts` and `ASSUMPTIONS.md` make three claims about the clew that the code contradicts

**Evidence.**
- (a) `kite.ts:589-590` says that trimmed the clew "hangs a little below" the
  tack's height and eased it climbs above. Probe over the full 5 × 3 sheet and
  tack-line grid at full hoist: `clew.y − tack.y` runs from +0.332 (sheet 100,
  tackLine 0) to +2.028 (sheet 0, tackLine 100). Fifteen states out of fifteen
  the clew is above the tack, minimum gap a third of a metre. It goes below only
  under-hoisted, at halyard 0, 25 and 50. So the clamp the sentence calls the
  exception is the only branch that ever runs at a sailed state. The same false
  sentence is repeated at `kite.test.ts:495-497`, so a doc fix has to touch
  both.
- (b) `ASSUMPTIONS.md:288-290` says the skirt keeps "both corners still pinned
  so no published dimension moves". Of the skirt that is true: `drop *
  Math.sin(Math.PI * x)` is exactly zero at x = 0 and x = 1. But a published
  dimension does move, from the loft's horizontal chord rather than from the
  skirt: the drawn straight foot measures 5.327 to 5.666 m at tackLine 100
  across the sheet band against the published `FOOT_M` 5.700, 5.7 % short at
  full ease. The row still leaves a reader believing the drawing's foot runs
  tack to clew. The repo's own harness cannot see it either: `measureOf`
  (`kite.test.ts:143`) takes `sfl = len(g.tack, g.clew)` off the geometry, not
  off the mesh, so the ORC-area and half-width fits are computed on the ideal
  5.700 while the picture carries 5.33-5.67.
- (c) `kite.ts:190-193`, `:306-311` and `ASSUMPTIONS.md:269-271` fit
  `LEECH_BULGE_TRAVEL_M` so that "the clew's rise across the band is 1.42 m
  against Deparday's measured 1.4 m". The rise is real in `kiteGeometry`
  (0.678 → 2.101 m = 1.423 m) and the drawn corner's rise across the same band
  is exactly 0.000 m, provable by construction rather than only by probe. It is
  not wholly invisible: the same leech-chord change swings the corner 0.95 m
  horizontally, and the vertical part reappears as the length of the clamped
  vertical wall below the clew, which is an artefact rather than a rising
  corner.

**Impact.** Three numbers whose stated justification does not survive contact
with the code, which is exactly what CLAUDE.md's provenance rule exists to
catch. Anyone re-tuning the bulge later re-fits it against a clew rise the
picture does not perform, and the `ASSUMPTIONS` row keeps telling a reader both
corners are pinned while the drawing's aft corner is a metre low. Both passes
held M, one noting it is at the top of its range: the visible consequences all
belong to C-02.

**Fix.** Fix the loft first. (b) and (c) become true word for word once the
drawn corner lands on the clew, so no prov tag needs rewriting and the
`LEECH_BULGE_*` fit does not need redoing. What needs editing regardless of the
loft is the single clause at `kite.ts:589-590` and its twin in the test name:
replace with the measured statement, that the clew sits above the tack at every
full-hoist state, 0.33 m trimmed to 2.03 m eased, and that the clamp is why the
sections between the two heights all end at the clew. `prov: derived`,
`clewOnCircle` on the published `LEECH_M` / `FOOT_M` pair, no new number. The
assertion proposed in C-02 (drawn corner equals clew) is what stops (b) and (c)
drifting apart again.

<a id="m-10"></a>
### M-10 — `FLYING_CHORD_FRACTION`, `KITE_CHORDS` and `kiteGirthM` are dead, and their doc comments claim they set the silhouette

**Evidence.**
- `kite.ts:605` calls `sectionStack(shape, KITE_CHORDS)` and consumes it at
  `:606-619` only to pchip camber, draft position and entry angle. `loft.ts:234-260`
  shows `sectionStack` puts `chords.*` into `chord` alone. `kite.ts:623-624` then
  recomputes `chord` from the geometry for all 33 drawn sections, and that is the
  only chord `buildSail` ever sees.
- Probe, stack chord against drawn chord at AWA 118: h 0 → 4.845 / 5.597;
  h 0.25 → 5.361 / 6.298; h 0.5 → 4.726 / 6.041; h 0.75 → 2.939 / 4.286. Not one
  station matches, and the distribution differs as well as the scale: the ORC
  parabola gives girth(0.75)/girth(0) = 0.61 where the drawn sail gives 0.80.
- `KiteGeometry.chords` (`kite.ts:648`) has no reader.
  `grep -rn "chords" src --include=*.ts --include=*.svelte` returns only
  `rig3d`'s `MAIN_CHORDS`/`JIB_CHORDS`, `loft.ts`'s own parameter, local
  variables in the tests, and `kite.ts`'s own definition.
- The doc comments are false as written: `kite.ts:106-107` says the 0.85 "scales
  every station equally, so the silhouette's proportions are the sail
  definition's", and `:113-115` says "the drawn silhouette and the solver's area
  come off one distribution rather than two guesses". The silhouette comes off
  the luff parabola and `leechAt`.
- `kite.test.ts:170-182` restates `chordAt`'s own body and cannot fail. Half of
  that block is real, though: `:163-166` checks the parabola against
  `data/boats/j70.json`'s `footMm` and `halfMm`.

**Impact.** Dead code carrying prov tags, plus two stale sentences and a
tautological test. The two passes split on whether that is a provenance breach:
the code lens dropped it to L because `ASSUMPTIONS.md:213-224` already discloses
the discard verbatim ("it feeds `sectionStack`, whose chord field
`kiteGeometry.sections` then discards"), so CLAUDE.md's rule is met and only
`kite.ts`'s own comments are out of date. The audit holds M for the tautological
test, which CLAUDE.md bans outright, and because nothing flags the dead field.

**Fix.** Delete `FLYING_CHORD_FRACTION`, `chordAt`, `KITE_CHORDS`,
`KiteGeometry.chords` and `kite.test.ts:160-186`, keeping the `:163-166` fit
check against the boat file. Make `sectionStack`'s `chords` parameter optional
rather than changing its shape, since `rig3d`'s main and jib still pass it.
Replace the `ASSUMPTIONS.md` "Chords" block with one line saying the drawn kite
has no chord distribution. Deleting cannot move a vertex, because the values
never reach one, and it touches none of leech 8.8, foot 5.7, luff 10.8 or half
width 5.56. Do not take the other option on offer, making `kiteGirthM` a girth
target that a leech-standoff solver hits: that is a real design change and
should not ride in on a dead-code cleanup.

<a id="m-11"></a>
### M-11 — `BARE_SPAR`'s doc comment says rake and bend do not project into a plan view; they do, and the plan's head is 0.41 m forward of the 3D hero's

**Evidence.**
- `kite.ts:433`: "An unraked, unbent spar: rake and bend do not project into a
  plan view." `PlanView.svelte:132-136` repeats it in prose, then gives the real
  reason, bundle weight, and `:152` passes `BARE_SPAR` to `kiteGeometry`.
- The statement is geometrically false. `rig3d.ts:91-95` builds the mast as
  `[(bendMm - rakeMm*f)/1000, mastLenM*f, 0]`, a pure x displacement, and x is
  fore-and-aft, one of the plan's two drawn axes. Only heel drops out of a plan.
- Probe at `rakeMm` 420: masthead is `[-0.406, 8.5, 0]` on the real rig against
  `[0, 8.5, 0]` on `BARE_SPAR`, identically at all six states, and mid-luff
  differs by 0.284-0.311 m fore-and-aft. Through the plan's fore-aft scale
  (`KITE_SCALE_X` 25.2137 px/m) that draws as 10.24 px, or 0.487 hull-metres
  against a hull drawn 145.5 px long.
- Nothing tests the two projections against each other. `kite.test.ts` imports
  both `BARE_SPAR` and `rig3d` and never builds a kite on one to compare with
  the other.

**Impact.** The plan and the 3D hero draw the head of the same sail 0.41 m
apart, and the codebase asserts in two places that they cannot. The passes split
on severity: the sailor lens held L, since everything a sailor reads off the
plan is unchanged (the clew moves 2 mm fore-and-aft and 14 mm in height, the
tack stays on the sprit, the foot is untouched) and the displaced vertex lands
under the mast dot among the boom root and sheet lines, resolvable only at a 4×
crop. The code lens held M. The audit holds M: it is a provably false doc
comment standing as the justification for a half-hull-metre disagreement between
two drawings of the same sail, at every state, with no test guarding it.

**Fix.** Make the bare spar a function of the solved rake:
`bareSpar(rakeM) = { mast: [[0,0,0],[-rakeM, MAST_LEN_M, 0]], masthead: [-rakeM, MAST_LEN_M, 0] }`.
`PlanView` already holds `race.result` (`:149`) and so has the rake to hand
without pulling in the 3D chunk. Measured: the head gap closes to 0.014 m and
mid-luff to 0.010-0.011 m at all six states, no published constraint moves (foot
5.700 m exactly, luff arc 10.472-10.550 m), and every `BARE_SPAR`-dependent
assertion in `kite.test.ts` plus `boat.test.ts:433`'s viewBox bound still
passes. Two caveats. The residual is bend, not rake, and it grows as the halyard
eases (0.014 m at halyard 100 to 0.054 m at halyard 0), so state the assertion
`|plan head x − 3D head x| < 0.05 m` at full hoist. Changing a const to a
function touches four call sites; `panels/Gennaker.svelte:52` can keep an
unraked default, since its curl cue is a function of sheet ease alone. If the
fix is not taken, the comment and `PlanView`'s prose must name what is dropped
and by how much, and the `ASSUMPTIONS` plan-view bullet must carry the number.

<a id="m-12"></a>
### M-12 — The sheeting band, the twist pair, the luff AWA endpoints and the curl threshold have no `ASSUMPTIONS.md` rows, and the gennaker block points at a section that does not exist

**Evidence.**
- `grep` over `ASSUMPTIONS.md` returns 0 hits each for `SHEET_TRIM_DEG`,
  `SHEET_EASE_DEG`, `TWIST_TRIM_DEG`, `TWIST_EASE_DEG`, `LUFF_LEEWARD_AWA_DEG`,
  `LUFF_WINDWARD_AWA_DEG`, `LUFF_CROSSOVER_AWA_DEG` and `CURL_EASE_THRESHOLD`,
  against 1 hit each for `FLYING_CHORD_FRACTION`, `TACK_MIN_M`,
  `TACK_TRAVEL_M`, `HALYARD_DROP_M`, `LUFF_FORWARD_FRACTION`,
  `SAG_MAX_FRACTION`, `LEECH_BULGE_MIN_M`, `LEECH_BULGE_TRAVEL_M`,
  `FOOT_SKIRT_M` and `FOOT_SKIRT_SPAN`. The values are absent too, not just the
  identifiers: 40/55, 4/26, 64/141, 102.5 and 0.55 appear nowhere in the
  gennaker block (`:208-320`), whose only relevant prose is
  "chordDir(sheetRad + twist)", "a published twist range" and "the whole sheet
  band". `ASSUMPTIONS.md:212` claims "the tags are per constant", so the block
  asserts a completeness it does not have.
- `ASSUMPTIONS.md:252` says "see **Leech twist** below". That line is the only
  hit for the string in the file. The heading exists only in
  `docs/plans/2026-08-28-downwind-fidelity/README.md:87`. The code's own pointer
  is fine: `kite.ts:318` says "see `TWIST_TRIM_DEG`", which resolves.
- `kite.test.ts:438` reads "`LEECH_BULGE_TRAVEL_M` = 0.45 m" against
  `kite.ts:321`'s 1.1, and the following two lines narrate the change backwards
  ("the travel came down"): it went 0.7 → 1.1, which `ASSUMPTIONS.md:264` records
  correctly. Wrong in value and in the direction of the change, on the comment a
  reader would use to sanity-check the shoulder work.
- Two corrections to the finding as filed. `LEECH_BULGE_PEAK_EXPONENT` is in the
  register in its formula (`ASSUMPTIONS.md:251-252`, "on `sin(π·t^1.6)` (peak
  ~65 % of the leech)"); only the identifier is missing, so it belongs on a
  name-the-constant note rather than the missing-row list. And the twist pair is
  the file's only `published` tag on bold formatting alone: `kite.ts:85` and
  `:200` are also tagged published, unbolded.

**Impact.** CLAUDE.md's hard rule is met, since every one of these constants
carries a `prov:` tag in `kite.ts`. What fails is the register that advertises
itself as the per-constant index, and it misses the sheeting band, which decides
where the clew is, and the twist pair, which is the pair a reader chasing the
file's published tag has come for. The dangling cross-reference sends them
nowhere. Both passes held M, at the low end: docs hygiene, no sailing defect.

**Fix.** Transcription only; every number is already sourced in `kite.ts`. Add a
"Sheeting angle band" bullet (`SHEET_TRIM_DEG` 40 / `SHEET_EASE_DEG` 55,
assumed, with the note that `clewOnCircle` removes the clew's distances from the
choice so these only pick an arc, and the 18-89° achievable range already stated
at `kite.ts:177-178`), and a "Leech twist" bullet (`TWIST_TRIM_DEG` 4 /
`TWIST_EASE_DEG` 26, published, F1 Fig 3.3 via research doc 02 §2c), which is
the heading `:252` already points at. Give `CURL_EASE_THRESHOLD` its own line,
since a user-visible cue keys off it. The AWA endpoints (64/141, published) and
the crossover (102.5, derived) need their own bullet rather than folding into
the existing one, which is titled "Luff sag magnitude" and correctly says the
direction leaves the magnitude untouched. Fix `kite.test.ts:438-441`. Nothing
here moves a constant, so no gate flips and no assertion changes.

<a id="l-03"></a>
### L-03 — The windward-luff claim is only tested at an AWA the app reaches above TWA 165, and three of that test's assertions restate the formula's own definition

**Evidence.**
- `kite.test.ts:44` sets `AWA_RUN = 150` and every luff-side and flying-shape
  assertion runs there. Solved through the real worker at TWS 12 on
  `baseRaceDown`, the app's apparent wind angle is 69.3 / 93.2 / 118.1 / 159.1 at
  TWA 110 / 135 / 150 / 170, so AWA 150 corresponds to about TWA 166.
- `luffLateral` clamps to exactly −1 for all AWA ≥ 141 (`kite.ts:237-241`), so
  the only windward-side assertion runs at the saturated end. At the run the app
  actually draws, AWA 118, `luffLateral` is −0.403 and the mid-luff sits
  0.75-0.92 m to windward, against 1.75 m clamped. AWA 159 gives −1.000 too, so
  the deep state adds no independent coverage.
- The regression is demonstrable. Change `LUFF_WINDWARD_AWA_DEG` from 141 to 170
  and nothing else: every shipped assertion in the luff-side test passes, while
  `luffLateral` at AWA 118 goes −0.403 → −0.019, putting the luff on the
  centreline at the primary running state. The second pass showed the same for
  halving the excursion, which leaves `shw`/half at 0.932-1.000 and 0.886-0.977,
  inside the asserted 0.9-1.1 and 0.85-1.2 bands.
- `kite.test.ts:329-331` asserts `luffLateral` at the leeward, windward and
  crossover endpoints returns 1, −1 and 0. All three restate how the ramp is
  built at `kite.ts:237-241` and cannot fail unless the algebra is mistyped.
  `kite.test.ts:301-302` asserts `SHEET_TRIM_DEG > 18` and `SHEET_EASE_DEG < 89`
  against two retyped literals rather than against the circle's achievable arc.

**Impact.** The claim the sail's whole downwind identity rests on, luff to
windward on a run, is held only where the model saturates. Nothing user-visible
is wrong today: the drawn run is defensible against the photos, and 0.82 m of
windward excursion at TWA 150 sits between row L ("at or just to leeward of the
mast line") and row M ("rotated about 2 m to windward"). The exposure is the
missing guard. Both passes held L.

**Fix.** Add AWA 118 and 93 to the luff-side test with magnitude bands, not just
signs, plus one spine-magnitude assertion at AWA 118 so the direction and
magnitude cannot change independently. Source the bands from the two published
endpoints, `prov: derived` from `LUFF_LEEWARD_AWA_DEG` 64 and
`LUFF_WINDWARD_AWA_DEG` 141: photo M is a dead-astern run at about AWA 159, the
clamped end, so it cannot source a band at 118, and no reaching photo in the
survey carries a metric athwartships luff offset at all. Do not replace the
`SHEET_*_DEG` check with the achievable arc: sweeping θ over 0-180° at the app's
tack, head and leech chord, `clewOnCircle` returns a valid clew at every step,
so the arc is the whole half-circle and the replacement would be weaker than the
18/89 guard. Re-base it instead on the clew being strictly to leeward and abaft
the sprit tip, which fails at θ = 0 and θ = 180 where the clew lands on the
centreline.

## Checked and holds

- **Tack height.** `TACK_MIN_M` 0.05 plus `TACK_TRAVEL_M` 0.3 gives a drawn band
  of 0.05-0.35 m, 0.20 m at the shipping default, against a photographed median
  of 0.03 of mast (0.25 m) and a range of 0.01-0.05 (0.085-0.425 m). Inside the
  band at both ends.
- **Clew fore-and-aft.** Drawn x runs −0.52 m (sheet 100) to +0.76 m (sheet 0)
  relative to the mast, against "abeam the mast to just aft of the shrouds,
  never near the transom" in the six beam-on photos and "slightly forward" in
  rows F and H.
- **Luff side against AWA.** `luffLateral` gives +0.87 at AWA 69 (to leeward),
  +0.25 at 93 (still to leeward), −0.40 at 118 and −1.00 at 159 (mid-luff 1.55 m
  to windward). That tracks the survey: 11 of 14 read "to leeward", K reads
  centreline, L "at or just to leeward", M about 2 m to windward on the one clean
  dead-astern run. `LUFF_CROSSOVER_AWA_DEG` 102.5 lands sensibly once solved AWA
  is used rather than TWA.
- **Kite visible both sides of the main from astern.** At TWA 150 the kite spans
  z −4.13 to +0.79 against the main's −2.65 to 0, so it shows outboard of the
  main's leech and to windward of the mast. An astern silhouette raster puts the
  kite at 2.3× the main's projected area with 35-47 % of it behind the main; the
  occlusion is a consequence of the low corner (C-02), not a separate defect.
- **Plan clew side.** The plan draws the clew to leeward on both tacks, and both
  heroes key off `aero.awaDeg`, so they never disagree about which side the luff
  bows to.
- **Straight foot inside the class dimension.** The drawn straight foot stays
  within the class 5.700 m at every state (5.42-5.67 m). It is short, which is
  C-02's evidence, never long.
- **The published-dimension tests are real.** Leech cloth length, class half
  width, ORC area and the camber band are genuinely asserted, non-tautologically,
  against published numbers, and the plan polygon's world-frame extents match the
  lofted mesh's top-down extents to within 0.22 m, so omitting section camber from
  the plan outline costs little.

## Checked and not reported

Read `kite.ts` in full including every doc comment and prov tag, `loft.ts`
(`sectionStack`, `buildSail`, `dropM`, the pchip), `conventions.ts`
(`chordDir`/`camberDir`/`lee`/`STEM_X`), `rig3d.ts`, `PlanView.svelte`'s
`kiteSail`, `toPlan`, viewBox and explainer copy, `boat.ts`'s `PLAN_LAYOUT`,
deck and `MAST_STATION`, `SailView3D.svelte`'s kite wiring and caption,
`src/core/shape/flying.ts`'s `asymShape` and `ASYM_*` arrays,
`panels/Gennaker.svelte`, `downwind.ts`, `explain.ts`, `explainDetail.ts`, all 30
tests in `kite.test.ts`, `boat.test.ts`'s gennaker fit test, the gennaker and
plan-view blocks of `ASSUMPTIONS.md`, and `data/boats/j70.json`. Probes were
throwaway vitest files under `src/ui/three`, run and deleted: drawn corner
against `kiteGeometry().clew` over 36 sheet, tack-line, halyard and AWA
combinations on the real rig and on both tacks; per-row girth, drawn twist per
height, mesh minimum y and ORC `SHW`/area using `kite.test.ts`'s own `measureOf`;
an astern silhouette raster for kite-versus-main occlusion; a self-intersection
count on `PlanView`'s exact polygon; plan-projection scales and per-state polygon
bounding boxes against the asym viewBox on both tacks; `BARE_SPAR` against
`rig3d`; `clewOnCircle` swept over sheeting angle; and full simulations of the
C-02, M-08 and M-11 fixes against every published gate. Correct and not
reported: halyard, sprit and tack-line directions all move the picture the way
ADR 0017 claims; determinism holds, with no `Math.random` or `Date` in the path;
the foot skirt is a pure y-drop and correctly absent from the plan; and the clew
is drawn 3.65-4.43 m off the centreline against dead-astern photo readings of
2.0 and 2.7 m, which the survey flags as lower bounds, so the photos are
understated rather than the app wrong. Not covered by this document: heel, port
tack mirroring, the mainsail's own shape, anything in `src/core` beyond
`shape.asym`'s constants, aero and telltale behaviour, the 3D shading and stripe
rendering, `LuffCurl`'s own schematic, and mobile layout.
