/**
 * Pure display helpers for readouts and sliders. No DOM, no framework —
 * kept here so Slider/Readout formatting is unit-testable without mounting
 * a component.
 */
import type { SeaState } from '../core/types';
import type { LogEntry } from '../lib/logStore';

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
  const measured = actual.minKt !== 0 || actual.maxKt !== 0;
  const lo = measured ? actual.minKt : forecast.minKt;
  const hi = measured ? actual.maxKt : forecast.maxKt;
  return `${fmt(lo, 0)}–${fmt(hi, 0)} kt · ${SEA_LABELS[entry.seaState]} · ${fmt(entry.crewKg, 0, 'kg')}`;
}
