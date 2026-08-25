# Phase 02: Optimise to target

## Goal

Race shows what the solver thinks is fast, without doing the learner's
work for them: ghost ticks on every race slider mark the VPP optimum at the
current condition and rig, BSP/VMG readouts carry the target beside them,
and an **Apply optimum** button tweens the sliders there. Everything the
optimum touches is badged with its tier. Closes M-09, M-11, M-19 (partial),
H-05 wording; owner decision row 24.

## Blocker, resolved first

`src/core/solve/optimal.ts` optimises backstay only (through ORC `flat`) and
returns `baseRace()` constants for the other ten controls (decision log row
19). Ghost ticks on all eleven sliders from that output would be a
fabricated answer key (audit M-09). So this phase starts in `src/core`:

- [x] `optimalTrim()`: coordinate descent over the race controls that the
      shape layer actually moves (mainsheet, traveller, jibSheet, jibLead,
      backstay, vang, cunningham, outhaul), one legal step at a time via
      `trimmed`, fixed iteration budget, deterministic order. Invariant tests:
      result ≥ base VMG, idempotent, mirror-symmetric. Controls the shape
      layer does not move (halyards, inhauler) get no tick, and say so.
- [x] Worker request `optimalTrim` in protocol v1 (additive).
- [ ] Budget: measure on a mid phone; must finish < 1.5 s or run in
      background with a progress state.

## Tasks

- [x] `OptimumStore` for Race. `ModelOptimumStore` did not fit — it answers
      "best *dock* setup", a `dockScore` + `optimal` pair — so this is its own
      store around the new `optimalTrim` request. Debounced on condition +
      dock change, not on race sliders.
- [x] `Slider` gets an optional `target` prop: a ghost chevron above the
      trough with a `title` "optimum 64 %", and the same words in
      `aria-valuetext`, so it is never mouse-only.
- [x] Readouts: `target` per metric (BSP, VMG, heel), rendered as
      "5.5 kt · target 5.8 +0.3" in `--ink-2`, no red/green valence (M-02).
- [x] Apply button: tween each slider to the optimum over 400 ms
      (reduced-motion: instant); one-level undo ("Back to my trim").
- [x] Presets get the same undo (M-11): one `previousRace` on the store,
      one `undo()`, two buttons.
- [x] Coach line wording per point of sail: VMG upwind/downwind, boat speed
      on reaches — and the probes now *score* that objective, not just name
      it. See the progress log for where the point-of-sail bands and
      `optimalTrim`'s own split disagree, and which one won.
- [x] Tier: optimum controls are tier B (shape layer); `ConfidenceBadge` on
      the Apply button and beside every readout target.
- [x] Tests: store debounce keys + stale drop; slider target tick position
      math; undo restores the exact previous `race` object; coach wording per
      point of sail.

## Verification

```sh
make check
```

Manual: at 10 kt close-hauled, Apply moves the sliders, VMG rises to the
target, badge reads B; undo returns every slider.

## Artifacts

- `src/ui/race/optimum.svelte.ts` + test; `Slider.svelte` target prop.

## Progress log

- 2026-08-25 — **Blocker resolved: `src/core/solve/optimalTrim.ts`.**
  Deterministic coordinate descent over the race controls the shape layer
  actually moves, one legal step at a time through `trimmed()`, fixed order,
  fixed sweep budget, no `Math.random`/`Date`. Objective: VMG upwind under
  jib, −VMG downwind under the kite, boat speed on reaches (|TWA| ≥ 90 with
  the jib, or < 90 with the kite).

  `TRIM_CONTROLS` = backstay, mainsheet, traveller, vang, outhaul,
  cunningham, jibSheet, jibLead. Derived by reading the layer, not the plan:
  everything downstream of `shape/toOrc.ts` reads exactly two numbers out of
  the flying shape — mean section draft and half-height twist — plus the
  reef corner, so only controls that move draft or twist can change a solve.
  Cunningham qualifies through one path only: the everything-on corner in
  `toOrc.ts` (`cunningham` and `backstay` both at their stops) drops `reef`
  to 0.95. **`mainHalyard`, `jibHalyard` and `inhauler` are excluded**: they
  move draft *position* and entry angle, which `toOrc.ts` never reads, so
  they change the drawn sail section and nothing else. Those three get no
  ghost tick, and the Race screen must say why rather than draw one anyway.
  Under the kite the jib carries no shape, so `jibSheet`/`jibLead` are
  skipped and never reported as moved.

  Budget (desktop, i7-14700K, node 20, median of 5, `sweeps` = 12 default):
  one `trimmed()` call 0.57 ms; a full `optimalTrim()` call 3.5 ms / 17
  solves from an already-optimal base trim (it stops after one sweep that
  moves nothing), 15–17 ms / 140–183 solves from a badly mis-trimmed start,
  10 ms / 136 solves downwind. That is ~1/100th of the 1.5 s phone budget on
  this machine; the mid-phone measurement the checkbox asks for is still
  outstanding, so that box stays unticked. Sweep budget was raised from the
  plan's 6 to 12 on measurement: 6 sweeps left the mis-trimmed 10 kt start
  0.13 kt of VMG short of the guide base, 12 closes it, and the search exits
  early anyway whenever a sweep moves nothing. Caller can override with
  `opts.sweeps`.

  Protocol: `OptimalTrimRequest { type: 'optimalTrim'; controls; condition }`
  → `OptimalTrimResult` (in `core/types.ts`, next to `OptimalResult`), wired
  in `solver.worker.ts` and `stubClient()`. Purely additive:
  `PROTOCOL_VERSION` stays 1.

  Tests: `src/core/solve/optimalTrim.test.ts` (10 cases, 0.4 s wall) covers
  beats-a-mis-trimmed-start, downwind objective, idempotence, mirror
  symmetry, determinism, on-grid/in-range output, no-touch of the excluded
  controls, sweep-budget monotonicity, and behaviour at a control stop;
  plus solver invariant 13 in `validation/invariants.test.ts` over four
  conditions. Known limits, documented in the module header: the answer is a
  *local* optimum on the control grid, and idempotence holds only when the
  descent stopped on its own rather than by exhausting the budget (a
  16 kt mis-trim start still has travel left at 12 sweeps). `make check`
  green: 43 files, 634 tests.

