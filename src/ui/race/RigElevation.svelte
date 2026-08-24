<script lang="ts">
  import boat from '../../../data/boats/j70.json';
  import type { RigState } from '../../core/types';
  import { EXAGGERATION, mastPoints, polyline, sagPath } from './geometry';

  let { rig }: { rig: RigState } = $props();

  // Side view, bow to the left: +x aft, +y down. The mast fills MAST_PX, which
  // fixes the millimetre scale every other dimension is drawn at. The viewBox
  // is 240×260 and everything below lands inside it at any rig state, so the
  // drawing scales with the card and never clips.
  const VIEW = { w: 240, h: 260 };
  const MAST_PX = 200;
  const DECK_Y = 232;
  const MAST_X = 128;
  const mmPerPx = (boat.rig.mastLenM * 1000) / MAST_PX;
  const jPx = (boat.rig.jM * 1000) / mmPerPx;
  const boomPx = boat.rig.boomOuterMm / mmPerPx;
  const spritPx = boat.rig.bowspritOuterMm / mmPerPx;
  const forestayTopPx = (boat.rig.iM * 1000) / mmPerPx;

  const BOOM_Y = DECK_Y - 24;
  const bowX = MAST_X - jPx;

  const pts = $derived(
    mastPoints(rig, MAST_PX, mmPerPx).map((p) => ({ x: MAST_X + p.x, y: DECK_Y - MAST_PX + p.y })),
  );
  const mast = $derived(polyline(pts));
  const tip = $derived(pts[pts.length - 1] ?? { x: MAST_X, y: DECK_Y - MAST_PX });
  const top = $derived({
    x: MAST_X + (rig.rakeMm * (forestayTopPx / MAST_PX)) / mmPerPx,
    y: DECK_Y - forestayTopPx,
  });
  const forestay = $derived(sagPath(top, { x: bowX, y: DECK_Y }, rig.sagMm, mmPerPx));
  const maxBend = $derived(Math.max(...rig.bendMm.map(Math.abs)));
  const mainOutline = $derived(
    `M ${tip.x.toFixed(1)} ${tip.y.toFixed(1)} L ${(MAST_X + boomPx).toFixed(1)} ${BOOM_Y - 6} L ${MAST_X} ${BOOM_Y} Z`,
  );
  const jibOutline = $derived(
    `M ${top.x.toFixed(1)} ${top.y.toFixed(1)} L ${bowX.toFixed(1)} ${DECK_Y} L ${MAST_X} ${DECK_Y - 14} Z`,
  );
</script>

<figure>
  <svg viewBox="0 0 {VIEW.w} {VIEW.h}" role="img" aria-label="Rig elevation, bow to the left">
    <defs>
      <marker
        id="rig-arrow"
        viewBox="0 0 8 8"
        refX="7"
        refY="4"
        markerWidth="6"
        markerHeight="6"
        orient="auto"
      >
        <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--ink-2)" />
      </marker>
    </defs>

    <!-- Reference geometry: an upright mast and the deck the rig sits on. -->
    <line class="ref" x1={MAST_X} y1={DECK_Y} x2={MAST_X} y2={DECK_Y - MAST_PX} />
    <path class="sail" d={jibOutline} />
    <path class="sail" d={mainOutline} />

    <path class="wire" d={forestay} />
    <path class="mast" d={mast} />
    <line class="boom" x1={MAST_X} y1={BOOM_Y} x2={MAST_X + boomPx} y2={BOOM_Y - 6} />

    <path class="hull" d="M 30 {DECK_Y} L 212 {DECK_Y} L 198 250 L 62 250 Z" />
    <line class="boom" x1={bowX} y1={DECK_Y} x2={bowX - spritPx} y2={DECK_Y - 2} />

    <!-- Rake: masthead offset from upright, drawn to scale. -->
    <line
      class="rake"
      x1={MAST_X}
      y1={DECK_Y - MAST_PX - 12}
      x2={tip.x}
      y2={DECK_Y - MAST_PX - 12}
      marker-end="url(#rig-arrow)"
    />
    <circle class="tipdot" cx={tip.x} cy={tip.y} r="3" />
  </svg>

  <figcaption>
    Side elevation, bow left. Mast bend and forestay sag are drawn at <span class="badge"
      >×{EXAGGERATION}</span
    >; rake is to scale. Sail outlines are indicative.
  </figcaption>
</figure>

<dl class="mono">
  <div>
    <dt>Bend</dt>
    <dd>{maxBend.toFixed(0)} mm</dd>
  </div>
  <div>
    <dt>Sag</dt>
    <dd>{rig.sagMm.toFixed(0)} mm</dd>
  </div>
  <div>
    <dt>Rake</dt>
    <dd>{rig.rakeMm.toFixed(0)} mm</dd>
  </div>
</dl>

<style>
  figure {
    margin: 0;
  }

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

  .badge {
    display: inline-block;
    padding: 0 var(--space-1);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }

  .mast {
    fill: none;
    stroke: var(--ink);
    stroke-width: 4;
    stroke-linecap: round;
  }

  .wire {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2;
  }

  .boom {
    stroke: var(--ink);
    stroke-width: 3;
    stroke-linecap: round;
  }

  .hull {
    fill: var(--muted);
    stroke: none;
  }

  .sail {
    fill: var(--muted);
    fill-opacity: 0.5;
    stroke: none;
  }

  .ref {
    stroke: var(--muted);
    stroke-width: 1.5;
    stroke-dasharray: 4 4;
  }

  .rake {
    stroke: var(--ink-2);
    stroke-width: 1.5;
  }

  .tipdot {
    fill: var(--accent);
  }

  dl {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    margin: var(--space-3) 0 0;
    padding-top: var(--space-3);
    border-top: 1px solid var(--line);
  }

  dl div {
    display: flex;
    gap: var(--space-2);
  }

  dt {
    color: var(--ink-2);
  }

  dd {
    margin: 0;
    color: var(--ink);
  }
</style>
