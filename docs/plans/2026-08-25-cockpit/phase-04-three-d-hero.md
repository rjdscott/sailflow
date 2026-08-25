# Phase 04: 3D hero view

## Goal

A three.js sail and rig view, lofted from the solver's sections, orbiting
with four sighting presets, loaded lazily, falling back to the 2D plan
view, with geometry tested without a GPU and one software-rendered smoke
screenshot in CI (ADR 0014).

## Tasks

- [ ] `pnpm add three` (+ `@types/three`); `rollup-plugin-visualizer` dev; measure the chunk, record gzip size in this log and ADR 0014 Related.
- [ ] `src/ui/three/conventions.ts`: axes, twist sign, entry sign, leeward sign; tests that assert agreement with `boat.ts`/`geometry.ts`.
- [ ] `src/ui/three/loft.ts` (pure, no `three` import): Bézier section solve (camber, draftPos, entry), PCHIP over height, cosine chord sampling, analytic normals, grid indices, stripe rows; foot/head extrapolation explicit (`prov: assumed`, ASSUMPTIONS row). Invariants: camber/draftPos/entry within tol, no NaN, unit normals, monotone twist, degenerate inputs. One golden snapshot.
- [ ] `src/ui/three/hull.ts`: procedural sportboat hull from ~6 stations (class LOA/beam), deck plane, labelled illustrative. `rig3d.ts`: mast tube from `bendMm`, forestay parabola with sag to leeward and forward, shrouds/spreaders/boom as merged `LineSegments`.
- [ ] `src/ui/three/SailView3D.svelte`: renderer, DPR cap 2 (1.5 when `hardwareConcurrency <= 4`), `ResizeObserver`, render-on-demand, visibility + intersection pause, dispose; sails double-sided with half-Lambert wrap; draft stripes + leech/luff lines from loft rows; telltale ribbons one merged geometry with `uTime` (frozen under reduced motion); heel and rake as parent rotations; `window.__sailViewReady` flag.
- [ ] Camera: OrbitControls damping, no pan on touch, clamped distance/polar; presets astern / leeward quarter / up-the-luff / top-down tweened 600 ms, jump under reduced motion; preset chips in the hero header; `?view=` URL param.
- [ ] Race hero: `await import('./SailView3D.svelte')` on mount; fallback to `PlanView` when `!WebGLRenderingContext` or first frame > 50 ms (prov: assumed phone budget); user toggle 3D/Plan persisted.
- [ ] CI: `ui-smoke` job adds a SwiftShader screenshot of `#/race?view=leeward&freeze=1`, `maxDiffPixelRatio: 0.01`; first-load chunk size asserted unchanged (`scripts/bundle_check.mjs`).

## Verification

```sh
make check
pnpm build && node scripts/bundle_check.mjs
pnpm exec playwright test --project=chromium
```

## Artifacts

- `src/ui/three/{conventions,loft,hull,rig3d}.ts` + tests, `SailView3D.svelte`, `scripts/bundle_check.mjs`, `tests/ui/race-3d.spec.ts` + snapshot, ASSUMPTIONS rows.

## Progress log
