# Phase 02 — Kite geometry: loft, plan view, section stack

## Goal

Under `sailset === 'asym'` the gennaker is drawn: a lofted asymmetric in the
3D hero, an outline in the plan view, and a section stack, all from one pure
mapping of the four `DownControls` to geometry (ADR 0017). `src/core` is not
touched.

## Tasks

- [x] `src/ui/three/kite.ts` (pure, no three.js imports): `kiteGeometry(down: DownControls, shape: SailShape, rig: Rig3D, side): { tack, head, clew, spine, chords, curl: boolean }` using `boat.sails.asym` (luff 10800, leech 8800, foot 5700, half 5560 mm) and `boat.rig.bowspritOuterMm`. Tack from `sprit` and `tackLine`; head at the masthead with luff length from `kiteHalyard`; clew from `kiteSheet` (eased = forward + outboard, luff sags to leeward); `curl` when the sheet is eased past the `prov: assumed` threshold. Every constant `prov:` tagged and a row in `ASSUMPTIONS.md`.
- [x] `SailChords` for the kite (`KITE_CHORDS`) fitted so the ¼ ½ ¾ girths match the sail definition; head/foot extrapolation explicit.
- [x] `SailView3D.svelte`: build the kite with `buildSail` on the kite spine when `sailset === 'asym'` (new `kiteUp` + `down` props from `SailHero`); jib hidden; kite material (translucent, its own colour token); luff-curl cue as a fluttering ribbon column at the luff; edges and stripes as for the other sails; `__sail.kiteSail` in DEV.
- [x] `PlanView.svelte`: kite outline from the same tack/clew/head (projected) via `planToWorld`'s inverse; jib hidden.
- [x] `SailSectionStack.svelte`: accept `sail: 'asym'` with `shape.asym`; name "Kite".
- [x] Tests: `kite.test.ts` — tack on the sprit tip at `sprit = 100`, clew to leeward, easing the sheet moves the clew forward and outboard monotonically, luff length equals the definition at `kiteHalyard = 100`, `curl` false at trimmed / true at eased, no NaN; loft invariants (existing `loft.test.ts` helpers) on the kite mesh; Playwright: `#/race?...set=asym` renders a canvas with `__sail.kiteSail` non-null and the jib null, plus a second screenshot baseline from the leeward preset under the kite.
- [x] Progress log.

## Verification

`make check`; `pnpm test:ui`; `pnpm validate` unchanged (no core change); `node scripts/bundle_check.mjs`.

## Artifacts

`src/ui/three/kite.ts`, `src/ui/three/kite.test.ts`, `src/ui/three/SailView3D.svelte`,
`src/ui/race/PlanView.svelte`, `src/ui/race/SailSectionStack.svelte`, `ASSUMPTIONS.md`,
`tests/ui/race-3d.spec.ts` + snapshot.

## Progress log

### 2026-08-25 — the gennaker is drawn

`src/ui/three/kite.ts` maps the four downwind controls to geometry, tier C,
every constant `prov:` tagged with a block in `ASSUMPTIONS.md`. `src/core` is
untouched (`pnpm validate` unchanged, as predicted).

**The constants, and why each is what it is.**

- **Chords** — the ORC spinnaker girth parabola through (0, foot), (½, half
  width), (1, 0), which is the same distribution `core/geometry/sailplan.ts`
  integrates for the rated area. Fitting the two published girths and letting
  ORC's own curve carry ¼, ¾ and the head beats inventing an extrapolation:
  ¼ comes out *wider* than the foot (6.31 m vs 5.70 m), which is what a
  spinnaker actually is, and the head closes to a point, which is why the loft
  needed nothing added for it. `FLYING_CHORD_FRACTION` = 0.85 scales all five:
  the sail definition is flat dimensions and a spinnaker is cut with shape a
  flat measurement cannot see, so the flying chord is shorter. Only "shorter"
  is claimed. It also decides how far the sail flies outside the plan view's
  crop, and at 0.85 the picture holds at every sheet setting but full ease.
- **Tack** — `sprit`% of the 1.495 m bowsprit forward of the stem;
  `tackLine` lifts it 0.05 → 0.65 m above the pole. At full tension that is
  0.8 m over the assumed freeboard, i.e. `geom.asymTackHeightM` (0.7 m) to
  within that freeboard, so the drawing and the solver's CE height do not
  disagree about where the sail starts.
- **Head** — the masthead at `kiteHalyard` = 100, dropping 1.2 m down the spar
  at 0. The visible effect is the sag it adds, not the drop.
