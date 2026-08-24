/**
 * Deterministic linear interpolation utilities. Pure functions only: no
 * Math.random, no Date, no hidden state.
 */

/** Linear interpolation between a and b at parameter t (t=0 -> a, t=1 -> b). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Find the bracketing segment [lo, hi] of `xs` containing `x`, plus the
 * interpolation parameter t in [0,1] within that segment. Clamps outside
 * the table's range (t=0 at either end, lo=hi at that endpoint).
 * `xs` must be sorted strictly increasing.
 */
function bracket(xs: number[], x: number): [lo: number, hi: number, t: number] {
  const last = xs.length - 1;
  if (last <= 0) return [0, 0, 0];
  if (x <= xs[0]) return [0, 0, 0];
  if (x >= xs[last]) return [last, last, 0];
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) lo = mid;
    else hi = mid;
  }
  const t = (x - xs[lo]) / (xs[hi] - xs[lo]);
  return [lo, hi, t];
}

/**
 * Linear interpolation over a table (xs, ys). `xs` must be strictly
 * monotone increasing. Clamps to the end values outside the table's range.
 */
export function interp1(xs: number[], ys: number[], x: number): number {
  if (xs.length !== ys.length || xs.length === 0) {
    throw new Error('interp1: xs and ys must be the same non-zero length');
  }
  const [lo, hi, t] = bracket(xs, x);
  return lerp(ys[lo], ys[hi], t);
}

/** Alias of interp1, for call sites that read better as a table lookup. */
export const interpTable = interp1;

/**
 * Bilinear interpolation over a 2D grid. `grid[i][j]` is the value at
 * (xs[i], ys[j]). Both axes clamp outside their table range.
 */
export function bilinear(
  xs: number[],
  ys: number[],
  grid: number[][],
  x: number,
  y: number,
): number {
  if (xs.length === 0 || ys.length === 0 || grid.length !== xs.length) {
    throw new Error('bilinear: xs/ys/grid dimensions must agree');
  }
  const [xlo, xhi, tx] = bracket(xs, x);
  const [ylo, yhi, ty] = bracket(ys, y);
  const r1 = lerp(grid[xlo][ylo], grid[xhi][ylo], tx);
  const r2 = lerp(grid[xlo][yhi], grid[xhi][yhi], tx);
  return lerp(r1, r2, ty);
}
