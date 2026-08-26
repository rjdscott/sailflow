/**
 * Pure geometry for the race cockpit's instruments (ADR 0015). No DOM, no
 * framework: every number a gauge draws is computed here, so it is testable
 * without mounting a component and the components stay markup.
 */
import { activeBoat } from '../../lib/boat';
import { round } from '../format';
import { trackPct } from '../components/logic';

export type BetterIs = 'more' | 'less';

/**
 * What fraction of the main's leech ribbons the guides want stalled at
 * maximum trim: 50–70 %, with clean flow while building speed.
 * prov: North Sails J/70 tuning guide (S1) and Speed Guide (S3).
 *
 * Mirrors `LEECH_STALL_BAND` in `src/core/solve/instruments.ts`. ADR 0003
 * forbids the UI importing the core, so this published pair is written on
 * both sides of the boundary; keep them identical.
 */
export const LEECH_STALL_BAND: readonly [number, number] = [0.5, 0.7];

/**
 * Spreader stripe distances from the mast, inches, for the *active* class:
 * a class paints the stripes its own guide calls for, so this is a per-boat
 * `instruments.stripeIn*` knob, not a constant. Mirrors the core's
 * `stripeInches()` — ADR 0003 forbids the UI importing the core, so the knob
 * names and the reference-boat fallbacks are written on both sides of the
 * boundary; keep them identical.
 *
 * Fallbacks: prov: North Sails J/70 tuning guide (S1), the reference boat's
 * painted stripes, which is what a class that overrides none is reading.
 */
export const STRIPE_INCHES: readonly [number, number, number] = [
  knob('instruments.stripeInLo', 18),
  knob('instruments.stripeInMid', 20),
  knob('instruments.stripeInHi', 22),
];

