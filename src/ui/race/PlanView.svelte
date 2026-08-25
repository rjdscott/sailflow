<script lang="ts">
  import { cubicOut } from 'svelte/easing';
  import { prefersReducedMotion, Tween } from 'svelte/motion';
  import type { AeroState, SailShape } from '../../core/types';
  import {
    arrowLength,
    boomAngle,
    clewAt,
    deck,
    DIMS,
    drawnHeel,
    MAX_DRAWN_HEEL,
    jibSheetAngle,
    openBy,
    sailPath,
    sailPoints,
    tackSide,
    windArrow,
    localAoa,
    luffRibbon,
    leechRibbon,
    type Ribbon,
  } from './boat';
  import type { Pt } from './geometry';
  import { race } from './store.svelte';
  import { conditions } from '../stores/conditions.svelte';

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

  // A J/70 seen from above, bow up, at class proportions (LOA:beam straight
  // off the boat JSON). Starboard tack on positive TWA, mirrored on negative.
  // Sheeting angles are read off the sheet controls, not solved from sheet
  // loads — the picture answers a slider the way the boat does, and the
  // caption says so. Everything lives in one viewBox, so the card sets the
  // size and nothing ever clips.
  const VIEW = { w: 320, h: 264 };
  /** px per metre. Fixed: the ring radii below are sized against it. */
  const SCALE = 21;
  const D = deck(SCALE);
  /** Wind hub: the middle of the boat's whole length, bowsprit tip to transom. */
  const HUB = { x: VIEW.w / 2, y: 132 };
  /** Stem, in viewBox coordinates: everything on the deck hangs off this. */
  const ORIGIN = { x: HUB.x, y: HUB.y - (D.sternY + D.spritTip.y) / 2 };
  const MAST = { x: ORIGIN.x, y: ORIGIN.y + D.mast.y };
  const TACK = { x: ORIGIN.x, y: ORIGIN.y };
  /** Inner shadow: the deck outline shrunk just inside itself. */
  const SHADE = `translate(0 ${(D.sternY * 0.55).toFixed(2)}) scale(0.94 0.98) translate(0 ${(-D.sternY * 0.55).toFixed(2)})`;

  // One ring for both arrows, centred on the boat, wide enough to clear the
  // bowsprit and the transom at every angle. The two tags sit on opposite
  // sides of their arrows, which is what keeps them apart when TWA and AWA
  // are only a few degrees apart. boat.test.ts holds both clearances.
  const RING = { rx: 110, ry: 100 };

  /**
   * Solves land in steps; the drawing shouldn't. prov: assumed 250 ms.
   * `duration` is a function so it is re-read on every set: flip the OS
   * setting mid-session and the next solve snaps. 1 ms, not 0, mirrors the
   * kill switch in tokens.css and keeps the first frame off the zero divide.
   */
  const EASE = {
    duration: () => (prefersReducedMotion.current ? 1 : 250),
    easing: cubicOut,
  };

  const side = $derived(tackSide(twaDeg));
  /** Bottom corner to windward: the one place the wind arrows never sweep. */
  const heelX = $derived(side === 1 ? 50 : VIEW.w - 50);
  const ctl = $derived(race.controls.race);
  const main = $derived(race.result?.shape.main);

  // Tween the two sheeting angles, not the path strings they feed: every
  // shape hanging off a spar (sail, ghost, telltale) swings with it.
  const boom = Tween.of(() => boomAngle(ctl.mainsheet, ctl.traveller), EASE);
  const jibSheet = Tween.of(() => jibSheetAngle(ctl.jibLead, ctl.jibSheet), EASE);
  const boomDeg = $derived(boom.current);
  const jibDeg = $derived(jibSheet.current);

  const boomTip = $derived(clewAt(MAST, boomDeg, D.boomPx, side));
  const jibClew = $derived(clewAt(TACK, jibDeg, D.jibFootPx, side));

  const mainSail = $derived(main ? sailPath(MAST, boomTip, main.half, side) : '');
  const jibSail = $derived(jib ? sailPath(TACK, jibClew, jib.half, side) : '');

  /** The ¾-height section, shorter in chord and twisted open: twist, in plan. */
  function ghost(tack: Pt, deg: number, len: number, s: SailShape): string {
    const head = clewAt(tack, deg, len, side);
    return sailPath(tack, openBy(tack, head, s.threeQuarter.twistDeg, side), s.threeQuarter, side);
  }
  const mainGhost = $derived(
    main ? ghost(MAST, boomDeg, D.boomPx * DIMS.headChord.main, main) : '',
  );
  const jibGhost = $derived(jib ? ghost(TACK, jibDeg, D.jibFootPx * DIMS.headChord.jib, jib) : '');

  // Both arrows carry the true wind's strength: the apparent arrow says where
  // the wind is, not how hard it blows, so two lengths would read as two winds.
  const armLen = $derived(arrowLength(conditions.twsKt));
  const twa = $derived(windArrow(twaDeg, HUB, { ...RING, len: armLen, tagOff: 28 }));
  const awa = $derived(windArrow(side * aero.awaDeg, HUB, { ...RING, len: armLen, tagOff: -28 }));

  /** Plan view has no third axis: the tilt is a metaphor, and it is capped. */
  const tiltDeg = $derived(drawnHeel(heelDeg, side));

  // Target entry AoA; the shape's entryDeg mixes datums (camber + inhauler) so it is not used here.
  const entryDeg = 12; // prov: assumed
  /** Ribbons stream along the chord; the group's own rotation is the flow. */
  const streamDeg = $derived((Math.atan2(jibClew.y - TACK.y, jibClew.x - TACK.x) * 180) / Math.PI);
  const boomStreamDeg = $derived(
    (Math.atan2(boomTip.y - MAST.y, boomTip.x - MAST.x) * 180) / Math.PI,
  );
  // Jib luff telltales at ¼ ½ ¾ and the head: local AoA = AWA − sheeting angle
  // − twist at that height, read against the sail's entry angle.
  const telltales: { at: number; p: Pt; state: Ribbon }[] = $derived(
    jib
      ? sailPoints(TACK, jibClew, jib.half, side, 4)
          .slice(1)
          .map((p, i) => {
            const at = (i + 1) / 4;
            const aoa = localAoa(aero.awaDeg, jibDeg, jib.threeQuarter.twistDeg, at);
            return { at, p, state: luffRibbon(aoa, entryDeg) };
          })
      : [],
  );
  // Main leech telltales: top batten (¾ ghost head) and mid-leech.
  const mainTelltales: { at: number; p: Pt; state: Ribbon }[] = $derived(
    main
      ? [
          {
            at: 0.75,
            p: openBy(
              MAST,
              clewAt(MAST, boomDeg, D.boomPx * DIMS.headChord.main, side),
              main.threeQuarter.twistDeg,
              side,
            ),
            state: leechRibbon(aero.awaDeg, boomDeg, main.threeQuarter.twistDeg, 0.75),
          },
          {
            at: 0.5,
            p: clewAt(MAST, boomDeg, D.boomPx * 0.88, side),
            state: leechRibbon(aero.awaDeg, boomDeg, main.threeQuarter.twistDeg, 0.5),
          },
        ]
      : [],
  );

  const fmt = (v: number) => Math.abs(v).toFixed(0);
