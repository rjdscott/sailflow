# Phase 00: P0 defects

## Goal

Every P0 line in the ux-02 punchlist closed: drills score against a real
optimum with validated starts, inert drills gone, the Log form usable and
safe, the Race optimum honest about its path.

## Tasks

- [x] H-04 Investigate light-air backstay (model wants 80 % at 6 kt flat): sweep `trimmed` over backstay × twist at 6 kt, compare to North "backstay off below 8 kt"; either a shape-layer knob fix with a test, or a documented disagreement surfaced on the score sheet.
- [x] H-01 Drill store requests `optimalTrim` from the drill start with locked controls held (add `fixed?: string[]` to the request or filter `TRIM_CONTROLS` by `drill.free`); answer key = that result.
- [x] H-02 `scripts`/test: every drill start must lose ≥ 3 % (prov: assumed) against its optimum, else the test fails; medal bands widened to ≥ the held-out error and combined with control distance (interim, before v2).
- [x] H-03 Remove or re-author the four drills on unfelt controls (halyards, inhauler, cunningham-only, kite); keep the count ≥ 8.
- [x] H-07 Race optimum: key includes race sliders (debounced), descent seeded from both current and base and the better kept; "Why" copy says "from where your sliders are now, and from the base tune". Closed 2026-08-25, with M-09 and M-26 on the same card.
- [x] H-05 Log form: number rows wrap (`flex-wrap`, `min-width: 0`, `NumberField` width), no page-level horizontal scroll at 390/720/1440; new entry prefilled from committed rig + last forecast instead of zeros.
- [x] H-06 Log editor deep-copies (`structuredClone` / `$state.snapshot`) on open; Cancel discards; Dock draft never aliases a committed entry. Test.
- [x] Tick the punchlist lines.

## Verification

```sh
make check
pnpm vitest run src/lib/drills.test.ts
```

Manual: open each drill, press Check untouched → no medal; Log new entry on a 390 px phone → no horizontal scroll.

## Artifacts

- `src/lib/drills.test.ts` start-validity test; updated `data/drills/j70-static.json`.

## Progress log

### 2026-08-25 — H-07 closed, plus M-09 and M-26 on the same card

- `optimalTrim` takes `opts.seeds` and runs one coordinate descent per seed,
  best score wins, ties to the earlier seed so it stays idempotent on its own
  answer. Default seeds are the trim passed in and `baseRace()`. Only the
  active controls are seeded, so a seed never rewrites the halyards or the
  inhauler. Cost roughly doubles, ~280–380 solves per search.
- `optimumKey` now includes the `TRIM_CONTROLS` values, debounce 150 → 300 ms.
  A drag re-keys sixty times and buys one search seeded from where the thumb
  stopped; the halyards and the inhauler still cost nothing. While a search is
  pending the standing answer is marked `stale`: the ghost ticks drop to 35 %
  opacity with a "re-searching from this trim" title, and Apply is disabled
  (`canApply` already read `stale`).
- Why copy rewritten: searched from the sliders *and* the base tune, keeps
  whichever finishes faster, a local optimum on the control grid, tier B.
  `OPTIMUM_REASON` says the same thing in the badge.
- M-26: `applied` in `Race.svelte` renders `optimum.moved` as
  "Mainsheet 70 % → 75 %" chips under the insight card after an apply, cleared
  by undo and by the next condition change.
- M-09: `targetOf` moved out of `Readouts.svelte` into `src/ui/format.ts` with
  a `better: 'more' | 'less'` argument and tests. `Readouts` takes an
  `objective` prop, so downwind the VMG delta reads "+0.14" for a gain like
  every other metric on the card.
- Tests: two-seed descent (≥ either single seed, deterministic, winner is one
  of the two descents), seeds-ignore-unsearched-controls, store re-keys on a
  trim change and not on a halyard, stale-while-searching, `targetOf` downwind.

