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

- [ ] `OptimumStore` for Race (reuse `ModelOptimumStore` from disagree/ if
      the request shape fits: `optimal`, `optimiseTwa: false`, current dock).
      Debounced on condition + dock change, not on race sliders.
- [ ] `Slider` gets an optional `target` prop: a tick on the trough with a
      tooltip "optimum 64 %"; keyboard-reachable via the value button.
- [ ] Readouts: `target` per metric, rendered as "5.5 kt · target 5.8" with
      delta colour that is not red/green valence (see M-02).
- [ ] Apply button: tween each slider to the optimum over ~400 ms
      (reduced-motion: instant); one-level undo ("Back to my trim").
- [ ] Presets get the same undo (M-11).
- [ ] Coach line wording per point of sail: VMG upwind/downwind, boat speed
      on reaches.
- [ ] Tier: optimum controls are tier B (shape layer); show
      `ConfidenceBadge` on the Apply button and on the target ticks' tooltip.
- [ ] Tests: store debounce keys; slider target rendering; undo restores the
      exact previous `race` object.

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