</script>

<figure>
  <svg
    viewBox="0 0 {VIEW.w} {VIEW.h}"
    role="img"
    aria-label="Plan view of the boat, bow up, on {side === 1 ? 'starboard' : 'port'} tack"
  >
    <defs>
      <marker
        id="plan-cap-twa"
        viewBox="0 0 8 8"
        refX="7"
        refY="4"
        markerWidth="4.5"
        markerHeight="4.5"
        orient="auto"
      >
        <path class="cap-twa" d="M 0 0.6 L 8 4 L 0 7.4 z" />
      </marker>
      <marker
        id="plan-cap-awa"
        viewBox="0 0 8 8"
        refX="7"
        refY="4"
        markerWidth="4.5"
        markerHeight="4.5"
        orient="auto"
      >
        <path class="cap-awa" d="M 0 0.6 L 8 4 L 0 7.4 z" />
      </marker>
    </defs>

    <!-- Wind first, so the boat sits on top of it. -->
    <g class="wind">
      <line
        class="twa"
        x1={twa.tail.x.toFixed(2)}
        y1={twa.tail.y.toFixed(2)}
        x2={twa.head.x.toFixed(2)}
        y2={twa.head.y.toFixed(2)}
        marker-end="url(#plan-cap-twa)"
      />
      <line
        class="awa"
        x1={awa.tail.x.toFixed(2)}
        y1={awa.tail.y.toFixed(2)}
        x2={awa.head.x.toFixed(2)}
        y2={awa.head.y.toFixed(2)}
        marker-end="url(#plan-cap-awa)"
      />
      <text class="tag" x={twa.tag.x.toFixed(2)} y={twa.tag.y.toFixed(2)}>TWA {fmt(twaDeg)}°</text>
      <text class="tag accent" x={awa.tag.x.toFixed(2)} y={awa.tag.y.toFixed(2)}>
        AWA {fmt(aero.awaDeg)}°
      </text>
    </g>

    <!-- Everything that heels: deck, sails and the ribbons flying off them,
         leaning to leeward about the middle of the boat. -->
    <g
      class="boat"
      style="transform-origin: {HUB.x}px {HUB.y}px; transform: rotate({tiltDeg.toFixed(2)}deg)"
    >
      <!-- Deck plan. Drawn in the hull frame: stem at the origin, +y aft. -->
      <g transform="translate({ORIGIN.x} {ORIGIN.y.toFixed(2)})">
        <path class="hull" d={D.hull} />
        <path class="hull-shade" d={D.hull} transform={SHADE} />
        <path class="centreline" d={D.centreline} />
        <path class="well" d={D.cabin} />
        <path class="well" d={D.cockpit} />
        <path class="sprit" d={D.sprit} />
        {#each D.chainplates as c, i (i)}
          <circle class="chainplate" cx={c.x.toFixed(2)} cy={c.y.toFixed(2)} r="1.7" />
        {/each}
        <circle class="mast-step" cx="0" cy={D.mast.y.toFixed(2)} r="3" />
      </g>

      <!-- Sails. Ghost of the twisted ¾ section behind the half-height shape. -->
      <g class="sails">
        <path class="ghost" d={mainGhost} />
        <path class="ghost" d={jibGhost} />
        <path class="sail" d={mainSail} />
        <path class="sail" d={jibSail} />
        <line
          class="boom"
          x1={MAST.x}
          y1={MAST.y}
          x2={boomTip.x.toFixed(2)}
          y2={boomTip.y.toFixed(2)}
        />
      </g>

      {#each telltales as t (t.at)}
        <g
          transform="translate({t.p.x.toFixed(2)} {t.p.y.toFixed(2)}) rotate({streamDeg.toFixed(
            2,
          )}) scale(1 {side})"
        >
          <circle class="tt-dot" r="1.8" />
          <rect class="ribbon {t.state}" x="3.5" y="-1.3" width="13" height="2.6" rx="1.3" />
        </g>
      {/each}

      {#each mainTelltales as t (t.at)}
        <g
          transform="translate({t.p.x.toFixed(2)} {t.p.y.toFixed(2)}) rotate({boomStreamDeg.toFixed(
            2,
          )}) scale(1 {side})"
        >
          <circle class="tt-dot" r="1.8" />
          <rect class="ribbon {t.state}" x="3.5" y="-1.3" width="13" height="2.6" rx="1.3" />
        </g>
      {/each}
    </g>

    <!-- Heel, seen from astern, parked clear of the plan. -->
    <g class="heel" transform="translate({heelX} 226)">
      <line class="water" x1="-30" y1="0" x2="30" y2="0" />
      <!-- The inset shows the real angle, uncapped; only the plan-view tilt
           is a metaphor. Rotation is a CSS transform so it can ease. -->
      <g class="heel-boat" style="transform: rotate({(-side * heelDeg).toFixed(2)}deg)">
        <path class="keel" d="M -2 5 L -1.4 20 L 1.4 20 L 2 5 Z" />
        <path class="hull" d="M -22 -8 C -21 0 -15 6 0 6 C 15 6 21 0 22 -8 Z" />
        <line class="mast" x1="0" y1="-8" x2="0" y2="-40" />
      </g>
      <text class="tag" x="0" y="32">Heel {fmt(heelDeg)}°</text>
    </g>
  </svg>

  <figcaption>
    Bow up, {side === 1 ? 'starboard' : 'port'} tack. Camber, twist, heel and the wind angles are solved;
    boom and jib sheeting angles are read off the sheet controls, not from sheet loads. The lean of the
    plan view is illustrative and capped at {MAX_DRAWN_HEEL}°; the inset carries the solved heel.
  </figcaption>