### 2026-08-25 — the boat hero, compact

Owner: "the boat graphic has way too much wasted space, make it more compact
and dense."

- `PLAN_LAYOUT` in `src/ui/race/boat.ts` is the single place the plan view's
  numbers live (as `SECTION_LAYOUT` is for the sail sections). viewBox 320×264
  → **150×190**, cropped to the boat: the hull is 145 units of the 190, and the
  measured worst-case ink box across both tacks, every heel and the widest legal
  trim is `x [1.9, 147] y [6.6, 189]`.
- The wind arrows were parked on an ellipse around the whole boat, which is
  what forced a viewBox twice the hull's length — the arrows had to clear the
  transom on a run. They are a **rose off the windward bow** now: fixed centre,
  22-unit rim, arrows swinging inside it, TWA and AWA labels stacked
  underneath so they never chase an arrowhead. `windArrow`/`Ring` deleted,
  `roseArrow` replaces them.
- Heel inset deleted. The hull's own tilt carries the heel (capped at 25°, as
  before) and a `Heel 7°` tag sits in the leeward transom corner with the
  solved, uncapped angle. Both animations kept: the hull tilt still transitions
  and the telltale ribbons still flutter/lift/stall, all under
  `prefers-reduced-motion: no-preference`, untouched.
- Three-line caption + two-line legend + metrics row → a one-line caption with
  a `?` opening the existing `Sheet` explainer, a one-line three-chip legend,
  and the draft/twist/flat metrics — all moved into a flank column beside the
  drawing from 1024 px, which is where most of the height went.
- Card height at 1440×900: **~660 px → ~429 px** (svg 360 + section title 17 +
  gap 12 + card padding 40). Hull renders 275 px, **64 % of the card**, against
  ~45 % before. Sail sections and Rig elevation now sit below it inside the
  viewport.
- `geometry.ts` gains `cropBox(pts, pad)`; `boat.test.ts` uses it to prove
  nothing clips at any tack, heel or trim, and that the boat still fills > 90 %
  of the viewBox height — so the crop cannot quietly be padded back out.
### 2026-08-25 — H-04 closed: the shape layer had one wind-independent datum

**Root cause.** `shape/toOrc.ts` measured *both* channels that carry a flying
shape into the physics against a single fixed datum — `baseRace()` at
`baseDock()`, one wind band. `flat = 1 + 2.5·d` is clamped to `[0.42, 1]`, so
any shape *fuller* than that datum is invisible to it; and `dCLmax = −0.35·d²`
is a well centred on the same datum, so flattening a full sail down toward it
*adds* CLmax. In light air, where a sailor's rig and trim are always fuller
than the base band, both effects point the same way: backstay is free on power
and pays on CLmax. Measured at `t1-flat-06-backstay`'s own dock and start
(uppers −2, lowers −1, forestay +20 mm), mean draft runs 0.09763 at backstay 0
to 0.08600 at 100 against a base datum of 0.08728 — so `flat` is pinned at
1.000 for backstay 0…82 and the only live channel rewards the backstay. Same
mechanism, opposite sign, in breeze.

**Fix.** `src/core/shape/toOrc.ts`: `flat` keeps the base setup as its datum
(that is what flat means in ORC §5.1.3), but the CLmax/CD0 penalties are now
measured against a *wind-dependent* target draft, `targetDraftMul()` —
`shape.draftTargetPerKt` 0.025 of base draft per kt from `shape.draftTargetRefKt`
12 kt, clamped to ±`shape.draftTargetSpan` 0.25. All three `prov: assumed`;
direction only, sourced from the guides' published backstay bands (Quantum:
25 % at ≤12 kt, 50 % at 12–14, 75 % at 14–18, 90 % at 20–23). `shapeToOrc`
takes an optional `twsKt`; omitted, it behaves exactly as before.

