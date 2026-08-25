<script lang="ts">
  import { cubicOut } from 'svelte/easing';
  import { prefersReducedMotion, Tween } from 'svelte/motion';
  import type { AeroState, SailShape } from '../../core/types';
  import Sheet from '../components/Sheet.svelte';
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
    PLAN_LAYOUT,
    roseArrow,
    sailPath,
    sailPoints,
    tackSide,
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
  // explainer says so. The viewBox is cropped to the boat (`PLAN_LAYOUT`),
  // which is what makes the hull the size of the card rather than a detail in
  // the middle of it; boat.test.ts holds every clearance against those numbers.
  const L = PLAN_LAYOUT;
  const D = deck(L.scale);
  const ORIGIN = L.origin;
  const MAST = { x: ORIGIN.x, y: ORIGIN.y + D.mast.y };
  const TACK = { x: ORIGIN.x, y: ORIGIN.y };
  /** Heel pivot: the middle of the boat's whole length, bowsprit tip to transom. */
  const HUB = { x: ORIGIN.x, y: ORIGIN.y + (D.sternY + D.spritTip.y) / 2 };
  /** Inner shadow: the deck outline shrunk just inside itself. */
  const SHADE = `translate(0 ${(D.sternY * 0.55).toFixed(2)}) scale(0.94 0.98) translate(0 ${(-D.sternY * 0.55).toFixed(2)})`;

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

  let explaining = $state(false);

  const side = $derived(tackSide(twaDeg));
  const ctl = $derived(race.controls.race);
  const main = $derived(race.result?.shape.main);

  // Tween the two sheeting angles, not the path strings they feed: every
  // shape hanging off a spar (sail, ghost, telltale) swings with it.
  const boom = Tween.of(() => boomAngle(ctl.mainsheet, ctl.traveller), EASE);
  const jibSheet = Tween.of(() => jibSheetAngle(ctl.jibLead, ctl.jibSheet), EASE);
  const boomDeg = $derived(boom.current);
  const jibDeg = $derived(jibSheet.current);
  // Under the gennaker the jib is furled: no jib outline, ghost or telltales.
  const jibUp = $derived(conditions.sailset === 'jib');

  const boomTip = $derived(clewAt(MAST, boomDeg, D.boomPx, side));
  const jibClew = $derived(clewAt(TACK, jibDeg, D.jibFootPx, side));

  const mainSail = $derived(main ? sailPath(MAST, boomTip, main.half, side) : '');
  const jibSail = $derived(jib && jibUp ? sailPath(TACK, jibClew, jib.half, side) : '');

  /** The ¾-height section, shorter in chord and twisted open: twist, in plan. */
  function ghost(tack: Pt, deg: number, len: number, s: SailShape): string {
    const head = clewAt(tack, deg, len, side);
    return sailPath(tack, openBy(tack, head, s.threeQuarter.twistDeg, side), s.threeQuarter, side);
  }
  const mainGhost = $derived(
    main ? ghost(MAST, boomDeg, D.boomPx * DIMS.headChord.main, main) : '',
  );
  const jibGhost = $derived(
    jib && jibUp ? ghost(TACK, jibDeg, D.jibFootPx * DIMS.headChord.jib, jib) : '',
  );

  // The rose sits off the windward bow and mirrors with the tack, so it is
  // always on the side the wind is coming from and never over the sails.
  const rose = $derived({ x: ORIGIN.x + side * L.rose.dx, y: ORIGIN.y + L.rose.dy });
  const armLen = $derived(arrowLength(conditions.twsKt));
  const twa = $derived(roseArrow(twaDeg, rose, L.rose.radius, armLen));
  const awa = $derived(roseArrow(side * aero.awaDeg, rose, L.rose.radius, armLen));

  /** Plan view has no third axis: the tilt is a metaphor, and it is capped. */
  const tiltDeg = $derived(drawnHeel(heelDeg, side));
  /** The solved angle, uncapped, in the corner the sails never reach. */
  const heelX = $derived(ORIGIN.x + side * L.heelTag.dx);

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
    jib && jibUp
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

  /** One string, so the accessible name is not a wrapped attribute literal. */
  const alt = $derived(
    `Plan view of the boat, bow up, on ${side === 1 ? 'starboard' : 'port'} tack, ` +
      `heeling ${fmt(heelDeg)} degrees, true wind ${fmt(twaDeg)} degrees off the bow`,
  );
</script>

