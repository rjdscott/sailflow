<script lang="ts">
  import type { SailShape } from '../../core/types';
  import { battenAngleDeg, leechProfile, polyline } from './geometry';

  /**
   * The main's leech from clew to top batten, seen from astern: the boom at
   * the bottom, the centreline down the left, the live leech in accent and
   * the same leech untwisted behind it as a reference — the gap between the
   * two *is* the twist. The top-batten angle is drawn as a protractor at the
   * head and labelled, because that is the number a trimmer sights for.
   *
   * Presentation only. Every angle here comes from the flying-shape and
   * sheeting layers; nothing is measured (ASSUMPTIONS.md).
   */
  let { shape, boomDeg }: { shape?: SailShape; boomDeg: number } = $props();

  const L = { w: 132, mastX: 16, topY: 34, height: 130, chord: 92, batten: 18 };
  const bottomY = L.topY + L.height;

  /** The same sail with the twist taken out: the reference behind the curve. */
  const untwisted = $derived(
    shape && {
      quarter: { ...shape.quarter, twistDeg: 0 },
      half: { ...shape.half, twistDeg: 0 },
      threeQuarter: { ...shape.threeQuarter, twistDeg: 0 },
    },
  );

  const shift = (pts: { x: number; y: number }[]) =>
    pts.map((p) => ({ x: L.mastX + p.x, y: L.topY + p.y }));

  const live = $derived(shape ? shift(leechProfile(shape, boomDeg, L.height, L.chord)) : []);
  const ref = $derived(untwisted ? shift(leechProfile(untwisted, boomDeg, L.height, L.chord)) : []);
  const batten = $derived(shape ? battenAngleDeg(shape) : 0);

  /** Protractor at the head: a boom-parallel reference and the batten on it. */
  const arm = $derived.by(() => {
    const head = live[live.length - 1] ?? { x: L.mastX, y: L.topY };
    const r = (batten * Math.PI) / 180;
    return {
      head,
      flat: { x: head.x + L.batten, y: head.y },
      tip: { x: head.x + L.batten * Math.cos(r), y: head.y - L.batten * Math.sin(r) },
    };
  });
</script>

{#if !shape}
  <p class="empty">No flying shape in this solve yet.</p>
{:else}
  <figure>
    <svg
      viewBox="0 0 {L.w} 196"
      role="img"
      aria-label="Main leech seen from astern. Top batten {batten.toFixed(
        0,
      )} degrees to the boom, boom {boomDeg.toFixed(0)} degrees off the centreline."
    >
      <!-- Centreline: the leech's offset is measured from it, and so are the
           spreader stripes on the headsail panel. -->
      <line class="centre" x1={L.mastX} y1={L.topY - 12} x2={L.mastX} y2={bottomY + 8} />

      <path class="ref" d={polyline(ref)} />
      <path class="leech" d={polyline(live)} />

      <!-- Boom: mast to clew, at the bottom of the leech. -->
      <line class="boom" x1={L.mastX} y1={bottomY} x2={live[0].x} y2={bottomY} />
      <text class="label" x={L.mastX} y={bottomY + 20}>Boom {boomDeg.toFixed(0)}°</text>

      <line class="flat" x1={arm.head.x} y1={arm.head.y} x2={arm.flat.x} y2={arm.flat.y} />
      <line class="batten" x1={arm.head.x} y1={arm.head.y} x2={arm.tip.x} y2={arm.tip.y} />
      <text class="label" x={arm.flat.x + 4} y={arm.head.y + 4}>{batten.toFixed(0)}°</text>
    </svg>

    <figcaption>
      Leech in accent, the same leech untwisted behind it: the gap is the twist. The tick at the
      head is the top batten against a boom-parallel line.
    </figcaption>
  </figure>
{/if}

<style>
  figure {
    margin: 0;
  }

  svg {
    display: block;
    width: 100%;
    height: auto;
    max-height: 220px;
    margin-inline: auto;
  }

  figcaption {
    margin-top: var(--space-2);
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .centre {
    stroke: var(--muted);
    stroke-width: 1;
    stroke-dasharray: 3 4;
  }

  .ref,
  .flat {
    fill: none;
    stroke: var(--muted);
    stroke-width: 2;
    stroke-dasharray: 4 3;
  }

  .leech {
    fill: none;
    stroke: var(--accent);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .boom,
  .batten {
    stroke: var(--ink-2);
    stroke-width: 3;
    stroke-linecap: round;
  }

  .label {
    fill: var(--ink-2);
    font-family: var(--font-sans);
    font-size: 12px;
  }

  .empty {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--ink-2);
  }
</style>
