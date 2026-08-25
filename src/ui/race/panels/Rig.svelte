<script lang="ts">
  import type { SolveResult } from '../../../core/types';
  import ConfidenceBadge from '../../components/ConfidenceBadge.svelte';
  import InstrumentCell from '../../components/InstrumentCell.svelte';
  import LockIcon from '../../components/LockIcon.svelte';
  import Panel from '../../components/Panel.svelte';
  import Segmented from '../../components/Segmented.svelte';
  import Sheet from '../../components/Sheet.svelte';
  import { fmt } from '../../format';
  import { GUIDE_IDS, GUIDE_LABELS, type GuideId } from '../../../lib/reference';
  import { conditions } from '../../stores/conditions.svelte';
  import { rigLock } from '../../stores/rigLock.svelte';
  import { gearChart, rowFor } from '../gearChart';
  import RigElevation from '../RigElevation.svelte';
  import { CONTROLS, race } from '../store.svelte';
  import ControlRow from './ControlRow.svelte';
  import { explainText, explainTitle } from './copy';

  /**
   * The rig, which is not a live-trim panel: class rule C.9.5(a) freezes the
   * standing rigging once the boat leaves the dock, so once today's tune is
   * committed this panel reads it back rather than offering it (research §3
   * panel 3 — Rig is mode-gated, not a peer of the sail panels).
   *
   * Uncommitted, it is the dock's three sliders and a way to go and commit
   * them. Committed, it is the gear chart with your row lit up, which is the
   * artefact the sport actually uses (research §2.5).
   */
  let { result }: { result: SolveResult | null } = $props();

  const dockValues = race.controls.dock as unknown as Record<string, number>;
  const DOCK_IDS = ['upperTurns', 'lowerTurns', 'forestayMm'];

  const locked = $derived(rigLock.lockedToday);
  const setup = $derived(rigLock.locked?.setup);

  let source: GuideId = $state('north');
  const chart = $derived(gearChart(source));
  const here = $derived(rowFor(chart, conditions.twsKt));

  /** Turns read with their sign: −2 and 2 are opposite ends of the day. */
  const turns = (v: number): string => (v > 0 ? `+${fmt(v, 1)}` : fmt(v, 1));

  let explaining: string | null = $state(null);
  let sheetOpen = $state(false);

  function explain(id: string): void {
    explaining = id;
    sheetOpen = true;
  }
</script>

<Panel
  title="Rig"
  id="rig-title"
  cue="Set it on the dock for the day's breeze — uppers hold the headstay, lowers set the prebend."
>
  {#snippet controls()}
    {#if !locked}
      <div class="dock-cta">
        <p class="lede">
          Nothing committed today, so these three are free to explore — and they are
          <em>not</em> what you will be sailing unless you commit them.
        </p>
        {#each DOCK_IDS as id (id)}
          <ControlRow {id} values={dockValues} onexplain={explain} />
        {/each}
        <a class="dock-link" href="#/dock">Set it on the dock →</a>
      </div>
    {:else if chart}
      <!-- The wind-range gear chart: rows are the guide's bands, the lit row
           is the wind on screen. Every cell is the guide's own wording. -->
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
      <p class="prov">
        prov: {chart.source.title}{chart.source.revision ? `, ${chart.source.revision}` : ''} —
        <a href={chart.source.url} target="_blank" rel="noreferrer">source</a>. Printed settings,
        reproduced as published; the model's own answer is on the sliders.
      </p>
    {:else}
      <p class="prov">Reference tables not loaded.</p>
    {/if}
  {/snippet}

  {#snippet visual()}
    {#if result}<RigElevation rig={result.rig} />{/if}
  {/snippet}

  {#snippet instruments()}
    {#if locked && setup}
      <p class="committed"><LockIcon /> Committed for the day</p>
      <InstrumentCell
        label="UPPERS"
        id="upperTurns"
        size="sm"
        unit={CONTROLS.upperTurns.unit}
        value={turns(setup.upperTurns)}
        onexplain={explain}
      />
      <InstrumentCell
        label="LOWERS"
        id="lowerTurns"
        size="sm"
        unit={CONTROLS.lowerTurns.unit}
        value={turns(setup.lowerTurns)}
        onexplain={explain}
      />
      <InstrumentCell
        label="FORESTAY"
        id="forestayMm"
        size="sm"
        unit="mm"
        value={turns(setup.forestayMm)}
        onexplain={explain}
      />
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
    {#if !locked}
      <p class="uncommitted"><ConfidenceBadge tier="C" /> Not committed today.</p>
    {/if}
  {/snippet}
</Panel>

<Sheet bind:open={sheetOpen} title={explainTitle(explaining)}>
  <p class="explainer">{explainText(explaining)}</p>
</Sheet>

<style>
  .dock-cta {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .lede {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--ink-2);
  }

  .dock-link {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    min-height: var(--hit-min);
    padding: 0 var(--space-3);
    border: 1px solid var(--accent);
    border-radius: var(--radius);
    color: var(--accent);
    font-size: var(--text-sm);
    font-weight: 600;
    text-decoration: none;
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

  /* A ten-column table in a panel column: it scrolls itself, the page does not. */
  .scroller {
    overflow-x: auto;
  }

  .gear {
    border-collapse: collapse;
    font-size: var(--text-xs);
    white-space: nowrap;
  }

  .gear th,
  .gear td {
    padding: var(--space-1) var(--space-2);
    text-align: left;
    border-bottom: 1px solid var(--line);
    font-weight: 400;
    color: var(--ink-2);
  }

  .gear thead th {
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

  .prov {
    margin: var(--space-2) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .committed,
  .uncommitted {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    margin: 0 0 var(--space-2);
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .explainer {
    margin: 0;
    font-size: var(--text-md);
    line-height: 1.55;
    color: var(--ink);
  }
</style>
