<script lang="ts" module>
  import { track } from '../../lib/telemetry';
  import { puffPlayer } from './puffPlayer.svelte';
  import type { SequenceId } from './puff';

  /**
   * Start a replay, counting it. Exported from the module rather than the
   * instance so the `p` shortcut in `Race.svelte` runs the same three lines
   * the button does, without a `bind:this` to reach them.
   */
  export function play(seq: SequenceId): void {
    if (puffPlayer.playing) return;
    track('race.puffReplay');
    puffPlayer.start(seq);
  }
</script>

<script lang="ts">
  import { POWER_CUE, SEQUENCES } from './puff';

  /**
   * The puff replay's controls: play, cancel, and what step it is on.
   *
   * The replay is a slideshow of steady-state solves, not time-domain physics
   * (Epic 2 owns that), so the copy says "replay", never "simulate". The
   * panels light themselves from the same player — see `Panel`'s `lit`.
   */
</script>

{#if puffPlayer.playing}
  <span class="playing" aria-live="polite">
    {puffPlayer.label}: {puffPlayer.step?.label ?? ''}
    {#if puffPlayer.power}<span class="cue">{POWER_CUE[puffPlayer.power]}</span>{/if}
  </span>
  <button type="button" class="ghost" onclick={() => puffPlayer.cancel()}>Stop replay</button>
{:else}
  <button type="button" class="ghost" onclick={() => play('gust')}>Replay a gust ▶</button>
  <span class="more">
    {#each ['lull', 'shift'] as const as id (id)}
      <button type="button" class="chip" onclick={() => play(id)} title={SEQUENCES[id].what}>
        {SEQUENCES[id].label}
      </button>
    {/each}
  </span>
{/if}

<style>
  .ghost {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--hit-min);
    padding: 0 var(--space-3);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: transparent;
    color: var(--ink);
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
  }

  .more {
    display: inline-flex;
    gap: var(--space-1);
  }

  /* Same mouse size as the actions beside it in the cockpit strip. */
  @media (min-width: 1280px) {
    .ghost,
    .chip {
      min-height: 32px;
      padding: 0 var(--space-2);
    }
  }

  .chip {
    min-height: var(--hit-min);
    padding: 0 var(--space-2);
    /* The one control outline the `--line-strong` sweep missed: 1.28:1 dark,
       1.17:1 light, against ADR 0015's 3:1 for every non-text component
       (audit ux-03 L-02). Same token as `ConditionsStrip`'s chips and
       `Slider`'s steppers, already gated by `scripts/contrast_check.mjs`. */
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: transparent;
    color: var(--ink-2);
    font-size: var(--text-xs);
    cursor: pointer;
  }

  .playing {
    display: inline-flex;
    align-items: baseline;
    gap: var(--space-2);
    font-size: var(--text-sm);
    color: var(--ink);
  }

  .cue {
    font-size: var(--text-xs);
    color: var(--ink-2);
  }
</style>
