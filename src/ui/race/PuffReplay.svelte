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
   * (Epic 2 owns that), so the copy says "replay", never "simulate" — the
   * group label above the three buttons is the exception the audit asked for,
   * and it labels *what pressing them does to the conditions*, not what the
   * model is. The panels light themselves from the same player — see `Panel`'s
   * `lit`.
   *
   * The three were three outline buttons in the same style as `Base trim` and
   * `Copy link`, so nothing said they animate the wind until one was pressed
   * (audit ux-04 M-06). They are one labelled group now, each with a ▶, and
   * the TWS cell on the instrument band pulses while one runs.
   */
</script>

{#if puffPlayer.playing}
  <span class="playing" aria-live="polite">
    {puffPlayer.label}: {puffPlayer.step?.label ?? ''}
    {#if puffPlayer.power}<span class="cue">{POWER_CUE[puffPlayer.power]}</span>{/if}
  </span>
  <button type="button" class="ghost" onclick={() => puffPlayer.cancel()}>Stop replay</button>
{:else}
  <span class="sim" role="group" aria-label="Simulate">
    <span class="sim-label" aria-hidden="true">SIMULATE</span>
    {#each ['lull', 'shift', 'gust'] as const as id (id)}
      <button type="button" class="chip" onclick={() => play(id)} title={SEQUENCES[id].what}>
        <span class="glyph" aria-hidden="true">▶</span>
        <!-- The gust keeps its verb: it is the one the `p` shortcut runs and
             the one the shortcut sheet names. -->
        {id === 'gust' ? 'Replay a gust' : SEQUENCES[id].label}
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

  /* The three replays, fenced off from the actions beside them: they animate
     the conditions rather than changing the trim, and outline buttons in the
     `Base trim` style said nothing about that (audit ux-04 M-06). */
  .sim {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: 0 var(--space-2) 0 var(--space-1);
    border: 1px dashed var(--line-strong);
    border-radius: var(--radius);
  }

  .sim-label {
    padding: 0 var(--space-1);
    color: var(--ink-2);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.08em;
  }

  .glyph {
    color: var(--accent);
    font-size: 0.8em;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
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

  /* Mouse size in the cockpit strip, like every action beside it. This block
     used to sit *above* `.chip`, and a media query adds no specificity: the
     later `min-height: var(--hit-min)` won, the three chips stayed 44 px, and
     the actions row they are in was 44 px tall where everything else in it is
     32 — 10 px of the document's height at 1920 for nothing (phase 05). */
  @media (min-width: 1280px) {
    .ghost,
    .chip {
      min-height: 32px;
      padding: 0 var(--space-2);
    }
  }
</style>
