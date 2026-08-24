<script lang="ts">
  import { medalFor, type Drill } from '../../lib/drills';

  let {
    drill,
    best,
    onopen,
  }: {
    drill: Drill;
    /** Best VMG loss percent recorded for this drill, if any. */
    best?: number;
    onopen: (drill: Drill) => void;
  } = $props();

  const medal = $derived(best === undefined ? undefined : medalFor(best));
  const MEDAL_GLYPH = { gold: '🥇', silver: '🥈', bronze: '🥉', none: '—' };
</script>

<button type="button" class="card" onclick={() => onopen(drill)}>
  <span class="head">
    <span class="dots" aria-label="Tier {drill.tier}">
      {#each [1, 2, 3] as n (n)}
        <span class="dot" class:on={n <= drill.tier}></span>
      {/each}
    </span>
    {#if medal}
      <span class="medal" title="Best: {best?.toFixed(1)} % VMG loss">{MEDAL_GLYPH[medal]}</span>
    {/if}
  </span>
  <span class="title">{drill.title}</span>
  <span class="meta">
    {drill.condition.twsKt} kt · {drill.condition.sailset === 'asym' ? 'gennaker' : 'jib'}
    {#if drill.cTier}<span class="ctier">C</span>{/if}
  </span>
</button>

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    width: 100%;
    text-align: left;
    padding: var(--space-3);
    min-height: var(--hit-min);
    background: var(--surface);
    border: none;
    border-radius: var(--radius);
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

  .title {
    font-size: var(--text-md);
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
