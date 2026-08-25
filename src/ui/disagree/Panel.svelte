<script lang="ts">
  /**
   * The disagreement panel: model, North and Quantum side by side, with the
   * delta in native units. It never picks a winner — the copy line says the
   * model is calibrated to North in two bands and that the gap elsewhere is
   * information, and every disagreement of a turn or more is logged locally.
   */
  import {
    GUIDE_IDS,
    GUIDE_LABELS,
    guideFor,
    guideRecommendation,
    isCalibratedBand,
    type GuideId,
    type GuideRecommendation,
  } from '../../lib/reference';
  import {
    divergenceSummary,
    listDivergences,
    logDivergence,
    type DivergenceRow,
  } from '../../lib/divergenceLog';
  import { fmt } from '../format';
  import type { SeaState } from '../../core/types';
  import { cellState, NOISE, verdict, type ModelOptimum } from './store.svelte';

  let {
    twsKt,
    seaState,
    crewKg,
    modelOptimum,
    busy = false,
    stale = false,
    error = null,
  }: {
    twsKt: number;
    seaState: SeaState;
    crewKg: number;
    modelOptimum: ModelOptimum | null;
    busy?: boolean;
    /** Numbers are on screen but a newer solve is in flight. */
    stale?: boolean;
    error?: string | null;
  } = $props();

  const recs = $derived(
    GUIDE_IDS.map((id) => {
      const guide = guideFor(id);
      return { id, guide, rec: guide ? guideRecommendation(guide, twsKt) : null };
    }),
  );

  const calibrated = $derived(isCalibratedBand(twsKt));

  let historyOpen = $state(false);
  let historyVersion = $state(0);
  const history: { rows: DivergenceRow[]; summary: ReturnType<typeof divergenceSummary> } =
    $derived.by(() => {
      void historyVersion;
      if (!historyOpen) return { rows: [], summary: {} };
      return { rows: listDivergences().slice(-10).reverse(), summary: divergenceSummary() };
    });

  $effect(() => {
    const m = modelOptimum;
    if (!m) return;
    let logged = false;
    for (const { id, rec } of recs) {
      if (!rec || rec.uppersTurns === null || rec.lowersTurns === null) continue;
      logged =
        logDivergence({
          at: new Date().toISOString(),
          twsKt,
          seaState,
          crewKg,
          model: {
            uppersTurns: m.dock.upperTurns,
            lowersTurns: m.dock.lowerTurns,
            bsKt: m.bsKt.value,
            twaDeg: m.twaDeg,
          },
          guide: id,
          guideTurns: { uppers: rec.uppersTurns, lowers: rec.lowersTurns },
          delta: {
            uppers: m.dock.upperTurns - rec.uppersTurns,
            lowers: m.dock.lowerTurns - rec.lowersTurns,
          },
        }) || logged;
    }
    if (logged) historyVersion += 1;
  });

  function delta(model: number | null, guide: number | null): number | null {
    return model === null || guide === null ? null : model - guide;
  }

  /** Magnitude class in turns: half a turn is noise, a turn is a real gap. */
  function deltaClass(d: number | null): string {
    if (d === null) return '';
    const a = Math.abs(d);
    return a <= NOISE ? 'muted' : a <= 1 ? 'warn' : 'bad';
  }

  /** Every model-vs-guide gap on the table, so the headline can be derived. */
  const deltas = $derived(
    modelOptimum
      ? recs.flatMap(({ rec }) =>
          rec
            ? [
                delta(modelOptimum.dock.upperTurns, rec.uppersTurns),
                delta(modelOptimum.dock.lowerTurns, rec.lowersTurns),
                delta(modelOptimum.bsKt.value, rec.targets.bsKt),
                delta(modelOptimum.heelDeg.value, rec.targets.heelDeg),
              ]
            : [],
        )
      : [],
  );
  const headline = $derived(verdict(modelOptimum !== null, busy, deltas));

  function signed(d: number, decimals: number, unit: string): string {
    return `${d > 0 ? '+' : ''}${fmt(d, decimals, unit)}`;
  }

  function raceNotes(rec: GuideRecommendation): [string, string][] {
    return Object.entries(rec.race).filter((e): e is [string, string] => typeof e[1] === 'string');
  }

  const RACE_LABELS: Record<string, string> = {
    backstay: 'Backstay',
    mainsheet: 'Mainsheet',
    traveller: 'Traveller',
    cunningham: 'Cunningham',
    outhaul: 'Outhaul',
    vang: 'Vang',
    jibLead: 'Jib lead',
    jibSheet: 'Jib sheet',
    inhauler: 'Inhauler',
    jibHalyard: 'Jib halyard',
  };
</script>

