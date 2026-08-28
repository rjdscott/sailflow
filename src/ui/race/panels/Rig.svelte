<script lang="ts">
  import type { SolveResult } from '../../../core/types';
  import ConfidenceBadge from '../../components/ConfidenceBadge.svelte';
  import InstrumentCell from '../../components/InstrumentCell.svelte';
  import LockIcon from '../../components/LockIcon.svelte';
  import Panel from '../../components/Panel.svelte';
  import Segmented from '../../components/Segmented.svelte';
  import Sheet from '../../components/Sheet.svelte';
  import Toast from '../../components/Toast.svelte';
  import { fmt, snap } from '../../format';
  import { panelControlsId, panelSection } from '../../keys';
  import { router } from '../../router.svelte';
  import { GUIDE_IDS, GUIDE_LABELS, type GuideId } from '../../../lib/reference';
  import { conditions } from '../../stores/conditions.svelte';
  import { rigLock } from '../../stores/rigLock.svelte';
  import { dock } from '../../dock/store.svelte';
  import { defaultGuideId, guideBand, guideLabel, signed, specs } from '../../dock/logic';
  import { guideSelection } from '../../disagree/store.svelte';
  import CommitButton from '../../dock/CommitButton.svelte';
  import ForecastCard from '../../dock/ForecastCard.svelte';
  import RegretCard from '../../dock/RegretCard.svelte';
  import SuggestButton from '../../dock/SuggestButton.svelte';
  import { logStoreUi } from '../../log/store.svelte';
  import { track } from '../../../lib/telemetry';
  import { gearChart, rowFor } from '../gearChart';
  import RigElevation from '../RigElevation.svelte';
  import ControlRow from './ControlRow.svelte';

  /**
   * The rig: the fourth sail system (ADR 0015), and since ADR 0021 the whole
   * of what the Dock screen used to be — the wind band the tune is bet on, what
   * betting once costs, the three turns, and the commit that freezes them.
   *
   * Class rule C.9.5(a) freezes the standing rigging once the boat leaves the
   * dock. That used to be carried by there being two screens; here it is
   * carried by the commit toggle and its copy, which is why the greyed state
   * and the sentence next to it matter (ADR 0021 §Consequences).
   */
  let { result }: { result: SolveResult | null } = $props();

  /**
   * The sliders bind straight into the rig store, and `Race.svelte` feeds it
   * to the solver: turn a shroud here and the headstay sag, the jib entry and
   * the boat speed all move on the same screen. That is the whole point of the
   * merge, so there is exactly one copy of these three numbers.
   */
  const setupValues = dock.setup as unknown as Record<string, number>;
  const DOCK_IDS = ['upperTurns', 'lowerTurns', 'forestayMm'];

  const locked = $derived(rigLock.lockedToday);
  const score = $derived(dock.score);

  // --- the guide's published band, as a tick on each shroud track -----------
  // The guide is whichever one the disagreement panel is showing, so the two
  // never quote different sources at the same time.
  const guideId = $derived(guideSelection.id ?? defaultGuideId());
  const band = $derived(guideBand(dock.wind.likelyKt, guideId));

  function tick(
    turns: number | null | undefined,
    spec: (typeof specs)['upperTurns'],
  ): number | undefined {
    return turns === null || turns === undefined
      ? undefined
      : snap(turns, spec.min, spec.max, spec.step);
  }

  /**
   * "North: +4.0 in 12-16 kt" — and the honest alternatives when the guide has
   * no number for this control, or when the boat has no guide at all.
   */
  function hintFor(turns: number | null | undefined): string {
    if (!band) return 'No tuning guide is committed for this boat.';
    if (turns === null || turns === undefined)
      return `${guideLabel(guideId)} publishes no value for ${band.label}.`;
    return `${guideLabel(guideId)}: ${signed(turns)} in ${band.label}`;
  }

  const TICKS = $derived<Record<string, number | undefined>>({
    upperTurns: tick(band?.uppersTurns, specs.upperTurns),
    lowerTurns: tick(band?.lowersTurns, specs.lowerTurns),
    forestayMm: undefined,
  });

  const HINTS = $derived<Record<string, string>>({
    upperTurns: hintFor(band?.uppersTurns),
    lowerTurns: hintFor(band?.lowersTurns),
    forestayMm: 'No published band for the forestay: the guides give rake in words.',
  });

  // --- the gear chart, one tap away ----------------------------------------
  let source: GuideId = $state('north');
  const chart = $derived(gearChart(source));
  const here = $derived(rowFor(chart, conditions.twsKt));

  let explaining: string | null = $state(null);
  let sheetOpen = $state(false);
  let chartOpen = $state(false);
  let windOpen = $state(false);
  let regretOpen = $state(false);
  let committedToast = $state(false);
  /** The print card is mounted on demand and prints itself when it lands. */
  let printMounted = $state(false);

  function explain(id: string): void {
    explaining = id;
    sheetOpen = true;
  }

  /**
   * Commit locks the rig and files a real, persisted log entry (status
   * 'draft'), so "starts a log entry" survives a reload and the Log screen
   * has something to show (audit ux-02 M-04).
   */
  function commit(): void {
    track('dock.commit');
    void logStoreUi.startDraft(dock.commit());
    committedToast = true;
  }

  /** The band's wind becomes the wind on screen (was `ConditionsStrip`'s
   *  committed chip): the one tap between "what I tuned for" and "sail it". */
  function sailLikely(): void {
    conditions.twsKt = Math.round(dock.wind.likelyKt);
  }

  const offBand = $derived(Math.round(conditions.twsKt) !== Math.round(dock.wind.likelyKt));

  function print(): void {
    if (printMounted) window.print();
    else printMounted = true; // the card prints itself once it is in the DOM
  }

  /* An old `#/dock?f=…` link lands on the Simulator with the forecast applied
     (ADR 0021's migration table); everything it was pointing at is this panel,
     so the panel comes to it. Runs once — `landedFrom` is fixed at entry. */
  $effect(() => {
    if (router.landedFrom !== 'dock') return;
    panelSection('rig')?.scrollIntoView({ block: 'start' });
  });

  /* Scoring the grid is ~36 setups × the band's wind speeds on the one shared
     worker, so it waits for the cockpit's first answer rather than racing it
     for the thread on load. After that any change to the band or the turns
     re-scores, debounced. */
  const ready = $derived(result !== null);

  $effect(() => {
    // Touch every input so a change to any of them re-scores.
    const { upperTurns, lowerTurns, forestayMm } = dock.setup;
    const { minKt, likelyKt, maxKt } = dock.wind;
    const { seaState, crewKg } = conditions;
    void [upperTurns, lowerTurns, forestayMm, minKt, likelyKt, maxKt, seaState, crewKg];
    if (!ready) return;
    dock.rescore();
  });

  /* Scoring takes ~10 s on a warm desktop and longer on a phone, so the wait
     names its own size. The worker answers a dockScore once and has no
     progress message, so a live fraction would need a protocol change. */
  const scoringNote = $derived(
    `Scoring ${Math.max(1, Math.round(dock.wind.maxKt) - Math.round(dock.wind.minKt) + 1)}` +
      ' wind speeds × every setup on the grid…',
  );
