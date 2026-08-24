<script lang="ts">
  import type { AeroState, SailShape } from '../../core/types';
  import { HULL_PATH, telltaleState, type TelltaleState } from './geometry';

  let {
    aero,
    heelDeg,
    twaDeg,
    jib,
  }: {
    aero: AeroState;
    heelDeg: number;
    twaDeg: number;
    jib?: SailShape;
  } = $props();

  // Top-down, bow up, boat on starboard tack, in a 272×204 viewBox. Sheeting
  // angles are indicative: they follow apparent wind angle, they are not
  // solved from the sheet loads. Every label sits clear of the drawing — the
  // numbers themselves live in the row underneath.
  const VIEW = { w: 272, h: 204 };
  const HULL = { x: 95, y: 25, scale: 1.5 };
  const MAST = { x: 95, y: 76 };
  const TACK = { x: 95, y: 29 };
  const BOOM = 62;
  const JIB_FOOT = 45;
  /** Wind hub and the two radii the arrows and their tags are laid out on. */
  const HUB = { x: 175, y: 100 };
  const R_TWA = 58;
  const R_AWA = 46;

  const boomDeg = $derived(Math.min(aero.awaDeg * 0.45, 85));
  const jibDeg = $derived(Math.min(aero.awaDeg * 0.7, 95));

  /** Aft-and-to-leeward from a pivot: port side, on starboard tack. */
  function leeward(from: { x: number; y: number }, deg: number, len: number) {
    const r = (deg * Math.PI) / 180;
    return { x: from.x - len * Math.sin(r), y: from.y + len * Math.cos(r) };
  }

  /** Point at `deg` off the bow, `len` out from the wind hub. */
  function windward(deg: number, len: number) {
    const r = (deg * Math.PI) / 180;
    return { x: HUB.x + len * Math.sin(r), y: HUB.y - len * Math.cos(r) };
  }

  const boomTip = $derived(leeward(MAST, boomDeg, BOOM));
  const clew = $derived(leeward(TACK, jibDeg, JIB_FOOT));

  const twaTail = $derived(windward(twaDeg, R_TWA));
  const awaTail = $derived(windward(aero.awaDeg, R_AWA));

  const entryDeg = $derived(jib?.half.entryDeg ?? aero.awaDeg);
  // One entry angle for the whole luff, so the three differ only by the band
  // they are read against: lower telltales stall first.
  const luffTelltales: { at: number; state: TelltaleState }[] = $derived(
    [0.12, 0.22, 0.32].map((at) => ({
      at,
      state: telltaleState(aero.awaDeg, entryDeg + (at - 0.22) * 12),
    })),
  );
  const leechState = $derived(telltaleState(aero.awaDeg, entryDeg + 4));

  const leechPt = $derived(along(0.94));

  function along(t: number) {
    return { x: TACK.x + t * (clew.x - TACK.x), y: TACK.y + t * (clew.y - TACK.y) };
  }
</script>

