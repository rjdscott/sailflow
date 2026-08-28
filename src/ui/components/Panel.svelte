<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * One subject of the cockpit — a control group, the picture of what it does,
   * and the numbers it moves. It sizes off its own width (a container query),
   * not the viewport, so the same panel works in a column or across a desk.
   */
  let {
    title,
    id,
    cue,
    lit = -1,
    status,
    controls,
    visual,
    instruments,
  }: {
    title: string;
    /** Id of the heading; the section is labelled by it. */
    id: string;
    /** One-line coaching cue. Learn tier only — race mode has no room for prose. */
    cue?: string;
    /**
     * Place in the puff replay's working order (0 first), or −1 for not lit.
     * The panel goes on being what it was; it just says "you, now" while a
     * replay is running (research 02 §3, the cross-panel puff overlay).
     */
    lit?: number;
    /** Panel state, not a reading: one chip at the end of the header line. */
    status?: Snippet;
    controls: Snippet;
    visual: Snippet;
    instruments?: Snippet;
  } = $props();
</script>

<section class="panel" aria-labelledby={id} data-lit={lit >= 0 ? lit : undefined}>
  <div class="head">
    <h2 {id} class="section-title">{title}</h2>
    {#if status}<div class="status">{@render status()}</div>{/if}
    {#if cue}<p class="cue">{cue}</p>{/if}
  </div>

  <div class="grid" class:with-instruments={!!instruments}>
    <!-- Narrow: the picture comes first, because it is what you look at while
         your thumb is still finding the control. -->
    <div class="visual">{@render visual()}</div>
    <div class="controls">{@render controls()}</div>
    {#if instruments}<div class="instruments">{@render instruments()}</div>{/if}
  </div>
</section>

<style>
  .panel {
    container-type: inline-size;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4);
    border-radius: var(--radius-card);
    background: var(--surface-2, var(--surface));
    /* The phone's tab strip is sticky over the top of whatever it scrolled
       to, so a panel keeps the strip's height clear of its own heading.
       prov: assumed 88 px — the 48 px strip, its padding and one gap. */
    scroll-margin-top: 88px;
  }

  /* Lit by the puff replay. The outline is static, so the panel still reads as
     "this one next" when motion is reduced and the pulse below collapses to
     nothing (tokens.css kills the animation, not the outline). The three
     delays are the working order: first panel now, the others a beat later. */
  .panel[data-lit] {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
    animation: lit-pulse 900ms ease-out 2;
  }

  .panel[data-lit='1'] {
    animation-delay: 220ms;
  }

  .panel[data-lit='2'] {
    animation-delay: 440ms;
  }

  @keyframes lit-pulse {
    from {
      box-shadow: 0 0 0 0 var(--accent);
    }

    to {
      box-shadow: 0 0 0 8px transparent;
    }
  }

  .head {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-3);
  }

  /* End of the title's line, so it costs no height of its own; the cue takes
     the whole of the next line. */
  .status {
    order: 1;
    margin-inline-start: auto;
  }

  .cue {
    order: 2;
    flex-basis: 100%;
  }

  .cue {
    display: none;
    margin: 0;
    font-size: var(--text-sm);
    color: var(--ink-2);
  }

  :global([data-tier='learn']) .cue {
    display: block;
  }

  /* Narrow: the picture comes first, because it is what you look at while a
     thumb is still finding the control. Named areas rather than `order`, so
     the wide steps below can rearrange rows as well as columns. */
  .grid {
    display: grid;
    gap: var(--space-4);
    min-width: 0;
    align-content: start;
    grid-template-areas:
      'visual'
      'controls';
  }

  .grid.with-instruments {
    grid-template-areas:
      'visual'
      'controls'
      'instruments';
  }

  .controls,
  .visual,
  .instruments {
    min-width: 0;
  }

  /* A control row decides between its one-line and two-line form off this
     width, not off the viewport's: the same panel is 600 px wide in one
     cockpit column and 270 px in another (research §2E — media queries for
     the page grid, container queries for panel internals). */
  .controls {
    container-type: inline-size;
  }

  .visual {
    grid-area: visual;
  }

  .controls {
    grid-area: controls;
  }

  .instruments {
    grid-area: instruments;
  }

  /* Wide enough for the control beside its picture. Stacking all three is what
     made a cockpit panel 830 px tall in a 600 px column and put 54–81 % of it
     behind a scroller (audit ux-03 M-01); side by side the panel is as tall as
     its tallest column instead of the sum of three.
     prov: assumed 520 px — the control column keeps ~300 px, which is a name,
     a value and a track a mouse can aim at. */
  @container (min-width: 470px) {
    .grid {
      grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
      grid-template-areas: 'controls visual';
    }

    /* No instrument rail (the Rig panel): its controls are three sliders that
       need room for a name, a value and a track, and its picture reads fine at
       260 px. prov: assumed 300 px floor — `ControlRow`'s one-line form starts
       at a 420 px control container, and 300 px is the two-line form's floor. */
    .grid:not(.with-instruments) {
      grid-template-columns: minmax(300px, 1fr) minmax(0, 260px);
    }

    .grid.with-instruments {
      grid-template-areas:
        'controls visual'
        'controls instruments';
    }
  }

  /* Wider still: the numbers get their own rail, so nothing is stacked at all
     and the panel is exactly as tall as its tallest of three columns.
     prov: assumed 595 px — a 265 px control column (a name, a value and a
     track a mouse can aim at), a 190 px picture, a 110 px rail, two gaps. */
  @container (min-width: 595px) {
    .grid.with-instruments {
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 0.58fr);
      grid-template-areas: 'controls visual instruments';
    }
  }
</style>
