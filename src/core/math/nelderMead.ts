/**
 * Nelder-Mead simplex minimiser. Standard coefficients (reflect 1, expand 2,
 * contract 0.5, shrink 0.5), fixed default iteration budget, deterministic
 * tie-breaking so repeated runs on the same input are bit-identical.
 */

export interface NelderMeadOptions {
  step?: number | number[];
  maxIter?: number;
  tol?: number;
}

export interface NelderMeadResult {
  x: number[];
  fx: number;
  iters: number;
}

const ALPHA = 1; // reflection
const GAMMA = 2; // expansion
const RHO = 0.5; // contraction
const SIGMA = 0.5; // shrink

interface Point {
  x: number[];
  fx: number;
}

/** Sort ascending by value; ties broken by current array position (stable, deterministic). */
function sortSimplex(simplex: Point[]): void {
  const ordered = simplex.map((p, i) => ({ p, i })).sort((a, b) => a.p.fx - b.p.fx || a.i - b.i);
  for (let i = 0; i < simplex.length; i++) simplex[i] = ordered[i].p;
}

function centroidOf(points: Point[]): number[] {
  const n = points[0].x.length;
  const c = new Array(n).fill(0);
  for (const p of points) for (let d = 0; d < n; d++) c[d] += p.x[d];
  for (let d = 0; d < n; d++) c[d] /= points.length;
  return c;
}

function along(centroid: number[], from: number[], coeff: number): number[] {
  return centroid.map((c, d) => c + coeff * (from[d] - c));
}

export function nelderMead(
  f: (p: number[]) => number,
  x0: number[],
  opts: NelderMeadOptions = {},
): NelderMeadResult {
  const n = x0.length;
  const maxIter = opts.maxIter ?? 400;
  const tol = opts.tol ?? 1e-10;
  const steps = Array.isArray(opts.step) ? opts.step : new Array(n).fill(opts.step ?? 1);

  const simplex: Point[] = [{ x: [...x0], fx: f(x0) }];
  for (let i = 0; i < n; i++) {
    const xi = [...x0];
    xi[i] += steps[i];
    simplex.push({ x: xi, fx: f(xi) });
  }
  sortSimplex(simplex);

  const shrink = () => {
    const best = simplex[0];
    for (let i = 1; i <= n; i++) {
      const xi = along(best.x, simplex[i].x, SIGMA);
      simplex[i] = { x: xi, fx: f(xi) };
    }
  };

  let iters = 0;
  for (; iters < maxIter; iters++) {
    if (Math.abs(simplex[n].fx - simplex[0].fx) <= tol) break;

    const centroid = centroidOf(simplex.slice(0, n));
    const worst = simplex[n];

    const xr = along(centroid, worst.x, -ALPHA);
    const fr = f(xr);

    if (fr < simplex[0].fx) {
      const xe = along(centroid, xr, GAMMA);
      const fe = f(xe);
      simplex[n] = fe < fr ? { x: xe, fx: fe } : { x: xr, fx: fr };
    } else if (fr < simplex[n - 1].fx) {
      simplex[n] = { x: xr, fx: fr };
    } else if (fr < worst.fx) {
      // outside contraction
      const xc = along(centroid, xr, RHO);
      const fc = f(xc);
      if (fc <= fr) simplex[n] = { x: xc, fx: fc };
      else shrink();
    } else {
      // inside contraction
      const xc = along(centroid, worst.x, RHO);
      const fc = f(xc);
      if (fc < worst.fx) simplex[n] = { x: xc, fx: fc };
      else shrink();
    }

    sortSimplex(simplex);
  }

  return { x: simplex[0].x, fx: simplex[0].fx, iters };
}
