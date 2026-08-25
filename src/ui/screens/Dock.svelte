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
  import { candidateSetups, shortSetup, signed } from '../dock/logic';
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
  /** Phone: the bar arms first, so the setup can be read before it is locked. */
  const commitLabel = $derived(`Commit ${shortSetup(dock.setup)} for today`);

  /* Scoring the grid takes ~10 s on a warm desktop and longer on a phone, so
     the wait names its own size. The worker answers a dockScore once and has no
     progress message, so a live fraction would need a protocol change. */
  const scoringNote = $derived(
    `Scoring ${Math.max(1, Math.round(dock.forecast.maxKt) - Math.round(dock.forecast.minKt) + 1)}` +
      ` wind speeds × ${candidateSetups().length} setups…`,
  );

  $effect(() => {
    // Touch every input so a change to any of them re-scores (debounced).
    const { upperTurns, lowerTurns, forestayMm } = dock.setup;
    const { minKt, likelyKt, maxKt, seaState, crewKg } = dock.forecast;
    void [upperTurns, lowerTurns, forestayMm, minKt, likelyKt, maxKt, seaState, crewKg];
    dock.disarm(); // the armed label quotes the setup; change it and the arming is void
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
  <div class="col-primary stack">
    <RegretCard {score} busy={dock.busy} busyNote={scoringNote} />

    {#if dock.error}
      <p class="error" role="alert">{dock.error}</p>
    {/if}

    <SuggestButton
      suggestion={dock.suggestion}
      busy={dock.searching}
      locked={rigLock.lockedToday}
      needsUnlock={dock.needsUnlock}
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
                <th scope="col">Slower by</th>
                <th scope="col">Best setup</th>
              </tr>
            </thead>
            <tbody>
              {#each score.perTws as p, i (i)}
                <tr>
                  <td>{fmt(p.twsKt, 0, 'kt')}</td>
                  <td>{fmt(p.regretSPerMile, 1)} s/mi</td>
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
        stale={model.stale}
        error={model.error}
      />
    {/if}
  </div>

  <div class="col-secondary stack">
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
      <CommitButton setup={dock.setup} oncommit={commit} />
    </div>
  </div>
</div>

{#if !rigLock.lockedToday}
  <div class="commit-bar">
    <button
      type="button"
      class="tabular-nums"
      class:armed={dock.armed}
      onclick={() => (dock.armed ? commit() : dock.arm())}
    >
      {dock.armed ? `Tap again to commit ${shortSetup(dock.setup)}` : commitLabel}
    </button>
    <p class="bar-note">
      {dock.armed
        ? 'Locks the rig for the day — only unlock before leaving the dock (C.9.5).'
        : 'Locks the rig for the day and starts a log entry.'}
    </p>
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
      /* The plate is ~81 px tall now (button + note + hairline), so the tail of
         the page clears it with roughly the same slack it had before. */
      padding-block-end: 104px;
    }

    .commit-slot.hide-sm {
      display: none;
    }

    /* Full-bleed plate, not a floating button: an opaque background and a top
       hairline so the bar never sits on live numbers (audit ux-01 M-03). The
       tab bar below it is sticky, so 56 px of viewport offset clears it. */
    .commit-bar {
      display: block;
      position: fixed;
      left: 0;
      right: 0;
      bottom: calc(56px + env(safe-area-inset-bottom));
      z-index: 5;
      background: var(--bg);
      border-top: 1px solid var(--line);
      padding-block: var(--space-2);
      padding-inline: max(var(--gutter), env(safe-area-inset-left))
        max(var(--gutter), env(safe-area-inset-right));
    }

    .commit-bar button {
      width: 100%;
      min-height: var(--hit-min);
      border: 1px solid var(--accent);
      border-radius: var(--radius);
      background: var(--accent);
      color: var(--on-accent);
      font-size: var(--text-md);
      font-weight: 600;
      cursor: pointer;
    }

    /* Armed reads as a different button, so the second tap is a decision and
       not a repeat of the first. */
    .commit-bar button.armed {
      background: transparent;
      color: var(--accent);
    }

    .bar-note {
      margin: var(--space-1) 0 0;
      font-size: var(--text-xs);
      color: var(--ink-2);
      text-align: center;
    }
  }
</style>
