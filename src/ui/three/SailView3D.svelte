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
    Box3,
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
  import { prefersReducedMotion } from 'svelte/motion';
  import type { DownControls, RaceControls, SolveResult } from '../../core/types';
  import { boomAngle, jibSheetAngle } from '../race/boat';
  import { jibLuffState, leechStates, type Ribbon } from '../race/telltales';
  import type { Pinned } from '../race/store.svelte';
  import { settings } from '../stores/settings.svelte';
  import {
    add,
    DEG2RAD,
    dot,
    heelRad,
    lee,
    norm,
    scaled,
    sub,
    tackSide,
    type Side,
    type Vec3,
  } from './conventions';
  import { deckMesh, hullMesh, WATER_Y } from './hull';
  import { kiteGeometry } from './kite';
  import {
    buildSail,
    gridColumn,
    gridRow,
    nearestColumn,
    ribbonAnchor,
    sectionStack,
    type SailMesh,
  } from './loft';
  import { JIB_CHORDS, MAIN_CHORDS, rig3d, type Rig3D } from './rig3d';
  import { fitEye, presetPose } from './camera';
  import { type PresetId } from './presets';

  let {
    result,
    twaDeg,
    heelDeg,
    controls,
    preset = $bindable('leeward' as PresetId),
    freeze = false,
    jibUp = true,
    kiteUp = false,
    down,
    pinned = null,
    onready,
  }: {
    result: SolveResult;
    twaDeg: number;
    heelDeg: number;
    controls: RaceControls;
    preset?: PresetId;
    freeze?: boolean;
    jibUp?: boolean;
    /** Gennaker set: the jib is furled and the kite is drawn instead. */
    kiteUp?: boolean;
    /** The four downwind controls the kite is drawn from (ADR 0017). */
    down?: DownControls;
    /** A trim frozen for comparison, drawn as an outline (audit ux-01 M-19). */
    pinned?: Pinned | null;
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
  // The fog is one step lighter than the sky, so the water fades up into a
  // faint horizon band instead of meeting the sky at a hard line.
  // prov: assumed #16293c — the sky colour lifted ~8 % towards --surface-2.
  scene.fog = new Fog('#16293c', 26, 70);

  /** Heels; everything inside it is in the boat frame of `conventions.ts`. */
  const boat = new Group();
  scene.add(boat);

  /** prov: assumed — warm cloth, not paper: a Dacron main under a low sun. */
  const SAIL_COLOUR = '#f2ece0';
  const sailMat = new MeshLambertMaterial({
    color: SAIL_COLOUR,
    side: DoubleSide,
    transparent: true,
    opacity: 0.94,
  });
  /**
   * The kite is nylon, not Dacron: lighter cloth, loud colour, and enough of
   * the sky through it to read the main behind. prov: assumed #e8a33d — a
   * gennaker gold that separates from the cream sails, the orange draft
   * stripes and the red telltales at once, and holds against dusk water.
   * The 3D materials are literal hex rather than `tokens.css` custom
   * properties throughout this file: WebGL never sees the cascade.
   */
  const kiteMat = new MeshLambertMaterial({
    color: '#e8a33d',
    side: DoubleSide,
    transparent: true,
    opacity: 0.86, // prov: assumed — lighter cloth than the main's 0.94
  });
  const sparMat = new MeshLambertMaterial({ color: '#3d4a57' });
  const wireMat = new LineBasicMaterial({ color: '#7d8b99' });
  // Draw stripes: deep enough to read on the lit face of warm cloth as well
  // as the shaded one. prov: assumed #c2571f.
  const stripeMat = new LineBasicMaterial({ color: '#c2571f' });
  const edgeMat = new LineBasicMaterial({ color: '#6f8092' });
  /**
   * The pinned trim's outline. 40 % alpha rather than a dashed line: three
   * needs `computeLineDistances` and a `LineDashedMaterial` per geometry
   * rebuild to dash in 3D, and a dash length in world units reads as a
   * different pattern at every camera distance. Alpha is distance-invariant
   * and costs one material. The plan view carries the dashes, where the
   * drawing is 2D and they mean the same thing at every size.
   * prov: assumed 0.4 — ADR 0019's ghost weight, matched in `PlanView.svelte`.
   */
  const pinMat = new LineBasicMaterial({ color: '#f2ece0', transparent: true, opacity: 0.4 });

  // Double-sided: the hull is a generated open shell, so which way a station
  // triangle happens to face is not worth reasoning about for four hundred
  // triangles that never occlude anything.
  // Topsides and deck are both lifted well clear of the water: at the old
  // #8ea6bd the hull read as a shadow on #0d2233 from the leeward quarter,
  // which is the one view the hero exists for (owner feedback, 2026-08-25).
  // prov: assumed #b7c8d8 topsides / #d5e0ea deck — a white boat in shade,
  // deck one step lighter so the sheerline is a line and not a guess.
  const hull = new Mesh(
    toGeometry(hullMesh()),
    new MeshLambertMaterial({ color: '#b7c8d8', side: DoubleSide }),
  );
  const deck = new Mesh(
    toGeometry(deckMesh()),
    new MeshLambertMaterial({ color: '#d5e0ea', side: DoubleSide }),
  );
  boat.add(hull, deck);

  const mainSail = new Mesh(new BufferGeometry(), sailMat);
  const jibSail = new Mesh(new BufferGeometry(), sailMat);
  const kiteSail = new Mesh(new BufferGeometry(), kiteMat);
  boat.add(mainSail, jibSail, kiteSail);

  const stripes = new LineSegments(new BufferGeometry(), stripeMat);
  const edges = new LineSegments(new BufferGeometry(), edgeMat);
  const pinEdges = new LineSegments(new BufferGeometry(), pinMat);
  const rigging = new LineSegments(new BufferGeometry(), wireMat);
  const forestay = new Line(new BufferGeometry(), wireMat);
  boat.add(stripes, edges, pinEdges, rigging, forestay);

  let mast: Mesh | null = null;
  let boom: Mesh | null = null;
  /** The spar points the current tube was built from; see `rebuild`. */
  let mastKey = '';
  let boomKey = '';

  /**
   * Ribbon geometry and the three poses, in metres and radians. One place:
   * the shader below is built from these numbers and `buildTelltales`
   * projects a rest-pose tip with the same ones, so the picture and the
   * legibility gate cannot drift apart.
   *
   * prov: assumed throughout — drawn poses, sized to be read at a glance from
   * the default leeward-quarter preset at 1440, not measured ribbon angles.
   * 0.65 m and the 0.07 m half-width are the second sizing: at 0.39 m by
   * 0.028 m they were hairlines at that zoom and stalled could not be told
   * from lifting without a crop (PR #115 review).
   */
  const RIBBON = {
    len: 0.65,
    halfWidth: 0.07,
    /** Windward ribbon at a lifting station: +45° off the chord. */
    lift: 0.785,
    /** Plus this much again over the last third, so the tip hooks up. */
    hook: 0.5,
    /** Leeward ribbon at a stalled station: −75°, hanging. */
    stall: 1.309,
  } as const;

  // Telltales: one merged geometry, animated in the vertex shader off `uTime`.
  // One draw call for the lot, and freezing is a uniform, not a rebuild.
  //
  // Each ribbon carries the aerodynamic state of its own station (`aState`,
  // from `race/telltales.ts` — the same functions the plan view reads) and
  // which face of the cloth it hangs on (`aSide`). The shader turns that into
  // the pose a real ribbon takes, because that is what a sailor reads: pinch
  // and the windward ribbon lifts, over-sheet and the leeward one droops and
  // flops. The hero stays photographic — the ribbons are red cloth, not the
  // plan view's green/amber/red vocabulary; angle, motion and a shadowed red
  // are the cue.
  //
  // `depthTest` is off on purpose. A windward luff ribbon sits behind 0.94-
  // opaque cloth, and a trainer that hides the pinching cue in the default
  // leeward view is not showing the thing it exists to show — sailors read
  // windward telltales through the sail, so the picture does too.
  const telltaleMat = new ShaderMaterial({
    side: DoubleSide,
    depthTest: false,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      uniform float uTime;
      attribute vec3 aRoot;
      attribute vec3 aDir;
      attribute vec3 aUp;
      attribute vec2 aUv;      // x: 0..1 along the ribbon, y: -0.5..0.5 across
      attribute float aPhase;
      attribute float aState;  // 0 streaming, 1 lifting, 2 stalled, 3 kite curl
      attribute float aSide;   // +1 windward of the cloth, -1 leeward, 0 single
      varying float vSpan;
      varying float vSide;
      varying float vStall;
      void main() {
        vSpan = aUv.x;
        vSide = aSide;
        // Only the ribbon on the separated side moves: a windward one lifts
        // when the entry is starved, a leeward one stalls when it is choked.
        // A leech ribbon is single (aSide 0) and answers to both.
        float lift  = step(0.5, aState) * (1.0 - step(1.5, aState)) * step(-0.5, aSide);
        float stall = step(1.5, aState) * (1.0 - step(2.5, aState)) * (1.0 - step(0.5, aSide));
        vStall = stall;
        // A curling kite luff is an unloaded one, and it folds to windward.
        // The fold direction is geometry and arrives on aDir (buildTelltales);
        // the state is left to say how hard the ribbon flutters. prov: assumed
        // 5x the wave — a drawn cue for a threshold that is geometric
        // (ADR 0017), not measured flutter.
        float curl  = step(2.5, aState);
        // The bend runs along the ribbon rather than being one rigid angle, so
        // a lifting tip hooks up over the last third instead of pointing off
        // like a stick. See RIBBON for the numbers.
        float ang = lift * (${RIBBON.lift} + ${RIBBON.hook} * smoothstep(0.66, 1.0, aUv.x))
                  - stall * ${RIBBON.stall};
        // The rest pose lives in the sail's own frame: aDir is the local chord
        // at that height, twist included, so the ribbon streams along the flow
        // over that station rather than along the boat's centreline.
        vec3 d0 = normalize(aDir);
        vec3 u0 = normalize(aUp - d0 * dot(aUp, d0));
        vec3 dir = d0 * cos(ang) + u0 * sin(ang);
        vec3 up = u0 * cos(ang) - d0 * sin(ang);
        // Amplitude and speed are the second half of the read: a stalled
        // ribbon flops slowly and wide, and carries a second harmonic so it
        // curls like hanging cloth rather than swinging like a rod; a lifting
        // one flicks. prov: assumed.
        float amp = (0.05 + lift * 0.05 + stall * 0.14 + curl * 0.2) * (1.0 + stall * 0.6);
        float spd = 6.0 - lift * 2.0 - stall * 3.0;
        float wave = sin(uTime * spd + aPhase + aUv.x * 5.0) * amp * aUv.x;
        wave += stall * sin(uTime * spd * 2.0 + aPhase + aUv.x * 9.0) * amp * 0.6 * aUv.x;
        vec3 p = aRoot + dir * (aUv.x * ${RIBBON.len}) + up * (aUv.y * ${RIBBON.halfWidth} + wave);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    // A windward ribbon is being read through the cloth, so it is drawn
    // fainter than the one on this side of the sail; a hanging one is drawn
    // darker, because cloth that has stopped flying is cloth in its own
    // shadow. prov: assumed 0.7 and 0.8.
    fragmentShader: `
      varying float vSpan;
      varying float vSide;
      varying float vStall;
      void main() {
        float a = (1.0 - vSpan * 0.35) * (vSide > 0.5 ? 0.7 : 1.0);
        vec3 col = vec3(0.98, 0.35, 0.35) * (vStall > 0.5 ? 0.8 : 1.0);
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true,
  });

  const telltales = new Mesh(new BufferGeometry(), telltaleMat);
  // Last of the transparent pass, so the depth-test-free ribbons are not
  // painted over by the grid on a low camera.
  telltales.renderOrder = 1;
  boat.add(telltales);

  // Water and the grid stay in world space, so heel reads against them.
  // prov: assumed #12293c — a shade lighter than the sky, so the hull has a
  // ground to sit on rather than floating in one flat colour.
  const water = new Mesh(new PlaneGeometry(90, 90), new MeshBasicMaterial({ color: '#12293c' }));
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
  // A low, cold rim from behind and below the sails: it catches the sheerline
  // and the leech and separates both from the water without brightening the
  // faces the two lights above already model.
  // prov: assumed 0.55 intensity — enough for an edge, not a third key light.
  const rim = new DirectionalLight('#bcd6ef', 0.55);
  rim.position.set(-8, 1.5, 6);
  scene.add(sun, fill, rim);

  // --- renderer and camera -------------------------------------------------

  const camera = new PerspectiveCamera(42, 4 / 3, 0.2, 200);
  let renderer: WebGLRenderer | null = null;
  let orbit: OrbitControls | null = null;

  let dirty = true;
  let raf = 0;
  let visible = true;
  let onScreen = true;
  /** `performance.now()` at mount; the first-frame gate is measured from here. */
  let mountedAt = 0;
  /** Synchronous cost of `onMount`, the first half of the perf-gate measure. */
  let setupMs = 0;

  /**
   * Frozen telltales and jump-cut camera: the Playwright shot wants this, and
   * so does a reduced-motion preference. `'system'` is the default setting, so
   * the media query is the branch that actually carries OS preferences here —
   * testing only `motion === 'off'` meant reduced motion never reached the
   * hero at all (ux-03 H-09).
   */
  const still = $derived(
    freeze ||
      settings.motion === 'off' ||
      (settings.motion === 'system' && prefersReducedMotion.current),
  );

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
          // The gate is the work the device did, not the clock: the
          // synchronous mount (context creation, geometry build) plus this
          // first render (shader compiles, upload). Timing a *second* render
          // measured GPU command submission on a warm context, ~1 ms anywhere,
          // and never tripped (ux-03 H-12). Timing mount → now on the wall
          // clock instead also counted every millisecond a background or
          // occluded tab spent not rendering at all, and tripped a desktop
          // GPU on a tab opened behind another window.
          onready?.(setupMs + (performance.now() - t0));
          // This frame drew at the renderer's default size: `ResizeObserver`
          // callbacks run after animation frames, so the real canvas size only
          // lands now. Ask for one more, and call *that* one ready.
          dirty = true;
        } else {
          (window as unknown as { __sailViewReady?: boolean }).__sailViewReady = true;
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

  /**
   * The presets frame whatever is actually drawn: the world-space box of the
   * visible boat meshes (hull, sails, rig, telltales), measured each time a
   * preset or the slot changes, rather than an assumed radius. The old fixed
   * 5.5 / 6.5 m sphere was centred on the preset's aim point, which sat on
   * the sail plan — so the hull fell off the bottom of a portrait slot and the
   * stern off the side of a landscape one. The framing maths itself lives in
   * `camera.ts`, which is testable without a WebGL context.
   */
  const fitBox = new Box3();
  const meshBox = new Box3();
  const FALLBACK_BOX = new Box3(new Vector3(-4.5, -1, -2.5), new Vector3(3.5, 8.6, 2.5)); // prov: assumed, a J/70 with sails up, used only before the first geometry lands

  function fitBoat(): Box3 {
    fitBox.makeEmpty();
    boat.updateWorldMatrix(true, true);
    boat.traverseVisible((o) => {
      const g = (o as Mesh).geometry as BufferGeometry | undefined;
      if (!g || !g.getAttribute('position')) return;
      if (!g.boundingBox) g.computeBoundingBox();
      meshBox.copy(g.boundingBox!).applyMatrix4(o.matrixWorld);
      if (Number.isFinite(meshBox.min.x) && Number.isFinite(meshBox.max.x)) fitBox.union(meshBox);
    });
    if (fitBox.isEmpty()) fitBox.copy(FALLBACK_BOX);
    return fitBox;
  }

  function pose(id: PresetId, side: Side): [Vector3, Vector3] {
    return presetPose(id, side, fitBoat(), camera.fov, camera.aspect);
  }

  function goTo(id: PresetId, instant: boolean): void {
    if (!orbit) return;
    const to = pose(id, tackSide(twaDeg));
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

  /**
   * The line meshes get `applySail`'s reuse path: the vertex count only moves
   * when the sail grid or the set of drawn sails does, and every other rebuild
   * is the same points in new places. Recreating the geometry each time cost a
   * GL buffer created and destroyed per mesh per slider event — 273 pairs a
   * second through a drag (audit ux-03 M-24).
   */
  function setLines(target: LineSegments | Line, verts: number[]): void {
    const pos = target.geometry.getAttribute('position');
    if (pos && pos.array.length === verts.length) {
      (pos.array as Float32Array).set(verts);
      pos.needsUpdate = true;
      // The points moved, so the sphere three culls against has to move too.
      target.geometry.computeBoundingSphere();
      return;
    }
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
  /**
   * The kite's curl cue sits on the luff itself, not a hand aft of it: it
   * reads the free edge, which is the edge that curls. prov: assumed 6 % of
   * chord (the first grid column clear of the edge) and four heights, so it
   * reads as a column of ribbons up the luff rather than three loose specks.
   */
  const CURL_RIBBON_CHORD = 0.06;
  /**
   * Where the curl is, as measured: it begins at **¾ height** and travels down
   * as "a spanwise propagating wave going downwards", and the luff folds
   * toward the **windward** side (research `2026-08-25-spinnaker` doc 02 §5,
   * `F1` Ch. 4; Quantum puts the extent at "the top 50 percent of the luff").
   * prov: published for the origin, the downward travel and the fold
   * direction. The ribbons are listed top-down so the phase step makes the
   * fold run downwards rather than up.
   */
  const CURL_RIBBON_HEIGHTS = [0.75, 0.67, 0.58, 0.5];
  /**
   * How far a folding ribbon leaves the streaming direction, 0–1.
   * prov: assumed 0.85 — a drawn cue for a threshold that is geometric
   * (ADR 0017), not measured flutter. Only the direction is claimed.
   */
  const CURL_FOLD = 0.85;

  /**
   * One station's state, as the DEV handle publishes it. `paired` says the
   * station carries a windward and a leeward ribbon rather than one.
   */
  interface TelltaleReading {
    sail: 'jibLuff' | 'jibLeech' | 'mainLeech' | 'kiteLuff';
    at: number;
    state: Ribbon;
    paired: boolean;
    /**
     * Rest-pose tip of the ribbon this state actually moves — the windward
     * one when the station is lifting, the leeward one otherwise — in the
     * telltale mesh's own frame. It is the point a sailor's eye lands on, so
     * it is the point the legibility gate projects through the camera.
     */
    tip: Vec3;
  }

  /** Where a ribbon rooted at `root` along `along` ends, bent by `ang`. */
  function ribbonTip(root: Vec3, along: Vec3, ang: number): Vec3 {
    const d0 = norm(along);
    const up: Vec3 = [0, 1, 0];
    const u0 = norm(sub(up, scaled(d0, dot(up, d0))));
    const dir = add(scaled(d0, Math.cos(ang)), scaled(u0, Math.sin(ang)));
    return add(root, scaled(dir, RIBBON.len));
  }

  /** The shader's `aState`. The fourth is the kite's curl, not an AoA state. */
  const STATE_CODE: Record<Ribbon, 0 | 1 | 2> = { streaming: 0, lifting: 1, stalled: 2 };
  const CURL_CODE = 3;

  /**
   * Telltale roots: jib luff pairs (aft of the wire) and upper leech, main
   * leech, kite luff curl.
   *
   * Every ribbon's state comes from `race/telltales.ts` at that ribbon's own
   * height — the loft lofts row `i` at `i / (N - 1)` of the sail's height, so
   * the row index is the station — which is the same call the plan view makes.
   * The states are published on the DEV handle so a test can ask both pictures
   * the same question (plan 2026-08-28 phase 03, risk 2).
   */
  function buildTelltales(
    main: SailMesh | null,
    jib: SailMesh | null,
    kite: SailMesh | null,
    curl: boolean,
    side: Side,
    trim: {
      awaDeg: number;
      boomDeg: number;
      jibDeg: number;
      mainTwistDeg: number;
      jibTwistDeg: number;
    },
  ): void {
    const root: number[] = [];
    const dir: number[] = [];
    const up: number[] = [];
    const uv: number[] = [];
    const phase: number[] = [];
    const state: number[] = [];
    const face: number[] = [];
    const index: number[] = [];
    const reading: TelltaleReading[] = [];
    const SEGS = 4;
    let n = 0;
    const add = (
      anchor: Vec3,
      along: Vec3,
      across: Vec3,
      ph: number,
      code: number,
      f: number,
    ): void => {
      for (let s = 0; s <= SEGS; s++) {
        for (const side of [-0.5, 0.5]) {
          root.push(...anchor);
          dir.push(...along);
          up.push(...across);
          uv.push(s / SEGS, side);
          phase.push(ph);
          state.push(code);
          face.push(f);
        }
      }
      for (let s = 0; s < SEGS; s++) {
        const a = n + s * 2;
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      n += (SEGS + 1) * 2;
    };

    let ph = 0;
    /** `f` is the shader's `aSide`: +1 windward, -1 leeward, 0 a single ribbon. */
    const ribbon = (
      mesh: SailMesh,
      row: number,
      j: number,
      lift: number,
      code: number,
      f: number,
      dir?: Vec3,
    ): void => {
      const a = ribbonAnchor(mesh, row, j, lift);
      add(a.root, dir ?? a.along, [0, 1, 0], ph, code, f);
      ph += 1.7; // prov: assumed phase offset, so the ribbons do not beat as one
    };
    /** Height fraction of a grid row: `buildSail` lofts row `i` at `i / (N - 1)`. */
    const heightOf = (mesh: SailMesh, row: number): number => row / (mesh.N - 1);
    /** One station: the ribbons that carry it, and the row for the DEV handle. */
    const station = (
      sail: TelltaleReading['sail'],
      mesh: SailMesh,
      row: number,
      j: number,
      st: Ribbon,
      paired: boolean,
    ): void => {
      const at = heightOf(mesh, row);
      const code = STATE_CODE[st];
      // The ribbon the state moves: windward when lifting, leeward otherwise.
      // A lifting station's cue is on the windward ribbon, so that is the one
      // the tip is reported for.
      const lifting = st === 'lifting';
      const lift = paired ? (lifting ? -LUFF_TELLTALE_LIFT : LUFF_TELLTALE_LIFT) : 0;
      const ang = lifting ? RIBBON.lift + RIBBON.hook : st === 'stalled' ? -RIBBON.stall : 0;
      const a = ribbonAnchor(mesh, row, j, lift);
      if (paired) {
        // A real luff carries a pair. The leeward ribbon is the one that
        // stalls; the windward one is the one that lifts when you pinch.
        ribbon(mesh, row, j, LUFF_TELLTALE_LIFT, code, -1);
        ribbon(mesh, row, j, -LUFF_TELLTALE_LIFT, code, 1);
      } else {
        ribbon(mesh, row, j, 0, code, 0);
      }
      reading.push({ sail, at, state: st, paired, tip: ribbonTip(a.root, a.along, ang) });
    };
    if (jib) {
      // Luff telltales sit a hand's width aft of the luff, not on the wire:
      // prov: assumed 15 % of chord (sailmaker practice; the forestay itself
      // carries none). Cosine-clustered columns, so find the nearest.
      const luffCol = nearestColumn(jib, LUFF_TELLTALE_CHORD);
      for (const row of jib.stripeRows) {
        const st = jibLuffState(trim.awaDeg, trim.jibDeg, trim.jibTwistDeg, heightOf(jib, row));
        station('jibLuff', jib, row, luffCol, st, true);
      }
      // Upper leech ribbons: the cue North's jib guide reads (flow 90–100 %).
      for (const row of jib.stripeRows.slice(1)) {
        const [{ state: st }] = leechStates(trim.awaDeg, trim.jibDeg, trim.jibTwistDeg, [
          heightOf(jib, row),
        ]);
        station('jibLeech', jib, row, jib.M - 1, st, false);
      }
    }
    if (main) {
      for (const row of main.stripeRows) {
        const [{ state: st }] = leechStates(trim.awaDeg, trim.boomDeg, trim.mainTwistDeg, [
          heightOf(main, row),
        ]);
        station('mainLeech', main, row, main.M - 1, st, false);
      }
    }
    if (kite) {
      // The curl cue: a column down the free luff from ¾ height. They stream
      // while the sheet is trimmed; past the (tier-C) sheet threshold they
      // fold to windward, which is the way the fold was measured to go.
      const luffCol = nearestColumn(kite, CURL_RIBBON_CHORD);
      const w = -lee(side) * CURL_FOLD;
      for (const f of CURL_RIBBON_HEIGHTS) {
        const row = Math.round(f * (kite.N - 1));
        const at = heightOf(kite, row);
        if (!curl) {
          const flying = ribbonAnchor(kite, row, luffCol, LUFF_TELLTALE_LIFT);
          ribbon(kite, row, luffCol, LUFF_TELLTALE_LIFT, STATE_CODE.streaming, 0);
          reading.push({
            sail: 'kiteLuff',
            at,
            state: 'streaming',
            paired: false,
            tip: ribbonTip(flying.root, flying.along, 0),
          });
          continue;
        }
        const { along } = ribbonAnchor(kite, row, luffCol, LUFF_TELLTALE_LIFT);
        const k = 1 - CURL_FOLD;
        const fold: Vec3 = [along[0] * k, along[1] * k - 0.15 * CURL_FOLD, w];
        const l = Math.hypot(...fold) || 1;
        // The curl is a geometric threshold, not an angle of attack, so it
        // keeps its own code: the fold direction is the claim, and the state
        // only says how hard the unloaded ribbon flutters (ADR 0017).
        ribbon(kite, row, luffCol, LUFF_TELLTALE_LIFT, CURL_CODE, 0, [
          fold[0] / l,
          fold[1] / l,
          fold[2] / l,
        ]);
        reading.push({
          sail: 'kiteLuff',
          at,
          state: 'stalled',
          paired: false,
          // The fold is the pose here, and it is already in the direction.
          tip: ribbonTip(ribbonAnchor(kite, row, luffCol, LUFF_TELLTALE_LIFT).root, fold, 0),
        });
      }
    }

    telltales.visible = n > 0;
    // Same reuse path as `setLines`: through a drag the ribbon count is fixed
    // and only the roots and directions move, so the seven attribute buffers are
    // written in place rather than rebuilt (audit ux-03 M-24). The count only
    // changes when a sail is set or furled, or the grid resolution moves.
    const attrs: [string, number[], number][] = [
      ['aRoot', root, 3],
      ['aDir', dir, 3],
      ['aUp', up, 3],
      ['aUv', uv, 2],
      ['aPhase', phase, 1],
      ['aState', state, 1],
      ['aSide', face, 1],
    ];
    const old = telltales.geometry.getAttribute('aRoot');
    if (old && old.array.length === root.length) {
      for (const [name, data] of attrs) {
        const a = telltales.geometry.getAttribute(name);
        (a.array as Float32Array).set(data);
        a.needsUpdate = true;
      }
    } else {
      telltales.geometry.dispose();
      const g = new BufferGeometry();
      for (const [name, data, size] of attrs) {
        g.setAttribute(name, new Float32BufferAttribute(data, size));
      }
      // The shader ignores `position`, but three needs one to size the draw.
      g.setAttribute('position', new Float32BufferAttribute(new Float32Array(root.length), 3));
      g.setIndex(index);
      g.boundingSphere = null;
      telltales.frustumCulled = false;
      telltales.geometry = g;
    }
    // A sail that is not set reads as null, not as a hidden mesh: the
    // Playwright smoke shot asks "is the kite up and the jib furled?" and that
    // question should not need `.visible` archaeology. Published on a
    // production build too — `__sailViewReady` and `__sailFirstFrameMs`
    // already are, the UI tests run against `vite preview`, and the handle is
    // dropped on unmount so it holds nothing once the view is gone.
    (window as unknown as { __sail?: unknown }).__sail = {
      mainSail: main ? mainSail : null,
      jibSail: jib ? jibSail : null,
      kiteSail: kite ? kiteSail : null,
      telltales,
      // Every ribbon's aerodynamic state, so a test can ask the 3D hero the
      // same question it asks the plan view's CSS classes.
      telltaleStates: reading,
      stripes,
      // Null unless a trim is pinned, for the same reason as the sails above:
      // "is the ghost drawn?" should be one read, not `.visible` archaeology.
      pinEdges: pinEdges.visible ? pinEdges : null,
      // The live camera, so "does the picture frame the boat?" can be asked by
      // projecting a mesh through it rather than by reading pixels out of a
      // WebGL canvas (audit ux-04 M-04's regression test).
      camera,
    };
  }

  function rebuild(): void {
    const side = tackSide(twaDeg);
    const boomDeg = boomAngle(controls.mainsheet, controls.traveller);
    const boomRad = boomDeg * DEG2RAD;
    const jibDeg = jibSheetAngle(controls.jibLead, controls.jibSheet);
    const jibRad = jibDeg * DEG2RAD;
    const r: Rig3D = rig3d(result.rig, side, boomRad);

    const main = result.shape.main
      ? buildSail(sectionStack(result.shape.main, MAIN_CHORDS), r.mainSpine, boomRad, side)
      : null;
    const jib =
      jibUp && result.shape.jib
        ? buildSail(sectionStack(result.shape.jib, JIB_CHORDS), r.jibSpine, jibRad, side)
        : null;

    // The kite: geometry from the four downwind controls (ADR 0017), camber
    // and draft position from `shape.asym`, lofted by the same `buildSail` as
    // the other two. `src/core` is untouched by any of it.
    const asym = result.shape.asym;
    const kg = kiteUp && down && asym ? kiteGeometry(down, r, side, result.aero.awaDeg) : null;
    const kite = kg && asym ? buildSail(kg.sections(asym), kg.spine, kg.sheetRad, side) : null;

    applySail(mainSail, main);
    applySail(jibSail, jib);
    applySail(kiteSail, kite);

    const stripeVerts: number[] = [];
    const edgeVerts: number[] = [];
    for (const m of [main, jib, kite]) {
      if (!m) continue;
      for (const row of m.stripeRows) segmentsOf(gridRow(m, row), stripeVerts);
      segmentsOf(gridColumn(m, 0), edgeVerts);
      segmentsOf(gridColumn(m, m.M - 1), edgeVerts);
      // The kite's head row is a point — the ORC girth parabola closes it —
      // so its free edge worth drawing is the foot, not the head.
      segmentsOf(gridRow(m, m === kite ? 0 : m.N - 1), edgeVerts);
    }
    setLines(stripes, stripeVerts);
    setLines(edges, edgeVerts);

    // The pinned trim (audit ux-01 M-19): the same `buildSail` off the pinned
    // solve's sections and the pinned controls' sheeting angles, but only its
    // luff, leech and foot are drawn. A second lit surface hanging beside the
    // live sail hides the camber that is the thing being compared; three lines
    // per sail say where the leech was and nothing else.
    //
    // Built on the *current* tack and the pinned solve's own rig, so the ghost
    // is a comparison rather than a picture of the other board. Static, so
    // there is nothing here for reduced motion to suppress.
    const pinVerts: number[] = [];
    if (pinned) {
      const pinRig = rig3d(
        pinned.result.rig,
        side,
        boomAngle(pinned.race.mainsheet, pinned.race.traveller) * DEG2RAD,
      );
      const pinMain = pinned.result.shape.main
        ? buildSail(
            sectionStack(pinned.result.shape.main, MAIN_CHORDS),
            pinRig.mainSpine,
            boomAngle(pinned.race.mainsheet, pinned.race.traveller) * DEG2RAD,
            side,
          )
        : null;
      const pinJib =
        jibUp && pinned.result.shape.jib
          ? buildSail(
              sectionStack(pinned.result.shape.jib, JIB_CHORDS),
              pinRig.jibSpine,
              jibSheetAngle(pinned.race.jibLead, pinned.race.jibSheet) * DEG2RAD,
              side,
            )
          : null;
      for (const m of [pinMain, pinJib]) {
        if (!m) continue;
        segmentsOf(gridColumn(m, 0), pinVerts);
        segmentsOf(gridColumn(m, m.M - 1), pinVerts);
        segmentsOf(gridRow(m, m.N - 1), pinVerts);
      }
    }
    setLines(pinEdges, pinVerts);
    pinEdges.visible = pinVerts.length > 0;

    setLines(rigging, [...r.lines]);
    const stayVerts: number[] = [];
    segmentsOf(r.forestay, stayVerts);
    setLines(forestay, stayVerts);

    // prov: assumed 0.055 m mast radius, 0.045 m boom — spar section is not published.
    // A `TubeGeometry` has no reuse path worth writing — its vertex layout is
    // derived from the curve — so the saving is not rebuilding it at all. Mast
    // bend moves with the backstay and the shroud turns and the boom with the
    // mainsheet and traveller, so on a jib-sheet or downwind drag neither spar
    // moves and both rebuilds were pure churn (audit ux-03 M-24).
    if (String(r.mast) !== mastKey) {
      mastKey = String(r.mast);
      if (mast) {
        boat.remove(mast);
        mast.geometry.dispose();
      }
      mast = new Mesh(tube(r.mast, 0.055), sparMat);
      boat.add(mast);
    }
    if (String(r.boom) !== boomKey) {
      boomKey = String(r.boom);
      if (boom) {
        boat.remove(boom);
        boom.geometry.dispose();
      }
      boom = new Mesh(tube(r.boom, 0.045), sparMat);
      boat.add(boom);
    }

    buildTelltales(main, jib, kite, kg?.curl ?? false, side, {
      awaDeg: result.aero.awaDeg,
      boomDeg,
      jibDeg,
      mainTwistDeg: result.shape.main?.threeQuarter.twistDeg ?? 0,
      jibTwistDeg: result.shape.jib?.threeQuarter.twistDeg ?? 0,
    });
    boat.rotation.x = heelRad(heelDeg, side);
    invalidate();
  }

  // --- lifecycle -----------------------------------------------------------

  onMount(() => {
    mountedAt = performance.now();
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
    setupMs = performance.now() - mountedAt;

    // `ResizeObserver`, not window.resize: layout-driven resizes and the
    // mobile URL-bar collapse never fire the window event.
    const ro = new ResizeObserver(() => {
      if (!renderer) return;
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // A resized slot keeps the direction you were looking from and refits
      // the distance, so a layout change never crops the masthead; a zoom
      // you had dialled in is the one thing it costs. Through `fitEye`, so a
      // layout change cannot re-submerge the camera either — `helm` used to be
      // exempt from this refit and lost the hull at every aspect ratio
      // (audit kite-3d-01 H-06, H-10).
      if (orbit) {
        const dir = camera.position.clone().sub(orbit.target).normalize();
        camera.position.copy(fitEye(fitBoat(), orbit.target, dir, camera.fov, camera.aspect));
      }
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
      // Everything in the scene, geometry and material both. The old version
      // traversed for geometries but listed the materials by hand, and the
      // list had drifted: the hull, deck and water materials and the grid
      // helper's were all constructed inline and never disposed (audit ux-03
      // M-21). A traverse cannot go out of date the next time something is
      // added; disposing a shared material twice is a no-op.
      scene.traverse((o) => {
        const m = o as Mesh;
        m.geometry?.dispose?.();
        for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
          mat?.dispose?.();
        }
      });
      // `dispose()` frees three's own caches but leaves the GL context alive,
      // and a live context pins its canvas, which pins the detached Race
      // subtree behind it — 2,404 DOM nodes and ~2 contexts leaked per visit,
      // against a browser ceiling of about sixteen (audit ux-03 M-21).
      // `forceContextLoss()` is the call that actually hands it back, and it
      // has to come first: three needs the context to tear its state down.
      renderer?.forceContextLoss();
      renderer?.dispose();
      renderer = null;
      delete (window as unknown as { __sail?: unknown }).__sail;
      // …and the "this view has drawn" flag with it. It was left `true` after
      // an unmount, so a spec that navigated away and back was told the *next*
      // view was ready before it had made its context — which is why the
      // WebGL-context test passed alone and failed under a full parallel run
      // (phase 04 progress log). `frames` is per-mount, so the flag comes back
      // on the next view's second frame exactly as it did on the first's.
      delete (window as unknown as { __sailViewReady?: boolean }).__sailViewReady;
    };
  });

  // One effect, every input: the solver's answer, the sliders, the tack.
  $effect(() => {
    void [result, controls.mainsheet, controls.traveller, controls.jibLead, controls.jibSheet];
    void [twaDeg, heelDeg, jibUp, kiteUp, pinned];
    // Read through the object: a rune tracks the properties, not the box.
    void [down?.kiteHalyard, down?.tackLine, down?.kiteSheet, down?.sprit];
    if (renderer) rebuild();
  });

  $effect(() => {
    if (renderer) goTo(preset, still);
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
  {#if kiteUp}
    The gennaker is drawn, not solved: the clew rides the circle its published leech and foot fix,
    and the luff bows to leeward reaching and to windward running, as measured. The curl cue starts
    at three-quarter height and folds to windward, but its onset is an assumed threshold on the
    sheet.
  {/if}
</p>

<style>
  /* Height, not aspect ratio: it has to match the plan view's so that
     swapping between them — or falling back to it — never shifts the page.
     `--hero-h` is published by the hero slot (SailHero), which is the only
     thing that knows whether it is a phone card or a cockpit cell. */
  .stage {
    width: 100%;
    height: var(--hero-h, 340px);
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

  .caption {
    margin: var(--space-2) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  /* Cockpit cell: the stage takes what the caption leaves, rather than a
     height of its own that would push the caption out of the card. */
  @media (min-width: 1280px) {
    .stage {
      flex: 1;
      min-height: 0;
    }
  }
</style>
