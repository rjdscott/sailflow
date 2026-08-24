<script lang="ts">
  import type { DockScore } from '../../core/types';
  import Readout from '../components/Readout.svelte';
  import { fmt } from '../format';
  import { sparklinePath } from './logic';

  let { score, busy = false }: { score: DockScore | null; busy?: boolean } = $props();

  const W = 88;
  const H = 24;
  const path = $derived(score ? sparklinePath(score.perTws, W, H) : '');
</script>

<section class="card" class:busy>
  {#if score}
    <Readout
      label="Expected regret"
      value={score.expectedRegretSPerMile.value}
      tier={score.expectedRegretSPerMile.tier}
      unit="s/mi"
      size="lg"
      decimals={1}
    />
    {#if score.expectedRegretSPerMile.band}
      <p class="band tabular-nums">
        band {fmt(score.expectedRegretSPerMile.band[0], 1)}–{fmt(
          score.expectedRegretSPerMile.band[1],
          1,
        )} s/mi
      </p>
    {/if}

    <div class="ends">
      <div>
        <span class="end-label tabular-nums">at {fmt(score.atMin.twsKt, 0, 'kt')}</span>
        <span class="end-value tabular-nums">−{fmt(score.atMin.regretSPerMile, 1)} s/mi</span>
      </div>
      <div>
        <span class="end-label tabular-nums">at {fmt(score.atMax.twsKt, 0, 'kt')}</span>
        <span class="end-value tabular-nums">−{fmt(score.atMax.regretSPerMile, 1)} s/mi</span>
      </div>
      {#if path}
        <svg class="spark" viewBox="0 0 {W} {H}" width={W} height={H} aria-hidden="true">
          <path d={path} fill="none" stroke="currentColor" stroke-width="1.5" />
        </svg>
      {/if}
    </div>

    <p class="worst tabular-nums">
      Worst at {fmt(score.worst.twsKt, 0, 'kt')}: −{fmt(score.worst.regretSPerMile, 1)} s/mi
    </p>

    <p class="explain">
      What you would give up per mile of windward-leeward against a rig re-tuned for that wind. It
      is the price of committing once, not a mistake.
    </p>
  {:else}
    <p class="explain">{busy ? 'Scoring…' : 'No score yet.'}</p>
  {/if}
</section>

<style>
  .card {
    background: var(--surface);
    border-radius: var(--radius);
    padding: var(--space-3);
    margin-block-end: var(--space-4);
  }

  .card.busy {
    opacity: 0.6;
  }

  .band {
    margin: var(--space-1) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .ends {
    display: flex;
    align-items: center;
    gap: var(--space-6);
    flex-wrap: wrap;
    margin-block-start: var(--space-3);
  }

  .ends div {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .end-label {
    font-size: var(--text-sm);
    color: var(--ink-2);
  }

  .end-value {
    font-size: var(--text-md);
    color: var(--ink);
  }

  .spark {
    color: var(--accent);
    margin-inline-start: auto;
  }

  .worst {
    margin: var(--space-3) 0 0;
    font-size: var(--text-sm);
    color: var(--warn);
  }

  .explain {
    margin: var(--space-2) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }
</style>
