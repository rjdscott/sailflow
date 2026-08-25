/**
 * Seeded PRNG for drill generation.
 *
 * Lives in `src/lib`, never `src/core`: the physics core is deterministic by
 * contract and may not call `Math.random` at all. A drill is generated in the
 * UI layer from an explicit integer seed, so the same seed always yields the
 * same drill — which is what makes a "drill of the day" reproducible without a
 * server, and what makes the generator testable.
 *
 * ponytail: mulberry32 — 32 bits of state, one multiply-xor round, good enough
 * for picking a wind speed and a few slider offsets. Upgrade path if anything
 * ever needs statistical quality: swap in xoshiro128** behind the same
 * `() => number` signature.
 */

/** Deterministic 32-bit string hash (FNV-1a). Used to seed from an id/date. */
export function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Uniform [0, 1) generator from a 32-bit seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Inclusive integer in [min, max]. */
export function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Uniform pick from a non-empty array. */
export function pick<T>(rng: () => number, xs: readonly T[]): T {
  return xs[Math.floor(rng() * xs.length)];
}
