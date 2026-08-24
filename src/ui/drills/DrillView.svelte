<script lang="ts">
  import Slider from '../components/Slider.svelte';
  import Readout from '../components/Readout.svelte';
  import ScoreSheet from './ScoreSheet.svelte';
  import { RACE_KEYS, type Drill } from '../../lib/drills';
  import { drills } from './store.svelte';
  import { fmt } from '../format';
  import type { ControlSpec, DownControls, RaceControls } from '../../core/types';
  import j70 from '../../../data/boats/j70.json';

  let { drill, onback }: { drill: Drill; onback: () => void } = $props();

  const SPECS = j70.controls as Record<string, ControlSpec>;

  const SEA = ['flat', 'ripple', 'chop', 'short steep chop', 'waves'];

  const lockedKeys = $derived(RACE_KEYS.filter((k) => !drill.free.includes(k)));

  // Live solve: any control move re-requests `trimmed`, debounced in the store.
  $effect(() => {
    void $state.snapshot(drills.controls);
    if (drills.down) void $state.snapshot(drills.down);
    drills.solve();
  });

  function spec(key: string): ControlSpec {
    return SPECS[key];
  }

  function raceValue(key: keyof RaceControls): number {
    return drills.controls[key];
  }

  function downValue(key: keyof DownControls): number {
    return drills.down?.[key] ?? 0;
  }
</script>

<section class="view">
  <button type="button" class="back" onclick={onback}>← All drills</button>

  <header>
    <h2>{drill.title}</h2>
    <p class="cond">
      {drill.condition.twsKt} kt · {SEA[drill.condition.seaState]} · TWA {drill.condition.twaDeg}° ·
      {drill.condition.sailset === 'asym' ? 'gennaker' : 'jib'}
    </p>
    <p class="brief">{drill.brief}</p>
    {#if drill.cTier}
      <p class="banner">
        Tier C: for this drill the model gives the direction of the effect only, not a number worth
        quoting. Use it to rank two setups, not to measure one.
      </p>
    {/if}
  </header>

  {#if drills.result}
    <div class="readouts">
      <Readout
        label="Boat speed"
        value={drills.result.bsKt.value}
        tier={drills.result.bsKt.tier}
        unit="kt"
        size="lg"
      />
      <Readout
        label="VMG"
        value={drills.result.vmgKt.value}
        tier={drills.result.vmgKt.tier}
        unit="kt"
        size="lg"
      />
      <Readout
        label="Heel"
        value={drills.result.heelDeg.value}
        tier={drills.result.heelDeg.tier}
        unit="°"
        decimals={0}
      />
    </div>
  {/if}

  <div class="controls">
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
    {#each drill.freeDown ?? [] as key (key)}
      <Slider
        label={spec(key).label}
        bind:value={
          () => downValue(key),
          (v: number) => {
            if (drills.down) drills.down[key] = v;
          }
        }
        min={spec(key).min}
        max={spec(key).max}
        step={spec(key).step}
        unit={spec(key).unit}
        decimals={0}
      />
    {/each}
  </div>

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

  <p class="hint">{drill.hint}</p>

  {#if drills.score}
    <ScoreSheet
      score={drills.score}
      cTier={drill.cTier}
      ontryagain={() => drills.reset()}
      onnext={() => drills.next()}
    />
  {:else}
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

<style>
  .view {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .back {
    align-self: flex-start;
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
    font-size: var(--text-xl);
  }

  .cond,
  .brief,
  .hint,
  .banner {
    margin: var(--space-1) 0 0;
  }

  .cond {
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .brief {
    font-size: var(--text-sm);
    color: var(--ink);
  }

  .banner {
    font-size: var(--text-xs);
    color: var(--ink-2);
    border: 1px dashed var(--ink-2);
    border-radius: var(--radius);
    padding: var(--space-2);
  }

  .readouts {
    display: flex;
    gap: var(--space-6);
    flex-wrap: wrap;
  }

  .locked {
    font-size: var(--text-sm);
    color: var(--ink-2);
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

  .hint {
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .check {
    min-height: var(--hit-min);
    border-radius: var(--radius);
    background: var(--accent);
    color: var(--on-accent);
    border: 1px solid var(--accent);
    font-size: var(--text-md);
    cursor: pointer;
  }

  .check:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
