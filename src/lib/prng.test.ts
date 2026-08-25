import { describe, expect, it } from 'vitest';
import { hashSeed, mulberry32, pick, randInt } from './prng';

describe('prng', () => {
  it('is deterministic for a given seed and independent between seeds', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const c = mulberry32(43);
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect([c(), c(), c()]).not.toEqual(first);
  });

  it('stays inside [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 2000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is roughly uniform: the mean of 10k draws sits near a half', () => {
    const rng = mulberry32(1);
    let sum = 0;
    for (let i = 0; i < 10000; i++) sum += rng();
    expect(sum / 10000).toBeCloseTo(0.5, 1);
  });

  it('hashes strings deterministically to a 32-bit unsigned int', () => {
    expect(hashSeed('t1-20-survival')).toBe(hashSeed('t1-20-survival'));
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
    expect(hashSeed('')).toBeGreaterThanOrEqual(0);
    expect(hashSeed('2026-08-25')).toBeLessThan(2 ** 32);
  });

  it('randInt covers both ends of an inclusive range', () => {
    const rng = mulberry32(3);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(randInt(rng, 2, 5));
    expect([...seen].sort()).toEqual([2, 3, 4, 5]);
  });

  it('pick returns members of the array and can reach each one', () => {
    const rng = mulberry32(9);
    const xs = ['a', 'b', 'c'] as const;
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(pick(rng, xs));
    expect([...seen].sort()).toEqual(['a', 'b', 'c']);
  });
});
