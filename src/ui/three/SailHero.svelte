<script lang="ts">
  /**
   * The Race hero slot: a 3D sail view when the device can carry one, the 2D
   * plan view when it cannot or when the user asks for it (ADR 0014).
   *
   * Three gates, in order. WebGL has to exist; the 3D chunk has to arrive; and
   * mount → first frame has to land inside `FIRST_FRAME_BUDGET_MS`. Any of
   * them failing leaves the plan view on screen, which is also what is showing
   * while the chunk downloads — so there is nothing to fall back *from*.
   */
  import { onMount, type Component } from 'svelte';
  import type { DownControls, SolveResult } from '../../core/types';
  import Segmented from '../components/Segmented.svelte';
  import PlanView from '../race/PlanView.svelte';
  import { race, type Pinned } from '../race/store.svelte';
  import { conditions } from '../stores/conditions.svelte';
  import { router } from '../router.svelte';
  import { isPreset, PRESET_HINT, PRESET_LABEL, PRESET_ORDER, type PresetId } from './presets';

  let { result, twaDeg }: { result: SolveResult; twaDeg: number } = $props();

  /**
   * How long the hero may take, from mount to the first frame on screen,
   * before the 3D view is judged too heavy for this device and the 2D view
   * keeps the slot.
   *
   * prov: assumed 800 ms — ADR 0014's gate, re-picked 2026-08-25 against
   * measured mount + first-render work (see the ADR's Consequences amendment;
   * the wait for a rendering step is excluded, so a tab opened behind another
   * window is not judged slow for having been hidden). ADR 0014's
   * 50 ms was three frames at 60 Hz, but it was applied to a *warm second
   * render* — GPU command submission, ~1 ms everywhere — so it never tripped
   * (ux-03 H-12). This times the whole cost instead: geometry build, context
   * creation, shader compiles and upload. Measured in the pinned Playwright
   * image, mount → first frame: 60–137 ms unthrottled (the 137 is a 2-core
   * container, the CI worst case), 115–119 ms at 4× CPU, 271–279 ms at 10×,
   * 605–609 ms at 20×. Those are SwiftShader numbers. A real GPU pays a
   * driver shader compile on a cold cache that SwiftShader never shows:
   * measured 315 ms on the first visit and 52 ms warm on an RTX 4070 Ti
   * (Chrome/ANGLE, live deploy, 2026-08-25), so a 350 ms budget left a top
   * desktop 35 ms clear and would have parked a mid laptop in 2D on every
   * first visit. 800 ms: over twice the cold desktop cost, and a one-off
   * under a second is not a stall on a screen you then use for minutes.
   */
  const FIRST_FRAME_BUDGET_MS = 800;
  /** Test seam: `sailflow.hero.budget` overrides the budget, so the gate can
   *  be exercised on any machine instead of only on one slow enough. */
  function budgetMs(): number {
    try {
      const v = Number(localStorage.getItem('sailflow.hero.budget'));
      if (Number.isFinite(v) && v > 0) return v;
    } catch {
      // storage disabled: the built-in budget
    }
    return FIRST_FRAME_BUDGET_MS;
  }

  const KEY = 'sailflow.hero.v1';
  type Hero = '3d' | 'plan';

  /**
   * Verdict of the perf gate, for this session. A device that failed once
   * fails again; re-measuring on every mount would just repeat the stall.
   */
  let tooSlow = $state(false);

  function hasWebGL(): boolean {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
    } catch {
      return false;
    }
  }

  function readHero(): Hero {
    try {
      return localStorage.getItem(KEY) === 'plan' ? 'plan' : '3d';
    } catch {
      return '3d'; // private mode, or storage disabled
    }
  }

  let hero = $state<Hero>(readHero());

  function setHero(v: Hero): void {
    hero = v;
    try {
      localStorage.setItem(KEY, v);
    } catch {
      // ignore: no persistence available, the toggle still works
    }
  }

  const params = router.params;
  let preset = $state<PresetId>(isPreset(params.view) ? params.view : 'leeward');
  /**
   * `?freeze=1` pins the telltales and jump-cuts the camera. It also exempts
   * the view from the first-frame gate: it exists so a screenshot is
   * deterministic, and a baseline that silently becomes a shot of the 2D
   * fallback whenever a CI runner is busy is worse than no baseline. The gate
   * still runs on every ordinary visit.
   */
  const freeze = params.freeze === '1';

  type View3D = Component<{
    result: SolveResult;
    twaDeg: number;
    heelDeg: number;
    controls: typeof race.controls.race;
    preset?: PresetId;
    freeze?: boolean;
    jibUp?: boolean;
    kiteUp?: boolean;
    down?: DownControls;
    pinned?: Pinned | null;
    onready?: (ms: number) => void;
  }>;

  let View = $state<View3D | null>(null);

  /**
   * Race renders both responsive layouts and lets CSS hide one, so this
   * component mounts twice on every screen. Without this gate both copies
   * would build a scene and take a WebGL context — one of them permanently
   * invisible, and browsers only hand out about sixteen. Zero width means
   * `display: none` somewhere above, so the hidden copy keeps the (cheap,
   * also hidden) SVG and the chunk is never even fetched for it.
   */
  let slot: HTMLDivElement;
  let shown = $state(false);

  onMount(() => {
    const ro = new ResizeObserver(([e]) => (shown = e.contentRect.width > 0));
    ro.observe(slot);
    return () => ro.disconnect();
  });

  const webgl = typeof document === 'undefined' ? false : hasWebGL();
  const wants3d = $derived(hero === '3d' && webgl && !tooSlow && shown);

  $effect(() => {
    // The whole three.js chunk, and nothing before the Race screen mounts.
    if (!wants3d || View) return;
    let live = true;
    void import('./SailView3D.svelte')
      .then((m) => {
        if (live) View = m.default as View3D;
      })
      // Offline, or the chunk 404s: the plan view is already on screen and
      // stays there. Nothing to undo.
      .catch(() => undefined);
    return () => {
      live = false;
    };
  });

  function onready(ms: number): void {
    // Readable from the console on a live deploy, like `__sailViewReady`.
    (window as unknown as { __sailFirstFrameMs?: number }).__sailFirstFrameMs = ms;
    if (!freeze && ms > budgetMs()) tooSlow = true;
  }
