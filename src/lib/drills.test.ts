import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BEST_KEY,
  DRILLS,
  RACE_KEYS,
  coachLine,
  medalFor,
  perControlDelta,
  scoreDrill,
} from './drills';
import type { RaceControls } from '../core/types';
import j70 from '../../data/boats/j70.json';

const CONTROLS = j70.controls as Record<string, { min: number; max: number; step: number }>;

function mockLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  return store;
}

describe('scoreDrill', () => {
  const opt = { vmgKt: 5 };

  it('bands loss into gold / silver / bronze / none at the documented edges', () => {
    // 1 %, 3 %, 6 % are inclusive upper bounds.
    expect(scoreDrill({ vmgKt: 4.95 }, opt, true).medal).toBe('gold'); // 1.0 %
    expect(scoreDrill({ vmgKt: 4.9499 }, opt, true).medal).toBe('silver');
    expect(scoreDrill({ vmgKt: 4.85 }, opt, true).medal).toBe('silver'); // 3.0 %
    expect(scoreDrill({ vmgKt: 4.8499 }, opt, true).medal).toBe('bronze');
    expect(scoreDrill({ vmgKt: 4.7 }, opt, true).medal).toBe('bronze'); // 6.0 %
    expect(scoreDrill({ vmgKt: 4.6999 }, opt, true).medal).toBe('none');
  });

  it('reports the loss percent itself', () => {
    expect(scoreDrill({ vmgKt: 4.75 }, opt, true).lossPct).toBeCloseTo(5, 10);
  });

  it('clamps loss at 0 and awards gold when the user beats the optimum', () => {
    const s = scoreDrill({ vmgKt: 5.4 }, opt, true);
    expect(s.lossPct).toBe(0);
    expect(s.medal).toBe('gold');
  });

  it('uses magnitude downwind, where both VMGs are negative', () => {
    const s = scoreDrill({ vmgKt: -4.9 }, { vmgKt: -5 }, false);
    expect(s.lossPct).toBeCloseTo(2, 10);
    expect(s.medal).toBe('silver');
  });

  it('gives no medal for VMG on the wrong side of zero for the leg', () => {
    expect(scoreDrill({ vmgKt: -4.9 }, opt, true)).toEqual({ lossPct: 100, medal: 'none' });
    expect(scoreDrill({ vmgKt: 4.9 }, { vmgKt: -5 }, false)).toEqual({
      lossPct: 100,
      medal: 'none',
    });
  });

  it('clamps a catastrophic loss at 100 %', () => {
    expect(scoreDrill({ vmgKt: 0.0001 }, opt, true).lossPct).toBeLessThanOrEqual(100);
    expect(medalFor(100)).toBe('none');
  });
});

describe('perControlDelta', () => {
  const base: RaceControls = {
    backstay: 40,
    mainsheet: 50,
    traveller: 0,
    cunningham: 0,
    outhaul: 50,
    vang: 0,
    jibSheet: 50,
    jibLead: 5,
    inhauler: 0,
    mainHalyard: 50,
    jibHalyard: 50,
  };

  it('rounds each delta into whole control steps, signed toward the optimum', () => {
    const opt = { ...base, backstay: 30, jibLead: 7 };
    const out = perControlDelta(base, opt, ['backstay', 'jibLead']);
    // backstay step is 5 %, jibLead step is 1 hole.
    expect(out.map((d) => [d.key, d.steps])).toEqual([
      ['backstay', -2],
      ['jibLead', 2],
    ]);
  });

  it('sorts by absolute step count, largest first, and only over free controls', () => {
    const opt = { ...base, backstay: 45, mainsheet: 75, vang: 0, outhaul: 20 };
    const out = perControlDelta(base, opt, ['backstay', 'mainsheet', 'vang']);
    expect(out.map((d) => d.key)).toEqual(['mainsheet', 'backstay', 'vang']);
    expect(out.map((d) => d.steps)).toEqual([5, 1, 0]);
    // `outhaul` is locked in this drill, so it never appears.
    expect(out.some((d) => d.key === 'outhaul')).toBe(false);
  });

  it('rounds a sub-step delta to zero rather than reporting a fractional click', () => {
    const [d] = perControlDelta(base, { ...base, backstay: 42 }, ['backstay']);
    expect(d.delta).toBe(2);
    expect(d.steps).toBe(0);
  });

  it('phrases the largest delta as one imperative coach line', () => {
    const out = perControlDelta(base, { ...base, mainsheet: 25, backstay: 45 }, [
      'mainsheet',
      'backstay',
    ]);
    expect(coachLine(out)).toBe('Less mainsheet: 5 clicks.');
    expect(coachLine(perControlDelta(base, { ...base, jibLead: 6 }, ['jibLead']))).toBe(
      'More jib lead car position: 1 click.',
    );
    expect(coachLine(perControlDelta(base, base, ['backstay']))).toMatch(/optimum/);
    expect(coachLine([])).toMatch(/VMG alone/);
  });
});

