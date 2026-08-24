<script lang="ts">
  import type { SailShape, SectionShape } from '../../core/types';
  import { sectionPath, tickEnd, twistRelativeDeg } from './geometry';

  let {
    main,
    jib,
  }: {
    main?: SailShape;
    jib?: SailShape;
  } = $props();

  // The path `d` of a Bezier cannot be CSS-transitioned, so a control change
  // simply re-renders the sections. Nothing here animates.
  const CHORD = 100;
  const TICK = 16;
  const ROWS: { key: keyof SailShape; label: string; y: number }[] = [
    { key: 'threeQuarter', label: '¾', y: 10 },
    { key: 'half', label: '½', y: 72 },
    { key: 'quarter', label: '¼', y: 134 },
  ];

  const sails = $derived(
    [
      { name: 'Main', shape: main },
      { name: 'Jib', shape: jib },
    ].filter((s): s is { name: string; shape: SailShape } => s.shape !== undefined),
  );

  function entry(s: SectionShape) {
    return tickEnd({ x: 0, y: 0 }, s.entryDeg, TICK, -1);
  }

  function exit(s: SectionShape) {
    return tickEnd({ x: CHORD, y: 0 }, s.exitDeg, TICK, 1);
  }
</script>

<figure>
  <figcaption>
    Flying shape at ¼, ½, ¾ height. Sections are rotated by their twist relative to the ¼ section;
    ticks are entry and exit angle.
  </figcaption>

  {#if sails.length === 0}
    <p class="empty">No flying shape in this solve yet.</p>
  {:else}
    <div class="pair">
      {#each sails as sail (sail.name)}
        <div class="sail">
          <h3>{sail.name}</h3>
          <svg viewBox="-26 -14 152 194" role="img" aria-label="{sail.name} sections">
            {#each ROWS as row (row.key)}
              {@const s = sail.shape[row.key]}
              <g
                transform="translate(0 {row.y}) rotate({twistRelativeDeg(
                  s,
                  sail.shape.quarter,
                )} 0 0)"
              >
                <line class="chord" x1="0" y1="0" x2={CHORD} y2="0" />
                <path class="camber" d={sectionPath(s, CHORD)} />
                <line class="tick" x1="0" y1="0" x2={entry(s).x} y2={entry(s).y} />
                <line class="tick" x1={CHORD} y1="0" x2={exit(s).x} y2={exit(s).y} />
              </g>
              <text class="row-label" x="-24" y={row.y + 4}>{row.label}</text>
              <text class="row-value" x={CHORD} y={row.y + 16}>
                {(s.draft * 100).toFixed(1)}% @ {(s.draftPos * 100).toFixed(0)}% · twist {s.twistDeg.toFixed(
                  0,
                )}°
              </text>
            {/each}
          </svg>
        </div>
      {/each}
    </div>
  {/if}
</figure>

<style>
  figure {
    margin: 0;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  figcaption {
    font-size: var(--text-xs);
    color: var(--ink-2);
    padding-bottom: var(--space-1);
  }

  .pair {
    display: flex;
    gap: var(--space-3);
    flex: 1;
    min-height: 0;
  }

  .sail {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  h3 {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
    font-weight: 600;
  }

  svg {
    width: 100%;
    height: 100%;
    min-height: 0;
  }

  .chord {
    stroke: var(--ink-2);
    stroke-width: 1;
    stroke-dasharray: 4 3;
  }

  .camber {
    fill: none;
    stroke: var(--accent);
    stroke-width: 3;
    stroke-linecap: round;
  }

  .tick {
    stroke: var(--ink-2);
    stroke-width: 2;
  }

  .row-label {
    fill: var(--ink);
    font-size: 14px;
  }

  .row-value {
    fill: var(--ink-2);
    font-size: 10px;
    text-anchor: end;
  }

  .empty {
    margin: auto;
    font-size: var(--text-sm);
    color: var(--ink-2);
  }
</style>
