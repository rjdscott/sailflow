import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Condition, ControlState, OptimalTrimResult, SolveResult } from '../../core/types';
import type { OptimalTrimRequest } from '../../worker/protocol';
import type { Client } from './client';
import { OPTIMUM_DEBOUNCE_MS, OPTIMUM_TIER, optimumKey, OptimumStore } from './optimum.svelte';
import { BASE_DOCK, BASE_DOWN } from './store.svelte';
import { BASE_RACE } from '../stores/conditions.svelte';

const CONDITION: Condition = { twsKt: 12, twaDeg: 42, seaState: 1, crewKg: 300, sailset: 'jib' };

function controls(over: Partial<ControlState> = {}): ControlState {
  return {
    dock: { ...BASE_DOCK },
    race: { ...BASE_RACE },
    down: { ...BASE_DOWN },
    ...over,
  };
}

function solve(bsKt: number): SolveResult {
  return {
    converged: true,
    iters: 8,
    bsKt: { value: bsKt, tier: 'A' },
    vmgKt: { value: bsKt * 0.74, tier: 'A' },
    heelDeg: { value: 14, tier: 'A' },
    leewayDeg: { value: 3, tier: 'B', band: [2, 4] },
    aero: {
      flat: 1,
      reef: 1,
      twistEff: 12,
      awaDeg: 22,
      awsKt: 11,
      fxN: 1,
      fyN: 1,
      mxNm: 1,
      ceHeightM: 4,
    },
    rig: {
      bendMm: new Array(11).fill(0),
      sagMm: 10,
      rakeMm: 600,
      prebendMm: 40,
      forestayN: 1,
      upperN: 1,
      lowerN: 1,
    },
    shape: {},
    residuals: [0, 0, 0],
  };
}

function optimalTrim(bsKt: number, moved: string[] = ['backstay']): OptimalTrimResult {
  return { race: { ...BASE_RACE, backstay: 55 }, result: solve(bsKt), moved, iters: 42 };
}

