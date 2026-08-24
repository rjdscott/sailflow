<script lang="ts">
  import '../_layout-fallback.css';
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
  import Panel from '../disagree/Panel.svelte';
  import { ModelOptimumStore } from '../disagree/store.svelte';
  import { getClient } from '../dock/client';
  import { logStoreUi } from '../log/store.svelte';

  const model = new ModelOptimumStore(getClient());
  $effect(() => {
    if (advanced)
      model.request(dock.forecast.likelyKt, dock.forecast.seaState, dock.forecast.crewKg);
  });

  function commit(): void {
    const lock = dock.commit();
    logStoreUi.setDraft({
      date: lock.committedAt.slice(0, 10),
      forecast: {
        minKt: lock.forecast.minKt,
        likelyKt: lock.forecast.likelyKt,
        maxKt: lock.forecast.maxKt,
      },
      seaState: lock.forecast.seaState,
      crewKg: lock.forecast.crewKg,
      dock: lock.setup,
    });
  }

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

<div class="screen dock-screen">
  <div class="col-primary">
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

    {#if advanced && score && score.perTws.length > 0}
      <section class="card">
        <h2 class="section-title">Regret by wind speed</h2>
        <div class="table-wrap">
          <table class="per-tws tabular-nums">
            <thead>
              <tr>
                <th scope="col">TWS</th>
                <th scope="col">Regret</th>
                <th scope="col">Best setup</th>
              </tr>
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
        </div>
        <p class="hint">Best setup: uppers / lowers / forestay, re-tuned for that wind alone.</p>
      </section>
    {/if}

    {#if advanced}
      <Panel
        twsKt={dock.forecast.likelyKt}
        seaState={dock.forecast.seaState}
        crewKg={dock.forecast.crewKg}
        modelOptimum={model.optimum}
        busy={model.busy}
      />
    {/if}
  </div>

  <div class="col-secondary">
    <ForecastCard forecast={dock.forecast} />

    <section class="card">
      <h2 class="section-title">Rig</h2>
      <RigSliders
        setup={dock.setup}
        {score}
        likelyKt={dock.forecast.likelyKt}
        locked={rigLock.lockedToday}
        showOptimum={advanced}
      />
    </section>

    <div class="commit-slot" class:hide-sm={!rigLock.lockedToday}>
      <CommitButton oncommit={commit} />
    </div>
  </div>
</div>

{#if !rigLock.lockedToday}
  <div class="commit-bar">
    <button type="button" onclick={commit}>Commit for today</button>
  </div>
{/if}

<style>
  .locked-chip {
    font-size: var(--text-md);
  }

  .table-wrap {
    overflow-x: auto;
  }

  .per-tws {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }

  .per-tws th,
  .per-tws td {
    text-align: start;
    padding: var(--space-1) var(--space-2) var(--space-1) 0;
    border-bottom: 1px solid var(--line, color-mix(in srgb, var(--ink-2) 25%, transparent));
    white-space: nowrap;
  }

  .per-tws th {
    color: var(--ink-2);
    font-weight: 600;
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .hint {
    margin: var(--space-2) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .error {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--bad);
  }

  /* Commit is a sticky footer action on sm (the tab bar is 56 px tall), an
     inline card in the secondary column from 720 px up. */
  .commit-bar {
    display: none;
  }

  @media (max-width: 719px) {
    .dock-screen {
      padding-block-end: 72px;
    }

    .commit-slot.hide-sm {
      display: none;
    }

    .commit-bar {
      display: block;
      position: fixed;
      left: max(var(--space-4), env(safe-area-inset-left));
      right: max(var(--space-4), env(safe-area-inset-right));
      bottom: calc(56px + var(--space-2) + env(safe-area-inset-bottom));
      z-index: 5;
    }

    .commit-bar button {
      width: 100%;
      min-height: var(--hit-min);
      border: none;
      border-radius: var(--radius);
      background: var(--accent);
      color: var(--on-accent);
      font-size: var(--text-md);
      font-weight: 600;
      cursor: pointer;
    }
  }
</style>
