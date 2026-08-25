import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DockControls, DockScore } from '../../core/types';
import type { Request, ResultOf } from '../../worker/protocol';
import type { Client } from './client';
import { COMMIT_ARM_MS, DockStore, SCORE_DEBOUNCE_MS } from './store.svelte';
import { candidateSetups } from './logic';
import { rigLock } from '../stores/rigLock.svelte';

function makeScore(setup: DockControls, expected: number): DockScore {
  const r = { twsKt: 10, regretSPerMile: expected, optimum: setup };
  return {
    setup,
    expectedRegretSPerMile: { value: expected, tier: 'B' as const },
    atMin: r,
    atMax: r,
    worst: r,
    perTws: [r],
  };
}

/** Records every request and lets the test resolve them out of order. */
function fakeClient() {
  const calls: { setups: DockControls[] }[] = [];
  const pending: ((scores: DockScore[]) => void)[] = [];
  const client: Client = {
    request<R extends Request>(req: Omit<R, 'id' | 'protocolVersion'>): Promise<ResultOf<R>> {
      calls.push({ setups: (req as unknown as { setups: DockControls[] }).setups });
      return new Promise((resolve) => {
        pending.push(resolve as (s: DockScore[]) => void);
      }) as Promise<ResultOf<R>>;
    },
  };
  return { client, calls, pending };
}

/** Drain the microtask queue; the store's awaits resolve without any timer. */
async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

beforeEach(() => {
  vi.useFakeTimers();
  // The lock is a module singleton; every test starts from an unlocked rig.
  rigLock.unlock('test reset');
});
afterEach(() => vi.useRealTimers());

describe('DockStore.rescore', () => {
  it('sends nothing before the debounce window closes', () => {
    const { client, calls } = fakeClient();
    const dock = new DockStore(client);
    dock.rescore();
    vi.advanceTimersByTime(SCORE_DEBOUNCE_MS - 1);
    expect(calls).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(calls).toHaveLength(1);
  });

  it('collapses a burst of changes into one request with the final setup', () => {
    const { client, calls } = fakeClient();
    const dock = new DockStore(client);
    for (const t of [1, 2, 3]) {
      dock.setup.upperTurns = t;
      dock.rescore();
      vi.advanceTimersByTime(100);
    }
    expect(calls).toHaveLength(0);
    vi.advanceTimersByTime(SCORE_DEBOUNCE_MS);
    expect(calls).toHaveLength(1);
    expect(calls[0].setups).toEqual([{ upperTurns: 3, lowerTurns: 0, forestayMm: 0 }]);
  });

  it('sends a plain object, not a state proxy', () => {
    const { client, calls } = fakeClient();
    const dock = new DockStore(client);
    dock.rescore();
    vi.advanceTimersByTime(SCORE_DEBOUNCE_MS);
    expect(() => structuredClone(calls[0].setups)).not.toThrow();
  });

  it('drops a stale response and keeps the newest one', async () => {
    const { client, calls, pending } = fakeClient();
    const dock = new DockStore(client);
    const first = [makeScore({ upperTurns: 1, lowerTurns: 0, forestayMm: 0 }, 9)];
    const second = [makeScore({ upperTurns: 2, lowerTurns: 0, forestayMm: 0 }, 3)];

    dock.rescore();
    vi.advanceTimersByTime(SCORE_DEBOUNCE_MS);
    dock.rescore();
    vi.advanceTimersByTime(SCORE_DEBOUNCE_MS);
    expect(calls).toHaveLength(2);

    // The newest lands first, then the stale one arrives late.
    pending[1](second);
    await flush();
    expect(dock.score?.expectedRegretSPerMile.value).toBe(3);
    pending[0](first);
    await flush();
    expect(dock.score?.expectedRegretSPerMile.value).toBe(3);
    expect(dock.busy).toBe(false);
  });

  it('surfaces a solver failure without wedging busy', async () => {
    const client: Client = {
      request: <R extends Request>(): Promise<ResultOf<R>> =>
        Promise.reject(new Error('solver exploded')),
    };
    const dock = new DockStore(client);
    dock.rescore();
    vi.advanceTimersByTime(SCORE_DEBOUNCE_MS);
    await flush();
    expect(dock.error).toBe('solver exploded');
    expect(dock.busy).toBe(false);
  });
});