/** Records every request and hands back its resolver, so ordering is the test's. */
function deferredClient() {
  const calls: { req: OptimalTrimRequest; resolve: (r: OptimalTrimResult) => void }[] = [];
  const client: Client = {
    request: (req) =>
      new Promise((resolve) => {
        calls.push({
          req: req as unknown as OptimalTrimRequest,
          resolve: resolve as (r: OptimalTrimResult) => void,
        });
      }) as never,
  };
  return { client, calls };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('optimumKey', () => {
  // audit ux-02 H-07: the answer is seeded from the trim on screen, so a
  // different trim is a different question.
  it('separates a changed trim', () => {
    const a = controls();
    const b = controls({ race: { ...BASE_RACE, backstay: 95, mainsheet: 20 } });
    expect(optimumKey(b, CONDITION)).not.toBe(optimumKey(a, CONDITION));
  });

  it('ignores the controls the search cannot move', () => {
    const a = controls();
    const b = controls({
      race: { ...BASE_RACE, inhauler: 99, mainHalyard: 99, jibHalyard: 99 },
    });
    expect(optimumKey(b, CONDITION)).toBe(optimumKey(a, CONDITION));
  });

  it('separates a changed condition and a changed dock', () => {
    const base = optimumKey(controls(), CONDITION);
    expect(optimumKey(controls(), { ...CONDITION, twsKt: 13 })).not.toBe(base);
    expect(optimumKey(controls({ dock: { ...BASE_DOCK, upperTurns: 3 } }), CONDITION)).not.toBe(
      base,
    );
  });
});

describe('OptimumStore.request', () => {
  it('re-searches when a trim slider settles, once per drag', async () => {
    const { client, calls } = deferredClient();
    const store = new OptimumStore(client);

    store.request(controls(), CONDITION);
    await vi.advanceTimersByTimeAsync(OPTIMUM_DEBOUNCE_MS);
    expect(calls).toHaveLength(1);

    // A drag: every frame re-keys, the debounce collapses them into one search
    // seeded from where the thumb stopped.
    for (const backstay of [60, 70, 80]) {
      store.request(controls({ race: { ...BASE_RACE, backstay } }), CONDITION);
    }
    expect(store.stale).toBe(false); // no answer yet, so nothing to go stale
    await vi.advanceTimersByTimeAsync(OPTIMUM_DEBOUNCE_MS);
    expect(calls).toHaveLength(2);
    expect(calls[1].req.controls.race.backstay).toBe(80);
  });

  it('marks the standing answer stale while a trim change is searching', async () => {
    const { client, calls } = deferredClient();
    const store = new OptimumStore(client);

    store.request(controls(), CONDITION);
    await vi.advanceTimersByTimeAsync(OPTIMUM_DEBOUNCE_MS);
    calls[0].resolve(optimalTrim(6.0));
    await vi.advanceTimersByTimeAsync(0);
    expect(store.stale).toBe(false);

    store.request(controls({ race: { ...BASE_RACE, mainsheet: 40 } }), CONDITION);
    expect(store.stale).toBe(true);

    await vi.advanceTimersByTimeAsync(OPTIMUM_DEBOUNCE_MS);
    calls[1].resolve(optimalTrim(6.2));
    await vi.advanceTimersByTimeAsync(0);
    expect(store.stale).toBe(false);
  });

  it('does not re-search when a halyard or the inhauler moves', async () => {
    const { client, calls } = deferredClient();
    const store = new OptimumStore(client);

    store.request(controls(), CONDITION);
    store.request(controls({ race: { ...BASE_RACE, inhauler: 80 } }), CONDITION);
    store.request(controls({ race: { ...BASE_RACE, mainHalyard: 20 } }), CONDITION);

    await vi.advanceTimersByTimeAsync(OPTIMUM_DEBOUNCE_MS);
    expect(calls).toHaveLength(1);
  });

  it('debounces a stepped wind speed into one search', async () => {
    const { client, calls } = deferredClient();
    const store = new OptimumStore(client);

    store.request(controls(), { ...CONDITION, twsKt: 10 });
    store.request(controls(), { ...CONDITION, twsKt: 11 });
    store.request(controls(), { ...CONDITION, twsKt: 12 });
    expect(store.busy).toBe(true);

    await vi.advanceTimersByTimeAsync(OPTIMUM_DEBOUNCE_MS - 1);
    expect(calls).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toHaveLength(1);
    expect(calls[0].req.condition.twsKt).toBe(12);
  });

  it('re-searches when the committed rig changes', async () => {
    const { client, calls } = deferredClient();
    const store = new OptimumStore(client);

    store.request(controls(), CONDITION);
    await vi.advanceTimersByTimeAsync(OPTIMUM_DEBOUNCE_MS);
    store.request(controls({ dock: { ...BASE_DOCK, lowerTurns: 2 } }), CONDITION);
    await vi.advanceTimersByTimeAsync(OPTIMUM_DEBOUNCE_MS);

    expect(calls).toHaveLength(2);
  });

  it('drops a stale answer that lands after a newer one', async () => {
    const { client, calls } = deferredClient();
    const store = new OptimumStore(client);

    store.request(controls(), { ...CONDITION, twsKt: 8 });
    await vi.advanceTimersByTimeAsync(OPTIMUM_DEBOUNCE_MS);
    store.request(controls(), { ...CONDITION, twsKt: 20 });
    await vi.advanceTimersByTimeAsync(OPTIMUM_DEBOUNCE_MS);
    expect(calls).toHaveLength(2);

    calls[1].resolve(optimalTrim(7.1));
    await vi.advanceTimersByTimeAsync(0);
    calls[0].resolve(optimalTrim(4.2));
    await vi.advanceTimersByTimeAsync(0);

    expect(store.result?.result.bsKt.value).toBe(7.1);
    expect(store.busy).toBe(false);
    expect(store.stale).toBe(false);
  });

  it('marks the standing answer stale until the new one lands', async () => {
    const { client, calls } = deferredClient();
    const store = new OptimumStore(client);

    store.request(controls(), CONDITION);
    await vi.advanceTimersByTimeAsync(OPTIMUM_DEBOUNCE_MS);
    calls[0].resolve(optimalTrim(6.0));
    await vi.advanceTimersByTimeAsync(0);
    expect(store.stale).toBe(false);
    expect(store.race?.backstay).toBe(55);
    expect(store.moved).toEqual(['backstay']);

    store.request(controls(), { ...CONDITION, twsKt: 20 });
    expect(store.stale).toBe(true);
    expect(store.race?.backstay).toBe(55); // last good answer stays on screen

    await vi.advanceTimersByTimeAsync(OPTIMUM_DEBOUNCE_MS);
    calls[1].resolve(optimalTrim(7.4));
    await vi.advanceTimersByTimeAsync(0);
    expect(store.stale).toBe(false);
    expect(store.result?.result.bsKt.value).toBe(7.4);
  });

  it('surfaces a solver error and offers no optimum', async () => {
    const client: Client = { request: () => Promise.reject(new Error('diverged')) as never };
    const store = new OptimumStore(client);
    store.request(controls(), CONDITION);
    await vi.advanceTimersByTimeAsync(OPTIMUM_DEBOUNCE_MS);
    expect(store.error).toBe('diverged');
    expect(store.race).toBeNull();
    expect(store.busy).toBe(false);
  });

  it('drops the in-flight search on dispose', async () => {
    const { client, calls } = deferredClient();
    const store = new OptimumStore(client);
    store.request(controls(), CONDITION);
    await vi.advanceTimersByTimeAsync(OPTIMUM_DEBOUNCE_MS);
    store.dispose();
    calls[0].resolve(optimalTrim(9.9));
    await vi.advanceTimersByTimeAsync(0);
    expect(store.result).toBeNull();
  });
});

describe('OPTIMUM_TIER', () => {
  it('is B: the optimum is a shape-layer answer, not a polar one', () => {
    expect(OPTIMUM_TIER).toBe('B');
  });
});
