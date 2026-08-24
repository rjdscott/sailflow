import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LogEntry } from './logStore';

function mockLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  return store;
}

function makeEntry(id: string): LogEntry {
  return {
    id,
    v: 1,
    date: '2026-08-25',
    venue: 'Sandringham',
    forecast: { minKt: 8, likelyKt: 12, maxKt: 16 },
    actual: { minKt: 9, maxKt: 14 },
    seaState: 1,
    crewKg: 260,
    dock: { upperTurns: 6, lowerTurns: 4, forestayMm: 0 },
    notes: 'flat water, good pace upwind',
    fast: 'more lower tension in the puffs',
    createdAt: '2026-08-25T10:00:00.000Z',
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('localStorageLogStore', () => {
  it('starts empty with nothing stored', async () => {
    mockLocalStorage();
    const { localStorageLogStore } = await import('./logStore');
    const store = localStorageLogStore();
    expect(await store.list()).toEqual([]);
  });

  it('round-trips put -> list', async () => {
    mockLocalStorage();
    const { localStorageLogStore } = await import('./logStore');
    const store = localStorageLogStore();
    const entry = makeEntry('a');
    await store.put(entry);
    expect(await store.list()).toEqual([entry]);
  });

  it('put with an existing id replaces rather than duplicates', async () => {
    mockLocalStorage();
    const { localStorageLogStore } = await import('./logStore');
    const store = localStorageLogStore();
    await store.put(makeEntry('a'));
    const updated = { ...makeEntry('a'), venue: 'Different club' };
    await store.put(updated);
    const list = await store.list();
    expect(list).toHaveLength(1);
    expect(list[0].venue).toBe('Different club');
  });

  it('persists across a fresh store instance on the same key', async () => {
    const raw = mockLocalStorage();
    const { localStorageLogStore } = await import('./logStore');
    await localStorageLogStore().put(makeEntry('a'));
    expect(raw.get('sailflow.log.v1')).toBeDefined();
    expect(await localStorageLogStore().list()).toHaveLength(1);
  });

  it('remove deletes only the matching entry', async () => {
    mockLocalStorage();
    const { localStorageLogStore } = await import('./logStore');
    const store = localStorageLogStore();
    await store.put(makeEntry('a'));
    await store.put(makeEntry('b'));
    await store.remove('a');
    const list = await store.list();
    expect(list.map((e) => e.id)).toEqual(['b']);
  });

  it('clear empties the store', async () => {
    mockLocalStorage();
    const { localStorageLogStore } = await import('./logStore');
    const store = localStorageLogStore();
    await store.put(makeEntry('a'));
    await store.clear();
    expect(await store.list()).toEqual([]);
  });

  it('tolerates corrupt JSON, returning empty and warning', async () => {
    mockLocalStorage({ 'sailflow.log.v1': '{not json' });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { localStorageLogStore } = await import('./logStore');
    const store = localStorageLogStore();
    expect(await store.list()).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('tolerates a stored non-array value, returning empty and warning', async () => {
    mockLocalStorage({ 'sailflow.log.v1': JSON.stringify({ oops: true }) });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { localStorageLogStore } = await import('./logStore');
    const store = localStorageLogStore();
    expect(await store.list()).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not throw when localStorage access throws (private mode etc.)', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    const { localStorageLogStore } = await import('./logStore');
    const store = localStorageLogStore();
    await expect(store.list()).resolves.toEqual([]);
    await expect(store.put(makeEntry('a'))).resolves.toBeUndefined();
  });

  it('respects a custom key', async () => {
    const raw = mockLocalStorage();
    const { localStorageLogStore } = await import('./logStore');
    await localStorageLogStore('other.key').put(makeEntry('a'));
    expect(raw.has('other.key')).toBe(true);
    expect(raw.has('sailflow.log.v1')).toBe(false);
  });
});

describe('nextId', () => {
  it('produces a non-empty, unique id on consecutive calls', async () => {
    const { nextId } = await import('./logStore');
    const a = nextId();
    const b = nextId();
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a).not.toBe(b);
  });
});
