<script lang="ts">
  import { cubicOut } from 'svelte/easing';
  import { prefersReducedMotion, Tween } from 'svelte/motion';
  import { activeBoat as boat } from '../../lib/boat';
  import type { RigState } from '../../core/types';
  import { EXAGGERATION, polyline } from './geometry';
  import { rigLayout, VIEW } from './rigLayout';
  import { conditions } from '../stores/conditions.svelte';

  let { rig }: { rig: RigState } = $props();

  // Everything geometric lives in rigLayout.ts, so this file is only ink:
  // which stroke, which label, what the caption says. The layout is drawn to
  // scale off the class dimensions — I, J, P, E, the girth tables, the boom
  // and bowsprit outer points — and rigLayout.test.ts holds it to them.
  //
  // The numbers behind the drawing are tweened, not the path strings: a Bezier
  // `d` cannot be CSS-transitioned, so the mast, sails and wires are rebuilt
  // each frame from the eased rig state. prov: assumed 250 ms, matching the
  // plan view and the sections. 1 ms rather than 0 under reduced motion: the
  // same kill switch as tokens.css, and it keeps the first frame off a zero
  // divide inside Tween.
  const EASE = {
    duration: () => (prefersReducedMotion.current ? 1 : 250),
    easing: cubicOut,
  };
  const eased = Tween.of(() => rig, EASE);

  /** Under the gennaker the headsail is furled and the sprit is out (C.9.4(b)). */
  const jibUp = $derived(conditions.sailset === 'jib');
  const L = $derived(rigLayout(boat, eased.current, { jibUp, spritOut: !jibUp }));

  /** Reported off the solve, never off the mid-tween shape. */
  const bendMm = $derived(Math.max(...rig.bendMm.map(Math.abs)));

  let dims = $state(true);

  const label = $derived(
    `Rig side elevation, bow to the left, drawn to the J/70 class dimensions. ` +
      `Mast bend ${bendMm.toFixed(0)} millimetres and forestay sag ${rig.sagMm.toFixed(0)} ` +
      `millimetres are drawn ${EXAGGERATION} times life size; mast rake ` +
      `${rig.rakeMm.toFixed(0)} millimetres is drawn true.`,
  );
</script>