{#snippet skeleton()}
  <span class="skel" aria-hidden="true"></span>
  <span class="visually-hidden">solving</span>
{/snippet}

{#snippet noValue(why: string)}
  <span class="missing" title={why}>&mdash;<span class="visually-hidden"> {why}</span> </span>
{/snippet}

{#snippet modelCell(value: number | null, text: string)}
  {@const state = cellState(value, busy)}
  <span class="cell tabular-nums" role="cell">
    {#if state === 'value'}
      {text}
    {:else if state === 'solving'}
      {@render skeleton()}
    {:else}
      {@render noValue('the model has no value here')}
    {/if}
  </span>
{/snippet}

<section class="panel card" class:stale aria-busy={busy}>
  <header>
    <h2 class="section-title">Model vs guides</h2>
    <!-- The chip claims the model is calibrated *here*; it waits for the model. -->
    {#if calibrated && modelOptimum}
      <span class="chip" title="The model was fitted to North's base settings in this band."
        >calibrated here</span
      >
    {/if}
    {#if stale}<span class="updating">updating&hellip;</span>{/if}
  </header>

  {#if error}
    <p class="copy err" role="alert">The model could not be solved: {error}</p>
  {:else if headline === 'comparing'}
    <p class="copy">Comparing the model with the guides&hellip;</p>
  {:else if headline === 'unknown'}
    <p class="copy">Nothing to compare yet for this condition.</p>
  {:else if headline === 'disagree'}
    <p class="copy">
      These disagree. The model is calibrated to North at 8&ndash;10 and 12&ndash;16 kt (marked);
      elsewhere the gap is information.
    </p>
  {:else}
    <p class="copy">
      Model and guides agree within the noise: no gap is larger than {NOISE} in the units shown.
    </p>
  {/if}
  <p class="copy legend">&Delta; = model &minus; guide, in the guide's units.</p>

  <div class="grid" role="table" aria-label="Model versus tuning guides">
    <div class="row head" role="row">
      <span role="columnheader">&nbsp;</span>
      <span role="columnheader">Model</span>
      {#each recs as { id } (id)}
        <span role="columnheader">{GUIDE_LABELS[id]}</span>
      {/each}
    </div>

    {#snippet turnsRow(
      label: string,
      modelValue: number | null,
      pick: (r: GuideRecommendation) => number | null,
    )}
      <div class="row" role="row">
        <span class="rowlabel" role="rowheader">{label}</span>
        {@render modelCell(modelValue, modelValue === null ? '' : fmt(modelValue, 1))}
        {#each recs as { id, rec } (id)}
          <span class="cell tabular-nums" role="cell">
            {#if !rec}
              <span class="missing">not loaded</span>
            {:else}
              {@const v = pick(rec)}
              {@const d = delta(modelValue, v)}
              {#if v === null}{@render noValue('no published value in this guide')}{:else}{fmt(
                  v,
                  1,
                )}{/if}
              {#if d !== null}
                <span class="delta">{signed(d, 1, '')}</span>
              {/if}
            {/if}
          </span>
        {/each}
      </div>
    {/snippet}

    {@render turnsRow(
      'Uppers (turns)',
      modelOptimum?.dock.upperTurns ?? null,
      (r) => r.uppersTurns,
    )}
    {@render turnsRow(
      'Lowers (turns)',
      modelOptimum?.dock.lowerTurns ?? null,
      (r) => r.lowersTurns,
    )}

    <div class="row" role="row">
      <span class="rowlabel" role="rowheader">Rake</span>
      {@render modelCell(
        modelOptimum?.dock.forestayMm ?? null,
        modelOptimum ? `${signed(modelOptimum.dock.forestayMm, 0, 'mm')} forestay` : '',
      )}
      {#each recs as { id, rec } (id)}
        <span class="cell" role="cell">
          {#if !rec}
            <span class="missing">not loaded</span>
          {:else if rec.rakeNote === null || rec.rakeNote === undefined}
            {@render noValue('no published value in this guide')}
          {:else}
            {rec.rakeNote}
          {/if}
        </span>
      {/each}
    </div>

    <div class="row" role="row">
      <span class="rowlabel" role="rowheader">Target BSP</span>
      {@render modelCell(
        modelOptimum?.bsKt.value ?? null,
        modelOptimum ? fmt(modelOptimum.bsKt.value, 2, 'kt') : '',
      )}
      {#each recs as { id, rec } (id)}
        <span class="cell tabular-nums" role="cell">
          {#if !rec}
            <span class="missing">not loaded</span>
          {:else if rec.targets.bsKt === null}
            {@render noValue('no published value in this guide')}
          {:else}
            {fmt(rec.targets.bsKt, 2, 'kt')}
            {@const d = delta(modelOptimum?.bsKt.value ?? null, rec.targets.bsKt)}
            {#if d !== null}<span class="delta">{signed(d, 2, 'kt')}</span>{/if}
          {/if}
        </span>
      {/each}
    </div>

    <div class="row" role="row">
      <span class="rowlabel" role="rowheader">Target heel</span>
      {@render modelCell(
        modelOptimum?.heelDeg.value ?? null,
        modelOptimum ? fmt(modelOptimum.heelDeg.value, 0, '°') : '',
      )}
      {#each recs as { id, rec } (id)}
        <span class="cell tabular-nums" role="cell">
          {#if !rec}
            <span class="missing">not loaded</span>
          {:else if rec.targets.heelDeg === null}
            {@render noValue('no published value in this guide')}
          {:else}
            {fmt(rec.targets.heelDeg, 0, '°')}
            {@const d = delta(modelOptimum?.heelDeg.value ?? null, rec.targets.heelDeg)}
            {#if d !== null}<span class="delta">{signed(d, 0, '°')}</span>{/if}
          {/if}
        </span>
      {/each}
    </div>
  </div>

  {#each recs as { id, guide, rec } (id)}
    {#if rec && guide}
      <details class="notes">
        <summary>{GUIDE_LABELS[id]} race notes &mdash; {rec.band.label}</summary>
        <dl>
          {#each raceNotes(rec) as [key, value] (key)}
            <dt>{RACE_LABELS[key] ?? key}</dt>
            <dd>{value}</dd>
          {/each}
        </dl>
      </details>
    {:else}
      <p class="missing">
        {GUIDE_LABELS[id]}: reference tables not loaded &mdash;
        <code>data/tuning/{id}-j70.json</code>
      </p>
    {/if}
  {/each}

  <details class="notes" bind:open={historyOpen}>
    <summary>Divergence history</summary>
    {#if history.rows.length === 0}
      <p class="muted">Nothing logged yet.</p>
    {:else}
      <ul class="summary">
        {#each Object.entries(history.summary) as [id, s] (id)}
          {#if s}
            <li>
              {GUIDE_LABELS[id as GuideId]}: {s.count} logged, mean
              {signed(s.meanUppers, 1, '')} uppers / {signed(s.meanLowers, 1, '')} lowers
            </li>
          {/if}
        {/each}
      </ul>
      <ul class="rows tabular-nums">
        {#each history.rows as row (row.at + row.guide)}
          <li>
            {row.at.slice(0, 16).replace('T', ' ')} &middot; {fmt(row.twsKt, 0, 'kt')} &middot;
            {GUIDE_LABELS[row.guide]} &middot;
            <span class={deltaClass(row.delta.uppers)}>{signed(row.delta.uppers, 1, '')}</span> /
            <span class={deltaClass(row.delta.lowers)}>{signed(row.delta.lowers, 1, '')}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </details>
</section>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .section-title {
    margin: 0;
  }

  .chip {
    font-size: var(--text-xs);
    font-weight: 600;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius);
    background: var(--accent);
    color: var(--on-accent);
  }

  .copy {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--ink-2);
  }

  .copy.err {
    color: var(--bad);
  }

  .updating {
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  /* Numbers on screen belong to the previous condition until the new solve
     lands, so they read as receding rather than current. */
  .panel.stale .grid {
    opacity: 0.6;
  }

  /* A bar, not a spinner: "still solving" without pretending to be a number. */
  .skel {
    display: inline-block;
    width: 3.5ch;
    height: 0.7em;
    border-radius: 2px;
    background: var(--muted);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .legend {
    font-size: var(--text-xs);
  }

  .grid {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--line, color-mix(in srgb, var(--ink-2) 25%, transparent));
    border-radius: var(--radius);
    overflow: hidden;
  }

  .row {
    display: grid;
    grid-template-columns: 1.2fr 1fr 1fr 1fr;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    align-items: baseline;
  }

  .row + .row {
    border-top: 1px solid var(--line, color-mix(in srgb, var(--ink-2) 25%, transparent));
  }

  .head {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--ink-2);
  }

  .rowlabel {
    font-size: var(--text-sm);
    color: var(--ink-2);
  }

  .cell {
    font-size: var(--text-md);
    color: var(--ink);
    display: flex;
    flex-direction: column;
  }

  /* Neutral: the panel never picks a winner, so a delta must not be painted as
     approval or alarm (audit ux-01 M-06). The divergence history below keeps
     the magnitude ramp, where ranking the gaps is the point of the list. */
  .delta {
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .muted {
    color: var(--ink-2);
  }

  .warn {
    color: var(--warn);
  }

  .bad {
    color: var(--bad);
  }

  .missing {
    font-size: var(--text-sm);
    color: var(--ink-2);
  }

  .notes {
    border: 1px solid var(--line, color-mix(in srgb, var(--ink-2) 25%, transparent));
    border-radius: var(--radius);
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-sm);
    color: var(--ink);
  }

  summary {
    color: var(--ink-2);
  }

  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-1) var(--space-3);
    margin: 0 0 var(--space-2);
  }

  dt {
    color: var(--ink-2);
  }

  dd {
    margin: 0;
  }

  ul {
    margin: 0 0 var(--space-2);
    padding-left: var(--space-4);
  }

  li {
    line-height: 1.6;
  }

  code {
    font-size: var(--text-xs);
  }
</style>
