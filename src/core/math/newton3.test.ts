import { describe, expect, it } from 'vitest';
import { newton3, type Vec3 } from './newton3';

describe('newton3', () => {
  it('solves a linear system in a single iteration', () => {
    // A x = b, A invertible; central-difference Jacobian of a linear map is
    // exact for any step size, so Newton lands on the root in one step.
    const A = [
      [2, 0, 0],
      [1, 3, 0],
      [0, 1, 4],
    ];
    const b: Vec3 = [4, 8, 10]; // solution is x=y=z=2
    const residual = (x: Vec3): Vec3 => [
      A[0][0] * x[0] + A[0][1] * x[1] + A[0][2] * x[2] - b[0],
      A[1][0] * x[0] + A[1][1] * x[1] + A[1][2] * x[2] - b[1],
      A[2][0] * x[0] + A[2][1] * x[1] + A[2][2] * x[2] - b[2],
    ];
    const r = newton3(residual, [0, 0, 0]);
    expect(r.converged).toBe(true);
    expect(r.iters).toBe(1);
    expect(r.x[0]).toBeCloseTo(2, 6);
    expect(r.x[1]).toBeCloseTo(2, 6);
    expect(r.x[2]).toBeCloseTo(2, 6);
  });

  it('solves a nonlinear coupled system with a known root', () => {
    // x^2 + y^2 + z^2 = 3, x = y, y = z -> root at (1, 1, 1)
    const residual = ([x, y, z]: Vec3): Vec3 => [x * x + y * y + z * z - 3, x - y, y - z];
    const r = newton3(residual, [1.5, 1.2, 0.8]);
    expect(r.converged).toBe(true);
    expect(r.x[0]).toBeCloseTo(1, 6);
    expect(r.x[1]).toBeCloseTo(1, 6);
    expect(r.x[2]).toBeCloseTo(1, 6);
    expect(Math.max(...r.residual.map(Math.abs))).toBeLessThan(1e-8);
  });

  it('damping prevents divergence on a bad start (classic Newton-cycle cubic)', () => {
    // f(t) = t^3 - 2t + 2: undamped Newton from t=0 cycles 0 -> 1 -> 0 -> ...
    // forever without approaching the real root (~ -1.7693). Damping (step
    // halving whenever the residual grows) must break the cycle.
    const cubic = (t: number) => t ** 3 - 2 * t + 2;
    const residual = ([x, y, z]: Vec3): Vec3 => [cubic(x), cubic(y), cubic(z)];

    const undamped = newton3(residual, [0, 0, 0], { damping: false, maxIter: 20 });
    expect(undamped.converged).toBe(false);

    const damped = newton3(residual, [0, 0, 0], { damping: true, maxIter: 100 });
    expect(damped.converged).toBe(true);
    expect(damped.x[0]).toBeCloseTo(-1.7692923542, 5);
    expect(damped.x[1]).toBeCloseTo(-1.7692923542, 5);
    expect(damped.x[2]).toBeCloseTo(-1.7692923542, 5);
  });

  it('returns converged=false (never NaN) on a singular Jacobian', () => {
    // r3 = r1 + r2 identically -> Jacobian rows are linearly dependent.
    const residual = ([x, y, z]: Vec3): Vec3 => [x - y, y - z, x - z];
    const r = newton3(residual, [1, 2, 3]);
    expect(r.converged).toBe(false);
    expect(r.x.every(Number.isFinite)).toBe(true);
    expect(r.residual.every(Number.isFinite)).toBe(true);
  });

  it('is deterministic across repeated calls', () => {
    const residual = ([x, y, z]: Vec3): Vec3 => [x * x + y * y + z * z - 3, x - y, y - z];
    const r1 = newton3(residual, [1.5, 1.2, 0.8]);
    const r2 = newton3(residual, [1.5, 1.2, 0.8]);
    expect(r1).toEqual(r2);
  });
});
