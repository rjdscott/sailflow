<script lang="ts">
  import type { SolveResult } from '../../core/types';
  import Readout from '../components/Readout.svelte';

  let { result, twaDeg }: { result: SolveResult; twaDeg: number } = $props();
</script>

<section class="readouts" class:stale={!result.converged}>
  <div class="hero">
    <Readout label="BSP" value={result.bsKt.value} tier={result.bsKt.tier} unit="kt" size="lg" />
    <Readout label="Height" value={twaDeg} unit="° TWA" size="lg" decimals={0} />
    <Readout
      label="VMG"
      value={result.vmgKt.value}
      tier={result.vmgKt.tier}
      unit="kt"
      size="lg"
      decimals={2}
    />
  </div>
  <div class="small">
    <Readout
      label="Heel"
      value={result.heelDeg.value}
      tier={result.heelDeg.tier}
      unit="°"
      decimals={0}
    />
    <Readout
      label="Leeway"
      value={result.leewayDeg.value}
      tier={result.leewayDeg.tier}
      unit="°"
      decimals={0}
    />
  </div>
  {#if !result.converged}
    <p class="note">Solver did not converge at this state — numbers are the last iterate.</p>
  {/if}
</section>

<style>
  .readouts {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-block: var(--space-3);
  }

  .hero {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
  }

  .small {
    display: flex;
    gap: var(--space-6);
  }

  .stale {
    opacity: 0.7;
  }

  .note {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--warn);
  }
</style>
