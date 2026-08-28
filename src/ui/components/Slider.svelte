<script lang="ts">
  import type { Tier } from '../../core/types';
  import { fmt, snap } from '../format';
  import ConfidenceBadge from './ConfidenceBadge.svelte';
  import LockIcon from './LockIcon.svelte';
  import { optimumText, parseEdit, trackPct, valueText } from './logic';

  let {
    label,
    value = $bindable(),
    min,
    max,
    step,
    unit = '',
    tick,
    target,
    targetStale = false,
    guide,
    highlight = false,
    locked = false,
    lockReason = "Committed at the dock, rule C.9.5. Standing rigging can't be adjusted between leaving the dock and racing finishing for the day.",
    tickWord = 'guide',
    tier,
    hint,
    decimals = 1,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit?: string;
    /** Single guide value, drawn as a mark on the track. */
    tick?: number;
    /** Solver optimum, drawn as a ghost marker above the trough. */
    target?: number;
    /** The optimum on screen predates the current trim: a re-search is running. */
    targetStale?: boolean;
    /** Guide band [lo, hi], announced as "guide 60–75 %". */
    guide?: [number, number];
    locked?: boolean;
    /** Why this control cannot be moved. The whole sentence, not a fragment. */
    lockReason?: string;
    /** What the tick or band on the track is: "guide", "base trim", … */
    tickWord?: string;
    tier?: Tier;
    hint?: string;
    decimals?: number;
    /**
     * Preview that a pending action would move this control (research §3
     * principle 24, Factorio's reset hover). Outline only — no fill, no
     * colour valence: nothing has happened yet.
     */
    highlight?: boolean;
  } = $props();

  const uid = $props.id();

  let editing = $state(false);
  let editValue = $state('');
  let showLockNote = $state(false);
  let pressTimer: ReturnType<typeof setTimeout> | undefined;

  const tickPct = $derived(tick === undefined ? undefined : trackPct(tick, min, max));
  const targetPct = $derived(target === undefined ? undefined : trackPct(target, min, max));
  const fillPct = $derived(trackPct(value, min, max));
  const targetLabel = $derived(target === undefined ? '' : optimumText(target, decimals, unit));

  /** The band wins over the single tick when both are supplied. */
  const guideText = $derived(guide ?? tick);

  // The lock reason and the guide hint are prose about the control, so they
  // hang off the range as descriptions rather than being baked into its name.
  const describedBy = $derived(
    [locked ? `${uid}-lock` : '', hint ? `${uid}-hint` : ''].filter(Boolean).join(' ') || undefined,
  );

  function onInput(e: Event): void {
    const el = e.target as HTMLInputElement;
    // Locked sliders stay focusable and readable (aria-disabled, not disabled),
    // so the guard has to put the DOM value back itself.
    if (locked) {
      el.value = String(value);
      return;
    }
    value = snap(Number(el.value), min, max, step);
  }

  function openEditor(): void {
    if (locked) return;
    editValue = String(value);
    editing = true;
  }

  function startPress(): void {
    if (locked) return;
    pressTimer = setTimeout(openEditor, 500);
  }

  function cancelPress(): void {
    if (pressTimer) clearTimeout(pressTimer);
  }

  function commitEdit(): void {
    if (!editing) return;
    value = parseEdit(editValue, value, min, max, step);
    editing = false;
  }

  function cancelEdit(): void {
    editing = false;
  }

  function onEditKey(e: KeyboardEvent): void {
    if (e.key === 'Enter') commitEdit();
    else if (e.key === 'Escape') cancelEdit();
  }

  /** One legal step, from the arrow keys, `[`/`]` or the stepper buttons. */
  function nudge(dir: 1 | -1): void {
    if (locked) return;
    value = snap(value + dir * step, min, max, step);
  }

  /**
   * `[` and `]` alongside the arrow keys the range input already handles, so
   * a desktop study session never leaves the home row (audit ux-02 M-13).
   */
  function onTrackKey(e: KeyboardEvent): void {
    if (e.key !== '[' && e.key !== ']') return;
    e.preventDefault();
    nudge(e.key === ']' ? 1 : -1);
  }

  /** The editor is useless unless it is where you are typing. */
  function focusOnMount(node: HTMLInputElement): void {
    node.focus();
    node.select();
  }
