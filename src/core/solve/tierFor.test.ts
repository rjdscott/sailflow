import { describe, expect, it } from 'vitest';
import { shapeInfluence, tierFor, tiered } from './tierFor';

const zero = { dCLmax: 0, dCD0: 0, dCEh: 0, dTwistDeg: 0 };

describe('tierFor', () => {
  it('gives A to upwind jib speed and VMG inside the polar range', () => {
    expect(tierFor('bs', { sailset: 'jib', twsKt: 10 })).toBe('A');
    expect(tierFor('vmg', { sailset: 'jib', twsKt: 10 })).toBe('A');
  });
  it('gives B to heel and leeway under jib, and to asym speed', () => {
    expect(tierFor('heel', { sailset: 'jib', twsKt: 10 })).toBe('B');
    expect(tierFor('bs', { sailset: 'asym', twsKt: 10 })).toBe('B');
    expect(tierFor('heel', { sailset: 'asym', twsKt: 10 })).toBe('C');
  });
  it('demotes outside the polar TWS range', () => {
    expect(tierFor('bs', { sailset: 'jib', twsKt: 24 })).toBe('B');
    expect(tierFor('bs', { sailset: 'jib', twsKt: 4 })).toBe('B');
    expect(tierFor('heel', { sailset: 'jib', twsKt: 24 })).toBe('C');
  });
  it('demotes when the shape layer dominates', () => {
    expect(tierFor('bs', { sailset: 'jib', twsKt: 10, deltas: zero })).toBe('A');
    expect(tierFor('bs', { sailset: 'jib', twsKt: 10, deltas: { ...zero, dCLmax: -0.2 } })).toBe(
      'B',
    );
  });
  it('never goes below C', () => {
    expect(tierFor('heel', { sailset: 'asym', twsKt: 25, deltas: { ...zero, dCLmax: 1 } })).toBe(
      'C',
    );
  });
  it('dock regret is A under jib, C above the polar', () => {
    expect(tierFor('dockRegret', { sailset: 'jib', twsKt: 12 })).toBe('A');
    expect(tierFor('dockRegret', { sailset: 'jib', twsKt: 22 })).toBe('C');
  });
});

describe('tiered', () => {
  it('A carries only a value', () => {
    expect(tiered(6.2, 'A')).toEqual({ value: 6.2, tier: 'A' });
  });
  it('B carries a symmetric band', () => {
    const t = tiered(20, 'B', 0.1);
    expect(t.band).toEqual([18, 22]);
  });
  it('C carries a sign', () => {
    expect(tiered(-0.3, 'C').sign).toBe(-1);
    expect(tiered(0, 'C').sign).toBe(0);
  });
});

describe('shapeInfluence', () => {
  it('is zero for zero deltas and grows with any delta', () => {
    expect(shapeInfluence(zero)).toBe(0);
    expect(shapeInfluence({ ...zero, dTwistDeg: 4 })).toBeGreaterThan(0);
  });
});
