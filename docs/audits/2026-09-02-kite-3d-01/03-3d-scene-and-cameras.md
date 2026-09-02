# 03 — 3D scene, cameras and telltales

*Scope: the 3D hero at 1440×900 and 390×844, all five camera presets across the
nine states. Shots `shots/desktop-<state>-<preset>.png` (45 desktop), the phone
helm, astern and leeward shots, and `shots/desktop-<state>-page.png` for the
band. Files: `src/ui/three/SailView3D.svelte`, `src/ui/three/presets.ts`,
`src/ui/three/hull.ts`, `src/ui/three/rig3d.ts`, `src/ui/three/kite.ts`,
`src/ui/three/conventions.ts`, `src/ui/race/ConditionsBand.svelte`,
`src/ui/race/store.svelte.ts`, `src/ui/race/boat.ts`, `data/boats/j70.json`.*

## Scene state

<a id="c-01"></a>
### C-01 — The sail-plan crossing is wired to one of its two entry points, and only in one direction

Hoisting the kite from the conditions band eases nothing, and dropping it never
restores the mainsheet, so both pictures can draw a trim the boat cannot be in.

**Evidence.**
- `src/ui/race/ConditionsBand.svelte:63-65`
  `function toggleSail(): void { conditions.sailset = condition.sailset === 'asym' ? 'jib' : 'asym'; }`,
  wired to the SAIL cell at `:238` via `onactivate={editable ? toggleSail : undefined}`,
  with `conditionsEditable = true` by default (`InstrumentBar.svelte:336`). It
  assigns the sail set and nothing else.
- The only easing hook is `RaceStore.hoistKite()`
  (`src/ui/race/store.svelte.ts:513-517`). `grep -rn "hoistKite" src/` returns
  exactly two callers: `store.svelte.ts:529`
  `if (p.sailset === 'asym' && conditions.sailset !== 'asym') this.hoistKite();`
  (the point-of-sail chip, asym direction only) and `App.svelte:81` (the share
  link). Nothing anywhere assigns `BASE_RACE.mainsheet` back when the kite comes
  down; `Race.svelte:216,224` are the Reset buttons, not the crossing.
- Both views read the same number regardless of sail plan:
  `SailView3D.svelte:893` `boomAngle(controls.mainsheet, controls.traveller)`
  and `PlanView.svelte:85`. Running the formula at `boat.ts:166-171` against
  `data/boats/j70.json` gives 19.60° at `baseRace.mainsheet 60, traveller 0` and
  67.41° at `baseRaceDown.mainsheet 15`.
- The toggle also leaves TWA untouched, so tapping SAIL at close-hauled hoists a
  gennaker on a beat with the boom at 19.6°.

**Impact.** Drag the rose to 150 and tap SAIL, and the hero draws a J/70 with
the kite flying and the boom 20° off the centreline: the main's leech inside the
kite's, the asym dead behind the mainsail. That is exactly the bug
`hoistKite`'s own docstring (`store.svelte.ts:502-512`) says it fixed, reachable
from a second control. The two refutation passes split C against H, the sailor
lens noting that the reverse leg is not the disaster the original claim made of
it: a J/70 at 150° TWA with the kite down and the boom out at 67° is a real
trim, and the app's shipped beam-reach default already draws a near-centreline
boom (`shots/desktop-br-top.png`, `shots/desktop-br-plan.png`).

**Fix.** One `setSailSet(next)` on `RaceStore` that `ConditionsBand.toggleSail`,
`setPointOfSail` and `App.svelte:81` all route through, with the crossing logic
in it: on jib→asym `Object.assign(race, BASE_RACE_DOWN)`. Leave the asym→jib leg
alone rather than restoring `BASE_RACE.mainsheet`, which would strap the boom to
19.6° the moment the kite comes down at 150° TWA. Keep `hoistKite`'s existing
`remember()` so the change stays undoable.

