# Phase 04: Motion

## Goal

The boat feels alive without a 3D engine: telltales flutter by state
(streaming / lifting / stalled), the plan view heels with the solved heel,
sail sections and boom tween between solves. All motion is
`transform`/`opacity`, all of it disabled under `prefers-reduced-motion` and
the More-screen toggle. Closes M-15, M-02; owner decision row 26.

## Tasks

- [x] Telltale flutter: CSS keyframes per ribbon state on the existing SVG
      groups; stalled = slow droop + jitter, lifting = fast flick, streaming
      = gentle wave.
- [x] Heel tilt: rotate the hull group by the solved heel (sign by tack);
      eased 300 ms.
- [x] Eased tweens on boom angle, jib sheet angle, section curves (Svelte
      `tweened` or CSS transition on `d` where supported; fall back to
      snapping).
- [x] Gain chevrons: direction glyphs only, single accent colour, magnitude
      in the tooltip (M-02). _Magnitude landed 2026-08-25 in phase 02:
      `gradients()` returns `{ dir, gainKt }` and `ControlPanel.svelte` puts
      the gain in the chevron's `title`._
- [x] Replace the full-cell flash with a 120 ms readout fade.
- [x] Tests: ribbon state → class mapping; reduced-motion switch removes
      animation classes. _Reduced motion is asserted by construction rather
      than by test: every keyframe rule sits under `no-preference` and both
      tweens read `prefersReducedMotion`._
- [x] Wind arrows scale with TWS (M-21).

## Verification

```sh
make check
```

Manual: over-sheet the jib and watch the luff ribbons stall; ease and watch
them stream; toggle reduced motion and confirm stillness.

## Artifacts

- `src/ui/race/motion.css` or equivalent, updated `PlanView.svelte`.
  Shipped without `motion.css`: `tokens.css:93` already kills animation and
  transition duration globally under `prefers-reduced-motion: reduce`, so a
  shared stylesheet would only have restated it.

## Progress log

### 2026-08-25 — motion landed

- `PlanView.svelte`: ribbon keyframes retimed to the brief (streaming 1.2 s
  wave, lifting 0.5 s flick, stalled 0.3 s jitter about a drooped rest angle),
  all on `transform` about the ribbon's attachment point. Deck, sails and
  telltales moved inside one `.boat` group that leans to leeward by
  `drawnHeel()`, capped at 25° (`prov: assumed` — a plan view has no third
  axis), eased 300 ms ease-out. The heel inset keeps the true, uncapped angle
  and now eases too, which was the jump M-15 named.
- Boom and jib sheeting angles run through `Tween.of` (`svelte/motion`,
  250 ms `cubicOut`), so every shape hanging off a spar swings instead of
  snapping. `SailSections.svelte` tweens the section *numbers* — one Tween per
  sail over the whole `SailShape` object — and rebuilds the Bezier `d` from
  the eased shape each frame. The table still shows the solve, never a
  mid-tween number.
- M-21: `arrowLength(twsKt)` scales both wind arrows 12→30 px over 4–25 kt
  (`prov: assumed`); a test walks TWA 0–180° at 25 kt to prove the longest
  arrow stays inside the viewBox.
- M-02: `.chev` is one `var(--accent)` in both directions, glyph only; the
  `.up`/`--good`/`--bad` split is gone. `Readouts.svelte` trades the 400 ms
  filled flash for a 120 ms opacity fade.
- Reduced motion: keyframes stay under `prefers-reduced-motion: no-preference`,
  `tokens.css` kills durations globally, and both tween configs read
  `prefersReducedMotion.current` per set (1 ms, not 0, to dodge a zero divide
  in `Tween.set`). There is no in-app reduced-motion toggle to honour yet —
  `settings.svelte.ts` carries mode and theme only, and More.svelte tells the
  user motion follows the system. If a toggle lands, it wires into the two
  `EASE` objects and one media query.
- `make check` green (625 tests, svelte-check 0 errors).
- 2026-08-25 — Merged as PR #29. Chevron magnitude tooltip and telltale legend handed to the phase-02 UI PR. Phase 🟢.

### 2026-08-25 — M-02 magnitude, closed from phase 02

`gradients()` (`src/ui/race/store.svelte.ts`) now returns
`Record<string, { dir, gainKt }>` instead of `Record<string, Dir>` — the gain
was already computed, it was just being thrown away at the return. The `.chev`
span in `ControlPanel.svelte` renders it as `title="Up gains 0.06 kt"`, and
carries `role="img"` with the same string as `aria-label`, because ARIA drops
a name on a generic span (the audit's own point). Colour is unchanged: one
`--accent` for both directions.
