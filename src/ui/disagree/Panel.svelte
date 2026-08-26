<script lang="ts">
  /**
   * The disagreement panel: the model first, then every tuning guide committed
   * for this boat, with the delta in native units. The guides come from
   * `data/tuning/` (`guidesFor`), so adding one is a file — see
   * `data/tuning/README.md`. It never picks a winner: the copy line says the
   * model is calibrated to North in two bands and that the gap elsewhere is
   * information, and every disagreement of a turn or more is logged locally.
   */
  import { activeBoat } from '../../lib/boat';
  import {
    GUIDE_LABELS,
    guidesFor,
    isCalibratedBand,
    type GuideId,
    type GuideRecommendation,
  } from '../../lib/reference';
  import { guideColumns, needsSelector } from './guides';
  import Segmented from '../components/Segmented.svelte';
  import {
    divergenceSummary,
    listDivergences,
    logDivergence,
    type DivergenceRow,
  } from '../../lib/divergenceLog';
  import { fmt } from '../format';
  import InstrumentCell from '../components/InstrumentCell.svelte';
  import type { SeaState, Tier } from '../../core/types';
  import { cellState, guideSelection, NOISE, verdict, type ModelOptimum } from './store.svelte';

  let {
    twsKt,
    seaState,
    crewKg,
    modelOptimum,
    busy = false,
    stale = false,
    error = null,
    compact = false,
    boatId = activeBoat.id,
  }: {
    twsKt: number;
    seaState: SeaState;
    crewKg: number;
    modelOptimum: ModelOptimum | null;
    busy?: boolean;
    /** Which boat's guides to compare against (`data/tuning/*-<boatId>.json`). */
    boatId?: string;
    /** Numbers are on screen but a newer solve is in flight. */
    stale?: boolean;
    error?: string | null;
    /**
     * The summary alone: the verdict sentence and the uppers row, Model /
     * North / Quantum with the delta. For the cockpit's bottom band, where
     * the full table has nowhere to go and was silently clipped (ux-03 H-03).
     */
    compact?: boolean;
  } = $props();

  const entries = $derived(guidesFor(boatId));
  /** Every guide, for the divergence log: hiding a column must not stop logging it. */
  const allRecs = $derived(guideColumns(entries, twsKt));
  const recs = $derived(guideColumns(entries, twsKt, guideSelection.id));
  const selectorOptions = $derived([
    { value: '', label: 'All' },
    ...entries.map((e) => ({ value: e.id, label: e.label })),
  ]);
  let selected = $state(guideSelection.id ?? '');

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
    for (const { id, rec } of allRecs) {
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

  /**
   * The strip's one line. It says which of the four states this is and nothing
   * else; the sentence it stands in for, and the numbers behind it, are in the
   * sheet the "Full table" button opens (audit ux-03 H-03).
   */
  const COMPACT_VERDICT: Record<ReturnType<typeof verdict>, string> = {
    comparing: 'Comparing…',
    unknown: 'Nothing to compare yet.',
    disagree: 'These disagree.',
    agree: 'Agree within the noise.',
  };

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

{#snippet modelCell(id: string, value: number | null, text: string, unit = '', tier?: Tier)}
  {@const state = cellState(value, busy)}
  <span class="cell" role="cell">
    {#if state === 'value'}
      <InstrumentCell label="Model" {id} size="sm" value={text} {unit} {tier} />
    {:else}
      <span class="section-title">Model</span>
      {#if state === 'solving'}
        {@render skeleton()}
      {:else}
        {@render noValue('the model has no value here')}
      {/if}
    {/if}
  </span>
{/snippet}

<!-- One guide's take on one row. The number wears the same cell contract as
     the model's beside it (ADR 0015) and the delta rides underneath in plain
     ink: the panel never picks a winner (audit ux-01 M-06). -->
{#snippet guideCell(
  label: string,
  id: string,
  loaded: boolean,
  text: string | null,
  d: string | null,
  unit = '',
)}
  <span class="cell" role="cell">
    {#if !loaded}
      <span class="section-title">{label}</span>
      <span class="missing">not loaded</span>
    {:else if text === null}
      <span class="section-title">{label}</span>
      {@render noValue('no published value in this guide')}
    {:else}
      <InstrumentCell {label} {id} size="sm" value={text} {unit} />
      {#if d}<span class="delta tabular-nums">&Delta; {d}</span>{/if}
    {/if}
  </span>
{/snippet}

<section class="panel card" class:stale class:compact aria-busy={busy}>
  <header>
    <h2 class="section-title">Model vs guides</h2>
    <!-- The chip claims the model is calibrated *here*; it waits for the model. -->
    {#if calibrated && modelOptimum}
      <span class="chip" title="The model was fitted to North's base settings in this band."
        >calibrated here</span
      >
    {/if}
    {#if stale}<span class="updating">updating&hellip;</span>{/if}
    <!-- Only once the columns stop fitting: two guides plus the model is the
         layout this grid was designed for. -->
    {#if !compact && needsSelector(entries)}
      <Segmented
        options={selectorOptions}
        bind:value={selected}
        ariaLabel="Which guide to compare with"
        onchange={(v) => (guideSelection.id = v === '' ? null : v)}
      />
    {/if}
  </header>

  {#if error}
    <p class="copy err" role="alert">The model could not be solved: {error}</p>
  {:else if entries.length === 0}
    <p class="copy verdict">
      No tuning guide is committed for this boat &mdash; nothing matches
      <code>data/tuning/*-{boatId}.json</code>. The model's own numbers stand alone.
    </p>
  {:else if compact}
    <p class="copy verdict">{COMPACT_VERDICT[headline]}</p>
  {:else if headline === 'comparing'}
    <p class="copy verdict">Comparing the model with the guides&hellip;</p>
  {:else if headline === 'unknown'}
    <p class="copy verdict">Nothing to compare yet for this condition.</p>
  {:else if headline === 'disagree'}
    <p class="copy verdict">
      These disagree. The model is calibrated to North at 8&ndash;10 and 12&ndash;16 kt (marked);
      elsewhere the gap is information.
    </p>
  {:else}
    <p class="copy verdict">
      Model and guides agree within the noise: no gap is larger than {NOISE} in the units shown.
    </p>
  {/if}
  {#if !compact}
    <p class="copy legend">&Delta; = model &minus; guide, in the guide's units.</p>
  {/if}

  <!-- No column-header row: every cell carries its own source name, which is
       what the instrument-cell contract already asks for and what lets four
       columns wrap to two on a phone. -->
  <div class="grid" role="table" aria-label="Model versus tuning guides">
    {#snippet numberRow(
      rowId: string,
      label: string,
      modelValue: number | null,
      pick: (r: GuideRecommendation) => number | null,
      decimals: number,
      unit: string,
      tier?: Tier,
    )}
      <div class="row" role="row">
        <span class="rowlabel" role="rowheader">{label}</span>
        {@render modelCell(
          rowId,
          modelValue,
          modelValue === null ? '' : fmt(modelValue, decimals),
          unit,
          tier,
        )}
        {#each recs as { id, label, rec } (id)}
          {@const v = rec ? pick(rec) : null}
          {@const d = rec ? delta(modelValue, v) : null}
          {@render guideCell(
            label,
            `${rowId}-${id}`,
            !!rec,
            v === null ? null : fmt(v, decimals),
            d === null ? null : signed(d, decimals, ''),
            unit,
          )}
        {/each}
      </div>
    {/snippet}

    {@render numberRow(
      'uppers',
      'Uppers',
      modelOptimum?.dock.upperTurns ?? null,
      (r) => r.uppersTurns,
      1,
      'turns',
    )}
    {#if !compact}
      {@render numberRow(
        'lowers',
        'Lowers',
        modelOptimum?.dock.lowerTurns ?? null,
        (r) => r.lowersTurns,
        1,
        'turns',
      )}

      <!-- Rake is prose in every guide, so only the model's half is a number. -->
      <div class="row" role="row">
        <span class="rowlabel" role="rowheader">Rake</span>
        {@render modelCell(
          'rake',
          modelOptimum?.dock.forestayMm ?? null,
          modelOptimum ? signed(modelOptimum.dock.forestayMm, 0, '') : '',
          'mm forestay',
        )}
        {#each recs as { id, label, rec } (id)}
          <span class="cell" role="cell">
            <span class="section-title">{label}</span>
            {#if !rec}
              <span class="missing">not loaded</span>
            {:else if rec.rakeNote === null || rec.rakeNote === undefined}
              {@render noValue('no published value in this guide')}
            {:else}
              <span class="prose">{rec.rakeNote}</span>
            {/if}
          </span>
        {/each}
      </div>

      {@render numberRow(
        'bsp',
        'Target BSP',
        modelOptimum?.bsKt.value ?? null,
        (r) => r.targets.bsKt,
        2,
        'kt',
        modelOptimum?.bsKt.tier,
      )}
      {@render numberRow(
        'heel',
        'Target heel',
        modelOptimum?.heelDeg.value ?? null,
        (r) => r.targets.heelDeg,
        0,
        '°',
        modelOptimum?.heelDeg.tier,
      )}
    {/if}
  </div>

  {#if !compact}
    {#each recs as { id, label, guide, rec } (id)}
      {#if rec && guide}
        <details class="notes">
          <summary>{label} race notes &mdash; {rec.band.label}</summary>
          <dl>
            {#each raceNotes(rec) as [key, value] (key)}
              <dt>{RACE_LABELS[key] ?? key}</dt>
              <dd>{value}</dd>
            {/each}
          </dl>
        </details>
      {:else}
        <p class="missing">
          {label}: reference tables not loaded &mdash;
          <code>data/tuning/{id}-{boatId}.json</code>
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
                {GUIDE_LABELS[id as GuideId] ?? id}: {s.count} logged, mean
                {signed(s.meanUppers, 1, '')} uppers / {signed(s.meanLowers, 1, '')} lowers
              </li>
            {/if}
          {/each}
        </ul>
        <ul class="rows tabular-nums">
          {#each history.rows as row (row.at + row.guide)}
            <li>
              {row.at.slice(0, 16).replace('T', ' ')} &middot; {fmt(row.twsKt, 0, 'kt')} &middot;
              {GUIDE_LABELS[row.guide] ?? row.guide} &middot;
              <span class={deltaClass(row.delta.uppers)}>{signed(row.delta.uppers, 1, '')}</span> /
              <span class={deltaClass(row.delta.lowers)}>{signed(row.delta.lowers, 1, '')}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </details>
  {/if}
</section>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  /* Compact: a strip, not a card. The verdict and one row of Model / North /
     Quantum + delta on one line, which is what the cockpit's bottom band has
     room for (audit ux-03 H-03). */
  .panel.compact {
    gap: var(--space-1);
    padding: 0;
    background: none;
    border: none;
    overflow: hidden;
  }

  /* The heading stays for assistive tech — the strip's two lines are spent on
     the sentence and the numbers. The "calibrated here" chip goes with it; it
     is on the full comparison, one click away. */
  .panel.compact header {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .panel.compact .copy.verdict {
    font-size: var(--text-sm);
    font-weight: 400;
  }

  .panel.compact .grid {
    border: none;
    border-radius: 0;
  }

  /* Wraps: the cockpit's bottom-right cell is ~330 px wide, and three cells
     with their units and deltas do not fit on one line beside the row label. */
  .panel.compact .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1) var(--space-3);
    padding: 0;
  }

  .panel.compact .row > .cell {
    flex: 0 1 auto;
    min-width: 0;
  }

  .panel.compact .rowlabel {
    flex: none;
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

  /* The same weight as the instrument bar's verdict line, for the same reason:
     state before data (research §3 principle 14), and the learn tier reads it
     first because it is the only sentence on the panel. */
  .verdict {
    font-size: var(--text-md);
    color: var(--ink);
  }

  :global([data-tier='learn']) .verdict {
    font-size: var(--text-lg);
    font-weight: 600;
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
    border: 1px solid var(--line);
    border-radius: var(--radius);
    overflow: hidden;
  }

  /* The row label owns its own line, then the three readings share the width:
     three instrument cells at 96 px is the same minimum the cockpit's bar
     uses, so this wraps to one column on a phone instead of crushing. */
  .row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
    gap: var(--space-2) var(--space-3);
    padding: var(--space-3);
    align-items: start;
  }

  .row + .row {
    border-top: 1px solid var(--line);
  }

  .rowlabel {
    grid-column: 1 / -1;
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-2);
  }

  .cell {
    font-size: var(--text-md);
    color: var(--ink);
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .prose {
    font-size: var(--text-sm);
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
