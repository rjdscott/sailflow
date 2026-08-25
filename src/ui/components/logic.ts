/**
 * Pure logic behind the shared components: keyboard models, readout parsing
 * and screen-reader text. Lives here rather than inside the `.svelte` files so
 * it is testable without mounting a component (no DOM in the test run).
 */
import type { Tier } from '../../core/types';
import { fmt, snap } from '../format';

/**
 * Next index for a roving-tabindex composite (segmented control, tablist), or
 * `null` when the key is not ours and the caller must leave the event alone.
 * Arrows wrap; Home/End jump to the ends. Down/Up are accepted alongside
 * Right/Left so a stacked group behaves the same.
 */
export function rovingIndex(key: string, current: number, count: number): number | null {
  if (count <= 0) return null;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (current + 1) % count;
    case 'ArrowLeft':
    case 'ArrowUp':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

/**
 * What the slider's numeric editor commits. An empty or unparseable field
 * restores the previous value: `Number('')` is 0, and committing that silently
 * zeroed the control (audit ux-01 M-08).
 */
export function parseEdit(
  raw: string,
  previous: number,
  min: number,
  max: number,
  step: number,
): number {
  const text = raw.trim();
  if (text === '') return previous;
  const n = Number(text);
  return Number.isFinite(n) ? snap(n, min, max, step) : previous;
}

/**
 * Where a value sits on a min–max trough, in percent, clamped to the ends so
 * an out-of-range target (a stale optimum against a re-specced control) marks
 * the end of the track rather than floating off it. A zero-width range has no
 * meaningful position, so it reads 0.
 */
export function trackPct(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

/** Ghost-tick label for the solver's optimum: "optimum 64 %". */
export function optimumText(target: number, decimals: number, unit: string): string {
  return `optimum ${fmt(target, decimals, unit)}`;
}

/**
 * Screen-reader text for a slider: the value as the eye reads it, plus the
 * tuning-guide band when there is one — "70 %, guide 60–75 %". A single guide
 * number (the tick) reads "guide 60 %". The solver's optimum, when the slider
 * carries one, is appended so the ghost tick is never hover-only:
 * "70 %, guide 60–75 %, optimum 64 %".
 */
export function valueText(
  value: number,
  decimals: number,
  unit: string,
  guide?: number | [number, number],
  target?: number,
): string {
  const shown = fmt(value, decimals, unit);
  const parts = [shown];
  if (guide !== undefined) {
    const [lo, hi] = typeof guide === 'number' ? [guide, guide] : guide;
    const band =
      lo === hi ? fmt(lo, decimals, unit) : `${fmt(lo, decimals)}–${fmt(hi, decimals, unit)}`;
    parts.push(`guide ${band}`);
  }
  if (target !== undefined) parts.push(optimumText(target, decimals, unit));
  return parts.join(', ');
}

/**
 * Popover open state after an event. Escape and a press outside always close;
 * a press on the trigger toggles. Enter and Space arrive as a click on the
 * trigger `<button>`, so they route through `'toggle'` too.
 */
export function nextOpen(open: boolean, event: 'toggle' | 'escape' | 'outside'): boolean {
  return event === 'toggle' ? !open : false;
}

/** What each confidence tier means, in one line, for the badge popover. */
export const TIER_NOTE: Record<Tier, string> = {
  A: 'Polar-derived number: quote it as a value.',
  B: 'Direction and band, calibrated: a range, not a single value.',
  C: 'Direction only, uncalibrated: the sign of the effect, not its size.',
};
