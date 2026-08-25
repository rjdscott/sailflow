<script lang="ts">
  import ConfidenceBadge from '../components/ConfidenceBadge.svelte';
  import { fmt } from '../format';
  import { trackPct } from '../components/logic';

  /**
   * The jib leech against the spreader stripes — the analogue ruler J/70
   * crews actually read (research §2.5). Three marks at 18, 20 and 22 inches
   * out from the mast, and one marker where the model puts the leech.
   *
   * The index comes from the solver (`Instruments.jibLeechStripe`): 0 is the
   * inner stripe, 2 the outer, below zero is hooked inside the inner one. It
   * is tier C — the geometry is sign-correct, the inches are calibrated to
   * the base trim rather than measured on a boat (ASSUMPTIONS.md).
   */
  let {
    stripe,
    inches,
    id = 'jibStripe',
    onexplain,
  }: {
    /** Continuous stripe index. Unclamped from the solver; clamped for drawing. */
    stripe: number;
    /** The three painted distances, from the core module. */
    inches: readonly [number, number, number];
    id?: string;
    onexplain?: (id: string) => void;
  } = $props();

  // The drawn window is wider than the painted stripes so a hooked or a
  // twisted-off leech still lands on the picture instead of on its edge.
  const LO = -1.5;
  const HI = 3;
  const X0 = 8;
  const X1 = 124;

  const x = (index: number): number => X0 + ((X1 - X0) * trackPct(index, LO, HI)) / 100;
  const marker = $derived(x(stripe));
  const label = $derived(inches[0] + (inches[1] - inches[0]) * stripe);
</script>

<div class="gauge">
  <span class="head">
    <span class="section-title">
      {#if onexplain}
        <button type="button" class="explain" onclick={() => onexplain(id)}>
          Jib leech<span aria-hidden="true" class="q">?</span>
        </button>
      {:else}
        Jib leech
      {/if}
      <ConfidenceBadge tier="C" />
    </span>
    <span class="v tabular-nums">{fmt(label, 0, '"')}</span>
  </span>

  <svg
    viewBox="0 0 132 56"
    role="img"
    aria-label="Jib leech at stripe {stripe.toFixed(1)}, about {label.toFixed(
      0,
    )} inches from the mast. Stripes at {inches.join(', ')} inches."
  >
    <!-- The spreader, running outboard from the mast at the left. It is drawn
         a little past the outer stripe rather than to a measured length: the
         class rules do not publish one (ASSUMPTIONS.md, rig.spreaderLenM). -->
    <line class="spreader" x1={X0} y1="22" x2={X1} y2="22" />
    <line class="mast" x1={X0} y1="8" x2={X0} y2="36" />

    {#each inches as inch, i (inch)}
      <line class="stripe" x1={x(i)} y1="14" x2={x(i)} y2="30" />
      <text class="tick" x={x(i)} y="44">{inch}"</text>
    {/each}

    <!-- The leech itself: a mark, not a bar. The scale does not start at zero
         and a bar from the left would read as a ratio it does not have. -->
    <polygon class="leech" points="{marker},22 {marker - 5},10 {marker + 5},10" />
  </svg>

  <p class="note">Inner stripe hooked, outer twisted off; the middle is the base setting.</p>
</div>

<style>
  .gauge {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 0;
  }

  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .explain {
    padding: 0;
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    letter-spacing: inherit;
    text-transform: inherit;
    cursor: pointer;
  }

  .q {
    margin-left: 3px;
    color: var(--accent);
  }

  .v {
    color: var(--instrument, var(--ink));
    font-size: var(--text-md);
    font-weight: 600;
    white-space: nowrap;
  }

  svg {
    display: block;
    width: 100%;
    height: auto;
  }

  .spreader {
    stroke: var(--muted);
    stroke-width: 4;
    stroke-linecap: round;
  }

  .mast {
    stroke: var(--ink-2);
    stroke-width: 4;
    stroke-linecap: round;
  }

  .stripe {
    stroke: var(--line-strong);
    stroke-width: 2;
  }

  .leech {
    fill: var(--instrument, var(--ink));
  }

  .tick {
    fill: var(--ink-2);
    font-family: var(--font-sans);
    font-size: 11px;
    text-anchor: middle;
  }

  .note {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  /* Race and analyse read the picture; the sentence is the learner's. */
  .note {
    display: none;
  }

  :global([data-tier='learn']) .note {
    display: block;
  }
</style>
