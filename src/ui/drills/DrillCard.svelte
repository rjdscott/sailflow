<script lang="ts">
  import type { DrillTemplate } from '../../lib/drills';
  import type { DrillBest } from '../../lib/drillHistory';
  import { SEA_LABELS } from '../format';
  import { masteryLevel } from './progress';

  let {
    template,
    best,
    due = false,
    onopen,
  }: {
    template: DrillTemplate;
    /** Roll-up of every recorded attempt at this template, if any. */
    best?: DrillBest;
    /** The spacing schedule says this one is up today. */
    due?: boolean;
    onopen: (template: DrillTemplate) => void;
  } = $props();

  const MEDAL_LABEL = { gold: 'Gold', silver: 'Silver', bronze: 'Bronze', none: 'No medal' };

  /**
   * Mastery, on the card face rather than in a `title` a touch device never
   * shows (audit ux-02 M-18): three dots filled to the best medal, and the
   * attempt count in words next to them.
   */
  const mastery = $derived(masteryLevel(best));
  const masteryLabel = $derived(
    best
      ? `Best ${MEDAL_LABEL[best.medal]}, ${best.attempts} ${best.attempts === 1 ? 'attempt' : 'attempts'}`
      : 'Not attempted',
  );

  const condition = $derived(
    [
      `${template.conditions.twsKt[0]}–${template.conditions.twsKt[1]} kt`,
      template.conditions.seaState.map((s) => SEA_LABELS[s]).join('/'),
      template.conditions.sailset === 'asym' ? 'gennaker' : 'jib',
    ].join(' · '),
  );
</script>

<button type="button" class="card drill" onclick={() => onopen(template)}>
  <span class="head">
    <span class="dots" aria-label="Tier {template.tier}">
      {#each [1, 2, 3] as n (n)}
        <span class="dot" class:on={n <= template.tier}></span>
      {/each}
    </span>
    <span class="badges">
      {#if due}<span class="chip due">Due</span>{/if}
      <!-- The confidence tier, drawn like ConfidenceBadge's C — the component
           itself is a button, and this card already is one. -->
      {#if template.cTier}<span class="tier-c" aria-label="Confidence C: direction only">C</span
        >{/if}
    </span>
  </span>

  <span class="title">{template.title}</span>
  <span class="meta tabular-nums">{condition}</span>

  <span class="chip medal" aria-label={masteryLabel}>
    <span class="dots" aria-hidden="true">
      {#each [1, 2, 3] as n (n)}
        <span class="dot mastery-dot" class:on={n <= mastery}></span>
      {/each}
    </span>
    <span class="tabular-nums" aria-hidden="true">
      {best ? `${MEDAL_LABEL[best.medal]} · ${best.attempts}×` : 'Not attempted'}
    </span>
  </span>
</button>

<style>
  .drill {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-2);
    align-content: start;
    width: 100%;
    height: 100%;
    text-align: start;
    color: var(--ink);
    cursor: pointer;
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    min-height: 24px;
  }

  .badges {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .dots {
    display: flex;
    gap: var(--space-1);
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1px solid var(--line-strong);
  }

  .dot.on {
    background: var(--accent);
    border-color: var(--accent);
  }

  /* Tier dots say what the drill is; mastery dots say how you have done on it,
     so they are a different colour rather than a second row of the same mark. */
  .mastery-dot.on {
    background: var(--good);
    border-color: var(--good);
  }

  .title {
    font-size: var(--text-md);
    font-weight: 600;
  }

  .meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  /* Chips, not loose text: same pill the conditions rail uses, so the drill
     list reads as the same instrument as the cockpit. */
  .chip {
    background: transparent;
  }

  .medal {
    justify-self: start;
    gap: var(--space-2);
    height: 28px;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .due {
    height: 24px;
    padding: 0 var(--space-2);
    border-color: var(--accent);
    color: var(--accent);
    font-size: var(--text-xs);
    font-weight: 600;
  }

  .tier-c {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    min-height: 24px;
    padding: 0 var(--space-1);
    border: 1px dashed var(--line-strong);
    border-radius: var(--radius);
    color: var(--ink-2);
    font-size: var(--text-xs);
    font-weight: 600;
  }
</style>
