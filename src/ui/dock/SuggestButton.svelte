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
    canUndo = false,
    onsuggest,
    onapply,
    onundo,
  }: {
    suggestion: Suggestion | null;
    busy?: boolean;
    /** Rig committed for today: the setups still show, applying one does not. */
    locked?: boolean;
    /** An apply was refused because of the lock (`DockStore.needsUnlock`). */
    needsUnlock?: boolean;
    /** A suggestion has been applied and the setup it replaced is still held. */
    canUndo?: boolean;
    onsuggest: () => void;
    onapply: (setup: DockControls) => void;
    onundo: () => void;
  } = $props();
</script>

<!-- Sits inside the Rig panel's `Setup` disclosure, which names it, so there is
     no heading here (ADR 0021 folded the Dock's card into the panel). -->
<div class="suggest-row">
  <button type="button" class="suggest" onclick={onsuggest} disabled={busy}>
    {busy ? 'Searching…' : 'Suggest a setup'}
  </button>
  {#if canUndo}
    <!-- The same way back the cockpit gives every whole-trim button: trying a
         suggestion costs one tap and un-costs one tap. -->
    <button type="button" class="undo" onclick={onundo}>Back to my rig</button>
  {/if}
</div>

{#if locked || needsUnlock}
  <p class="tie" role={needsUnlock ? 'alert' : undefined}>
    Unlock first: the rig is committed for today, so a suggestion cannot be applied to it.
  </p>
{/if}

{#if suggestion}
  <ol class="results">
    {#each suggestion.top as s, i (i)}
      <!-- The tier badge sits beside the row, not inside it: nested in the
             button, a press meant to ask what "B" meant applied the setup and
             changed a number the sailor then turns on the rig (ux-03 H-06). -->
      <li>
        <button type="button" class="pick" disabled={locked} onclick={() => onapply(s.setup)}>
          <span class="setup tabular-nums">{describeSetup(s.setup)}</span>
          <span class="regret tabular-nums">{fmt(s.expectedRegretSPerMile.value, 1, 's/mi')}</span>
        </button>
        <ConfidenceBadge tier={s.expectedRegretSPerMile.tier} />
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
  <p class="tie">Scores every setup on the grid against the wind band and ranks the best three.</p>
{/if}

<style>
  .suggest-row {
    display: flex;
    gap: var(--space-2);
  }

  .suggest {
    flex: 1;
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

  .undo {
    min-height: var(--hit-min);
    padding: 0 var(--space-3);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: transparent;
    color: var(--ink-2);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .results {
    list-style: none;
    margin: var(--space-3) 0 0;
    padding: 0;
  }

  .results li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .results li + li {
    border-top: 1px solid var(--line, color-mix(in srgb, var(--ink-2) 25%, transparent));
  }

  .pick {
    flex: 1;
    min-width: 0;
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
