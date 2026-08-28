<script module lang="ts">
  /**
   * One convention everywhere: + means the target is faster than you (ux-02
   * M-09). It used to live in a comment and nowhere the reader could see it,
   * so a leading `+` read as good news beside "0.29 kt below target" (audit
   * ux-03 M-05). The label carries the direction now, and the BSP and VMG
   * explainer sheets say it in prose.
   */
  export const DEFAULT_DELTA_LABEL = 'to optimum (+ = optimum is faster)';

  /** The same sentence about a pinned trim (audit ux-01 M-19). */
  export const PINNED_DELTA_LABEL = 'to pinned trim (+ = the pinned trim is faster)';
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import { prefersReducedMotion, Tween } from 'svelte/motion';
  import type { Condition, SolveResult } from '../../core/types';
  import { fmt, targetOf } from '../format';
  import ConditionsBand from './ConditionsBand.svelte';
  import InstrumentCell from '../components/InstrumentCell.svelte';
  import BulletGauge from '../components/BulletGauge.svelte';
  import Sheet from '../components/Sheet.svelte';
  import { READOUT_EXPLAIN } from '../explain';
  import { heelBands, HEEL_SCALE_MAX, HELM_TARGET } from '../instruments/gauges';
  import { settings } from '../stores/settings.svelte';
  import type { History } from '../instruments/history';
  import type { Objective } from './store.svelte';
  import { verdict } from './verdict';

  /**
   * The cockpit's instrument band (ADR 0015, research §4 patterns 2-3):
   * measurements across the top, the two gauges that only mean anything
   * together underneath, and one sentence of verdict along the bottom.
   *
   * Every number goes through the one instrument-cell contract, and the
   * density tier is a `data-tier` attribute on the root, not three component
   * trees — learn drops TWA and the helm bar and leads with the verdict,
   * analyse adds the two leech readings.
   */
  let {
    result,
    condition,
    conditionsEditable = true,
    objective,
    busy = false,
    target,
    history,
    coach,
    targetWithheld = false,
    deltaLabel = DEFAULT_DELTA_LABEL,
  }: {
    result: SolveResult;
    /** What the world is doing: the right half draws it, and edits it in place. */
    condition: Condition;
    /** A drill sets its own condition, so there it is shown and not offered. */
    conditionsEditable?: boolean;
    /** What "faster" means here; downwind VMG is negative towards the mark. */
    objective: Objective;
    busy?: boolean;
    /** What the solver's optimal trim reaches at this condition, if it has answered. */
    target?: { bsKt?: number; vmgKt?: number; heelDeg?: number };
    /** Recent converged solves at this condition, for the trend lines. */
    history: History;
    /** The coach line's probe sentence, the verdict's fallback cue. */
    coach?: string;
    /** No target because a drill is holding the answer back, not because the
     *  solver is still working (audit ux-03 M-02). */
    targetWithheld?: boolean;
    /**
     * What the Δ on every cell is measured against, in words. A prop because
     * `target` is not always the solver's optimum any more: with a trim pinned
     * it is the pinned trim, and a delta whose label still said "to optimum"
     * would be a lie in the one place the reader looks for the meaning.
     */
    deltaLabel?: string;
  } = $props();

  const vmgBetter = $derived(objective === 'vmgDown' ? ('less' as const) : ('more' as const));
  const gapTo = (
    value: number,
    to: number | undefined,
    decimals: number,
    better: 'more' | 'less' = 'more',
  ) => {
    const t = targetOf(value, to, decimals, better);
    return t && { ...t, label: deltaLabel };
  };

  /**
   * `History` is a plain buffer, not a rune, so nothing here would re-read it
   * on its own. It can only have grown when a new `result` arrived, which is
   * exactly the dependency this re-reads it on.
   */
  const trend = $derived.by(() => {
    void result;
    return { bs: history.series('bs'), vmg: history.series('vmg') };
  });

  const heel = $derived(heelBands(condition.twsKt));
  const line = $derived(verdict({ result, target, objective, coach, targetWithheld }));

  /**
   * The three primary numbers travel to their new value rather than jumping to
   * it: changing the wind on the right half and watching the left half move
   * *is* the lesson the screen teaches (audit ux-04 H-01 rule 4), and a number
   * that teleports reads as a re-render rather than as an effect. One tween of
   * the three, the same `Tween` the apply animation uses, and it collapses to
   * an instant set when the reader has asked for less motion.
   * prov: assumed 260 ms — long enough to be a movement, short enough that a
   * slider drag's next solve is not queueing behind it.
   */
  const TWEEN_MS = 260;
  const reduceMotion = (): boolean =>
    settings.motion === 'off' || (settings.motion !== 'on' && prefersReducedMotion.current);
  const numbers = (): { bs: number; pct: number; vmg: number } => ({
    bs: result.bsKt.value,
    pct: result.instruments.pctPolar.value,
    vmg: result.vmgKt.value,
  });
  const shown = new Tween(
    // The first solve is where the tween starts, not something it travels to:
    // a band that spun up from zero on load would read as a gauge test.
    untrack(numbers),
    // The app's own Motion setting, not just the OS one: `off` in More kills
    // CSS animation through `data-motion`, which a JS tween never sees, and a
    // reader who asked for no motion should not get numbers that travel
    // (audit ux-02 L-03's setting, applied to the one animation that is not
    // CSS).
    { duration: () => (reduceMotion() ? 1 : TWEEN_MS), easing: cubicOut },
  );
  $effect(() => {
    void shown.set(numbers());
  });

  let explaining: string | null = $state(null);
  let sheetOpen = $state(false);

  const TITLES: Record<string, string> = {
    bsp: 'BSP',
    pctPolar: '% polar',
    vmg: 'VMG',
    heel: 'Heel',
    helm: 'Helm load',
    leechStall: 'Main leech stall',
    jibStripe: 'Jib leech stripe',
    tws: 'True wind speed',
    twa: 'True wind angle',
    sea: 'Sea state',
    crew: 'Crew weight',
    sailset: 'Sail set',
  };

  function explain(id: string): void {
    explaining = id;
    sheetOpen = true;
  }

  /**
   * Phone only: the band keeps BSP · %POLAR · VMG · HEEL and puts the rest
   * behind this. Four cells and a gauge are what fits above the fold on a
   * 390 px screen; the others are a tap away rather than a scroll away.
   * The extras are hidden by CSS at this width only, so every other width
   * has the whole band and this button is not there at all.
   */
  let more = $state(false);

  /**
   * One announcement per settled solve (audit ux-03 H-08). Everything on this
   * screen changes silently otherwise: `o`, a point-of-sail key and a puff
   * replay all move focus nowhere, so a screen-reader user was never told the
   * model had answered.
   *
   * Debounced, and skipped while a solve is in flight: a slider drag re-solves
   * sixty times, and a live region that reads every frame is noise rather than
   * a status. The three numbers are the ones the whole screen is for.
   */
  const ANNOUNCE_MS = 700;
  let announce = $state('');
  $effect(() => {
    if (busy) return;
    const text =
      `${fmt(result.bsKt.value, 1)} knots boat speed, ` +
      `${fmt(result.instruments.pctPolar.value, 0)} percent of polar, ` +
      `VMG ${fmt(result.vmgKt.value, 2)} knots.`;
    const timer = setTimeout(() => (announce = text), ANNOUNCE_MS);
    return () => clearTimeout(timer);
  });
