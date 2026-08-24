import { describe, expect, it } from 'vitest';
import { goldenMax } from './golden';

describe('goldenMax', () => {
  it('finds the maximum of a downward parabola', () => {
    // max of -(x-3)^2 + 5 is at x=3, fx=5
    const f = (x: number) => -((x - 3) ** 2) + 5;
    const r = goldenMax(f, -10, 10);
    expect(r.x).toBeCloseTo(3, 4);
    expect(r.fx).toBeCloseTo(5, 6);
  });

  it('finds a boundary maximum (monotone function on the interval)', () => {
    // strictly increasing on [0, 10]: max sits at the right boundary
    const f = (x: number) => x;
    const r = goldenMax(f, 0, 10);
    expect(r.x).toBeCloseTo(10, 3);
  });

  it('is deterministic: identical inputs give identical outputs', () => {
    const f = (x: number) => Math.sin(x) - 0.1 * x ** 2;
    const r1 = goldenMax(f, -2, 2);
    const r2 = goldenMax(f, -2, 2);
    expect(r1).toEqual(r2);
  });

  it('uses exactly the requested fixed iteration budget regardless of convergence', () => {
    const f = (x: number) => -((x - 1) ** 2);
    let calls = 0;
    const counted = (x: number) => {
      calls++;
      return f(x);
    };
    goldenMax(counted, 0, 2, 10);
    // 2 initial evaluations + 1 per iteration + 1 final evaluation at the midpoint
    expect(calls).toBe(2 + 10 + 1);
  });
});
