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

  /** "optimum -1.0 at 8 kt · +4.0 at 16 kt" — both ends of the forecast. */
  function optimum(key: keyof DockControls, decimals: number, unit: string): string | undefined {
    if (!score || !showOptimum) return undefined;
    const at = (v: number, tws: number): string =>
      `${decimals === 0 ? fmt(v, 0, unit) : signed(v, decimals)} at ${fmt(tws, 0, 'kt')}`;
    return `optimum ${at(score.atMin.optimum[key], score.atMin.twsKt)} · ${at(score.atMax.optimum[key], score.atMax.twsKt)}`;
  }
</script>

<Slider
  label={specs.upperTurns.label}
  bind:value={setup.upperTurns}
  min={specs.upperTurns.min}
  max={specs.upperTurns.max}
  step={specs.upperTurns.step}
  unit={specs.upperTurns.unit}
  tick={upperTick}
  {locked}
  hint={optimum('upperTurns', 1, 'turns') ??
    `${guideSource}: ${signed(band.uppersTurns)} in ${band.label}`}
/>
{#if showOptimum && score}
  <p class="guide">{guideSource}: {signed(band.uppersTurns)} turns in {band.label}</p>
{/if}

<Slider
  label={specs.lowerTurns.label}
  bind:value={setup.lowerTurns}
  min={specs.lowerTurns.min}
  max={specs.lowerTurns.max}
  step={specs.lowerTurns.step}
  unit={specs.lowerTurns.unit}
  tick={lowerTick}
  {locked}
  hint={optimum('lowerTurns', 1, 'turns') ??
    `${guideSource}: ${signed(band.lowersTurns)} in ${band.label}`}
/>
{#if showOptimum && score}
  <p class="guide">{guideSource}: {signed(band.lowersTurns)} turns in {band.label}</p>
{/if}

<Slider
  label={specs.forestayMm.label}
  bind:value={setup.forestayMm}
  min={specs.forestayMm.min}
  max={specs.forestayMm.max}
  step={specs.forestayMm.step}
  unit={specs.forestayMm.unit}
  decimals={0}
  {locked}
  hint={optimum('forestayMm', 0, 'mm')}
/>

<style>
  .guide {
    margin: calc(-1 * var(--space-1)) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }
</style>