</script>

<!-- The band sizes off the column it is mounted in, not the viewport: on Drills
     it lives in a ~500 px secondary column, where a viewport-width media query
     threw the verdict and two gauges outside its own `overflow: hidden`
     (audit ux-03 H-02). A container query cannot ask about the element that
     declares it, so the containment lives on this wrapper. -->
<div class="bar-host">
  <section class="card bar" class:more class:stale={!result.converged}>
    {#if busy}<span class="progress" aria-hidden="true"></span>{/if}

    <div class="halves">
      <!-- Left: what the boat is doing. Right: what the world is doing, and
           every value over there is the control that sets it (ADR 0021). -->
      <div class="boat" role="group" aria-label="Boat">
        <div class="cells">
          <InstrumentCell
            label="BSP"
            id="bsp"
            size="lg"
            unit="kt"
            value={fmt(shown.current.bs, 1)}
            tier={result.bsKt.tier}
            target={gapTo(result.bsKt.value, target?.bsKt, 1)}
            trend={trend.bs}
            onexplain={explain}
          />
          <InstrumentCell
            label="%POLAR"
            id="pctPolar"
            size="lg"
            unit="%"
            value={fmt(shown.current.pct, 0)}
            tier={result.instruments.pctPolar.tier}
            onexplain={explain}
          />
          <InstrumentCell
            label="VMG"
            id="vmg"
            size="lg"
            unit="kt"
            value={fmt(shown.current.vmg, 2)}
            tier={result.vmgKt.tier}
            target={gapTo(result.vmgKt.value, target?.vmgKt, 2, vmgBetter)}
            trend={trend.vmg}
            onexplain={explain}
          />

          <!-- "More readings", not "More": the bottom nav's fifth destination is
           also called "More" and is on screen at the same time on a phone, and
           a bare pill said nothing about what is behind it (audit ux-03 M-19). -->
          <button
            type="button"
            class="more-btn"
            aria-expanded={more}
            onclick={() => (more = !more)}
          >
            {more ? 'Fewer readings' : 'More readings'}<span aria-hidden="true" class="chev"
              >{more ? '▴' : '▾'}</span
            >
          </button>
        </div>

        <!-- Side by side on purpose: the Speed Guide's point is that helm feel only
         tells the truth while heel is steady, so a helm bar without a heel gauge
         beside it is a cue that lies (research §2.3). -->
        <div class="gauges">
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
          <div class="race-only phone-extra">
            <BulletGauge
              label="HELM"
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
          </div>
        </div>

        <div class="cells analyse-only phone-extra">
          <InstrumentCell
            label="LEECH STALL"
            id="leechStall"
            size="sm"
            unit="%"
            value={fmt(result.instruments.leechStallFrac.value * 100, 0)}
            tier={result.instruments.leechStallFrac.tier}
            onexplain={explain}
          />
          {#if result.instruments.jibLeechStripe}
            <InstrumentCell
              label="JIB STRIPE"
              id="jibStripe"
              size="sm"
              value={fmt(result.instruments.jibLeechStripe.value, 1)}
              tier={result.instruments.jibLeechStripe.tier}
              onexplain={explain}
            />
          {/if}
        </div>
      </div>

      <ConditionsBand
        {condition}
        awaDeg={result.aero.awaDeg}
        editable={conditionsEditable}
        onexplain={explain}
      />
    </div>

    <p class="verdict">{line}</p>

    <!-- Read out, not drawn: the cells beside it already show these three, and
         announcing each one as it lands would talk over the drag. -->
    <p class="sr-only" role="status">{announce}</p>

    <Sheet bind:open={sheetOpen} title={explaining ? (TITLES[explaining] ?? '') : ''}>
      <p class="explainer">{explaining ? READOUT_EXPLAIN[explaining] : ''}</p>
    </Sheet>
  </section>
</div>

<style>
  .bar-host {
    container-type: inline-size;
    min-width: 0;
  }

  .bar {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  /* The two halves of the band (ADR 0021). Stacked, the world comes first: it
     is what you set before you read what the boat did with it, and on a phone
     the top of the band is the only part above the fold. `order` rather than
     DOM order, so the keyboard still meets the boat's numbers where a reader
     of the desktop layout meets them — left, then right. */
  .halves {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-width: 0;
  }

  .boat {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-width: 0;
  }

  .halves > :global(.conditions) {
    order: -1;
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--line);
  }

  .cells {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
    gap: var(--space-3) var(--space-4);
  }

  .gauges {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: var(--space-3) var(--space-4);
    padding-top: var(--space-3);
    border-top: 1px solid var(--line);
  }

  /* Phone: BSP · %POLAR · VMG · HEEL, and the rest behind the button. The
     collapsed rule is scoped to this width, so no other layout can lose a
     reading to it. */
  .more-btn {
    display: none;
    align-self: center;
    min-height: var(--hit-min);
    padding: 0 var(--space-3);
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    background: transparent;
    color: var(--ink-2);
    font-size: var(--text-xs);
    cursor: pointer;
  }

  .chev {
    margin-left: var(--space-1);
    color: var(--accent);
  }

  @media (max-width: 719px) {
    .more-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .bar:not(.more) .phone-extra {
      display: none;
    }
  }

  /* Desktop cockpit: the whole band on one line — measurements, the pair of
     gauges, then the verdict — so the instrument row costs ~90 px of a
     720 px screen instead of ~190 (research §4 pattern 2). Keyed on the band's
     own width, not the viewport's: this is what fits when the band has ~1000 px
     to itself, which the Drills column never has (audit ux-03 H-02). */
  @container (min-width: 1000px) {
    .bar {
      padding: var(--space-3) var(--space-4);
    }

    /* The 50/50 split: boat left, world right, one 1 px divider between them
       and the verdict along the bottom of both (ADR 0021's layout contract). */
    .halves {
      flex-direction: row;
      align-items: center;
      gap: var(--space-4);
    }

    .boat {
      flex: 1 1 50%;
      flex-direction: row;
      align-items: center;
      gap: var(--space-4);
    }

    .halves > :global(.conditions) {
      order: 0;
      flex: 1 1 50%;
      padding-bottom: 0;
      padding-left: var(--space-4);
      border-bottom: none;
      border-left: 1px solid var(--line);
    }

    /* Flex, not the auto-fit grid: an auto-fit track list inside a flex item
       has no definite width to fit against and collapses to one column —
       which is the instrument band as a tower, 360 px of a 720 px screen. */
    .cells {
      display: flex;
      flex: 1;
      align-items: center;
      gap: var(--space-4);
      min-width: 0;
    }

    .gauges {
      display: flex;
      flex: 0 1 260px;
      gap: var(--space-4);
      padding-top: 0;
      padding-left: var(--space-4);
      border-top: none;
      border-left: 1px solid var(--line);
    }

    .gauges > * {
      flex: 1;
      min-width: 0;
    }

    .verdict {
      min-width: 0;
      font-size: var(--text-sm);
    }
  }

  /* With a full monitor behind it the band has ~1800 px and the three primary
     readings are still set at the size they take on a 390 px phone. The
     numbers are what you read at a glance from a metre away, so they take the
     room (ADR 0016). prov: assumed 1400 px / 44 px — the numbers grow until
     the boat half, which is now half the band rather than all of it (ADR
     0021), stops fitting its three readings and two gauges on one line. */
  @container (min-width: 1400px) {
    .cells :global(.hero-number) {
      font-size: clamp(var(--text-xl), 2.4cqw, 44px);
    }

    .gauges {
      flex: 0 1 300px;
    }

    .verdict {
      font-size: var(--text-md);
    }
  }

  .verdict {
    margin: 0;
    font-size: var(--text-md);
    color: var(--ink);
  }

  .explainer {
    margin: 0;
    font-size: var(--text-md);
    line-height: 1.55;
    color: var(--ink);
  }

  /* One attribute on the root picks the density (ADR 0015). Learn drops the
     angle you set and the helm bar you cannot feel, and reads the verdict
     first; analyse is the only tier that gets the two leech readings. */
  .analyse-only {
    display: none;
  }

  :global([data-tier='analyse']) .analyse-only {
    display: grid;
  }

  :global([data-tier='learn']) .race-only {
    display: none;
  }

  :global([data-tier='learn']) .verdict {
    order: -1;
    font-size: var(--text-lg);
    font-weight: 600;
  }

  .stale {
    opacity: 0.75;
  }

  /* 1 px indeterminate line, absolutely positioned: a solve in flight never
     moves anything on the page. */
  .progress {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
    background-size: 40% 100%;
    background-repeat: no-repeat;
    animation: sweep 1.1s linear infinite;
  }

  @keyframes sweep {
    from {
      background-position: -40% 0;
    }
    to {
      background-position: 140% 0;
    }
  }
</style>
