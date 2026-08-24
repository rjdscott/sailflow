/**
 * Pure display helpers for readouts and sliders. No DOM, no framework —
 * kept here so Slider/Readout formatting is unit-testable without mounting
 * a component.
 */

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