<div class="plan">
  <svg viewBox="0 0 {L.w} {L.h}" role="img" aria-label={alt}>
    <defs>
      <marker
        id="plan-cap-twa"
        viewBox="0 0 8 8"
        refX="7"
        refY="4"
        markerWidth="4"
        markerHeight="4"
        orient="auto"
      >
        <path class="cap-twa" d="M 0 0.6 L 8 4 L 0 7.4 z" />
      </marker>
      <marker
        id="plan-cap-awa"
        viewBox="0 0 8 8"
        refX="7"
        refY="4"
        markerWidth="4"
        markerHeight="4"
        orient="auto"
      >
        <path class="cap-awa" d="M 0 0.6 L 8 4 L 0 7.4 z" />
      </marker>
    </defs>

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

    <!-- Wind rose, off the windward bow: both arrows blow in from the rim,
         labels stacked underneath so they never chase the arrowheads. -->
    <g class="wind">
      <circle class="rim" cx={rose.x} cy={rose.y} r={L.rose.radius} />
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
      <text class="tag" x={rose.x} y={L.rose.labelY[0]}>TWA {fmt(twaDeg)}°</text>
      <text class="tag accent" x={rose.x} y={L.rose.labelY[1]}>AWA {fmt(aero.awaDeg)}°</text>
    </g>

    <!-- Heel is the lean of the hull itself; the figure carries the solved
         angle, because the lean is capped and the number is not. -->
    <text class="tag" x={heelX} y={L.heelTag.y}>Heel {fmt(heelDeg)}°</text>
  </svg>

  <div class="side">
    <p class="caption">
      Bow up, {side === 1 ? 'starboard' : 'port'} tack. Sheeting angles are read off the controls.
      <button
        type="button"
        class="info"
        onclick={() => (explaining = true)}
        aria-label="How to read this picture">?</button
      >
    </p>

    <!-- The ribbon colours mean three states, and nothing on screen said which
         (audit ux-01 M-02's sibling complaint: colour with no legend). -->
    <ul class="legend">
      <li title="Flow attached: this is the target.">
        <span class="swatch streaming"></span>Streaming
      </li>
      <li title="Entry too high: bear away or ease.">
        <span class="swatch lifting"></span>Lifting
      </li>
      <li title="Over-trimmed: the sail is choking.">
        <span class="swatch stalled"></span>Stalled
      </li>
    </ul>

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
  </div>
</div>

<Sheet bind:open={explaining} title="Reading the boat">
  <p>
    Bow up, on the tack the true wind angle says. Camber, twist, heel and the wind angles are
    solved; boom and jib sheeting angles are read off the sheet controls, not from sheet loads.
  </p>
  <p>
    The lean of the plan view is illustrative and capped at {MAX_DRAWN_HEEL}°. The Heel figure is
    the solved angle, uncapped.
  </p>
  <p>The telltale ribbons carry three states:</p>
  <ul>
    <li><strong>Streaming</strong> — flow attached, this is the target.</li>
    <li><strong>Lifting</strong> — entry too high, bear away or ease.</li>
    <li><strong>Stalled</strong> — over-trimmed, the sail is choking.</li>
  </ul>
</Sheet>

<style>
  /* Phone and tablet: picture over facts. From 1024 the hero card is wide and
     the boat is tall, so the facts move into the flank the hull leaves empty
     — which is what takes the card from ~660 px to ~430 px. */
  .plan {
    display: grid;
    gap: var(--space-3);
    align-items: start;
  }

  svg {
    display: block;
    width: 100%;
    height: auto;
    max-height: 340px;
    margin-inline: auto;
  }

  @media (min-width: 1024px) {
    .plan {
      grid-template-columns: auto minmax(160px, 1fr);
      gap: var(--space-4);
    }

    /* Height-driven, so the card's height is the picture's height and the
       aspect ratio picks the width. */
    svg {
      width: auto;
      height: 360px;
      max-height: none;
      max-width: 100%;
      margin-inline: 0;
    }
  }

  .side {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-width: 0;
  }

  .caption {
    margin: 0;
    font-size: var(--text-xs);
    line-height: 1.5;
    color: var(--ink-2);
  }

  .info {
    padding: 0 6px;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    background: transparent;
    color: var(--ink-2);
    font: inherit;
    line-height: 1.4;
    cursor: pointer;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-3);
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .legend li {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .swatch {
    width: 12px;
    height: 4px;
    border-radius: 2px;
    flex: none;
  }

  .swatch.streaming {
    background: var(--good);
  }

  .swatch.lifting {
    background: var(--warn);
  }

  .swatch.stalled {
    background: var(--bad);
  }

  /* Deck ------------------------------------------------------------------ */

  .hull {
    fill: var(--hull);
    stroke: var(--ink);
    stroke-width: 0.9;
    stroke-linejoin: round;
  }

  /* The only shading in the drawing: one hairline just inside the sheer. */
  .hull-shade {
    fill: none;
    stroke: var(--ink);
    stroke-opacity: 0.06;
    stroke-width: 3;
  }

  .well {
    fill: var(--surface);
    stroke: var(--ink);
    stroke-width: 0.9;
    stroke-linejoin: round;
  }

  .centreline {
    fill: none;
    stroke: var(--muted);
    stroke-width: 0.7;
    stroke-dasharray: 3 3;
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
    stroke-width: 1.1;
    stroke-linejoin: round;
  }

  .ghost {
    fill: var(--accent);
    fill-opacity: 0.07;
    stroke: var(--accent);
    stroke-opacity: 0.4;
    stroke-width: 0.7;
  }

  .boom {
    stroke: var(--ink);
    stroke-width: 1.4;
    stroke-linecap: round;
  }

  /* Wind ------------------------------------------------------------------ */

  .wind line {
    stroke-width: 1.2;
    stroke-linecap: round;
  }

  .rim {
    fill: none;
    stroke: var(--line-strong);
    stroke-width: 0.7;
    stroke-dasharray: 2 3;
  }

  .wind .twa {
    stroke: var(--ink-2);
    stroke-dasharray: 4 2.5;
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
    font-size: 7px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
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

  /* Motion -----------------------------------------------------------------

     transform/opacity only, so nothing here can trigger layout, and every rule
     lives under `no-preference`. tokens.css also kills animation and
     transition duration globally under `prefers-reduced-motion: reduce`; the
     tweens read the same media query through svelte/motion. */

  .boat {
    transform-box: view-box;
  }

  @media (prefers-reduced-motion: no-preference) {
    .boat {
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
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--space-1) var(--space-4);
    margin: 0;
    padding-top: var(--space-3);
    border-top: 1px solid var(--line);
  }

  dl div {
    display: flex;
    justify-content: space-between;
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
