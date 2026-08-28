<script lang="ts">
  import { arrowLength, roseArrow } from './boat';
  import { angleAt, stepTwa, TWA_MAX, TWA_MIN } from './windRose';

  /**
   * The wind angle you drag (audit ux-04 M-08). Sailors think in arrows, and
   * the only angle cue on the cockpit used to be the text `42°` — the proper
   * rose was a tab away in the plan view, so this one draws the same two arrows
   * with the same `roseArrow` maths and makes the true one draggable.
   *
   * A native `role="slider"`, not a `<input type=range>` rotated with CSS: the
   * value is an angle around a circle, so the keyboard contract is a slider's
   * (arrows ±1°, shift ±5°, Home/End) but the geometry is not a track's.
   */
  let {
    twaDeg,
    awaDeg,
    twsKt,
    editable = true,
    onchange,
  }: {
    twaDeg: number;
    /** The wind the sails see, drawn as the second arrow. Omitted, only TWA is drawn. */
    awaDeg?: number;
    /** Both arrows carry the true wind's strength, as in the plan view. */
    twsKt: number;
    editable?: boolean;
    onchange?: (twaDeg: number) => void;
  } = $props();

  const C = { x: 50, y: 50 };
  const R = 40;

  let svg: SVGSVGElement | undefined = $state();

  const arm = $derived(arrowLength(twsKt, 22, 32));
  const twa = $derived(roseArrow(twaDeg, C, R, arm));
  const awa = $derived(awaDeg === undefined ? null : roseArrow(awaDeg, C, R, arm));

  /** Client pixels → user units: the viewBox is square, so one scale does both. */
  function set(e: PointerEvent): void {
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    const s = 100 / box.width;
    const next = angleAt(C.x, C.y, (e.clientX - box.left) * s, (e.clientY - box.top) * s);
    if (next !== twaDeg) onchange?.(next);
  }

  function onPointerDown(e: PointerEvent): void {
    if (!editable) return;
    // Capture: the drag keeps feeding this element once the pointer leaves the
    // 56 px rose, which it does immediately on a phone under a thumb.
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    e.preventDefault();
    svg?.focus();
    set(e);
  }

  function onPointerMove(e: PointerEvent): void {
    if (!editable) return;
    if (!(e.currentTarget as SVGSVGElement).hasPointerCapture(e.pointerId)) return;
    set(e);
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (!editable) return;
    const next = stepTwa(twaDeg, e.key, e.shiftKey);
    if (next === null) return;
    e.preventDefault();
    if (next !== twaDeg) onchange?.(next);
  }
</script>

<!-- The role is a prop, so the compiler cannot see that the tabindex only ever
     goes with `role="slider"` — an interactive role. A read-only rose, in a
     drill, has no tabindex at all. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<svg
  bind:this={svg}
  class="rose"
  class:editable
  viewBox="0 0 100 100"
  role={editable ? 'slider' : 'img'}
  tabindex={editable ? 0 : undefined}
  aria-label="True wind angle"
  aria-valuemin={editable ? TWA_MIN : undefined}
  aria-valuemax={editable ? TWA_MAX : undefined}
  aria-valuenow={editable ? twaDeg : undefined}
  aria-valuetext={editable ? `${twaDeg.toFixed(0)} degrees` : undefined}
  aria-readonly={editable ? undefined : 'true'}
  aria-roledescription={editable ? undefined : 'wind angle'}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onkeydown={onKeyDown}
>
  {#if !editable}<title>True wind angle {twaDeg.toFixed(0)} degrees</title>{/if}
  <defs>
    <marker
      id="rose-cap-twa"
      viewBox="0 0 8 8"
      refX="6"
      refY="4"
      markerWidth="2.6"
      markerHeight="2.6"
      orient="auto"
    >
      <path class="cap-twa" d="M0 0 L8 4 L0 8 Z" />
    </marker>
    <marker
      id="rose-cap-awa"
      viewBox="0 0 8 8"
      refX="6"
      refY="4"
      markerWidth="2.6"
      markerHeight="2.6"
      orient="auto"
    >
      <path class="cap-awa" d="M0 0 L8 4 L0 8 Z" />
    </marker>
  </defs>

  <circle class="rim" cx={C.x} cy={C.y} r={R} />

  <!-- Bow-up tick at 0°: the one mark that says which way the boat is pointing,
       so the arrows read as angles off the bow rather than off nothing. -->
  <line class="tick" x1={C.x} y1={C.y - R - 3} x2={C.x} y2={C.y - R + 5} />

  <!-- The boat, bow up: the arrows are angles off this. -->
  <path class="hull" d="M50 30 C58 41 59 54 57 66 L43 66 C41 54 42 41 50 30 Z" />

  {#if awa}
    <line
      class="awa"
      x1={awa.tail.x.toFixed(2)}
      y1={awa.tail.y.toFixed(2)}
      x2={awa.head.x.toFixed(2)}
      y2={awa.head.y.toFixed(2)}
      marker-end="url(#rose-cap-awa)"
    />
  {/if}
  <line
    class="twa"
    x1={twa.tail.x.toFixed(2)}
    y1={twa.tail.y.toFixed(2)}
    x2={twa.head.x.toFixed(2)}
    y2={twa.head.y.toFixed(2)}
    marker-end="url(#rose-cap-twa)"
  />
  <!-- The grab handle, on the rim where the true wind comes from. -->
  {#if editable}<circle
      class="grip"
      cx={twa.tail.x.toFixed(2)}
      cy={twa.tail.y.toFixed(2)}
      r="5"
    />{/if}
</svg>

<style>
  /* Big enough to be a picture rather than a smudge. The rose is the one
     control here that cannot fall back to a bigger hit area — its whole face
     is the target — and at 56 px the hull, the rim and two arrows were four
     marks inside 25 px of radius. */
  .rose {
    width: 64px;
    height: 64px;
    flex: none;
    touch-action: none;
    overflow: visible;
  }

  .rose.editable {
    cursor: grab;
  }

  .rose.editable:active {
    cursor: grabbing;
  }

  .rose:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
    border-radius: 50%;
  }

  /* Drawn heavy: the whole rose is 44-56 px on screen, so a 1.6-unit stroke is
     a sub-pixel hairline that disappears at both sizes. */
  .rim {
    fill: none;
    stroke: var(--line-strong);
    stroke-width: 2;
    stroke-dasharray: 5 6;
  }

  .tick {
    stroke: var(--line-strong);
    stroke-width: 3;
  }

  /* Deck fill, ink outline: the same pair the plan view draws a hull with, so
     the glyph in the middle of the rose reads as a boat and not as a blob. */
  .hull {
    fill: var(--hull);
    stroke: var(--ink);
    stroke-width: 2;
  }

  line {
    stroke-width: 4;
    stroke-linecap: butt;
  }

  /* The true wind is the one you drag, so it is the solid, heavier arrow; the
     apparent wind is the accent hairline that follows it. */
  .twa {
    stroke: var(--ink);
  }

  .awa {
    stroke: var(--accent);
    stroke-width: 3;
  }

  .cap-twa {
    fill: var(--ink);
  }

  .cap-awa {
    fill: var(--accent);
  }

  /* Where the hand goes. Filled with the same ink as the arrow it drags. */
  /* On the rim, where the true wind blows in from — never over the hull, which
     is the one thing in the rose that has to stay readable. */
  .grip {
    fill: var(--ink);
    stroke: var(--bg);
    stroke-width: 1.5;
  }

  /* The cockpit has the room, and this is a picture as much as a control. */
  @media (min-width: 1280px) {
    .rose {
      width: 72px;
      height: 72px;
    }
  }
</style>
