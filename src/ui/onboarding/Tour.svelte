<script lang="ts">
  import { prefersReducedMotion } from 'svelte/motion';
  import Sheet from '../components/Sheet.svelte';
  import { settings } from '../stores/settings.svelte';
  import { TOUR_STEPS } from './steps';
  import { tour } from './tour.svelte';

  /**
   * The first-run tour: three cards in the app's own bottom sheet.
   *
   * It reuses `Sheet`, which buys the whole a11y contract from
   * `<dialog showModal()>` — focus moves in, Escape closes, tab is trapped,
   * the rest of the page is inert — for no code.
   *
   * On top of that it cuts a hole: a card that names an `anchor` scrolls that
   * element into view and rings it, with one enormous box-shadow standing in
   * for the dimming everywhere else. Card 1 was previously drawn *over* the
   * conditions it was meant to introduce (audit ux-04 H-02), which is the
   * whole reason the cut-out exists. The ring lives inside the dialog because
   * the dialog is in the top layer and nothing outside it can paint above its
   * backdrop; while a hole is open the backdrop itself goes transparent, so
   * the shadow below is the only thing dimming the page and the hole is
   * genuinely clear.
   *
   * It never touches the solver: the worker starts and the first solve lands
   * behind the sheet, so dismissing it shows a cockpit with numbers already in
   * it rather than a spinner.
   */
  let i = $state(0);

  const step = $derived(TOUR_STEPS[i]);
  const last = $derived(i === TOUR_STEPS.length - 1);

  /** The anchor's box in viewport coordinates, or null for a card with none. */
  let spot: { top: number; left: number; width: number; height: number } | null = $state(null);

  const reduceMotion = (): boolean =>
    settings.motion === 'off' || (settings.motion !== 'on' && prefersReducedMotion.current);

  /**
   * Follow the anchor for as long as the card is up. A rAF loop rather than
   * scrollend + resize + a ResizeObserver + a MutationObserver, because it
   * has to survive all four: a smooth scroll settles on its own schedule, the
   * band's height changes when a solve lands behind the sheet, and — the one
   * that matters on a cold load — the band is not in the DOM yet. `Race.svelte`
   * renders the instruments only once the first solve has answered, and the
   * tour is up before that, so an anchor looked up once would have found
   * nothing and never looked again. The query is per frame; the assignment is
   * guarded, so once the box settles nothing re-renders. This runs for the few
   * seconds a tour card is on screen.
   */
  $effect(() => {
    const sel = tour.open ? step.anchor : undefined;
    spot = null;
    if (!sel) return;
    let raf = 0;
    let scrolled = false;
    // The last box, in a local rather than read back off `spot`: `follow()`
    // runs once synchronously inside this effect, so a read of `spot` here
    // would make the effect depend on the state it writes and re-run itself
    // for ever.
    let last = '';
    const follow = (): void => {
      const el = document.querySelector(sel);
      if (el) {
        // Once, on the frame it appears — repeating it every frame would fight
        // the reader's own scroll for as long as the card is up.
        if (!scrolled) {
          scrolled = true;
          el.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' });
        }
        const r = el.getBoundingClientRect();
        const key = `${r.top} ${r.left} ${r.width} ${r.height}`;
        if (key !== last) {
          last = key;
          spot = { top: r.top, left: r.left, width: r.width, height: r.height };
        }
      } else if (last !== '') {
        // An anchor a later phase will add, or one that went away: dim the
        // page the ordinary way rather than ringing a stale box.
        last = '';
        spot = null;
      }
      raf = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(raf);
  });

  /**
   * The sheet's own backdrop would dim the hole too, and `::backdrop` belongs
   * to `Sheet`'s element, which this component cannot select. One attribute on
   * the root is the seam; the rule that reads it is at the bottom of this file.
   */
  $effect(() => {
    const root = document.documentElement;
    if (spot) root.setAttribute('data-tour-spot', '');
    else root.removeAttribute('data-tour-spot');
    return () => root.removeAttribute('data-tour-spot');
  });

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
  {#if spot}
    <!-- Fixed inside the dialog, so it is in the top layer with it and paints
         over the page rather than under the backdrop. Pointer-transparent:
         the sheet's own backdrop click still closes the tour. -->
    <div
      class="spot"
      aria-hidden="true"
      style="top: {spot.top}px; left: {spot.left}px; width: {spot.width}px; height: {spot.height}px;"
    ></div>
  {/if}

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
  .spot {
    position: fixed;
    /* The dimming *is* the shadow: one ring, everything outside it darkened,
       nothing inside it touched. 100vmax covers the page at any aspect. */
    box-shadow:
      0 0 0 100vmax rgb(0 0 0 / 0.55),
      0 0 0 2px var(--accent);
    border-radius: var(--radius-card);
    pointer-events: none;
  }

  /* The app's own Motion `off` is handled globally in tokens.css, which zeroes
     `transition-duration` on every element; this is the OS-level half. */
  @media (prefers-reduced-motion: no-preference) {
    .spot {
      transition: all 180ms ease-out;
    }
  }

  /* See the effect that sets the attribute: with a hole open the sheet's own
     backdrop would dim it back down. */
  :global([data-tour-spot] dialog.sheet::backdrop) {
    background: transparent;
  }

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
