<script lang="ts">
  import { cubicOut } from 'svelte/easing';
  import { prefersReducedMotion, Tween } from 'svelte/motion';
  import type { SailShape, SectionShape } from '../../core/types';
  import { SECTION_LAYOUT as L, sectionPath, twistRelativeDeg } from './geometry';

  /**
   * One sail's flying shape at three heights: the ¼ ½ ¾ sections stacked up
   * the luff, each rotated by its twist relative to ¼, with the numbers in a
   * table beside them rather than on the curve.
   *
   * One sail per component since cockpit phase 03 — each sail panel owns its
   * own stack, so the picture sits beside the controls that move it (ADR 0015).
   */
  let {
    sail,
    shape,
    table = true,
  }: {
    sail: 'main' | 'jib';
    shape?: SailShape;
    /** The numbers under the drawing. Off where the panel's cells carry them. */
    table?: boolean;
  } = $props();

  const NAME = { main: 'Main', jib: 'Jib' } as const;

  // A Bezier `d` cannot be CSS-transitioned, so the tween runs on the numbers
  // behind it — draft, draft position, twist — and the path is rebuilt each
  // frame from the eased shape. prov: assumed 250 ms, the same as the plan view.
  // 1 ms rather than 0 under reduced motion: same trick as tokens.css, and it
  // keeps the first frame off a zero divide inside Tween.
  const EASE = {
    duration: () => (prefersReducedMotion.current ? 1 : 250),
    easing: cubicOut,
  };
  /** Tween start for a sail that is not in the solve yet: a flat, untwisted section. */
  const FLAT_SECTION: SectionShape = {
    draft: 0,
    draftPos: 0.5,
    twistDeg: 0,
    entryDeg: 0,
    exitDeg: 0,
  };
  const FLAT: SailShape = {
    quarter: FLAT_SECTION,
    half: FLAT_SECTION,
    threeQuarter: FLAT_SECTION,
  };
  const drawn = Tween.of(() => shape ?? FLAT, EASE);

  const ROWS: { key: keyof SailShape; label: string }[] = [
    { key: 'threeQuarter', label: '¾' },
    { key: 'half', label: '½' },
    { key: 'quarter', label: '¼' },
  ];

  /** SVG rotates clockwise, so the negative sign twists the leech open (up). */
  function twist(s: SectionShape, ref: SectionShape): number {
    return -twistRelativeDeg(s, ref);
  }

  function pct(v: number, dp = 0): string {
    return `${(v * 100).toFixed(dp)}%`;
  }
</script>

{#if !shape}
  <p class="empty">No flying shape in this solve yet.</p>
{:else}
  <figure>
    <svg
      viewBox="0 0 {L.w} {L.h}"
      role="img"
      aria-label="{NAME[sail]} flying shape at three heights"
    >
      <!-- One luff line: every section starts on it, so twist reads as
           rotation about the luff rather than as three loose curves. -->
      <line class="luff" x1={L.luffX} y1={L.luffTop} x2={L.luffX} y2={L.rowY[2]} />

      {#each ROWS as row, ri (row.key)}
        {@const s = drawn.current[row.key]}
        <g transform="translate({L.luffX} {L.rowY[ri]})">
          <!-- Reference: this sail's ¼ section, unrotated, behind every row. -->
          <path class="ref" d={sectionPath(drawn.current.quarter, L.chord)} />
          <g transform="rotate({twist(s, drawn.current.quarter)} 0 0)">
            <line class="chord" x1="0" y1="0" x2={L.chord} y2="0" />
            <path class="camber" d={sectionPath(s, L.chord)} />
          </g>
        </g>
        <text class="row-label" x={L.luffX - 6} y={L.rowY[ri] + 4}>{row.label}</text>
      {/each}
    </svg>

    <figcaption>
      Live shape in accent, the ¼ section repeated behind it as a reference. Sections are rotated by
      their twist relative to ¼.
    </figcaption>
  </figure>

  {#if table}
    <table class="mono">
      <thead>
        <tr>
          <th scope="col">At</th>
          <th scope="col">Draft</th>
          <th scope="col">Pos</th>
          <th scope="col">Twist</th>
        </tr>
      </thead>
      <tbody>
        {#each ROWS as row (row.key)}
          {@const s = shape[row.key]}
          <tr>
            <th scope="row">{row.label}</th>
            <td>{pct(s.draft, 1)}</td>
            <td>{pct(s.draftPos)}</td>
            <td>{s.twistDeg.toFixed(0)}°</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
{/if}

<style>
  figure {
    margin: 0;
  }

  /* viewBox + width:100% + height:auto: the drawing is resolution-independent
     and its box is exactly its own aspect, so it can never clip or letterbox. */
  svg {
    display: block;
    width: 100%;
    height: auto;
    max-height: 260px;
    margin-inline: auto;
  }

  figcaption {
    margin-top: var(--space-2);
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .luff {
    stroke: var(--ink-2);
    stroke-width: 1.5;
  }

  .chord {
    stroke: var(--muted);
    stroke-width: 1;
    stroke-dasharray: 4 3;
  }

  .ref {
    fill: none;
    stroke: var(--muted);
    stroke-width: 2.5;
  }

  .camber {
    fill: none;
    stroke: var(--accent);
    stroke-width: 3;
    stroke-linecap: round;
  }

  .row-label {
    fill: var(--ink-2);
    font-family: var(--font-sans);
    font-size: 12px;
    text-anchor: end;
  }

  /* Numbers live here, never on the curve. */
  table {
    width: 100%;
    margin-top: var(--space-3);
    border-collapse: collapse;
    text-align: right;
  }

  th,
  td {
    padding: 3px 0 3px var(--space-2);
    white-space: nowrap;
  }

  thead th {
    font-weight: 500;
    color: var(--ink-2);
    border-bottom: 1px solid var(--line);
  }

  tbody th {
    text-align: left;
    padding-left: 0;
    font-weight: 600;
    color: var(--ink-2);
  }

  tbody td {
    color: var(--ink);
  }

  .empty {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--ink-2);
  }
</style>