/** `core/internal.ts:knob`, restated: the UI may not import the core (ADR 0003). */
function knob(name: string, fallback: number): number {
  const v = activeBoat.calibration[name];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export interface BulletInput {
  min: number;
  max: number;
  value: number;
  target?: number;
  /** Two boundaries in value space, splitting [min, max] into three bands. */
  ranges?: [number, number];
  betterIs: BetterIs;
}

export interface BulletScale {
  valuePct: number;
  targetPct?: number;
  /**
   * The three qualitative band widths in percent, darkest first (`--range-1`
   * is the worst band). `bulletBands` stacks them from the end the worst band
   * belongs to, which is why the order flips with `betterIs`.
   */
  rangePcts: number[];
  /**
   * The scale does not start at zero, so a bar drawn from the left would lie
   * about the ratio it appears to show. Few's bullet-graph spec calls for a
   * symbol (a marker) rather than a bar in that case.
   */
  symbolMode: boolean;
}

/**
 * Where the value, the target and the qualitative ranges sit on a 0–100 track.
 * Everything is clamped to the track: an out-of-range value marks the end of
 * the scale rather than floating off it.
 */
export function bulletScale({
  min,
  max,
  value,
  target,
  ranges,
  betterIs,
}: BulletInput): BulletScale {
  let rangePcts: number[] = [];
  if (ranges) {
    const a = trackPct(Math.min(ranges[0], ranges[1]), min, max);
    const b = trackPct(Math.max(ranges[0], ranges[1]), min, max);
    rangePcts = [a, b - a, 100 - b];
    // Darkest is the worst band. Less-is-better makes the top of the scale the
    // worst end, so the shades run the other way.
    if (betterIs === 'less') rangePcts.reverse();
  }
  return {
    valuePct: trackPct(value, min, max),
    targetPct: target === undefined ? undefined : trackPct(target, min, max),
    rangePcts,
    symbolMode: min > 0,
  };
}

export interface Band {
  /** Left edge, percent. */
  x: number;
  /** Width, percent. */
  w: number;
  /** 1, 2 or 3 — which `--range-N` token paints it. */
  shade: 1 | 2 | 3;
}

/** Turn `rangePcts` widths into drawable rects, stacked from the worst end. */
export function bulletBands(rangePcts: number[], betterIs: BetterIs): Band[] {
  const back = betterIs === 'less';
  let cursor = back ? 100 : 0;
  return rangePcts.map((w, i) => {
    const x = back ? cursor - w : cursor;
    cursor = back ? x : cursor + w;
    return { x, w, shade: (i + 1) as 1 | 2 | 3 };
  });
}

export interface HeelBand {
  target: number;
  lo: number;
  hi: number;
}

/**
 * Upwind heel target by true wind speed, degrees. The guide publishes one
 * angle per wind band; the anchors below are those angles at the middle of
 * each band, interpolated linearly between them so a number does not jump at
 * a band edge.
 *
 * Every number here is `prov: research 2026-08-25-cockpit doc 01 item 10
 * (North Sails J/70 upwind trim tips + big-breeze tips)`, which is where the
 * two source URLs and the published figures live. The old tag named the
 * article directly and resolved to nothing: `PROVENANCE.md`'s Sources table
 * indexes the data files under `data/`, not the research corpus.
 */
const HEEL_ANCHORS = [
  [6, 8], // prov: research 2026-08-25-cockpit doc 01 item 10 — super-light, <= 6 kt
  [10.5, 12], // prov: research 2026-08-25-cockpit doc 01 item 10 — powered up, 7-14 kt
  [16.5, 14], // prov: research 2026-08-25-cockpit doc 01 item 10 — max heel, 15-18 kt
  [22, 15.5], // prov: research 2026-08-25-cockpit doc 01 item 10 — big breeze/chop > 18 kt, 14-17 deg, centre 15.5
] as const satisfies readonly (readonly [number, number])[];

/**
 * Half-width of the acceptable band. The guide states a spread only for big
 * breeze (14–17°), so that spread is read off the source and applied to every
 * band, rather than a tolerance being invented per band.
 */
const HEEL_HALF_BAND = 1.5; // prov: research 2026-08-25-cockpit doc 01 item 10

function lerpAnchors(pts: readonly (readonly [number, number])[], x: number): number {
  const last = pts[pts.length - 1];
  if (x <= pts[0][0]) return pts[0][1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return last[1];
}

/** Target heel and its band, degrees, at a true wind speed in knots. */
export function heelBands(twsKt: number): HeelBand {
  const target = round(lerpAnchors(HEEL_ANCHORS, twsKt), 2);
  return { target, lo: target - HEEL_HALF_BAND, hi: target + HEEL_HALF_BAND };
}

/**
 * Top of the heel gauge's scale, degrees. Past 25° a J/70 is not being sailed,
 * it is being survived, so the scale ends there rather than at a round 30.
 * prov: assumed (ASSUMPTIONS.md).
 */
export const HEEL_SCALE_MAX = 25;

/**
 * Helm load a well-sailed boat carries: enough feel to steer by, well short of
 * the rudder braking. prov: assumed (ASSUMPTIONS.md, helm load proxy). Read by
 * the instrument bar and the Helm panel, which show the same gauge twice.
 */
export const HELM_TARGET = 0.3;

/**
 * Value as a percentage of its target — 100 is on target. A target of zero or
 * below has no meaningful ratio (and would divide by zero), so it reads
 * `undefined` and the caller shows nothing rather than an invented number.
 */
export function pctOfTarget(value: number, target?: number): number | undefined {
  if (target === undefined || !Number.isFinite(target) || target <= 0) return undefined;
  return (value / target) * 100;
}

export type Trend = 'up' | 'down' | 'flat';

/** Relative dead-band: below this the last sample is noise, not a direction. */
const TREND_EPS = 0.005;

/**
 * Which way the last sample moved against the mean of the ones before it.
 * The dead-band keeps a jittering number from strobing an arrow.
 */
export function trendOf(samples: number[]): Trend {
  if (samples.length < 2) return 'flat';
  const prev = samples.slice(0, -1);
  const mean = prev.reduce((a, b) => a + b, 0) / prev.length;
  const d = samples[samples.length - 1] - mean;
  if (Math.abs(d) <= Math.abs(mean) * TREND_EPS) return 'flat';
  return d > 0 ? 'up' : 'down';
}

/**
 * `points` attribute for a sparkline polyline, oldest to newest, scaled to
 * fill the box. A flat series has no span to scale against, so it draws down
 * the middle instead of dividing by zero. Under two samples is not a line.
 */
export function sparkPoints(points: number[], width: number, height: number): string {
  if (points.length < 2) return '';
  const lo = Math.min(...points);
  const span = Math.max(...points) - lo;
  const dx = width / (points.length - 1);
  return points
    .map((p, i) => {
      const y = span === 0 ? height / 2 : height - ((p - lo) / span) * height;
      return `${round(i * dx, 2)},${round(y, 2)}`;
    })
    .join(' ');
}
