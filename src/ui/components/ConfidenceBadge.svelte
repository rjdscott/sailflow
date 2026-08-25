<script lang="ts">
  import type { Tier } from '../../core/types';
  import { nextOpen, TIER_NOTE } from './logic';

  /**
   * The tier meaning used to live in a `title`, which touch and keyboard never
   * see (audit ux-01 M-13). It is now a button that opens a small popover, and
   * the same text is the button's accessible name, so no path is hover-only.
   * Neutral ink/line colours: --accent stays for things that respond to a press.
   *
   * Because it is a button, it must never be rendered *inside* another button:
   * that nesting made "what does B mean?" apply the optimum (audit ux-03
   * H-06). Callers that want a badge on a button put it beside the button, not
   * in it — see `ActionsBar`'s `.apply-wrap` and `SuggestButton`'s `li`.
   *
   * It also paints its own surface rather than inheriting one (audit ux-03
   * H-10): dropped on a filled button, a transparent badge composited its
   * --ink-2 text onto --accent at 1.06:1.
   */
  let {
    tier,
    reason,
  }: {
    tier: Tier;
    reason?: string;
  } = $props();

  const uid = $props.id();
  const note = $derived(reason ?? TIER_NOTE[tier]);

  let open = $state(false);
  let root: HTMLSpanElement | undefined = $state();

  function onWindowPointerDown(e: PointerEvent): void {
    if (!open) return;
    if (root && !root.contains(e.target as Node)) open = nextOpen(open, 'outside');
  }
</script>

<svelte:window onpointerdown={onWindowPointerDown} />

<span class="wrap" bind:this={root}>
  <button
    type="button"
    class="badge tier-{tier}"
    aria-expanded={open}
    aria-controls="{uid}-note"
    aria-label="Confidence {tier}. {note}"
    onclick={() => (open = nextOpen(open, 'toggle'))}
    onkeydown={(e) => {
      if (e.key === 'Escape') open = nextOpen(open, 'escape');
    }}
  >
    {tier}
  </button>
  {#if open}
    <span class="pop" id="{uid}-note">{note}</span>
  {/if}
</span>

<style>
  .wrap {
    position: relative;
    display: inline-flex;
  }

  /* Sits inline in a 12–15 px label, so it stays small; 24 px is the target
     floor here rather than 44, because a 44 px overlay would swallow presses
     meant for the readout beside it. */
  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    min-height: 24px;
    padding: 0 var(--space-1);
    font-size: var(--text-xs);
    font-weight: 600;
    border-radius: var(--radius);
    line-height: 1.5;
    cursor: pointer;
  }

  /* Every tier carries an explicit background, so the letter is read against a
     known token and not against whatever the badge was dropped onto. A still
     reads as the filled pill and B/C as outlines on a card, because --surface
     is the card; on a filled button all three keep their own surface. */
  .tier-A {
    background: var(--surface-2);
    color: var(--ink);
    border: 1px solid var(--line-strong);
  }

  .tier-B {
    background: var(--surface);
    color: var(--ink);
    border: 1px solid var(--line-strong);
  }

  .tier-C {
    background: var(--surface);
    color: var(--ink);
    border: 1px dashed var(--line-strong);
  }

  .pop {
    position: absolute;
    top: calc(100% + var(--space-1));
    left: 0;
    z-index: 20;
    width: max-content;
    max-width: 220px;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--ink);
    font-size: var(--text-xs);
    font-weight: 400;
    line-height: 1.4;
    text-align: left;
    white-space: normal;
    box-shadow: 0 4px 12px rgb(0 0 0 / 0.18);
  }
</style>
