<script lang="ts">
  import ConfidenceBadge from '../components/ConfidenceBadge.svelte';
  import CopyLink from '../components/CopyLink.svelte';
  import { fmt } from '../format';
  import { track } from '../../lib/telemetry';
  import { buildHash } from '../router.svelte';
  import { conditions, PRESETS } from '../stores/conditions.svelte';
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
  const pinMoved = $derived(race.pinMoved);

  /**
   * Pin freezes the trim on screen as a ghost outline in both hero views, and
   * every instrument then reads its delta against it (audit ux-01 M-19).
   * Distinct from A/B beside it: A/B swaps two live trims, a pin is a fixed
   * reference you keep trimming against.
   */
  const pinTitle = $derived(
    race.pinned
      ? `Unpin. ${pinMoved.length} control${pinMoved.length === 1 ? '' : 's'} differ from the pinned trim.`
      : 'Freeze this trim as a ghost outline, and read every instrument as a delta against it.',
  );

  /** What the A/B toggle would swap in, in words, for the tooltip and the bar. */
  const abTitle = $derived(
    race.previousRace
      ? `Swap to the other trim (${moved.length} control${moved.length === 1 ? '' : 's'} differ). Both are kept, so pressing it twice is where you started.`
      : 'Nothing to compare with yet: apply the optimum, a preset or the base trim first, and the trim you left becomes the other side.',
  );

  function preview(ids: string[] | null): void {
    race.hovering = ids;
  }

  /**
   * The presets left the conditions surface (audit ux-04 M-03). They set the
   * wind *and* rewrite all eleven trim controls, six of them off-screen in
   * Simple mode, so living in a sheet titled "Conditions" made the rewrite
   * invisible — a user opened it to change the wind and left with a different
   * boat. They belong with the other whole-trim actions, and every item says
   * what it moves.
   */
  let presetsOpen = $state(false);

  function startFrom(id: string): void {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    race.applyPreset(p);
    presetsOpen = false;
  }

  function closePresets(e: FocusEvent): void {
    const next = e.relatedTarget as Node | null;
    if (!next || !(e.currentTarget as HTMLElement).contains(next)) presetsOpen = false;
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

  <!-- Start from: the four presets, out of the conditions surface and in with
       the other actions that rewrite the whole trim (M-03). -->
  <span class="menu" onfocusout={closePresets}>
    <button
      type="button"
      class="ghost"
      aria-haspopup="true"
      aria-expanded={presetsOpen}
      onclick={() => (presetsOpen = !presetsOpen)}
    >
      Start from <span aria-hidden="true">▾</span>
    </button>
    {#if presetsOpen}
      <!-- Escape closes the menu from anywhere inside it; the buttons in it are
           what the keyboard actually operates. -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="menu-body"
        role="group"
        aria-label="Start from"
        onkeydown={(e) => {
          if (e.key === 'Escape') presetsOpen = false;
        }}
      >
        {#each PRESETS as p (p.id)}
          <button
            type="button"
            onclick={() => startFrom(p.id)}
            onpointerenter={() => preview(race.willMoveTo(p.race))}
            onfocus={() => preview(race.willMoveTo(p.race))}
            onpointerleave={() => preview(null)}
            onblur={() => preview(null)}
          >
            {p.label} — wind + trim
          </button>
        {/each}
        <p class="menu-note">Starting points for the sliders, not tuning-guide settings.</p>
      </div>
    {/if}
  </span>

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

  <!-- Pin: the fixed reference. Hovering it outlines the sliders that differ
       from the pinned trim, the same preview contract as everything else here. -->
  <button
    type="button"
    class="ghost"
    class:pinned={race.pinned}
    onclick={() => (race.pinned ? race.unpin() : race.pin() && track('race.pin'))}
    disabled={!race.pinned && !race.result}
    title={pinTitle}
    aria-pressed={!!race.pinned}
    onpointerenter={() => preview(pinMoved)}
    onfocus={() => preview(pinMoved)}
    onpointerleave={() => preview(null)}
    onblur={() => preview(null)}
  >
    {race.pinned ? 'Unpin' : 'Pin this trim'}
  </button>

  <button type="button" class="ghost" onclick={onlog}>Log this trim</button>

  <CopyLink />

  <PuffReplay />

  <!-- The one in-content handoff from the densest screen in the product to the
       guided path. Race says what the moves are worth; it never said where to
       go and learn them (audit ux-03 M-06). -->
  <a class="ghost to-drills" href={buildHash('drills')}>New to this? Try a drill →</a>

  {#if optimum.busy || optimum.stale}
    <span class="hint">Searching…</span>
  {:else if optimum.error}
    <span class="hint">No optimum here: {optimum.error}</span>
  {:else if optimum.result && optimum.moved.length === 0}
    <span class="hint">Already there — nothing the model would move.</span>
  {/if}
</div>

<!-- What the ghost outline is, and when it was taken. Every tier gets this one:
     a dashed sail on the hero and a changed delta label are both unexplained
     without it, and the condition matters — a pin from 8 kt compared at 18 is
     still a valid question, but the reader has to know that is what it is. -->
{#if race.pinned}
  <p class="pin-line">
    Pinned at {fmt(race.pinned.condition.twsKt, 0)} kt · TWA {fmt(race.pinned.condition.twaDeg, 0)}°
    — the ghost outline on the boat, and what every Δ is measured against.
    {#if pinMoved.length > 0}
      Differs on {#each pinMoved as id, i (id)}{i > 0 ? ', ' : ''}{CONTROLS[id]?.label ??
          id}{/each}.
    {:else}
      The trim on the sliders is the pinned one.
    {/if}
  </p>
{/if}

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

  /* Pinned reads as held down, not as another primary action: the accent is a
     border and the label, not a fill, so Apply optimum stays the only pill. */
  .ghost.pinned {
    border-color: var(--accent);
    color: var(--accent);
  }

  .apply-wrap.off,
  .ghost:disabled,
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

  /* A link, not a button: it changes the route. Quieter than the trim actions
     beside it, because it is the way out rather than a move on this screen. */
  .to-drills {
    color: var(--ink-2);
    font-weight: 400;
    text-decoration: none;
    white-space: nowrap;
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

  /* The menu hangs off its own button rather than opening a sheet: a preset is
     one press, and a sheet for four items is the `Edit` pattern this phase is
     deleting. Escape and focus leaving both close it. */
  .menu {
    position: relative;
    display: inline-flex;
  }

  .menu-body {
    position: absolute;
    bottom: calc(100% + var(--space-1));
    left: 0;
    z-index: 3;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 22ch;
    padding: var(--space-2);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: var(--surface-2);
    box-shadow: 0 6px 20px rgb(0 0 0 / 35%);
  }

  .menu-body button {
    min-height: var(--hit-min);
    padding: 0 var(--space-2);
    border: none;
    border-radius: var(--radius);
    background: transparent;
    color: var(--ink);
    font-size: var(--text-sm);
    text-align: left;
    cursor: pointer;
  }

  .menu-body button:hover,
  .menu-body button:focus-visible {
    background: var(--surface);
    color: var(--accent);
  }

  .menu-note {
    margin: var(--space-1) 0 0;
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

  .pin-line {
    flex-basis: 100%;
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