- 2026-08-25 — **UI half landed: ticks, targets, Apply, undo, wording.**

  `src/ui/race/optimum.svelte.ts` — `OptimumStore`, 150 ms debounce, sequence
  guard, keyed on `JSON.stringify([condition, controls.dock])`. Dragging a race
  slider re-runs the calling effect and then costs nothing: the key has not
  moved, so `request()` returns before the timer. `stale` marks the standing
  answer while a new condition is in flight, so the last good optimum stays on
  screen instead of blanking. Exposes `race`, `result`, `moved`, `busy`,
  `stale`, `error`; `OPTIMUM_TIER = 'B'` with the reason next to it (a
  shape-layer answer, not a polar one) and `OPTIMUM_REASON` as the badge
  popover text. Exported as a singleton, like `race`, so ControlPanel and
  Race read one search rather than prop-drilling two.

  **`TRIM_CONTROLS` reached the UI through `src/worker/protocol.ts`.**
  `eslint.config.js` blocks `src/ui/**` from importing anything under
  `core/**` except `core/types`, so a re-export through `race/client.ts` was
  not available; and a *value* re-export from protocol would have dragged
  `optimalTrim → trimmed → equilibrium` into the main bundle. So protocol
  declares the eight strings itself, `satisfies readonly TrimControl[]`
  against a type-only import — drift in `core/solve/optimalTrim.ts` fails the
  typecheck, and `pnpm build` still emits the solver as its own 29 kB worker
  chunk.

  **Slider `target`.** New optional prop, backwards compatible: a hollow
  chevron above the trough (the guide tick keeps the line *on* it — different
  shape, different row, no colour valence), `title` "optimum 64 %", and the
  same string appended to `aria-valuetext`. Position math is `trackPct()` in
  `components/logic.ts`, clamped, which also replaced the slider's private
  unclamped `pct()` for the fill and the guide tick.

  **ControlPanel.** Race rows pass `target={optimum.race?.[id]}` for the eight
  `TRIM_CONTROLS` only. `inhauler`, `mainHalyard` and `jibHalyard` get no tick
  and a muted one-liner through the existing `hint` prop — "No modelled effect
  on speed — it changes the drawn shape only." Down and dock rows are
  unchanged.

  **Readouts.** Optional `target` prop, `{ bsKt?, vmgKt?, heelDeg? }`, rendered
  as "· target 5.8 +0.3" with a tier-B badge. The delta is `--ink-2` in both
  directions: the optimum is somewhere to steer towards, not a mark you are
  failing. Wired into both the phone hero and the desktop strip.

  **Apply optimum.** One `Tween` of a 0→1 scalar, `cubicOut`, 400 ms, 1 ms
  under `prefersReducedMotion` — the `EASE` shape `PlanView` already uses. An
  effect lerps every `TRIM_CONTROLS` value off `progress.current` and snaps
  each frame to the control's own grid, so the readout and the range thumb
  never disagree mid-flight; the last frame is exactly the solver's on-grid
  answer. `from`/`to` are plain `let`s, not `$state`, so the effect depends on
  the tween alone. Values are written into `race.controls.race` in place —
  the sliders alias that object. Disabled while `optimum.busy || optimum.stale`
  and badged tier B.

  **Undo (M-11).** `RaceStore.remember()` / `undo()` and one `previousRace`
  field. Both `applyPreset` and Apply optimum call `remember()`; `undo()`
  `Object.assign`s every key back, so a preset's six off-screen controls come
  back too, and identity is preserved for the bindings. Instant, not tweened:
  an undo you have to wait out is not an undo. "Back to my trim" renders in
  the insight card and next to the preset row, both off the same store field.

  **H-05 wording, and one deliberate deviation.** `coachSentence` gained a
  `metric` argument and `store.svelte.ts` gained `raceObjective(condition)` +
  `objectiveKt()`, which **mirror `core/solve/optimalTrim`'s objective
  exactly**: VMG to windward under the jib inside 90°, VMG to leeward under
  the kite from 90° out, boat speed everywhere else. The probes now score that
  objective instead of always differencing `vmgKt` with a sign flip, so the
  coach line and Apply optimum can never point at different numbers.

  The plan's wording rule was "VMG for close-hauled/run, boat speed for
  reaches, via `nearestPointOfSail`". Those two rules disagree on two of the
  five chips — Close reach (60°, jib) and Broad reach (135°, asym) are
  *reaches* by point of sail but *upwind* and *downwind* by `optimalTrim`'s
  90°/sailset split. Driving the wording off the point of sail there would
  have printed "boat speed" over a number that is VMG. `optimalTrim` won,
  because the model owns the number and `src/core` is another agent's file;
  `nearestPointOfSail` still names the point of sail in the insight card's
  "Why" copy. If the bands are the intent, the fix belongs in
  `optimalTrim.ts`, not here.

  **Leftovers closed** (phase-04, phase-05): `gradients()` now returns
  `{ dir, gainKt }` per control instead of dropping the magnitude, and the
  chevron carries it in a `title` plus `role="img"`/`aria-label` (bare spans
  get their name dropped by AT); ControlPanel's 🔒 is `<LockIcon />`; the "?"
  buttons use `--line-strong`; `Race.svelte` adopts `Tabs.svelte` with
  `tabindex="0"` on the three panes, deleting its local tab markup and CSS; a
  three-item telltale legend sits under the PlanView caption (sibling of the
  `<figure>` — `figcaption` has to stay its last child).

  **Tests.** `src/ui/race/optimum.test.ts`, 9 cases: race-slider-only requests
  never fire, a stepped wind speed debounces to one, a dock change re-fires,
  stale answers are dropped, `stale` lifts only when the new answer lands,
  errors clear the optimum, `dispose()` drops the flight, tier is B.
  `store.test.ts` gains `raceObjective` across six angle/sailset pairs, coach
  wording per point of sail (a client where VMG and boat speed prefer
  *different* controls, so the winner proves which was scored), and three undo
  cases including one-level depth and binding identity.
  `components/logic.test.ts` gains `trackPct` (placement, offset ranges,
  clamping, zero-width) and `optimumText`. `make check` green: 46 files,
  691 tests, svelte-check 0 errors 0 warnings.

  **Still open:** the mid-phone budget measurement (checkbox above), and the
  `MOVES` copy in `explain.ts`, which is still upwind-register ("losing
  height", "choking the slot") whatever the objective. That is a copy task,
  not a wiring one, and was not in this slice.
- 2026-08-25 — UI merged as PR #33 (core as #28). Mid-phone budget still unmeasured; desktop descent ≈15 ms. Phase 🟢 on desktop evidence.
- 2026-08-25 — Owner: "optimum trim is not correct". Root cause was physics, not
  the point of sail: the shape layer maps sheets only to draft/twist, so the
  solver never saw a flogging or pinned sail and the descent ran the sheets to
  the stops (16 kt: mainsheet 70→10; run: 70→100). Fix: `src/core/shape/sheeting.ts`
  (INVENTED, tier B) — sheeting angle from the sliders vs AWA, lift lost past
  the luffing band or the stall band (stall drag only below 90° AWA, where
  drag is not drive), exponential decays so the optimiser always has a
  gradient. Race mode only; VPP mode (`optimal`, dock, polar, golden) keeps
  ORC's ideal-trim assumption, so calibration is untouched. Boom formula now
  reaches 90° at 0 % sheet (was capped ~39°). `optimalTrim` ranks
  non-converged states by objective so it can climb out of a flogging start;
  sweep budget 12→20. Golden 002 regenerated (race-mode results changed by
  design). Result at 10 kt: beat sheets on (75 %), beam reach eases main to
  45 % and jib to 20 %, broad reach main to 15 %, run boom out.
