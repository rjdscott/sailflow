<script lang="ts">
  import Sheet from '../../components/Sheet.svelte';
  import ExplainDiagram from '../../components/ExplainDiagram.svelte';
  import { EXPLAIN_DETAIL } from '../../explainDetail';
  import { explainText, explainTitle } from './copy';

  /**
   * The explain sheet, once. Five panels were each carrying the same three
   * lines of markup, so adding the diagram and the what-it-changes list
   * (audit ux-01 L-03) meant editing the same block five times — that is the
   * abstraction earning itself, not one invented for later.
   *
   * A readout (`READOUT_EXPLAIN`) has a paragraph and no diagram: the picture
   * is the gauge it was opened from. A control gets both.
   */
  let { open = $bindable(false), id }: { open?: boolean; id: string | null } = $props();

  const detail = $derived(id ? EXPLAIN_DETAIL[id] : undefined);
</script>

<Sheet bind:open title={explainTitle(id)}>
  {#if detail}
    <figure class="fig">
      <ExplainDiagram kind={detail.diagram} />
    </figure>
  {/if}
  <p class="explainer">{explainText(id)}</p>
  {#if detail}
    <h3 class="section-title">What it changes</h3>
    <ul class="changes">
      {#each detail.changes as c (c)}
        <li>{c}</li>
      {/each}
    </ul>
  {/if}
</Sheet>

<style>
  .fig {
    display: flex;
    justify-content: center;
    margin: 0 0 var(--space-3);
    padding: var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
  }

  .explainer {
    margin: 0;
    font-size: var(--text-md);
    line-height: 1.55;
    color: var(--ink);
  }

  h3 {
    margin: var(--space-4) 0 var(--space-2);
  }

  .changes {
    margin: 0;
    padding-inline-start: 1.2em;
    font-size: var(--text-sm);
    line-height: 1.5;
    color: var(--ink-2);
  }

  .changes li + li {
    margin-top: var(--space-1);
  }
</style>
