import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DockControls, Forecast } from '../../core/types';

const KEY = 'sailflow.rigLock.v1';

const SETUP: DockControls = { upperTurns: 2, lowerTurns: 1, forestayMm: 16 };
const FORECAST: Forecast = { minKt: 8, likelyKt: 12, maxKt: 16, seaState: 1, crewKg: 300 };

function mockLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  return store;
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('isToday', () => {
  it('is true for a stamp from the same calendar day', async () => {
    mockLocalStorage();
    const { isToday } = await import('./rigLock.svelte');
    const now = new Date('2026-08-25T09:12:00');
    expect(isToday(new Date('2026-08-25T23:59:00').toISOString(), now)).toBe(true);
    expect(isToday(new Date('2026-08-24T23:59:00').toISOString(), now)).toBe(false);
  });

  it('is false for an unparseable stamp', async () => {
    mockLocalStorage();
    const { isToday } = await import('./rigLock.svelte');
    expect(isToday('not a date')).toBe(false);
  });
});

describe('rigLock store', () => {
  it('starts unlocked with no stored value', async () => {
    mockLocalStorage();
    const { rigLock } = await import('./rigLock.svelte');
    expect(rigLock.locked).toBeNull();
    expect(rigLock.lockedToday).toBe(false);
  });

  it('persists a commit to localStorage', async () => {
    const store = mockLocalStorage();
    const { rigLock } = await import('./rigLock.svelte');
    const lock = rigLock.commit(SETUP, FORECAST);
    expect(rigLock.locked).toEqual(lock);
    expect(rigLock.lockedToday).toBe(true);
    expect(JSON.parse(store.get(KEY) ?? 'null')).toEqual(lock);
  });

  it('rehydrates a stored lock on load', async () => {
    const committedAt = new Date().toISOString();
    mockLocalStorage({ [KEY]: JSON.stringify({ setup: SETUP, forecast: FORECAST, committedAt }) });
    const { rigLock } = await import('./rigLock.svelte');
    expect(rigLock.locked?.setup).toEqual(SETUP);
    expect(rigLock.lockedToday).toBe(true);
  });

  it('rehydrates yesterday-s lock but does not count it as today', async () => {
    const yesterday = new Date(Date.now() - 24 * 3600_000).toISOString();
    mockLocalStorage({
      [KEY]: JSON.stringify({ setup: SETUP, forecast: FORECAST, committedAt: yesterday }),
    });
    const { rigLock } = await import('./rigLock.svelte');
    expect(rigLock.locked).not.toBeNull();
    expect(rigLock.lockedToday).toBe(false);
  });

  it('ignores garbage and half-written values', async () => {
    mockLocalStorage({ [KEY]: '{not json' });
    const { rigLock } = await import('./rigLock.svelte');
    expect(rigLock.locked).toBeNull();

    vi.resetModules();
    mockLocalStorage({ [KEY]: JSON.stringify({ committedAt: new Date().toISOString() }) });
    const again = await import('./rigLock.svelte');
    expect(again.rigLock.locked).toBeNull();
  });

  it('clears storage on unlock and records the reason', async () => {
    const store = mockLocalStorage();
    const { rigLock } = await import('./rigLock.svelte');
    rigLock.commit(SETUP, FORECAST);
    rigLock.unlock('re-tuned at the dock');
    expect(rigLock.locked).toBeNull();
    expect(rigLock.lastUnlockReason).toBe('re-tuned at the dock');
    expect(store.has(KEY)).toBe(false);
  });

  it('does not throw when localStorage is blocked', async () => {
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
    const { rigLock } = await import('./rigLock.svelte');
    expect(rigLock.locked).toBeNull();
    expect(() => rigLock.commit(SETUP, FORECAST)).not.toThrow();
    expect(rigLock.lockedToday).toBe(true);
  });
});
