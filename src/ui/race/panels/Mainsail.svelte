<script lang="ts">
  import type { SolveResult } from '../../../core/types';
  import BulletGauge from '../../components/BulletGauge.svelte';
  import InstrumentCell from '../../components/InstrumentCell.svelte';
  import Panel from '../../components/Panel.svelte';
  import Sheet from '../../components/Sheet.svelte';
  import { fmt } from '../../format';
  import { LEECH_STALL_BAND } from '../../instruments/gauges';
  import { panelControlsId } from '../../keys';
  import { boomAngle } from '../boat';
  import { battenAngleDeg } from '../geometry';
  import LeechProfile from '../LeechProfile.svelte';
  import SailSectionStack from '../SailSectionStack.svelte';
  import { puffPlayer } from '../puffPlayer.svelte';
  import { conditions } from '../../stores/conditions.svelte';
  import { race } from '../store.svelte';
  import ControlRow from './ControlRow.svelte';
  import { explainText, explainTitle } from './copy';

  /**
   * The mainsail system: every control that moves the main, the picture of
   * what they do to it, and the one cue that says whether it worked
   * (ADR 0015, research §3 pattern 4). Backstay lives here rather than on the
   * Headsail panel because this is where the hand is; its effect on the jib
   * shows up as the sag indicator over there.
   */
  let { result }: { result: SolveResult | null } = $props();

  /** Plain alias onto the store's reactive proxy: the sliders bind through it. */
  const values = race.controls.race as unknown as Record<string, number>;

  /** Power first, then the set-and-forget trio: the order a crew works in. */
  const IDS = ['mainsheet', 'traveller', 'backstay', 'vang', 'outhaul', 'cunningham'];

  const shape = $derived(result?.shape.main);
  const boomDeg = $derived(boomAngle(values.mainsheet, values.traveller));
  const stall = $derived(result?.instruments.leechStallFrac);

  /**
   * Under the kite the two hands swap jobs: the sheet is out past the corner
   * of the boat and the vang is what holds the leech, so a cue about mainsheet
   * leech load is coaching the wrong rope (research `2026-08-25-spinnaker`
   * doc 03 §2.1 `T3`, §2.2 `T2`).
   */
  const cue = $derived(
    conditions.sailset === 'asym'
      ? 'Under the kite the vang owns twist and the sheet is out past the corner of the boat, leech on the leeward shroud. Ease to the leech ribbons, and gear-change with the main rather than the kite sheet.'
      : 'Leech ribbons stalling about half the time is right; flowing all the time means you are building speed.',
  );

  let explaining: string | null = $state(null);
  let sheetOpen = $state(false);

  function explain(id: string): void {
    explaining = id;
    sheetOpen = true;
  }
</script>

<Panel title="Mainsail" id="mainsail-title" lit={puffPlayer.litIndex('mainsail')} {cue}>
  {#snippet controls()}
    <div class="rows" id={panelControlsId('mainsail')}>
      {#each IDS as id (id)}
        <ControlRow {id} {values} optimumBug onexplain={explain} />
      {/each}

      <details>
        <summary>Setup</summary>
        <ControlRow id="mainHalyard" {values} optimumBug onexplain={explain} />
      </details>
    </div>
  {/snippet}

  {#snippet visual()}
    <div class="pictures">
      <SailSectionStack sail="main" {shape} table={false} />
      <LeechProfile {shape} {boomDeg} />
    </div>
  {/snippet}

  {#snippet instruments()}
    {#if result && stall && shape}
      <BulletGauge
        label="LEECH STALL"
        id="leechStall"
        unit="%"
        value={stall.value * 100}
        min={0}
        max={100}
        ranges={[LEECH_STALL_BAND[0] * 100, LEECH_STALL_BAND[1] * 100]}
        tier={stall.tier}
        onexplain={explain}
      />
      <InstrumentCell
        label="BATTEN"
        id="batten"
        size="sm"
        unit="°"
        value={fmt(battenAngleDeg(shape), 0)}
        tier="B"
        onexplain={explain}
      />
      <InstrumentCell
        label="DRAFT ½"
        id="draft"
        size="sm"
        unit="%"
        value={fmt(shape.half.draft * 100, 1)}
        tier="B"
        onexplain={explain}
      />
    {/if}
  {/snippet}
</Panel>

<Sheet bind:open={sheetOpen} title={explainTitle(explaining)}>
  <p class="explainer">{explainText(explaining)}</p>
</Sheet>

<style>
  .rows {
    display: flex;
    flex-direction: column;
  }

  /* The gauge bands are the scale; a divider between rows is furniture. */
  .rows > :global(* + *) {
    border-top: 1px solid var(--line);
  }

  .pictures {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--space-3);
    align-items: start;
  }

  details summary {
    min-height: var(--hit-min);
    display: flex;
    align-items: center;
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
  }

  .explainer {
    margin: 0;
    font-size: var(--text-md);
    line-height: 1.55;
    color: var(--ink);
  }
</style>