</script>

<div class="hero-head">
  <Segmented
    options={[
      { value: '3d', label: '3D' },
      { value: 'plan', label: 'Plan' },
    ]}
    value={hero}
    onchange={(v) => setHero(v as Hero)}
    ariaLabel="Hero view"
  />

  {#if wants3d && View}
    <div class="chips" role="radiogroup" aria-label="Camera view">
      {#each PRESET_ORDER as id (id)}
        <button
          type="button"
          role="radio"
          aria-checked={preset === id}
          class:on={preset === id}
          title={PRESET_HINT[id]}
          onclick={() => (preset = id)}
        >
          {PRESET_LABEL[id]}
        </button>
      {/each}
    </div>
  {:else if hero === '3d' && !webgl}
    <span class="note">No WebGL here — showing the plan view.</span>
  {:else if tooSlow}
    <span class="note">3D ran slow on this device — showing the plan view.</span>
  {/if}
</div>

<div class="slot" bind:this={slot}>
  {#if wants3d && View}
    <View
      {result}
      {twaDeg}
      heelDeg={result.heelDeg.value}
      controls={race.controls.race}
      bind:preset
      {freeze}
      jibUp={conditions.sailset === 'jib'}
      kiteUp={conditions.sailset === 'asym'}
      down={race.controls.down}
      pinned={race.pinned}
      {onready}
    />
  {:else}
    <PlanView aero={result.aero} heelDeg={result.heelDeg.value} {twaDeg} jib={result.shape.jib} />
  {/if}
</div>

<style>
  .hero-head {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-3);
    margin-bottom: var(--space-2);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .chips button {
    min-height: var(--hit-min);
    padding: 0 var(--space-3);
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    background: transparent;
    color: var(--ink-2);
    font-size: var(--text-xs);
    cursor: pointer;
  }

  .chips button.on {
    border-color: var(--accent);
    color: var(--ink);
  }

  .note {
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  /* One height for both pictures, published as a custom property: the 3D
     stage and the plan view's svg both read `--hero-h`, so the 2D-to-3D swap
     and the perf fallback never move the rest of the page.
     Phone: about 4:3 against a 390 px screen's card. */
  .slot {
    --hero-h: clamp(220px, 66vw, 320px);
    min-height: var(--hero-h);
  }

  @media (min-width: 1024px) {
    .slot {
      --hero-h: 360px;
    }
  }

  /* Cockpit: the view chips are drawn at mouse size, on one line. Every row
     of chips that wraps here is a row taken off the picture they frame. */
  @media (min-width: 1280px) {
    .hero-head {
      gap: var(--space-1) var(--space-2);
      margin-bottom: var(--space-1);
    }

    .chips button,
    .hero-head :global(.segmented button) {
      min-height: 28px;
      padding: 0 var(--space-2);
    }
  }

  /* In the cockpit grid the hero's height is the cell's, not a number: the
     slot becomes a size container and `--hero-h` is simply all of it, so the
     picture grows with the viewport and never overflows the one screen. */
  @media (min-width: 1280px) {
    .slot {
      flex: 1;
      display: flex;
      flex-direction: column;
      container-type: size;
      --hero-h: 100cqh;
      min-height: 0;
    }
  }
</style>
