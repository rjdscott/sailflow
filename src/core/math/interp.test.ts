import { describe, expect, it } from 'vitest';
import { bilinear, interp1, interpTable, lerp } from './interp';

describe('lerp', () => {
  it('interpolates linearly', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(10, 0, 0.25)).toBe(7.5);
  });
});

describe('interp1', () => {
  const xs = [0, 1, 2, 4];
  const ys = [0, 10, 10, 20];

  it('hits table values exactly', () => {
    expect(interp1(xs, ys, 0)).toBe(0);
    expect(interp1(xs, ys, 1)).toBe(10);
    expect(interp1(xs, ys, 2)).toBe(10);
    expect(interp1(xs, ys, 4)).toBe(20);
  });

  it('interpolates midpoints', () => {
    expect(interp1(xs, ys, 0.5)).toBeCloseTo(5, 10);
    expect(interp1(xs, ys, 3)).toBeCloseTo(15, 10);
  });

  it('clamps below and above the table range', () => {
    expect(interp1(xs, ys, -5)).toBe(0);
    expect(interp1(xs, ys, 100)).toBe(20);
  });

  it('handles a 2-point table', () => {
    expect(interp1([0, 10], [0, 100], 5)).toBe(50);
    expect(interp1([0, 10], [0, 100], -1)).toBe(0);
    expect(interp1([0, 10], [0, 100], 11)).toBe(100);
  });

  it('handles a 1-point table by returning the sole value everywhere', () => {
    expect(interp1([5], [42], 5)).toBe(42);
    expect(interp1([5], [42], -100)).toBe(42);
    expect(interp1([5], [42], 100)).toBe(42);
  });

  it('throws on mismatched or empty inputs', () => {
    expect(() => interp1([0, 1], [0], 0)).toThrow();
    expect(() => interp1([], [], 0)).toThrow();
  });

  it('interpTable is an alias of interp1', () => {
    expect(interpTable).toBe(interp1);
  });
});

describe('bilinear', () => {
  // grid[i][j] at (xs[i], ys[j]); z = x + 2*y as a plane, exact under bilinear.
  const xs = [0, 1, 2];
  const ys = [0, 10];
  const grid = [
    [0, 20], // x=0: y=0 -> 0, y=10 -> 20
    [1, 21], // x=1
    [2, 22], // x=2
  ];

  it('hits grid nodes exactly', () => {
    expect(bilinear(xs, ys, grid, 0, 0)).toBe(0);
    expect(bilinear(xs, ys, grid, 2, 10)).toBe(22);
    expect(bilinear(xs, ys, grid, 1, 0)).toBe(1);
  });

  it('interpolates a bilinear plane exactly at interior points', () => {
    expect(bilinear(xs, ys, grid, 1.5, 5)).toBeCloseTo(11.5, 6); // x + 2y at (1.5, 5)
    expect(bilinear(xs, ys, grid, 0.5, 10)).toBeCloseTo(20.5, 6); // x + 2y at (0.5, 10)
  });

  it('clamps outside the grid on both axes', () => {
    expect(bilinear(xs, ys, grid, -10, -10)).toBe(0);
    expect(bilinear(xs, ys, grid, 10, 10)).toBe(22);
    expect(bilinear(xs, ys, grid, -10, 10)).toBe(20);
  });
});