</figure>

<dl class="mono">
  <div>
    <dt>Main draft</dt>
    <dd>{((main?.half.draft ?? 0) * 100).toFixed(1)}%</dd>
  </div>
  <div>
    <dt>Jib draft</dt>
    <dd>{((jib?.half.draft ?? 0) * 100).toFixed(1)}%</dd>
  </div>
  <div>
    <dt>Twist</dt>
    <dd>{(main?.threeQuarter.twistDeg ?? 0).toFixed(0)}°</dd>
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

  /* Deck ------------------------------------------------------------------ */

  .hull {
    fill: var(--hull);
    stroke: var(--ink);
    stroke-width: 1.25;
    stroke-linejoin: round;
  }

  /* The only shading in the drawing: one hairline just inside the sheer. */
  .hull-shade {
    fill: none;
    stroke: var(--ink);
    stroke-opacity: 0.06;
    stroke-width: 4;
  }

  .well {
    fill: var(--surface);
    stroke: var(--ink);
    stroke-width: 1.25;
    stroke-linejoin: round;
  }

  .centreline {
    fill: none;
    stroke: var(--muted);
    stroke-width: 1;
    stroke-dasharray: 4 4;
  }

  .sprit {
    fill: var(--ink);
  }

  .chainplate {
    fill: var(--ink-2);
  }

  .mast-step {
    fill: var(--ink);
  }

  /* Sails ----------------------------------------------------------------- */

  .sail {
    fill: var(--accent);
    fill-opacity: 0.18;
    stroke: var(--accent);
    stroke-width: 1.5;
    stroke-linejoin: round;
  }

  .ghost {
    fill: var(--accent);
    fill-opacity: 0.07;
    stroke: var(--accent);
    stroke-opacity: 0.4;
    stroke-width: 1;
  }

  .boom {
    stroke: var(--ink);
    stroke-width: 2;
    stroke-linecap: round;
  }

  /* Wind ------------------------------------------------------------------ */

  .wind line {
    stroke-width: 1.5;
    stroke-linecap: round;
  }

  .wind .twa {
    stroke: var(--ink-2);
    stroke-dasharray: 5 3;
  }

  .wind .awa {
    stroke: var(--accent);
  }

  .cap-twa {
    fill: var(--ink-2);
  }

  .cap-awa {
    fill: var(--accent);
  }

  .tag {
    fill: var(--ink-2);
    font-family: var(--font-sans);
    font-size: var(--tag-size, 11px);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.03em;
    text-anchor: middle;
  }

  .tag.accent {
    fill: var(--accent);
  }

  /* Telltales ------------------------------------------------------------- */

  .tt-dot {
    fill: var(--ink-2);
  }

  /* fill-box, or `left center` resolves against the viewBox and the ribbon
     is flung across the drawing instead of pivoting on its own root. */
  .ribbon {
    transform-box: fill-box;
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

  /* Heel ------------------------------------------------------------------ */

  .heel .water {
    stroke: var(--accent);
    stroke-width: 1.25;
    stroke-opacity: 0.6;
  }

  .heel .mast {
    stroke: var(--ink);
    stroke-width: 1.5;
    stroke-linecap: round;
  }

  .heel .keel {
    fill: var(--muted);
  }

  /* Motion -----------------------------------------------------------------

     transform/opacity only, so nothing here can trigger layout, and every rule
     lives under `no-preference`. tokens.css also kills animation and
     transition duration globally under `prefers-reduced-motion: reduce`; the
     tweens read the same media query through svelte/motion. */

  .boat {
    transform-box: view-box;
  }

  /* Its local origin is already the waterline it pivots on; the CSS default
     of 50% would swing it out of the inset. */
  .heel-boat {
    transform-box: view-box;
    transform-origin: 0 0;
  }

  @media (prefers-reduced-motion: no-preference) {
    .boat,
    .heel-boat {
      transition: transform 300ms ease-out;
    }

    /* Streaming ribbons wave; a lifting one flicks up off the luff; a stalled
       one hangs drooped and shivers. Durations are the read, not physics. */
    .ribbon.streaming {
      animation: flutter 1.2s ease-in-out infinite;
    }

    .ribbon.lifting {
      animation: lift 0.5s ease-in-out infinite;
    }

    .ribbon.stalled {
      animation: stall 0.3s ease-in-out infinite;
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
      transform: rotate(-22deg);
    }
    35% {
      transform: rotate(-52deg);
    }
  }

  @keyframes stall {
    0%,
    100% {
      transform: rotate(46deg);
    }
    50% {
      transform: rotate(54deg);
    }
  }

  /* Readouts -------------------------------------------------------------- */

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
