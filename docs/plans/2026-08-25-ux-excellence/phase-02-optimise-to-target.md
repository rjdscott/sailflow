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

- [ ] `optimalTrim()`: coordinate descent over the race controls that the
      shape layer actually moves (mainsheet, traveller, jibSheet, jibLead,
      backstay, vang, cunningham, outhaul), one legal step at a time via
      `trimmed`, fixed iteration budget, deterministic order. Invariant tests:
      result ≥ base VMG, idempotent, mirror-symmetric. Controls the shape
      layer does not move (halyards, inhauler) get no tick, and say so.
- [ ] Worker request `optimalTrim` in protocol v1 (additive).
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

_None yet._
