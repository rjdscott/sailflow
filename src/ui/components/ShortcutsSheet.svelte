<script lang="ts">
  import Sheet from './Sheet.svelte';
  import { SHORTCUTS } from '../keys';

  let { open = $bindable(false) }: { open?: boolean } = $props();
</script>

<Sheet bind:open title="Keyboard shortcuts">
  <dl class="rows">
    {#each SHORTCUTS as s (s.keys)}
      <dt><kbd>{s.keys}</kbd></dt>
      <dd>{s.what}</dd>
    {/each}
  </dl>
  <p class="note">Shortcuts are off while you are typing in a field.</p>
</Sheet>

<style>
  .rows {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--space-2) var(--space-4);
    margin: 0;
    font-size: var(--text-sm);
  }

  dd {
    margin: 0;
    color: var(--ink);
  }

  kbd {
    display: inline-block;
    padding: 2px var(--space-2);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--ink);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    white-space: nowrap;
  }

  .note {
    margin: var(--space-4) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }
</style>