- **Luff sag** — the one piece of real geometry in the file. The drawn luff
  carries the sail's own luff length (10.8 m published), so the surplus over
  the tack-to-head distance is what bows it: at full hoist that is ~2.2 m of
  slack on an 8.6 m chord, and it has to go somewhere. Magnitude inverts the
  parabola arc-length approximation `L ≈ c(1 + 8/3·(d/c)²)` in closed form —
  no root finder, within ~2 % of the exact arc here, and the same reduction
  `rig3d.ts` already uses for forestay sag. `SAG_FORWARD_FRACTION` = 0.6 (vs
  the forestay's 0.35: nothing holds a free luff). The cap is 0.3 of the
  *luff*, not of the chord: a chord-relative cap tightens as the halyard is
  eased, which reversed the one direction the halyard claims — caught by the
  monotonicity test, which is what that test is for.
- **Sheet** — 25° trimmed to 60° eased. Both ends were picked so the clew
  moves forward *and* outboard monotonically: past 90° the outboard component
  turns over, so a range that swung the clew ahead of the tack would have
  broken the second half of the claim.
- **Curl** — 0.55 of sheet travel. Geometric, not aero; labelled so in both
  captions.

**Deviations from the task list, all deliberate.**

- `kiteGeometry` takes `(down, rig, side)`, not `shape`. Camber and draft
  position reach the loft through `sectionStack(shape.asym, KITE_CHORDS)` at
  the call site, exactly as the main and jib do; passing the shape in would
  have been an argument the function ignored.
- `rig` is a structural `KiteRig` (`mast`, `masthead`), which `Rig3D`
  satisfies. That is what lets the plan view use the same mapping without
  importing `rig3d.ts` → `hull.ts` → `loft.ts` into the first-load bundle. It
  passes `BARE_SPAR`, a straight unraked spar: a plan view has no third axis.
- The plan view projects with its own anchored map rather than `planToWorld`'s
  inverse: the plan's mast station is an assumed 0.45·LOA and the rig's is J,
  so a pure axis swap draws the tack 16 px off the bowsprit that is on screen.
  Athwartships is true scale; fore-and-aft is anchored at the mast and the
  sprit tip, the two datums both drawings share.
- `window.__sail` is no longer DEV-only. `pnpm test:ui` runs against
  `vite preview`, so a DEV-gated handle is invisible to the very test that was
  specified to read it; it is published like `__sailViewReady` already is, and
  dropped on unmount. Each sail reads as its mesh or `null`, so "kite up, jib
  furled" is one `evaluate` and no `.visible` archaeology.
- `STEM_X` / `SPRIT_TIP_X` moved from `hull.ts` to `conventions.ts` (hull
  re-exports them, so no other import changed). They are frame datums, and
  `conventions.ts` is the module the plan view can afford to load.
- No new `tokens.css` colour: the 3D materials in `SailView3D.svelte` are all
  literal hex with `prov:` tags because WebGL never sees the cascade
  (`#e8a33d` gennaker gold, opacity 0.86), and the plan-view kite uses
  `--accent`, which the token file already defines as "the flying shape in
  drawings" — the jib is furled underneath it, so nothing collides. Phase 01
  owns `tokens.css` this week; there was nothing worth contending for.

**Gates.** `make check` green. `pnpm test:ui` in the pinned image: 22 passed,
1 pre-existing failure in `tests/ui/race.spec.ts` ("the lit gear-chart row"),
confirmed failing on this branch's HEAD before any of this work — phase 01
territory. `pnpm validate` unchanged. `node scripts/bundle_check.mjs` OK after
a deliberate baseline raise: 121717 → 125384 B gzip.

Read that number carefully, because the first attempt at it was wrong. This
branch's HEAD builds at **122380 B** here, 663 B above the 121717 the cockpit
branch recorded, so the change's own cost is **+3.0 KB**, not the +2.1 KB a
first pass got by differencing against the committed baseline. 1.3 KB of it is
the plan view drawing the kite, which pulls `kite.ts` and `conventions.ts` into
the entry chunk because the 2D view is the always-loaded fallback; the rest is
`kite.ts` itself and the compression boundary. That is the price of ADR 0017's
"one mapping, both pictures", and a second copy of the mapping in plan-view
coordinates would have cost more in drift. No renderer code moved, checked
rather than assumed: `hull.ts`'s station table and the kite material are in the
`SailView3D` chunk and absent from the entry, and that chunk is still lazy
(139.4 → 140.1 KB gzip).

Two traps for whoever measures next. A failed `vite build` leaves the previous
`dist/` in place, so `bundle_check` will happily report a stale, passing
number — check the build's exit, not just its tail. And `git stash push` of a
subset of files can leave a source tree that does not compile at all, which is
how that stale number appeared in the first place.

**Screenshots.** New baseline `race-3d-kite-leeward`, generated in
`mcr.microsoft.com/playwright:v1.62.1-noble`. The existing
`race-3d-leeward` jib baseline came back byte-identical under
`--update-snapshots=all`, so nothing on the jib path moved.

**Known, and left.** `BASE_DOWN.sprit` is 0, so a fresh downwind session draws
the kite tacked at the stem with the pole retracted. That is the honest picture
of the control state, and the default belongs to the Gennaker panel — phase 03.
At full sheet ease the kite's clew runs ~12 px outside the plan view's crop,
which is cropped to the boat by design; a 45 m² sail on a 6.9 m hull does not
fit inside the hull's own frame, and widening the viewBox under `asym` would
move a layout phase 01 is holding.

