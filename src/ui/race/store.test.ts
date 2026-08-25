import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Condition, ControlState, SolveResult } from '../../core/types';
import type { TrimmedRequest } from '../../worker/protocol';
import type { Client } from './client';
import { BASE_DOCK, BASE_DOWN, bestProbe, DEBOUNCE_MS, gradients, RaceStore } from './store.svelte';
import { BASE_RACE } from '../stores/conditions.svelte';

const CONDITION: Condition = { twsKt: 12, twaDeg: 42, seaState: 1, crewKg: 300, sailset: 'jib' };

function controls(over: Partial<ControlState['race']> = {}): ControlState {
  return {
    dock: { ...BASE_DOCK },
    race: { ...BASE_RACE, ...over },
    down: { ...BASE_DOWN },
  };
}

function result(vmgKt: number, bsKt = 6): SolveResult {
  return {
    converged: true,
    iters: 8,
    bsKt: { value: bsKt, tier: 'A' },
    vmgKt: { value: vmgKt, tier: 'A' },
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

/** Records every request and hands back a resolver, so ordering is the test's. */
function deferredClient() {
  const calls: { req: TrimmedRequest; resolve: (r: SolveResult) => void }[] = [];
  const client: Client = {
    request: (req) =>
      new Promise((resolve) => {
        calls.push({
          req: req as unknown as TrimmedRequest,
          resolve: resolve as (r: SolveResult) => void,
        });
      }) as never,
  };
  return { client, calls };
}

/** Resolves immediately with a VMG computed from the requested race controls. */
function scoringClient(vmg: (c: ControlState['race']) => number) {
  const seen: ControlState['race'][] = [];
  const client: Client = {
    request: (req) => {
      const race = (req as unknown as TrimmedRequest).controls.race;
      seen.push(race);
      return Promise.resolve(result(vmg(race))) as never;
    },
  };
  return { client, seen };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('RaceStore.request', () => {
  it('debounces a drag into one solve', async () => {
    const { client, calls } = deferredClient();
    const store = new RaceStore(client);

    store.request(controls({ mainsheet: 60 }), CONDITION);
    store.request(controls({ mainsheet: 65 }), CONDITION);
    store.request(controls({ mainsheet: 70 }), CONDITION);
    expect(store.busy).toBe(true);

    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1);
    expect(calls).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toHaveLength(1);
    expect(calls[0].req.controls.race.mainsheet).toBe(70);
  });

  it('drops a stale response that lands after a newer one', async () => {
    const { client, calls } = deferredClient();
    const store = new RaceStore(client);

    store.request(controls({ mainsheet: 60 }), CONDITION);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    store.request(controls({ mainsheet: 90 }), CONDITION);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(calls).toHaveLength(2);

    // The second (newest) request answers first, then the first straggles in.
    calls[1].resolve(result(4.9, 6.5));
    await vi.advanceTimersByTimeAsync(0);
    calls[0].resolve(result(9.9, 9.9));
    await vi.advanceTimersByTimeAsync(0);

    expect(store.result?.bsKt.value).toBe(6.5);
    expect(store.busy).toBe(false);
  });

  it('surfaces a solver error without clobbering busy', async () => {
    const client: Client = { request: () => Promise.reject(new Error('diverged')) as never };
    const store = new RaceStore(client);
    store.request(controls(), CONDITION);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(store.error).toBe('diverged');
    expect(store.busy).toBe(false);
  });
});

describe('coach line', () => {
  it('probes the four influential controls one legal step each way, after the main solve', async () => {
    const { client, seen } = scoringClient(() => 5);
    const store = new RaceStore(client);
    store.request(controls(), CONDITION);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    // 1 main solve + 4 controls x 2 directions
    expect(seen).toHaveLength(9);
    expect(store.coach).toBeNull(); // nothing gains, so nothing to say
  });

  it('picks the largest gain and phrases it', async () => {
    // Easing the mainsheet one step (70 -> 65) is worth more than anything else.
    const { client } = scoringClient((r) => {
      if (r.mainsheet === 65) return 4.86;
      if (r.traveller === 25) return 4.83;
      return 4.8;
    });
    const store = new RaceStore(client);
    store.request(controls(), CONDITION);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    expect(store.coach?.control).toBe('mainsheet');
    expect(store.coach?.dir).toBe(-1);
    expect(store.coach?.text).toBe('Ease mainsheet one click: +0.06 kt VMG, leech is stalled.');
    expect(store.chevrons).toEqual({ mainsheet: -1, traveller: 1 });
  });

  it('does not probe past a control stop', async () => {
    const { client, seen } = scoringClient(() => 5);
    const store = new RaceStore(client);
    // jibLead at its maximum: only the downward probe is legal.
    store.request(controls({ jibLead: 10, backstay: 100 }), CONDITION);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(seen).toHaveLength(7);
  });
});

describe('bestProbe', () => {
  it('returns the largest gain above the noise floor', () => {
    const best = bestProbe(4.8, [
      { control: 'backstay', dir: 1, vmgKt: 4.82 },
      { control: 'mainsheet', dir: -1, vmgKt: 4.86 },
      { control: 'traveller', dir: 1, vmgKt: 4.79 },
    ]);
    expect(best?.control).toBe('mainsheet');
    expect(best?.gainKt).toBeCloseTo(0.06);
  });

  it('is null when every probe is inside the noise floor', () => {
    expect(bestProbe(4.8, [{ control: 'backstay', dir: 1, vmgKt: 4.803 }])).toBeNull();
    expect(bestProbe(4.8, [])).toBeNull();
  });
});

describe('gradients', () => {
  it('keeps only the better direction per control', () => {
    expect(
      gradients(4.8, [
        { control: 'backstay', dir: 1, vmgKt: 4.9 },
        { control: 'backstay', dir: -1, vmgKt: 4.85 },
        { control: 'vang', dir: -1, vmgKt: 4.7 },
      ]),
    ).toEqual({ backstay: 1 });
  });
});

describe('coach line downwind', () => {
  it('treats a more negative VMG as the gain when the asym is up', async () => {
    // Downwind VMG is negative; easing the mainsheet makes it more so.
    const { client } = scoringClient((r) => (r.mainsheet === 65 ? -3.2 : -3.0));
    const store = new RaceStore(client);
    store.request(controls(), { ...CONDITION, twaDeg: 150, sailset: 'asym' });
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(store.coach?.control).toBe('mainsheet');
    expect(store.coach?.dir).toBe(-1);
    expect(store.coach?.gainKt).toBeCloseTo(0.2, 5);
    expect(store.chevrons).toEqual({ mainsheet: -1 });
  });
});

describe('RaceStore.syncDock', () => {
  it('copies the committed rig into the same dock object the sliders bind to', () => {
    const store = new RaceStore({ request: vi.fn() } as unknown as Client);
    const dock = store.controls.dock;
    store.syncDock({ upperTurns: 3, lowerTurns: -2, forestayMm: 30 });
    expect(store.controls.dock).toBe(dock);
    expect(dock).toEqual({ upperTurns: 3, lowerTurns: -2, forestayMm: 30 });
    store.syncDock(null);
    expect(dock).toEqual(BASE_DOCK);
  });
});
