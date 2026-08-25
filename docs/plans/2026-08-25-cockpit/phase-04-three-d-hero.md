# Phase 04: 3D hero view

## Goal

A three.js sail and rig view, lofted from the solver's sections, orbiting
with four sighting presets, loaded lazily, falling back to the 2D plan
view, with geometry tested without a GPU and one software-rendered smoke
screenshot in CI (ADR 0014).

## Tasks

- [x] `pnpm add three` (+ `@types/three`); `rollup-plugin-visualizer` dev; measure the chunk, record gzip size in this log and ADR 0014 Related.
- [x] `src/ui/three/conventions.ts`: axes, twist sign, entry sign, leeward sign; tests that assert agreement with `boat.ts`/`geometry.ts`.
- [x] `src/ui/three/loft.ts` (pure, no `three` import): Bézier section solve (camber, draftPos, entry), PCHIP over height, cosine chord sampling, analytic normals, grid indices, stripe rows; foot/head extrapolation explicit (`prov: assumed`, ASSUMPTIONS row). Invariants: camber/draftPos/entry within tol, no NaN, unit normals, monotone twist, degenerate inputs. One golden snapshot.
- [x] `src/ui/three/hull.ts`: procedural sportboat hull from ~6 stations (class LOA/beam), deck plane, labelled illustrative. `rig3d.ts`: mast tube from `bendMm`, forestay parabola with sag to leeward and forward, shrouds/spreaders/boom as merged `LineSegments`.
- [x] `src/ui/three/SailView3D.svelte`: renderer, DPR cap 2 (1.5 when `hardwareConcurrency <= 4`), `ResizeObserver`, render-on-demand, visibility + intersection pause, dispose; sails double-sided with half-Lambert wrap; draft stripes + leech/luff lines from loft rows; telltale ribbons one merged geometry with `uTime` (frozen under reduced motion); heel and rake as parent rotations; `window.__sailViewReady` flag.
- [x] Camera: OrbitControls damping, no pan on touch, clamped distance/polar; presets astern / leeward quarter / up-the-luff / top-down tweened 600 ms, jump under reduced motion; preset chips in the hero header; `?view=` URL param.
- [x] Race hero: `await import('./SailView3D.svelte')` on mount; fallback to `PlanView` when `!WebGLRenderingContext` or first frame > 50 ms (prov: assumed phone budget); user toggle 3D/Plan persisted.
- [x] CI: `ui-smoke` job adds a SwiftShader screenshot of `#/race?view=leeward&freeze=1`, `maxDiffPixelRatio: 0.01`; first-load chunk size asserted unchanged (`scripts/bundle_check.mjs`).

## Verification

```sh
make check
pnpm build && node scripts/bundle_check.mjs
pnpm test:ui

# Screenshot baselines must be regenerated in the image CI pins, or SwiftShader
# drift between Chromium builds shows up as a phantom UI change:
docker run --rm --ipc=host -v "$PWD":/w -w /w -e CI=1 \
  mcr.microsoft.com/playwright:v1.62.1-noble npx playwright test --update-snapshots=all
```

## Artifacts

- `src/ui/three/{conventions,loft,hull,rig3d}.ts` + tests, `SailView3D.svelte`, `scripts/bundle_check.mjs`, `tests/ui/race-3d.spec.ts` + snapshot, ASSUMPTIONS rows.

## Progress log

### 2026-08-25 — phase complete

**Measured bundle (the number ADR 0014 committed to publishing).** Baseline
taken on this branch *before* `three` was installed, gzip level 9, entry chunk
as referenced by `index.html`:

| | Entry chunk (first load) | three.js hero chunk |
|---|---|---|
| Before | 102,607 B (100.2 KB) | — |
| After | 104,940 B (102.5 KB) | 568,950 B raw / 142,697 B (**139.4 KB**) gzip |

So the renderer costs **139.4 KB gzip and none of it is on first load** —
comfortably inside the 150 KB budget and the 250 KB revisit line. The +2.3 KB
on the entry is the hero glue that has to be there to decide whether to load
3D at all: `SailHero`, the camera presets, the WebGL and first-frame gates.
`scripts/bundle_baseline.json` carries both numbers and `bundle_check.mjs`
asserts the current one in CI. Verified with `ANALYZE=1 pnpm build` once (the
visualizer is left wired but env-gated) and by grepping the entry chunk for
`WebGLRenderer`: zero hits.

**Deliberate deviations from the phase brief**, all in the same direction —
use what the repo already has rather than invent a constant:

- **Head chord is published, not assumed.** The brief specified a 0.1 m
  headboard, `prov: assumed`. `j70.json` already carries Class Rules G.3/G.4.3
  top widths (main 364 mm, jib 64 mm), so those are used and the honesty rows
  cover only what is genuinely extrapolated — head camber, head entry, head
  twist, foot twist.
- **The section curve is a quartic, solved closed form.** The sketch called for
  a cubic Bézier plus Newton steps. Three conditions (camber, draft position,
  luff tangent) need three free coefficients and a cubic has two; pinning a
  quartic Bézier's abscissae makes `x(t) = t`, so it reduces to two linear
  equations and there is no root finder and no inversion. All three invariants
  hold exactly — `loft.test.ts` asserts them.
- **Normals from grid central differences**, not analytic parametric
  derivatives. Seam-free by construction, and it does not have to be
  re-derived every time the profile changes.
