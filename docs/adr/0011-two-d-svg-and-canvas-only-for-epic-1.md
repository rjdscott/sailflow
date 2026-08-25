# 0011. 2D SVG and Canvas only for Epic 1; no WebGL until measured

- **Status:** Superseded by [0014](0014-three-js-sail-view-behind-lazy-chunk-and-perf-gate.md)
- **Date:** 2026-08-25

## Context

The trainer must be readable on a 380 px phone in sunlight, one-handed, and
teach trim. The views that teach are sail sections at three heights, a rig
elevation with bend/rake/sag, and a plan view with telltales and heel. The
brief forbids 3D and WebGL unless proven faster. A three.js sail close-up is
attractive but heavy (bundle, GPU, battery) and mostly decorative for trim
decisions.

## Options considered

**A. three.js 3D boat from the start.**
- Pros: engaging, orbitable.
- Cons: 150 KB+ bundle, phone GPU/battery cost, hard to read in sun, slower to
  ship, teaches less about sections than a section does.

**B. SVG for sections, rig and plan view; Canvas 2D only if SVG measurably
stutters** (chosen).
- Pros: zero dependencies, crisp at any DPI, styleable with tokens, tiny.
- Cons: no 3D wow factor; complex animation is manual.

## Decision

**We will render every Epic 1 view in SVG, falling back to Canvas 2D only for
a view that measurably drops below 30 fps on a mid-range phone, and defer any
WebGL/three.js work to Epic 2 behind a performance gate.**

## Consequences

Easier: bundle stays small, sun readability is a token change, tests can
assert on path data. Harder: a 3D sail view is postponed. Committed to: SVG
components under `src/ui/race`. Risk accepted: some users will want 3D
before Epic 2.

**Revisit when:** Epic 2 planning, or a measured SVG frame-rate problem.

## Related

- `docs/initial-prompt.md` §Mobile UX constraints
- Research: [02-market-and-physics §Web tech](../research/2026-08-25-sailing-sim-landscape/02-market-and-physics.md)
