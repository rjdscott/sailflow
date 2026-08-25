<script lang="ts">
  import type { Tier } from '../../core/types';
  import { fmt } from '../format';
  import ConfidenceBadge from './ConfidenceBadge.svelte';
  import { bulletBands, bulletScale, type BetterIs } from '../instruments/gauges';

  /**
   * Few's bullet graph: three qualitative ranges as flat bands behind one
   * value mark and a perpendicular target tick. No borders, no gridlines, no
   * gauge furniture — the bands are the scale.
   */
  let {
    label,
    value,
    min,
    max,
    target,
    ranges,
    betterIs = 'more',
    unit = '',
    decimals = 0,
    tier,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    target?: number;
    /** Two boundaries in value space, splitting [min, max] into three bands. */
    ranges?: [number, number];
    betterIs?: BetterIs;
    unit?: string;
    decimals?: number;
    tier?: Tier;
  } = $props();

  const scale = $derived(bulletScale({ min, max, value, target, ranges, betterIs }));
  const bands = $derived(bulletBands(scale.rangePcts, betterIs));

  /** A degree sign hangs off the digits; every other unit takes a space. */
  const show = (n: number): string =>
    unit === '°' ? `${fmt(n, decimals)}°` : fmt(n, decimals, unit);

  const aria = $derived(
    [`${label} ${show(value)}`, target === undefined ? '' : `of target ${show(target)}`]
      .filter(Boolean)
      .join(' ') + `, range ${fmt(min, decimals)} to ${fmt(max, decimals)}`,
  );
</script>

<div class="gauge">
  <span class="head">
    <span class="section-title">
      {label}
      {#if tier}<ConfidenceBadge {tier} />{/if}
    </span>
    <span class="v tabular-nums">{show(value)}</span>
  </span>

  <svg
    class="chart"
    width="100%"
    height="28"
    viewBox="0 0 100 28"
    preserveAspectRatio="none"
    role="img"
    aria-label={aria}
  >
    {#each bands as b (b.shade)}
      <rect
        class:r1={b.shade === 1}
        class:r2={b.shade === 2}
        class:r3={b.shade === 3}
        x={b.x}
        y="0"
        width={b.w}
        height="28"
      />
    {/each}

    {#if scale.symbolMode}
      <!-- The scale does not start at zero, so a bar from the left would read
           as a ratio it does not have: mark the value instead. -->
      <line
        class="mark"
        x1={scale.valuePct}
        x2={scale.valuePct}
        y1="6"
        y2="22"
        vector-effect="non-scaling-stroke"
      />
    {:else}
      <rect class="bar" x="0" y="10" width={scale.valuePct} height="8" />
    {/if}

    {#if scale.targetPct !== undefined}
      <line
        class="bug"
        x1={scale.targetPct}
        x2={scale.targetPct}
        y1="2"
        y2="26"
        vector-effect="non-scaling-stroke"
      />
    {/if}
  </svg>
</div>

<style>
  .gauge {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 0;
  }

  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .v {
    color: var(--instrument, var(--ink));
    font-size: var(--text-md);
    font-weight: 600;
    white-space: nowrap;
  }

  .chart {
    display: block;
    border-radius: var(--radius);
    overflow: hidden;
  }

  /* Three intensities of one hue. Darkest is the worst band, whichever end of
     the scale that is. */
  .r1 {
    fill: var(--range-1, var(--line-strong));
  }

  .r2 {
    fill: var(--range-2, var(--line));
  }

  .r3 {
    fill: var(--range-3, var(--surface));
  }

  .bar,
  .mark {
    fill: var(--instrument, var(--ink));
    stroke: var(--instrument, var(--ink));
    stroke-width: 3;
  }

  .bug {
    stroke: var(--bug, var(--accent));
    stroke-width: 2;
  }
</style>
