<script lang="ts">
  import type { SolveResult } from '../../../core/types';
  import Panel from '../../components/Panel.svelte';
  import Sheet from '../../components/Sheet.svelte';
  import { STRIPE_INCHES } from '../../instruments/gauges';
  import { panelControlsId } from '../../keys';
  import SagIndicator from '../SagIndicator.svelte';
  import SailSectionStack from '../SailSectionStack.svelte';
  import SpreaderStripeGauge from '../SpreaderStripeGauge.svelte';
  import { puffPlayer } from '../puffPlayer.svelte';
  import { race } from '../store.svelte';
  import ControlRow from './ControlRow.svelte';
  import { explainText, explainTitle } from './copy';

  /**
   * The headsail system: sheet, lead and inhauler, the jib's own section
   * stack, and the two cues that judge it — where the leech crosses the
   * spreader stripes, and how much the headstay is sagging (ADR 0015).
   *
   * Under the kite there is no jib, so the panel says so and locks its
   * controls rather than letting you trim a sail that is not up.
   */
  let { result, flying }: { result: SolveResult | null; flying: boolean } = $props();

  /** Plain alias onto the store's reactive proxy: the sliders bind through it. */
  const values = race.controls.race as unknown as Record<string, number>;

  /** S12's order: ease first, then the lead, then luff tension. */
  const IDS = ['jibSheet', 'jibLead', 'inhauler'];

  const NOT_FLYING = 'The kite is up and the jib is furled: there is nothing to trim here.';

  const shape = $derived(result?.shape.jib);
  const stripe = $derived(result?.instruments.jibLeechStripe);

  let explaining: string | null = $state(null);
  let sheetOpen = $state(false);

  function explain(id: string): void {
    explaining = id;
    sheetOpen = true;
  }
</script>

<Panel
  title="Headsail"
  id="headsail-title"
  lit={puffPlayer.litIndex('headsail')}
  cue="Trim until the top leech ribbon just stalls, then ease a hair — if it keeps stalling, move the lead aft."
>
  {#snippet controls()}
    <div class="rows" id={panelControlsId('headsail')}>
      {#each IDS as id (id)}
        <ControlRow
          {id}
          {values}
          optimumBug
          locked={!flying}
          lockReason={NOT_FLYING}
          onexplain={explain}
        />
      {/each}

      <details>
        <summary>Setup</summary>
        <ControlRow
          id="jibHalyard"
          {values}
          optimumBug
          locked={!flying}
          lockReason={NOT_FLYING}
          onexplain={explain}
        />
      </details>

      <!-- S12's three-step priority, in order, for the tier that is learning
           it. Race and analyse have the gauge; this is the sentence. -->
      <p class="sequence">Sequence: ease → lead aft → tension.</p>
    </div>
  {/snippet}

  {#snippet visual()}
    {#if flying}
      <SailSectionStack sail="jib" {shape} table={false} />
    {:else}
      <p class="empty">Jib not flying.</p>
    {/if}
  {/snippet}

  {#snippet instruments()}
    {#if flying && stripe}
      <SpreaderStripeGauge stripe={stripe.value} inches={STRIPE_INCHES} onexplain={explain} />
    {/if}
    {#if result}
      <SagIndicator sagMm={result.rig.sagMm} onexplain={explain} />
    {/if}
  {/snippet}
</Panel>

<Sheet bind:open={sheetOpen} title={explainTitle(explaining)}>
  <p class="explainer">{explainText(explaining)}</p>
</Sheet>

<style>
  .rows {
    display: flex;
    flex-direction: column;
  }

  .rows > :global(* + *) {
    border-top: 1px solid var(--line);
  }

  details summary {
    min-height: var(--hit-min);
    display: flex;
    align-items: center;
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
  }

  .sequence {
    display: none;
    margin: var(--space-3) 0 0;
    font-size: var(--text-sm);
    color: var(--ink-2);
  }

  :global([data-tier='learn']) .sequence {
    display: block;
  }

  .empty {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--ink-2);
  }

  .explainer {
    margin: 0;
    font-size: var(--text-md);
    line-height: 1.55;
    color: var(--ink);
  }
</style>
