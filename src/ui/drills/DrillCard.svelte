<script lang="ts">
  import { medalFor, type Drill } from '../../lib/drills';
  import { SEA_LABELS } from '../format';

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

  const condition = $derived(
    [
      `${drill.condition.twsKt} kt`,
      SEA_LABELS[drill.condition.seaState],
      `TWA ${drill.condition.twaDeg}°`,
      drill.condition.sailset === 'asym' ? 'gennaker' : 'jib',
    ].join(' · '),
  );
</script>

<button type="button" class="card drill" onclick={() => onopen(drill)}>
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
  <span class="meta tabular-nums">
    {condition}
    {#if drill.cTier}<span class="ctier">C</span>{/if}
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
