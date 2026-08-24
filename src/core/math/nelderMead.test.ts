import { describe, expect, it } from 'vitest';
import { nelderMead } from './nelderMead';

const rosenbrock = ([x, y]: number[]): number => (1 - x) ** 2 + 100 * (y - x * x) ** 2;
const sphere3 = ([x, y, z]: number[]): number => x * x + y * y + z * z;

describe('nelderMead', () => {
  it('converges on the 2D Rosenbrock function within 1e-3 of the minimum', () => {
    const r = nelderMead(rosenbrock, [-1.2, 1]);
    expect(r.fx).toBeLessThan(1e-3);
    expect(r.x[0]).toBeCloseTo(1, 1);
    expect(r.x[1]).toBeCloseTo(1, 1);
  });

  it('converges on the 3D sphere function', () => {
    const r = nelderMead(sphere3, [5, -3, 2]);
    expect(r.fx).toBeLessThan(1e-6);
    for (const xi of r.x) expect(xi).toBeCloseTo(0, 3);
  });

  it('never exceeds the requested maxIter', () => {
    const r = nelderMead(rosenbrock, [-1.2, 1], { maxIter: 5 });
    expect(r.iters).toBeLessThanOrEqual(5);
  });

  it('is deterministic: identical inputs give identical outputs', () => {
    const r1 = nelderMead(rosenbrock, [-1.2, 1]);
    const r2 = nelderMead(rosenbrock, [-1.2, 1]);
    expect(r1).toEqual(r2);
  });

  it('respects a per-dimension starting step when building the initial simplex', () => {
    const calls: number[][] = [];
    const f = (p: number[]) => {
      calls.push([...p]);
      return sphere3(p);
    };
    nelderMead(f, [0, 0, 0], { step: [1, 2, 3], maxIter: 0 });
    // maxIter: 0 means only the initial n+1 simplex evaluations happen.
    expect(calls).toEqual([
      [0, 0, 0],
      [1, 0, 0],
      [0, 2, 0],
      [0, 0, 3],
    ]);
  });

  it('respects a uniform scalar starting step', () => {
    const calls: number[][] = [];
    const f = (p: number[]) => {
      calls.push([...p]);
      return sphere3(p);
    };
    nelderMead(f, [10, 10, 10], { step: 0.5, maxIter: 0 });
    expect(calls).toEqual([
      [10, 10, 10],
      [10.5, 10, 10],
      [10, 10.5, 10],
      [10, 10, 10.5],
    ]);
  });
});