Related, and filed on the plan view because it is one root cause across both
pictures: the bowsprit is drawn fully extended in the 3D scene too
(`src/ui/three/rig3d.ts:127`). See [M-01](02-plan-view.md#m-01).

## Cameras and framing

<a id="h-10"></a>
### H-10 — "Up the luff" puts the camera under the water at every state

The `luff` preset's sight line points downward, so the fit walks the eye below
the surface: the boat is seen from beneath the keel, with no sea and no horizon.

**Evidence.**
- All nine desktop luff shots (`shots/desktop-ch-luff.png`,
  `shots/desktop-cr-luff.png`, `shots/desktop-br-luff.png`,
  `shots/desktop-tr-luff.png`, `shots/desktop-brk-luff.png`,
  `shots/desktop-run-luff.png`, `shots/desktop-deep-luff.png`,
  `shots/desktop-run-trim-luff.png`, `shots/desktop-run-ease-luff.png`) show grid
  lines crossing the whole frame including above the masthead, no water surface
  anywhere, and the hull rendered as its underbody. A zoom of
  `shots/desktop-ch-luff.png` over x 560-760, y 260-450 shows the grid drawn
  across the hull, so the grid plane is between camera and boat.
- Mechanism: `src/ui/three/presets.ts:53` `luff: { position: [4.2, 0.9, 1.1],
  target: [-0.6, 6.2, 0] }` gives a unit direction of (0.667, −0.736, 0.153).
  `SailView3D.svelte:494-503` discards the authored position, keeps the
  direction, and places the eye at `target + dir · fitDistance`, so the camera
  descends 0.74 m for every metre it backs off. From the apparent sail height
  (66 % of a 42° vertical FOV over ~10.5 m) the fit distance is about 21 m, so
  the eye sits near y = −11.5 against `WATER_Y = -0.75` (`hull.ts:73`).
- The sea vanishes because the water is a `MeshBasicMaterial` plane with default
  `FrontSide` (`SailView3D.svelte:316`), back-face culled from below; only the
  `GridHelper` line segments survive. `OrbitControls.maxPolarAngle` was relaxed
  to `0.9 * PI` (`SailView3D.svelte:1034`), so nothing stops it.
- `luff` is the only preset today with a negative direction y: `helm` is exempt
  from the fit (`:499`), and astern (`presets.ts:48`), leeward (`:52`) and top
  (`:57`) all sight level or upward.
- Occlusion is worst under the kite: in `shots/desktop-run-luff.png`,
  `shots/desktop-deep-luff.png` and `shots/desktop-run-trim-luff.png` the hull's
  underside sits directly over the kite's tack and lower luff, the region the
  chip hint is selling. Framing is poor independently of the viewpoint, with the
  sail plan about a fifth of the card width.

**Impact.** The chip reads "Up the luff" and its hint promises "From the tack
looking up: reads entry angle and twist together" (`presets.ts:33`). What is
drawn is a view from roughly 11 m below the keel with no horizon, so neither
entry nor twist is readable and heel, the thing `SailView3D.svelte:312` says the
water exists to show, cannot be read at all. Both refutation passes held this at
H on the grounds that nothing false is taught about the sails, and the audit
agrees: one of five chips renders an unusable picture unconditionally, in every
state and at every viewport, but it reads as a rendering failure rather than a
false lesson.

**Fix.** Clamp after the fit, at the single shared choke point in `presetPose`
(`SailView3D.svelte:498-503`): once `pos` is computed,
`pos.y = Math.max(pos.y, WATER_Y + 0.5)` using the `WATER_Y` already imported at
`:60`, re-normalising the direction and re-fitting so the framing survives.
Apply the same clamp in the `ResizeObserver` refit at `:1056`, or a layout change
re-submerges the eye. Re-posing `presets.ts:53` does not fix it on its own,
because `presetPose` preserves only the direction. Add a camera spec asserting
`presetPose(id, side)[0].y > WATER_Y` for all five `PRESET_ORDER` ids at both
tacks; there is no such assertion today.

<a id="h-06"></a>
### H-06 — "Helm" is exempt from the fit and from the re-fit, so only the top third of the main is in frame

The first chip in the row uses its authored pose verbatim at every aspect ratio.
The hull and boom fall off the bottom edge while half the canvas is empty sky.

**Evidence.**
- All nine desktop helm shots plus `shots/phone-ch-helm.png`,
  `shots/phone-run-helm.png`, `shots/phone-run-ease-helm.png`,
  `shots/phone-brk-helm.png`. Measured ink bounding boxes over the 1292×396
  canvas: every helm shot's ink runs to the last row (maxy = 395), so the sail is
  cut by the canvas edge, while the top of the ink starts at row 179-232, i.e.
  45-59 % of the frame is empty above the boat. Height fractions: ch 0.48,
  cr 0.45, br 0.53, tr 0.41, brk 0.51, run 0.54, run-trim 0.54, run-ease 0.54,
  deep 0.55, against 0.80-0.83 for Astern.
- Cause: `SailView3D.svelte:499` `if (id !== 'helm')` exempts it from the fit,
  and `:1056` `if (orbit && preset !== 'helm')` exempts it from the resize
  re-fit, so `presets.ts:41` (`position [-3.4, 1.0, -0.9]`, `target
  [-1.3, 5.5, 0.3]`) is used unchanged. That pose cannot work: from an eye 3.4 m
  aft of the mast heel and 1.0 m up, the masthead subtends 72° above horizontal
  and the gooseneck −2°, a 74° span, against `camera.fov = 42`
  (`SailView3D.svelte:344`). No aim angle contains both.
- `shots/phone-ch-helm.png` shows the pose degrading as the viewport narrows:
  the main's leech is cut by the left edge as well as the bottom, which is the
  direct consequence of the re-fit exemption.
- The helm frame carries no horizon or water at all, so there is no attitude or
  heel reference either.

**Impact.** The default-looking first chip gives a picture with no boat in it:
no deck, no boom, no gooseneck, no traveller. Its hint promises "the trimmer's
own view of leech and draft", and leech twist cannot be judged without the boom
end, nor draft position from the top third of the sail. Widening the window
never improves it.

**Fix.** Drop both exemptions (`SailView3D.svelte:499` and `:1056`) so helm goes
through `fitDistance` like the others, and re-pose it in `presets.ts:41` with a
shallow upward sight line that survives the fit, for example
`helm: { position: [-6.4, 2.0, 1.8], target: [-1.2, 4.6, 0] }` (about 24° of
elevation, over the helmsman's shoulder rather than an eye at the tiller). Pair
it with the water clamp from H-10, since `fitDistance` only backs the eye off
along the existing direction. Update `PRESET_HINT.helm` to say "over the helm".
Assert in the camera spec that the fitted pose contains both the boom end and
the masthead, by projecting each and requiring `|ndc.y| < 1`.

<a id="m-02"></a>
### M-02 — `fitDistance` fits one union AABB, so the boat fills 62-72 % of the hero on the oblique presets

Half the corners of a single boat-shaped bounding box are empty air, and the fit
frames those corners instead of the silhouette.

**Evidence.**
- Measured ink height fractions of the 396-row canvas: top-down 0.64-0.69, luff
  0.62-0.72, gennaker leeward 0.67-0.72, against Astern's 0.80-0.83.
- `SailView3D.svelte:437-448` unions every mesh's world AABB into one box and
  `:465-489` fits that box's eight corners. For this boat the box is about 8 m
  long, 10.3 m tall and 5 m wide, and the bow-at-masthead-height and
  transom-at-keel-depth corners are empty. Worked example for Top-down: the pose
  direction (`presets.ts:57`) is 53° above horizontal, so the box's
  screen-vertical extent is 10.3·cos 53° + 8·sin 53° = 12.4 m against a real
  silhouette of about 8.5 m; 8.5 / 12.4 = 0.69, which is the measured value to
  two places.
- Astern's hull reaches row 444 of a canvas ending at 448, so the fitter does
  push to the edge when the box happens to be tight along the view axis. That
  rules out an intentional margin, against a `FIT_MARGIN` of 1.06.
- Scope correction from the second pass: leeward is affected only at the
  gennaker states (tr 0.67, brk 0.71, run 0.72, deep 0.72); upwind it measures
  0.79-0.83, on par with Astern. Luff and Top-down are affected at every state.
  Phone shows the same shortfall (`shots/phone-brk-leeward.png`, about 0.69 of
  canvas height).

**Impact.** On a 1310 px hero the sails come out roughly 30 % smaller in height
than the code intends, with dead margin above and below. Draft stripes, telltale
ribbons and the leech curve all lose resolution for nothing.

**Fix.** Have `fitBoat` collect a point cloud instead of one box: in the
`traverseVisible` callback push the eight corners of each mesh's own
world-transformed bounding box into a reusable `Vector3[]` (the mast box, hull
box and each sail box are individually tight), and iterate that array in
`fitDistance` in place of the `for (let i = 0; i < 8; i++)` loop. Same closed
form, about 80 points, `FIT_MARGIN` unchanged. It is not a full recovery: the
hull's own box still supplies the transom corner, so top-down improves to
roughly 0.79 rather than to 0.94.

<a id="m-03"></a>
### M-03 — The 3D stage is a 3.3:1 letterbox for a subject that is tall and narrow

The desktop hero gives the picture 1292 px of width and the boat uses 3-20 % of
it, while the fit is already working as designed vertically.

**Evidence.**
- Stage geometry from `shots/desktop-ch-page.png`: x 108-1420, y 396-790, about
  1312×394, i.e. 3.33:1.
- Measured ink width fractions across the 45 desktop 3D shots: astern 0.06-0.13,
  top 0.06-0.12, luff 0.07-0.16, leeward 0.18-0.20, helm 0.23-0.35.
  `shots/desktop-ch-astern.png` and `shots/desktop-run-astern.png` draw a boat
  roughly 130 px wide in a 1292 px frame. Vertical fill is about 80-82 % in the
  same shots, so `SailView3D.svelte:466-489` is fitting maximally and the waste
  is the slot's aspect ratio.
- The purpose conflict is direct: `presets.ts:51-53` poses Leeward to read
  camber and draft position, and `shots/desktop-ch-leeward.png` gives that sail
  about 120 px of chord.

**Impact.** The picture is the product, and it is rendered at roughly a tenth of
the width it has been given, with most of the hero showing empty water.

**Fix.** Constrain `.stage` (`SailView3D.svelte:1156-1162`) the way the plan svg
is constrained at ≥1024: `aspect-ratio: 4 / 3; height: var(--hero-h); width:
auto; margin-inline: 0`, and fill the freed right-hand column with the trim
readouts or the `PRESET_HINT` text, mirroring PlanView's grid. The fit already
keys off `camera.aspect`, so the boat grows automatically with no pose changes.
Two caveats: `--hero-h` is deliberately shared by both heroes so the 2D/3D swap
does not jump, and at 394 px tall a 4:3 stage is only about 525 px wide, so the
readout column has to be genuinely filled or the hero trades empty water for an
empty gutter.

<a id="m-04"></a>
### M-04 — The water plane is 90×90 m, so its far corners are inside the frame

What reads as the horizon is the sloped edge of the sea plane, and it is
crooked differently on each side of the boat.

**Evidence.**
- A 3× crop of `shots/desktop-ch-astern.png` over x 0-300, y 220-320 shows the
  water/sky boundary running from y ≈ 235 at x = 300 down to y ≈ 280 at x = 40:
  a straight sloped edge, not a horizon. A boundary-profile scan (first row
  where B > 45 and R > 16, sampled every 60 px) gives (60,274) (120,264)
  (180,254) (240,244) (300,237) … (1020,237) (1080,243) (1140,252) (1200,262)
  (1260,272), i.e. a flat centre kinking up at both frame edges. Same seam in
  `shots/desktop-run-astern.png`, `shots/desktop-brk-astern.png`,
  `shots/desktop-deep-astern.png`, `shots/desktop-ch-leeward.png`, and as a
  diagonal crossing the water in `shots/desktop-ch-top.png` and
  `shots/desktop-brk-top.png`.
- `SailView3D.svelte:316` `new PlaneGeometry(90, 90)`, `:319`
  `new GridHelper(60, 60, …)`, `:344` `new PerspectiveCamera(42, 4/3, 0.2, 200)`.
  With the astern camera about 16 m back and 5.5 m up, the plane's far edge is
  only about 63 m away and its corners subtend well inside a 3.3:1 frame.
- Fog does exist, contrary to the original claim: `:112`
  `scene.background = new Color('#0a1520')` and `:116`
  `scene.fog = new Fog('#16293c', 26, 70)`. The pixel step across the seam at
  x = 300 is (10,21,32) to (22,41,60), background to full fog colour, so a
  fully-fogged plane edge still reads as a seam because the two colours differ.

**Impact.** A tilted horizon is the reference a sailor reads heel against, and
here the reference itself is crooked and asymmetric. Combined with M-03, the
flanks of the desktop hero are mostly a picture of the edge of the sea.

**Fix.** Make the plane large enough that its edge is never in frame,
`new PlaneGeometry(1200, 1200)` at `:316` (two triangles), keeping the
`GridHelper` at 60 m so the near-field texture is unchanged, and raise
`camera.far` at `:344` to match. Alternatively match the fog colour to
`scene.background` and tighten the range so the plane fades to the sky before its
edge; that is the smaller change but only works if the two colours agree.

<a id="m-07"></a>
### M-07 — There is no downwind leeward pose, so the preset's stated purpose is unavailable under the kite

Downwind the leeward quarter sights almost straight down the squared boom, so
the mainsail is edge-on at every gennaker state. The render is correct; the
preset set is missing a pose.

**Evidence.**
- `src/ui/three/presets.ts:52` `leeward: { position: [-6.6, 3.9, 10.2], target:
  [-0.9, 3.6, 0] }`. `SailView3D.svelte:491-505` mirrors z by `lee(side)` (−1 on
  starboard) and preserves the direction through the fit, giving a horizontal
  view axis of (0.488, 0.873).
- `boat.ts:166-171` gives `boomAngle(15, 0) = 6 + 0.0085·85² = 67.41°` at the
  downwind base (`data/boats/j70.json` `baseRaceDown.mainsheet = 15`), and
  `conventions.ts:84/96` gives a chord of (−0.384, 0, −0.923). The dot product
  of the camber direction with the view direction is 0.115, so the camera sits
  6.6° off the main's own plane.
- `shots/desktop-run-leeward.png` and `shots/desktop-run-ease-leeward.png`, plus
  the tr, brk, deep and run-trim leeward shots: the main is a pale foreshortened
  slab, roughly a tenth of a face-on projection, its draft stripes reduced to
  dashes, while `shots/desktop-ch-leeward.png` upwind shows the same preset
  presenting a broad main with full-length stripes.
- The main is not hidden. In every gennaker leeward shot it sits aft of the
  kite's leech with rig and sky between them, with leech curve and telltales
  legible in the deep and run-ease shots.

**Impact.** `PRESET_HINT.leeward` reads "The leeward quarter: reads camber and
draft position" and does not name a sail. Downwind the sail with camber worth
reading is the gennaker, and the preset presents that superbly, so nothing false
is taught. What is missing is a downwind vantage for the main: at six of nine
states the chip's promise is met by a different sail than a reader would assume,
and the answer for the main is one chip away in Astern rather than here. The two
passes split on this: the sailor lens refuted it as an honest picture of a real
bearing (a coach boat on the leeward quarter of a running J/70 sees exactly
this), the code lens confirmed the geometry and kept it as a defect of the
preset set.

**Fix.** Add a downwind pose selected in `presetPose` when the kite is up, which
the component already knows: `PRESETS_DOWN: Partial<Record<PresetId, Pose>>` in
`presets.ts` with a leeward entry forward of abeam and to leeward, so the sight
line lands roughly 50-60° off the main's face while keeping the kite to one side
rather than square in front, and give it its own hint line. Keep it clear of
`luff`'s pose (`presets.ts:53`), which a bow-quarter position would duplicate,
and keep the 0.8 m drop the current pose was given to hold the sheerline and
heel read. The cheaper alternative is to swap the pose only, leaving the preset
list unchanged. Changing the hint wording alone is documentation over a picture
that still lacks a downwind main.

<a id="l-01"></a>
### L-01 — The curling kite luff is published as state `stalled`

The curl branch publishes an aero verdict on a handle the code deliberately
keeps out of the aero vocabulary three lines above.

**Evidence.**
- `src/ui/three/SailView3D.svelte:824` `state: 'stalled'` in the curl branch of
  `buildTelltales`, under the comment at `:813-815` ("The curl is a geometric
  threshold, not an angle of attack, so it keeps its own code") and a separate
  `CURL_CODE = 3` at `:655` that exists precisely so it is not one of the three
  aero states. The non-curling branch (`:799-805`) hard-codes `'streaming'`, so
  the kite luff carries no real aero state either way.
- The fold is to windward (`:793` `const w = -lee(side) * CURL_FOLD`), which is
  the lifting picture, so `stalled` is the wrong end of the scale.
- The shader receives `CURL_CODE` at `:815`, so the string is a dev and test
  handle only. `grep -rn "telltaleStates" src tests docs` returns the producer
  (`:879`), two spec reads (`tests/ui/race-3d.spec.ts:214` and `:276`) and a
  plan doc, and both spec reads filter `sail === 'jibLuff'`. `PlanView.svelte:303`
  and `:610` render the kite curl as a dashed outline rather than as ribbon
  states, so there is no cross-view contradiction on screen today.
- The curl itself renders correctly in `shots/desktop-run-ease-luff.png`,
  `shots/desktop-run-ease-leeward.png`, `shots/desktop-run-ease-astern.png` and
  `shots/phone-run-ease-leeward.png`.

**Impact.** A latent mislabel: a tier-C geometric threshold is laundered into an
aero verdict on the handle the cross-view spec trusts. No consumer reads it
today and nothing is visible in any screenshot, which is why it stops at L.

**Fix.** Widen `TelltaleReading['state']` to `Ribbon | 'curl'`
(`SailView3D.svelte:633`) and publish `'curl'` at `:824`, matching the shader's
separate `CURL_CODE`.

<a id="l-02"></a>
### L-02 — The two heroes teach different telltale vocabularies, and only one ships a legend

The plan view colour-codes streaming, lifting and stalled and explains them; the
3D hero draws every ribbon in one hue with no legend, no caption clause and no
explainer.

**Evidence.**
- `SailView3D.svelte:300-301` emits a single hue for every ribbon:
  `vec3 col = vec3(0.98,0.35,0.35) * (vStall>0.5?0.8:1.0)` with alpha
  `(vSide>0.5?0.7:1.0)`. State changes brightness and alpha, never colour.
- `PlanView.svelte:388-398` renders a Streaming / Lifting / Stalled swatch
  legend, `:512-546` maps the swatches to `--good` / `--warn` / `--bad`, and
  `:380-383` renders the `?` button whose sheet (`:443-447`) spells the three
  states out. `SailHero.svelte:265-272` is a strict either/or, so the 3D branch
  mounts neither the legend nor the explainer. `grep` over `src/ui/three/`
  returns no legend strings at all.
- The 3D caption (`SailView3D.svelte:1143-1153`) covers loft, hull, bend, sag,
  rake and the gennaker curl cue, and never names the three states or says that
  angle is the cue. The source comment at `:228-230` states the choice ("the
  ribbons are red cloth, not the plan view's green/amber/red vocabulary; angle,
  motion and a shadowed red are the cue"), and that sentence exists in the
  source and nowhere in the UI. On desktop the caption is clipped anyway; see
  [H-05](02-plan-view.md#h-05).
- `shots/phone-ch-plan.png` shows the legend; `shots/phone-ch-leeward.png`,
  `shots/phone-ch-astern.png` and `shots/desktop-ch-luff.png` are the same state
  in 3D with every ribbon the same salmon.
- The colour collision is theme-dependent: ribbon red is fixed at #fa5959, while
  `--bad` is #ff8272 in dark (`tokens.css:61-63`) and #b42318 in light
  (`:120-122`, `:146-148`).
- `PlanView.svelte:386-387` carries the comment "audit ux-01 M-02's sibling
  complaint: colour with no legend", so the plan's legend exists because a prior
  audit flagged this defect class, and 3D reintroduces it for a different
  encoding.

**Impact.** A user learns green/amber/red on the plan card, hits the toggle, and
gets a picture with no colour vocabulary and no statement that pose is now the
cue. The finding is the inconsistency between the two pictures on one card, not
the hue: the sailor lens is right that real telltales are fixed-colour cloth and
that colour-coding the 3D ribbons would train a signal the water never gives,
and it is right that the pose cue survives a still frame (`SailView3D.svelte:271-272`
has no `uTime` term; only the flutter at `:284-286` is frozen when still). The
two passes split on that basis, one refuting it to L as polish and one
confirming a real cross-view legibility gap.

**Fix.** Do not import the plan's colour vocabulary into the photographic hero.
Add one clause to the caption's non-gennaker branch at `SailView3D.svelte:1144`,
along the lines of "red cloth: read the angle, not the colour. Hooked to
windward = starved entry, hanging = stalled", and give the same sentence to the
stage's `aria-label` (`:1136`), which today adds nothing for a screen-reader
user. If the caption stays clipped on desktop, the clause has to live somewhere
that renders there.

## Checked and not reported

Read `presets.ts`, the fit, mirror and orbit code in `SailView3D.svelte`
(`fitBoat`, `fitDistance`, `presetPose`, `goTo`, the `ResizeObserver` refit,
the `OrbitControls` clamps), `conventions.ts` `lee`/`tackSide`, `hull.ts`
`WATER_Y`, the full telltale path (`buildTelltales`, `RIBBON`, the shader,
`STATE_CODE`/`CURL_CODE`, `loft.ts` `ribbonAnchor`/`nearestColumn`/`stripeRows`,
`race/telltales.ts`, `boat.ts` `localAoa`/`luffRibbon`/`leechRibbon`), plus
`kite.ts`, `rig3d.ts`, `store.svelte.ts`, `pointOfSail.ts`,
`core/rig/state.ts`, `core/geometry/rig.ts` and `j70.json`; viewed all 45
desktop 3D shots and every phone 3D shot with crops at 250-450 %, and measured
ink bounding boxes programmatically for all of them. Correct and not reported:
tack mirroring (the leeward camera lands on the sails' side on starboard);
Astern's framing at 80-83 % of canvas height and its centreline rationale, which
does show the kite alongside the main at every downwind state; upwind Leeward
reading camber and the sheerline as intended; phone framing of Astern and
Leeward being tighter than desktop; paired jib luff ribbons with the correct one
of the pair moving per state; the three-quarter/half/quarter ordering matching
between 3D and plan at every shared station computed; the curl folding to
windward as documented and firing exactly at sheet ease ≥ 0.55, so run-trim
shows no curl and run-ease does; main-leech and kite-luff ribbons correctly
single rather than paired; and the solver's boom angle, jib sheet angle, camber,
draft position and twist magnitudes and their responses to bend, outhaul,
cunningham, sag and lead.
