import { describe, expect, it, vi } from 'vitest';
import type { DockControls, DockScore, OptimalResult } from '../../core/types';
import type { Request } from '../../worker/protocol';
import {
  candidateSetups,
  computeModelOptimum,
  ModelOptimumStore,
  type Client,
} from './store.svelte';

function score(setup: DockControls, regret: number): DockScore {
  const r = { twsKt: 12, regretSPerMile: regret, optimum: setup };
  return {
    setup,
    expectedRegretSPerMile: { value: regret, tier: 'B', band: [regret - 1, regret + 1] },
    atMin: r,
    atMax: r,
    worst: r,
    perTws: [r],
  };
}

const optimalResult = {
  converged: true,
  iters: 9,
  bsKt: { value: 6.4, tier: 'A' },
  vmgKt: { value: 4.9, tier: 'A' },
  heelDeg: { value: 17, tier: 'A' },
  leewayDeg: { value: 3, tier: 'B' },
  aero: {},
  rig: {},
  shape: {},
  residuals: [0, 0, 0],
  twaDeg: 41,
  race: {},
} as unknown as OptimalResult;

/** Records every request, answers dockScore by a regret function of the setup. */
function fakeClient(regret: (s: DockControls) => number): Client & { sent: Request[] } {
  const sent: Request[] = [];
  return {
    sent,
    request: ((req: Request) => {
      sent.push(req);
      if (req.type === 'dockScore') {
        return Promise.resolve(req.setups.map((s) => score(s, regret(s))));
      }
      if (req.type === 'optimal') return Promise.resolve(optimalResult);
      return Promise.reject(new Error(`unexpected ${req.type}`));
    }) as Client['request'],
  };
}

describe('candidateSetups', () => {
  it('is the 4 x 3 x 2 coarse grid', () => {
    const setups = candidateSetups();
    expect(setups).toHaveLength(24);
    expect(new Set(setups.map((s) => JSON.stringify(s))).size).toBe(24);
  });
});

describe('computeModelOptimum', () => {
  it('scores the grid against a forecast pinned to the single wind speed', async () => {
    const client = fakeClient(() => 3);
    await computeModelOptimum(client, 12, 2, 300);
    const dockScore = client.sent[0];
    expect(dockScore.type).toBe('dockScore');
    if (dockScore.type !== 'dockScore') throw new Error('unreachable');
    expect(dockScore.setups).toHaveLength(24);
    expect(dockScore.forecast).toEqual({
      minKt: 12,
      likelyKt: 12,
      maxKt: 12,
      seaState: 2,
      crewKg: 300,
    });
  });

  it('picks the least-regret setup and solves it upwind with TWA optimised', async () => {
    const target: DockControls = { upperTurns: 3, lowerTurns: 1, forestayMm: 15 };
    const client = fakeClient((s) => (JSON.stringify(s) === JSON.stringify(target) ? 0.5 : 4));

    const result = await computeModelOptimum(client, 12, 2, 300);

    expect(result.dock).toEqual(target);
    expect(result.bsKt.value).toBe(6.4);
    expect(result.twaDeg).toBe(41);
    expect(result.heelDeg.value).toBe(17);

    const optimal = client.sent[1];
    expect(optimal.type).toBe('optimal');
    if (optimal.type !== 'optimal') throw new Error('unreachable');
    expect(optimal.dock).toEqual(target);
    expect(optimal.optimiseTwa).toBe(true);
    expect(optimal.condition).toEqual({
      twsKt: 12,
      twaDeg: 45,
      seaState: 2,
      crewKg: 300,
      sailset: 'jib',
    });
  });

  it('throws rather than inventing an optimum when the solver returns nothing', async () => {
    const client: Client = { request: (() => Promise.resolve([])) as Client['request'] };
    await expect(computeModelOptimum(client, 12, 2, 300)).rejects.toThrow(/no dock scores/);
  });
});

describe('ModelOptimumStore', () => {
  it('debounces bursts into a single solve', async () => {
    vi.useFakeTimers();
    const client = fakeClient(() => 3);
    const store = new ModelOptimumStore(client);

    store.request(8, 2, 300);
    store.request(10, 2, 300);
    store.request(12, 2, 300);
    expect(client.sent).toHaveLength(0);
    expect(store.busy).toBe(true);

    await vi.advanceTimersByTimeAsync(400);
    await vi.waitFor(() => expect(store.optimum).not.toBeNull());

    const dockScore = client.sent[0];
    if (dockScore.type !== 'dockScore') throw new Error('unreachable');
    expect(dockScore.forecast.likelyKt).toBe(12);
    expect(store.busy).toBe(false);
    vi.useRealTimers();
  });

  it('drops a stale answer that lands after a newer request', async () => {
    let release: ((v: DockScore[]) => void) | undefined;
    const setups = candidateSetups();
    const slow: Client = {
      request: ((req: Request) => {
        if (req.type === 'dockScore') {
          if (!release) return new Promise<DockScore[]>((r) => (release = r));
          return Promise.resolve(setups.map((s) => score(s, 1)));
        }
        return Promise.resolve(optimalResult);
      }) as Client['request'],
    };
    const store = new ModelOptimumStore(slow);

    store.request(8, 2, 300);
    await vi.waitFor(() => expect(release).toBeDefined());
    store.request(20, 2, 300);
    await vi.waitFor(() => expect(store.optimum).not.toBeNull());

    // The first solve's answer arrives last and must not overwrite the second.
    release!(setups.map((s) => score(s, 0.1)));
    await Promise.resolve();
    expect(store.optimum?.bsKt.value).toBe(6.4);
    expect(store.error).toBeNull();
  });

  it('surfaces a solver error instead of a stale optimum', async () => {
    const store = new ModelOptimumStore({
      request: (() => Promise.reject(new Error('solver blew up'))) as Client['request'],
    });
    store.request(12, 2, 300);
    await vi.waitFor(() => expect(store.error).toBe('solver blew up'));
    expect(store.optimum).toBeNull();
    expect(store.busy).toBe(false);
  });
});
