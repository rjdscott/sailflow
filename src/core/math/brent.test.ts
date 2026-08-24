import { describe, expect, it } from 'vitest';
import { brent } from './brent';

describe('brent', () => {
  it('finds the root of cos(x) on [0, 2]', () => {
    const r = brent((x) => Math.cos(x), 0, 2);
    expect(r.converged).toBe(true);
    expect(r.x).toBeCloseTo(Math.PI / 2, 8);
    expect(Math.abs(r.fx)).toBeLessThan(1e-8);
  });

  it('finds the root of a polynomial: x^3 - x - 2 on [1, 2]', () => {
    const f = (x: number) => x ** 3 - x - 2;
    const r = brent(f, 1, 2);
    expect(r.converged).toBe(true);
    // known root ~1.521379706804...
    expect(r.x).toBeCloseTo(1.5213797068, 8);
  });

  it('respects a looser tolerance with fewer iterations', () => {
    const f = (x: number) => x ** 3 - x - 2;
    const loose = brent(f, 1, 2, { tol: 1e-2 });
    const tight = brent(f, 1, 2, { tol: 1e-12 });
    expect(loose.converged).toBe(true);
    expect(tight.converged).toBe(true);
    expect(loose.iters).toBeLessThanOrEqual(tight.iters);
    expect(Math.abs(loose.x - 1.5213797068)).toBeLessThan(1e-1);
  });

  it('throws when the interval does not bracket a root', () => {
    expect(() => brent((x) => x * x + 1, -1, 1)).toThrow();
  });

  it('bounds the iteration count at maxIter', () => {
    // A pathological function that never lets Brent settle within a tiny budget.
    const f = (x: number) => Math.sin(1 / (x + 1e-3)) + (x - 0.3);
    const r = brent(f, -1, 1, { maxIter: 3, tol: 1e-15 });
    expect(r.iters).toBeLessThanOrEqual(3);
  });

  it('is deterministic across repeated calls', () => {
    const f = (x: number) => x ** 3 - x - 2;
    const r1 = brent(f, 1, 2);
    const r2 = brent(f, 1, 2);
    expect(r1).toEqual(r2);
  });
});
