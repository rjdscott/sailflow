<script lang="ts">
  /**
   * The gennaker's one feedback cue: is the luff curling, or flying?
   *
   * The boolean is `kiteGeometry(...).curl` — the same tier-C geometric
   * threshold on sheet travel the 3D hero's limp luff ribbons and the plan
   * view's dashed outline read (ADR 0017). It is **not** an aero event: curl
   * onset versus sheet position is unmeasured anywhere in the literature
   * (research 04 §6 row 24), so this says which side of an assumed threshold
   * the sheet is on and the caption says so.
   *
   * The fold is drawn in the upper luff on purpose. Quantum is the only source
   * that quantifies where the curl belongs — "the top 50 percent of the luff"
   * — and the measured mechanism starts at ¾ height and propagates down
   * (research 03 §3, 02 §5).
   */
  let { curl }: { curl: boolean } = $props();
</script>

<div class="cue" class:curling={curl}>
  <svg viewBox="0 0 80 120" role="img" aria-label={curl ? 'Luff curling' : 'Luff flying'}>
    <!-- Tack at the foot, head at the top: the free edge, bowed to leeward. -->
    <path class="luff" d="M 20 112 Q 4 66 30 10" />
    <!-- The leech and foot, faint: they are here to make the luff read as an
         edge of a sail rather than as a loose arc. -->
    <path class="body" d="M 20 112 Q 4 66 30 10 L 66 96 Z" />
    {#if curl}
      <!-- The fold, at ¾ height and folding to windward. -->
      <path class="fold" d="M 12 42 q -9 -7 -1 -15 q 7 -6 13 -2" />
    {/if}
  </svg>
  <!-- A `p`, not a `figcaption`: the cockpit hides panel figcaptions at
       1280 px (they repeat the chip titles there) and this one is the cue. -->
  <p class="state">{curl ? 'Curling — trim back' : 'Flying — ease to find the curl'}</p>
</div>

<style>
  .cue {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    margin: 0;
    min-width: 0;
  }

  svg {
    width: 100%;
    max-width: 110px;
    height: auto;
  }

  .body {
    fill: var(--ink-2);
    opacity: 0.14;
    stroke: none;
  }

  .luff {
    fill: none;
    stroke: var(--ink-2);
    stroke-width: 2.5;
    stroke-linecap: round;
  }

  /* The accent is the cue, the same way it is on every other panel: the
     drawing changes state, it does not change colour meaning. Red and green
     stay reserved for telltales (ADR 0015). */
  .curling .luff {
    stroke: var(--accent);
    stroke-dasharray: 5 4;
  }

  .fold {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2.5;
    stroke-linecap: round;
  }

  .state {
    font-size: var(--text-xs);
    margin: 0;
    color: var(--ink-2);
    text-align: center;
  }
</style>
