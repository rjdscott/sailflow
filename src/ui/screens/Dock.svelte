<script lang="ts">
  import Slider from '../components/Slider.svelte';
  import Readout from '../components/Readout.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { stubClient } from '../../worker/client';
  import type { DockScoreRequest } from '../../worker/protocol';
  import type { DockScore } from '../../core/types';

  const client = stubClient();

  let upperTurns = $state(6);
  let lowerTurns = $state(4);
  let forestayMm = $state(0);
  let locked = $state(false);
  let scores = $state<DockScore[] | undefined>(undefined);

  $effect(() => {
    void upperTurns;
    void lowerTurns;
    void forestayMm;
    client
      .request<DockScoreRequest>({
        type: 'dockScore',
        setups: [{ upperTurns, lowerTurns, forestayMm }],
        forecast: undefined!,
      })
      .then((r) => (scores = r));
  });
</script>

<TopBar title="Dock" />

<section>
  <Slider
    label="Upper shroud"
    bind:value={upperTurns}
    min={0}
    max={12}
    step={0.5}
    unit="turns"
    {locked}
  />
  <Slider
    label="Lower shroud"
    bind:value={lowerTurns}
    min={0}
    max={12}
    step={0.5}
    unit="turns"
    {locked}
  />
  <Slider label="Forestay" bind:value={forestayMm} min={-20} max={20} step={1} unit="mm" {locked} />
  <label class="lock-toggle">
    <input type="checkbox" bind:checked={locked} />
    Lock (committed for the day)
  </label>
</section>

{#if scores?.[0]}
  <section class="readouts">
    <Readout
      label="Expected regret"
      value={scores[0].expectedRegretSPerMile.value}
      tier={scores[0].expectedRegretSPerMile.tier}
      unit="s/mi"
      decimals={1}
    />
  </section>
{/if}

<style>
  section {
    padding-block: var(--space-3);
  }

  .lock-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--hit-min);
    font-size: var(--text-sm);
  }

  .readouts {
    display: flex;
    gap: var(--space-6);
    flex-wrap: wrap;
  }
</style>
