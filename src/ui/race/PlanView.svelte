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

  // Top-down, bow up, boat on starboard tack. Sheeting angles here are
  // indicative: they follow apparent wind angle, they are not solved from the
  // sheet loads.
  const BOOM = 46;
  const JIB_FOOT = 34;
  const boomDeg = $derived(aero.awaDeg * 0.45);
  const jibDeg = $derived(aero.awaDeg * 0.7);

  const entryDeg = $derived(jib?.half.entryDeg ?? aero.awaDeg);
  const luffTelltales: { at: number; state: TelltaleState }[] = $derived(
    [0.25, 0.5, 0.75].map((at) => ({
      at,
      // One entry angle for the whole luff, so the three differ only by the
      // band they are read against: lower telltales stall first.
      state: telltaleState(aero.awaDeg, entryDeg + (at - 0.5) * 4),
    })),
  );
  const leechState = $derived(telltaleState(aero.awaDeg, entryDeg + 4));

  function ray(deg: number, len: number): { x: number; y: number } {
    const r = (deg * Math.PI) / 180;
    return { x: Math.sin(r) * len, y: -Math.cos(r) * len };
  }
</script>

<figure>
  <figcaption>
    Plan view, starboard tack. Sheeting angles and telltale state are indicative, not solved.
  </figcaption>

  <svg viewBox="-70 -60 140 190" role="img" aria-label="Plan view">
    <!-- true and apparent wind, blowing toward the boat -->
    <g class="wind">
      <line x1={ray(180 - twaDeg, 54).x} y1={ray(180 - twaDeg, 54).y - 10} x2="0" y2="-10" />
      <text x={ray(180 - twaDeg, 60).x} y={ray(180 - twaDeg, 60).y - 10}
        >TWA {twaDeg.toFixed(0)}°</text
      >
    </g>
    <g class="wind awa">
      <line
        x1={ray(180 - aero.awaDeg, 44).x}
        y1={ray(180 - aero.awaDeg, 44).y - 10}
        x2="0"
        y2="-10"
      />
      <text x={ray(180 - aero.awaDeg, 50).x} y={ray(180 - aero.awaDeg, 50).y - 20}>
        AWA {aero.awaDeg.toFixed(0)}°
      </text>
    </g>

    <path class="hull" d={HULL_PATH} transform="translate(0 -10)" />

    <!-- main boom and jib foot, to leeward (port side on starboard tack) -->
    <line
      class="spar"
      x1="0"
      y1="34"
      x2={-ray(180 - boomDeg, BOOM).x}
      y2={34 - ray(180 - boomDeg, BOOM).y}
    />
    <line
      class="sail"
      x1="-2"
      y1="12"
      x2={-ray(180 - jibDeg, JIB_FOOT).x}
      y2={12 - ray(180 - jibDeg, JIB_FOOT).y}
    />

    <!-- jib luff telltales -->
    {#each luffTelltales as t (t.at)}
      <g transform="translate(-3 {2 + t.at * 14})">
        <circle class="tt-dot" r="1.5" />
        <rect class="ribbon {t.state}" x="-9" y="-1" width="8" height="2" rx="1" />
      </g>
    {/each}
    <g transform="translate(2 30)">
      <circle class="tt-dot" r="1.5" />
      <rect class="ribbon {leechState}" x="1" y="-1" width="8" height="2" rx="1" />
      <text class="tt-label" x="12" y="3">leech</text>
    </g>
  </svg>

  <!-- stern view, heel to scale -->
  <div class="heel">
    <svg viewBox="-26 -22 52 34" role="img" aria-label="Heel, stern view">
      <line class="water" x1="-24" y1="6" x2="24" y2="6" />
      <g transform="rotate({heelDeg} 0 6)">
        <path class="hull" d="M -16 -6 L 16 -6 L 10 6 L -10 6 Z" />
        <line class="spar" x1="0" y1="-6" x2="0" y2="-20" />
      </g>
    </svg>
    <span class="tabular-nums">{heelDeg.toFixed(0)}°</span>
  </div>
</figure>

<style>
  figure {
    margin: 0;
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  figcaption {
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  svg {
    flex: 1;
    width: 100%;
    min-height: 0;
  }

  .hull {
    fill: var(--surface);
    stroke: var(--ink-2);
    stroke-width: 1.5;
  }

  .spar,
  .sail {
    stroke: var(--ink);
    stroke-width: 2;
    stroke-linecap: round;
  }

  .sail {
    stroke: var(--accent);
  }

  .wind line {
    stroke: var(--ink-2);
    stroke-width: 1.5;
    stroke-dasharray: 5 3;
  }

  .wind.awa line {
    stroke: var(--accent);
    stroke-dasharray: none;
  }

  .wind text {
    fill: var(--ink-2);
    font-size: 8px;
    text-anchor: middle;
  }

  .tt-dot {
    fill: var(--ink-2);
  }

  .tt-label {
    fill: var(--ink-2);
    font-size: 7px;
  }

  .ribbon {
    transform-origin: right center;
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

  .heel {
    position: absolute;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .heel svg {
    width: 60px;
    height: 40px;
    flex: none;
  }

  .water {
    stroke: var(--accent);
    stroke-width: 1;
  }
</style>
