<script lang="ts">
  import type { DockControls, DockScore } from '../../core/types';
  import Slider from '../components/Slider.svelte';
  import { fmt, snap } from '../format';
  import Segmented from '../components/Segmented.svelte';
  import { defaultGuideId, guideBand, guideLabel, signed, specs } from './logic';
  import { guidesFor } from '../../lib/reference';
  import { needsSelector } from '../disagree/guides';
  import { guideSelection } from '../disagree/store.svelte';

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

  // The guide is whichever one the disagreement panel is showing, so the two
  // never quote different sources at the same time.
  const entries = $derived(guidesFor());
  const guideId = $derived(guideSelection.id ?? defaultGuideId());
  const band = $derived(guideBand(likelyKt, guideId));
  const selectorOptions = $derived(entries.map((e) => ({ value: e.id, label: e.label })));
  let selected = $state(guideSelection.id ?? defaultGuideId() ?? '');

  function tick(
    turns: number | null | undefined,
    spec: (typeof specs)['upperTurns'],
  ): number | undefined {
    return turns === null || turns === undefined
      ? undefined
      : snap(turns, spec.min, spec.max, spec.step);
  }

  const upperTick = $derived(tick(band?.uppersTurns, specs.upperTurns));
  const lowerTick = $derived(tick(band?.lowersTurns, specs.lowerTurns));

  /**
   * "North: +4.0 in 12-16 kt" — and the honest alternatives when the guide has
   * no number for this control, or when the boat has no guide at all.
   */
  function hintFor(turns: number | null | undefined): string {
    if (!band) return 'No tuning guide is committed for this boat.';
    if (turns === null || turns === undefined)
      return `${guideLabel(guideId)} publishes no value for ${band.label}.`;
    return `${guideLabel(guideId)}: ${signed(turns)} in ${band.label}`;
  }

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

<!-- Only once there are more guides than the panel can show side by side. -->
{#if needsSelector(entries)}
  <div class="guide-pick">
    <span class="chip-label">guide</span>
    <Segmented
      options={selectorOptions}
      bind:value={selected}
      ariaLabel="Which tuning guide to quote"
      onchange={(v) => (guideSelection.id = v)}
    />
  </div>
{/if}

<Slider
  label={specs.upperTurns.label}
  bind:value={setup.upperTurns}
  min={specs.upperTurns.min}
  max={specs.upperTurns.max}
  step={specs.upperTurns.step}
  unit={specs.upperTurns.unit}
  tick={upperTick}
  {locked}
  hint={hintFor(band?.uppersTurns)}
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
  hint={hintFor(band?.lowersTurns)}
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
  .guide-pick {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

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
