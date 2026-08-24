<script lang="ts">
  import type { Tier } from '../../core/types';

  let {
    tier,
    reason,
  }: {
    tier: Tier;
    reason?: string;
  } = $props();

  const defaultReason: Record<Tier, string> = {
    A: 'Directly modelled: a number you may quote.',
    B: 'Modelled with a band: direction and range, not a single value.',
    C: 'Direction only: sign of the effect relative to the reference state.',
  };
</script>

<span class="badge tier-{tier}" title={reason ?? defaultReason[tier]}>
  {tier}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.5em;
    padding: 0 var(--space-1);
    font-size: var(--text-xs);
    font-weight: 600;
    border-radius: var(--radius);
    line-height: 1.5;
  }

  .tier-A {
    background: var(--accent);
    color: var(--on-accent);
    border: 1px solid var(--accent);
  }

  .tier-B {
    background: transparent;
    color: var(--accent);
    border: 1px solid var(--accent);
  }

  .tier-C {
    background: transparent;
    color: var(--ink-2);
    border: 1px dashed var(--ink-2);
  }
</style>
