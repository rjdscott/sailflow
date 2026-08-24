<script lang="ts">
  import Slider from '../components/Slider.svelte';
  import Readout from '../components/Readout.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { stubClient } from '../../worker/client';
  import type { TrimmedRequest } from '../../worker/protocol';
  import type { SolveResult } from '../../core/types';

  const client = stubClient();

  let mainsheet = $state(45);
  let traveller = $state(0);
  let result = $state<SolveResult | undefined>(undefined);

  $effect(() => {
    // Re-run the stub "solve" whenever a race control changes.
    void mainsheet;
    void traveller;
    client
      .request<TrimmedRequest>({ type: 'trimmed', controls: undefined!, condition: undefined! })
      .then((r) => (result = r));
  });
</script>

<TopBar title="Race" />

<section>
  <Slider label="Mainsheet" bind:value={mainsheet} min={0} max={100} step={1} unit="%" />
  <Slider label="Traveller" bind:value={traveller} min={-20} max={20} step={1} unit="mm" tick={0} />
</section>

{#if result}
  <section class="readouts">
    <Readout label="Boat speed" value={result.bsKt.value} tier={result.bsKt.tier} unit="kt" />
    <Readout label="VMG" value={result.vmgKt.value} tier={result.vmgKt.tier} unit="kt" />
    <Readout
      label="Heel"
      value={result.heelDeg.value}
      tier={result.heelDeg.tier}
      unit="°"
      decimals={0}
    />
  </section>
{/if}

<style>
  section {
    padding-block: var(--space-3);
  }

  .readouts {
    display: flex;
    gap: var(--space-6);
    flex-wrap: wrap;
  }
</style>
