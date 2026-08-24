<script lang="ts">
  import type { Tier } from '../../core/types';
  import { fmt, snap } from '../format';
  import ConfidenceBadge from './ConfidenceBadge.svelte';

  let {
    label,
    value = $bindable(),
    min,
    max,
    step,
    unit = '',
    tick,
    locked = false,
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
    tick?: number;
    locked?: boolean;
    tier?: Tier;
    hint?: string;
    decimals?: number;
  } = $props();

  let editing = $state(false);
  let editValue = $state('');
  let showLockNote = $state(false);
  let pressTimer: ReturnType<typeof setTimeout> | undefined;

  const pct = (v: number): number => ((v - min) / (max - min)) * 100;
  const tickPct = $derived(tick === undefined ? undefined : pct(tick));
  const fillPct = $derived(pct(value));

  function onInput(e: Event): void {
    if (locked) return;
    const raw = Number((e.target as HTMLInputElement).value);
    value = snap(raw, min, max, step);
  }

  function startPress(): void {
    if (locked) return;
    pressTimer = setTimeout(() => {
      editValue = String(value);
      editing = true;
    }, 500);
  }

  function cancelPress(): void {
    if (pressTimer) clearTimeout(pressTimer);
  }

  function commitEdit(): void {
    const n = Number(editValue);
    if (!Number.isNaN(n)) value = snap(n, min, max, step);
    editing = false;
  }

  function onLockedTap(): void {
    showLockNote = !showLockNote;
  }
</script>

<div class="slider-row">
  <div class="top">
    <span class="label">
      {label}
      {#if tier}<ConfidenceBadge {tier} />{/if}
    </span>
    {#if editing}
      <input
        class="readout-input tabular-nums"
        type="text"
        inputmode="decimal"
        bind:value={editValue}
        onblur={commitEdit}
        onkeydown={(e) => e.key === 'Enter' && commitEdit()}
      />
    {:else}
      <button
        type="button"
        class="readout tabular-nums"
        onpointerdown={startPress}
        onpointerup={cancelPress}
        onpointerleave={cancelPress}
        aria-label="{label} value, long-press to edit"
      >
        {fmt(value, decimals, unit)}
      </button>
    {/if}
  </div>

  <div class="track-wrap" class:locked style="--fill: {fillPct}%">
    <input
      class="range"
      type="range"
      aria-label={label}
      {min}
      {max}
      {step}
      {value}
      disabled={locked}
      oninput={onInput}
    />
    {#if tickPct !== undefined}
      <div class="tick" style="left: {tickPct}%"></div>
    {/if}
    {#if locked}
      <button
        type="button"
        class="lock-overlay"
        onclick={onLockedTap}
        aria-label="Locked control, tap for why"
      >
        🔒
      </button>
    {/if}
  </div>

  {#if locked && showLockNote}
    <p class="lock-note">
      Locked by class rule C.9.5(a): standing rigging can't be adjusted between leaving the dock and
      racing finishing for the day.
    </p>
  {:else if hint}
    <p class="hint">{hint}</p>
  {/if}
</div>

<style>
  .slider-row {
    display: flex;
    flex-direction: column;
    padding-block: var(--space-1);
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
     and wide enough that digits never shift the label. */
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

  /* 44 px hit area around a 4 px track. */
  .track-wrap {
    position: relative;
    display: flex;
    align-items: center;
    height: var(--hit-min);
    --track: linear-gradient(to right, var(--accent) 0 var(--fill), var(--muted) var(--fill) 100%);
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
    height: 4px;
    border-radius: 2px;
    background: var(--track);
  }

  .range::-moz-range-track {
    height: 4px;
    border-radius: 2px;
    background: var(--track);
  }

  .range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 24px;
    height: 24px;
    margin-top: -10px;
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

  .range:disabled {
    cursor: not-allowed;
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
    background: none;
    border: none;
    font-size: var(--text-md);
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
