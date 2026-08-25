<script lang="ts">
  import type { SolveResult } from '../../../core/types';
  import ConfidenceBadge from '../../components/ConfidenceBadge.svelte';
  import InstrumentCell from '../../components/InstrumentCell.svelte';
  import Panel from '../../components/Panel.svelte';
  import Sheet from '../../components/Sheet.svelte';
  import { fmt } from '../../format';
  import { panelControlsId } from '../../keys';
  import { conditions } from '../../stores/conditions.svelte';
  import { settings } from '../../stores/settings.svelte';
  import { BARE_SPAR, kiteGeometry } from '../../three/kite';
  import { tackSide } from '../boat';
  import { DIRECTION_ONLY, downwindPlay, KITE_CUE } from '../downwind';
  import { twistRelativeDeg } from '../geometry';
  import LuffCurl from '../LuffCurl.svelte';
  import SailSectionStack from '../SailSectionStack.svelte';
  import { puffPlayer } from '../puffPlayer.svelte';
  import { race } from '../store.svelte';
  import ControlRow from './ControlRow.svelte';
  import { explainText, explainTitle } from './copy';

  /**
   * The gennaker system, in the Headsail slot under `sailset = 'asym'`: the
   * four downwind controls, the kite's own section stack, and the one cue that
   * judges the sheet — is the luff curling (ADR 0015's panel contract,
   * ADR 0017's tier-C geometry).
   *
   * It keeps the *Headsail* panel's ids, so `j`, the phone's tab strip and the
   * puff replay do not have to know which sail is up.
   *
   * Everything on it is tier C. The solver switches its aero tables under the
   * kite, but `shape.asym` is a set of constants and the four controls reach
   * no number in it, so this panel moves the drawing and says so.
   */
  let { result }: { result: SolveResult | null } = $props();

  /** Plain alias onto the store's reactive proxy: the sliders bind through it. */
  const values = race.controls.down as unknown as Record<string, number>;

  /** Sheet first: it is the whole trim, and the other three are set around it. */
  const IDS = ['kiteSheet', 'tackLine', 'kiteHalyard', 'sprit'];

  const shape = $derived(result?.shape.asym);

  /**
   * The curl cue, off the same mapping the plan view draws from — bare spar,
   * because a cue has no third axis either, and reaching for the real rig
   * would drag the 3D chunk into the first load (`PlanView.svelte`).
   */
  const curl = $derived(
    race.controls.down
      ? kiteGeometry(
          race.controls.down,
          BARE_SPAR,
          tackSide(conditions.twaDeg),
          // The luff's side depends on the apparent wind; before the first
          // solve lands, the true angle is the nearest thing to hand.
          result?.aero.awaDeg ?? Math.abs(conditions.twaDeg),
        ).curl
      : false,
  );

  const play = $derived(downwindPlay(race.mode, conditions.twsKt));

  let explaining: string | null = $state(null);
  let sheetOpen = $state(false);

  function explain(id: string): void {
    explaining = id;
    sheetOpen = true;
  }
</script>

<!-- Analyse only, and passed as a prop rather than as a child snippet so the
     panel is a two-column grid in the other two tiers instead of a
     three-column one with an empty rail. -->
{#snippet kiteCells()}
  {#if shape}
    <InstrumentCell
      label="KITE DRAFT ½"
      id="draft"
      size="sm"
      unit="%"
      value={fmt(shape.half.draft * 100, 1)}
      tier="C"
      onexplain={explain}
    />
    <InstrumentCell
      label="KITE TWIST ¾"
      id="kiteTwist"
      size="sm"
      unit="°"
      value={fmt(twistRelativeDeg(shape.threeQuarter, shape.quarter), 0)}
      tier="C"
      onexplain={explain}
    />
  {/if}
{/snippet}

<Panel
  title="Gennaker"
  id="headsail-title"
  lit={puffPlayer.litIndex('headsail')}
  cue={KITE_CUE}
  instruments={settings.mode === 'analyse' ? kiteCells : undefined}
>
  {#snippet controls()}
    <div class="rows" id={panelControlsId('headsail')}>
      {#each IDS as id (id)}
        <ControlRow {id} {values} tier="C" onexplain={explain} />
      {/each}

      <p class="banner"><ConfidenceBadge tier="C" /> {DIRECTION_ONLY}</p>

      <p class="play">
        {play.line}
        {#if play.caveat}<span class="caveat">{play.caveat}</span>{/if}
      </p>
    </div>
  {/snippet}

  {#snippet visual()}
    <div class="pictures">
      <SailSectionStack sail="asym" {shape} table={false} />
      <LuffCurl {curl} />
    </div>
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

  .rows > :global(* + *) {
    border-top: 1px solid var(--line);
  }

  .pictures {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: var(--space-3);
    align-items: start;
  }

  .banner {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    margin: var(--space-2) 0 0;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    border-top: 1px solid var(--line);
    color: var(--ink-2);
    font-size: var(--text-xs);
    line-height: 1.45;
  }

  .play {
    margin: var(--space-2) 0 0;
    font-size: var(--text-xs);
    line-height: 1.45;
    color: var(--ink-2);
  }

  .caveat {
    display: block;
    color: var(--ink);
  }

  .explainer {
    margin: 0;
    font-size: var(--text-md);
    line-height: 1.55;
    color: var(--ink);
  }
</style>