describe('best scores', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('round-trips through localStorage under the versioned key', async () => {
    const store = mockLocalStorage();
    const { loadBest, saveBest } = await import('./drills');
    expect(loadBest()).toEqual({});
    saveBest('t1-flat-06-backstay', 2.5);
    expect(JSON.parse(store.get(BEST_KEY)!)).toEqual({ 't1-flat-06-backstay': 2.5 });
    expect(loadBest()).toEqual({ 't1-flat-06-backstay': 2.5 });
  });

  it('keeps the lowest loss and ignores a worse attempt', async () => {
    mockLocalStorage();
    const { loadBest, saveBest } = await import('./drills');
    saveBest('d', 4);
    saveBest('d', 9);
    expect(loadBest()).toEqual({ d: 4 });
    saveBest('d', 1.2);
    expect(loadBest()).toEqual({ d: 1.2 });
  });

  it('survives corrupt stored JSON and non-numeric entries', async () => {
    mockLocalStorage({ [BEST_KEY]: '{not json' });
    const { loadBest } = await import('./drills');
    expect(loadBest()).toEqual({});

    mockLocalStorage({ [BEST_KEY]: '{"a": 3, "b": "nope", "c": null}' });
    const again = await import('./drills');
    expect(again.loadBest()).toEqual({ a: 3 });
  });

  it('does not throw when localStorage is unavailable', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    const { loadBest, saveBest } = await import('./drills');
    expect(loadBest()).toEqual({});
    expect(() => saveBest('d', 1)).not.toThrow();
  });
});

describe('the committed J/70 drill set', () => {
  it('has ten drills with unique ids', () => {
    expect(DRILLS).toHaveLength(10);
    expect(new Set(DRILLS.map((d) => d.id)).size).toBe(10);
  });

  it('covers all three tiers and includes exactly one C-tier downwind drill', () => {
    expect(new Set(DRILLS.map((d) => d.tier))).toEqual(new Set([1, 2, 3]));
    const asym = DRILLS.filter((d) => d.condition.sailset === 'asym');
    expect(asym).toHaveLength(1);
    expect(asym[0].cTier).toBe(true);
    expect(asym[0].tier).toBe(3);
    expect(asym[0].down).toBeDefined();
    expect(asym[0].freeDown?.length).toBeGreaterThan(0);
  });

  it('names only real RaceControls keys as free, and never an empty upwind drill', () => {
    for (const d of DRILLS) {
      for (const key of d.free) expect(RACE_KEYS).toContain(key);
      expect(new Set(d.free).size).toBe(d.free.length);
      if (d.condition.sailset === 'jib') expect(d.free.length).toBeGreaterThan(0);
    }
  });

  it('starts every control inside the boat definition range and on a step', () => {
    for (const d of DRILLS) {
      const all = { ...d.start, ...d.dock, ...(d.down ?? {}) } as Record<string, number>;
      for (const [key, value] of Object.entries(all)) {
        const spec = CONTROLS[key];
        expect(spec, `${d.id}: unknown control ${key}`).toBeDefined();
        expect(value, `${d.id}.${key}`).toBeGreaterThanOrEqual(spec.min);
        expect(value, `${d.id}.${key}`).toBeLessThanOrEqual(spec.max);
        expect(
          Math.abs(Math.round((value - spec.min) / spec.step) * spec.step + spec.min - value),
          `${d.id}.${key} off step`,
        ).toBeLessThan(1e-9);
      }
    }
  });

  it('poses every drill in the 6–20 kt band the model is fitted over', () => {
    for (const d of DRILLS) {
      expect(d.condition.twsKt, d.id).toBeGreaterThanOrEqual(6);
      expect(d.condition.twsKt, d.id).toBeLessThanOrEqual(20);
    }
  });

  it('gives every drill a brief and a hint', () => {
    for (const d of DRILLS) {
      expect(d.brief.length, d.id).toBeGreaterThan(40);
      expect(d.hint.length, d.id).toBeGreaterThan(20);
    }
  });
});
