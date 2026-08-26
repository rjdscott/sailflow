<script lang="ts">
  import ExplainDiagram from '../../components/ExplainDiagram.svelte';
  import { EXPLAIN_DETAIL } from '../../explainDetail';

  /**
   * The Learn tier's on-the-page explainer for one control: the schematic and
   * the what-it-changes list, without the paragraph — the `?` still has that.
   *
   * Its own file so `ControlRow` can `await import()` it: the schematics and
   * the copy are Learn-tier content, and the first load is measured against a
   * committed budget (ADR 0014, `scripts/bundle_check.mjs`). Putting them in
   * the entry chunk would charge every Race-tier visitor for text they have
   * switched off.
   */
  let { id }: { id: string } = $props();

  const detail = $derived(EXPLAIN_DETAIL[id]);
</script>

{#if detail}
  <div class="inline-explain">
    <ExplainDiagram kind={detail.diagram} />
    <ul>
      {#each detail.changes as c (c)}
        <li>{c}</li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  /* The drawing takes a fixed, small column so three bullets set against it
     instead of under it. */
  .inline-explain {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    margin: 0 0 var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius);
    background: var(--surface);
  }

  .inline-explain :global(svg) {
    flex: none;
    width: 96px;
  }

  ul {
    margin: 0;
    padding-inline-start: 1.1em;
    font-size: var(--text-xs);
    line-height: 1.45;
    color: var(--ink-2);
  }
</style>