<figure>
  <svg viewBox="0 0 {VIEW.w} {VIEW.h}" role="img" aria-label={label}>
    <defs>
      <marker
        id="rig-arrow"
        viewBox="0 0 8 8"
        refX="7"
        refY="4"
        markerWidth="5"
        markerHeight="5"
        orient="auto"
      >
        <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--ink-2)" />
      </marker>
    </defs>

    <!-- Water, hull and sheer: the datum every height is measured from. -->
    <line class="water" x1="0" y1={L.waterY} x2={VIEW.w} y2={L.waterY} />
    <path class="hull" d={L.hullPath} />
    <line class="sheer" x1={L.sheer[0].x} y1={L.sheer[0].y} x2={L.sheer[1].x} y2={L.sheer[1].y} />

    <!-- Plumb mast: the reference rake is measured against. -->
    <line class="ghost" x1={L.heel.x} y1={L.heel.y} x2={L.plumbTip.x} y2={L.plumbTip.y} />

    <!-- Sails behind the spars, so the rig reads over them. -->
    {#if L.jib.path}
      <path class="sail jib" d={L.jib.path} />
      <path class="leech" d={polyline(L.jib.leech)} />
    {/if}
    <path class="sail main" d={L.main.path} />
    <path class="leech" d={polyline(L.main.leech)} />

    <!-- ¼ ½ ¾ girths, the same three heights the sections card draws. -->
    {#each [...L.main.girths, ...L.jib.girths] as g, i (i)}
      <line class="girth" x1={g.luff.x} y1={g.luff.y} x2={g.leech.x} y2={g.leech.y} />
    {/each}
    {#each L.main.girths as g (g.label)}
      <text class="mark" x={g.leech.x + 4} y={g.leech.y + 4}>{g.label}</text>
    {/each}

    <!-- Standing rigging: forestay bowed by sag, backstay masthead to transom. -->
    <path class="wire" d={L.forestayPath} />
    <line
      class="wire"
      x1={L.backstay[0].x}
      y1={L.backstay[0].y}
      x2={L.backstay[1].x}
      y2={L.backstay[1].y}
    />

    <!-- Spars. -->
    <path class="mast" d={polyline(L.mast)} />
    <line class="spar" x1={L.gooseneck.x} y1={L.gooseneck.y} x2={L.boomTip.x} y2={L.boomTip.y} />
    <line
      class="spar"
      x1={L.spreaderRoot.x}
      y1={L.spreaderRoot.y}
      x2={L.spreaderTip.x}
      y2={L.spreaderTip.y}
    />
    {#if !jibUp}
      <line class="spar" x1={L.stem.x} y1={L.stem.y} x2={L.spritTip.x} y2={L.spritTip.y} />
    {/if}

    <circle class="node" cx={L.hounds.x} cy={L.hounds.y} r="2.5" />
    <circle class="node" cx={L.spreaderRoot.x} cy={L.spreaderRoot.y} r="2" />

    <!-- Rake: masthead offset from plumb, to scale. -->
    <line class="rake" x1={L.plumbTip.x} y1={L.rakeY} x2={L.tip.x} y2={L.rakeY} />
    <line
      class="rake"
      x1={L.tip.x}
      y1={L.rakeY}
      x2={L.tip.x}
      y2={L.tip.y}
      marker-end="url(#rig-arrow)"
    />

    {#if dims}
      <g class="dim">
        {#each L.dims as d (d.label)}
          <line x1={d.from.x} y1={d.from.y} x2={d.to.x} y2={d.to.y} />
          {#if d.vertical}
            <!-- Leaders back to the mast: a bar in the margin says nothing
                 about which two heights it spans without them. -->
            <line class="lead" x1={d.from.x} y1={d.from.y} x2={L.heel.x} y2={d.from.y} />
            <line class="lead" x1={d.to.x} y1={d.to.y} x2={L.heel.x} y2={d.to.y} />
            <line x1={d.from.x - 3} y1={d.from.y} x2={d.from.x + 3} y2={d.from.y} />
            <line x1={d.to.x - 3} y1={d.to.y} x2={d.to.x + 3} y2={d.to.y} />
          {:else}
            <line x1={d.from.x} y1={d.from.y - 3} x2={d.from.x} y2={d.from.y + 3} />
            <line x1={d.to.x} y1={d.to.y - 3} x2={d.to.x} y2={d.to.y + 3} />
          {/if}
          <text x={d.at.x} y={d.at.y}>{d.label}</text>
        {/each}
      </g>
    {/if}
  </svg>

  <div class="dims">
    <dl class="mono">
      <div>
        <dt>Bend</dt>
        <dd>{bendMm.toFixed(0)} mm <span class="badge">×{EXAGGERATION}</span></dd>
      </div>
      <div>
        <dt>Sag</dt>
        <dd>{rig.sagMm.toFixed(0)} mm <span class="badge">×{EXAGGERATION}</span></dd>
      </div>
      <div>
        <dt>Rake</dt>
        <dd>{rig.rakeMm.toFixed(0)} mm</dd>
      </div>
    </dl>

    <!-- Outside the `<dl>`: a button is not a term or a definition, and as a
         fourth direct child it made the list an invalid content model that axe
         flags `definition-list` and that some screen readers answer by
         dropping the toggle from list traversal entirely (audit ux-03 L-03).
         The wrapper keeps the paint identical — the same flex row, the same
         gap, the button still on the line with the three dimensions. -->
    <button type="button" class="chip hit-44" aria-pressed={dims} onclick={() => (dims = !dims)}
      >dims</button
    >
  </div>

  <figcaption>
    Bow left, to scale. Bend and sag ×{EXAGGERATION}, rake true.
  </figcaption>
</figure>

<style>
  figure {
    margin: 0;
  }

  svg {
    display: block;
    width: 100%;
    height: auto;
    /* The rig is ~9 m tall and ~8 m long, so the drawing is near square. The
       cap keeps this card the height of the sections card beside it. */
    max-height: 200px;
    margin-inline: auto;
  }

  figcaption {
    margin-top: var(--space-2);
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .badge {
    display: inline-block;
    padding: 0 var(--space-1);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    color: var(--ink-2);
    font-variant-numeric: tabular-nums;
  }

  .mast {
    fill: none;
    stroke: var(--ink);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .spar {
    stroke: var(--ink);
    stroke-width: 2.5;
    stroke-linecap: round;
  }

  .wire {
    fill: none;
    stroke: var(--accent);
    stroke-width: 1.5;
  }

  .hull {
    fill: var(--muted);
    stroke: none;
  }

  .sheer {
    stroke: var(--ink);
    stroke-width: 2;
    stroke-linecap: round;
  }

  .water {
    stroke: var(--line);
    stroke-width: 1;
  }

  .sail {
    fill: var(--ink);
    fill-opacity: 0.14;
    stroke: none;
  }

  /* The jib sits over the main in this projection, so it goes lighter. */
  .sail.jib {
    fill: var(--accent);
    fill-opacity: 0.1;
  }

  .leech {
    fill: none;
    stroke: var(--ink-2);
    stroke-width: 1;
  }

  .girth {
    stroke: var(--ink-2);
    stroke-width: 0.75;
    stroke-dasharray: 2 2;
  }

  /* Font sizes are viewBox units, and the card scales the drawing down to
     about 0.7: these are chosen so the labels land near 9-10 CSS px there. */
  .mark {
    fill: var(--ink-2);
    font-size: 14px;
  }

  .ghost {
    stroke: var(--muted);
    stroke-width: 1.5;
    stroke-dasharray: 4 4;
  }

  .rake {
    stroke: var(--ink-2);
    stroke-width: 1;
  }

  .node {
    fill: var(--accent);
  }

  .dim line {
    stroke: var(--ink-2);
    stroke-width: 0.75;
  }

  .dim line.lead {
    stroke: var(--line);
    stroke-width: 0.5;
  }

  .dim text {
    fill: var(--ink-2);
    font-size: 16px;
    font-weight: 600;
    text-anchor: middle;
    dominant-baseline: middle;
    paint-order: stroke;
    stroke: var(--surface);
    stroke-width: 3;
  }

  /* The dimensions and the exaggeration toggle share one wrapping row; the
     `<dl>` holds only term/definition pairs (audit ux-03 L-03). */
  .dims {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3);
    margin-top: var(--space-2);
  }

  dl {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3);
    margin: 0;
    font-size: var(--text-xs);
  }

  dl div {
    display: flex;
    gap: var(--space-1);
  }

  dt {
    color: var(--ink-2);
  }

  dd {
    margin: 0;
    color: var(--ink);
  }

  /* A compact overlay toggle, not a primary control: the 44 px hit area comes
     from .hit-44's pseudo-element, so the row stays one line tall. */
  .chip {
    height: 24px;
    padding: 0 var(--space-2);
    font-size: var(--text-xs);
  }

  .chip[aria-pressed='false'] {
    color: var(--ink-2);
    opacity: 0.7;
  }
</style>
