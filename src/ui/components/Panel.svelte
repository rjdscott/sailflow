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
    controls,
    visual,
    instruments,
  }: {
    title: string;
    /** Id of the heading; the section is labelled by it. */
    id: string;
    /** One-line coaching cue. Learn tier only — race mode has no room for prose. */
    cue?: string;
    controls: Snippet;
    visual: Snippet;
    instruments?: Snippet;
  } = $props();
</script>

<section class="panel" aria-labelledby={id}>
  <div class="head">
    <h2 {id} class="section-title">{title}</h2>
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
  }

  .head {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-3);
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

  .grid {
    display: grid;
    gap: var(--space-4);
    min-width: 0;
  }

  .controls,
  .visual,
  .instruments {
    min-width: 0;
  }

  /* Wide enough for the control and its picture side by side: controls left,
     what you look at right, and the numbers in a narrow rail beside them. */
  @container (min-width: 560px) {
    .grid {
      grid-template-columns: minmax(0, 1fr) minmax(200px, 1fr);
    }

    .grid.with-instruments {
      grid-template-columns: minmax(0, 1fr) minmax(200px, 1fr) minmax(120px, 0.6fr);
    }

    .visual {
      order: 1;
    }

    .controls {
      order: 0;
    }

    .instruments {
      order: 2;
    }
  }
</style>
