<script lang="ts">
  import { cubicOut } from 'svelte/easing';
  import { prefersReducedMotion, Tween } from 'svelte/motion';
  import type { RaceControls } from '../../core/types';
  import { TRIM_CONTROLS } from '../../worker/protocol';
  import ConfidenceBadge from '../components/ConfidenceBadge.svelte';
  import TopBar from '../components/TopBar.svelte';
  import ActionsBar from '../race/ActionsBar.svelte';
  import ConditionsStrip from '../race/ConditionsStrip.svelte';
  import Gennaker from '../race/panels/Gennaker.svelte';
  import Headsail from '../race/panels/Headsail.svelte';
  import Helm from '../race/panels/Helm.svelte';
  import Mainsail from '../race/panels/Mainsail.svelte';
  import PanelTabs from '../race/PanelTabs.svelte';
  import Rig from '../race/panels/Rig.svelte';
  import InstrumentBar, {
    DEFAULT_DELTA_LABEL,
    PINNED_DELTA_LABEL,
  } from '../race/InstrumentBar.svelte';
  import SailHero from '../three/SailHero.svelte';
  import {
    CONTROLS,
    FORE_AFT_LABELS,
    GAIN_EPS,
    MODE_LABELS,
    OBJECTIVE_METRIC,
    race,
    raceObjective,
  } from '../race/store.svelte';
  import { snap } from '../format';
  import { nearestPointOfSail, POINTS_OF_SAIL } from '../race/pointOfSail';
  import { optimum } from '../race/optimum.svelte';
  import { play as playPuff } from '../race/PuffReplay.svelte';
  import { puffPlayer } from '../race/puffPlayer.svelte';
  import { BASE_RACE, conditions } from '../stores/conditions.svelte';
  import { settings } from '../stores/settings.svelte';
  import { rigLock } from '../stores/rigLock.svelte';
  import Panel from '../disagree/Panel.svelte';
  import { ModelOptimumStore } from '../disagree/store.svelte';
  import { getClient } from '../race/client';
  import Sheet from '../components/Sheet.svelte';
  import ShortcutsSheet from '../components/ShortcutsSheet.svelte';
  import { isTypingTarget, keyAction, panelControlsId, panelSection, type PanelId } from '../keys';
  import { router } from '../router.svelte';
  import { logStoreUi } from '../log/store.svelte';
  import { track } from '../../lib/telemetry';

  const advanced = $derived(settings.advanced);
  const model = new ModelOptimumStore(getClient());
  $effect(() => {
    if (advanced) model.request(conditions.twsKt, conditions.seaState, conditions.crewKg);
  });

  $effect(() => {
    race.syncDock(rigLock.lockedToday ? rigLock.locked!.setup : null);
  });

  $effect(() => {
    // Reading the snapshots tracks every control and condition field.
    race.request($state.snapshot(race.controls), conditions.value);
  });

  $effect(() => {
    // The store keys on condition + dock + trim and debounces, so a drag
    // re-runs this effect sixty times and buys exactly one search, seeded
    // from where the thumb stopped (audit ux-02 H-07).
    optimum.request($state.snapshot(race.controls), conditions.value);
  });

  // --- Apply optimum ------------------------------------------------------
  // One tween of a 0→1 progress scalar; the effect lerps every trim control
  // off it. Tweening the numbers rather than the sliders means the boat, the
  // sail sections and the readouts all travel together, and the last frame
  // lands exactly on the solver's on-grid answer.
  const APPLY_MS = 400;
  const progress = new Tween(1, {
    duration: () => (prefersReducedMotion.current ? 1 : APPLY_MS),
    easing: cubicOut,
  });
  let from: RaceControls | null = null;
  let to: RaceControls | null = null;

  /**
   * What the last apply moved, "mainsheet 70 → 75" per control (audit ux-02
   * M-26). Eight sliders animating at once in a column that does not fit on
   * one screen is not a lesson; the list of four that moved is. Cleared by
   * undo and by the next condition change, the same life as the undo itself.
   */
  let applied: { label: string; text: string }[] | null = $state(null);

  $effect(() => {
    void conditions.value; // any condition change retires the list
    applied = null;
  });

  const optimumTargets = $derived(
    optimum.result
      ? {
          bsKt: optimum.result.result.bsKt.value,
          vmgKt: optimum.result.result.vmgKt.value,
          heelDeg: optimum.result.result.heelDeg.value,
        }
      : undefined,
  );

  /**
   * A pinned trim takes the instrument bar's target slot from the optimum
   * while it is pinned (audit ux-01 M-19). One target per cell is the
   * instrument-cell contract (ADR 0015) and a second one would be a redesign
   * of every cell in the product; a pin is a deliberate "compare with this
   * instead", so it wins the slot and the label says which it is. Unpin and
   * the optimum comes straight back.
   */
  const pinnedTargets = $derived(
    race.pinned
      ? {
          bsKt: race.pinned.result.bsKt.value,
          vmgKt: race.pinned.result.vmgKt.value,
          heelDeg: race.pinned.result.heelDeg.value,
        }
      : undefined,
  );
  const barTarget = $derived(pinnedTargets ?? optimumTargets);
  const barDeltaLabel = $derived(race.pinned ? PINNED_DELTA_LABEL : DEFAULT_DELTA_LABEL);

  const canApply = $derived(optimum.race !== null && !optimum.busy && !optimum.stale);

  function applyOptimum(): void {
    const target = optimum.race;
    if (!target) return;
    track('race.applyOptimum');
    race.remember();
    from = { ...$state.snapshot(race.controls.race) };
    to = { ...$state.snapshot(target) };
    applied = optimum.moved.map((id) => {
      const spec = CONTROLS[id];
      const d = spec.step < 1 ? 1 : 0;
      const at = (v: number) => `${v.toFixed(d)}${spec.unit ? ` ${spec.unit}` : ''}`;
      return {
        label: spec.label,
        text: `${at(from![id as keyof RaceControls])} → ${at(to![id as keyof RaceControls])}`,
      };
    });
    progress.set(0, { duration: 0 });
    void progress.set(1);
  }

  /** Exact, and instant: an undo that eases is an undo you have to wait out. */
  function undoTrim(): void {
    from = to = null;
    applied = null;
    progress.set(1, { duration: 0 });
    race.undo();
  }

  /**
   * A/B compare: the same cleanup as undo — an apply half-tweened into place
   * would keep lerping over the trim just swapped in — but both trims are
   * kept, so pressing it again brings the other one back.
   */
  function abCompare(): void {
    if (!race.previousRace) return;
    from = to = null;
    applied = null;
    progress.set(1, { duration: 0 });
    race.abToggle();
    track('race.abCompare');
  }

  /**
   * Hand the trim on screen to the log form and go there. The entry itself is
   * written on the Log screen, so nothing is saved behind the user's back.
   */
  function logTrim(): void {
    logStoreUi.setDraft({
      date: new Date().toISOString().slice(0, 10),
      seaState: conditions.seaState,
      crewKg: conditions.crewKg,
      race: { ...$state.snapshot(race.controls.race) },
      // The two the solver never saw: the mode being steered and where the
      // crew sat. Notes, not fields, because the model does not read them.
      notes: `Mode: ${MODE_LABELS[race.mode]}. Crew ${FORE_AFT_LABELS[race.crewForeAft]} (not modelled).`,
    });
    router.navigate('log');
  }

  /** Back to the base trim, leaving the condition alone. Undoable like a preset. */
  function resetTrim(): void {
    race.remember();
    applied = null;
    Object.assign(race.controls.race, BASE_RACE);
  }

  // A replay left running after the screen goes away would keep rewriting the
  // condition from a component nobody is looking at.
  $effect(() => () => puffPlayer.cancel());

  let shortcutsOpen = $state(false);

  // The cockpit grid caps itself to the viewport, so the disagreement panel's
  // cell is short and clipped there and full-height everywhere else. No CSS
  // turns a table into a sheet, so the breakpoint is read here (audit ux-03
  // H-03), the same shape DrillView uses for its score sheet.
  let cockpit = $state(false);
  let disagreeOpen = $state(false);
  $effect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const sync = (): void => {
      cockpit = mq.matches;
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  });

  /**
   * `m` / `j` / `h` / `r`: bring a panel into view and put the caret on its
   * first slider. Rig has no slider once the day's tune is committed — it is
   * a table then — so there the scroll is the whole jump.
   */
  function focusPanel(panel: PanelId): void {
    panelSection(panel)?.scrollIntoView({ block: 'nearest' });
    document
      .getElementById(panelControlsId(panel))
      ?.querySelector<HTMLInputElement>('input[type="range"]')
      ?.focus();
  }

  /** The whole shortcut table is in `ui/keys.ts`; this is just the wiring. */
  function onKeydown(e: KeyboardEvent): void {
    const action = keyAction(e, isTypingTarget(e.target));
    if (!action) return;
    if (action.type === 'pointOfSail') race.setPointOfSail(POINTS_OF_SAIL[action.index].id);
    else if (action.type === 'applyOptimum') {
      if (canApply) applyOptimum();
    } else if (action.type === 'undo') undoTrim();
    else if (action.type === 'abCompare') abCompare();
    else if (action.type === 'puffReplay') {
      if (puffPlayer.playing) puffPlayer.cancel();
      else playPuff('gust');
    } else if (action.type === 'focusPanel') focusPanel(action.panel);
    else shortcutsOpen = true;
  }

  $effect(() => {
    const p = progress.current;
    if (!from || !to) return;
    for (const c of TRIM_CONTROLS) {
      const spec = CONTROLS[c];
      // Snapped every frame: an unsnapped lerp puts the readout on 44 % while
      // the range input's thumb sits on the legal 45.
      race.controls.race[c] = snap(from[c] + (to[c] - from[c]) * p, spec.min, spec.max, spec.step);
    }
    if (p === 1) from = to = null;
  });

  /** Which number the coach and the optimum are both chasing. */
  const objectiveId = $derived(raceObjective(conditions.value));
  const objective = $derived(OBJECTIVE_METRIC[objectiveId]);
  const pointOfSail = $derived(
    POINTS_OF_SAIL.find((p) => p.id === nearestPointOfSail(conditions.twaDeg))?.label ??
      'this angle',
  );

  /** The settled-trim line quotes the store's own threshold, not a round number. */
  const settled = `Trim is balanced: no single control gains more than ${GAIN_EPS.toFixed(3)} kt.`;