**Before / after** (`optimalTrim` backstay, guide band rig + guide band trim;
free-control grid optimum at each drill's own dock and start):

| state | before | after | guide |
| --- | ---: | ---: | ---: |
| 6 kt flat, North 6–8 kt rig + light trim | 20 % | **0 %** | 25 % |
| 20 kt, North 20+ rig + heavy trim | 50 % | **65 %** | 90 % |
| `t1-flat-06-backstay` free grid | backstay 80 / main 85 | **backstay 0** / main 85 | — |
| `t1-20-survival` free grid | backstay 15 / trav −100 | backstay 15 / trav −100 | — |

VMG vs backstay at the 6 kt drill start, before: 0→2.9939, 20→2.9957,
40→2.9955, 60→2.9948, 80→2.9937, 100→2.9672 (peak at 20, and the free grid
with mainsheet reaches its best at 80). After: 0→2.9984, 20→2.9958,
40→2.9932, 60→2.9907, 80→2.9881, 100→2.9602 — monotone down, as the guides say.

**Residual disagreement, not resolved.** `t1-20-survival` still wants 15 %
backstay. Its own dock is uppers +5 / lowers +2.5 with cunningham 80 and
outhaul 95 already at the start, so the model reads that boat as depowered
before the backstay is touched, and more backstay drives `flat` to 0.67 — well
past any optimum. That is a disagreement between the drill's authored setup and
its own hint, and belongs on the disagree panel (H-01/H-02 work), not in a knob.

**Tests.** `validation/invariants.test.ts` invariant 14 (three cases: ≤ 40 % at
6 kt, ≥ 60 % at 20 kt, strictly more in breeze than in light air, all scored at
the guide's own band rig *and* band trim — from `baseRace()` alone the model
gets the direction right by accident). Verified it fails with the trend off:
"expected 50 to be greater than or equal to 60". Six unit tests in
`src/core/shape/toOrc.test.ts`.

**Validation.** `pnpm validate` gate unchanged: **FAIL 21/25**, same four rows
(TWS 6 60° 5.7 %, TWS 14 vmgUp 5.8 %, TWS 14 asym vmgDn 15.1 %, TWS 20 60°
6.5 %). Both held-out TWS 14 FAILs are identical to before; TWS 20 60° improved
6.9 → 6.5 %. `pnpm golden` regenerated (deltas move, boat/calib hashes do not).
The dock-optimum table now tracks the guide's direction where it did not:
model uppers run −3/−3/−3/−1/6/6/6 across the bands against the guide's
−3/−2/0/2/4/6/6, where before it was 6/6/6/6/2/4/2.

**Calibration NOT re-run.** `pnpm calibrate` per the runbook produced a worse
gate — 20/25, a *new* held-out FAIL at TWS 8 asym vmgDn (9.0 % / 4.2°), with
`rig.turnsToN`, `rig.EI`, `shape.bendToDraft` and `shape.sagToDraft` all
railed on their bounds and `aero.asymClMul` moving 1.011 → 0.750. The fit found
a different, worse basin. The committed calibration block and
`calibration/residuals.json` are unchanged; the shape knobs it fits are
untouched by this change, and re-fitting is a separate decision with its own
evidence. `make check` green (730 tests).
- **2026-08-25 — H-05 and H-06 closed.** `.row` is now a
  `repeat(auto-fit, minmax(7rem, 1fr))` grid (the `.row.wrap` variant and its
  one use are deleted), `.field`/`NumberField` carry `min-width: 0` and the
  input `width: 100%`, and `NumberField`'s invisible `--surface` border is
  `--line` — no page-level horizontal scroll left to produce at 390/720/1440
  (verified by construction and `pnpm build`; no browser available in this
  worktree to walk the manual step). A new entry comes from
  `prefillEntry()` (`src/ui/log/logic.ts`): rig and forecast from
  `rigLock.locked`, venue from the last entry, date from today, and `null` —
  an empty field — for anything with no source, instead of a wall of zeros.
  `LogNumber = number | null` runs through the schema, the CSV and `windLine`,
  so "not recorded" can no longer export as a real 0 kt / 0 kg. H-06: the
  editor loads via `structuredClone($state.snapshot(entry))`, so Cancel
  discards and no form binding can reach a stored entry or the committed rig;
  regression tests in `src/ui/log/store.test.ts` ("never aliases the committed
  rig") and `src/ui/log/logic.test.ts` ("does not alias the lock"). The other
  H-lines in this phase belong to the drills/Race agents and stay unticked.
- **2026-08-25 — H-01, H-02, H-03 closed, inside the phase-01 v2 rewrite.**
  The three drill defects were fixed by the v2 schema rather than by patching
  v1, so there was no interim step: see the phase-01 log for detail.
  - H-01: `OptimalTrimRequest` / `OptimalTrimOptions` gained an additive
    `fixed?` list of controls the descent must hold, the worker passes it
    through, and the drill store sends `fixedControls(drill.free)`. The answer
    key is now `optimalTrim` from the drill's own start with every locked
    control held. The `optimal` request is gone from the drill path.
  - H-02: `generateDrillAsync` walks seeds until the start converges *and*
    loses ≥ `START_LOSS_MIN_PCT` (3 %, prov: assumed) against that key, and
    `drills.test.ts` runs the real solver over every template to prove one
    exists in the first eight seeds. A second test asserts the untouched start
    never scores gold. Medals are now distance-first with the loss bands as a
    second gate.
  - H-03: fault and free controls are restricted to `TRIM_CONTROLS` by a test
    over the templates file; the halyard, inhauler and gennaker drills were
    dropped or re-authored, and `cunningham`/`vang` were dropped from every
    free list as sub-band controls. Nine templates, all three tiers.
  - H-04 (light-air backstay) is **not** closed here — the model still
    disagrees with the guides. Per decision-log row 32 the score sheet now
    carries a `guideNote` naming both answers instead of resolving it, and the
    light-air template was re-authored off backstay onto controls the model
    can separate. The physics investigation remains open.
  - Not touched by this pass: H-05, H-06, H-07 (Log form and Race optimum).
### Rig elevation

**2026-08-25** — Owner feedback: "the rig elevation image looks wrong too."
Rebuilt it as a real side elevation drawn to scale from `data/boats/j70.json`.

**What was wrong.** The old drawing was not a rig, it was three shapes: an
unlabelled mast arc over a grey rectangle, a generic triangle for the main, a
thin line for the jib. Concretely — no deck or waterline, so no datum any
height was measured from; the mast drawn at `mastLenM` but the hounds, the
gooseneck and the spreaders drawn nowhere; the forestay landing at a bow point
picked from J alone with no stem or hull under it; no backstay, no sprit; the
mainsail a straight-sided triangle from the mast tip to a boom drawn 24 px
above the deck (no relation to P or E); the jib a single stroke from the
masthead to the bow, ignoring the luff, LP and girth tables; and no I/J/P/E
labels, so nothing on the card told you what it was to scale against. Bend,
sag and rake were the only honest parts.

**What each element is sourced from now.** All geometry moved into
`src/ui/race/rigLayout.ts` (pure, unit-tested); `RigElevation.svelte` is only
ink and labels.

| Element | Source |
|---|---|
| Mast, 11 stations | `rig.mastLenM` (assumed, PROVENANCE.md); stepped on deck per Class Rules D.1.1(e) mast compression post |
| Hounds | `rig.iM` above the sheer — ORC cert RIG IG 8.000 |
| Forestay base / stem | `rig.jM` forward of the mast — ORC cert RIG J 2.340 |
| Transom (backstay base) | `hull.loaM − rig.jM`, the same reduction `src/core/geometry/rig.ts` `backstayGeometry` uses |
| Gooseneck | derived: `mastLenM − pM` = 0.526 m, assuming the mainsail upper limit mark is at the masthead |
| Boom | `rig.boomOuterMm` = E — Class Rules C.9.3(a) 2876 mm |
| Bowsprit | `rig.bowspritOuterMm` — Class Rules C.9.4(a) 1495 mm; drawn extended only under the gennaker (C.9.4(b)(1)) |
| Spreader | `rig.spreaderZM/spreaderLenM/sweepDeg` (all assumed), foreshortened to `len·sin(sweep)` in side view |
| Mainsail | luff on the bent mast over P; leech through the Class Rules G.3.4 girths (top/upper/¾/½/¼) to the boom outer point |
| Headsail | luff on the sagged forestay (G.4.3 luff 8000 mm = I); leech through the G.4.3 girths; clew on the sheer at LP off the luff |
| Bend / sag | `SolveResult.rig.bendMm[11]` and `sagMm`, both ×5 (`EXAGGERATION`), factor shown on the card |
| Rake | `rig.rakeMm`, drawn true against a plumb ghost, never exaggerated |

**What the JSON and the class rules lack, and had to be assumed.**

- **Freeboard.** Neither `hull` nor the class rules carry one. Drawn at 0.75 m,
  the `aero.hbiM` default in `src/core/aero/orc/forces.ts` ("base of I above
  water"). j70.json's *calibrated* `aero.hbiM` of 1.4 was deliberately not
  used: it is an aero fit, not a hull dimension.
- **Mast step height.** Class Rules C.9.2(a) "MAST — DIMENSIONS" is a pointer
  to the manufacturing specification, not a table; the ORC certificate
  publishes only I/J/P/E. The mast is drawn stepped at the sheer on the
  strength of D.1.1(e) (mast compression post), so its full `mastLenM` stands
  above the deck.
- **Gooseneck height.** Not published anywhere. Derived as `mastLenM − pM`,
  which assumes the mainsail's upper limit mark sits at the masthead.
- **Headsail foot length.** Not published. The clew is placed on the sheer at
  the LP perpendicular distance from the luff — the J/70 headsail is a
  deck-sweeper (G.4.3 allows 30 mm of foot irregularity on a sail that must
  furl) — which fixes it exactly and yields a ~2.55 m foot.
- **Forefoot.** 0.25 m tuck aft of the stem, drawing only. Nothing physical
  reads it.
- **Leech girth positions.** ERS leech points (¾ of the leech from the clew,
  etc.) are mapped to the same fraction along the luff, since the luff and
  leech differ by ~4 %. An approximation, flagged in `rigLayout.ts`.

**Tests.** `src/ui/race/rigLayout.test.ts`, 11 cases: I/J/P/E drawn at the JSON
ratios through one shared scale; hounds at I and transom at LOA; sprit only
under gennaker; 11 mast stations ordered partners → tip; rake to scale and
never exaggerated; bend exaggerated ×5 and carrying the mainsail luff with it;
sag bowing the jib luff; girths at the class widths; and nothing leaving the
viewBox across a bend/sag/rake envelope that contains the whole reachable
solver range (±250 mm bend, 150 mm sag, 300 mm rake, against the solver's
134/70/152 over every corner of the j70.json dock and backstay ranges).

**Known trade-off.** The card lands ~350 px tall on desktop rather than the
~300 px asked for. The rig is ~9.3 m by ~8.4 m, so the drawing is near square;
capping the SVG below ~200 px made the I/J/P/E and ¼/½/¾ labels illegible. The
`dims` chip turns the dimension overlay off for anyone who wants the drawing
alone. Dropping to 300 px means dropping the labels.

**Boundary note.** The viewBox test cannot call `rigState` — eslint
`no-restricted-imports` limits `src/ui` to `src/core/types` — so it sweeps a
stated envelope instead of the solver's own output. If a calibration change
pushes bend, sag or rake past that envelope, widen it and re-check the
margins.
