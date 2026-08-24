import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearDivergences,
  divergenceSummary,
  listDivergences,
  logDivergence,
  type DivergenceRow,
} from './divergenceLog';

function mockLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  return store;
}

function row(over: Partial<DivergenceRow> = {}): DivergenceRow {
  return {
    at: '2026-08-25T10:00:00.000Z',
    twsKt: 12,
    seaState: 2,
    crewKg: 300,
    model: { uppersTurns: 6, lowersTurns: 3, bsKt: 6.2, twaDeg: 42 },
    guide: 'north',
    guideTurns: { uppers: 4, lowers: 2 },
    delta: { uppers: 2, lowers: 1 },
    ...over,
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  mockLocalStorage();
});

describe('logDivergence', () => {
  it('appends a divergence of a full turn or more', () => {
    expect(logDivergence(row())).toBe(true);
    expect(listDivergences()).toHaveLength(1);
  });

  it('ignores agreement within half a turn on both shrouds', () => {
    expect(logDivergence(row({ delta: { uppers: 0.5, lowers: -0.5 } }))).toBe(false);
    expect(listDivergences()).toHaveLength(0);
  });

  it('logs when only one shroud diverges', () => {
    expect(logDivergence(row({ delta: { uppers: 0, lowers: -1 } }))).toBe(true);
  });

  it('dedupes an identical repeat for the same guide and wind speed', () => {
    expect(logDivergence(row())).toBe(true);
    expect(logDivergence(row({ at: '2026-08-25T10:00:05.000Z' }))).toBe(false);
    expect(listDivergences()).toHaveLength(1);
  });

  it('logs the same wind speed again once the delta moves', () => {
    logDivergence(row());
    expect(logDivergence(row({ delta: { uppers: 3, lowers: 1 } }))).toBe(true);
    expect(listDivergences()).toHaveLength(2);
  });

  it('keeps rows for other wind speeds and other guides separate', () => {
    logDivergence(row());
    expect(logDivergence(row({ twsKt: 14 }))).toBe(true);
    expect(logDivergence(row({ guide: 'quantum' }))).toBe(true);
    expect(listDivergences()).toHaveLength(3);
  });

  it('caps the history at 500 rows, keeping the newest', () => {
    for (let i = 0; i < 520; i++) logDivergence(row({ twsKt: i, at: `t${i}` }));
    const rows = listDivergences();
    expect(rows).toHaveLength(500);
    expect(rows[0].twsKt).toBe(20);
    expect(rows[499].twsKt).toBe(519);
  });

  it('survives unreadable or corrupt storage', () => {
    mockLocalStorage({ 'sailflow.divergence.v1': 'not json' });
    expect(listDivergences()).toEqual([]);
    expect(logDivergence(row())).toBe(true);

    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    });
    expect(() => logDivergence(row())).not.toThrow();
    expect(listDivergences()).toEqual([]);
    expect(() => clearDivergences()).not.toThrow();
  });
});

describe('clearDivergences', () => {
  it('empties the history', () => {
    logDivergence(row());
    clearDivergences();
    expect(listDivergences()).toEqual([]);
  });
});

describe('divergenceSummary', () => {
  it('reports mean signed delta and count per guide', () => {
    logDivergence(row({ twsKt: 10, delta: { uppers: 2, lowers: 1 } }));
    logDivergence(row({ twsKt: 12, delta: { uppers: 4, lowers: 3 } }));
    logDivergence(row({ twsKt: 14, guide: 'quantum', delta: { uppers: -1, lowers: -1 } }));

    const s = divergenceSummary();
    expect(s.north?.count).toBe(2);
    expect(s.north?.meanUppers).toBeCloseTo(3, 10);
    expect(s.north?.meanLowers).toBeCloseTo(2, 10);
    expect(s.quantum?.count).toBe(1);
    expect(s.quantum?.meanUppers).toBeCloseTo(-1, 10);
  });

  it('is empty with no history', () => {
    expect(divergenceSummary()).toEqual({});
  });
});
