<script lang="ts">
  import Sheet from '../components/Sheet.svelte';
  import { settings } from '../stores/settings.svelte';
  import { TOUR_STEPS } from './steps';
  import { tour } from './tour.svelte';

  /**
   * The first-run tour: three cards in the app's own bottom sheet.
   *
   * It reuses `Sheet` rather than drawing a spotlight over the live cockpit,
   * which buys the whole a11y contract from `<dialog showModal()>` — focus
   * moves in, Escape closes, tab is trapped, the rest of the page is inert —
   * for no code. It also means there is nothing to animate, so there is
   * nothing for `prefers-reduced-motion` to switch off.
   *
   * It never touches the solver: the worker starts and the first solve lands
   * behind the sheet, so dismissing it shows a cockpit with numbers already in
   * it rather than a spinner.
   */
  let i = $state(0);

  const step = $derived(TOUR_STEPS[i]);
  const last = $derived(i === TOUR_STEPS.length - 1);

  /**
   * Every exit is the same exit: Done, Skip, Escape, or a click on the
   * backdrop. All of them close the sheet, and closing it is what marks the
   * tour seen — so there is no path that shows it twice.
   */
  $effect(() => {
    if (tour.open) i = 0;
    else settings.setTourSeen(true);
  });
</script>

<Sheet bind:open={tour.open} title={step.title}>
  <!-- The heading changes with the step, and a changed heading is not
       announced on its own; the card is a polite live region so stepping is
       read out rather than happening silently. -->
  <div class="body" aria-live="polite">
    <p class="count">Step {i + 1} of {TOUR_STEPS.length}</p>
    <p class="lede">{step.body}</p>
    <p class="hint">{step.hint}</p>
  </div>

  <nav class="nav" aria-label="Tour">
    <button type="button" class="quiet" onclick={() => (tour.open = false)}>
      {last ? 'Done' : 'Skip'}
    </button>
    <span class="dots" aria-hidden="true">
      {#each TOUR_STEPS as s, n (s.title)}
        <span class="dot" class:on={n === i}></span>
      {/each}
    </span>
    {#if i > 0}
      <button type="button" class="quiet" onclick={() => (i -= 1)}>Back</button>
    {/if}
    {#if last}
      <button type="button" class="primary" onclick={() => (tour.open = false)}>
        Start trimming
      </button>
    {:else}
      <button type="button" class="primary" onclick={() => (i += 1)}>Next</button>
    {/if}
  </nav>
</Sheet>

<style>
  .count {
    margin: 0 0 var(--space-2);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-2);
  }

  .lede {
    margin: 0;
    font-size: var(--text-md);
    line-height: 1.55;
    color: var(--ink);
  }

  .hint {
    margin: var(--space-2) 0 0;
    font-size: var(--text-xs);
    line-height: 1.5;
    color: var(--ink-2);
  }

  .nav {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-4);
  }

  /* The dots take the slack, so Skip stays left and the primary stays right
     whether or not Back is in the row. */
  .dots {
    display: flex;
    flex: 1;
    justify-content: center;
    gap: var(--space-1);
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--muted);
  }

  .dot.on {
    background: var(--accent);
  }

  .nav button {
    min-height: var(--hit-min);
    padding: 0 var(--space-3);
    border-radius: var(--radius);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .quiet {
    border: 1px solid var(--line-strong);
    background: transparent;
    color: var(--ink-2);
  }

  .primary {
    border: 1px solid var(--accent);
    background: var(--accent);
    color: var(--on-accent);
    font-weight: 600;
  }
</style>
