<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import DrillCard from '../drills/DrillCard.svelte';
  import DrillView from '../drills/DrillView.svelte';
  import { drills } from '../drills/store.svelte';
  import type { DrillTier } from '../../lib/drills';

  const TIER_NAME: Record<DrillTier, string> = {
    1: 'Tier 1 — the obvious one',
    2: 'Tier 2 — two controls that fight',
    3: 'Tier 3 — the whole rig',
  };

  const tiers: DrillTier[] = [1, 2, 3];
  // The store owns the mode filter, so "Next drill" and this list walk the
  // same sequence (audit ux-02 M-03).
  const dueIds = $derived(
    new Set(drills.due.filter((s) => s.overdueDays >= 0).map((s) => s.templateId)),
  );
</script>

<TopBar title="Drills" />

{#if drills.loading && !drills.current}
  <p class="lede">Generating a drill…</p>
{:else if drills.current}
  <DrillView drill={drills.current} onback={() => drills.close()} />
{:else}
  <p class="lede">
    Each drill is a real condition with a deliberately wrong setup, generated fresh from the day's
    seed. Trim the free controls, hit Check, and the solver's optimum from where you started tells
    you how far off the shape was.
  </p>
  {#if drills.endNote}
    <p class="lede">{drills.endNote}</p>
  {/if}
  {#each tiers as tier (tier)}
    {@const inTier = drills.visible.filter((t) => t.tier === tier)}
    {#if inTier.length}
      <section>
        <h2 class="section-title">{TIER_NAME[tier]}</h2>
        <div class="cards">
          {#each inTier as template (template.id)}
            <DrillCard
              {template}
              best={drills.best[template.id]}
              due={dueIds.has(template.id)}
              onopen={(t) => void drills.open(t)}
            />
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
    max-width: 68ch;
  }

  section {
    margin-block-end: var(--space-6);
  }

  .cards {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-3);
  }

  @media (min-width: 720px) {
    .cards {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: 1024px) {
    .cards {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
</style>
