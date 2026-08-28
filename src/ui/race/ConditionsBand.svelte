<script lang="ts">
  import { activeBoat as boat } from '../../lib/boat';
  import type { Condition, SeaState } from '../../core/types';
  import InstrumentCell from '../components/InstrumentCell.svelte';
  import Segmented from '../components/Segmented.svelte';
  import { fmt } from '../format';
  import { conditions, SEA_STATES } from '../stores/conditions.svelte';
  import { bandOf, POINTS_OF_SAIL } from './pointOfSail';
  import { puffPlayer } from './puffPlayer.svelte';
  import { race } from './store.svelte';
  import WindRose from './WindRose.svelte';

  /**
   * The right half of the instrument band: what the *world* is doing, drawn
   * with the same `InstrumentCell` contract as the boat's numbers beside it and
   * editable in place (ADR 0021, audit ux-04 H-01, M-01, M-02, M-09).
   *
   * It replaces `ConditionsStrip`, which put the one input that changes every
   * number on the screen into a 28 px chip rail at the far edge of the header,
   * half of it inert `<span>`s and the rest behind a button labelled `Edit`.
   * There is no `Edit` here: every value is its own control, in place.
   *
   * `condition` is what to draw; the writes go to the `conditions` store, which
   * is the one home for all five. A drill passes its own condition and
   * `editable={false}`, because there the drill sets the wind.
   */
  let {
    condition,
    awaDeg,
    editable = true,
    onexplain,
  }: {
    condition: Condition;
    /** The wind the sails see, for the rose's second arrow. */
    awaDeg?: number;
    editable?: boolean;
    onexplain?: (id: string) => void;
  } = $props();

  const TWS_MIN = 2;
  const TWS_MAX = 30;
  const CREW_STEP = 5;

  const seaLabel = $derived(SEA_STATES[condition.seaState].label);
  const sailLabel = $derived(condition.sailset === 'asym' ? 'Gennaker' : 'Jib');

  /**
   * The chip the angle is in — and nothing when it has left every band
   * (M-02). The chip you last tapped keeps the row while the angle it set is
   * still on screen, so `Run` stays `Run` after its VMG solve answers 149°,
   * which the bands would call a broad reach.
   */
  const active = $derived(
    race.pointOfSail?.twaDeg === condition.twaDeg ? race.pointOfSail.id : bandOf(condition.twaDeg),
  );

  function stepTws(delta: number): void {
    conditions.twsKt = Math.min(TWS_MAX, Math.max(TWS_MIN, conditions.twsKt + delta));
  }

  const otherSailLabel = $derived(condition.sailset === 'asym' ? 'jib' : 'gennaker');

  function toggleSail(): void {
    conditions.sailset = condition.sailset === 'asym' ? 'jib' : 'asym';
  }

  function stepCrew(delta: number): void {
    conditions.crewKg = Math.min(
      boat.crew.maxKg,
      Math.max(boat.crew.minKg, conditions.crewKg + delta),
    );
  }

  let seaOpen = $state(false);
  let seaWrapper: HTMLDivElement | undefined = $state();

  function closeSea(e: FocusEvent): void {
    const next = e.relatedTarget as Node | null;
    if (!next || !(e.currentTarget as HTMLElement).contains(next)) seaOpen = false;
  }

  /* Escape and a tap outside both dismiss (audit ux-04). `onfocusout` and the
     Escape handler used to live on `.pop` itself, which never has focus —
     `InstrumentCell`'s trigger button does — so Escape never fired and a
     click on, say, a point-of-sail chip left the popover open. `onfocusout`
     now lives on the wrapper, which contains trigger and popover alike;
     Escape and outside-pointerdown are window-level (below), since a plain
     `<div>` can't carry a keydown handler without an ARIA role of its own. */
  function closeSeaOnEscape(e: KeyboardEvent): void {
    if (e.key !== 'Escape') return;
    seaOpen = false;
    seaWrapper?.querySelector<HTMLButtonElement>('button[aria-expanded]')?.focus();
  }

  function onWindowPointerDown(e: PointerEvent): void {
    if (seaOpen && seaWrapper && !seaWrapper.contains(e.target as Node)) seaOpen = false;
  }

  function onWindowKeydown(e: KeyboardEvent): void {
    if (seaOpen) closeSeaOnEscape(e);
  }
</script>

