<script lang="ts">
  /**
   * The Race hero slot: a 3D sail view when the device can carry one, the 2D
   * plan view when it cannot or when the user asks for it (ADR 0014).
   *
   * Three gates, in order. WebGL has to exist; the 3D chunk has to arrive; and
   * the first frame has to land inside `FIRST_FRAME_BUDGET_MS`. Any of them
   * failing leaves the plan view on screen, which is also what is showing
   * while the chunk downloads — so there is nothing to fall back *from*.
   */
  import { onMount, type Component } from 'svelte';
  import type { SolveResult } from '../../core/types';
  import Segmented from '../components/Segmented.svelte';
  import PlanView from '../race/PlanView.svelte';
  import { race } from '../race/store.svelte';
  import { conditions } from '../stores/conditions.svelte';
  import { router } from '../router.svelte';
  import { isPreset, PRESET_HINT, PRESET_LABEL, PRESET_ORDER, type PresetId } from './presets';

  let { result, twaDeg }: { result: SolveResult; twaDeg: number } = $props();

  /**
   * How long the first frame may take before the 3D view is judged too heavy
   * for this device and the 2D view keeps the slot.
   * prov: assumed 50 ms — ADR 0014's committed gate. It is a phone budget, not
   * a measurement: three frames at 60 Hz is the most a hero may cost before it
   * is felt as a stall on the screen you drag sliders on.
   */
  const FIRST_FRAME_BUDGET_MS = 50;

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
   * deterministic, and software rendering in CI is always over the phone
   * budget. The gate still runs on every ordinary visit.
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
    if (!freeze && ms > FIRST_FRAME_BUDGET_MS) tooSlow = true;
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

  /* Reserves the picture's height so the 2D-to-3D swap, and the fallback,
     never move the rest of the page. */
  .slot {
    min-height: 340px;
  }

  @media (min-width: 1024px) {
    .slot {
      min-height: 360px;
    }
  }
</style>
