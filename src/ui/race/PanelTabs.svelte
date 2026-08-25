<script lang="ts">
  import { prefersReducedMotion } from 'svelte/motion';
  import { PANELS, panelSection, type PanelId } from '../keys';
  import { conditions } from '../stores/conditions.svelte';

  /**
   * The phone's panel strip: four tabs under the instrument bar that scroll
   * to a panel and say which one you are in (ADR 0015 — the phone stacks the
   * same panels, so it needs the affordance the desktop grid gives for free).
   *
   * It is a scroll aid, not a tab set: every panel stays in the document, so
   * these are links-by-another-name rather than `role="tab"`, and the current
   * one is marked with `aria-current` instead of `aria-selected`.
   */
  let current = $state<PanelId>(PANELS[0].id);

  /**
   * Which panel is *under the strip*, not merely on screen. The top margin is
   * the strip's own height and the bottom one keeps a panel from claiming the
   * title while only its last line is showing.
   * prov: assumed −88 px / −55 % — the strip is 48 px inside a 16 px gap, and
   * the lower line sits just above mid-screen.
   */
  const ROOT_MARGIN = '-88px 0px -55% 0px';

  $effect(() => {
    // Four entries, looked up on an intersection: an array beats a Map, and
    // the lint rule that wants a reactive Map has nothing to be right about.
    const sections: { el: Element; id: PanelId }[] = [];
    for (const p of PANELS) {
      const el = panelSection(p.id);
      if (el) sections.push({ el, id: p.id });
    }
    if (sections.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const hit = sections.find((s) => s.el === e.target);
          if (e.isIntersecting && hit) current = hit.id;
        }
      },
      { rootMargin: ROOT_MARGIN },
    );
    for (const s of sections) io.observe(s.el);
    return () => io.disconnect();
  });

  function go(id: PanelId): void {
    panelSection(id)?.scrollIntoView({
      block: 'start',
      behavior: prefersReducedMotion.current ? 'auto' : 'smooth',
    });
    current = id;
  }
</script>

<nav class="tabs" aria-label="Cockpit panels">
  {#each PANELS as p (p.id)}
    <button
      type="button"
      class="tab"
      class:on={current === p.id}
      aria-current={current === p.id ? 'true' : undefined}
      onclick={() => go(p.id)}
    >
      <!-- The headsail slot carries whichever sail is up (phase 03), so the
           tab that scrolls to it says which one that is. -->
      {p.id === 'headsail' && conditions.sailset === 'asym' ? 'Kite' : p.short}
    </button>
  {/each}
</nav>

<style>
  /* Sticky, so the strip is still there after a thumb-flick down the stack —
     which is the only time it is any use. */
  .tabs {
    position: sticky;
    top: 0;
    z-index: 4;
    display: flex;
    gap: var(--space-2);
    padding: var(--space-2) 0;
    background: var(--bg);
  }

  .tab {
    flex: 1;
    min-height: var(--hit-min);
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    background: var(--surface);
    color: var(--ink-2);
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
  }

  /* Border and weight as well as colour: the current tab has to read without
     hue (research §3 principle 10). */
  .tab.on {
    border-color: var(--accent);
    color: var(--ink);
    box-shadow: inset 0 -2px 0 0 var(--accent);
  }

  /* The desktop grid puts all four panels on screen at once; a strip that
     scrolls to something already in front of you is furniture. */
  @media (min-width: 720px) {
    .tabs {
      display: none;
    }
  }
</style>