{#snippet stepper(
  name: string,
  unit: string,
  range: string,
  down: () => void,
  up: () => void,
  atMin: boolean,
  atMax: boolean,
  cell: import('svelte').Snippet,
)}
  <!-- `− 10 kt +`: the buttons flank the value they change rather than sitting
       under it, which is a row of the phone's band budget and reads as one
       control instead of two things stacked. The group carries the range,
       because a pair of ± buttons has nowhere else to put it — the slider
       these replaced announced its own bounds, and a stepper that does not is
       a control whose limits you find by pressing. -->
  <span class="stepper" role="group" aria-label="{name}, {range}">
    <button
      type="button"
      class="step"
      aria-label="{name} down one {unit}"
      onclick={down}
      disabled={atMin}>−</button
    >
    {@render cell()}
    <button
      type="button"
      class="step"
      aria-label="{name} up one {unit}"
      onclick={up}
      disabled={atMax}>+</button
    >
  </span>
{/snippet}

{#snippet twsCell()}
  <InstrumentCell label="TWS" id="tws" unit="kt" value={fmt(condition.twsKt, 0)} {onexplain} />
{/snippet}

{#snippet crewCell()}
  <InstrumentCell label="CREW" id="crew" unit="kg" value={fmt(condition.crewKg, 0)} {onexplain} />
{/snippet}

<svelte:window onpointerdown={onWindowPointerDown} onkeydown={onWindowKeydown} />

<!-- `role="group"`, or the browser drops the `aria-label` on the implicit
     generic role and the cells are announced with no grouping (audit ux-03 M-14). -->
<!-- `data-tour` is the first-run tour's spotlight anchor: card 1 is about the
     wind, and the card that says "everything on the left answers to it" has to
     be able to point at the half it means (audit ux-04 H-02). -->
<div class="conditions" data-tour="conditions" role="group" aria-label="Conditions">
  <div class="cond-cells">
    <!-- A replay is the wind being written from outside: the cell it is writing
         says so while it runs, or the number changes on its own and nothing on
         the band accounts for it (audit ux-04 M-06). -->
    <div class="cond tws" class:replaying={puffPlayer.playing}>
      {#if editable}
        {@render stepper(
          'Wind speed',
          'knot',
          `${TWS_MIN} to ${TWS_MAX} knots`,
          () => stepTws(-1),
          () => stepTws(1),
          condition.twsKt <= TWS_MIN,
          condition.twsKt >= TWS_MAX,
          twsCell,
        )}
      {:else}
        {@render twsCell()}
      {/if}
    </div>

    <!-- Sailors think in arrows (M-08): the rose is the control and the number
         beside it is the readout, and both are the same angle. -->
    <div class="cond twa">
      <WindRose
        twaDeg={condition.twaDeg}
        {awaDeg}
        twsKt={condition.twsKt}
        {editable}
        onchange={(deg) => (conditions.twaDeg = deg)}
      />
      <InstrumentCell label="TWA" id="twa" unit="°" value={fmt(condition.twaDeg, 0)} {onexplain} />
    </div>

    <div class="cond sea" bind:this={seaWrapper} onfocusout={closeSea}>
      <InstrumentCell
        label="SEA"
        id="sea"
        value={seaLabel}
        {onexplain}
        onactivate={editable ? () => (seaOpen = !seaOpen) : undefined}
        expanded={editable ? seaOpen : undefined}
      />
      {#if editable && seaOpen}
        <div class="pop" role="group" aria-label="Sea state">
          <Segmented
            ariaLabel="Sea state"
            options={SEA_STATES.map((s) => ({ value: String(s.value), label: s.label }))}
            value={String(condition.seaState)}
            onchange={(v) => {
              conditions.seaState = Number(v) as SeaState;
              seaOpen = false;
            }}
          />
        </div>
      {/if}
    </div>

    <div class="cond crew">
      {#if editable}
        {@render stepper(
          'Crew weight',
          `${CREW_STEP} kilograms`,
          `${boat.crew.minKg} to ${boat.crew.maxKg} kilograms`,
          () => stepCrew(-CREW_STEP),
          () => stepCrew(CREW_STEP),
          condition.crewKg <= boat.crew.minKg,
          condition.crewKg >= boat.crew.maxKg,
          crewCell,
        )}
      {:else}
        {@render crewCell()}
      {/if}
    </div>

    <!-- Two sails, so the value is the toggle: a segmented under a 28 px `Jib`
         was the same fact twice, once as a readout and once as a control. -->
    <div class="cond">
      <InstrumentCell
        label="SAIL"
        id="sailset"
        value={sailLabel}
        {onexplain}
        onactivate={editable ? toggleSail : undefined}
        activateHint={editable ? `switch to ${otherSailLabel}` : undefined}
      />
    </div>
  </div>

  {#if editable}
    <!-- Presets for the angle, under the cell they set. Nothing is pressed once
         the rose has been dragged out of the chip's band (M-02). -->
    <div class="chip-row points" role="group" aria-label="Point of sail">
      {#each POINTS_OF_SAIL as p (p.id)}
        <button
          type="button"
          class="chip hit-44"
          aria-pressed={active === p.id}
          aria-busy={race.pointOfSailBusy === p.id}
          onclick={() => race.setPointOfSail(p.id)}
        >
          {p.label}{#if race.pointOfSailBusy === p.id}<span class="busy">…</span>{/if}
        </button>
      {/each}
    </div>
  {:else}
    <!-- A drill withholds the condition as well as the answer: it is the thing
         being trained against, so it is shown and not offered. -->
    <p class="locked">
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
        <path
          d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v10H5z"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linejoin="round"
        />
      </svg>
      The drill sets the wind.
    </p>
  {/if}
</div>

<style>
  .conditions {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
  }

  /* Wrap, don't tile: these five cells are different widths — a rose beside a
     number, a word rather than a figure, a stepper either side of a figure —
     and an equal-track grid sized every column to the widest of them and then
     clipped it. Flex wrap gives each cell what it needs and breaks the row
     when the next one does not fit: five across in the cockpit, two rows on a
     390 px phone. */
  .cond-cells {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-4);
    align-items: center;
  }

  .cond {
    position: relative;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-1);
  }

  .cond.twa {
    flex-direction: row;
    align-items: center;
    gap: var(--space-2);
  }

  /* The ring is static and the pulse is the animation, the same split as
     `Panel`'s lit outline: `data-motion: off` kills animations globally
     (tokens.css), and a reader who asked for no motion still has to be able to
     see which cell is being written. */
  .cond.replaying {
    outline: 2px solid var(--accent);
    outline-offset: 4px;
    border-radius: var(--radius);
    animation: tws-pulse 1200ms ease-in-out infinite;
  }

  @keyframes tws-pulse {
    50% {
      outline-color: transparent;
    }
  }

  /* One-tap wind speed and crew weight, the buttons flanking the value. 44 px
     on a phone, mouse-sized in the cockpit, exactly as the old rail's was. */
  .stepper {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
  }

  .step {
    width: var(--hit-min);
    min-height: var(--hit-min);
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    background: transparent;
    color: var(--accent);
    font-size: var(--text-md);
    line-height: 1;
    cursor: pointer;
  }

  .step:disabled {
    border-color: var(--line);
    color: var(--muted);
    cursor: default;
  }

  /* Five sea states are too wide for a cell, so they open over the band rather
     than reflowing it. Light-dismissed by Escape, by focus leaving the
     wrapper, and by a pointerdown outside it. */
  .pop {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 2;
    padding: var(--space-2);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: var(--surface-2);
    box-shadow: 0 6px 20px rgb(0 0 0 / 35%);
  }

  .busy {
    margin-left: var(--space-1);
  }

  /* The chips scroll sideways rather than wrapping to a second row on a phone,
     where every 44 px row is one the band cannot spare. Snap so a flick lands
     on a chip, and fade the trailing edge so the two chips over the horizon —
     Broad reach and Run — read as "there is more", not as "there are three". */
  .points {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    scroll-snap-type: x proximity;
    -webkit-mask-image: linear-gradient(to right, #000 85%, transparent);
    mask-image: linear-gradient(to right, #000 85%, transparent);
  }

  .points::-webkit-scrollbar {
    display: none;
  }

  .points > :global(*) {
    scroll-snap-align: start;
  }

  .locked {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin: 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  /* Cockpit: mouse-sized controls, as the conditions rail was before it became
     the band. The 44 px hit target is a phone requirement and stays there. */
  @media (min-width: 1280px) {
    .step {
      width: 28px;
      min-height: 28px;
    }

    /* The sea popover's five options, mouse-sized like everything else here. */
    .conditions :global(.segmented button) {
      min-height: 28px;
      padding: 0 var(--space-2);
      font-size: var(--text-xs);
    }

    /* All five chips fit, so nothing scrolls and nothing is faded out. */
    .points {
      flex-wrap: wrap;
      overflow-x: visible;
      -webkit-mask-image: none;
      mask-image: none;
    }
  }
</style>
