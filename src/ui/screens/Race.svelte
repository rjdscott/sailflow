<script lang="ts">
  import { cubicOut } from 'svelte/easing';
  import { prefersReducedMotion, Tween } from 'svelte/motion';
  import type { RaceControls } from '../../core/types';
  import { TRIM_CONTROLS } from '../../worker/protocol';
  import ConfidenceBadge from '../components/ConfidenceBadge.svelte';
  import Tabs from '../components/Tabs.svelte';
  import TopBar from '../components/TopBar.svelte';
  import ConditionsStrip from '../race/ConditionsStrip.svelte';
  import ControlPanel from '../race/ControlPanel.svelte';
  import PlanView from '../race/PlanView.svelte';
  import Readouts from '../race/Readouts.svelte';
  import RigElevation from '../race/RigElevation.svelte';
  import SailSections from '../race/SailSections.svelte';
  import { CONTROLS, GAIN_EPS, OBJECTIVE_METRIC, race, raceObjective } from '../race/store.svelte';
  import { snap } from '../format';
  import { nearestPointOfSail, POINTS_OF_SAIL } from '../race/pointOfSail';
  import { optimum, OPTIMUM_REASON, OPTIMUM_TIER } from '../race/optimum.svelte';
  import { conditions } from '../stores/conditions.svelte';
  import { settings } from '../stores/settings.svelte';
  import { rigLock } from '../stores/rigLock.svelte';
  import Panel from '../disagree/Panel.svelte';
  import { ModelOptimumStore } from '../disagree/store.svelte';
  import { getClient } from '../race/client';
  import ShortcutsSheet from '../components/ShortcutsSheet.svelte';
  import { isTypingTarget, keyAction } from '../keys';
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
   * Hand the trim on screen to the log form and go there. The entry itself is
   * written on the Log screen, so nothing is saved behind the user's back.
   */
  function logTrim(): void {
    logStoreUi.setDraft({
      date: new Date().toISOString().slice(0, 10),
      seaState: conditions.seaState,
      crewKg: conditions.crewKg,
      race: { ...$state.snapshot(race.controls.race) },
    });
    router.navigate('log');
  }

  let shortcutsOpen = $state(false);

  /** The whole shortcut table is in `ui/keys.ts`; this is just the wiring. */
  function onKeydown(e: KeyboardEvent): void {
    const action = keyAction(e, isTypingTarget(e.target));
    if (!action) return;
    if (action.type === 'pointOfSail') race.setPointOfSail(POINTS_OF_SAIL[action.index].id);
    else if (action.type === 'applyOptimum') {
      if (canApply) applyOptimum();
    } else if (action.type === 'undo') undoTrim();
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

  const TABS = ['Sections', 'Rig', 'Plan'] as const;
  const TAB_KEY = 'sailflow.race.tab.v1';
  /** Plan carries the telltales, the only visual flow cue (audit ux-01 M-10). */
  const DEFAULT_TAB = TABS.indexOf('Plan');

  function readTab(): number {
    try {
      const raw = localStorage.getItem(TAB_KEY);
      const n = raw === null ? NaN : Number(raw);
      return Number.isInteger(n) && n >= 0 && n < TABS.length ? n : DEFAULT_TAB;
    } catch {
      return DEFAULT_TAB; // private mode, or storage disabled
    }
  }

  let tab = $state(readTab());

  function selectTab(i: number): void {
    tab = i;
    try {
      localStorage.setItem(TAB_KEY, String(i));
    } catch {
      // ignore: no persistence available, the tab still switches
    }
  }

  /** The settled-trim line quotes the store's own threshold, not a round number. */
  const settled = `Trim is balanced: no single control gains more than ${GAIN_EPS.toFixed(3)} kt.`;
</script>

<!-- One definition, two positions: on a phone the coach line leads the page,
     from 720 px the two-column layout puts it beside the controls (M-04). -->
{#snippet insight()}
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
          {#if race.result}<ConfidenceBadge tier={race.result.vmgKt.tier} />{/if}
        {:else if race.result}
          {settled}
        {:else}
          Solving…
        {/if}
      </p>
    </div>
    <div class="actions">
      <button type="button" class="apply" onclick={applyOptimum} disabled={!canApply}>
        Apply optimum
        <ConfidenceBadge tier={OPTIMUM_TIER} reason={OPTIMUM_REASON} />
      </button>
      {#if race.previousRace}
        <button type="button" class="undo" onclick={undoTrim}>Back to my trim</button>
      {/if}
      <button type="button" class="undo" onclick={logTrim}>Log this trim</button>
      {#if optimum.busy || optimum.stale}
        <span class="hint">Searching…</span>
      {:else if optimum.error}
        <span class="hint">No optimum here: {optimum.error}</span>
      {:else if optimum.result && optimum.moved.length === 0}
        <span class="hint">Already there — nothing the model would move.</span>
      {/if}
    </div>
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
{/snippet}

<svelte:window onkeydown={onKeydown} />

<TopBar title="Race" mode />

<p class="lede">
  Trim the boat for the wind in front of you and see what it costs: Sailflow solves the same rig the
  Dock committed, tells you the one move worth making, and shows how much it is worth.
</p>

<ConditionsStrip />

<div class="screen">
  <div class="col-primary stack">
    <!-- Phone: the instruction comes before the picture. -->
    <div class="coach-sm">{@render insight()}</div>

    <!-- Phone and tablet: hero readouts, then one tabbed picture card. -->
    <div class="lg-hide">
      {#if race.result}
        <Readouts
          result={race.result}
          twaDeg={conditions.twaDeg}
          objective={objectiveId}
          variant="hero"
          busy={race.busy}
          target={optimumTargets}
        />
      {/if}
    </div>

    <section class="card lg-hide">
      <Tabs
        tabs={TABS}
        bind:selected={() => tab, (i) => selectTab(i)}
        ariaLabel="Pictures"
        idPrefix="pic"
      />

      <div
        class="pane"
        role="tabpanel"
        id="pic-pane-0"
        aria-labelledby="pic-tab-0"
        tabindex="0"
        hidden={tab !== 0}
      >
        <SailSections main={race.result?.shape.main} jib={race.result?.shape.jib} />
      </div>
      <div
        class="pane"
        role="tabpanel"
        id="pic-pane-1"
        aria-labelledby="pic-tab-1"
        tabindex="0"
        hidden={tab !== 1}
      >
        {#if race.result}<RigElevation rig={race.result.rig} />{/if}
      </div>
      <div
        class="pane"
        role="tabpanel"
        id="pic-pane-2"
        aria-labelledby="pic-tab-2"
        tabindex="0"
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
          objective={objectiveId}
          variant="strip"
          busy={race.busy}
          target={optimumTargets}
        />
      {/if}
    </div>

    <div class="coach-md">{@render insight()}</div>

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
            stale={model.stale}
            error={model.error}
          />
        </details>
      </section>
    {/if}
  </div>
</div>

<ShortcutsSheet bind:open={shortcutsOpen} />

<style>
  /* Same lede as the drills list: one line, before the instrument. */
  .lede {
    margin: 0 0 var(--space-4);
    font-size: var(--text-sm);
    color: var(--ink-2);
    max-width: 68ch;
  }

  .pane[hidden] {
    display: none;
  }

  /* The coach card renders in both columns; the breakpoint picks one. 720 px is
     where .screen becomes two columns, so it is this pair's breakpoint, not the
     1024 px of .lg-only/.lg-hide. */
  .coach-md {
    display: none;
  }

  @media (min-width: 720px) {
    .coach-sm {
      display: none;
    }

    .coach-md {
      display: block;
    }
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

  /* The boat is the thing you watch while you drag a slider, so it owns the
     card's height and nothing else in it gets a minimum. PlanView crops its
     own viewBox to the hull and sizes its own svg, which is what takes this
     card from ~660 px to ~430 px at 1440×900 (owner feedback, 2026-08-25) —
     enough that Sail sections and Rig elevation sit below it unscrolled. */

  /* Between 1024 and 1280 the primary column is too narrow to read two
     diagrams side by side, so they stack instead of shrinking. */
  @media (max-width: 1279px) {
    .pic-pair {
      grid-template-columns: 1fr;
    }
  }

  /* ponytail: static, not sticky. Sticky in a flex column slid over the
     slider rows beneath it (audit ux-01 H-02). Pin the whole primary column
     instead if the readouts must stay in view. */
  .metrics-dock {
    position: static;
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

  .actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-3);
  }

  .apply,
  .undo {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--hit-min);
    padding: 0 var(--space-3);
    border-radius: var(--radius);
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
  }

  .apply {
    border: 1px solid var(--accent);
    background: var(--accent);
    color: var(--on-accent);
  }

  .apply:disabled {
    border-color: var(--line-strong);
    background: transparent;
    color: var(--ink-2);
    cursor: default;
  }

  .undo {
    border: 1px solid var(--line-strong);
    background: transparent;
    color: var(--ink);
  }

  .hint {
    font-size: var(--text-xs);
    color: var(--ink-2);
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
    font-size: var(--text-sm);
    font-weight: 600;
  }

  details p {
    margin: var(--space-2) 0 0;
    font-size: var(--text-sm);
    line-height: 1.55;
    color: var(--ink-2);
  }
</style>
