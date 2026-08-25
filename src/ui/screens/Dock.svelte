<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import LockIcon from '../components/LockIcon.svelte';
  import Toast from '../components/Toast.svelte';
  import { settings } from '../stores/settings.svelte';
  import { rigLock } from '../stores/rigLock.svelte';
  import { dock } from '../dock/store.svelte';
  import ForecastCard from '../dock/ForecastCard.svelte';
  import RegretCard from '../dock/RegretCard.svelte';
  import RigSliders from '../dock/RigSliders.svelte';
  import SuggestButton from '../dock/SuggestButton.svelte';
  import CommitButton from '../dock/CommitButton.svelte';
  import { fmt } from '../format';
  import { candidateSetups, guideBand, guideSource, shortSetup, signed } from '../dock/logic';
  import { track } from '../../lib/telemetry';
  import Panel from '../disagree/Panel.svelte';
  import { ModelOptimumStore } from '../disagree/store.svelte';
  import { getClient } from '../dock/client';
  import { logStoreUi } from '../log/store.svelte';

  const model = new ModelOptimumStore(getClient());
  $effect(() => {
    if (advanced)
      model.request(dock.forecast.likelyKt, dock.forecast.seaState, dock.forecast.crewKg);
  });

  /**
   * Commit locks the rig and files a real, persisted log entry (status
   * 'draft'), so "starts a log entry" survives a reload and the Log screen
   * has something to show (audit ux-02 M-04).
   */
  let committedToast = $state(false);

  function commit(): void {
    track('dock.commit');
    void logStoreUi.startDraft(dock.commit());
    committedToast = true;
  }

  const advanced = $derived(settings.advanced);
  const score = $derived(dock.score);
  /** The guide's band for the likely wind, so the printed card carries the
      published numbers next to the modelled ones (audit ux-02 M-25). */
  const band = $derived(guideBand(dock.forecast.likelyKt));
  const printedOn = new Date().toLocaleDateString();
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
    {#if rigLock.lockedToday}<span class="locked-chip" title="Rig committed for today"
        ><LockIcon /></span
      >{/if}
  {/snippet}
</TopBar>

<div class="screen dock-screen">
  <div class="col-primary stack">
    <RegretCard
      {score}
      busy={dock.busy}
      busyNote={scoringNote}
      progress={dock.progress}
      provisional={dock.provisional}
    />

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

    <!-- The output of a week of study is a sheet for the bulkhead (M-25). -->
    <button type="button" class="quiet" onclick={() => window.print()}>Print tuning card</button>
  </div>
</div>

<Toast bind:open={committedToast} message="Rig committed for today — log entry started." />

<!-- One card, screen-hidden, that is the entire printout: the sheet that goes
     on the bulkhead (audit ux-02 M-25). Outside .dock-screen so the print
     stylesheet can hide the live screen wholesale. -->
<section class="print-card">
  <h1>Sailflow tuning card</h1>
  <p class="print-sub">
    {printedOn} · {rigLock.lockedToday ? 'committed' : 'not committed'} · J/70
  </p>

  <h2>Rig</h2>
  <dl class="print-rows tabular-nums">
    <dt>Uppers</dt>
    <dd>{signed(dock.setup.upperTurns)} turns</dd>
    <dt>Lowers</dt>
    <dd>{signed(dock.setup.lowerTurns)} turns</dd>
    <dt>Forestay</dt>
    <dd>{fmt(dock.setup.forestayMm, 0, 'mm')}</dd>
    <dt>{guideSource}</dt>
    <dd>
      {band.label}: uppers {signed(band.uppersTurns)}, lowers {signed(band.lowersTurns)}
    </dd>
  </dl>

  <h2>Forecast</h2>
  <p class="tabular-nums">
    {fmt(dock.forecast.minKt, 0)}–{fmt(dock.forecast.maxKt, 0)} kt, likely {fmt(
      dock.forecast.likelyKt,
      0,
      'kt',
    )} · sea state {dock.forecast.seaState} · crew {fmt(dock.forecast.crewKg, 0, 'kg')}
  </p>

  {#if score && score.perTws.length > 0}
    <h2>What this setup costs across the band</h2>
    <table class="per-tws tabular-nums">
      <thead>
        <tr>
          <th scope="col">TWS</th>
          <th scope="col">Slower by</th>
          <th scope="col">Best setup here</th>
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
  {/if}
  <p class="print-foot">
    Modelled, not measured. Tiers and provenance: see More → About in the app.
  </p>
</section>

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
  /* Cockpit panels, not flat cards: every card on this screen sits on
     --surface-2, one step off --bg, the same raise the Race panels use
     (ADR 0015). One rule reaches the child components' own cards. */
  .dock-screen :global(.card) {
    background: var(--surface-2);
  }

  /* Screen: nothing. Print: the only thing. */
  .print-card {
    display: none;
  }

  @media print {
    .print-card {
      display: block;
      color: #000;
    }

    .print-card h1 {
      margin: 0;
      font-size: 18pt;
    }

    .print-card h2 {
      margin: 16pt 0 4pt;
      font-size: 11pt;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .print-rows {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 2pt 12pt;
      margin: 0;
    }

    .print-rows dd {
      margin: 0;
    }

    .print-sub,
    .print-foot {
      color: #444;
      font-size: 9pt;
    }

    .print-card .per-tws {
      width: 100%;
      border-collapse: collapse;
    }
  }

  .quiet {
    min-height: var(--hit-min);
    padding: 0 var(--space-3);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: transparent;
    color: var(--ink-2);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .locked-chip {
    display: inline-flex;
    color: var(--ink-2);
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
