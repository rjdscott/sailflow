import { describe, expect, it } from 'vitest';
import { fmt, round, snap } from './format';

describe('round', () => {
  it('avoids float artefacts', () => {
    expect(round(0.1 + 0.2, 2)).toBe(0.3);
    expect(round(1.005, 2)).toBe(1.01);
  });

  it('rounds to the requested decimals', () => {
    expect(round(6.2456, 1)).toBe(6.2);
    expect(round(6.25, 0)).toBe(6);
  });
});

describe('fmt', () => {
  it('formats with fixed decimals and no unit', () => {
    expect(fmt(6.2456, 1)).toBe('6.2');
  });

  it('appends a unit when given', () => {
    expect(fmt(6.2, 1, 'kt')).toBe('6.2 kt');
  });

  it('pads trailing zeros to the requested precision', () => {
    expect(fmt(6, 2)).toBe('6.00');
  });
});

describe('snap', () => {
  it('snaps to the nearest step', () => {
    expect(snap(6.3, 0, 10, 0.5)).toBe(6.5);
    expect(snap(6.2, 0, 10, 0.5)).toBe(6);
  });

  it('clamps to the range first', () => {
    expect(snap(-5, 0, 10, 1)).toBe(0);
    expect(snap(15, 0, 10, 1)).toBe(10);
  });

  it('handles a fractional step without float artefacts', () => {
    expect(snap(0.3, 0, 1, 0.1)).toBe(0.3);
  });
});
