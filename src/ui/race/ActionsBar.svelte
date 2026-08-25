<script lang="ts">
  import ConfidenceBadge from '../components/ConfidenceBadge.svelte';
  import { fmt } from '../format';
  import { conditions } from '../stores/conditions.svelte';
  import { optimum, OPTIMUM_REASON, OPTIMUM_TIER } from './optimum.svelte';
  import PuffReplay from './PuffReplay.svelte';
  import { CONTROLS, OBJECTIVE_METRIC, race, raceObjective } from './store.svelte';

  /**
   * Everything that rewrites the whole trim, in one bar: apply the optimum,
   * flip between the two trims you are comparing, go back to base, log it, or
   * watch a gust go through.
   *
   * Every button here previews itself — hover or focus and the sliders it
   * would move outline themselves before it moves them (research §3 principle
   * 24). That is why each one is wired to `race.hovering` rather than just
   * `onclick`.
   */
  let {
    canApply,
    onapply,
    onab,
    onundo,
    onreset,
    onlog,
  }: {
    canApply: boolean;
    onapply: () => void;
    onab: () => void;
    onundo: () => void;
    onreset: () => void;
    onlog: () => void;
  } = $props();

  const metric = $derived(OBJECTIVE_METRIC[raceObjective(conditions.value)]);
  const moved = $derived(race.abMoved);
  const delta = $derived(race.abDeltaKt);

  /** What the A/B toggle would swap in, in words, for the tooltip and the bar. */
  const abTitle = $derived(
    race.previousRace
      ? `Swap to the other trim (${moved.length} control${moved.length === 1 ? '' : 's'} differ). Both are kept, so pressing it twice is where you started.`
      : 'Nothing to compare with yet: apply the optimum, a preset or the base trim first, and the trim you left becomes the other side.',
  );

  function preview(ids: string[] | null): void {
    race.hovering = ids;
  }
</script>

<div class="actions">
  <!-- The tier badge is a sibling of the button, not a child of it: nested
       inside, asking what "B" meant applied the optimum (audit ux-03 H-06).
       The wrapper carries the accent pill so the pair still looks like one
       button, the way `.side` sits on the A/B button beside it. -->
  <span class="apply-wrap" class:off={!canApply}>
    <button
      type="button"
      class="apply"
      onclick={onapply}
      disabled={!canApply}
      onpointerenter={() => preview(race.willMove())}
      onfocus={() => preview(race.willMove())}
      onpointerleave={() => preview(null)}
      onblur={() => preview(null)}
    >
      Apply optimum
    </button>
    <ConfidenceBadge tier={OPTIMUM_TIER} reason={OPTIMUM_REASON} />
  </span>

  <!-- A/B: the compare that keeps both trims, unlike the undo beside it. -->
  <button
    type="button"
    class="ab"
    onclick={onab}
    disabled={!race.previousRace}
    title={abTitle}
    aria-label={abTitle}
    onpointerenter={() => preview(moved)}
    onfocus={() => preview(moved)}
    onpointerleave={() => preview(null)}
    onblur={() => preview(null)}
  >
    <span class="side">{race.ab}</span>
    A/B
    {#if race.previousRace}
      <span class="tabular-nums delta">
        {#if delta === null}
          …
        {:else}
          {delta > 0 ? '+' : ''}{fmt(delta, 2)} kt {metric}
        {/if}
      </span>
    {/if}
  </button>

  {#if race.previousRace}
    <button
      type="button"
      class="ghost"
      onclick={onundo}
      onpointerenter={() => preview(race.willMoveTo(race.previousRace))}
      onfocus={() => preview(race.willMoveTo(race.previousRace))}
      onpointerleave={() => preview(null)}
      onblur={() => preview(null)}
    >
      Back to my trim
    </button>
  {/if}

  <button
    type="button"
    class="ghost"
    onclick={onreset}
    onpointerenter={() => preview(race.willReset())}
    onfocus={() => preview(race.willReset())}
    onpointerleave={() => preview(null)}
    onblur={() => preview(null)}
  >
    Base trim
  </button>

  <button type="button" class="ghost" onclick={onlog}>Log this trim</button>

  <PuffReplay />

  {#if optimum.busy || optimum.stale}
    <span class="hint">Searching…</span>
  {:else if optimum.error}
    <span class="hint">No optimum here: {optimum.error}</span>
  {:else if optimum.result && optimum.moved.length === 0}
    <span class="hint">Already there — nothing the model would move.</span>
  {/if}
</div>

<!-- Which controls the two sides differ by, named. The outline preview says
     where they are; this says what they are, for the tier that wants both. -->
{#if race.previousRace && moved.length > 0}
  <p class="diff">
    A/B differs on {#each moved as id, i (id)}{i > 0 ? ', ' : ''}{CONTROLS[id]?.label ?? id}{/each}.
  </p>
{/if}

<style>
  .actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-3);
  }

  .apply-wrap,
  .apply,
  .ab,
  .ghost {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--hit-min);
    padding: 0 var(--space-3);
    border-radius: var(--radius);
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
  }

  /* The pill is the wrapper's; the button inside it is transparent, so the
     badge beside it sits on the same accent fill it used to sit on. */
  .apply-wrap {
    /* No left padding of its own: the button owns it, so the whole left half
       of the pill still presses Apply rather than being dead wrapper. */
    padding-left: 0;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: var(--on-accent);
  }

  .apply {
    border: none;
    background: none;
    color: inherit;
  }

  .apply-wrap.off,
  .ab:disabled {
    border-color: var(--line-strong);
    background: transparent;
    color: var(--ink-2);
    cursor: default;
  }

  .apply:disabled {
    cursor: default;
  }

  .ab,
  .ghost {
    border: 1px solid var(--line-strong);
    background: transparent;
    color: var(--ink);
  }

  /* Which side is on the sliders, as a badge rather than a changing label:
     the button keeps its position and its width. */
  .side {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.4em;
    padding: 0 var(--space-1);
    border-radius: var(--radius);
    background: var(--accent);
    color: var(--on-accent);
    font-size: var(--text-xs);
  }

  .ab:disabled .side {
    background: var(--line-strong);
    color: var(--ink-2);
  }

  .delta {
    font-weight: 400;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .hint {
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .diff {
    display: none;
    margin: var(--space-2) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  /* The named list is the analyse tier's; race has the outlines. */
  :global([data-tier='analyse']) .diff {
    display: block;
  }

  /* Cockpit: mouse-sized buttons, so the actions strip is one line at the
     bottom of the grid rather than two rows of thumb padding taken off the
     hero. Phones and tablets keep the 44 px rows. */
  @media (min-width: 1280px) {
    .actions {
      gap: var(--space-2);
    }

    .apply-wrap,
    .ab,
    .ghost {
      min-height: 32px;
      padding: 0 var(--space-2);
    }

    .apply-wrap {
      padding-left: 0;
    }

    .apply {
      min-height: 32px;
      padding: 0 var(--space-2);
    }
  }
</style>
