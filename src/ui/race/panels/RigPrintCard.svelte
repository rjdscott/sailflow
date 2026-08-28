<script lang="ts">
  import type { DockScore } from '../../../core/types';
  import { fmt } from '../../format';
  import { guideBand, guideLabel, signed } from '../../dock/logic';
  import { dock } from '../../dock/store.svelte';
  import { guideSelection } from '../../disagree/store.svelte';
  import { rigLock } from '../../stores/rigLock.svelte';
  import { conditions } from '../../stores/conditions.svelte';
  import { GUIDE_IDS } from '../../../lib/reference';
  import { gearChart, rowFor } from '../gearChart';

  /**
   * One card, screen-hidden, that is the entire printout: the sheet that goes
   * on the bulkhead (audit ux-02 M-25). Was `Dock.svelte`'s `.print-card`;
   * since ADR 0021 it is the Rig panel's `Print` action, mounted on demand so
   * the gear chart's eleven columns are not in the cockpit's first load.
   *
   * The wind-range gear chart is here and nowhere else on screen: Keane's
   * "sail by the numbers" grid, which research 02 §2.5 calls the single
   * most-used artefact in the sport, and which is only useful on paper taped
   * to a bulkhead. A print stylesheet, not a PDF library: the browser already
   * has a paginating renderer with the app's own fonts in it, and "Save as
   * PDF" is in every print dialog. Every cell is the guide's own wording.
   */
  let { score }: { score: DockScore | null } = $props();

  const printedOn = new Date().toLocaleDateString();

  /** The guide's band for the likely wind, so the printed card carries the
      published numbers next to the modelled ones (audit ux-02 M-25). */
  const band = $derived(guideBand(dock.wind.likelyKt, guideSelection.id ?? undefined));

  const chartGuideId = $derived(guideSelection.id ?? GUIDE_IDS[0]);
  const chart = $derived(chartGuideId ? gearChart(chartGuideId) : null);
  const chartHere = $derived(rowFor(chart, dock.wind.likelyKt));

  /* Mounted only by the Print action, so landing in the DOM *is* the request:
     one effect, no dependencies, one print. Pressing Print again calls
     `window.print()` directly (see `Rig.svelte`). */
  $effect(() => {
    window.print();
  });
</script>

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
    <dt>{guideLabel(guideSelection.id ?? undefined)}</dt>
    <dd>
      {#if !band}
        no tuning guide committed for this boat
      {:else}
        {band.label}: uppers {band.uppersTurns === null
          ? 'not published'
          : signed(band.uppersTurns)}, lowers {band.lowersTurns === null
          ? 'not published'
          : signed(band.lowersTurns)}
      {/if}
    </dd>
  </dl>

  <h2>Forecast</h2>
  <p class="tabular-nums">
    {fmt(dock.wind.minKt, 0)}–{fmt(dock.wind.maxKt, 0)} kt, likely {fmt(
      dock.wind.likelyKt,
      0,
      'kt',
    )}
    · sea state {conditions.seaState} · crew {fmt(conditions.crewKg, 0, 'kg')}
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
  {#if chart}
    <h2>Sail by the numbers — {chart.source.title}</h2>
    <p class="print-sub">
      {chart.base}. The band the forecast lands in is marked ▸. Printed settings, reproduced as
      published — not this app's numbers.
    </p>
    <table class="gear-print tabular-nums">
      <thead>
        <tr>
          <th scope="col">Wind</th>
          {#each chart.columns as col (col.key)}
            <th scope="col">{col.label}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each chart.rows as row, i (row.label)}
          <tr>
            <th scope="row">{i === chartHere ? '▸ ' : ''}{row.label}</th>
            {#each row.cells as cell, c (chart.columns[c].key)}
              <td>{cell}</td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
    <p class="print-sub">
      prov: {chart.source.title}{chart.source.revision ? `, ${chart.source.revision}` : ''} — {chart
        .source.url}
    </p>
  {/if}

  <p class="print-foot">
    Modelled, not measured. Tiers and provenance: see More → About in the app.
  </p>
</section>

<style>
  /* Screen: nothing. Print: the only thing. */
  .print-card {
    display: none;
  }

  @media print {
    .print-card {
      display: block;
      color: #000;
    }

    /* `app.css` replaces a `.screen` with its print card; the cockpit is not
       one of those, and this card is *inside* it — the Rig panel owns it — so
       the rule that clears the screen rides with the card and keeps the one
       branch that holds it. */
    :global(body:has(.print-card) .cockpit > :not(:has(.print-card))),
    :global(body:has(.print-card) .cockpit .panel) {
      display: none !important;
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

    /* Eleven columns on portrait A4: the type has to come down, and every
       cell is short enough (the guide's own wording) that it still reads. */
    .gear-print {
      width: 100%;
      border-collapse: collapse;
      font-size: 7pt;
      line-height: 1.25;
    }

    .gear-print th,
    .gear-print td {
      border: 0.5pt solid #999;
      padding: 2pt 3pt;
      text-align: start;
      vertical-align: top;
    }

    .gear-print thead th {
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* One band per printed row and the chart never split across a page: the
       point of the sheet is reading one row at a glance on the rail. */
    .gear-print tr {
      break-inside: avoid;
    }
  }
</style>
