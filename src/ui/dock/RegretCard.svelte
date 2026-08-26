<script lang="ts">
  import type { DockScore } from '../../core/types';
  import InstrumentCell from '../components/InstrumentCell.svelte';
  import { fmt } from '../format';
  import { sparklinePath, sparklineTicks } from './logic';

  let {
    score,
    busy = false,
    busyNote = 'Scoring…',
    progress = null,
    provisional = false,
  }: {
    score: DockScore | null;
    busy?: boolean;
    /** What the solve is chewing on, when the worker reports no fraction. */
    busyNote?: string;
    /** Laps solved / laps to solve, when the solver is reporting them. */
    progress?: { done: number; total: number } | null;
    /** Scored against a reduced reference grid, so the number can only rise. */
    provisional?: boolean;
  } = $props();

  /* A real fraction beats naming the size of the job, so it replaces it. */
  const scoringNote = $derived(
    progress ? `Scoring ${progress.done} / ${progress.total}…` : busyNote,
  );

  /** User units for the plot box; the SVG scales to the card via viewBox. */
  const W = 240;
  const H = 64;
  const AXIS = 20;

  const path = $derived(score ? sparklinePath(score.perTws, W, H) : '');
  const ticks = $derived(score ? sparklineTicks(score.perTws, W) : []);

  /** The one reference every end of the band is read against (principle 15). */
  const expected = $derived(score ? score.expectedRegretSPerMile.value : 0);

  function gapToExpected(v: number): { text: string; delta: string; label: string } {
    const d = v - expected;
    return {
      text: `${fmt(expected, 1)} s/mi`,
      delta: `${d > 0 ? '+' : d < 0 ? '−' : ''}${fmt(Math.abs(d), 1)}`,
      label: 'to expected',
    };
  }
</script>

<!-- Named by the `lg` cell below rather than by an `h2` above it saying the
     same three words in a second type style (audit ux-03 M-18). -->
<section class="card regret" class:busy aria-busy={busy} aria-label="Expected regret">
  <!-- Same 1 px indeterminate sweep as the instrument bar: a solve in flight
       never moves anything on the page (phase 06, copied deliberately — a
       shared component for four lines of CSS is not worth the indirection). -->
  {#if busy}<span class="progress" aria-hidden="true"></span>{/if}

  {#if score}
    <InstrumentCell
      label="Expected regret"
      id="expectedRegret"
      size="lg"
      unit="s/mi"
      value={fmt(expected, 1)}
      tier={provisional ? 'B' : score.expectedRegretSPerMile.tier}
    />

    {#if provisional}
      <p class="note">
        Provisional &mdash; measured against five reference setups so far, so it can only rise.
        {#if busy}{scoringNote}{/if}
      </p>
    {:else if busy}
      <p class="note">{scoringNote}</p>
    {/if}

    {#if score.expectedRegretSPerMile.band}
      <p class="band tabular-nums">
        band {fmt(score.expectedRegretSPerMile.band[0], 1)}–{fmt(
          score.expectedRegretSPerMile.band[1],
          1,
        )} s/mi
      </p>
    {/if}

    <!-- The two ends of the forecast band and its argmax, on the same cell
         contract as the cockpit: label, value, unit, and a delta that names
         what it is measured against. -->
    <div class="ends">
      <InstrumentCell
        label="At {fmt(score.atMin.twsKt, 0)} kt"
        id="regretAtMin"
        size="sm"
        unit="s/mi"
        value={fmt(score.atMin.regretSPerMile, 1)}
        target={gapToExpected(score.atMin.regretSPerMile)}
      />
      <InstrumentCell
        label="At {fmt(score.atMax.twsKt, 0)} kt"
        id="regretAtMax"
        size="sm"
        unit="s/mi"
        value={fmt(score.atMax.regretSPerMile, 1)}
        target={gapToExpected(score.atMax.regretSPerMile)}
      />
      <InstrumentCell
        label="Worst, at {fmt(score.worst.twsKt, 0)} kt"
        id="regretWorst"
        size="sm"
        unit="s/mi"
        value={fmt(score.worst.regretSPerMile, 1)}
        target={gapToExpected(score.worst.regretSPerMile)}
      />
    </div>

    {#if path}
      <svg
        class="spark"
        viewBox="0 0 {W} {H + AXIS}"
        preserveAspectRatio="none"
        role="img"
        aria-label="Regret across the forecast range, {fmt(score.atMin.twsKt, 0)} to {fmt(
          score.atMax.twsKt,
          0,
        )} knots"
      >
        <line class="baseline" x1="0" y1={H} x2={W} y2={H} />
        <path
          class="curve"
          d={path}
          fill="none"
          stroke-width="1.5"
          vector-effect="non-scaling-stroke"
        />
      </svg>
      <div class="axis" aria-hidden="true">
        {#each ticks as t (t.x)}
          <span
            class="tabular-nums"
            style="left: {(t.x / W) * 100}%; transform: translateX({t.anchor === 'start'
              ? '0'
              : t.anchor === 'middle'
                ? '-50%'
                : '-100%'})"
          >
            {t.label}{t.anchor === 'end' ? ' kt' : ''}
          </span>
        {/each}
      </div>
    {/if}

    <p class="explain">
      What you would give up per mile of windward-leeward against a rig re-tuned for that wind. It
      is the price of committing once, not a mistake.
    </p>
  {:else}
    <!-- The only branch that still needs a heading of its own: with no score
         there is no `lg` cell to carry the card's name. -->
    <h2 class="section-title">Expected regret</h2>
    <p class="explain">{busy ? scoringNote : 'No score yet.'}</p>
  {/if}
</section>

<style>
  .regret {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  /* Was a 40 % opacity fade over the whole card, which put the number it was
     waiting on below 4.5:1. The sweep says "in flight" instead. */
  .regret.busy .ends {
    opacity: 0.75;
  }

  .band,
  .note,
  .explain {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .explain {
    font-size: var(--text-sm);
  }

  .ends {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: var(--space-3) var(--space-4);
    margin-block-start: var(--space-2);
    padding-block-start: var(--space-3);
    border-top: 1px solid var(--line);
  }

  .spark {
    display: block;
    width: 100%;
    height: 84px;
    margin-block-start: var(--space-2);
    overflow: visible;
  }

  .curve {
    stroke: var(--accent);
  }

  .baseline {
    stroke: var(--line-strong);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }

  /* Axis labels sit in HTML, not the SVG: preserveAspectRatio="none" stretches
     the plot to the card width, and it would stretch the glyphs with it. */
  .axis {
    position: relative;
    height: 16px;
    margin-block-start: calc(-1 * var(--space-2));
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .axis span {
    position: absolute;
    top: 0;
    white-space: nowrap;
  }

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
