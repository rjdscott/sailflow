<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import { settings } from '../stores/settings.svelte';
  import { rigLock } from '../stores/rigLock.svelte';
  import { dock } from '../dock/store.svelte';
  import ForecastCard from '../dock/ForecastCard.svelte';
  import RegretCard from '../dock/RegretCard.svelte';
  import RigSliders from '../dock/RigSliders.svelte';
  import SuggestButton from '../dock/SuggestButton.svelte';
  import CommitButton from '../dock/CommitButton.svelte';
  import { fmt } from '../format';
  import { signed } from '../dock/logic';

  const advanced = $derived(settings.mode === 'advanced');
  const score = $derived(dock.score);

  $effect(() => {
    // Touch every input so a change to any of them re-scores (debounced).
    const { upperTurns, lowerTurns, forestayMm } = dock.setup;
    const { minKt, likelyKt, maxKt, seaState, crewKg } = dock.forecast;
    void [upperTurns, lowerTurns, forestayMm, minKt, likelyKt, maxKt, seaState, crewKg];
    dock.rescore();
  });
</script>

<TopBar title="Dock">
  {#snippet lock()}
    {#if rigLock.lockedToday}<span class="locked-chip" title="Rig committed for today">🔒</span
      >{/if}
  {/snippet}
</TopBar>

<ForecastCard forecast={dock.forecast} />

<RegretCard {score} busy={dock.busy} />

{#if dock.error}
  <p class="error" role="alert">{dock.error}</p>
{/if}

<SuggestButton
  suggestion={dock.suggestion}
  busy={dock.busy}
  onsuggest={() => void dock.suggest()}
  onapply={(s) => dock.apply(s)}
/>

{#if advanced}
  <section class="sliders">
    <h2>Rig</h2>
    <RigSliders
      setup={dock.setup}
      {score}
      likelyKt={dock.forecast.likelyKt}
      locked={rigLock.lockedToday}
    />
  </section>

  {#if score && score.perTws.length > 0}
    <section>
      <h2>Regret by wind speed</h2>
      <table class="per-tws tabular-nums">
        <thead>
          <tr><th scope="col">TWS</th><th scope="col">Regret</th><th scope="col">Optimum</th></tr>
        </thead>
        <tbody>
          {#each score.perTws as p, i (i)}
            <tr>
              <td>{fmt(p.twsKt, 0, 'kt')}</td>
              <td>−{fmt(p.regretSPerMile, 1)} s/mi</td>
              <td>
                {signed(p.optimum.upperTurns)} / {signed(p.optimum.lowerTurns)} / {fmt(
                  p.optimum.forestayMm,
                  0,
                  'mm',
                )}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
      <p class="hint">Optimum column: uppers / lowers / forestay.</p>
    </section>
  {/if}
{:else}
  <details class="adjust">
    <summary>Adjust</summary>
    <RigSliders
      setup={dock.setup}
      {score}
      likelyKt={dock.forecast.likelyKt}
      locked={rigLock.lockedToday}
      showOptimum={false}
    />
  </details>
{/if}

<section class="commit">
  <CommitButton oncommit={() => dock.commit()} />
</section>

<style>
  h2 {
    margin: 0 0 var(--space-2);
    font-size: var(--text-sm);
    color: var(--ink-2);
    font-weight: 600;
  }

  section {
    margin-block-end: var(--space-4);
  }

  .locked-chip {
    font-size: var(--text-md);
  }

  .adjust {
    margin-block-end: var(--space-4);
  }

  .adjust summary {
    min-height: var(--hit-min);
    display: flex;
    align-items: center;
    font-size: var(--text-sm);
    color: var(--accent);
    cursor: pointer;
  }

  .per-tws {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }

  .per-tws th,
  .per-tws td {
    text-align: start;
    padding: var(--space-1) var(--space-2);
    border-bottom: 1px solid var(--surface);
  }

  .per-tws th {
    color: var(--ink-2);
    font-weight: 600;
  }

  .hint {
    margin: var(--space-2) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .error {
    margin: 0 0 var(--space-4);
    font-size: var(--text-sm);
    color: var(--bad);
  }

  .commit {
    margin-block-end: var(--space-8);
  }
</style>
