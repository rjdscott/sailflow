<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import ConditionsStrip from '../race/ConditionsStrip.svelte';
  import ControlPanel from '../race/ControlPanel.svelte';
  import PlanView from '../race/PlanView.svelte';
  import Readouts from '../race/Readouts.svelte';
  import RigElevation from '../race/RigElevation.svelte';
  import SailSections from '../race/SailSections.svelte';
  import { race } from '../race/store.svelte';
  import { conditions } from '../stores/conditions.svelte';

  const PANES = ['Sections', 'Rig', 'Plan'];
  let carousel: HTMLDivElement | undefined = $state();
  let pane = $state(0);

  $effect(() => {
    // Reading the snapshots tracks every control and condition field.
    race.request($state.snapshot(race.controls), conditions.value);
  });

  function onScroll(): void {
    if (!carousel) return;
    pane = Math.round(carousel.scrollLeft / carousel.clientWidth);
  }

  function goto(i: number): void {
    carousel?.scrollTo({ left: i * carousel.clientWidth, behavior: 'smooth' });
  }
</script>

<TopBar title="Race" />

<ConditionsStrip />

<div class="pictures" bind:this={carousel} onscroll={onScroll}>
  <div class="pane">
    <SailSections main={race.result?.shape.main} jib={race.result?.shape.jib} />
  </div>
  <div class="pane">
    {#if race.result}<RigElevation rig={race.result.rig} />{/if}
  </div>
  <div class="pane">
    {#if race.result}
      <PlanView
        aero={race.result.aero}
        heelDeg={race.result.heelDeg.value}
        twaDeg={conditions.twaDeg}
        jib={race.result.shape.jib}
      />
    {/if}
  </div>
</div>

<div class="dots">
  {#each PANES as name, i (name)}
    <button
      type="button"
      class:active={pane === i}
      aria-label="Show {name}"
      aria-current={pane === i}
      onclick={() => goto(i)}
    ></button>
  {/each}
</div>

{#if race.result}
  <Readouts result={race.result} twaDeg={conditions.twaDeg} />
{/if}

<p class="coach" class:busy={race.busy}>
  {#if race.error}
    Solver error: {race.error}
  {:else if race.coach}
    {race.coach.text}
  {:else if race.result}
    Nothing on the four big gears beats the noise floor — this trim is settled.
  {:else}
    Solving…
  {/if}
</p>

<ControlPanel />

<style>
  .pictures {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 100%;
    height: 40vh;
    min-height: 240px;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    margin-top: var(--space-3);
    scrollbar-width: none;
  }

  .pictures::-webkit-scrollbar {
    display: none;
  }

  .pane {
    scroll-snap-align: start;
    min-width: 0;
    padding-inline: var(--space-1);
  }

  .dots {
    display: flex;
    justify-content: center;
    gap: var(--space-2);
    padding-block: var(--space-2);
  }

  .dots button {
    width: 10px;
    height: 10px;
    padding: 0;
    border: 1px solid var(--ink-2);
    border-radius: 50%;
    background: transparent;
    cursor: pointer;
  }

  .dots button.active {
    background: var(--accent);
    border-color: var(--accent);
  }

  .coach {
    margin: 0;
    padding: var(--space-3);
    border-left: 3px solid var(--accent);
    background: var(--surface);
    border-radius: 0 var(--radius) var(--radius) 0;
    font-size: var(--text-md);
    color: var(--ink);
  }

  .coach.busy {
    opacity: 0.6;
  }

  /* Wide enough for all three pictures at once: one rule, same components. */
  @media (min-width: 900px) {
    .pictures {
      grid-auto-columns: 1fr;
      overflow-x: hidden;
      height: 34vh;
      gap: var(--space-4);
    }

    .dots {
      display: none;
    }
  }
</style>
