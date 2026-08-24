<script lang="ts">
  import type { DockControls } from '../../core/types';
  import ConfidenceBadge from '../components/ConfidenceBadge.svelte';
  import { fmt } from '../format';
  import { describeSetup, TIE_BAND_S_PER_MILE, type Suggestion } from './logic';

  let {
    suggestion,
    busy = false,
    onsuggest,
    onapply,
  }: {
    suggestion: Suggestion | null;
    busy?: boolean;
    onsuggest: () => void;
    onapply: (setup: DockControls) => void;
  } = $props();
</script>

<section>
  <button type="button" class="suggest" onclick={onsuggest} disabled={busy}>
    {busy ? 'Searching…' : 'Suggest a setup'}
  </button>

  {#if suggestion}
    <ol class="results">
      {#each suggestion.top as s, i (i)}
        <li>
          <button type="button" class="pick" onclick={() => onapply(s.setup)}>
            <span class="setup">{describeSetup(s.setup)}</span>
            <span class="regret tabular-nums">
              {fmt(s.expectedRegretSPerMile.value, 1, 's/mi')}
              <ConfidenceBadge tier={s.expectedRegretSPerMile.tier} />
            </span>
          </button>
        </li>
      {/each}
    </ol>

    {#if suggestion.tied.length > 1}
      <p class="tie">
        {suggestion.tied.length} setups are within {TIE_BAND_S_PER_MILE} s/mi of the best. The model can't
        separate them — pick the one you can set on the dock.
      </p>
    {/if}
  {/if}
</section>

<style>
  section {
    margin-block-end: var(--space-4);
  }

  .suggest {
    width: 100%;
    min-height: var(--hit-min);
    border: 1px solid var(--accent);
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--accent);
    font-size: var(--text-md);
    cursor: pointer;
  }

  .suggest:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .results {
    list-style: none;
    margin: var(--space-2) 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .pick {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    min-height: var(--hit-min);
    padding: var(--space-2);
    border: none;
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--ink);
    font-size: var(--text-sm);
    text-align: start;
    cursor: pointer;
  }

  .regret {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    white-space: nowrap;
  }

  .tie {
    margin: var(--space-2) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }
</style>
