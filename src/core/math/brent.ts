/**
 * Brent's method root finder (Numerical Recipes' zbrent): combines
 * bisection, secant, and inverse quadratic interpolation. Deterministic,
 * bounded by maxIter.
 */

export interface BrentOptions {
  tol?: number;
  maxIter?: number;
}

export interface BrentResult {
  x: number;
  fx: number;
  iters: number;
  converged: boolean;
}

export function brent(
  f: (x: number) => number,
  a: number,
  b: number,
  opts: BrentOptions = {},
): BrentResult {
  const tol = opts.tol ?? 1e-10;
  const maxIter = opts.maxIter ?? 100;

  let fa = f(a);
  let fb = f(b);
  if (fa * fb > 0) {
    throw new Error('brent: f(a) and f(b) must bracket a root (opposite signs)');
  }

  let c = a;
  let fc = fa;
  let d = b - a;
  let e = d;

  for (let iter = 1; iter <= maxIter; iter++) {
    if (fb * fc > 0) {
      c = a;
      fc = fa;
      d = b - a;
      e = d;
    }
    if (Math.abs(fc) < Math.abs(fb)) {
      a = b;
      b = c;
      c = a;
      fa = fb;
      fb = fc;
      fc = fa;
    }

    const tol1 = 2 * Number.EPSILON * Math.abs(b) + tol / 2;
    const xm = (c - b) / 2;

    if (Math.abs(xm) <= tol1 || fb === 0) {
      return { x: b, fx: fb, iters: iter, converged: true };
    }

    if (Math.abs(e) >= tol1 && Math.abs(fa) > Math.abs(fb)) {
      const s = fb / fa;
      let p: number;
      let q: number;
      if (a === c) {
        p = 2 * xm * s;
        q = 1 - s;
      } else {
        const q1 = fa / fc;
        const r = fb / fc;
        p = s * (2 * xm * q1 * (q1 - r) - (b - a) * (r - 1));
        q = (q1 - 1) * (r - 1) * (s - 1);
      }
      if (p > 0) q = -q;
      p = Math.abs(p);
      const min1 = 3 * xm * q - Math.abs(tol1 * q);
      const min2 = Math.abs(e * q);
      if (2 * p < Math.min(min1, min2)) {
        e = d;
        d = p / q;
      } else {
        d = xm;
        e = d;
      }
    } else {
      d = xm;
      e = d;
    }

    a = b;
    fa = fb;
    b += Math.abs(d) > tol1 ? d : xm > 0 ? tol1 : -tol1;
    fb = f(b);
  }

  return { x: b, fx: fb, iters: maxIter, converged: false };
}
