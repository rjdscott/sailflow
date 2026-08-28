/**
 * Pure display helpers for readouts and sliders. No DOM, no framework —
 * kept here so Slider/Readout formatting is unit-testable without mounting
 * a component.
 */
import type { SeaState } from '../core/types';
import type { LogEntry, LogNumber } from '../lib/logStore';
// Type only, so nothing about the race store's runes reaches this module.
import type { Objective } from './race/store.svelte';

/** Round to `decimals` places, avoiding float artefacts like 0.1 + 0.2. */
export function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/** Format a value to a fixed decimal string, optionally suffixed with a unit. */
export function fmt(value: number, decimals: number, unit?: string): string {
  const s = round(value, decimals).toFixed(decimals);
  return unit ? `${s} ${unit}` : s;
}

/**
 * "target 5.8" and the signed gap to it, for a readout that carries an
 * optimum. `better` says which way the metric improves: VMG downwind counts
 * towards the leeward mark and is negative, so more negative is a gain.
 * One convention everywhere — the delta is positive when the target is faster
 * than you, whatever sign the number itself carries (audit ux-02 M-09).
 */
export function targetOf(
  value: number,
  to: number | undefined,
  decimals: number,
  better: 'more' | 'less' = 'more',
): { text: string; delta: string } | undefined {
  if (to === undefined) return undefined;
  const d = round(better === 'less' ? value - to : to - value, decimals);
  return {
    text: fmt(to, decimals),
    delta: `${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d).toFixed(decimals)}`,
  };
}

/**
 * VMG for an instrument face: the magnitude, and the direction as a glyph.
 *
 * Downwind VMG counts towards the leeward mark, so the solver carries it
 * negative — but no instrument on a boat shows a negative VMG, and a sailor
 * reads `−4.95` as a broken readout (audit ux-04 H-04). The sign stays
 * where it means something: the solver, the objective comparison, and the
 * share link. Only the face loses it, and the glyph says which mark the
 * number is made good towards.
 */
export function vmgDisplay(
  value: number,
  objective: Objective,
): { value: string; glyph: '↑' | '↓' } {
  return {
    value: fmt(Math.abs(value), 2),
    glyph: objective === 'vmgDown' ? '↓' : '↑',
  };
}

/** Snap a value to the nearest step within [min, max]. */
export function snap(value: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, value));
  const steps = Math.round((clamped - min) / step);
  return round(min + steps * step, 6);
}

/** Sea-state names, lowercase so they read inline in a sentence or a chip. */
export const SEA_LABELS: Record<SeaState, string> = {
  0: 'flat',
  1: 'ripple',
  2: 'chop',
  3: 'steep',
  4: 'waves',
};

/**
 * One-line conditions summary for a log entry: "8–12 kt · chop · 300 kg".
 * Uses the wind actually recorded when there is one, else the forecast band:
 * an entry started from Dock mode has a forecast and no actuals yet.
 */
export function windLine(entry: LogEntry): string {
  const { actual, forecast } = entry;
  // null (never recorded) and 0 are both "no actual wind here"; a half-recorded
  // actual still wins over the forecast, rather than mixing the two sources.
  const measured = !!actual.minKt || !!actual.maxKt;
  const lo = measured ? actual.minKt : forecast.minKt;
  const hi = measured ? actual.maxKt : forecast.maxKt;
  const kt = (v: LogNumber): string => (v === null ? '?' : fmt(v, 0));
  const parts = [
    lo === null && hi === null ? 'wind not recorded' : `${kt(lo)}–${kt(hi)} kt`,
    SEA_LABELS[entry.seaState],
  ];
  if (entry.crewKg !== null) parts.push(fmt(entry.crewKg, 0, 'kg'));
  return parts.join(' · ');
}
