/**
 * Pure Dock-mode logic: candidate grid, tie-band selection, sparkline path,
 * tuning-guide band lookup, display helpers. No DOM, no runes — everything
 * here is unit-testable without mounting a component.
 */
import type {
  BoatDefinition,
  ControlSpec,
  DockControls,
  DockRegret,
  DockScore,
  Forecast,
} from '../../core/types';
import { activeBoat } from '../../lib/boat';
import { bandFor, guidesFor } from '../../lib/reference';
import { fmt, round, snap } from '../format';

/** The class being sailed. Validated by `src/core/boat/validate` on registration. */
export const boat: BoatDefinition = activeBoat;

export const specs: Record<keyof DockControls, ControlSpec> = {
  upperTurns: boat.controls.upperTurns,
  lowerTurns: boat.controls.lowerTurns,
  forestayMm: boat.controls.forestayMm,
};

/**
 * Keep min ≤ likely ≤ max after any one of the three sliders moves. Mutates
 * in place so it works directly on a `$state` forecast, and is a no-op once
 * the forecast is already ordered (so the caller's effect settles).
 */
export function clampForecast(f: Forecast): void {
  if (f.maxKt < f.minKt) f.maxKt = f.minKt;
  if (f.likelyKt < f.minKt) f.likelyKt = f.minKt;
  if (f.likelyKt > f.maxKt) f.likelyKt = f.maxKt;
}

// ---------------------------------------------------------------------------
// Candidate grid
// ---------------------------------------------------------------------------

/**
 * A batch this size is one worker round-trip. Above ~36 the solve is slow
 * enough on a phone that the button feels broken.
 */
export const MAX_CANDIDATES = 36;

/** Inclusive arithmetic sequence, float-artefact free. */
export function seq(from: number, to: number, step: number): number[] {
  const n = Math.floor((to - from) / step + 1e-9);
  return Array.from({ length: Math.max(0, n) + 1 }, (_, i) => round(from + i * step, 6));
}

/** Snap candidate values onto a control's legal steps and range, deduped. */
export function legalAxis(spec: ControlSpec, values: number[]): number[] {
  return [...new Set(values.map((v) => snap(v, spec.min, spec.max, spec.step)))];
}

/** Halve the widest axis until the product fits `cap`. Endpoints survive. */
function thin(axes: number[][], cap: number): number[][] {
  const out = axes.map((a) => [...a]);
  const size = (): number => out.reduce((n, a) => n * a.length, 1);
  while (size() > cap) {
    let widest = 0;
    for (let i = 1; i < out.length; i++) if (out[i].length > out[widest].length) widest = i;
    const len = out[widest].length;
    if (len <= 2) break; // nothing left to thin; caller gets a slightly big batch
    out[widest] = out[widest].filter((_, i) => i % 2 === 0 || i === len - 1);
  }
  return out;
}

/**
 * The setups `suggest()` scores. Coarse on purpose: the guide's own range is
 * −3..+6 uppers and −2..+5 lowers, and half-turn resolution across all three
 * controls would be thousands of solves for a difference under the tie band.
 */
export function candidateSetups(cap = MAX_CANDIDATES): DockControls[] {
  const [uppers, lowers, forestays] = thin(
    [
      legalAxis(specs.upperTurns, seq(-3, 6, 1.5)),
      legalAxis(specs.lowerTurns, seq(-2, 5, 1.5)),
      legalAxis(specs.forestayMm, [0, 15, 30]),
    ],
    cap,
  );
  const out: DockControls[] = [];
  for (const upperTurns of uppers)
    for (const lowerTurns of lowers)
      for (const forestayMm of forestays) out.push({ upperTurns, lowerTurns, forestayMm });
  return out;
}

/**
 * A cheap stand-in reference grid: five setups spread evenly through
 * `candidateSetups()`. T*(w) taken over these alone can only be slower than
 * the real optimum, so regret scored against them is an under-estimate — the
 * UI labels such a score provisional and replaces it with the full-grid one.
 * Five is what fits inside the ~1 s the first paint is allowed.
 */
export function quickCandidates(): DockControls[] {
  const grid = candidateSetups();
  const n = Math.min(5, grid.length);
  return Array.from({ length: n }, (_, i) => grid[Math.round((i * (grid.length - 1)) / (n - 1))]);
}

// ---------------------------------------------------------------------------
// Tie band
// ---------------------------------------------------------------------------

/**
 * Below this the model can't tell two setups apart, so presenting a single
 * winner would be false precision (honesty rules).
 */
export const TIE_BAND_S_PER_MILE = 2;

export interface Suggestion {
  best: DockScore;
  /** Every setup within the tie band of the best, best first. */
  tied: DockScore[];
  /** Best three, for display. */
  top: DockScore[];
}

