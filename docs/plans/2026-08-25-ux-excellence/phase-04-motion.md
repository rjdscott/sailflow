# Phase 04: Motion

## Goal

The boat feels alive without a 3D engine: telltales flutter by state
(streaming / lifting / stalled), the plan view heels with the solved heel,
sail sections and boom tween between solves. All motion is
`transform`/`opacity`, all of it disabled under `prefers-reduced-motion` and
the More-screen toggle. Closes M-15, M-02; owner decision row 26.

## Tasks

- [ ] Telltale flutter: CSS keyframes per ribbon state on the existing SVG
      groups; stalled = slow droop + jitter, lifting = fast flick, streaming
      = gentle wave.
- [ ] Heel tilt: rotate the hull group by the solved heel (sign by tack);
      eased 300 ms.
- [ ] Eased tweens on boom angle, jib sheet angle, section curves (Svelte
      `tweened` or CSS transition on `d` where supported; fall back to
      snapping).
- [ ] Gain chevrons: direction glyphs only, single accent colour, magnitude
      in the tooltip (M-02).
- [ ] Replace the full-cell flash with a 120 ms readout fade.
- [ ] Tests: ribbon state → class mapping; reduced-motion switch removes
      animation classes.

## Verification

```sh
make check
```

Manual: over-sheet the jib and watch the luff ribbons stall; ease and watch
them stream; toggle reduced motion and confirm stillness.

## Artifacts

- `src/ui/race/motion.css` or equivalent, updated `PlanView.svelte`.

## Progress log

_None yet._
