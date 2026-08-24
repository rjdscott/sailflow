<script lang="ts">
  import boat from '../../../data/boats/j70.json';
  import type { RigState } from '../../core/types';
  import { EXAGGERATION, mastPoints, polyline, sagPath } from './geometry';

  let { rig }: { rig: RigState } = $props();

  // Side view, bow to the left: +x aft, +y down. The mast fills MAST_PX, which
  // fixes the millimetre scale everything else is drawn at.
  const MAST_PX = 200;
  const DECK_Y = 220;
  const MAST_X = 96;
  const mmPerPx = (boat.rig.mastLenM * 1000) / MAST_PX;
  const jPx = (boat.rig.jM * 1000) / mmPerPx;
  const boomPx = boat.rig.boomOuterMm / mmPerPx;
  const forestayTopPx = (boat.rig.iM * 1000) / mmPerPx;

  const pts = $derived(mastPoints(rig, MAST_PX, mmPerPx).map((p) => ({ x: MAST_X + p.x, y: p.y })));
  const mast = $derived(polyline(pts));
  const top = $derived({
    x: MAST_X + (rig.rakeMm * (forestayTopPx / MAST_PX)) / mmPerPx,
    y: DECK_Y - forestayTopPx,
  });
  const forestay = $derived(sagPath(top, { x: MAST_X - jPx, y: DECK_Y }, rig.sagMm, mmPerPx));
  const maxBend = $derived(Math.max(...rig.bendMm.map(Math.abs)));
</script>

<figure>
  <figcaption>
    Side elevation. Bend and forestay sag are drawn at <span class="badge">×{EXAGGERATION}</span>;
    rake is to scale.
  </figcaption>

  <svg viewBox="0 0 200 240" role="img" aria-label="Rig elevation">
    <g transform="translate(0 {DECK_Y - MAST_PX})">
      <path class="mast" d={mast} />
    </g>
    <path class="wire" d={forestay} />
    <line class="deck" x1="4" y1={DECK_Y} x2="196" y2={DECK_Y} />
    <line class="boom" x1={MAST_X} y1={DECK_Y - 24} x2={MAST_X + boomPx} y2={DECK_Y - 18} />
    <circle class="tip" cx={pts[pts.length - 1]?.x ?? MAST_X} cy={DECK_Y - MAST_PX} r="3" />
  </svg>

  <dl>
    <div>
      <dt>Bend</dt>
      <dd class="tabular-nums">{maxBend.toFixed(0)} mm</dd>
    </div>
    <div>
      <dt>Sag</dt>
      <dd class="tabular-nums">{rig.sagMm.toFixed(0)} mm</dd>
    </div>
    <div>
      <dt>Rake</dt>
      <dd class="tabular-nums">{rig.rakeMm.toFixed(0)} mm</dd>
    </div>
  </dl>
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
  }

  .badge {
    display: inline-block;
    padding: 0 var(--space-1);
    border: 1px solid var(--ink-2);
    border-radius: var(--radius);
    font-variant-numeric: tabular-nums;
  }

  svg {
    flex: 1;
    width: 100%;
    min-height: 0;
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

  .deck,
  .boom {
    stroke: var(--ink-2);
    stroke-width: 3;
    stroke-linecap: round;
  }

  .tip {
    fill: var(--accent);
  }

  dl {
    display: flex;
    gap: var(--space-4);
    margin: 0;
    font-size: var(--text-xs);
  }

  dt {
    color: var(--ink-2);
  }

  dd {
    margin: 0;
    color: var(--ink);
  }

  dl div {
    display: flex;
    gap: var(--space-1);
  }
</style>