describe('DockStore.suggest', () => {
  it('sends the candidate grid in one batch and keeps the lowest regret', async () => {
    const { client, calls, pending } = fakeClient();
    const dock = new DockStore(client);
    const promise = dock.suggest();
    expect(calls).toHaveLength(1);
    expect(calls[0].setups).toHaveLength(candidateSetups().length);

    pending[0](calls[0].setups.map((s, i) => makeScore(s, i === 4 ? 1 : 10 + i)));
    await promise;
    expect(dock.suggestion?.best.setup).toEqual(calls[0].setups[4]);
    expect(dock.suggestion?.tied).toHaveLength(1);
    expect(dock.searching).toBe(false);
  });

  it('a rescore during a search neither shows Searching… nor drops the result', async () => {
    const { client, calls, pending } = fakeClient();
    const dock = new DockStore(client);
    const search = dock.suggest();
    expect(dock.searching).toBe(true);
    expect(dock.busy).toBe(false);
    dock.rescore();
    vi.advanceTimersByTime(1000);
    expect(calls).toHaveLength(2);
    expect(dock.busy).toBe(true);
    expect(dock.searching).toBe(true);
    pending[1]([makeScore(calls[1].setups[0], 2)]);
    pending[0](calls[0].setups.map((s, i) => makeScore(s, i === 4 ? 1 : 10 + i)));
    await search;
    expect(dock.suggestion?.best.setup).toEqual(calls[0].setups[4]);
    expect(dock.searching).toBe(false);
  });

  it('applying a suggestion updates the setup and re-scores it', () => {
    const { client, calls } = fakeClient();
    const dock = new DockStore(client);
    dock.apply({ upperTurns: 4, lowerTurns: 2, forestayMm: 16 });
    expect(dock.setup).toEqual({ upperTurns: 4, lowerTurns: 2, forestayMm: 16 });
    expect(dock.needsUnlock).toBe(false);
    vi.advanceTimersByTime(SCORE_DEBOUNCE_MS);
    expect(calls[0].setups).toEqual([{ upperTurns: 4, lowerTurns: 2, forestayMm: 16 }]);
  });

  it('refuses to move the rig while it is locked for today (M-07)', () => {
    const { client, calls } = fakeClient();
    const dock = new DockStore(client);
    dock.commit();
    const committed = { ...dock.setup };

    dock.apply({ upperTurns: 4, lowerTurns: 2, forestayMm: 16 });

    expect(dock.setup).toEqual(committed);
    expect(dock.needsUnlock).toBe(true);
    vi.advanceTimersByTime(SCORE_DEBOUNCE_MS);
    expect(calls).toHaveLength(0);

    // Unlocking clears the refusal on the next apply.
    rigLock.unlock('test');
    dock.apply({ upperTurns: 4, lowerTurns: 2, forestayMm: 16 });
    expect(dock.needsUnlock).toBe(false);
    expect(dock.setup.upperTurns).toBe(4);
  });
});

describe('DockStore commit arming', () => {
  it('arms on the first tap and disarms itself after the window', () => {
    const dock = new DockStore(fakeClient().client);
    expect(dock.armed).toBe(false);

    dock.arm();
    expect(dock.armed).toBe(true);
    vi.advanceTimersByTime(COMMIT_ARM_MS - 1);
    expect(dock.armed).toBe(true);
    vi.advanceTimersByTime(1);
    expect(dock.armed).toBe(false);
  });

  it('a second arm restarts the window rather than shortening it', () => {
    const dock = new DockStore(fakeClient().client);
    dock.arm();
    vi.advanceTimersByTime(COMMIT_ARM_MS - 1);
    dock.arm();
    vi.advanceTimersByTime(COMMIT_ARM_MS - 1);
    expect(dock.armed).toBe(true);
  });

  it('committing disarms, so the expiry cannot fire on a fresh arming', () => {
    const dock = new DockStore(fakeClient().client);
    dock.arm();
    dock.commit();
    expect(dock.armed).toBe(false);

    dock.arm();
    vi.advanceTimersByTime(COMMIT_ARM_MS - 1);
    expect(dock.armed).toBe(true);
  });

  it('disarm cancels an arming outright', () => {
    const dock = new DockStore(fakeClient().client);
    dock.arm();
    dock.disarm();
    expect(dock.armed).toBe(false);
    vi.advanceTimersByTime(COMMIT_ARM_MS);
    expect(dock.armed).toBe(false);
  });
});

describe('DockStore.commit', () => {
  it('locks the rig and notifies subscribers until they unsubscribe', () => {
    const { client } = fakeClient();
    const dock = new DockStore(client);
    const seen: string[] = [];
    const off = dock.onCommit((lock) => seen.push(lock.committedAt));

    dock.setup.upperTurns = 2;
    const lock = dock.commit();
    expect(seen).toEqual([lock.committedAt]);
    expect(dock.committed?.setup.upperTurns).toBe(2);
    expect(() => structuredClone(lock.setup)).not.toThrow();

    off();
    dock.commit();
    expect(seen).toHaveLength(1);
  });
});
