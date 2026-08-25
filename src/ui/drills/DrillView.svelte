<script lang="ts">
  import Slider from '../components/Slider.svelte';
  import Readout from '../components/Readout.svelte';
  import ScoreSheet from './ScoreSheet.svelte';
  import { RACE_KEYS, type Drill } from '../../lib/drills';
  import { drills } from './store.svelte';
  import { fmt, SEA_LABELS } from '../format';
  import type { ControlSpec, RaceControls } from '../../core/types';
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

  // Live solve: any control move re-requests `trimmed`, debounced in the store.
  $effect(() => {
    void $state.snapshot(drills.controls);
    drills.solve();
  });

  function spec(key: string): ControlSpec {
    return SPECS[key];
  }

  function raceValue(key: keyof RaceControls): number {
    return drills.controls[key];
  }
</script>

<header class="head">
  <button type="button" class="back" onclick={onback}>← All drills</button>
  <h2>{drill.title}</h2>
  <p class="cond tabular-nums">{condition}</p>
</header>

<div class="screen">
  <div class="col-primary">
    {#if drill.cTier}
      <p class="c-strip">
        Tier C: for this drill the model gives the direction of the effect only, not a number worth
        quoting. Use it to rank two setups, not to measure one.
      </p>
    {/if}

    <section class="card">
      <h3 class="section-title">Live</h3>
      {#if drills.result}
        <div class="readouts">
          <Readout
            label="Boat speed"
            value={drills.result.bsKt.value}
            tier={drills.result.bsKt.tier}
            unit="kt"
            size="lg"
            decimals={2}
          />
          <Readout
            label="VMG"
            value={drills.result.vmgKt.value}
            tier={drills.result.vmgKt.tier}
            unit="kt"
            size="lg"
            decimals={2}
          />
          <Readout
            label="Heel"
            value={drills.result.heelDeg.value}
            tier={drills.result.heelDeg.tier}
            unit="°"
            decimals={0}
          />
        </div>
      {:else}
        <p class="quiet">Solving…</p>
      {/if}
    </section>

    <section class="card">
      <h3 class="section-title">Coach</h3>
      <p class="brief">{drill.brief}</p>
      <!-- The hint names the moves and their order, so showing it up front
           replaces retrieval with recognition (audit ux-02 M-02). Opening it
           is recorded and costs a grade in the spacing schedule. -->
      <details class="hint" ontoggle={(e) => e.currentTarget.open && drills.revealHint()}>
        <summary>Stuck? Show a hint</summary>
        <p class="quiet">{drill.hint}</p>
      </details>
    </section>

    {#if drills.score}
      <ScoreSheet
        score={drills.score}
        stale={drills.scoreStale}
        cTier={drill.cTier}
        ontryagain={() => drills.reset()}
        onnext={() => drills.next()}
      />
    {/if}
  </div>

  <div class="col-secondary">
    <section class="card">
      <h3 class="section-title">Controls</h3>

      {#each drill.free as key (key)}
        <Slider
          label={spec(key).label}
          bind:value={() => raceValue(key), (v: number) => (drills.controls[key] = v)}
          min={spec(key).min}
          max={spec(key).max}
          step={spec(key).step}
          unit={spec(key).unit}
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
          onclick={() => drills.check()}
        >
          Check
        </button>
      {/if}
    </section>
  </div>
</div>

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

  .readouts {
    display: flex;
    gap: var(--space-6);
    flex-wrap: wrap;
  }

  .brief {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--ink);
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
</style>