export function pickBest(scores: DockScore[], tol = TIE_BAND_S_PER_MILE): Suggestion | null {
  if (scores.length === 0) return null;
  const sorted = [...scores].sort(
    (a, b) => a.expectedRegretSPerMile.value - b.expectedRegretSPerMile.value,
  );
  const best = sorted[0];
  const limit = best.expectedRegretSPerMile.value + tol;
  return {
    best,
    tied: sorted.filter((s) => s.expectedRegretSPerMile.value <= limit),
    top: sorted.slice(0, 3),
  };
}

// ---------------------------------------------------------------------------
// Sparkline
// ---------------------------------------------------------------------------

/** SVG path for the per-TWS regret curve. Always finite, may be empty. */
export function sparklinePath(points: DockRegret[], w = 88, h = 24): string {
  const pts = points.filter((p) => Number.isFinite(p.regretSPerMile));
  if (pts.length === 0) return '';
  const ys = pts.map((p) => p.regretSPerMile);
  const lo = Math.min(...ys);
  const span = Math.max(...ys) - lo || 1;
  const dx = pts.length > 1 ? w / (pts.length - 1) : 0;
  return pts
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'}${round(i * dx, 2)},${round(h - ((p.regretSPerMile - lo) / span) * h, 2)}`,
    )
    .join(' ');
}

export interface SparkTick {
  /** x in the same user units as `sparklinePath`'s `w`. */
  x: number;
  /** Wind speed, whole knots, no unit — the axis carries the unit once. */
  label: string;
  /** So the first and last labels sit inside the box instead of overhanging. */
  anchor: 'start' | 'middle' | 'end';
}

/**
 * x-axis ticks for the sparkline: first, middle and last wind speed. Three is
 * the most that fits under an 88–240 px track at 12 px without colliding.
 */
export function sparklineTicks(points: DockRegret[], w = 88): SparkTick[] {
  const pts = points.filter((p) => Number.isFinite(p.regretSPerMile));
  if (pts.length === 0) return [];
  if (pts.length === 1) return [{ x: 0, label: fmt(pts[0].twsKt, 0), anchor: 'start' }];
  const last = pts.length - 1;
  const dx = w / last;
  const idx = pts.length >= 3 ? [0, last >> 1, last] : [0, last];
  return idx.map((i, n) => ({
    x: round(i * dx, 2),
    label: fmt(pts[i].twsKt, 0),
    anchor: n === 0 ? 'start' : n === idx.length - 1 ? 'end' : 'middle',
  }));
}

// ---------------------------------------------------------------------------
// Tuning guide bands -> slider guide ticks
// ---------------------------------------------------------------------------

export interface GuideBand {
  label: string;
  uppersTurns: number | null;
  lowersTurns: number | null;
}

/**
 * The guide the Dock quotes when nothing is selected: the first one committed
 * for the boat, in filename order. `null` when the boat has no guide at all.
 */
export function defaultGuideId(boatId?: string): string | null {
  return guidesFor(boatId).find((e) => e.guide !== null)?.id ?? null;
}

/**
 * A guide's published band covering `twsKt`, clamped at both ends. `null`
 * when the guide is absent or its table was never transcribed — the sliders
 * then show no tick rather than an invented one.
 */
export function guideBand(twsKt: number, id: string | null = defaultGuideId()): GuideBand | null {
  const guide = guidesFor().find((e) => e.id === id)?.guide;
  if (!guide) return null;
  const hit = bandFor(guide, twsKt);
  return { label: hit.label, uppersTurns: hit.uppersTurns, lowersTurns: hit.lowersTurns };
}

/** The guide's short name for a hint line ("North"), or a stand-in. */
export function guideLabel(id: string | null = defaultGuideId()): string {
  return guidesFor().find((e) => e.id === id)?.label ?? 'No guide';
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

/** "+2.0", "-1.5", "0.0" — sign always shown for a from-base offset. */
export function signed(value: number, decimals = 1, unit = ''): string {
  const s = fmt(Math.abs(value), decimals, unit);
  return `${value < 0 ? '-' : '+'}${s}`;
}

/** "+2.0 / +1.0 / 15 mm" — uppers / lowers / forestay, for tight spots. */
export function shortSetup(s: DockControls): string {
  return `${signed(s.upperTurns)} / ${signed(s.lowerTurns)} / ${fmt(s.forestayMm, 0, 'mm')}`;
}

/** "uppers +2.0 · lowers +1.0 · forestay 15 mm" */
export function describeSetup(s: DockControls): string {
  return [
    `uppers ${signed(s.upperTurns)}`,
    `lowers ${signed(s.lowerTurns)}`,
    `forestay ${fmt(s.forestayMm, 0, 'mm')}`,
  ].join(' · ');
}
