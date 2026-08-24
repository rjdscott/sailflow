<script lang="ts">
  import type { SailShape, SectionShape } from '../../core/types';
  import { SECTION_LAYOUT as L, sectionPath, twistRelativeDeg } from './geometry';

  let {
    main,
    jib,
  }: {
    main?: SailShape;
    jib?: SailShape;
  } = $props();

  // The path `d` of a Bezier cannot be CSS-transitioned, so a control change
  // simply re-renders the sections. Nothing here animates.
  const ROWS: { key: keyof SailShape; label: string }[] = [
    { key: 'threeQuarter', label: '¾' },
    { key: 'half', label: '½' },
    { key: 'quarter', label: '¼' },
  ];

  const sails = $derived(
    [
      { name: 'Main', shape: main },
      { name: 'Jib', shape: jib },
    ].filter((s): s is { name: string; shape: SailShape } => s.shape !== undefined),
  );

  /** SVG rotates clockwise, so the negative sign twists the leech open (up). */
  function twist(s: SectionShape, ref: SectionShape): number {
    return -twistRelativeDeg(s, ref);
  }

  function pct(v: number, dp = 0): string {
    return `${(v * 100).toFixed(dp)}%`;
  }
</script>

{#if sails.length === 0}
  <p class="empty">No flying shape in this solve yet.</p>
{:else}
  <figure>
    <svg viewBox="0 0 {L.w} {L.h}" role="img" aria-label="Flying shape at three heights">
      {#each sails as sail, si (sail.name)}
        {@const x = L.luffX[si]}
        <!-- One luff line per sail: every section starts on it, so twist reads
             as rotation about the luff rather than as three loose curves. -->
        <line class="luff" x1={x} y1={L.luffTop} x2={x} y2={L.rowY[2]} />

        {#each ROWS as row, ri (row.key)}
          {@const s = sail.shape[row.key]}
          <g transform="translate({x} {L.rowY[ri]})">
            <!-- Reference: this sail's ¼ section, unrotated, behind every row. -->
            <path class="ref" d={sectionPath(sail.shape.quarter, L.chord)} />
            <g transform="rotate({twist(s, sail.shape.quarter)} 0 0)">
              <line class="chord" x1="0" y1="0" x2={L.chord} y2="0" />
              <path class="camber" d={sectionPath(s, L.chord)} />
            </g>
          </g>
        {/each}

        <text class="sail-label" x={x + L.chord / 2} y={L.labelY}>{sail.name}</text>
      {/each}
    </svg>

    <figcaption>
      Live shape in accent, this sail's ¼ section repeated behind it as a reference. Sections are
      rotated by their twist relative to ¼.
    </figcaption>
  </figure>

  <table class="mono">
    <thead>
      <tr>
        <th scope="col">Sail</th>
        <th scope="col">At</th>
        <th scope="col">Draft</th>
        <th scope="col">Pos</th>
        <th scope="col">Twist</th>
      </tr>
    </thead>
    <tbody>
      {#each sails as sail (sail.name)}
        {#each ROWS as row, ri (row.key)}
          {@const s = sail.shape[row.key]}
          <tr class:group={ri === 0}>
            <th scope="row">{ri === 0 ? sail.name : ''}</th>
            <td>{row.label}</td>
            <td>{pct(s.draft, 1)}</td>
            <td>{pct(s.draftPos)}</td>
            <td>{s.twistDeg.toFixed(0)}°</td>
          </tr>
        {/each}
      {/each}
    </tbody>
  </table>
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
    max-height: 340px;
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

  .sail-label {
    fill: var(--ink-2);
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-anchor: middle;
    text-transform: uppercase;
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

  tr.group th,
  tr.group td {
    padding-top: var(--space-2);
  }

  .empty {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--ink-2);
  }
</style>
