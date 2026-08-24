<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import ConditionsStrip from '../race/ConditionsStrip.svelte';
  import ControlPanel from '../race/ControlPanel.svelte';
  import PlanView from '../race/PlanView.svelte';
  import Readouts from '../race/Readouts.svelte';
  import RigElevation from '../race/RigElevation.svelte';
  import SailSections from '../race/SailSections.svelte';
  import { GAIN_EPS, race } from '../race/store.svelte';
  import { conditions } from '../stores/conditions.svelte';
  import { settings } from '../stores/settings.svelte';
  import Panel from '../disagree/Panel.svelte';
  import { ModelOptimumStore } from '../disagree/store.svelte';
  import { getClient } from '../race/client';

  const advanced = $derived(settings.mode === 'advanced');
  const model = new ModelOptimumStore(getClient());
  $effect(() => {
    if (advanced) model.request(conditions.twsKt, conditions.seaState, conditions.crewKg);
  });

  $effect(() => {
    // Reading the snapshots tracks every control and condition field.
    race.request($state.snapshot(race.controls), conditions.value);
  });

  const TABS = ['Sections', 'Rig', 'Plan'] as const;
  let tab = $state(0);

  /** The settled-trim line quotes the store's own threshold, not a round number. */
  const settled = `Trim is balanced: no single control gains more than ${GAIN_EPS.toFixed(3)} kt.`;
</script>

<TopBar title="Race" />

<ConditionsStrip />

<div class="screen">
  <div class="col-primary stack">
    <!-- Phone and tablet: hero readouts, then one tabbed picture card. -->
    <div class="lg-hide">
      {#if race.result}
        <Readouts result={race.result} twaDeg={conditions.twaDeg} variant="hero" busy={race.busy} />
      {/if}
    </div>

    <section class="card lg-hide">
      <div class="tabs" role="tablist" aria-label="Pictures">
        {#each TABS as name, i (name)}
          <button
            type="button"
            role="tab"
            id="pic-tab-{i}"
            aria-selected={tab === i}
            aria-controls="pic-pane-{i}"
            class:active={tab === i}
            onclick={() => (tab = i)}
          >
            {name}
          </button>
        {/each}
      </div>

      <div
        class="pane"
        role="tabpanel"
        id="pic-pane-0"
        aria-labelledby="pic-tab-0"
        hidden={tab !== 0}
      >
        <SailSections main={race.result?.shape.main} jib={race.result?.shape.jib} />
      </div>
      <div
        class="pane"
        role="tabpanel"
        id="pic-pane-1"
        aria-labelledby="pic-tab-1"
        hidden={tab !== 1}
      >
        {#if race.result}<RigElevation rig={race.result.rig} />{/if}
      </div>
      <div
        class="pane"
        role="tabpanel"
        id="pic-pane-2"
        aria-labelledby="pic-tab-2"
        hidden={tab !== 2}
      >
        {#if race.result}
          <PlanView
            aero={race.result.aero}
            heelDeg={race.result.heelDeg.value}
            twaDeg={conditions.twaDeg}
            jib={race.result.shape.jib}
          />
        {/if}
      </div>
    </section>

    <!-- Desktop: the boat is the hero, the two diagrams sit under it. -->
    <div class="lg-only stack">
      <section class="card hero-boat">
        <h2 class="section-title">The boat</h2>
        {#if race.result}
          <PlanView
            aero={race.result.aero}
            heelDeg={race.result.heelDeg.value}
            twaDeg={conditions.twaDeg}
            jib={race.result.shape.jib}
          />
        {/if}
      </section>

      <div class="pic-pair">
        <section class="card">
          <h2 class="section-title">Sail sections</h2>
          <SailSections main={race.result?.shape.main} jib={race.result?.shape.jib} />
        </section>
        <section class="card">
          <h2 class="section-title">Rig elevation</h2>
          {#if race.result}<RigElevation rig={race.result.rig} />{/if}
        </section>
      </div>
    </div>
  </div>

  <div class="col-secondary stack">
    <div class="lg-only metrics-dock">
      {#if race.result}
        <Readouts
          result={race.result}
          twaDeg={conditions.twaDeg}
          variant="strip"
          busy={race.busy}
        />
      {/if}
    </div>

    <section class="card insight" class:busy={race.busy}>
      <div class="insight-head">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" class="icon">
          <path
            d="M12 3a6 6 0 0 0-3.5 10.9V17h7v-3.1A6 6 0 0 0 12 3Z M9.5 20h5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <p class="line">
          {#if race.error}
            Solver error: {race.error}
          {:else if race.coach}
            {race.coach.text}
          {:else if race.result}
            {settled}
          {:else}
            Solving…
          {/if}
        </p>
      </div>
      <details>
        <summary>Why</summary>
        <p>
          Sailflow nudges backstay, mainsheet, traveller and jib lead one legal step each way,
          re-solves, and reports the largest VMG gain. Anything smaller than {GAIN_EPS.toFixed(3)} kt
          is below the solver's own resolution, so it is not offered as a move.
        </p>
      </details>
    </section>

    <ControlPanel />

    {#if advanced}
      <section class="card">
        <details>
          <summary>Model vs tuning guides</summary>
          <Panel
            twsKt={conditions.twsKt}
            seaState={conditions.seaState}
            crewKg={conditions.crewKg}
            modelOptimum={model.optimum}
            busy={model.busy}
          />
        </details>
      </section>
    {/if}
  </div>
</div>

<style>
  .tabs {
    display: flex;
    gap: var(--space-1);
    margin-bottom: var(--space-3);
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--line);
  }

  .tabs button {
    flex: 1;
    min-height: var(--hit-min);
    border: none;
    border-radius: var(--radius);
    background: transparent;
    color: var(--ink-2);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .tabs button.active {
    background: var(--accent);
    color: var(--on-accent);
    font-weight: 600;
  }

  .pane[hidden] {
    display: none;
  }

  .pic-pair {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-4);
    align-items: start;
  }

  .pic-pair .card,
  .hero-boat {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  /* The boat is the thing you watch while you drag a slider, so it gets the
     room. Capping the drawing width keeps the stroke weights sane; the
     --tag-size override keeps the two labels at reading size at this scale. */
  .hero-boat {
    min-height: 480px;
    justify-content: center;
    --tag-size: 6px;
  }

  .hero-boat :global(svg) {
    max-height: none;
    max-width: 720px;
  }

  /* Between 1024 and 1280 the primary column is too narrow to read two
     diagrams side by side, so they stack instead of shrinking. */
  @media (max-width: 1279px) {
    .pic-pair {
      grid-template-columns: 1fr;
    }
  }

  .metrics-dock {
    position: sticky;
    top: var(--space-4);
    z-index: 2;
  }

  .insight {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    border-left: 3px solid var(--accent);
  }

  .insight.busy {
    opacity: 0.7;
  }

  .insight-head {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
  }

  .icon {
    flex: none;
    margin-top: 2px;
    color: var(--accent);
  }

  .line {
    margin: 0;
    font-size: var(--text-md);
    color: var(--ink);
  }

  details summary {
    min-height: 32px;
    display: flex;
    align-items: center;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--ink-2);
    cursor: pointer;
  }

  details p {
    margin: var(--space-2) 0 0;
    font-size: var(--text-sm);
    line-height: 1.55;
    color: var(--ink-2);
  }
</style>
