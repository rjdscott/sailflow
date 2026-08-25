<script lang="ts">
  /**
   * The 3D sail and rig hero (ADR 0014). Every shape in here is built by the
   * pure modules next door — `loft.ts`, `hull.ts`, `rig3d.ts` — so this file
   * is only the `three` glue: renderer, materials, camera, lifecycle.
   *
   * It renders on demand. A static sail on a continuous `setAnimationLoop` is
   * a battery bug, so a frame is drawn when the controls move, when the solver
   * answers, or while the telltales are streaming — and never while the tab is
   * hidden or the canvas is scrolled off screen.
   */
  import {
    AmbientLight,
    BufferAttribute,
    BufferGeometry,
    CatmullRomCurve3,
    Color,
    DirectionalLight,
    DoubleSide,
    Float32BufferAttribute,
    Fog,
    GridHelper,
    Group,
    Line,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshBasicMaterial,
    MeshLambertMaterial,
    PerspectiveCamera,
    PlaneGeometry,
    Scene,
    ShaderMaterial,
    TubeGeometry,
    Vector3,
    WebGLRenderer,
  } from 'three';
  import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
  import { onMount } from 'svelte';
  import type { RaceControls, SolveResult } from '../../core/types';
  import { boomAngle, jibSheetAngle } from '../race/boat';
  import { settings } from '../stores/settings.svelte';
  import { DEG2RAD, heelRad, lee, tackSide, type Side, type Vec3 } from './conventions';
  import { deckMesh, hullMesh, WATER_Y } from './hull';
  import {
    buildSail,
    gridColumn,
    gridRow,
    nearestColumn,
    sectionStack,
    type SailMesh,
  } from './loft';
  import { JIB_CHORDS, MAIN_CHORDS, rig3d, type Rig3D } from './rig3d';
  import { PRESETS, type PresetId } from './presets';

  let {
    result,
    twaDeg,
    heelDeg,
    controls,
    preset = $bindable('leeward' as PresetId),
    freeze = false,
    jibUp = true,
    onready,
  }: {
    result: SolveResult;
    twaDeg: number;
    heelDeg: number;
    controls: RaceControls;
    preset?: PresetId;
    freeze?: boolean;
    jibUp?: boolean;
    /** First frame drawn, with the milliseconds it took — the perf gate. */
    onready?: (ms: number) => void;
  } = $props();

  let host: HTMLDivElement;
  // The canvas is in the template rather than `renderer.domElement` appended
  // by hand: three takes one happily, and Svelte keeps ownership of the DOM.
  let canvas: HTMLCanvasElement;

  // --- scene ---------------------------------------------------------------

  const scene = new Scene();
  scene.background = new Color('#0a1520'); // prov: assumed — dusk water, tokens v2 dark shell
  scene.fog = new Fog('#0a1520', 26, 70);

  /** Heels; everything inside it is in the boat frame of `conventions.ts`. */
  const boat = new Group();
  scene.add(boat);

  const SAIL_COLOUR = '#e8eef4';
  const sailMat = new MeshLambertMaterial({
    color: SAIL_COLOUR,
    side: DoubleSide,
    transparent: true,
    opacity: 0.94,
  });
  const sparMat = new MeshLambertMaterial({ color: '#3d4a57' });
  const wireMat = new LineBasicMaterial({ color: '#7d8b99' });
  const stripeMat = new LineBasicMaterial({ color: '#ff8a3d' });
  const edgeMat = new LineBasicMaterial({ color: '#5f7186' });

  // Double-sided: the hull is a generated open shell, so which way a station
  // triangle happens to face is not worth reasoning about for four hundred
  // triangles that never occlude anything.
  const hull = new Mesh(
    toGeometry(hullMesh()),
    new MeshLambertMaterial({ color: '#8ea6bd', side: DoubleSide }),
  );
  const deck = new Mesh(
    toGeometry(deckMesh()),
    new MeshLambertMaterial({ color: '#a9bccf', side: DoubleSide }),
  );
  boat.add(hull, deck);

  const mainSail = new Mesh(new BufferGeometry(), sailMat);
  const jibSail = new Mesh(new BufferGeometry(), sailMat);
  boat.add(mainSail, jibSail);

  const stripes = new LineSegments(new BufferGeometry(), stripeMat);
  const edges = new LineSegments(new BufferGeometry(), edgeMat);
  const rigging = new LineSegments(new BufferGeometry(), wireMat);
  const forestay = new Line(new BufferGeometry(), wireMat);
  boat.add(stripes, edges, rigging, forestay);

  let mast: Mesh | null = null;
  let boom: Mesh | null = null;

  // Telltales: one merged geometry, animated in the vertex shader off `uTime`.
  // Six ribbons is one draw call, and freezing is a uniform, not a rebuild.
  const telltaleMat = new ShaderMaterial({
    side: DoubleSide,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      uniform float uTime;
      attribute vec3 aRoot;
      attribute vec3 aDir;
      attribute vec3 aUp;
      attribute vec2 aUv;      // x: 0..1 along the ribbon, y: -0.5..0.5 across
      attribute float aPhase;
      varying float vSpan;
      void main() {
        vSpan = aUv.x;
        float wave = sin(uTime * 6.0 + aPhase + aUv.x * 5.0) * 0.05 * aUv.x;
        vec3 p = aRoot + aDir * (aUv.x * 0.26) + aUp * (aUv.y * 0.028 + wave);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      varying float vSpan;
      void main() { gl_FragColor = vec4(0.98, 0.35, 0.35, 1.0 - vSpan * 0.35); }`,
    transparent: true,
  });
  const telltales = new Mesh(new BufferGeometry(), telltaleMat);
  boat.add(telltales);

  // Water and the grid stay in world space, so heel reads against them.
  const water = new Mesh(new PlaneGeometry(90, 90), new MeshBasicMaterial({ color: '#0d2233' }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = WATER_Y;
  const grid = new GridHelper(60, 60, '#1d3a4f', '#14293a');
  grid.position.y = WATER_Y + 0.01;
  (grid.material as LineBasicMaterial).transparent = true;
  (grid.material as LineBasicMaterial).opacity = 0.45;
  scene.add(water, grid);

  // Two lights, not one. A single sun leaves whichever side the camera is on
  // in shadow half the time, and the leeward quarter — the view that reads
  // camber — is the one that matters most. The fill is the weaker of the two,
  // so the sail still has a lit face and a shaded face.
  scene.add(new AmbientLight('#93aec4', 1.25));
  const sun = new DirectionalLight('#fff3e0', 1.5);
  sun.position.set(6, 12, 9);
  const fill = new DirectionalLight('#cfe2f5', 0.9);
  fill.position.set(-5, 7, -9);
  scene.add(sun, fill);

  // --- renderer and camera -------------------------------------------------

  const camera = new PerspectiveCamera(42, 4 / 3, 0.2, 200);
  let renderer: WebGLRenderer | null = null;
  let orbit: OrbitControls | null = null;

  let dirty = true;
  let raf = 0;
  let visible = true;
  let onScreen = true;
  let firstFrame = 0;

  /** Frozen telltales: the Playwright shot and reduced motion both want this. */
  const still = $derived(freeze || settings.motion === 'off');

  function schedule(): void {
    if (raf || !renderer || !visible || !onScreen) return;
    raf = requestAnimationFrame(frame);
  }

  function invalidate(): void {
    dirty = true;
    schedule();
  }

  function frame(t: number): void {
    raf = 0;
    if (!renderer || !orbit) return;
    const moving = orbit.update();
    const tweening = tween !== null && stepTween(t);
    if (!still) telltaleMat.uniforms.uTime.value = t / 1000;
    if (dirty || moving || tweening || !still) {
      const t0 = performance.now();
      renderer.render(scene, camera);
      dirty = false;
      if (frames < 2) {
        frames++;
        if (frames === 1) {
          // The first render pays for context creation and shader compiles
          // (tens of ms on any GPU), which is not what the gate is about;
          // ask for one more frame and time that one.
          dirty = true;
        } else {
          firstFrame = performance.now();
          (window as unknown as { __sailViewReady?: boolean }).__sailViewReady = true;
          onready?.(firstFrame - t0);
        }
      }
    }
    if (moving || tweening || !still) schedule();
  }

  /** Renders so far, up to the gated one; see `frame`. */
  let frames = 0;

  // --- camera presets ------------------------------------------------------

  const TWEEN_MS = 600;
  let tween: { from: [Vector3, Vector3]; to: [Vector3, Vector3]; start: number } | null = null;

  function presetPose(id: PresetId, side: Side): [Vector3, Vector3] {
    const p = PRESETS[id];
    const z = lee(side);
    return [
      new Vector3(p.position[0], p.position[1], p.position[2] * z),
      new Vector3(p.target[0], p.target[1], p.target[2] * z),
    ];
  }

  function goTo(id: PresetId, instant: boolean): void {
    if (!orbit) return;
    const to = presetPose(id, tackSide(twaDeg));
    if (instant) {
      camera.position.copy(to[0]);
      orbit.target.copy(to[1]);
      tween = null;
      invalidate();
      return;
    }
    tween = { from: [camera.position.clone(), orbit.target.clone()], to, start: performance.now() };
    schedule();
  }

  /** Returns true while the tween still has frames to give. */
  function stepTween(now: number): boolean {
    if (!tween || !orbit) return false;
    const k = Math.min(1, (now - tween.start) / TWEEN_MS);
    // Cubic ease-out, the same curve the Apply-optimum tween uses.
    const e = 1 - Math.pow(1 - k, 3);
    camera.position.lerpVectors(tween.from[0], tween.to[0], e);
    orbit.target.lerpVectors(tween.from[1], tween.to[1], e);
    if (k === 1) tween = null;
    return true;
  }

  // --- geometry rebuild ----------------------------------------------------

  function toGeometry(m: {
    positions: Float32Array;
    normals: Float32Array;
    indices: Uint16Array;
  }): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(m.positions, 3));
    g.setAttribute('normal', new BufferAttribute(m.normals, 3));
    g.setIndex(new BufferAttribute(m.indices, 1));
    return g;
  }

  function applySail(mesh: Mesh, sail: SailMesh | null): void {
    mesh.visible = sail !== null;
    if (!sail) return;
    const g = mesh.geometry;
    const pos = g.getAttribute('position');
    if (!pos || pos.count !== sail.N * sail.M) {
      g.setAttribute('position', new BufferAttribute(sail.positions, 3));
      g.setAttribute('normal', new BufferAttribute(sail.normals, 3));
      g.setIndex(new BufferAttribute(sail.indices, 1));
    } else {
      (pos.array as Float32Array).set(sail.positions);
      (g.getAttribute('normal').array as Float32Array).set(sail.normals);
      pos.needsUpdate = true;
      g.getAttribute('normal').needsUpdate = true;
    }
    g.computeBoundingSphere();
  }

  function segmentsOf(pts: Vec3[], out: number[]): void {
    for (let i = 0; i < pts.length - 1; i++) out.push(...pts[i], ...pts[i + 1]);
  }

  function setLines(target: LineSegments | Line, verts: number[]): void {
    target.geometry.dispose();
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(verts, 3));
    target.geometry = g;
  }

  function tube(pts: Vec3[], radius: number): BufferGeometry {
    const curve = new CatmullRomCurve3(pts.map((p) => new Vector3(...p)));
    // prov: assumed 8 radial segments — nobody sees mast roundness.
    return new TubeGeometry(curve, Math.max(2, pts.length), radius, 8, false);
  }

  /** prov: assumed — luff telltales a hand aft of the luff, sailmaker practice. */
  const LUFF_TELLTALE_CHORD = 0.15;
  /** prov: assumed — 4 cm off the cloth, enough to clear it at any camber. */
  const LUFF_TELLTALE_LIFT = 0.04;

  /** Telltale roots: jib luff pair (aft of the wire) and upper leech, main leech. */
  function buildTelltales(main: SailMesh | null, jib: SailMesh | null): void {
    const root: number[] = [];
    const dir: number[] = [];
    const up: number[] = [];
    const uv: number[] = [];
    const phase: number[] = [];
    const index: number[] = [];
    const SEGS = 4;
    let n = 0;
    const add = (anchor: Vec3, along: Vec3, across: Vec3, ph: number): void => {
      for (let s = 0; s <= SEGS; s++) {
        for (const side of [-0.5, 0.5]) {
          root.push(...anchor);
          dir.push(...along);
          up.push(...across);
          uv.push(s / SEGS, side);
          phase.push(ph);
        }
      }
      for (let s = 0; s < SEGS; s++) {
        const a = n + s * 2;
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      n += (SEGS + 1) * 2;
    };

    const unit = (v: Vec3): Vec3 => {
      const l = Math.hypot(...v) || 1;
      return [v[0] / l, v[1] / l, v[2] / l];
    };
    let ph = 0;
    /**
     * Ribbon streaming aft from grid point `j` on `row`. Direction is the local
     * chord read luff-ward (`j - 3` → `j`), so it points aft on every sail.
     * `lift` pushes the root a few cm off the cloth so a mid-chord ribbon is
     * not buried in the surface; leech ribbons hang off the edge and need none.
     */
    const ribbon = (mesh: SailMesh, row: number, j: number, lift: number): void => {
      const pts = gridRow(mesh, row);
      const back = pts[Math.max(0, j - 3)];
      const along = unit([pts[j][0] - back[0], pts[j][1] - back[1], pts[j][2] - back[2]]);
      // Horizontal normal to the chord: to leeward on the leeward face.
      const out = unit([along[2], 0, -along[0]]);
      const anchor: Vec3 = [pts[j][0] + out[0] * lift, pts[j][1], pts[j][2] + out[2] * lift];
      add(anchor, along, [0, 1, 0], ph);
      ph += 1.7; // prov: assumed phase offset, so the ribbons do not beat as one
    };
    if (jib) {
      // Luff telltales sit a hand's width aft of the luff, not on the wire:
      // prov: assumed 15 % of chord (sailmaker practice; the forestay itself
      // carries none). Cosine-clustered columns, so find the nearest.
      const luffCol = nearestColumn(jib, LUFF_TELLTALE_CHORD);
      for (const row of jib.stripeRows) ribbon(jib, row, luffCol, LUFF_TELLTALE_LIFT);
      // Upper leech ribbons: the cue North's jib guide reads (flow 90–100 %).
      for (const row of jib.stripeRows.slice(1)) ribbon(jib, row, jib.M - 1, 0);
    }
    if (main)
      for (const row of main.stripeRows) ribbon(main, row, gridRow(main, row).length - 1, -1);

    telltales.visible = n > 0;
    telltales.geometry.dispose();
    const g = new BufferGeometry();
    g.setAttribute('aRoot', new Float32BufferAttribute(root, 3));
    g.setAttribute('aDir', new Float32BufferAttribute(dir, 3));
    g.setAttribute('aUp', new Float32BufferAttribute(up, 3));
    g.setAttribute('aUv', new Float32BufferAttribute(uv, 2));
    g.setAttribute('aPhase', new Float32BufferAttribute(phase, 1));
    // The shader ignores `position`, but three needs one to size the draw.
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(root.length), 3));
    g.setIndex(index);
    g.boundingSphere = null;
    telltales.frustumCulled = false;
    telltales.geometry = g;
  }

  function rebuild(): void {
    const side = tackSide(twaDeg);
    const boomRad = boomAngle(controls.mainsheet, controls.traveller) * DEG2RAD;
    const jibRad = jibSheetAngle(controls.jibLead, controls.jibSheet) * DEG2RAD;
    const r: Rig3D = rig3d(result.rig, side, boomRad);

    const main = result.shape.main
      ? buildSail(sectionStack(result.shape.main, MAIN_CHORDS), r.mainSpine, boomRad, side)
      : null;
    const jib =
      jibUp && result.shape.jib
        ? buildSail(sectionStack(result.shape.jib, JIB_CHORDS), r.jibSpine, jibRad, side)
        : null;

    applySail(mainSail, main);
    applySail(jibSail, jib);

    const stripeVerts: number[] = [];
    const edgeVerts: number[] = [];
    for (const m of [main, jib]) {
      if (!m) continue;
      for (const row of m.stripeRows) segmentsOf(gridRow(m, row), stripeVerts);
      segmentsOf(gridColumn(m, 0), edgeVerts);
      segmentsOf(gridColumn(m, m.M - 1), edgeVerts);
      segmentsOf(gridRow(m, m.N - 1), edgeVerts);
    }
    setLines(stripes, stripeVerts);
    setLines(edges, edgeVerts);

    setLines(rigging, [...r.lines]);
    const stayVerts: number[] = [];
    segmentsOf(r.forestay, stayVerts);
    setLines(forestay, stayVerts);

    if (mast) {
      boat.remove(mast);
      mast.geometry.dispose();
    }
    // prov: assumed 0.055 m mast radius, 0.045 m boom — spar section is not published.
    mast = new Mesh(tube(r.mast, 0.055), sparMat);
    boat.add(mast);
    if (boom) {
      boat.remove(boom);
      boom.geometry.dispose();
    }
    boom = new Mesh(tube(r.boom, 0.045), sparMat);
    boat.add(boom);

    buildTelltales(main, jib);
    boat.rotation.x = heelRad(heelDeg, side);
    invalidate();
  }

  // --- lifecycle -----------------------------------------------------------

  onMount(() => {
    renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    // Three-times retina buys 2.25x the pixels for no visible gain; a phone
    // with four cores or fewer pays for it in frame time (research 03 §6).
    const cap = (navigator.hardwareConcurrency ?? 8) <= 4 ? 1.5 : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));

    orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.06;
    orbit.minDistance = 5;
    orbit.maxDistance = 30;
    // Looking up from the cockpit puts the camera below its target, which is a
    // polar angle past 90°; the old 0.495π clamp forced the helm preset to
    // hover above the masthead instead. 0.9π still stops the orbit going
    // through the seabed.
    orbit.maxPolarAngle = Math.PI * 0.9;
    // Accidental two-finger pan is the number one phone annoyance.
    orbit.enablePan = !window.matchMedia('(pointer: coarse)').matches;
    orbit.addEventListener('change', invalidate);

    goTo(preset, true);
    rebuild();

    // `ResizeObserver`, not window.resize: layout-driven resizes and the
    // mobile URL-bar collapse never fire the window event.
    const ro = new ResizeObserver(() => {
      if (!renderer) return;
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      invalidate();
    });
    ro.observe(host);

    const io = new IntersectionObserver((es) => {
      onScreen = es.some((e) => e.isIntersecting);
      if (onScreen) invalidate();
    });
    io.observe(host);

    const onVisibility = (): void => {
      visible = document.visibilityState === 'visible';
      if (visible) invalidate();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      io.disconnect();
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
      orbit?.dispose();
      scene.traverse((o) => {
        const m = o as Mesh;
        m.geometry?.dispose?.();
      });
      for (const mat of [sailMat, sparMat, wireMat, stripeMat, edgeMat, telltaleMat]) {
        mat.dispose();
      }
      renderer?.dispose();
      renderer = null;
    };
  });

  // One effect, every input: the solver's answer, the sliders, the tack.
  $effect(() => {
    void [result, controls.mainsheet, controls.traveller, controls.jibLead, controls.jibSheet];
    void [twaDeg, heelDeg, jibUp];
    if (renderer) rebuild();
  });

  $effect(() => {
    if (renderer) goTo(preset, still || settings.motion === 'off');
  });

  $effect(() => {
    // Freezing pins the ribbons at t = 0 so the screenshot is deterministic.
    if (still) telltaleMat.uniforms.uTime.value = 0;
    invalidate();
  });
</script>

<div
  class="stage"
  bind:this={host}
  role="img"
  aria-label="Three-dimensional view of the sails and rig at the current trim. The numbers it draws are in the readouts beside it."
>
  <canvas bind:this={canvas}></canvas>
</div>

<p class="caption">
  Sails lofted from the solved sections; hull illustrative, not a measured J/70. Bend, sag and rake
  drawn true.
</p>

<style>
  /* Height, not aspect ratio: it has to match the plan view's so that
     swapping between them — or falling back to it — never shifts the page. */
  .stage {
    width: 100%;
    height: 340px;
    border-radius: var(--radius);
    overflow: hidden;
    background: #0a1520;
    touch-action: none;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  @media (min-width: 1024px) {
    .stage {
      height: 360px;
    }
  }

  .caption {
    margin: var(--space-2) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }
</style>
