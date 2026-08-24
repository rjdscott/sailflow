<script lang="ts">
  import type { DockScore } from '../../core/types';
  import ConfidenceBadge from '../components/ConfidenceBadge.svelte';
  import { fmt } from '../format';
  import { sparklinePath, sparklineTicks } from './logic';

  let { score, busy = false }: { score: DockScore | null; busy?: boolean } = $props();

  /** User units for the plot box; the SVG scales to the card via viewBox. */
  const W = 240;
  const H = 64;
  const AXIS = 20;

  const path = $derived(score ? sparklinePath(score.perTws, W, H) : '');
  const ticks = $derived(score ? sparklineTicks(score.perTws, W) : []);
</script>

<section class="card" class:busy aria-busy={busy}>
  <h2 class="section-title">Expected regret</h2>

  {#if score}
    <div class="hero">
      <p class="hero-number">
        {fmt(score.expectedRegretSPerMile.value, 1)}<span class="unit">s/mi</span>
      </p>
      <ConfidenceBadge tier={score.expectedRegretSPerMile.tier} />
    </div>
    {#if score.expectedRegretSPerMile.band}
      <p class="band tabular-nums">
        band {fmt(score.expectedRegretSPerMile.band[0], 1)}–{fmt(
          score.expectedRegretSPerMile.band[1],
          1,
        )} s/mi
      </p>
    {/if}

    <div class="ends">
      <div class="mini">
        <span class="mini-label tabular-nums">at {fmt(score.atMin.twsKt, 0, 'kt')}</span>
        <span class="mini-value tabular-nums">{fmt(score.atMin.regretSPerMile, 1)} s/mi slower</span
        >
      </div>
      <div class="mini">
        <span class="mini-label tabular-nums">at {fmt(score.atMax.twsKt, 0, 'kt')}</span>
        <span class="mini-value tabular-nums">{fmt(score.atMax.regretSPerMile, 1)} s/mi slower</span
        >
      </div>
    </div>

    <p class="worst tabular-nums">
      Worst case {fmt(score.worst.twsKt, 0, 'kt')}: {fmt(score.worst.regretSPerMile, 1)} s/mi slower than
      a rig tuned for it
    </p>

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
    <p class="explain">{busy ? 'Scoring…' : 'No score yet.'}</p>
  {/if}
</section>

<style>
  .card.busy {
    opacity: 0.6;
  }

  .hero {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
  }

  .hero-number {
    margin: 0;
  }

  .band {
    margin: var(--space-1) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .ends {
    display: flex;
    gap: var(--space-6);
    flex-wrap: wrap;
    margin-block-start: var(--space-3);
  }

  .mini {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .mini-label {
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .mini-value {
    font-size: var(--text-md);
    color: var(--ink);
  }

  .worst {
    margin: var(--space-3) 0 0;
    font-size: var(--text-sm);
    color: var(--warn);
  }

  .spark {
    display: block;
    width: 100%;
    height: 84px;
    margin-block-start: var(--space-3);
    overflow: visible;
  }

  .curve {
    stroke: var(--accent);
  }

  .baseline {
    stroke: var(--line, color-mix(in srgb, var(--ink-2) 25%, transparent));
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
</style>
