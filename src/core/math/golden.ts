/**
 * Golden-section search for the maximum of a unimodal function on [a, b].
 * Runs a FIXED number of iterations (default 40) rather than an adaptive
 * tolerance check, so results are deterministic and cost-bounded.
 */

const GOLDEN_RATIO = (Math.sqrt(5) - 1) / 2; // prov: derived, ~0.618 golden ratio

export interface GoldenResult {
  x: number;
  fx: number;
}

export function goldenMax(
  f: (x: number) => number,
  a: number,
  b: number,
  iters = 40, // prov: assumed, fixed iteration budget for deterministic cost bound
): GoldenResult {
  let lo = a;
  let hi = b;
  let x1 = hi - GOLDEN_RATIO * (hi - lo);
  let x2 = lo + GOLDEN_RATIO * (hi - lo);
  let f1 = f(x1);
  let f2 = f(x2);

  for (let i = 0; i < iters; i++) {
    if (f1 < f2) {
      lo = x1;
      x1 = x2;
      f1 = f2;
      x2 = lo + GOLDEN_RATIO * (hi - lo);
      f2 = f(x2);
    } else {
      hi = x2;
      x2 = x1;
      f2 = f1;
      x1 = hi - GOLDEN_RATIO * (hi - lo);
      f1 = f(x1);
    }
  }

  const x = (lo + hi) / 2;
  return { x, fx: f(x) };
}