</script>

<Panel
  title="Rig"
  id="rig-title"
  cue="Set it for the day's breeze — uppers hold the headstay, lowers set the prebend. Committed once, sailed all day."
>
  {#snippet controls()}
    <div class="rig" id={panelControlsId('rig')}>
      <!-- What the tune is bet on. The band, not the number: a rig is committed
           once and sailed through the whole day's breeze. -->
      <p class="forecast">
        <span class="what">Forecast</span>
        <span class="tabular-nums">{fmt(dock.wind.minKt, 0)} – {fmt(dock.wind.maxKt, 0)} kt</span>
        <span class="likely tabular-nums">· likely {fmt(dock.wind.likelyKt, 0)}</span>
        <button type="button" class="link" onclick={() => (windOpen = true)}>edit</button>
        {#if offBand}
          <button
            type="button"
            class="link"
            onclick={sailLikely}
            title="Put the likely wind on the instrument band"
          >
            Sail the likely wind
          </button>
        {/if}
      </p>

      <!-- What committing to one setup costs across that band, which is the
           number the whole Dock existed to produce. -->
      <div class="regret-row" aria-busy={dock.busy}>
        <InstrumentCell
          label="EXPECTED REGRET"
          id="expectedRegret"
          size="sm"
          unit="s/mi"
          value={score ? fmt(score.expectedRegretSPerMile.value, 1) : dock.busy ? '…' : '—'}
          tier={score ? (dock.provisional ? 'B' : score.expectedRegretSPerMile.tier) : undefined}
        />
        <button type="button" class="link" onclick={() => (regretOpen = true)}>by wind ▸</button>
      </div>

      {#each DOCK_IDS as id (id)}
        <ControlRow
          {id}
          values={setupValues}
          {locked}
          tick={TICKS[id]}
          hint={HINTS[id]}
          onexplain={explain}
        />
      {/each}

      {#if dock.error}
        <p class="error" role="alert">{dock.error}</p>
      {/if}

      <!-- Everything that rewrites or freezes the three above, behind the same
           `Setup` disclosure the other panels use, and closed by default like
           theirs: the day's tune is set once, the sliders are the live thing,
           and open it holds the cockpit past ADR 0016's one short scroll
           (race.spec measures that at 1920x1080; this is now the tallest
           panel). `open` is deliberately not bound to the tier — a reactive
           `open` on <details> is re-applied on the next render and snaps the
           disclosure shut under the reader's hand. -->
      <details>
        <summary>Setup</summary>
        <div class="setup">
          <SuggestButton
            suggestion={dock.suggestion}
            busy={dock.searching}
            {locked}
            needsUnlock={dock.needsUnlock}
            canUndo={dock.previous !== null}
            onsuggest={() => void dock.suggest()}
            onapply={(s) => dock.apply(s)}
            onundo={() => dock.undo()}
          />
          <CommitButton oncommit={commit} />
          <div class="row">
            <!-- The output of a week of study is a sheet for the bulkhead
                 (audit ux-02 M-25). -->
            <button type="button" class="quiet" onclick={print}>Print tuning card</button>
            {#if chart}
              <button type="button" class="quiet" onclick={() => (chartOpen = true)}>
                Gear chart ({chart.rows.length} bands)
              </button>
            {/if}
          </div>
          <!-- The sliders ask for turns; this says where a turn is made and how
               one is counted (audit ux-01 M-20). A chunk, not entry weight. -->
          {#await import('../../dock/ShroudGuide.svelte') then ShroudGuide}
            <ShroudGuide.default />
          {/await}
        </div>
      </details>
    </div>
  {/snippet}

  {#snippet visual()}
    {#if result}<RigElevation rig={result.rig} />{/if}
  {/snippet}

  {#snippet instruments()}
    <!-- The status, always in view; the time it was committed and the way out
         are on the commit control itself, under `Setup`. -->
    {#if locked}
      <p class="state"><LockIcon /> Committed for the day</p>
    {:else}
      <p class="state"><ConfidenceBadge tier="C" /> Not committed today.</p>
    {/if}
    {#if result}
      <InstrumentCell
        label="RAKE"
        id="rake"
        size="sm"
        unit="mm"
        value={fmt(result.rig.rakeMm, 0)}
        tier="B"
        onexplain={explain}
      />
      <InstrumentCell
        label="PREBEND"
        id="prebend"
        size="sm"
        unit="mm"
        value={fmt(result.rig.prebendMm, 0)}
        tier="B"
        onexplain={explain}
      />
    {/if}
  {/snippet}
</Panel>

<!-- The explainer copy and its schematic are a chunk, not entry weight: they
     are only ever read after a deliberate tap on the `?` (ADR 0014's first-load
     budget). Mounted already-open, which is what `Sheet` expects. -->
{#if sheetOpen}
  {#await import('./ExplainSheet.svelte') then S}
    <S.default bind:open={sheetOpen} id={explaining} />
  {/await}
{/if}

<Sheet bind:open={windOpen} title="Forecast wind">
  <ForecastCard wind={dock.wind} />
  <p class="note">
    Sea state and crew weight are on the instrument band, and the rig is scored against whatever is
    set there.
  </p>
</Sheet>

<Sheet bind:open={regretOpen} title="Expected regret">
  <RegretCard
    {score}
    busy={dock.busy}
    busyNote={scoringNote}
    progress={dock.progress}
    provisional={dock.provisional}
  />

  {#if score && score.perTws.length > 0}
    <h3 class="section-title">Regret by wind speed</h3>
    <div class="scroller">
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
    <p class="note">Best setup: uppers / lowers / forestay, re-tuned for that wind alone.</p>
  {/if}
</Sheet>

<Sheet bind:open={chartOpen} title={chart ? chart.source.title : 'Gear chart'}>
  {#if chart}
    <!-- The wind-range gear chart: rows are the guide's bands, the lit row is
         the wind on screen. Every cell is the guide's own wording. -->
    <div class="chart-head">
      <Segmented
        ariaLabel="Tuning guide"
        options={GUIDE_IDS.map((id) => ({ value: id, label: GUIDE_LABELS[id] }))}
        value={source}
        onchange={(v) => (source = v as GuideId)}
      />
      <span class="base">{chart.base}</span>
    </div>
    <div class="scroller">
      <table class="gear">
        <caption class="sr-only">
          {chart.source.title}: settings by wind band, with the current wind's row highlighted
        </caption>
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
            <tr class:here={i === here}>
              <th scope="row">
                {row.label}
                {#if i === here}<span class="you">now</span>{/if}
              </th>
              {#each row.cells as cell, c (chart.columns[c].key)}
                <td>{cell}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="note">
      prov: {chart.source.title}{chart.source.revision ? `, ${chart.source.revision}` : ''} —
      <a href={chart.source.url} target="_blank" rel="noreferrer">source</a>. Printed settings,
      reproduced as published; the model's own answer is on the sliders.
    </p>
  {:else}
    <p class="note">Reference tables not loaded.</p>
  {/if}
</Sheet>

<Toast bind:open={committedToast} message="Rig committed for today — log entry started." />

<!-- The tuning card: screen-hidden, and the whole of what `Print` produces. A
     chunk, so the gear chart's markup is not in the cockpit's first load. -->
{#if printMounted}
  {#await import('./RigPrintCard.svelte') then C}
    <C.default {score} />
  {/await}
{/if}

<style>
  .rig {
    display: flex;
    flex-direction: column;
  }

  /* The hairline falls between controls, as on every other panel; the forecast
     and regret lines above them are one block with the sliders. */
  .rig > :global(.control + .control) {
    border-top: 1px solid var(--line);
  }

  .forecast,
  .regret-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-2);
    margin: 0 0 var(--space-2);
    font-size: var(--text-sm);
    color: var(--ink);
  }

  .regret-row {
    margin-bottom: var(--space-3);
  }

  .what {
    color: var(--ink-2);
  }

  .likely {
    color: var(--ink-2);
  }

  /* A text button, the size of the line it sits on: these are secondary to the
     sliders and must not read as a row of chips above them. */
  .link {
    min-height: 28px;
    padding: 0 var(--space-2);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: transparent;
    color: var(--ink-2);
    font-size: var(--text-xs);
    cursor: pointer;
  }

  details summary {
    min-height: var(--hit-min);
    display: flex;
    align-items: center;
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
  }

  .setup {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding-block-end: var(--space-2);
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
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

  .error {
    margin: var(--space-2) 0 0;
    font-size: var(--text-sm);
    color: var(--bad);
  }

  .state {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    margin: 0 0 var(--space-2);
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .chart-head {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-3);
    margin-bottom: var(--space-2);
  }

  .base {
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  /* A ten-column table in a sheet: it scrolls itself, the page does not. */
  .scroller {
    overflow-x: auto;
  }

  .gear,
  .per-tws {
    border-collapse: collapse;
    font-size: var(--text-xs);
    white-space: nowrap;
  }

  .per-tws {
    width: 100%;
    font-size: var(--text-sm);
  }

  .gear th,
  .gear td,
  .per-tws th,
  .per-tws td {
    padding: var(--space-1) var(--space-2);
    text-align: left;
    border-bottom: 1px solid var(--line);
    font-weight: 400;
    color: var(--ink-2);
  }

  .gear thead th,
  .per-tws thead th {
    color: var(--ink);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .gear tbody th {
    color: var(--ink);
  }

  .gear tr.here th,
  .gear tr.here td {
    background: var(--surface);
    color: var(--ink);
  }

  .you {
    margin-left: var(--space-1);
    padding: 0 var(--space-1);
    border-radius: var(--radius);
    background: var(--accent);
    color: var(--on-accent);
    font-size: var(--text-xs);
  }

  .note {
    margin: var(--space-2) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  h3 {
    margin: var(--space-4) 0 var(--space-2);
  }
</style>
