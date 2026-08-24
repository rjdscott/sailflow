<script lang="ts">
  import type { DrillScore } from './store.svelte';

  let {
    score,
    cTier = false,
    ontryagain,
    onnext,
  }: {
    score: DrillScore;
    cTier?: boolean;
    ontryagain: () => void;
    onnext: () => void;
  } = $props();

  const MEDAL = {
    gold: { glyph: '🥇', label: 'Gold' },
    silver: { glyph: '🥈', label: 'Silver' },
    bronze: { glyph: '🥉', label: 'Bronze' },
    none: { glyph: '·', label: 'No medal' },
  };

  function clicks(steps: number): string {
    const sign = steps > 0 ? '+' : '−';
    const n = Math.abs(steps);
    return `${sign}${n} ${n === 1 ? 'click' : 'clicks'}`;
  }
</script>

<section class="sheet">
  <div class="head">
    <span class="glyph" aria-hidden="true">{MEDAL[score.medal].glyph}</span>
    <div>
      <p class="medal">{MEDAL[score.medal].label}</p>
      <p class="loss tabular-nums">{score.lossPct.toFixed(1)} % VMG lost</p>
    </div>
  </div>

  {#if cTier}
    <p class="note">
      Tier C: the model gives the direction here, not the number. Treat the loss figure as a
      ranking, not a measurement.
    </p>
  {/if}

  <p class="coach">{score.coach}</p>

  {#if score.deltas.length}
    <ul class="deltas">
      {#each score.deltas as d (d.key)}
        <li class:zero={d.steps === 0}>
          <span>{d.label}</span>
          <span class="tabular-nums">{d.steps === 0 ? 'spot on' : clicks(d.steps)}</span>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="actions">
    <button type="button" class="secondary" onclick={ontryagain}>Try again</button>
    <button type="button" class="primary" onclick={onnext}>Next drill</button>
  </div>
</section>

<style>
  .sheet {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
    background: var(--surface);
    border-radius: var(--radius);
  }

  .head {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .glyph {
    font-size: var(--text-2xl);
  }

  .medal,
  .loss,
  .coach,
  .note {
    margin: 0;
  }

  .medal {
    font-size: var(--text-lg);
    color: var(--ink);
  }

  .loss {
    font-size: var(--text-sm);
    color: var(--ink-2);
  }

  .coach {
    font-size: var(--text-md);
    color: var(--ink);
  }

  .note {
    font-size: var(--text-xs);
    color: var(--ink-2);
    border-left: 2px dashed var(--ink-2);
    padding-left: var(--space-2);
  }

  .deltas {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: var(--text-sm);
  }

  .deltas li {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    color: var(--ink);
  }

  .deltas li.zero {
    color: var(--ink-2);
  }

  .actions {
    display: flex;
    gap: var(--space-2);
  }

  .actions button {
    flex: 1;
    min-height: var(--hit-min);
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
    border: 1px solid var(--ink-2);
  }
</style>
