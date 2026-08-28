<script lang="ts">
  import type { Tier } from '../../core/types';
  import ConfidenceBadge from './ConfidenceBadge.svelte';
  import Sparkline from './Sparkline.svelte';

  /**
   * The one instrument-cell contract (ADR 0015): label · value · unit · target
   * bug · trend · tier badge · labelled delta. Every number in the cockpit is
   * one of these, so a reader learns the layout once.
   *
   * The value arrives already formatted — the cell decides nothing about
   * precision, which belongs with whoever owns the number.
   */
  let {
    label,
    id,
    value,
    unit = '',
    tier,
    target,
    trend,
    size = 'md',
    onexplain,
    onactivate,
    expanded,
    activateHint,
  }: {
    label: string;
    /** Key into the caller's explain copy; stable across label renames. */
    id: string;
    value: string;
    unit?: string;
    tier?: Tier;
    /** The optimum, formatted, plus the signed gap and what the gap is against. */
    target?: { text: string; delta: string; label: string };
    /** Recent samples, oldest to newest. Under two points draws nothing. */
    trend?: number[];
    size?: 'lg' | 'md' | 'sm';
    onexplain?: (id: string) => void;
    /**
     * Makes the *value* the control (audit ux-04 H-01 rule 2): on the
     * conditions half of the band, tapping the number is how you change it,
     * rather than an `Edit` button beside it. The type ramp is untouched — a
     * transparent button wearing the same `.value` styles — so a cell you can
     * press still weighs exactly what the cell beside it weighs.
     */
    onactivate?: () => void;
    /** For an `onactivate` that opens a popover: its state, for the button. */
    expanded?: boolean;
    /**
     * What pressing the value does, for a cell where that is not obvious from
     * the value itself: `SAIL: Jib, switch to gennaker`. A toggle whose whole
     * label is its current state tells a screen reader nothing about what it
     * would do.
     */
    activateHint?: string;
  } = $props();
</script>

<div class="cell {size}">
  <span class="section-title">
    {#if onexplain}
      <!-- The label is the affordance: a quiet ? on a text button, so the band
           still reads as numbers rather than as a row of controls. -->
      <button type="button" class="explain hit-44" onclick={() => onexplain?.(id)}>
        {label}<span aria-hidden="true" class="q">?</span>
      </button>
    {:else}
      <span>{label}</span>
    {/if}
    {#if tier}<ConfidenceBadge {tier} />{/if}
  </span>

  <!-- Re-keying on the text restarts the fade, so a number that did not move
       does not animate. -->
  {#key value}
    {#if onactivate}
      <button
        type="button"
        class="value fade trigger"
        class:hero-number={size === 'lg'}
        aria-label="{label}: {value}{unit ? ` ${unit}` : ''}{activateHint
          ? `, ${activateHint}`
          : ''}"
        aria-haspopup={expanded === undefined ? undefined : 'true'}
        aria-expanded={expanded}
        onclick={onactivate}
      >
        {value}{#if unit}<span class="hero-unit">{unit}</span>{/if}<span
          aria-hidden="true"
          class="chev">▾</span
        >
      </button>
    {:else}
      <span class="value fade" class:hero-number={size === 'lg'}>
        {value}{#if unit}<span class="hero-unit">{unit}</span>{/if}
      </span>
    {/if}
  {/key}

  {#if target}
    <!-- Ink, not valence: the gap to the optimum is information, not a score.
         The words are always in the accessibility tree and visible in the
         learn tier, where there is room to spell them out. -->
    <span class="target">
      target {target.text}
      <span class="delta-label">Δ {target.label}</span>
      <span class="delta tabular-nums">{target.delta}</span>
    </span>
  {/if}

  {#if trend && trend.length > 1}
    <span class="trend"><Sparkline points={trend} /></span>
  {/if}
</div>

<style>
  .cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  /* `.section-title` is a nowrap flex row by default, and in the band the cells
     share the width they are given: `%POLAR ?` plus its tier badge is 97 px in
     a 45 px cell, and the overflow ran under the cell beside it. Wrapping the
     badge under the label costs a line only where the label does not fit. */
  .cell .section-title {
    flex-wrap: wrap;
    row-gap: 0;
  }

  .explain {
    padding: 0;
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    letter-spacing: inherit;
    text-transform: inherit;
    cursor: pointer;
  }

  /* The label line is 17 px tall, so the bare text was a 17 px target against
     the repo's own 44 px token (audit ux-03 M-13). `.hit-44` grows the hit
     area with a pseudo-element and paints nothing — except in the ≥ 1280 px
     cockpit, where phase 06's height budget puts instrument rows 37 px apart
     and two 44 px overlays would overlap and steal each other's presses. */
  @media (min-width: 1280px) {
    .explain::after {
      display: none;
    }
  }

  .q {
    margin-left: 3px;
    color: var(--accent);
  }

  .value {
    display: inline-flex;
    align-items: baseline;
    gap: var(--space-1);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: var(--instrument, var(--ink));
  }

  .cell.md .value {
    font-size: var(--text-xl);
    font-weight: 600;
    line-height: 1.1;
    letter-spacing: -0.01em;
  }

  .cell.sm .value {
    font-size: var(--text-lg);
    font-weight: 600;
  }

  /* The hero-number class brings its own colour; the cockpit ink wins. */
  .value.hero-number {
    color: var(--instrument, var(--ink));
  }

  /* A pressable value keeps the readout's type and adds one chevron: the
     affordance is the chevron and the focus ring, not a box around the number. */
  button.value {
    min-height: var(--hit-min);
    padding: 0;
    border: none;
    background: none;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
  }

  button.value:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
    border-radius: var(--radius);
  }

  .chev {
    margin-left: var(--space-1);
    font-size: var(--text-sm);
    color: var(--accent);
  }

  /* Mouse-sized in the cockpit, where the value sits in a 37 px instrument row
     and a 44 px button would push the band onto a second line. */
  @media (min-width: 1280px) {
    button.value {
      min-height: 0;
    }
  }

  .target {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0 var(--space-1);
    min-width: 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .delta {
    color: var(--ink-2);
  }

  /* Named for a screen reader everywhere, spelled out for the eye only where
     the density tier has room for words. */
  .delta-label {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  :global([data-tier='learn']) .delta-label {
    position: static;
    width: auto;
    height: auto;
    margin: 0;
    overflow: visible;
    clip-path: none;
    /* …and it has to wrap. `nowrap` belongs to the sr-only clip above; left in
       place when the words become visible it made "Δ to optimum (+ = optimum
       is faster)" a 207 px unbreakable line inside a 138 px cell, so at Learn
       density the BSP, %polar and VMG cells overflowed into each other and the
       band clipped what was left (measured at 1440, phase 05). */
    white-space: normal;
  }

  .trend {
    margin-top: var(--space-1);
    color: var(--ink-2);
  }

  /* A small cell has no room for a line, and learn tier is reading the words
     rather than watching the wiggle. Analyse wants it at every size. */
  .cell.sm .trend,
  :global([data-tier='learn']) .trend {
    display: none;
  }

  :global([data-tier='analyse']) .cell.sm .trend {
    display: block;
  }

  /* One drag changes every metric at once, so a filled highlight strobes the
     whole panel. A short fade says "this number moved" and gets out of the way. */
  @media (prefers-reduced-motion: no-preference) {
    .fade {
      animation: fade 120ms ease-out;
    }
  }

  @keyframes fade {
    from {
      opacity: 0.3;
    }
    to {
      opacity: 1;
    }
  }
</style>