- **`buildSail` takes `side`.** The brief's signature omitted it. It cannot be
  omitted: a chord on the centreline is the same vector on either tack, and
  only the tack says which face of the aerofoil is the leeward one. There is a
  test for exactly this.
- **Rake is baked into the mast polyline**, not a parent-group rotation, which
  is what `race/geometry.ts:mastPoints` does in 2D — so the luff spine and
  everything hanging off it follow the real spar. Heel *is* a parent rotation.
- **The screenshot is clipped to the hero card**, not the viewport. Phase 02 is
  replacing the readouts beside it concurrently; a viewport baseline would
  break on their layout, not on anything 3D. Masking hides pixels, it does not
  stop layout moving. There are no numbers inside the clip.
- **`SailHero` wraps the swap** rather than Race owning it, so the Race edit is
  two component swaps and one import.

**Incidents.**

- A `vite preview` left running on 4173 by another checkout served a *different
  build of this app* to Playwright, and the failure read as a UI bug for
  several cycles. `playwright.config.ts` now uses port 4318 and
  `reuseExistingServer: false`, and says why.
- Both responsive copies of the hero mounted (Race renders both layouts and
  lets CSS hide one), so every Race visit was taking **two** WebGL contexts,
  one permanently invisible. `SailHero` now gates the 3D branch on the slot
  having non-zero width; the hidden copy keeps the (also hidden) SVG and never
  fetches the chunk.
- Precaching: workbox was pulling the 570 kB hero chunk into the service
  worker's precache on first visit, handing every phone the download the lazy
  import exists to avoid. `globIgnores` now excludes it; it is fetched on
  demand and offline the Race screen keeps the 2D view, which is the designed
  fallback anyway. Precache is back to 410 KiB from 1,261 KiB.

**Screenshot baseline** was generated *inside*
`mcr.microsoft.com/playwright:v1.62.1-noble`, the tag `ci.yml` pins, so
`maxDiffPixelRatio` is the intended 0.01 rather than the 0.02 fallback. A host
Chromium of the same version differs by 2 % of pixels — pure antialiasing
wobble on the sail edges — so `threshold` is raised to 0.35, which lets a local
`pnpm test:ui` pass without loosening the silhouette check. Regenerate in the
image with `pnpm test:ui:update`.

**Verification run.** `make check` green (963 vitest tests, 70 of them new in
`src/ui/three`); `pnpm build` clean; `node scripts/bundle_check.mjs` OK;
`pnpm test:ui` 2 passed, and the same suite 2 passed inside the pinned docker
image.

**Not done, deliberately.**

- No custom `onBeforeCompile` backlit shader (research risk 10). Double-sided
  Lambert plus a leeward fill light reads well enough and does not couple us to
  three's shader chunk internals.
- Camera presets are framing chosen by eye against rendered shots, `prov:
  assumed`. The top-down preset is deliberately *not* straight down: a vertical
  camera makes the up-vector degenerate and the boat spins on its own axis
  while you orbit.
- The hull is illustrative and stays dark at the leeward preset because a 6.9 m
  hull under an 8.5 m rig is a sliver of the frame. Visual polish belongs to
  phase 06.
- No per-preset visual regression. One smoke shot plus the tier-1 invariants is
  the ADR's position; four baselines on a view whose whole point is that it
  changes appearance is a maintenance tax.

- **2026-08-25 — merged onto main after phase 02.** Entry baseline rebased 104,940 → 110,701 B gzip: the growth is phase 02's InstrumentBar, instruments and polar data (merged after the baseline was taken), not the hero — the entry chunk still contains no `WebGLRenderer`. Merge conflicts: ci.yml (Playwright image has no make → `pnpm install`), playwright.config.ts (took phase 04's port 4318 / no reuse), Race.svelte imports.
- **2026-08-25 — live check found the gate failing on an RTX 4070.** `onready` reported mount→first render (context + shader compile, ~100 ms anywhere); now reports the render time of a warm second frame. Theme default switched to dark (the live site rendered light on a light-OS machine, contradicting ADR 0015). PR #55.
- **2026-08-25 — owner feedback on the live hero.** Jib ribbons read as "on the luff": the pair was anchored at grid column 1, i.e. on the forestay. Moved to the nearest column to 15 % chord (`loft.nearestColumn`, prov: assumed sailmaker placement), lifted 4 cm off the cloth so they are not buried in the surface, and jib upper-leech ribbons added at ½ and ¾ (research 02 S12: North reads upper leech flow 90–100 %). Owner asked for a view from the cockpit up the main: `helm` preset added, which needed `maxPolarAngle` raised from 0.495π to 0.9π — the old clamp forced any upward-looking camera above its target. Screenshot baseline regenerated in the pinned image. Also restores `data/boats/j70.json` and `src/core/shape/base.ts` to their #55 state: a phase-05 agent edited them in the main checkout and a docs commit swept the half-done change onto main (CI red at 02bf851). PR #56.
- **2026-08-25 — main leech ribbons drifted 1 m to leeward after #56.** The main-leech call still passed the old `-1` side argument into the new `lift` parameter. Measured in the browser via a DEV-only `window.__sail` handle (kept): worst root-to-cloth distance now 0.04 m, the intended luff lift. Anchor maths moved to `loft.ribbonAnchor` with tests that a leech ribbon roots exactly on the leech vertex and a lifted one sits `lift` off it. PR #57.
