<script lang="ts">
  import type { DrillTemplate } from '../../lib/drills';
  import type { DrillBest } from '../../lib/drillHistory';
  import { SEA_LABELS } from '../format';

  /**
   * The card that answers "what should I do now?" on every open (audit ux-02
   * M-18). One drill, chosen by the spacing schedule, generated from today's
   * date — so it is the same drill for everyone today, with no server — plus
   * the streak it feeds and a link that hands someone else the same seed.
   */
  let {
    template,
    seed,
    best,
    streak,
    onopen,
    onshare,
  }: {
    template: DrillTemplate;
    /** Today's seed. Shown nowhere; carried into the share link. */
    seed: number;
    best?: DrillBest;
    streak: number;
    onopen: (template: DrillTemplate, seed: number) => void;
    onshare: (template: DrillTemplate, seed: number) => void;
  } = $props();

  const condition = $derived(
    [
      `${template.conditions.twsKt[0]}–${template.conditions.twsKt[1]} kt`,
      template.conditions.seaState.map((s) => SEA_LABELS[s]).join('/'),
    ].join(' · '),
  );
</script>

<section class="card today">
  <div class="row">
    <h2 class="section-title">Today's drill</h2>
    {#if streak > 0}
      <span class="streak" aria-label="{streak} day practice streak">
        <span aria-hidden="true">🔥</span>
        {streak}
        {streak === 1 ? 'day' : 'days'}
      </span>
    {/if}
  </div>

  <p class="title">{template.title}</p>
  <p class="meta tabular-nums">
    {condition}
    {#if best}· best {best.medal === 'none' ? 'no medal' : best.medal}, {best.attempts}
      {best.attempts === 1 ? 'try' : 'tries'}{:else}· not attempted yet{/if}
  </p>

  <div class="actions">
    <button type="button" class="primary" onclick={() => onopen(template, seed)}>
      {best ? 'Practise again' : 'Start'}
    </button>
    <button type="button" class="secondary" onclick={() => onshare(template, seed)}>
      Share this drill
    </button>
  </div>

  <p class="note">
    Same drill, same seed, for anyone who opens the link today. The streak is counted in this
    browser only — clearing site data clears it, and it does not follow you to another device.
  </p>
</section>

<style>
  .today {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-block-end: var(--space-5);
    border-color: var(--accent);
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .streak {
    font-size: var(--text-sm);
    color: var(--ink-2);
    white-space: nowrap;
  }

  .title {
    margin: 0;
    font-size: var(--text-lg);
    font-weight: 600;
  }

  .meta {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .note {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-block-start: var(--space-1);
  }

  .actions button {
    min-height: var(--hit-min);
    padding: 0 var(--space-4);
    border-radius: var(--radius);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .primary {
    background: var(--accent);
    color: var(--on-accent);
    border: 1px solid var(--accent);
  }

  .secondary {
    background: transparent;
    color: var(--ink);
    border: 1px solid var(--line-strong);
  }
</style>
