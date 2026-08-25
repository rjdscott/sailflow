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
  import type { ModelOptimum } from './store.svelte';

  let {
    twsKt,
    seaState,
    crewKg,
    modelOptimum,
    busy = false,
  }: {
    twsKt: number;
    seaState: SeaState;
    crewKg: number;
    modelOptimum: ModelOptimum | null;
    busy?: boolean;
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
    return a <= 0.5 ? 'muted' : a <= 1 ? 'warn' : 'bad';
  }

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

<section class="panel card" aria-busy={busy}>
  <header>
    <h2 class="section-title">Model vs guides</h2>
    {#if calibrated}
      <span class="chip" title="The model was fitted to North's base settings in this band."
        >calibrated here</span
      >
    {/if}
  </header>

  <p class="copy">
    These disagree. The model is calibrated to North at 8&ndash;10 and 12&ndash;16 kt (marked);
    elsewhere the gap is information.
  </p>

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
        <span class="cell tabular-nums" role="cell">
          {modelValue === null ? 'n/a' : fmt(modelValue, 1)}
        </span>
        {#each recs as { id, rec } (id)}
          <span class="cell tabular-nums" role="cell">
            {#if !rec}
              <span class="missing">not loaded</span>
            {:else}
              {@const v = pick(rec)}
              {@const d = delta(modelValue, v)}
              {v === null ? 'n/a' : fmt(v, 1)}
              {#if d !== null}
                <span class="delta {deltaClass(d)}">{signed(d, 1, '')}</span>
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
      <span class="cell tabular-nums" role="cell">
        {modelOptimum ? `${signed(modelOptimum.dock.forestayMm, 0, 'mm')} forestay` : 'n/a'}
      </span>
      {#each recs as { id, rec } (id)}
        <span class="cell" role="cell">
          {#if !rec}
            <span class="missing">not loaded</span>
          {:else}
            {rec.rakeNote ?? 'n/a'}
          {/if}
        </span>
      {/each}
    </div>

    <div class="row" role="row">
      <span class="rowlabel" role="rowheader">Target BSP</span>
      <span class="cell tabular-nums" role="cell">
        {modelOptimum ? fmt(modelOptimum.bsKt.value, 2, 'kt') : 'n/a'}
      </span>
      {#each recs as { id, rec } (id)}
        <span class="cell tabular-nums" role="cell">
          {#if !rec}
            <span class="missing">not loaded</span>
          {:else if rec.targets.bsKt === null}
            n/a
          {:else}
            {fmt(rec.targets.bsKt, 2, 'kt')}
            {@const d = delta(modelOptimum?.bsKt.value ?? null, rec.targets.bsKt)}
            {#if d !== null}<span class="delta {deltaClass(d)}">{signed(d, 2, 'kt')}</span>{/if}
          {/if}
        </span>
      {/each}
    </div>

    <div class="row" role="row">
      <span class="rowlabel" role="rowheader">Target heel</span>
      <span class="cell tabular-nums" role="cell">
        {modelOptimum ? fmt(modelOptimum.heelDeg.value, 0, '°') : 'n/a'}
      </span>
      {#each recs as { id, rec } (id)}
        <span class="cell tabular-nums" role="cell">
          {#if !rec}
            <span class="missing">not loaded</span>
          {:else if rec.targets.heelDeg === null}
            n/a
          {:else}
            {fmt(rec.targets.heelDeg, 0, '°')}
            {@const d = delta(modelOptimum?.heelDeg.value ?? null, rec.targets.heelDeg)}
            {#if d !== null}<span class="delta {deltaClass(d)}">{signed(d, 0, '°')}</span>{/if}
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

  .delta {
    font-size: var(--text-xs);
  }

  .delta.muted,
  .muted {
    color: var(--ink-2);
  }

  .delta.warn,
  .warn {
    color: var(--warn);
  }

  .delta.bad,
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
