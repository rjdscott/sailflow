<script lang="ts">
  import { sparkPoints } from '../instruments/gauges';

  /**
   * The shape of the last few samples, nothing more: no axes, no ticks, no
   * numbers. The cell beside it carries the value, so the line is decoration
   * for the eye and hidden from the accessibility tree.
   */
  let {
    points,
    width = 64,
    height = 16,
    stroke = 'currentColor',
  }: {
    points: number[];
    width?: number;
    height?: number;
    stroke?: string;
  } = $props();

  const path = $derived(sparkPoints(points, width, height));
</script>

{#if path}
  <svg {width} {height} viewBox="0 0 {width} {height}" aria-hidden="true" focusable="false">
    <polyline
      points={path}
      fill="none"
      {stroke}
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
{/if}

<style>
  svg {
    display: block;
    overflow: visible;
  }
</style>
