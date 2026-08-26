<script lang="ts">
  import { cubicOut } from 'svelte/easing';
  import { prefersReducedMotion, Tween } from 'svelte/motion';
  import Sheet from '../components/Sheet.svelte';
  import Slider from '../components/Slider.svelte';
  import InstrumentBar from '../race/InstrumentBar.svelte';
  import { History } from '../instruments/history';
  import ScoreSheet from './ScoreSheet.svelte';
  import { distanceSteps, MEDAL_BANDS, RACE_KEYS, type Drill } from '../../lib/drills';
  import { drills } from './store.svelte';
  import { fmt, snap, SEA_LABELS } from '../format';
  import type { ControlSpec, RaceControls } from '../../core/types';
  import type { TrimControl } from '../../worker/protocol';
  import { historyKey, type Objective } from '../race/store.svelte';
  import j70 from '../../../data/boats/j70.json';

  let { drill, onback }: { drill: Drill; onback: () => void } = $props();

  const SPECS = j70.controls as Record<string, ControlSpec>;

  const lockedKeys = $derived(RACE_KEYS.filter((k) => !(drill.free as string[]).includes(k)));

  const condition = $derived(
    [
      `${drill.condition.twsKt} kt`,
      SEA_LABELS[drill.condition.seaState],
      `TWA ${drill.condition.twaDeg}°`,
      drill.condition.sailset === 'asym' ? 'gennaker' : 'jib',
    ].join(' · '),
  );

  /** What "faster" means here, in the shape the instrument bar wants. */
  const objective: Objective = $derived(
    drill.objective === 'speed'
      ? 'speed'
      : Math.abs(drill.condition.twaDeg) < 90
        ? 'vmgUp'
        : 'vmgDown',
  );

  // The goal, in the unit the score is actually in: the silver band is the
  // "you have got the shape" line, so it is what the drill asks for (M-16).
  const GOAL_STEPS = MEDAL_BANDS.find((b) => b.medal === 'silver')!.maxSteps;
  const goal = $derived(
    `Get within ${GOAL_STEPS} ${GOAL_STEPS === 1 ? 'click' : 'clicks'} of the model's trim — ` +
      `you start ${drills.startLossPct.toFixed(1)} % off the pace.`,
  );

  // Before the first Check the answer key stays hidden: ghost ticks, the target
  // readouts and Apply would all hand over the answer the drill is asking for.
  const answer = $derived(drills.score?.optimum);
  const targets = $derived(
    answer
      ? {
          bsKt: answer.result.bsKt.value,
          vmgKt: answer.result.vmgKt.value,
          heelDeg: answer.result.heelDeg.value,
        }
      : undefined,
  );

  /** Distance to the key, live, so a move shows its effect before Check (M-16). */
  const liveSteps = $derived(
    answer ? distanceSteps(drills.controls, answer.race, drill.free) : undefined,
  );

  /**
   * The drill's own trend buffer: the same instrument bar as Race, so the
   * sparklines need somewhere to remember. One drill is one condition, so the
   * key never changes and the buffer never resets under it.
   */
  const history = new History();
  $effect(() => {
    const r = drills.result;
    if (!r?.converged) return;
    history.push(historyKey(drill.condition), {
      bs: r.bsKt.value,
      vmg: r.vmgKt.value,
      heel: r.heelDeg.value,
    });
  });

  // Live solve: any control move re-requests `trimmed`, debounced in the store.
  $effect(() => {
    void $state.snapshot(drills.controls);
    drills.solve();
  });

  // ponytail: a media query decides where the score goes, not a resize handler
  // — below md it is a bottom Sheet so coach and controls own the first screen,
  // above it an inline card in the reading column. No CSS makes a modal inline.
  let wide = $state(false);
  $effect(() => {
    const mq = window.matchMedia('(min-width: 720px)');
    const sync = (): void => {
      wide = mq.matches;
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  });

  let sheetOpen = $state(false);

  async function check(): Promise<void> {
    await drills.check();
    if (!wide && drills.score) sheetOpen = true;
  }

  // --- Apply the answer ---------------------------------------------------
  // The same one-tween-of-a-progress-scalar move as Race, over the free
  // controls only: the locked ones are not the learner's to move, and the last
  // frame lands exactly on the solver's on-grid answer.
  const APPLY_MS = 400;
  const progress = new Tween(1, {
    duration: () => (prefersReducedMotion.current ? 1 : APPLY_MS),
    easing: cubicOut,
  });
  let from: RaceControls | null = null;
  let to: RaceControls | null = null;

  function applyAnswer(): void {
    const key = answer?.race;
    if (!key) return;
    from = { ...$state.snapshot(drills.controls) };
    to = { ...from };
    for (const c of drill.free) to[c] = key[c];
    progress.set(0, { duration: 0 });
    void progress.set(1);
  }

  $effect(() => {
    const p = progress.current;
    if (!from || !to) return;
    for (const c of drill.free) {
      const s = spec(c);
      // Snapped every frame: an unsnapped lerp puts the readout on 44 % while
      // the range input's thumb sits on the legal 45.
      drills.controls[c] = snap(from[c] + (to[c] - from[c]) * p, s.min, s.max, s.step);
    }
    if (p === 1) from = to = null;
  });

  function spec(key: string): ControlSpec {
    return SPECS[key];
  }

  function raceValue(key: keyof RaceControls): number {
    return drills.controls[key];
  }

  function targetFor(key: TrimControl): number | undefined {
    return answer?.race[key];
  }
</script>

<header class="head">
  <button type="button" class="back" onclick={onback}>← All drills</button>
  <h2>{drill.title}</h2>
  <p class="cond tabular-nums">{condition}</p>
</header>

{#snippet scoreSheet()}
  {#if drills.score}
    <ScoreSheet
      score={drills.score}
      stale={drills.scoreStale}
      cTier={drill.cTier}
      ontryagain={() => {
        sheetOpen = false;
        drills.reset();
      }}
      onnext={() => {
        sheetOpen = false;
        drills.next();
      }}
    />
  {/if}
{/snippet}

<div class="screen">
  <div class="col-primary">
    {#if drill.cTier}
      <p class="c-strip">
        Tier C: for this drill the model gives the direction of the effect only, not a number worth
        quoting. Use it to rank two setups, not to measure one.
      </p>
    {/if}

    <!-- Goal first: what winning is, before the controls (audit ux-02 M-16). -->
    <section class="card">
      <h3 class="section-title">Goal</h3>
      <p class="goal">{goal}</p>
      <p class="brief">{drill.brief}</p>

      {#if drills.score}
        <!-- The coach line outlives the score sheet by design: it is the thing
             the learner acts on, so it stays on screen — and on a phone stays
             above the sliders — while they work (audit ux-02 M-06). -->
        <p class="coach" class:stale={drills.scoreStale}>{drills.score.coach}</p>
      {/if}

      <!-- The hint names the moves and their order, so showing it up front
           replaces retrieval with recognition (audit ux-02 M-02). Opening it
           is recorded and costs a grade in the spacing schedule. -->
      <details class="hint" ontoggle={(e) => e.currentTarget.open && drills.revealHint()}>
        <summary>Stuck? Show a hint</summary>
        <p class="quiet">{drill.hint}</p>
      </details>
    </section>

    {#if wide}
      {@render scoreSheet()}
    {/if}
  </div>

  <div class="col-secondary">
    {#if drills.result}
      <InstrumentBar
        result={drills.result}
        twaDeg={drill.condition.twaDeg}
        {objective}
        busy={drills.loading}
        target={targets}
        targetWithheld={!targets}
        {history}
        twsKt={drill.condition.twsKt}
      />
    {:else}
      <section class="card"><p class="quiet">Solving…</p></section>
    {/if}

    <section class="card">
      <h3 class="section-title">Controls</h3>

      {#if liveSteps !== undefined}
        <p class="distance tabular-nums">
          {liveSteps === 0
            ? 'On the model’s trim.'
            : `${Math.round(liveSteps)} ${Math.round(liveSteps) === 1 ? 'click' : 'clicks'} from the model’s trim.`}
        </p>
      {/if}

      {#each drill.free as key (key)}
        <Slider
          label={spec(key).label}
          bind:value={() => raceValue(key), (v: number) => (drills.controls[key] = v)}
          min={spec(key).min}
          max={spec(key).max}
          step={spec(key).step}
          unit={spec(key).unit}
          target={targetFor(key)}
          decimals={spec(key).step < 1 ? 1 : 0}
        />
      {/each}

      <details class="locked">
        <summary>Locked for this drill ({lockedKeys.length})</summary>
        <ul>
          {#each lockedKeys as key (key)}
            <li>
              <span>{spec(key).label}</span>
              <span class="tabular-nums"
                >{fmt(raceValue(key), spec(key).step < 1 ? 1 : 0, spec(key).unit)}</span
              >
            </li>
          {/each}
        </ul>
      </details>

      {#if !drills.score || drills.scoreStale}
        <button
          type="button"
          class="check"
          disabled={!drills.result || drills.checking}
          onclick={() => void check()}
        >
          Check
        </button>
      {/if}

      {#if answer}
        <div class="after">
          <button type="button" class="secondary" onclick={applyAnswer}>Apply the answer</button>
          {#if !wide}
            <button type="button" class="secondary" onclick={() => (sheetOpen = true)}>
              Show score
            </button>
          {/if}
        </div>
      {/if}
    </section>
  </div>
</div>

{#if !wide}
  <Sheet bind:open={sheetOpen} title="Score">
    {@render scoreSheet()}
  </Sheet>
{/if}

<style>
  .head {
    margin-block-end: var(--space-4);
  }

  .back {
    display: block;
    background: none;
    border: none;
    color: var(--accent);
    font-size: var(--text-sm);
    min-height: var(--hit-min);
    padding: 0;
    cursor: pointer;
  }

  h2 {
    margin: 0;
    font-size: var(--text-lg);
  }

  .cond {
    margin: var(--space-1) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  /* Quiet warn strip, not an alert: a C tier is a caveat on the number, not a
     failure. */
  .c-strip {
    margin: 0;
    padding: var(--space-2) var(--space-3);
    border-inline-start: 3px solid var(--warn);
    border-radius: 0 var(--radius) var(--radius) 0;
    background: color-mix(in srgb, var(--warn) 12%, transparent);
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .goal {
    margin: 0 0 var(--space-2);
    font-size: var(--text-md);
    font-weight: 600;
    color: var(--ink);
  }

  .brief {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--ink);
  }

  .coach {
    margin: var(--space-3) 0 0;
    font-size: var(--text-md);
    color: var(--ink);
  }

  /* Dimmed, not hidden: the correction still belongs to the trim it was taken
     on, and the learner is mid-move (audit ux-02 M-06). */
  .coach.stale {
    opacity: 0.65;
  }

  .distance {
    margin: 0 0 var(--space-2);
    font-size: var(--text-sm);
    color: var(--ink-2);
  }

  .quiet {
    margin: var(--space-2) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .hint,
  .locked {
    font-size: var(--text-sm);
    color: var(--ink-2);
  }

  .hint summary {
    min-height: var(--hit-min);
    display: flex;
    align-items: center;
    cursor: pointer;
    color: var(--accent);
  }

  .locked summary {
    min-height: var(--hit-min);
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .locked ul {
    list-style: none;
    margin: 0;
    padding: 0;
    opacity: 0.6;
  }

  .locked li {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    padding-block: var(--space-1);
  }

  .check {
    width: 100%;
    min-height: var(--hit-min);
    margin-block-start: var(--space-2);
    border-radius: var(--radius);
    background: var(--accent);
    color: var(--on-accent);
    border: 1px solid var(--accent);
    font-size: var(--text-md);
    font-weight: 600;
    cursor: pointer;
  }

  .check:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .after {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-block-start: var(--space-2);
  }

  .after .secondary {
    flex: 1;
    min-height: var(--hit-min);
    border-radius: var(--radius);
    background: transparent;
    color: var(--ink);
    border: 1px solid var(--ink-2);
    font-size: var(--text-sm);
    cursor: pointer;
  }
</style>
