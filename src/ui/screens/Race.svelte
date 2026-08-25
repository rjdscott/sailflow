<script lang="ts">
  import { cubicOut } from 'svelte/easing';
  import { prefersReducedMotion, Tween } from 'svelte/motion';
  import type { RaceControls } from '../../core/types';
  import { TRIM_CONTROLS } from '../../worker/protocol';
  import ConfidenceBadge from '../components/ConfidenceBadge.svelte';
  import TopBar from '../components/TopBar.svelte';
  import ActionsBar from '../race/ActionsBar.svelte';
  import ConditionsStrip from '../race/ConditionsStrip.svelte';
  import Headsail from '../race/panels/Headsail.svelte';
  import Helm from '../race/panels/Helm.svelte';
  import Mainsail from '../race/panels/Mainsail.svelte';
  import PanelTabs from '../race/PanelTabs.svelte';
  import Rig from '../race/panels/Rig.svelte';
  import InstrumentBar from '../race/InstrumentBar.svelte';
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
        target={optimumTargets}
        history={race.history}
        twsKt={conditions.twsKt}
        coach={race.coach?.text}
      />
    {/if}
  </div>

  <!-- The coach line and everything that rewrites the whole trim, in one
       card. Every button in it previews the sliders it would move (phase 05). -->
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

  <!-- Phone only: the four panels are a scroll apart, so they get a tab strip
       that also says which one you are in. -->
  <PanelTabs />

  <section class="card hero-boat">
    {#if race.result}
      <SailHero result={race.result} twaDeg={conditions.twaDeg} />
    {/if}
  </section>

  <div class="p-main"><Mainsail result={race.result} /></div>
  <div class="p-jib">
    <Headsail result={race.result} flying={conditions.sailset === 'jib'} />
  </div>
  <div class="p-helm"><Helm result={race.result} /></div>
  <div class="p-rig"><Rig result={race.result} /></div>

  {#if advanced}
    <section class="card disagree">
      <details>
        <summary>Model vs tuning guides</summary>
        <Panel
          twsKt={conditions.twsKt}
          seaState={conditions.seaState}
          crewKg={conditions.crewKg}
          modelOptimum={model.optimum}
          busy={model.busy}
          stale={model.stale}
          error={model.error}
        />
      </details>
    </section>
  {/if}
</div>

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
    }

    .hero-boat {
      order: 1;
    }

    /* Right under the hero, so the one navigation control on the screen no
       longer sits above the thing it skips past. Still sticky. */
    .cockpit :global(.tabs) {
      order: 2;
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
     the bottom. The grid is capped to the viewport and the panels scroll
     inside themselves, which is what makes "one screen" true at 1280×720
     without hiding a control (research §3 principle 4).
     prov: assumed 56 px of chrome — the shell's own padding-block (2 × 24 px)
     plus a hairline, the only page furniture outside this grid. */
  @media (min-width: 1280px) {
    .cockpit {
      --cockpit-chrome: 56px;
      height: calc(100dvh - var(--cockpit-chrome));
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr) minmax(0, 1fr);
      /* The hero row takes what the viewport leaves, never under 300 px;
         the Helm/Rig row gets the rest and scrolls inside. prov: assumed
         floors — a 3D sail under 300 px is a thumbnail, not an instrument. */
      grid-template-rows: auto auto minmax(300px, 1fr) minmax(150px, 0.55fr) auto;
      grid-template-areas:
        'head head head'
        'bar bar bar'
        'main hero jib'
        'helm helm rig'
        'act act dis';
      gap: var(--space-3);
      align-items: stretch;
    }

    /* A short window (a 720-tall laptop with browser chrome) cannot hold five
       bands and a hero worth looking at. Below 800 px the page scrolls and
       the hero keeps a fixed height instead; the one-screen promise is for
       900 px and up. prov: assumed 800 px threshold. */
    @media (max-height: 799px) {
      .cockpit {
        height: auto;
        grid-template-rows: auto auto 360px auto auto;
      }
    }

    /* Title, lede and the conditions rail on one line; the chips wrap only
       when they run out of room, and the hero row pays for it, not the page. */
    .head {
      flex-direction: row;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-2) var(--space-4);
    }

    /* The rail is chips, and chips are what the cockpit reads. The sentence
       is for someone arriving on a phone; here it is a wrapped paragraph
       wedged between the title and the wind, and the row it costs comes
       straight off the hero. */
    .lede {
      display: none;
    }

    /* The title row's own furniture at mouse size: the density toggle is the
       only control in it, and a 44 px one turns the rail into two lines. */
    .head :global(.screen-head) {
      min-height: 0;
    }

    .head :global(.segmented button) {
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
      overflow: hidden;
    }

    .insight-head {
      flex: 1 1 24ch;
      min-width: 0;
      align-items: center;
    }

    .line {
      font-size: var(--text-sm);
    }

    .disagree {
      padding: var(--space-2) var(--space-3);
      overflow: hidden;
    }

    .hero-boat {
      overflow: hidden;
    }

    /* Panels take their row's height and scroll their own body. The heading
       stays put, so a panel never loses its name. */
    .p-main,
    .p-jib,
    .p-helm,
    .p-rig {
      display: flex;
      min-height: 0;
    }

    .p-main :global(.panel),
    .p-jib :global(.panel),
    .p-helm :global(.panel),
    .p-rig :global(.panel) {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .p-main :global(.panel > .grid),
    .p-jib :global(.panel > .grid),
    .p-helm :global(.panel > .grid),
    .p-rig :global(.panel > .grid) {
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      overscroll-behavior: contain;
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

    /* A picture that grew with its panel would push the controls out of the
       scroll box; these are glance cues, so they are capped.
       prov: assumed 220 px — two section stacks side by side stay legible. */
    .p-main :global(.visual),
    .p-jib :global(.visual),
    .p-rig :global(.visual) {
      max-height: 220px;
      overflow: hidden;
    }

    /* Controls first, picture under them. `Panel` leads with the picture when
       it is narrow because a thumb is still finding the control; in the
       cockpit the hero is already the thing you are looking at, and what the
       column is for is the sliders. */
    .p-main :global(.panel > .grid > .controls),
    .p-jib :global(.panel > .grid > .controls),
    .p-helm :global(.panel > .grid > .controls),
    .p-rig :global(.panel > .grid > .controls) {
      order: 0;
    }

    .p-main :global(.panel > .grid > .visual),
    .p-jib :global(.panel > .grid > .visual),
    .p-helm :global(.panel > .grid > .visual),
    .p-rig :global(.panel > .grid > .visual) {
      order: 1;
    }
  }
</style>