<figure>
  <svg viewBox="0 0 {VIEW.w} {VIEW.h}" role="img" aria-label="Plan view, starboard tack">
    <defs>
      <marker
        id="plan-arrow-twa"
        viewBox="0 0 8 8"
        refX="7"
        refY="4"
        markerWidth="5"
        markerHeight="5"
        orient="auto"
      >
        <path class="head-twa" d="M 0 0 L 8 4 L 0 8 z" />
      </marker>
      <marker
        id="plan-arrow-awa"
        viewBox="0 0 8 8"
        refX="7"
        refY="4"
        markerWidth="5"
        markerHeight="5"
        orient="auto"
      >
        <path class="head-awa" d="M 0 0 L 8 4 L 0 8 z" />
      </marker>
    </defs>

    <!-- wind, blowing from the tail toward the boat -->
    <g class="wind">
      <line
        x1={twaTail.x}
        y1={twaTail.y}
        x2={HUB.x}
        y2={HUB.y}
        marker-end="url(#plan-arrow-twa)"
        class="twa"
      />
      <line
        x1={awaTail.x}
        y1={awaTail.y}
        x2={HUB.x}
        y2={HUB.y}
        marker-end="url(#plan-arrow-awa)"
        class="awa"
      />
      <text class="tag" x={twaTail.x + 8} y={twaTail.y + 4} text-anchor="start">TWA</text>
      <text class="tag awa-tag" x={awaTail.x - 8} y={awaTail.y + 4} text-anchor="end">AWA</text>
    </g>

    <path class="hull" d={HULL_PATH} transform="translate({HULL.x} {HULL.y}) scale({HULL.scale})" />

    <line class="spar" x1={MAST.x} y1={MAST.y} x2={boomTip.x} y2={boomTip.y} />
    <line class="sail" x1={TACK.x} y1={TACK.y} x2={clew.x} y2={clew.y} />

    {#each luffTelltales as t (t.at)}
      {@const p = along(t.at)}
      <g transform="translate({p.x.toFixed(2)} {p.y.toFixed(2)})">
        <circle class="tt-dot" r="1.6" />
        <rect class="ribbon {t.state}" x="2" y="-1.2" width="9" height="2.4" rx="1.2" />
      </g>
    {/each}
    <g transform="translate({leechPt.x.toFixed(2)} {leechPt.y.toFixed(2)})">
      <circle class="tt-dot" r="1.6" />
      <rect class="ribbon {leechState}" x="-11" y="-1.2" width="9" height="2.4" rx="1.2" />
    </g>

    <!-- heel, stern view, to scale, parked clear of the plan -->
    <g class="heel">
      <line class="water" x1="6" y1="174" x2="68" y2="174" />
      <g transform="translate(37 174) rotate({heelDeg})">
        <path class="hull" d="M -15 -6 L 15 -6 L 9 5 L -9 5 Z" />
        <line class="spar" x1="0" y1="-6" x2="0" y2="-34" />
      </g>
      <text class="tag" x="37" y="196" text-anchor="middle">HEEL</text>
    </g>
  </svg>

  <figcaption>
    Plan view, bow up, starboard tack. Sheeting angles and telltale state are indicative, not
    solved.
  </figcaption>
</figure>

<dl class="mono">
  <div>
    <dt>TWA</dt>
    <dd>{twaDeg.toFixed(0)}°</dd>
  </div>
  <div>
    <dt>AWA</dt>
    <dd>{aero.awaDeg.toFixed(0)}°</dd>
  </div>
  <div>
    <dt>Heel</dt>
    <dd>{heelDeg.toFixed(0)}°</dd>
  </div>
  <div>
    <dt>Flat</dt>
    <dd>{aero.flat.toFixed(2)}</dd>
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

  .hull {
    fill: var(--muted);
    stroke: var(--ink-2);
    stroke-width: 1;
  }

  .spar,
  .sail {
    stroke: var(--ink);
    stroke-width: 2.5;
    stroke-linecap: round;
  }

  .sail {
    stroke: var(--accent);
  }

  .wind line {
    stroke: var(--ink-2);
    stroke-width: 1.5;
  }

  .wind .twa {
    stroke-dasharray: 5 3;
  }

  .wind .awa {
    stroke: var(--accent);
  }

  .tag {
    fill: var(--ink-2);
    font-family: var(--font-sans);
    font-size: var(--tag-size, 11px);
    font-weight: 600;
    letter-spacing: 0.06em;
  }

  .awa-tag {
    fill: var(--accent);
  }

  .head-twa {
    fill: var(--ink-2);
  }

  .head-awa {
    fill: var(--accent);
  }

  .tt-dot {
    fill: var(--ink-2);
  }

  .ribbon {
    transform-origin: left center;
  }

  .ribbon.streaming {
    fill: var(--good);
  }

  .ribbon.lifting {
    fill: var(--warn);
  }

  .ribbon.stalled {
    fill: var(--bad);
  }

  .water {
    stroke: var(--accent);
    stroke-width: 1.5;
  }

  @media (prefers-reduced-motion: no-preference) {
    .ribbon.streaming {
      animation: flutter 1.4s ease-in-out infinite;
    }

    .ribbon.lifting {
      animation: lift 0.7s ease-in-out infinite;
    }

    .ribbon.stalled {
      animation: stall 2.4s ease-in-out infinite;
    }
  }

  @keyframes flutter {
    0%,
    100% {
      transform: rotate(-4deg);
    }
    50% {
      transform: rotate(4deg);
    }
  }

  @keyframes lift {
    0%,
    100% {
      transform: rotate(-30deg);
    }
    50% {
      transform: rotate(-55deg);
    }
  }

  @keyframes stall {
    0%,
    100% {
      transform: rotate(40deg);
    }
    50% {
      transform: rotate(70deg);
    }
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
