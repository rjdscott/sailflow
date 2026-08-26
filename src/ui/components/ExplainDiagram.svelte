<script lang="ts">
  import type { DiagramKind } from '../explainDetail';
  import { DIAGRAM_LABELS } from '../explainDetail';

  /**
   * The one drawing that goes beside an explainer (audit ux-01 L-03).
   *
   * Nine schematics, not seventeen: every control on the boat does one of
   * nine things to the sail plan, and drawing each of those things once gives
   * a reader a visual vocabulary instead of seventeen unrelated pictures. The
   * mapping from control to schematic is `EXPLAIN_DETAIL` in `explainDetail.ts`.
   *
   * Inline SVG, tokens only, no raster: a dashed `--muted` ghost is one end of
   * the control's range and the solid `--accent` shape is the other. Nothing
   * here is to scale and nothing here is a modelled number — these are
   * diagrams of a direction, which is exactly the claim the explainer makes.
   */
  let { kind }: { kind: DiagramKind } = $props();
</script>

<svg viewBox="0 0 120 72" role="img" aria-label={DIAGRAM_LABELS[kind]}>
  {#if kind === 'bend'}
    <!-- Mast straight (ghost) vs bowed forward, and the main flattening with it. -->
    <path class="ghost" d="M34 8 L34 64" />
    <path class="ghost" d="M34 8 Q 92 22 96 60" />
    <path class="mast" d="M34 8 Q 24 36 34 64" />
    <path class="sail" d="M34 8 Q 78 26 96 60" />
    <path class="arrow" d="M46 20 L36 26" marker-end="url(#ex-arrow)" />
  {:else if kind === 'twist'}
    <!-- Two sections up the luff: the top one rotated open off the lower. -->
    <line class="luff" x1="20" y1="10" x2="20" y2="62" />
    <path class="sail" d="M20 56 Q 58 44 100 54" />
    <path class="ghost" d="M20 18 Q 58 6 100 16" />
    <path class="sail" d="M20 18 Q 56 4 96 2" />
    <path class="arrow" d="M92 14 L96 4" marker-end="url(#ex-arrow)" />
  {:else if kind === 'depth'}
    <!-- One chord, two depths: flat (ghost) and full. -->
    <line class="chord" x1="16" y1="54" x2="104" y2="54" />
    <path class="ghost" d="M16 54 Q 60 40 104 54" />
    <path class="sail" d="M16 54 Q 60 14 104 54" />
    <path class="arrow" d="M60 42 L60 22" marker-end="url(#ex-arrow)" />
  {:else if kind === 'draft'}
    <!-- Same depth, moved fore and aft along the chord. -->
    <line class="chord" x1="16" y1="54" x2="104" y2="54" />
    <path class="ghost" d="M16 54 Q 88 18 104 54" />
    <path class="sail" d="M16 54 Q 34 18 104 54" />
    <path class="arrow" d="M74 26 L40 26" marker-end="url(#ex-arrow)" />
  {:else if kind === 'slot'}
    <!-- Jib leech against the main's luff: the gap the air has to get through. -->
    <path class="ghost" d="M16 62 Q 42 26 34 6" />
    <path class="sail" d="M16 62 Q 54 30 46 6" />
    <path class="lee" d="M62 66 Q 96 34 88 4" />
    <path class="arrow" d="M50 36 L62 40" marker-end="url(#ex-arrow)" />
  {:else if kind === 'rake'}
    <!-- Masthead aft of plumb: the whole sail plan moving with it. -->
    <line class="water" x1="8" y1="64" x2="112" y2="64" />
    <path class="ghost" d="M46 64 L46 8" />
    <path class="mast" d="M46 64 L64 10" />
    <path class="arrow" d="M48 12 L60 10" marker-end="url(#ex-arrow)" />
  {:else if kind === 'sag'}
    <!-- Forestay straight (ghost) vs bowed to leeward under load. -->
    <line class="water" x1="8" y1="66" x2="112" y2="66" />
    <line class="mast" x1="26" y1="6" x2="26" y2="66" />
    <path class="ghost" d="M26 6 L100 62" />
    <path class="wire" d="M26 6 Q 46 46 100 62" />
    <path class="arrow" d="M56 24 L50 36" marker-end="url(#ex-arrow)" />
  {:else if kind === 'boom'}
    <!-- Looking down: the track athwartships, the boom swinging off it. -->
    <line class="chord" x1="14" y1="16" x2="106" y2="16" />
    <rect class="car ghost-fill" x="56" y="12" width="9" height="8" rx="1" />
    <rect class="car" x="26" y="12" width="9" height="8" rx="1" />
    <path class="ghost" d="M60 16 L60 66" />
    <path class="sail" d="M60 16 L34 64" />
    <path class="arrow" d="M52 44 L40 48" marker-end="url(#ex-arrow)" />
  {:else if kind === 'kite'}
    <!-- Astern: the kite rotating out of the main's shadow to weather. -->
    <path class="lee" d="M74 66 L74 8 L96 66 Z" />
    <path class="ghost" d="M66 62 Q 52 30 70 10" />
    <path class="sail" d="M56 64 Q 26 34 48 8" />
    <path class="arrow" d="M56 24 L44 18" marker-end="url(#ex-arrow)" />
  {/if}

  <defs>
    <marker
      id="ex-arrow"
      viewBox="0 0 8 8"
      refX="7"
      refY="4"
      markerWidth="4"
      markerHeight="4"
      orient="auto"
    >
      <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--accent)" />
    </marker>
  </defs>
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    max-width: 200px;
    height: auto;
  }

  path,
  line,
  rect {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  /* One end of the range: dashed, receding, never the thing being pointed at. */
  .ghost {
    stroke: var(--muted);
    stroke-width: 1.5;
    stroke-dasharray: 3 3;
  }

  .ghost-fill {
    fill: none;
    stroke: var(--muted);
    stroke-width: 1.5;
    stroke-dasharray: 3 3;
  }

  /* The other end: the shape the control is moving towards. */
  .sail,
  .wire,
  .car {
    stroke: var(--accent);
    stroke-width: 2;
  }

  .car {
    fill: var(--accent);
  }

  .mast,
  .luff {
    stroke: var(--ink);
    stroke-width: 2.5;
  }

  .chord,
  .water {
    stroke: var(--line-strong);
    stroke-width: 1;
  }

  /* The sail that is not the subject of the drawing — the main behind a jib,
     the main in front of a kite. */
  .lee {
    stroke: var(--ink-2);
    stroke-width: 1.5;
  }

  .arrow {
    stroke: var(--accent);
    stroke-width: 1.5;
  }
</style>
