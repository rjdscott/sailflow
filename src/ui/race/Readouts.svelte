<script lang="ts">
  import type { SolveResult, Tier } from '../../core/types';
  import { fmt } from '../format';
  import ConfidenceBadge from '../components/ConfidenceBadge.svelte';

  let {
    result,
    twaDeg,
    variant = 'hero',
    busy = false,
  }: {
    result: SolveResult;
    twaDeg: number;
    /** `hero` = three big readouts + a quiet row (phone). `strip` = the sticky
        desktop metrics band, every number the same size. */
    variant?: 'hero' | 'strip';
    busy?: boolean;
  } = $props();

  interface Metric {
    label: string;
    text: string;
    unit: string;
    tier?: Tier;
  }

  // Only the solver's own tiered outputs carry a badge. AWA and flat come out
  // of the aero state untiered, so they get none rather than an invented one.
  const big: Metric[] = $derived([
    { label: 'BSP', text: fmt(result.bsKt.value, 1), unit: 'kt', tier: result.bsKt.tier },
    { label: 'Height', text: fmt(twaDeg, 0), unit: '°' },
    { label: 'VMG', text: fmt(result.vmgKt.value, 2), unit: 'kt', tier: result.vmgKt.tier },
  ]);

  const quiet: Metric[] = $derived([
    { label: 'Heel', text: fmt(result.heelDeg.value, 0), unit: '°', tier: result.heelDeg.tier },
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
    <!-- Re-keying on the text restarts the highlight, so a metric that did not
         move does not flash. -->
    {#key m.text}
      <span class="value flash" class:hero-number={size === 'lg'} class:small={size === 'sm'}>
        {m.text}{#if m.unit}<span class="hero-unit">{m.unit}</span>{/if}
      </span>
    {/key}
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

  @media (prefers-reduced-motion: no-preference) {
    .flash {
      animation: flash 400ms ease-out;
    }
  }

  @keyframes flash {
    0%,
    37% {
      background-color: color-mix(in srgb, var(--accent) 12%, transparent);
    }
    100% {
      background-color: transparent;
    }
  }
</style>
