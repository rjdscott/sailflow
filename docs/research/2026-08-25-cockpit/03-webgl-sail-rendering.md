# Real-time 3D sail and rig view in the browser

- **Date:** 2026-08-25
- **Method:** Deep web research (WebSearch + WebFetch, 35 sources) plus live npm registry / bundlephobia / GitHub API queries for bundle sizes and maintenance status.

Repo context checked: `package.json` is Svelte 5.56 + Vite 8 + TS + Vitest, no 3D dep yet, `vite-plugin-pwa` present, static build → GitHub Pages. No Playwright installed today.

## 1. Sources

| # | Source | Takeaway |
|---|---|---|
| 1 | npm registry API (`registry.npmjs.org/three`, queried 2026-08-25) | `three@0.185.1`, published 2026-07-01; 14.26M downloads/week |
| 2 | [bundlephobia.com/package/three](https://bundlephobia.com/package/three) (API) | three 0.185.1 = **725.9 KB min / 182.4 KB gzip** for the whole barrel import, 0 deps, `sideEffects` only on `./src/nodes/**` |
| 3 | [bundlephobia.com/package/@babylonjs/core](https://bundlephobia.com/package/@babylonjs/core) (API) | `@babylonjs/core@9.22.1` = **7.81 MB min / 1.73 MB gzip** full package. Tree-shakeable in principle but that is the starting point |
| 4 | [bundlephobia.com/package/@google/model-viewer](https://bundlephobia.com/package/@google/model-viewer) | v4.3.1 = 235.8 KB min / **72.6 KB gzip** — *on top of* three, which it takes as a peer dep |
| 5 | [bundlephobia.com/package/regl](https://bundlephobia.com/package/regl) | regl 2.1.1 = 117 KB min / **37.7 KB gzip**; last publish **2024-11-12** (about 21 months stale) |
| 6 | npm registry `@threlte/core` | latest **8.5.16** (2026-05-25), peers `three >=0.160`, `svelte >=5`, **zero runtime deps**, 154 KB unpacked source. 73k downloads/wk |
| 7 | npm registry `@threlte/extras` | 9.21.0 (2026-06-04), 537 KB unpacked, deps incl. `three-mesh-bvh`, `camera-controls`, `troika-three-text`, `three-perf` — per-component tree-shaking, but easy to accidentally pull a lot |
| 8 | GitHub API `threlte/threlte` | 3,331 stars, 67 open issues, last push 2026-07-30 (docs commits). Active but small; last *code* release 2026-06 |
| 9 | [github.com/threlte/threlte/issues/1411](https://github.com/threlte/threlte/issues/1411) | Historical `@threlte/extras` + runes-mode breakage (`export let` in runes mode). Superseded by v8, but shows the class of risk |
| 10 | [discourse.threejs.org/t/what-is-the-state-of-tree-shaking/33168](https://discourse.threejs.org/t/what-is-the-state-of-tree-shaking/33168) and [tree-shaking-three-js/1349](https://discourse.threejs.org/t/tree-shaking-three-js/1349) | three.js tree-shakes poorly: `WebGLRenderer` drags in most of core. Real-world savings quoted 533 → 320 KB *minified*, not gzip |
| 11 | [github.com/mattdesl/threejs-tree-shake](https://github.com/mattdesl/threejs-tree-shake) | Third-party build hack to strip renderer features; about 340 KB uncompressed saved on a GLTF+OrbitControls app. Evidence the default is bloated but fixable-ish |
| 12 | [threejs.org/docs — OrbitControls](https://threejs.org/docs/#examples/en/controls/OrbitControls) | Built-in touch: 1-finger rotate, 2-finger pinch-zoom and drag-pan. `enableDamping` + `dampingFactor` (0.05), `min/maxDistance`, `min/maxPolarAngle`, `target`. **Must call `controls.update()` per frame when damping is on** |
| 13 | [threejs.org/docs — ParametricGeometry](https://threejs.org/docs/pages/ParametricGeometry.html) / [CatmullRomCurve3](https://threejs.org/docs/pages/CatmullRomCurve3.html) | `ParametricGeometry(f(u,v,target), slices, stacks)` is exactly a lofted grid; `CatmullRomCurve3` for mast bend / forestay polylines with `getPoints()` |
| 14 | [threejs.org/docs — MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html) | `transmission`/`sheen` exist but "higher performance cost per pixel than other materials"; transmission needs a scene render target — bad on phones |
| 15 | [utsubo.com/blog/threejs-best-practices-100-tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips) | Draw-call budget: **under 100 desktop, under 50 mobile**; `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))` (3x retina = 2.25x pixels for no visible gain); `renderer.info.render.calls` as the metric |
| 16 | [digitalstrategyforce.com — three.js mobile](https://digitalstrategyforce.com/journal/how-do-you-optimize-threejs-performance-for-mobile-devices/) | Halve texture dims for mobile, instancing, simpler shaders; DevTools emulation does *not* model GPU limits — test on a real mid-range phone |
| 17 | [playwright.dev/docs/test-snapshots](https://playwright.dev/docs/test-snapshots) | `toHaveScreenshot` with `maxDiffPixels`/`maxDiffPixelRatio`/`threshold`, `stylePath` for masking volatile UI; snapshots keyed `*-chromium-linux`; "run tests in the same environment where baselines were generated" |
| 18 | [createit.com — headless Chrome WebGL + Playwright](https://www.createit.com/blog/headless-chrome-testing-webgl-using-playwright/) | Headless Chromium defaults to SwiftShader (`--use-angle=swiftshader-webgl`); `--use-angle=gl` + `--no-sandbox` enables real GPU (8 → 60 fps). For *determinism* you want the opposite: keep SwiftShader |
| 19 | [davesnider.com/gputests](https://davesnider.com/gputests) and [blog.promaton.com — Testing 3D apps with Playwright on GPU](https://blog.promaton.com/testing-3d-applications-with-playwright-on-gpu-1e9cfc8b54a9) | `xvfb-run` + headed Chromium uses the GPU pipeline; GitHub-hosted runners have no GPU, so software rendering is the CI reality |
| 20 | [github.com/Bartozzz/jest-three](https://github.com/Bartozzz/jest-three) and [discourse.threejs.org/t/66891](https://discourse.threejs.org/t/suggestions-for-unit-testing-with-headless-gl-and-webgl-2/66891) | `headless-gl` works for node WebGL unit tests but is WebGL1-only and painful; consensus is to test geometry/math, not the renderer |
| 21 | [vitest.dev/guide/snapshot](https://vitest.dev/guide/snapshot) | Snapshots churn badly on floaty/volatile output — relevant warning for vertex arrays |
| 22 | [SailVis: Reconstruction and Multifaceted Visualization of Sail Shape](https://www.academia.edu/96541508/SailVis_Reconstruction_and_Multifaceted_Visualization_of_Sail_Shape) | Parameterises each sail section by **chord length, max draft, max-draft position, entry angle at luff, exit angle at leech**, and reconstructs 3D coordinates from those — near-exact match for the solver outputs |
| 23 | [Fossati et al., Experimental database of sails performance and flying shapes upwind](https://www.researchgate.net/publication/258296253_Experimental_database_of_sails_performance_and_flying_shapes_in_upwind_conditions) | Flying shapes reduced to global params: twist, camber, max-draft position per section; parametric model fitted to offset points. Confirms the section-stack representation is the standard reduction |
| 24 | [North Sails — The North Design Suite](https://www.northsails.com/en-us/blogs/north-sails-blog/the-north-design-suite) and [1987 Flow/MemBrain](https://www.northsails.com/sailing/en/2017/04/1987-north-sails-design-suite-expands-with-flow-and-membrain) | Desman builds 3D sail+rig model; **Spine and Spiral** define the moulded surface as *edge curves plus horizontal/vertical shape curves* — a loft of section curves along a spine. MemBrain is FEA on top |
| 25 | [OneSails SailPack Viewer](https://www.onesails.com/sailpack-viewer/) | Commercial in-browser interactive 3D sail-plan viewer — "explore the design from any angle". Proof the orbit-a-sail UX is a shipped product pattern |
| 26 | [SailRhythm sail-trim simulator](https://www.sailrhythm.com/) ([SA thread](https://forums.sailinganarchy.com/threads/new-sail-trim-simulator-sailrhythm.251029/)) | Free browser sim whose 3D view shows draft and twist responding live to trim inputs. Closest public analogue. Renderer not disclosed on the page |
| 27 | [NorthU sail trim simulator](https://northu.com/sailtrimsimulator/) | North's consumer-facing browser trim trainer |
| 28 | [github.com/leeboardtools/bythelee](https://github.com/leeboardtools/bythelee) | **Apache-2.0**, JS 3D sailing sim on three.js + cannon.js, 176 commits, dormant. Forces and lift/drag curves, but no evidence of camber/twist sail-shape geometry — read it for rig scaffolding ideas, not sail lofting |
| 29 | [flyinggorilla/simulator.atterwind.info wiki](https://github.com/flyinggorilla/simulator.atterwind.info/wiki/Simulation) | Open-source A-Class cat apparent-wind sail-trim simulator; documents its sail/trim model |
| 30 | [Brussell03/Ship-Sailing-Simulation](https://github.com/Brussell03/Ship-Sailing-Simulation) | Sails as deformable meshes with vertices pinned to mast/rigging — a cloth-sim alternative we should not need |
| 31 | [Practical Sailor — Draft Stripes](https://www.practical-sailor.com/waypoints-tips/draft-stripes), [SailZing Part 2: Camber](https://sailzing.com/shaping-your-mainsail-part-2-camber/), [Part 3: Draft position](https://sailzing.com/shaping-your-mainsail-part-3-draft-shape-and-position/) | Draft stripes are horizontal stripes at fixed heights used to eyeball camber % and draft position % of chord aft of luff; typical main camber about 1:10, draft about 40% aft. Stripes belong at the *section* heights, sighted from below |
| 32 | [UK Sailmakers AccuMeasure manual (PDF)](https://static1.squarespace.com/static/54603675e4b0ca233d41344f/t/5591a733e4b070a806ce84fc/1435608883497/19UKSailmakersAccuMeasureManual.pdf) | Industry definitions of cross-section / draft-stripe measurement, chord, depth ratio, entry and exit angles — use these conventions so labels match what sailors read |
| 33 | [GrabCAD — how models can be used](https://help.grabcad.com/article/246-how-can-models-be-used-and-shared) and [Sketchfab licenses](https://sketchfab.com/licenses) | GrabCAD free library = **private / non-commercial only**, per-model permission needed otherwise. Sketchfab is per-model CC (CC0/CC-BY ok, CC-BY-NC and "editorial" not). No public J/70 model with a clean licence surfaced; J/70 is a trademarked one-design |
| 34 | [firgelliauto.com — catenary vs parabolic cable](https://www.firgelliauto.com/blogs/engineering-calculators/cable-tension-calculator-catenary-and-parabolic) | Parabola is within about 1% of catenary when sag is under 10% of span — forestay sag is 1–3%, so a **parabola / quadratic Bézier is exact enough** |
| 35 | [YACHT — forestay tension and sag](https://www.yacht.de/en/diy/care/rig-trim-forestay-tension-the-forgotten-trim-instrument/) | Forestay sag is sail-load-driven, bows to leeward *and* forward; it is not a self-weight catenary. Sag must be a 3D offset, not just in-plane |

## 2. Library choice

Numbers (all gzipped, measured 2026-08-25 via bundlephobia API):

| Option | Gzip | Notes |
|---|---|---|
| three 0.185.1 (full barrel) | **182.4 KB** | 725.9 KB min. Realistic tree-shaken app: about 110–140 KB gzip — *thin evidence*, forum-sourced, so budget 150 KB and measure |
| three + OrbitControls addon | +about 4 KB | addons are separate ESM, shake fine |
| @threlte/core 8.5.16 | about 10–15 KB **est.** | 154 KB unpacked *source*, zero runtime deps, ships uncompiled Svelte; real cost is compiler output. Not directly measurable (bundlephobia 500s on scoped packages) |
| @threlte/extras 9.21.0 | varies, up to +100 KB | pulls `three-mesh-bvh`, `camera-controls`, `troika-three-text` if you touch those components |
| @babylonjs/core 9.22.1 | **1.73 MB** full | tree-shakes down, but no credible minimal-scene gzip published; assume 300 KB+. Overkill |
| @google/model-viewer 4.3.1 | 72.6 KB **plus three** | glTF-only; we have procedural geometry, not glTF. Ruled out |
| regl 2.1.1 | 37.7 KB | last publish 2024-11; hand-write normals, lighting, picking, orbit maths, resize. Saves about 110 KB, costs weeks |

Svelte 5 compat: Threlte 8 peer-depends `svelte >=5` and is built on runes — it is the Svelte-5 line, and issue #1411 (extras/runes) belongs to the v7 era. Maintenance is real but thin: 3.3k stars, 67 open issues, last code release June 2026, last pushes are docs.

**Verdict: raw `three` + `OrbitControls`, no Threlte.** One 3D view driven by one plain-object solver output. Threlte's value is declarative scene graphs reacting to component state; this scene is about 12 objects rebuilt from one `$derived` snapshot. A single `.svelte` file with `onMount` → renderer, `$effect` → `rebuildSails(solverOutput)`, `onDestroy` → `renderer.dispose()` is about 80 lines, zero extra dependency surface, no peer-version coupling. Revisit Threlte if the scene grows per-object interactivity (picking, tweening, multiple views).

## 3. Sail mesh from sectional shape data

The literature (SailVis #22, Fossati #23) and industry practice (North Spine/Spiral #24) agree on the same reduction we already have: a sail is a **stack of 2D section curves**, each defined by chord, camber, draft position, entry angle and twist, positioned along a 3D luff spine. So: loft, do not simulate cloth (#30 is the expensive path we skip).

**Section curve.** A cubic Bézier in section-local (x, y), x in [0,1] along the chord, is enough and closed-form:

- P0 = (0,0), P3 = (1,0) (luff → leech; exit angle sets P2)
- P1, P2 solved so max ordinate is camber at x about draft position, and dy/dx at x=0 = tan(entry angle)

Solve once with a 2-parameter Newton or a closed-form approximation; unit-test the invariants rather than the coefficients. Sample chordwise with **cosine clustering** (dense at the luff) — the entry region is where the shape reads and where flat sampling shows facets.

**Interpolation between the quarter/half/three-quarter sections.** We get 3 knots (plus foot, plus head). Catmull-Rom overshoots on monotone-ish data (twist ramps monotonically), producing a fake extra hook in the upper leech. Use **monotone cubic (Fritsch–Carlson / PCHIP)** per parameter (camber, draft pos, twist, entry, chord). This is the one place not to be lazy.

**Shading and look.**

- `computeVertexNormals()` on the built grid, or analytic normals from the parametric derivatives (cheaper, exact, no seam artefacts). `side: THREE.DoubleSide`, `flatShading: false`.
- **Backlit translucency without `transmission`** (#14: transmission is per-pixel expensive and needs a render target): `MeshLambertMaterial`/`MeshPhongMaterial` with an `onBeforeCompile` half-Lambert/wrap term (`dotNL*0.5+0.5`) plus a back-face tint boost. Or two draw passes: back faces at lower opacity. North 3Di-visualiser look for about 15 lines of GLSL, no framebuffer cost.
- **Draft stripes: do not texture them.** We already compute the section polylines — draw stripes as `LineSegments` from those exact points, merged into one geometry (1 draw call for all stripes, both sails). They move with the mesh by construction and are guaranteed consistent with the numeric readout. A texture would need UV work and blur on a phone.
- **Leech/luff lines**: same trick, the boundary rows of the grid → `Line`.
- **Telltales**: 3–6 tiny ribbons, each a 4-quad strip, vertex-animated in a shader by `uTime` with a per-telltale phase offset. One `InstancedMesh` or one merged geometry = 1 draw call. Freeze at `uTime = 0` under `prefers-reduced-motion` and under Playwright.

## 4. Rig

- **Mast**: `TubeGeometry` along a `CatmullRomCurve3` through the bend curve, `radialSegments: 6–8` (nobody sees mast roundness), tapered via a custom radius if wanted. Rake = rotate the whole rig group about the mast step.
- **Forestay**: quadratic Bézier from stemhead to hounds, mid control point offset by sag, **to leeward and forward**. Parabola is within 1% of catenary at these sag ratios (#34), and the real driver is sail load not self-weight (#35) — so a parabola is the *more* correct model, not just the lazier one. Render as `Line`, not a tube.
- **Shrouds / spreaders / boom**: straight `Line` segments and one thin box or tube each. Merge all standing rigging into one `LineSegments`.
- **Hull**: **procedural, do not source a model.** GrabCAD's free library is non-commercial/private-use (#33), Sketchfab is per-model CC roulette, and "J/70" is a trademarked one-design — a branded model on a public GitHub Pages site is a licence and trademark problem. Build it from about 6 hand-typed station half-breadths lofted with the same loft function, mirrored about centreline, plus a deck plane. About 30 lines, about 400 tris, no attribution obligations. Label it "sportboat hull, illustrative".
- **Heel**: rotate the boat+rig group about the waterline axis; keep the water plane and camera in world space so heel reads correctly.

## 5. Camera

`OrbitControls` from `three/addons` (#12) covers phone gestures natively — 1-finger rotate, pinch zoom, 2-finger pan. Config: `enableDamping = true`, `dampingFactor = 0.05`, `target` at about one third mast height, `minDistance`/`maxDistance` clamped to boat size, `maxPolarAngle` slightly under π so you cannot get under the seabed, `enablePan = false` on touch (accidental pan is the number one phone annoyance). Call `controls.update()` each frame.

Presets are four `{position, target}` pairs tweened over about 600 ms (lerp position and target, then `controls.update()`):

- **astern** — down the leech, reads twist
- **leeward quarter** — the money shot, reads camber and draft
- **up the luff** — camera at the tack looking up the mast, the sailor's real sighting view, reads entry angle and twist together
- **top-down** — reads sheeting angles and stacked section shape

Skip the tween under `prefers-reduced-motion` — jump-cut.

## 6. Performance

- Scene total is about 10 objects if merged: main, jib, stripes (1), rigging lines (1), mast, boom, hull, water, telltales (1). An order of magnitude under the sub-50 mobile draw-call budget (#15) — headroom to *not* optimise further.
- `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))` (#15). Consider 1.5 if `navigator.hardwareConcurrency <= 4`. Keep `antialias: true`; at about 1.4k tris MSAA costs nothing and leech-line aliasing is otherwise the most visible flaw.
- Resize: `ResizeObserver` on the canvas parent (not `window.resize` — it misses layout-driven resizes and misfires on mobile URL-bar collapse), debounce a frame, then `setSize` + `camera.updateProjectionMatrix()`.
- **Render on demand.** A continuous `setAnimationLoop` for a static sail is a battery bug. Render only when (a) controls emit `change`, (b) solver output changes, (c) telltales are animating. Telltales are the only continuous consumer — gate them behind `prefers-reduced-motion`, `document.visibilityState === 'visible'` (`visibilitychange` listener) and an `IntersectionObserver` on the canvas.
- Rebuilding a 768-vertex geometry per solver tick is fine (under 1 ms), but reuse the same `BufferAttribute` arrays with `needsUpdate = true` rather than allocating a new `BufferGeometry` — avoids GC hitches during a slider drag.
- Dispose geometries, materials and renderer on unmount; Svelte HMR otherwise leaks contexts and hits the roughly 16-context browser limit in dev.
- Load the whole 3D view via `await import('./SailView.svelte')` so the about 150 KB gzip never lands on first paint.

## 7. Testing determinism

**Tier 1 — pure geometry (the one that matters).** Keep `sections -> {positions, indices, normals}` in a plain `.ts` module with zero `three` imports (take `three` only at the call site that stuffs arrays into a `BufferGeometry`). Then Vitest needs no WebGL, no jsdom, no `headless-gl` (#20). Test **invariants, not snapshots** (#21):

- max abs(y) of a section equals requested camber within 1e-3, at x equals requested draft position within 0.02
- dy/dx at x=0 equals tan(entry angle)
- vertex count equals `nSections * nChord`; every index below vertex count; no NaNs
- all normals unit length; normals point consistently outboard (dot with a reference above 0)
- twist monotonicity preserved (no overshoot) when interpolating the three knots
- degenerate inputs: camber 0 gives a planar sail; chord 0 at head gives no NaN normals

**Tier 2 — one golden snapshot.** A single `toMatchSnapshot` of positions rounded to 4 dp for one canonical trim state. Catches unintended global changes, cheap to regenerate. One, not per-function.

**Tier 3 — visual regression.** Playwright `toHaveScreenshot` (#17). For determinism: fixed viewport, `deviceScaleFactor: 1`, camera set from a URL param (`?preset=leeward&freeze=1`), telltale `uTime` pinned to 0, `animations: 'disabled'`, and `page.waitForFunction` on a `window.__sailViewReady` flag set after the first render. Run **headless Chromium with its default SwiftShader** (#18) — software rendering is what you want, because GitHub-hosted runners have no GPU (#19) and SwiftShader is identical everywhere. Generate baselines inside `mcr.microsoft.com/playwright:v<x>-noble` locally and in CI so the `-chromium-linux` snapshots match; set `maxDiffPixelRatio: 0.01` to absorb residual float wobble across minor Chromium versions.

Tier 1 plus one tier-3 smoke shot ("it rendered something with the right silhouette") buys about 95% of the value. Full per-preset visual regression is a maintenance tax on a view whose whole point is that it changes appearance.

## 8. Recommended stack

```
three@^0.185          // + three/addons/controls/OrbitControls.js
```

That is it. No Threlte, no Babylon, no model-viewer, no regl, no glTF assets, no physics.

Justification: every input is numeric and every output is procedural geometry — the value of a scene-graph wrapper does not exist here, and the value of a big engine (asset pipeline, PBR, physics, XR) does not either. Threlte is defensible and genuinely Svelte-5-native, but it adds peer-version coupling to a 3.3k-star project in exchange for about 80 lines of imperative glue written once. model-viewer is glTF-only. Babylon starts 10x heavier. regl means writing our own lighting and orbit maths.

Estimated bundle cost: about 150 KB gzip for three + OrbitControls after Vite tree-shaking (upper bound 182 KB, the full-barrel measurement) plus about 5 KB of our own code, **in a lazily-imported chunk** so the existing app's first load is unchanged. Flag: the tree-shaken figure is extrapolated from forum reports (#10, #11), not measured on our build — verify with `rollup-plugin-visualizer` on day one and do not promise a number before then.

## 9. Mesh-generation algorithm sketch

Pure function, no `three` import, no class allocation — testable in Vitest as-is.

```ts
type Section = {
  h: number            // 0 = foot, 1 = head
  chord: number        // m
  camber: number       // max draft / chord, e.g. 0.12
  draftPos: number     // 0..1 aft of luff, e.g. 0.42
  entryAngle: number   // rad, positive = luff hooked to windward
  twist: number        // rad, relative to boom/sheet base angle
}
type Spine = (h: number) => Vec3   // luff point at height h: mast bend, or forestay sag curve
type SailMesh = { positions: Float32Array; normals: Float32Array;
                  indices: Uint16Array; stripeRows: number[] }

function buildSail(
  sections: Section[],      // the ¼ ½ ¾ knots + synthesised foot & head
  spine: Spine,
  baseAngle: number,        // boom angle (main) or jib sheet angle
  N = 24,                   // spanwise samples
  M = 32                    // chordwise samples
): SailMesh {

  // 1. Monotone-cubic (PCHIP) interpolators over h for each parameter.
  //    NOT Catmull-Rom: it overshoots on the monotone twist ramp and
  //    invents a phantom hook in the upper leech.
  const P = pchipAll(sections)          // h -> Section

  // 2. Chordwise sample positions, cosine-clustered toward the luff,
  //    where entry angle lives and faceting shows.
  const xs = range(M).map(j => 0.5 * (1 - cos(PI * j / (M - 1))))

  const positions = new Float32Array(N * M * 3)
  const normals   = new Float32Array(N * M * 3)

  for (let i = 0; i < N; i++) {
    const h = i / (N - 1)
    const s = P(h)

    // 3. Section profile: cubic Bezier in (x, y), x along chord.
    //    P0=(0,0) P3=(1,0); P1,P2 solved so that
    //      dy/dx|_{x=0} = tan(entryAngle)  and  max y = camber at x = draftPos.
    //    Closed-form seed + 2 Newton steps; deterministic, ~20 flops.
    const prof = solveSectionBezier(s.camber, s.draftPos, s.entryAngle)

    // 4. Frame: luff point from the spine; chord direction rotated by
    //    (baseAngle + twist) about the local luff tangent (vertical-ish).
    const L = spine(h)
    const tangent = spineTangent(spine, h)              // local "up"
    const chordDir = rotateAbout(FORE_AFT, tangent, baseAngle + s.twist)
    const camberDir = cross(tangent, chordDir)          // + = to leeward

    for (let j = 0; j < M; j++) {
      const x = xs[j], y = bezierY(prof, x)
      const p = L
        .addScaled(chordDir,  x * s.chord)
        .addScaled(camberDir, y * s.chord)
      write3(positions, i * M + j, p)

      // 5. Analytic normal from the two parametric derivatives.
      //    Cheaper and seam-free vs computeVertexNormals().
      const du = dPos_dx(prof, x, s, chordDir, camberDir)
      const dv = dPos_dh(P, spine, h, x, baseAngle)     // central difference is fine
      write3(normals, i * M + j, normalize(cross(dv, du)))
    }
  }

  // 6. Standard grid indices. N*M <= 65535 keeps Uint16.
  const indices = new Uint16Array((N - 1) * (M - 1) * 6)
  let k = 0
  for (let i = 0; i < N - 1; i++)
    for (let j = 0; j < M - 1; j++) {
      const a = i * M + j, b = a + 1, c = a + M, d = c + 1
      indices[k++]=a; indices[k++]=c; indices[k++]=b
      indices[k++]=b; indices[k++]=c; indices[k++]=d
    }

  // 7. Draft stripes are just the rows i whose h matches ¼ ½ ¾ —
  //    no texture, no extra maths, guaranteed to agree with the readout.
  return { positions, normals, indices,
           stripeRows: [0.25, 0.5, 0.75].map(h => round(h * (N - 1))) }
}
```

Cost: 768 verts / 1,426 tris per sail. Two sails plus hull plus rig is about 3.5k tris and about 10 draw calls. Rebuild under 1 ms; call it straight from a Svelte `$effect` on the solver output.

Heel and rake are **not** in this function — they are a rotation on the parent `Object3D`. Keeps the pure function pure and the tests independent of attitude.

## 10. Risks

1. **Sign/convention drift.** Twist positive means the leech falls off to leeward; entry angle positive means what? The solver, the literature (#22, #32) and sailmakers each have conventions. Pin them in one commented types file and assert them in tests, or we ship a sail that twists the wrong way and nobody notices for a month.
2. **Interpolation overshoot.** Catmull-Rom on 3 knots (#13's obvious choice) overshoots. Use PCHIP. Most likely source of a "that does not look like a sail" bug.
3. **Head and foot are not given.** We have quarter/half/three-quarter only. Extrapolating to h=0 and h=1 is a modelling decision (chord to headboard width, foot camber to shelf). Make it explicit and configurable — it dominates the silhouette, which is what people judge.
4. **Bundle number is unverified.** About 150 KB gzip is extrapolated from forum reports, not measured on our build. **Thin evidence — measure before committing to it in docs.**
5. **Threlte bus factor.** If adopted: 3.3k stars, last code release June 2026, docs-only commits since.
6. **`@threlte/extras` gzip is unmeasured** — the 537 KB figure is *unpacked source*.
7. **SailRhythm / SailPack renderer stacks are undisclosed** — cited as UX precedent only.
8. **Visual-regression flake.** SwiftShader output can shift between Chromium versions; pin the Playwright docker tag and expect to regenerate baselines on upgrade.
9. **No public J/70 model with a usable licence surfaced.** Procedural hull sidesteps both licence and trademark (#33).
10. **Backlit look via custom `onBeforeCompile`** couples us to three's shader chunk internals. Pin the three minor version, or accept a plain double-sided material — it is polish, not information.
