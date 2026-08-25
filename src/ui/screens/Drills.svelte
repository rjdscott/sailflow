<script lang="ts">
  import { onMount } from 'svelte';
  import TopBar from '../components/TopBar.svelte';
  import Toast from '../components/Toast.svelte';
  import DrillCard from '../drills/DrillCard.svelte';
  import DrillView from '../drills/DrillView.svelte';
  import Today from '../drills/Today.svelte';
  import { dailySeed, drills } from '../drills/store.svelte';
  import { drillHash, parseDrillHash } from '../drills/progress';
  import type { DrillTemplate, DrillTier } from '../../lib/drills';

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

  const seed = dailySeed();
  const today = $derived(drills.today);

  let toast = $state('');
  let toastOpen = $state(false);

  /**
   * Deep link to one exact drill. Phase 04 owns `router.parseHash`, which
   * today resolves `#/drills/<id>/<seed>` to the `drills` route and stops
   * there; the rest of the path is read here, defensively, so this works
   * whether or not the router learns the shape (audit ux-02 M-18).
   */
  function openFromHash(): void {
    const deep = parseDrillHash(location.hash);
    if (!deep) return;
    const template = drills.templates.find((t) => t.id === deep.templateId);
    if (template) void drills.open(template, deep.seed);
  }

  onMount(() => {
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  });

  function say(message: string): void {
    toast = message;
    toastOpen = true;
  }

  async function share(template: DrillTemplate, forSeed: number): Promise<void> {
    const hash = drillHash(template.id, forSeed);
    const url = `${location.origin}${location.pathname}${hash}`;
    try {
      await navigator.clipboard.writeText(url);
      say('Link copied — it opens this exact drill.');
    } catch {
      // Insecure context, or the permission was refused. Say what the link is
      // rather than silently doing nothing; it is short enough to retype.
      say(`Copy blocked by the browser. The link is ${hash}`);
    }
  }
</script>

<TopBar title="Drills" />

<div class="drills-screen">
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

    {#if today}
      <Today
        template={today}
        {seed}
        best={drills.best[today.id]}
        streak={drills.streak}
        onopen={(t, s) => void drills.open(t, s)}
        onshare={(t, s) => void share(t, s)}
      />
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
</div>

<Toast message={toast} bind:open={toastOpen} />

<style>
  /* Cockpit panels, not flat cards (ADR 0015). One rule covers the drill
     cards, the Today card and everything DrillView draws. */
  .drills-screen :global(.card) {
    background: var(--surface-2);
  }

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
