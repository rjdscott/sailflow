import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DrillAttempt } from './drillHistory';

let dbNameCounter = 0;
/** A fresh db name per test keeps fake-indexeddb state from leaking. */
function uniqueDbName(): string {
  dbNameCounter += 1;
  return `sailflow-drills-test-${dbNameCounter}`;
}

function mockLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  return store;
}

function makeAttempt(
  id: string,
  templateId = 't1',
  over: Partial<DrillAttempt> = {},
): DrillAttempt {
  return {
    id,
    templateId,
    seed: 3,
    at: '2026-08-25T10:00:00.000Z',
    distanceSteps: 4,
    lossPct: 2.5,
    medal: 'bronze',
    hintUsed: false,
    ms: 42000,
    ...over,
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('localStorageDrillHistory', () => {
  it('round-trips add -> list under the v2 key', async () => {
    const store = mockLocalStorage();
    const { localStorageDrillHistory } = await import('./drillHistory');
    const h = localStorageDrillHistory();
    expect(await h.list()).toEqual([]);
    const a = makeAttempt('a');
    await h.add(a);
    expect(await h.list()).toEqual([a]);
    expect(JSON.parse(store.get('sailflow.drills.v2')!)).toEqual([a]);
  });

  it('keeps every attempt rather than only the best', async () => {
    mockLocalStorage();
    const { localStorageDrillHistory } = await import('./drillHistory');
    const h = localStorageDrillHistory();
    await h.add(makeAttempt('a', 't1', { lossPct: 8 }));
    await h.add(makeAttempt('b', 't1', { lossPct: 1 }));
    await h.add(makeAttempt('c', 't1', { lossPct: 9 }));
    expect(await h.list()).toHaveLength(3);
    await h.clear();
    expect(await h.list()).toEqual([]);
  });

  it('survives corrupt stored JSON', async () => {
    mockLocalStorage({ 'sailflow.drills.v2': '{not json' });
    const { localStorageDrillHistory } = await import('./drillHistory');
    expect(await localStorageDrillHistory().list()).toEqual([]);
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
    const { localStorageDrillHistory } = await import('./drillHistory');
    const h = localStorageDrillHistory();
    expect(await h.list()).toEqual([]);
    await expect(h.add(makeAttempt('a'))).resolves.toBeUndefined();
  });
});

describe('v1 best-score migration', () => {
  const V1 = '{"t1-20-survival": 2.5, "t2-10-slot": 7.2, "bad": "nope"}';

  it('turns each v1 best into one attempt, with distance unknown', async () => {
    mockLocalStorage({ 'sailflow.drills.v1': V1 });
    const { localStorageDrillHistory } = await import('./drillHistory');
    const h = localStorageDrillHistory('sailflow.drills.v2', () => '2026-08-25T00:00:00.000Z');
    const list = await h.list();
    expect(list.map((a) => a.templateId).sort()).toEqual(['t1-20-survival', 't2-10-slot']);
    const survival = list.find((a) => a.templateId === 't1-20-survival')!;
    expect(survival).toMatchObject({
      id: 'v1:t1-20-survival',
      seed: 0,
      lossPct: 2.5,
      medal: 'silver', // from the v1 loss bands
      distanceSteps: null, // v1 never measured it
      hintUsed: false,
      at: '2026-08-25T00:00:00.000Z',
    });
    expect(list.find((a) => a.templateId === 't2-10-slot')!.medal).toBe('none');
  });

  it('runs once: a second open does not re-copy or duplicate', async () => {
    const store = mockLocalStorage({ 'sailflow.drills.v1': V1 });
    const { localStorageDrillHistory } = await import('./drillHistory');
    const first = localStorageDrillHistory('sailflow.drills.v2', () => '2026-08-25T00:00:00.000Z');
    await first.list();
    expect(store.get('sailflow.drills.v1.migrated')).toBe('1');
    const second = localStorageDrillHistory('sailflow.drills.v2', () => '2026-08-26T00:00:00.000Z');
    const list = await second.list();
    expect(list).toHaveLength(2);
    // v1 is left in place, per the migration contract.
    expect(store.get('sailflow.drills.v1')).toBe(V1);
  });

  it('ignores a v1 blob that is not a map of numbers', async () => {
    mockLocalStorage({ 'sailflow.drills.v1': '["not", "a", "map"]' });
    const { localStorageDrillHistory } = await import('./drillHistory');
    expect(await localStorageDrillHistory().list()).toEqual([]);
  });

  it('migrates into IndexedDB on first open too', async () => {
    mockLocalStorage({ 'sailflow.drills.v1': V1 });
    const { indexedDbDrillHistory } = await import('./drillHistory');
    const h = indexedDbDrillHistory(uniqueDbName(), () => '2026-08-25T00:00:00.000Z');
    const list = await h.list();
    expect(list.map((a) => a.id).sort()).toEqual(['v1:t1-20-survival', 'v1:t2-10-slot']);
  });
});

describe('indexedDbDrillHistory', () => {
  it('round-trips add -> list -> clear', async () => {
    mockLocalStorage();
    const { indexedDbDrillHistory } = await import('./drillHistory');
    const h = indexedDbDrillHistory(uniqueDbName());
    await h.add(makeAttempt('a'));
    await h.add(makeAttempt('b'));
    expect((await h.list()).map((x) => x.id).sort()).toEqual(['a', 'b']);
    await h.clear();
    expect(await h.list()).toEqual([]);
  });
});

describe('bestByTemplate', () => {
  it('rolls attempts up to count, lowest loss and distance, best medal, last date', async () => {
    const { bestByTemplate } = await import('./drillHistory');
    const out = bestByTemplate([
      makeAttempt('a', 't1', {
        lossPct: 8,
        distanceSteps: 9,
        medal: 'none',
        at: '2026-08-20T10:00:00.000Z',
      }),
      makeAttempt('b', 't1', {
        lossPct: 1,
        distanceSteps: 2,
        medal: 'silver',
        at: '2026-08-24T10:00:00.000Z',
      }),
      makeAttempt('c', 't2', { lossPct: 4, distanceSteps: 5, medal: 'bronze' }),
    ]);
    expect(out.t1).toEqual({
      attempts: 2,
      lossPct: 1,
      distanceSteps: 2,
      medal: 'silver',
      lastAt: '2026-08-24T10:00:00.000Z',
    });
    expect(out.t2.attempts).toBe(1);
  });

  it('keeps distance null only while every attempt is a migrated v1 best', async () => {
    const { bestByTemplate } = await import('./drillHistory');
    const v1 = makeAttempt('v1:t1', 't1', { distanceSteps: null, lossPct: 3 });
    expect(bestByTemplate([v1]).t1.distanceSteps).toBeNull();
    expect(
      bestByTemplate([v1, makeAttempt('b', 't1', { distanceSteps: 6 })]).t1.distanceSteps,
    ).toBe(6);
  });
});
