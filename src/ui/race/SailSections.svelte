<script lang="ts">
  import type { SailShape } from '../../core/types';
  import SailSectionStack from './SailSectionStack.svelte';

  /**
   * Both sails' section stacks side by side. Since cockpit phase 03 this is a
   * two-up of `SailSectionStack`, which is the component the Mainsail and
   * Headsail panels each use on its own; this wrapper is what the picture
   * card on the primary column still renders.
   */
  let { main, jib }: { main?: SailShape; jib?: SailShape } = $props();

  const sails = $derived(
    (
      [
        { sail: 'main', label: 'Main', shape: main },
        { sail: 'jib', label: 'Jib', shape: jib },
      ] as const
    ).filter((s) => s.shape !== undefined),
  );
</script>

{#if sails.length === 0}
  <p class="empty">No flying shape in this solve yet.</p>
{:else}
  <div class="pair">
    {#each sails as s (s.sail)}
      <div>
        <h3 class="section-title">{s.label}</h3>
        <SailSectionStack sail={s.sail} shape={s.shape} />
      </div>
    {/each}
  </div>
{/if}

<style>
  .pair {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--space-4);
    align-items: start;
  }

  .empty {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--ink-2);
  }
</style>