</script>

<svelte:window onkeydown={onKeydown} />

<!-- The cockpit (ADR 0015): one grid, four panels around the hero, named
     areas per breakpoint. From 1280 px the grid is capped to the viewport and
     the panels scroll inside themselves, so the primary screen never scrolls
     (research §3 principle 4) and every widget keeps its place across tiers
     and sessions (principle 19). -->
<div class="cockpit">
  <div class="head">
    <TopBar title="Race" mode />
    <p class="lede">Trim for the wind in front of you, and see what the move is worth.</p>
    <ConditionsStrip />
  </div>

  <div class="bar">
    {#if race.result}
      <InstrumentBar
        result={race.result}
        twaDeg={conditions.twaDeg}
        objective={objectiveId}
        busy={race.busy}
        target={barTarget}
        deltaLabel={barDeltaLabel}
        history={race.history}
        twsKt={conditions.twsKt}
        coach={race.coach?.text}
      />
    {/if}
  </div>

  <!-- Phone only: the four panels are a scroll apart, so they get a tab strip
       that also says which one you are in. -->
  <PanelTabs />

  <section class="card hero-boat">
    {#if race.result}
      <SailHero result={race.result} twaDeg={conditions.twaDeg} />
    {/if}
  </section>

  <div class="p-main"><Mainsail result={race.result} /></div>
  <!-- One slot, two sails: under the kite the jib is furled and the gennaker
       is what the hand is on, so the Headsail panel becomes the Gennaker panel
       (phase 03). Both keep the `headsail` ids, so `j`, the phone's tab strip
       and the puff replay never learn which sail is up. -->
  <div class="p-jib">
    {#if conditions.sailset === 'asym'}
      <Gennaker result={race.result} />
    {:else}
      <Headsail result={race.result} flying={conditions.sailset === 'jib'} />
    {/if}
  </div>
  <div class="p-helm"><Helm result={race.result} /></div>
  <div class="p-rig"><Rig result={race.result} /></div>

  <!-- The coach line and everything that rewrites the whole trim, in one
       card. Every button in it previews the sliders it would move (phase 05).

       Last in the DOM, bottom of the grid: the three whole-trim buttons used to
       be emitted before every panel, so a keyboard met them — and then the hero
       camera chips — before the first slider, at tab stop 41 (audit ux-03
       H-07). The grid areas keep it exactly where it was on screen. -->
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
      <!-- The one sentence that changes on every solve, so it is the screen's
           status message (audit ux-03 H-08). -->
      <p class="line" role="status">
        {#if race.error}
          Solver error: {race.error}
        {:else if race.coach}
          {race.coach.text}
          {#if race.result}<ConfidenceBadge tier={race.result.vmgKt.tier} />{/if}
        {:else if race.result}
          {settled}
        {:else}
          Solving…
        {/if}
      </p>
    </div>

    <ActionsBar
      {canApply}
      onapply={applyOptimum}
      onab={abCompare}
      onundo={undoTrim}
      onreset={resetTrim}
      onlog={logTrim}
    />

    {#if applied?.length}
      <ul class="moved">
        {#each applied as m (m.label)}
          <li>
            <span class="moved-label">{m.label}</span> <span class="tabular-nums">{m.text}</span>
          </li>
        {/each}
      </ul>
    {/if}

    <details>
      <summary>Why</summary>
      <p>
        At {pointOfSail} the target is {objective}, the same number
        <em>Apply optimum</em> maximises. Sailflow nudges backstay, mainsheet, traveller and jib
        lead one legal step each way, re-solves, and reports the largest gain; anything smaller than {GAIN_EPS.toFixed(
          3,
        )} kt is below the solver's own resolution, so it is not offered as a move.
      </p>
      <p>
        <em>Apply optimum</em> runs the same search over every control the shape layer responds to, searched
        from where your sliders are and from the base tune; it keeps whichever finishes faster. That is
        a local optimum on the control grid, tier B — a direction and a band, not a value to dial in.
        Move a slider and the search runs again, so the ticks always answer the trim on screen. Halyards
        and the inhauler are left alone — they move draft position and entry angle, which the model never
        reads.
      </p>
    </details>
  </section>

  {#if advanced}
    <section class="card disagree">
      {#if cockpit}
        <!-- In the cockpit grid this is a short bottom-band cell with
             `overflow: hidden`, and the full comparison is 1257 px tall: 87 %
             of it was unreachable, so the app asserted a disagreement and
             withheld both numbers and the delta (audit ux-03 H-03). The
             summary row reads inline; the table is a click away. -->
        {@render disagreement(true)}
        <button type="button" class="compare" onclick={() => (disagreeOpen = true)}>
          Full table
        </button>
      {:else}
        <details>
          <summary>Model vs tuning guides</summary>
          {@render disagreement(false)}
        </details>
      {/if}
    </section>
  {/if}
</div>

{#snippet disagreement(compact: boolean)}
  <Panel
    twsKt={conditions.twsKt}
    seaState={conditions.seaState}
    crewKg={conditions.crewKg}
    modelOptimum={model.optimum}
    busy={model.busy}
    stale={model.stale}
    error={model.error}
    {compact}
  />
{/snippet}

<Sheet bind:open={disagreeOpen} title="Model vs tuning guides">
  {#if disagreeOpen}{@render disagreement(false)}{/if}
</Sheet>

<ShortcutsSheet bind:open={shortcutsOpen} />

<style>
  /* ---------------------------------------------------------------- phone */
  /* Below 720 the cockpit is one column, ordered by the `order` block further
     down rather than by DOM order: conditions, hero, the tab strip, the
     instrument bar, the coach and its actions, the four panels. */
  .cockpit {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    min-width: 0;
  }

  .head,
  .bar,
  .insight,
  .disagree {
    min-width: 0;
  }

  .head {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .lede {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--ink-2);
  }

  .hero-boat {
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: var(--space-3);
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

  .moved {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-4);
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .moved-label {
    color: var(--ink);
  }

  details summary {
    font-size: var(--text-sm);
    font-weight: 600;
  }

  /* Only ever rendered inside the cockpit grid, so it wears the cockpit's
     control height rather than the phone's 44 px hit target. */
  .compare {
    flex: none;
    min-height: 28px;
    padding: 0 var(--space-3);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: transparent;
    color: var(--ink-2);
    font-size: var(--text-xs);
    cursor: pointer;
  }

  details p {
    margin: var(--space-2) 0 0;
    font-size: var(--text-sm);
    line-height: 1.55;
    color: var(--ink-2);
  }

  /* ----------------------------------------------------- phone: hero first */
  /* The plan README's phone layout is "same panels stacked, hero first, sticky
     panel tabs", and what shipped put the hero 1045 px down, under a sticky
     strip whose every tab scrolls past it (audit ux-03 H-11). The column is
     flex below 720, so `order` fixes it without touching the DOM — which also
     leaves the desktop grid free to order the same elements its own way. */
  @media (max-width: 719px) {
    .head {
      order: 0;
      gap: var(--space-1);
    }

    /* The phone spent ~600 px of an 844 px screen on chrome before the first
       number (audit ux-03 M-20). Three things go, none of them information:
       the 28 px page title drops to 20 px — the tab bar already names the
       route, in the accent colour, permanently on screen; the lede goes,
       because it is a first-visit sentence occupying two lines on every
       visit thereafter and Drills is one tab away; and the four read-only
       condition chips (TWA, sea state, crew, sail plan) go, because every
       one of them is a *display* of a value the Edit sheet right beside them
       already sets, and TWA is also on the point-of-sail chips above.
       What stays inline is what you touch: the point-of-sail row, the ±1 kt
       wind stepper, Edit, and the committed-forecast chip when there is one.
       ADR 0016's one-screen promise is a desktop promise and is untouched:
       every rule here is inside the phone query. */
    .head :global(h1) {
      font-size: var(--text-lg);
    }

    .lede {
      display: none;
    }

    .head :global([aria-label='Conditions'] span.chip:not(.stepper)) {
      display: none;
    }

    .hero-boat {
      order: 1;
    }

    /* Right under the hero, so the one navigation control on the screen no
       longer sits above the thing it skips past. Still sticky. */
    .cockpit :global(.tabs) {
      order: 2;
    }

    /* The insight card below repeats this sentence verbatim, and carries the
       tier badge and the actions with it, so on the one screen with no room
       to spare the band gives its copy up (audit ux-03 M-17). */
    .bar :global(.verdict) {
      display: none;
    }

    .bar {
      order: 3;
    }

    .insight {
      order: 4;
    }

    .p-main {
      order: 5;
    }

    .p-jib {
      order: 6;
    }

    .p-helm {
      order: 7;
    }

    .p-rig {
      order: 8;
    }

    .disagree {
      order: 9;
    }
  }

  /* --------------------------------------------------------------- tablet */
  /* 720–1023: one column of full-width bands, but wide enough to put the
     panels 2-up under the hero. */
  @media (min-width: 720px) {
    .cockpit {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-template-areas:
        'head head'
        'bar bar'
        'act act'
        'hero hero'
        'main jib'
        'helm rig'
        'dis dis';
      align-items: start;
    }

    .head {
      grid-area: head;
    }

    .bar {
      grid-area: bar;
    }

    .insight {
      grid-area: act;
    }

    .hero-boat {
      grid-area: hero;
    }

    .p-main {
      grid-area: main;
    }

    .p-jib {
      grid-area: jib;
    }

    .p-helm {
      grid-area: helm;
    }

    .p-rig {
      grid-area: rig;
    }

    .disagree {
      grid-area: dis;
    }
  }

  /* -------------------------------------------------------------- desktop */
  /* 1024–1279: what you watch on the left, what you touch on the right. One
     panel per row over there rather than 2-up: split at this width each panel
     is ~210 px, narrower than one slider row wants. */
  @media (min-width: 1024px) {
    .cockpit {
      grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
      grid-template-areas:
        'head head'
        'bar main'
        'hero jib'
        'act helm'
        'dis rig';
      gap: var(--space-4) var(--space-5);
    }
  }

  /* --------------------------------------------------------- cockpit grid */
  /* From 1280 px, the README's layout: conditions rail, instrument bar, the
     hero flanked by the two sail panels, helm and rig beneath, actions along
     the bottom.

     ADR 0016: the grid sizes to its content and the *page* scrolls. It used to
     be capped to the viewport with each panel scrolling inside itself, which
     made "one screen" true by hiding 54–81 % of every panel behind a scroller
     with no affordance (audit ux-03 M-01) — a hidden control is further away
     than a control one wheel-notch down. Every row is `auto` now, every panel
     body is `overflow: visible`, and the grid fills the window past the rail
     up to `--cockpit-max`, so the room goes into the components instead. */
  @media (min-width: 1280px) {
    /* 1280–1599 (a 14" laptop): the hero is a full-width band under the
       instrument bar and the actions strip, and the four panels sit 2×2
       beneath it, each wide enough for controls beside their picture. Three
       columns here gave 435 px panels that stacked to 1000 px each. */
    .cockpit {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      /* Every row takes exactly what is in it; only the hero states a height,
         because it is the one cell with no intrinsic size. */
      /* The band is 48 % of the window, floored at 400 px: on an 864-tall
         laptop that leaves the first sail controls on the first screen
         (ADR 0016), and a wide-landscape hero frames the boat well. */
      grid-template-rows: auto auto auto minmax(400px, 48vh) auto auto auto;
      grid-template-areas:
        'head head'
        'bar bar'
        'act act'
        'hero hero'
        'main jib'
        'helm rig'
        'dis dis';
      gap: var(--space-3);
      align-items: stretch;
    }

    /* prov: assumed 480 px — ADR 0016's floor; a 3D sail below it is a
       thumbnail rather than an instrument. */
    .hero-boat {
      min-height: 480px;
    }

    /* The section-stack prose ("live shape in accent…") is a phone caption;
       in the cockpit the `?` on each cell carries it and the room is for the
       drawing. Kept in the DOM for assistive tech. */
    .p-main :global(figcaption),
    .p-jib :global(figcaption),
    .p-rig :global(figcaption) {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }

    /* From ~1600 px the panel columns are wide enough for `Panel`'s
       three-column step, and a panel stops being the *sum* of its controls,
       its picture and its numbers — around 400 px tall rather than 890. With
       panels that short the hero can span both panel rows instead of taking a
       band of its own, so the five bands share one budget of height: measured
       1959 px of document at 1920×1080 before, 1177 after, with the hero
       507 × 837 rather than 731 × 605 (ADR 0016). */
    @media (min-width: 1600px) {
      .cockpit {
        /* The hero gets the width: it is the thing you look at, and a 3D sail
           in a portrait slot is a thumbnail of one. prov: assumed 1.6fr —
           the owner's call on the first desktop build ("allocate more
           real estate to the 3D and plan section"). */
        /* 504 px is the least a panel can be and still put its picture
           beside its controls (`Panel` steps at a 470 px container plus its
           32 px of padding); everything else is hero. */
        grid-template-columns: minmax(504px, 1fr) minmax(0, 1.6fr) minmax(504px, 1fr);
        grid-template-rows: auto auto auto auto auto auto;
        grid-template-areas:
          'head head head'
          'bar bar bar'
          'act act act'
          'main hero jib'
          'helm hero rig'
          'dis dis dis';
      }
    }

    /* Both pictures side by side whatever the column does. Left to `auto-fit`
       they drop to one column under 252 px and the panel doubles in height,
       which is the opposite of what a narrower column wants. */
    .p-main :global(.pictures) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    /* Title, lede and the conditions rail on one line; the chips wrap only
       when they run out of room, and the hero row pays for it, not the page. */
    .head {
      flex-direction: row;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-2) var(--space-4);
    }

    /* Was `display: none` here, which left the desktop — the default surface,
       and the one Learn opens on — with no statement of what the screen is
       for at all (audit ux-03 M-06). It keeps its row off the hero by staying
       one line: it shrinks and ellipsises inside the header row rather than
       wrapping the row, which is what phase 06 was actually protecting. */
    .lede {
      flex: 1 1 20ch;
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    /* The title row's own furniture at mouse size: the density toggle is the
       only control in it, and a 44 px one turns the rail into two lines. */
    .head :global(.screen-head) {
      min-height: 0;
    }

    .head :global(.segmented button),
    .p-rig :global(.segmented button) {
      min-height: 28px;
    }

    /* The coach line, the actions and the "why" on one row: the bottom band
       is a strip, not a card of prose. */
    .insight {
      flex-direction: row;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-2) var(--space-4);
      padding: var(--space-2) var(--space-3);
    }

    .insight-head {
      flex: 1 1 24ch;
      min-width: 0;
      align-items: center;
    }

    .line {
      font-size: var(--text-sm);
    }

    /* A strip like the actions band beside it: the summary row and the way in
       to the table, on one line (audit ux-03 H-03). */
    .disagree {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: var(--space-1);
      padding: var(--space-2) var(--space-3);
    }

    .disagree :global(.panel.compact) {
      flex: 1;
      min-width: 0;
    }

    /* Shares the verdict's line: the strip is two lines tall — sentence, then
       the three cells — and a third would squeeze the Rig panel above it. */
    .disagree :global(.panel.compact .copy.verdict) {
      padding-right: 88px;
    }

    .disagree .compare {
      position: absolute;
      top: 6px;
      right: var(--space-2);
      min-height: 22px;
      padding: 0 var(--space-2);
    }

    .hero-boat {
      overflow: hidden;
    }

    /* Panels are as tall as what is in them. Nothing clips, nothing scrolls
       inside itself; the page carries the remainder (ADR 0016). */
    .p-main,
    .p-jib,
    .p-helm,
    .p-rig {
      display: flex;
    }

    .p-main :global(.panel),
    .p-jib :global(.panel),
    .p-helm :global(.panel),
    .p-rig :global(.panel) {
      flex: 1;
      overflow: visible;
    }

    /* The caption repeats the chip titles; in the cockpit the hero's height
       is the scarce thing. The text stays in the DOM for assistive tech. */
    .hero-boat :global(.caption) {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }

    /* The cap and the clip are gone with the scroller that needed them (ADR
       0016): a picture that grows with its panel no longer pushes a control
       anywhere, because there is no box for it to be pushed out of. Each
       drawing is `width: 100%; height: auto` inside its own `max-height`, so
       the row is exactly the drawing's aspect and can never letterbox.

       The floor stays. It is not decoration: an auto row track resolved the
       visual's row to zero and every sail-shape drawing rendered in a 0 px box
       while its SVG children measured full size (audit ux-03 H-01), so the
       test that catches a regression is a measured box, and this is the floor
       it measures against.
       prov: assumed 140 px — refuter-verified in ux-03 H-01. */
    .p-main :global(.visual),
    .p-jib :global(.visual),
    .p-rig :global(.visual) {
      min-height: 140px;
    }

    /* Controls first, picture under them, in the columns too narrow for
       `Panel`'s side-by-side steps. `Panel` leads with the picture when it is
       narrow because a thumb is still finding the control; in the cockpit the
       hero is already the thing you are looking at, and what the column is
       for is the sliders. */
    /* Scoped to the widths where `Panel` is still a single stack, so it cannot
       outrank the side-by-side steps on specificity. */
    @container (max-width: 469px) {
      .p-main :global(.panel > .grid),
      .p-jib :global(.panel > .grid),
      .p-helm :global(.panel > .grid),
      .p-rig :global(.panel > .grid) {
        grid-template-areas:
          'controls'
          'visual';
      }

      .p-main :global(.panel > .grid.with-instruments),
      .p-jib :global(.panel > .grid.with-instruments),
      .p-helm :global(.panel > .grid.with-instruments),
      .p-rig :global(.panel > .grid.with-instruments) {
        grid-template-areas:
          'controls'
          'visual'
          'instruments';
      }
    }
  }
</style>
