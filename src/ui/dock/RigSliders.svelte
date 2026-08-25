<script lang="ts">
  import type { DockControls, DockScore } from '../../core/types';
  import Slider from '../components/Slider.svelte';
  import { fmt, snap } from '../format';
  import { guideBand, guideSource, signed, specs } from './logic';

  let {
    setup,
    score,
    likelyKt,
    locked = false,
    showOptimum = true,
  }: {
    setup: DockControls;
    score: DockScore | null;
    likelyKt: number;
    locked?: boolean;
    showOptimum?: boolean;
  } = $props();

  const band = $derived(guideBand(likelyKt));
  const upperTick = $derived(
    snap(band.uppersTurns, specs.upperTurns.min, specs.upperTurns.max, specs.upperTurns.step),
  );
  const lowerTick = $derived(
    snap(band.lowersTurns, specs.lowerTurns.min, specs.lowerTurns.max, specs.lowerTurns.step),
  );

  /** "+4.0" for turns from base, "15 mm" for an absolute measurement. */
  function value(v: number, decimals: number, unit: string): string {
    return decimals === 0 ? fmt(v, 0, unit) : signed(v, decimals);
  }
</script>

{#snippet optimumChips(key: keyof DockControls, decimals: number, unit: string)}
  {#if score && showOptimum}
    <p class="chips">
      <span class="chip-label">optimum</span>
      <span class="chip tabular-nums">
        {value(score.atMin.optimum[key], decimals, unit)} at {fmt(score.atMin.twsKt, 0, 'kt')}
      </span>
      <span class="chip tabular-nums">
        {value(score.atMax.optimum[key], decimals, unit)} at {fmt(score.atMax.twsKt, 0, 'kt')}
      </span>
    </p>
  {/if}
{/snippet}

<Slider
  label={specs.upperTurns.label}
  bind:value={setup.upperTurns}
  min={specs.upperTurns.min}
  max={specs.upperTurns.max}
  step={specs.upperTurns.step}
  unit={specs.upperTurns.unit}
  tick={upperTick}
  {locked}
  hint="{guideSource}: {signed(band.uppersTurns)} in {band.label}"
/>
{@render optimumChips('upperTurns', 1, 'turns')}

<Slider
  label={specs.lowerTurns.label}
  bind:value={setup.lowerTurns}
  min={specs.lowerTurns.min}
  max={specs.lowerTurns.max}
  step={specs.lowerTurns.step}
  unit={specs.lowerTurns.unit}
  tick={lowerTick}
  {locked}
  hint="{guideSource}: {signed(band.lowersTurns)} in {band.label}"
/>
{@render optimumChips('lowerTurns', 1, 'turns')}

<Slider
  label={specs.forestayMm.label}
  bind:value={setup.forestayMm}
  min={specs.forestayMm.min}
  max={specs.forestayMm.max}
  step={specs.forestayMm.step}
  unit={specs.forestayMm.unit}
  decimals={0}
  {locked}
  hint="No published band for the forestay: the guides give rake in words."
/>
{@render optimumChips('forestayMm', 0, 'mm')}

<style>
  .chips {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-2);
    margin: 0 0 var(--space-2);
  }

  .chip-label {
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  /* The outline is the chip: --line is 1.3:1 and vanishes (audit ux-01 L-02). */
  .chip {
    padding: 2px var(--space-2);
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    font-size: var(--text-xs);
    color: var(--ink-2);
    white-space: nowrap;
  }
</style>
