<script lang="ts">
  import type { DockControls } from '../../core/types';
  import ConfidenceBadge from '../components/ConfidenceBadge.svelte';
  import { fmt } from '../format';
  import { describeSetup, TIE_BAND_S_PER_MILE, type Suggestion } from './logic';

  let {
    suggestion,
    busy = false,
    locked = false,
    needsUnlock = false,
    onsuggest,
    onapply,
  }: {
    suggestion: Suggestion | null;
    busy?: boolean;
    /** Rig committed for today: the setups still show, applying one does not. */
    locked?: boolean;
    /** An apply was refused because of the lock (`DockStore.needsUnlock`). */
    needsUnlock?: boolean;
    onsuggest: () => void;
    onapply: (setup: DockControls) => void;
  } = $props();
</script>

<section class="card">
  <h2 class="section-title">Suggested setups</h2>

  <button type="button" class="suggest" onclick={onsuggest} disabled={busy}>
    {busy ? 'Searching…' : 'Suggest a setup'}
  </button>

  {#if locked || needsUnlock}
    <p class="tie" role={needsUnlock ? 'alert' : undefined}>
      Unlock first: the rig is committed for today, so a suggestion cannot be applied to it.
    </p>
  {/if}

  {#if suggestion}
    <ol class="results">
      {#each suggestion.top as s, i (i)}
        <li>
          <button type="button" class="pick" disabled={locked} onclick={() => onapply(s.setup)}>
            <span class="setup tabular-nums">{describeSetup(s.setup)}</span>
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
  {:else}
    <p class="tie">
      Scores every setup on the grid against your forecast and ranks the best three.
    </p>
  {/if}
</section>

<style>
  .suggest {
    width: 100%;
    min-height: var(--hit-min);
    border: 1px solid var(--accent);
    border-radius: var(--radius);
    background: transparent;
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
    margin: var(--space-3) 0 0;
    padding: 0;
  }

  .results li + li {
    border-top: 1px solid var(--line, color-mix(in srgb, var(--ink-2) 25%, transparent));
  }

  .pick {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: var(--hit-min);
    padding: var(--space-2) 0;
    border: none;
    background: none;
    color: var(--ink);
    font-size: var(--text-sm);
    text-align: start;
    cursor: pointer;
  }

  .pick:disabled {
    opacity: 0.5;
    cursor: default;
  }

  /* 12 px keeps "uppers +2.0 · lowers +1.0 · forestay 15 mm" on one line
     alongside the regret at 390 px. */
  .setup {
    flex: 1;
    min-width: 0;
    font-size: var(--text-xs);
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
