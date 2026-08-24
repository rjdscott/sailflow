<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import DrillCard from '../drills/DrillCard.svelte';
  import DrillView from '../drills/DrillView.svelte';
  import { drills } from '../drills/store.svelte';
  import { settings } from '../stores/settings.svelte';
  import type { DrillTier } from '../../lib/drills';

  const TIER_NAME: Record<DrillTier, string> = {
    1: 'Tier 1 — the obvious one',
    2: 'Tier 2 — two controls that fight',
    3: 'Tier 3 — the whole rig',
  };

  // Simple mode hides tier 3: the C-tier downwind drill and the seven-control
  // depower puzzles are noise until the basics are automatic.
  const tiers = $derived<DrillTier[]>(settings.mode === 'simple' ? [1, 2] : [1, 2, 3]);
</script>

<TopBar title="Drills" />

{#if drills.current}
  <DrillView drill={drills.current} onback={() => drills.close()} />
{:else}
  <p class="lede">
    Each drill is a real condition with a deliberately wrong setup. Trim the free controls, hit
    Check, and the solver's optimum tells you what it cost.
  </p>
  {#each tiers as tier (tier)}
    {@const inTier = drills.list.filter((d) => d.tier === tier)}
    {#if inTier.length}
      <section>
        <h2>{TIER_NAME[tier]}</h2>
        <div class="cards">
          {#each inTier as drill (drill.id)}
            <DrillCard {drill} best={drills.best[drill.id]} onopen={(d) => drills.open(d)} />
          {/each}
        </div>
      </section>
    {/if}
  {/each}
{/if}

<style>
  .lede {
    margin: 0 0 var(--space-4);
    font-size: var(--text-sm);
    color: var(--ink-2);
  }

  section {
    margin-block-end: var(--space-6);
  }

  h2 {
    margin: 0 0 var(--space-2);
    font-size: var(--text-sm);
    color: var(--ink-2);
    font-weight: 600;
  }

  .cards {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
</style>
