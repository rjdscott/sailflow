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

  const tickPct = $derived(tick === undefined ? undefined : ((tick - min) / (max - min)) * 100);

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
        class="readout-input"
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

  <div class="track-wrap" class:locked>
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
    gap: var(--space-1);
    padding-block: var(--space-2);
  }

  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: var(--hit-min);
  }

  .label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--ink);
    font-size: var(--text-sm);
  }

  .readout {
    font-size: var(--text-lg);
    background: none;
    border: none;
    color: var(--ink);
    padding: var(--space-2);
    min-height: var(--hit-min);
    min-width: var(--hit-min);
    cursor: pointer;
  }

  .readout-input {
    font-size: var(--text-lg);
    width: 5em;
    min-height: var(--hit-min);
    border: 1px solid var(--accent);
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--ink);
    padding: var(--space-1) var(--space-2);
    text-align: right;
  }

  .track-wrap {
    position: relative;
    display: flex;
    align-items: center;
    min-height: var(--hit-min);
  }

  .range {
    width: 100%;
    height: 44px;
    margin: 0;
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
  }

  .range::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: var(--radius);
    background: var(--surface);
  }

  .range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 28px;
    height: 28px;
    margin-top: -11px;
    border-radius: 50%;
    background: var(--accent);
    border: none;
  }

  .range::-moz-range-track {
    height: 6px;
    border-radius: var(--radius);
    background: var(--surface);
  }

  .range::-moz-range-thumb {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--accent);
    border: none;
  }

  .range:disabled {
    opacity: 0.6;
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

  .track-wrap.locked .range::-webkit-slider-runnable-track {
    background: repeating-linear-gradient(
      45deg,
      var(--surface),
      var(--surface) 4px,
      var(--ink-2) 4px,
      var(--ink-2) 5px
    );
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
    margin: 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  @media (prefers-reduced-motion: no-preference) {
    .range::-webkit-slider-thumb {
      transition: background-color 0.15s;
    }
  }
</style>
