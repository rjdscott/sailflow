<script lang="ts">
  import type { SolveResult, Tier } from '../../core/types';
  import { fmt, targetOf } from '../format';
  import ConfidenceBadge from '../components/ConfidenceBadge.svelte';
  import { OPTIMUM_REASON, OPTIMUM_TIER } from './optimum.svelte';
  import type { Objective } from './store.svelte';

  let {
    result,
    twaDeg,
    objective,
    variant = 'hero',
    busy = false,
    target,
  }: {
    result: SolveResult;
    twaDeg: number;
    /** What "faster" means here. Downwind VMG is negative towards the mark, so
        the gap to the target has to be signed against it, not against zero. */
    objective: Objective;
    /** `hero` = three big readouts + a quiet row (phone). `strip` = the sticky
        desktop metrics band, every number the same size. */
    variant?: 'hero' | 'strip';
    busy?: boolean;
    /** What the solver's optimal trim reaches at this condition, if it has answered. */
    target?: { bsKt?: number; vmgKt?: number; heelDeg?: number };
  } = $props();

  interface Metric {
    label: string;
    text: string;
    unit: string;
    tier?: Tier;
    /** Optimum for this metric, already formatted, plus the signed gap to it. */
    target?: { text: string; delta: string };
  }

  /**
   * The delta is ink, never red or green: the optimum is somewhere to steer
   * towards, not a mark you are failing (ux-01 M-02, M-09). One convention
   * across the whole card — positive means the target is faster than you —
   * which downwind means flipping the raw difference (ux-02 M-09).
   */
  const vmgBetter = $derived(objective === 'vmgDown' ? ('less' as const) : ('more' as const));
  const DELTA_TITLE = 'Gap to the target: + means the target is faster than you.';

  // Only the solver's own tiered outputs carry a badge. AWA and flat come out
  // of the aero state untiered, so they get none rather than an invented one.
  const big: Metric[] = $derived([
    {
      label: 'BSP',
      text: fmt(result.bsKt.value, 1),
      unit: 'kt',
      tier: result.bsKt.tier,
      target: targetOf(result.bsKt.value, target?.bsKt, 1),
    },
    { label: 'Height', text: fmt(twaDeg, 0), unit: '°' },
    {
      label: 'VMG',
      text: fmt(result.vmgKt.value, 2),
      unit: 'kt',
      tier: result.vmgKt.tier,
      target: targetOf(result.vmgKt.value, target?.vmgKt, 2, vmgBetter),
    },
  ]);

  const quiet: Metric[] = $derived([
    {
      label: 'Heel',
      text: fmt(result.heelDeg.value, 0),
      unit: '°',
      tier: result.heelDeg.tier,
      target: targetOf(result.heelDeg.value, target?.heelDeg, 0),
    },
    {
      label: 'Leeway',
      text: fmt(result.leewayDeg.value, 1),
      unit: '°',
      tier: result.leewayDeg.tier,
    },
    { label: 'AWA', text: fmt(result.aero.awaDeg, 0), unit: '°' },
    { label: 'Flat', text: fmt(result.aero.flat, 2), unit: '' },
  ]);
</script>

{#snippet cell(m: Metric, size: 'lg' | 'sm')}
  <div class="cell">
    <span class="section-title">
      {m.label}
      {#if m.tier}<ConfidenceBadge tier={m.tier} />{/if}
    </span>
    <!-- Re-keying on the text restarts the fade, so a metric that did not move
         does not animate. -->
    {#key m.text}
      <span class="value fade" class:hero-number={size === 'lg'} class:small={size === 'sm'}>
        {m.text}{#if m.unit}<span class="hero-unit">{m.unit}</span>{/if}
      </span>
    {/key}
    {#if m.target}
      <span class="target">
        target {m.target.text}
        <span class="delta tabular-nums" title={DELTA_TITLE}>{m.target.delta}</span>
        <ConfidenceBadge tier={OPTIMUM_TIER} reason={OPTIMUM_REASON} />
      </span>
    {/if}
  </div>
{/snippet}

<section class="card metrics {variant}" class:stale={!result.converged} aria-live="off">
  {#if busy}<span class="progress" aria-hidden="true"></span>{/if}

  {#if variant === 'hero'}
    <div class="row big">
      {#each big as m (m.label)}{@render cell(m, 'lg')}{/each}
    </div>
    <div class="row quiet">
      {#each quiet as m (m.label)}{@render cell(m, 'sm')}{/each}
    </div>
  {:else}
    <div class="row strip-grid">
      {#each big as m (m.label)}{@render cell(m, 'sm')}{/each}
      {#each quiet as m (m.label)}{@render cell(m, 'sm')}{/each}
    </div>
  {/if}

  {#if !result.converged}
    <p class="note">Solver did not converge at this state — numbers are the last iterate.</p>
  {/if}
</section>

<style>
  .metrics {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .row {
    display: grid;
    gap: var(--space-3);
  }

  .big {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .quiet {
    grid-template-columns: repeat(auto-fit, minmax(84px, 1fr));
    padding-top: var(--space-3);
    border-top: 1px solid var(--line);
  }

  .strip-grid {
    grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
    gap: var(--space-3) var(--space-4);
  }

  .cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .value {
    display: inline-flex;
    align-items: baseline;
    gap: var(--space-1);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    border-radius: var(--radius);
  }

  .value.small {
    font-size: var(--text-md);
    font-weight: 600;
    color: var(--ink);
  }

  /* Ink, not valence: the gap to the optimum is information, not a score. */
  .target {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0 var(--space-1);
    min-width: 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .delta {
    color: var(--ink-2);
  }

  .stale {
    opacity: 0.75;
  }

  .note {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--warn);
  }

  /* 1 px indeterminate line, absolutely positioned: a solve in flight never
     moves anything on the page. */
  .progress {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
    background-size: 40% 100%;
    background-repeat: no-repeat;
    animation: sweep 1.1s linear infinite;
  }

  @keyframes sweep {
    from {
      background-position: -40% 0;
    }
    to {
      background-position: 140% 0;
    }
  }

  /* One drag changes every metric at once, so a filled highlight strobes the
     whole card. A short fade says "this number moved" and gets out of the way. */
  @media (prefers-reduced-motion: no-preference) {
    .fade {
      animation: fade 120ms ease-out;
    }
  }

  @keyframes fade {
    from {
      opacity: 0.3;
    }
    to {
      opacity: 1;
    }
  }
</style>
