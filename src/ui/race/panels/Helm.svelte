<script lang="ts">
  import boat from '../../../../data/boats/j70.json';
  import type { SolveResult } from '../../../core/types';
  import BulletGauge from '../../components/BulletGauge.svelte';
  import ConfidenceBadge from '../../components/ConfidenceBadge.svelte';
  import Panel from '../../components/Panel.svelte';
  import Segmented from '../../components/Segmented.svelte';
  import Sheet from '../../components/Sheet.svelte';
  import Slider from '../../components/Slider.svelte';
  import { HEEL_SCALE_MAX, HELM_TARGET, heelBands } from '../../instruments/gauges';
  import { panelControlsId } from '../../keys';
  import { track } from '../../../lib/telemetry';
  import { conditions } from '../../stores/conditions.svelte';
  import { settings } from '../../stores/settings.svelte';
  import { puffPlayer } from '../puffPlayer.svelte';
  import {
    DOWNWIND_MODES,
    FORE_AFT,
    race,
    UPWIND_MODES,
    type ForeAft,
    type RaceMode,
  } from '../store.svelte';
  import ControlRow from './ControlRow.svelte';
  import { explainText, explainTitle } from './copy';

  /**
   * Helm & conditions: the two gauges that only mean anything together, the
   * mode you are steering, where the crew is, and — under the kite — the
   * downwind control set (ADR 0015, research §3 panel 4).
   *
   * S3's point is a correctness requirement, not a layout preference: helm
   * feel only reports trim while heel is steady, so the helm bar never
   * appears without the heel gauge beside it.
   */
  let { result }: { result: SolveResult | null } = $props();

  const downValues = race.controls.down as unknown as Record<string, number>;
  const DOWN_IDS = ['kiteHalyard', 'tackLine', 'kiteSheet', 'sprit'];

  const advanced = $derived(settings.advanced);
  /** Kite hoisted: the kite rows show in every tier, checkbox or not (ux-01 M-22). */
  const kiteUp = $derived(conditions.sailset === 'asym');

  const heel = $derived(heelBands(conditions.twsKt));
  const modes = $derived(race.downwindModes ? DOWNWIND_MODES : UPWIND_MODES);
  /**
   * Drag the TWA past 90° with "High" selected and the upwind mode is not in
   * this list any more. VMG is in both, and is what an unnamed angle is:
   * nothing deliberate has been asked for.
   */
  const mode = $derived(modes.some((m) => m.value === race.mode) ? race.mode : 'vmg');

  function pickMode(mode: RaceMode): void {
    race.setMode(mode);
    track('race.mode');
  }

  let explaining: string | null = $state(null);
  let sheetOpen = $state(false);

  function explain(id: string): void {
    explaining = id;
    sheetOpen = true;
  }
</script>

<Panel
  title="Helm & conditions"
  id="helm-title"
  lit={puffPlayer.litIndex('helm')}
  cue="Hold heel steady — helm load only tells the truth when heel is not moving."
>
  {#snippet controls()}
    <div class="rows" id={panelControlsId('helm')}>
      <div class="field">
        <span class="section-title">Mode</span>
        <Segmented
          ariaLabel="Steering mode"
          options={modes}
          value={mode}
          onchange={(v) => pickMode(v)}
        />
      </div>
      <p class="note">
        {#if race.downwindModes}
          Plane heats it up, soak drops down, wing squares away: the same run, steered {Math.abs(
            conditions.twaDeg - (race.modeBaseTwaDeg ?? conditions.twaDeg),
          )}° off the VMG angle.
        {:else}
          A mode is a deliberate 3° off the VMG angle — high to squeeze up, fast to foot off.
        {/if}
      </p>

      <div class="field">
        <span class="section-title">Crew</span>
      </div>
      <Slider
        label="Crew weight"
        bind:value={conditions.crewKg}
        min={boat.crew.minKg}
        max={boat.crew.maxKg}
        step={5}
        unit="kg"
        decimals={0}
      />
      <div class="field">
        <span class="section-title">
          Fore-aft <ConfidenceBadge
            tier="C"
            reason="Not modelled: the solver takes crew weight, never where it sits. Recorded with the trim so the log has it, and it changes no number on this screen."
          />
        </span>
        <Segmented
          ariaLabel="Crew fore-aft position"
          options={FORE_AFT}
          value={race.crewForeAft}
          onchange={(v) => (race.crewForeAft = v as ForeAft)}
        />
      </div>
      <p class="note">Crew fore-aft is <strong>not modelled</strong> — it is logged, not solved.</p>

      {#if advanced || kiteUp}
        <section class="kite" aria-label="Downwind controls">
          <span class="section-title">
            Kite
            {#if advanced && !kiteUp}
              <label class="dw">
                <input type="checkbox" bind:checked={race.downwind} />
                show
              </label>
            {/if}
          </span>
          {#if race.downwind || kiteUp}
            <p class="banner"><ConfidenceBadge tier="C" /> Downwind is direction only.</p>
            {#each DOWN_IDS as id (id)}
              <ControlRow {id} values={downValues} tier="C" onexplain={explain} />
            {/each}
          {/if}
        </section>
      {/if}
    </div>
  {/snippet}

  {#snippet visual()}
    <!-- The pair, side by side, for the reason in the cue above. -->
    <div class="gauges">
      {#if result}
        <BulletGauge
          label="HEEL"
          id="heel"
          unit="°"
          value={Math.abs(result.heelDeg.value)}
          min={0}
          max={HEEL_SCALE_MAX}
          target={heel.target}
          ranges={[heel.lo, heel.hi]}
          tier={result.heelDeg.tier}
          onexplain={explain}
        />
        <BulletGauge
          label="HELM LOAD"
          id="helm"
          value={result.instruments.helmLoad.value}
          min={-1.5}
          max={1.5}
          target={HELM_TARGET}
          decimals={2}
          symbol
          tier={result.instruments.helmLoad.tier}
          onexplain={explain}
        />
      {/if}
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
    gap: var(--space-2);
  }

  .field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-3);
    min-height: var(--hit-min);
  }

  .gauges {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--space-3) var(--space-4);
    align-items: start;
  }

  .note {
    display: none;
    margin: 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  /* Prose is the learn tier's job; race and analyse have the chips. */
  :global([data-tier='learn']) .note {
    display: block;
  }

  .kite {
    display: flex;
    flex-direction: column;
    margin-top: var(--space-2);
    padding-top: var(--space-2);
    border-top: 1px solid var(--line);
  }

  .banner {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin: var(--space-2) 0 0;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    color: var(--ink-2);
    font-size: var(--text-xs);
  }

  .dw {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--hit-min);
    margin-left: auto;
    text-transform: none;
    letter-spacing: normal;
  }

  .explainer {
    margin: 0;
    font-size: var(--text-md);
    line-height: 1.55;
    color: var(--ink);
  }
</style>