</script>

<div class="slider-row" class:highlight>
  <div class="top">
    <span class="label">
      {label}
      {#if tier}<ConfidenceBadge {tier} />{/if}
    </span>
    {#if editing}
      <input
        class="readout-input tabular-nums"
        type="number"
        inputmode="decimal"
        {min}
        {max}
        {step}
        aria-label="{label} value"
        value={editValue}
        oninput={(e) => (editValue = e.currentTarget.value)}
        onblur={commitEdit}
        onkeydown={onEditKey}
        use:focusOnMount
      />
    {:else}
      <button
        type="button"
        class="readout tabular-nums hit-44"
        onclick={openEditor}
        onpointerdown={startPress}
        onpointerup={cancelPress}
        onpointerleave={cancelPress}
        disabled={locked}
        title={locked ? lockReason : undefined}
        aria-label="Edit {label} value"
      >
        {fmt(value, decimals, unit)}
      </button>
    {/if}
  </div>

  <div class="line">
    <!-- The exact value beside the coarse one (research §3 principle 5): a
         slider is for the sweep, these two are for the last step. Hidden in
         the learn tier by CSS, where the readout editor is enough. -->
    <!-- A disabled control that says nothing is a mystery; the lock reason is
         the tooltip as well as the (sr-only) note below (review of #109). -->
    <button
      type="button"
      class="step"
      onclick={() => nudge(-1)}
      disabled={locked || value <= min}
      title={locked ? lockReason : undefined}
      aria-label="Decrease {label}"
    >
      −
    </button>

    <div class="track-wrap" class:locked style="--fill: {fillPct}%">
      <input
        class="range"
        type="range"
        aria-label={label}
        aria-valuetext={valueText(value, decimals, unit, guideText, target, tickWord)}
        aria-describedby={describedBy}
        aria-disabled={locked ? 'true' : undefined}
        {min}
        {max}
        {step}
        {value}
        oninput={onInput}
        onkeydown={onTrackKey}
      />
      {#if tickPct !== undefined}
        <div class="tick" style="left: {tickPct}%"></div>
      {/if}
      {#if targetPct !== undefined}
        <!-- Hover gets the title; keyboard and AT get the same words through
           aria-valuetext, so the ghost tick is never mouse-only. -->
        <div
          class="target"
          class:stale={targetStale}
          style="left: {targetPct}%"
          title={targetStale ? `${targetLabel} — re-searching from this trim` : targetLabel}
        ></div>
      {/if}
      {#if locked}
        <button
          type="button"
          class="lock-overlay"
          onclick={() => (showLockNote = !showLockNote)}
          aria-expanded={showLockNote}
          aria-controls="{uid}-lock"
          aria-label="Why {label} is locked"
        >
          <LockIcon />
        </button>
      {/if}
    </div>

    <button
      type="button"
      class="step"
      onclick={() => nudge(1)}
      disabled={locked || value >= max}
      title={locked ? lockReason : undefined}
      aria-label="Increase {label}"
    >
      +
    </button>
  </div>

  {#if locked}
    <!-- Always in the accessibility tree, revealed on tap for everyone else. -->
    <p id="{uid}-lock" class="lock-note" class:sr-only={!showLockNote}>
      {lockReason}
    </p>
  {/if}
  {#if hint}
    <p id="{uid}-hint" class="hint">{hint}</p>
  {/if}
</div>

<style>
  .slider-row {
    display: flex;
    flex-direction: column;
    padding-block: var(--space-1);
  }

  /* Factorio's destructive-action preview (research §3 principle 24): the
     rows a pending action would move say so before it moves them. Outline,
     never fill or colour valence — nothing has happened yet. */
  .slider-row.highlight {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
    border-radius: var(--radius);
  }

  @media (prefers-reduced-motion: no-preference) {
    .slider-row.highlight {
      animation: outline-pulse 1.2s ease-in-out infinite;
    }
  }

  @keyframes outline-pulse {
    50% {
      outline-color: transparent;
    }
  }

  .top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    color: var(--ink);
    font-size: var(--text-sm);
  }

  /* The value is the thing you read while dragging: tabular, right-aligned,
     and wide enough that digits never shift the label. Click, Enter or Space
     turns it into the editor; long-press still does too. */
  .readout {
    flex: none;
    min-width: 5.5ch;
    padding: 0;
    background: none;
    border: none;
    color: var(--ink);
    font-size: var(--text-md);
    font-weight: 600;
    text-align: right;
    cursor: pointer;
  }

  .readout:disabled {
    cursor: default;
  }

  .readout-input {
    width: 6em;
    min-height: 32px;
    border: 1px solid var(--accent);
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--ink);
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-md);
    text-align: right;
  }

  /* One row: stepper, track, stepper. The track takes what is left. */
  .line {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  /* 44 px hit area around a 6 px track. The whole 44 px belongs to the range
     input, so a press anywhere on the row jumps the thumb there — native
     behaviour, and the padding is what makes it reachable with a thumb. */
  .track-wrap {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    height: var(--hit-min);
    --track: linear-gradient(to right, var(--accent) 0 var(--fill), var(--muted) var(--fill) 100%);
  }

  /* Fitts: 44 px square, always on screen, no hover or long-press to find. */
  .step {
    flex: none;
    width: var(--hit-min);
    height: var(--hit-min);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: transparent;
    color: var(--ink);
    font-size: var(--text-lg);
    line-height: 1;
    cursor: pointer;
  }

  .step:disabled {
    color: var(--muted);
    border-color: var(--line);
    cursor: default;
  }

  /* Learn has the sliders and the tap-to-edit readout; the steppers are the
     trimmer's tier. One attribute on the root picks it (ADR 0015). */
  :global([data-tier='learn']) .step {
    display: none;
  }

  .range {
    width: 100%;
    height: var(--hit-min);
    margin: 0;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
  }

  .range::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: 3px;
    background: var(--track);
  }

  .range::-moz-range-track {
    height: 6px;
    border-radius: 3px;
    background: var(--track);
  }

  .range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 24px;
    height: 24px;
    margin-top: -9px;
    border-radius: 50%;
    background: var(--accent);
    border: 2px solid var(--bg);
  }

  .range::-moz-range-thumb {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--accent);
    border: 2px solid var(--bg);
  }

  .range[aria-disabled='true'] {
    cursor: not-allowed;
  }

  /* The optimum is a hollow chevron above the trough, never a second fill:
     it marks where the solver would put the thumb, and the guide tick below
     still marks the tuning guide. Different shape, different row, no colour
     valence — neither is a fault. */
  .target {
    position: absolute;
    top: 50%;
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 6px solid var(--ink-2);
    transform: translate(-4px, -15px);
    pointer-events: none;
  }

  /* The answer on screen was found from a trim you have since moved: still
     shown, visibly not current (audit ux-02 H-07). */
  .target.stale {
    opacity: 0.35;
  }

  .tick {
    position: absolute;
    top: 50%;
    width: 2px;
    height: 12px;
    transform: translate(-1px, -6px);
    background: var(--ink-2);
    pointer-events: none;
  }

  /* Locked: hatched trough, no accent fill — it reads as "not yours to move"
     before you try to move it. */
  .track-wrap.locked {
    --track: repeating-linear-gradient(45deg, var(--muted) 0 3px, var(--line) 3px 6px);
  }

  .track-wrap.locked .range::-webkit-slider-thumb {
    background: var(--ink-2);
  }

  .track-wrap.locked .range::-moz-range-thumb {
    background: var(--ink-2);
  }

  .lock-overlay {
    position: absolute;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--ink-2);
    min-width: var(--hit-min);
    min-height: var(--hit-min);
    cursor: pointer;
  }

  .lock-note,
  .hint {
    margin: var(--space-1) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }
</style>
