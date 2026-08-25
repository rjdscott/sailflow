<script lang="ts">
  import type { DrillTemplate } from '../../lib/drills';
  import type { DrillBest } from '../../lib/drillHistory';
  import { SEA_LABELS } from '../format';

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

  const MEDAL_GLYPH = { gold: '🥇', silver: '🥈', bronze: '🥉', none: '—' };

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
    {#if best}
      <span class="medal" title="{best.attempts} attempts">{MEDAL_GLYPH[best.medal]}</span>
    {/if}
  </span>
  <span class="title">{template.title}</span>
  <span class="meta tabular-nums">
    {condition}
    {#if due}<span class="ctier">due</span>{/if}
    {#if template.cTier}<span class="ctier">C</span>{/if}
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
  }

  .dots {
    display: flex;
    gap: var(--space-1);
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1px solid var(--ink-2);
  }

  .dot.on {
    background: var(--accent);
    border-color: var(--accent);
  }

  .medal {
    font-size: var(--text-md);
    line-height: 1;
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

  .ctier {
    border: 1px dashed var(--ink-2);
    border-radius: var(--radius);
    padding: 0 var(--space-1);
  }
</style>
