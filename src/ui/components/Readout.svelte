<script lang="ts">
  import type { Tier } from '../../core/types';
  import { fmt } from '../format';
  import ConfidenceBadge from './ConfidenceBadge.svelte';

  let {
    label,
    value,
    unit = '',
    tier,
    size = 'sm',
    decimals = 1,
  }: {
    label: string;
    value: number;
    unit?: string;
    tier?: Tier;
    size?: 'sm' | 'lg';
    decimals?: number;
  } = $props();
</script>

<div class="readout" class:lg={size === 'lg'}>
  <span class="label">
    {label}
    {#if tier}<ConfidenceBadge {tier} />{/if}
  </span>
  <span class="value tabular-nums">{fmt(value, decimals, unit)}</span>
</div>

<style>
  .readout {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    color: var(--ink-2);
  }

  .value {
    font-size: var(--text-lg);
    color: var(--ink);
    white-space: nowrap;
  }

  .readout.lg .value {
    font-size: var(--text-2xl);
  }
</style>
