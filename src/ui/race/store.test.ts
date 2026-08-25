import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Condition, ControlState, OptimalResult, SolveResult } from '../../core/types';
import type { OptimalRequest, TrimmedRequest } from '../../worker/protocol';
import type { Client } from './client';
import {
  BASE_DOCK,
  BASE_DOWN,
  bestProbe,
  DEBOUNCE_MS,
  gradients,
  OBJECTIVE_METRIC,
  raceObjective,
  RaceStore,
} from './store.svelte';
import { BASE_RACE, conditions, PRESETS } from '../stores/conditions.svelte';

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
    expect(store.chevrons.mainsheet.dir).toBe(-1);
    expect(store.chevrons.mainsheet.gainKt).toBeCloseTo(0.06, 5);
    expect(store.chevrons.traveller.dir).toBe(1);
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
      { control: 'backstay', dir: 1, valueKt: 4.82 },
      { control: 'mainsheet', dir: -1, valueKt: 4.86 },
      { control: 'traveller', dir: 1, valueKt: 4.79 },
    ]);
    expect(best?.control).toBe('mainsheet');
    expect(best?.gainKt).toBeCloseTo(0.06);
  });

  it('is null when every probe is inside the noise floor', () => {
    expect(bestProbe(4.8, [{ control: 'backstay', dir: 1, valueKt: 4.803 }])).toBeNull();
    expect(bestProbe(4.8, [])).toBeNull();
  });
});

describe('gradients', () => {
  it('keeps only the better direction per control, with what it gains', () => {
    const out = gradients(4.8, [
      { control: 'backstay', dir: 1, valueKt: 4.9 },
      { control: 'backstay', dir: -1, valueKt: 4.85 },
      { control: 'vang', dir: -1, valueKt: 4.7 },
    ]);
    expect(Object.keys(out)).toEqual(['backstay']);
    expect(out.backstay.dir).toBe(1);
    // M-02: the magnitude used to be computed and dropped on the floor.
    expect(out.backstay.gainKt).toBeCloseTo(0.1, 6);
  });
});

describe('raceObjective', () => {
  // Mirrors core/solve/optimalTrim: if these drift, Apply optimum and the
  // coach line start pointing at different numbers.
  it.each([
    [{ twaDeg: 40, sailset: 'jib' }, 'vmgUp', 'VMG'],
    [{ twaDeg: -42, sailset: 'jib' }, 'vmgUp', 'VMG'],
    [{ twaDeg: 90, sailset: 'jib' }, 'speed', 'boat speed'],
    [{ twaDeg: 120, sailset: 'jib' }, 'speed', 'boat speed'],
    [{ twaDeg: 60, sailset: 'asym' }, 'speed', 'boat speed'],
    [{ twaDeg: 150, sailset: 'asym' }, 'vmgDown', 'VMG'],
  ] as const)('%o is %s, worded as %s', (over, objective, metric) => {
    const c = { ...CONDITION, ...over };
    expect(raceObjective(c)).toBe(objective);
    expect(OBJECTIVE_METRIC[raceObjective(c)]).toBe(metric);
  });
});

describe('coach wording per point of sail', () => {
  /** VMG likes the traveller; boat speed likes the mainsheet. Whoever wins
      tells you which objective the probes actually scored. */
  const splitClient: Client = {
    request: (req) => {
      const race = (req as unknown as TrimmedRequest).controls.race;
      const bsKt = race.mainsheet === 65 ? 6.4 : 6.0;
      const vmgKt = race.traveller === 25 ? 5.0 : 4.0;
      return Promise.resolve(result(vmgKt, bsKt)) as never;
    },
  };

  it('says boat speed on a reach, and probes boat speed to get there', async () => {
    const store = new RaceStore(splitClient);
    store.request(controls(), { ...CONDITION, twaDeg: 90 });
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(store.coach?.control).toBe('mainsheet');
    expect(store.coach?.text).toContain('kt boat speed');
  });

  it('says VMG, and scores VMG, inside 90 degrees under the jib', async () => {
    const store = new RaceStore(splitClient);
    store.request(controls(), { ...CONDITION, twaDeg: 42 });
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(store.coach?.control).toBe('traveller');
    expect(store.coach?.text).toContain('kt VMG');
  });
});

describe('one-level undo', () => {
  it('restores every control a preset overwrote, exactly', () => {
    const store = new RaceStore(scoringClient(() => 5).client);
    const before = { ...store.controls.race };
    store.applyPreset(PRESETS[2]); // Heavy: rewrites all eleven
    expect({ ...store.controls.race }).not.toEqual(before);

    store.undo();
    expect({ ...store.controls.race }).toEqual(before);
    expect(store.previousRace).toBeNull();
  });

  it('is one level deep, and a no-op once spent', () => {
    const store = new RaceStore(scoringClient(() => 5).client);
    const base = { ...store.controls.race };
    store.applyPreset(PRESETS[0]);
    const light = { ...store.controls.race };
    store.applyPreset(PRESETS[2]);

    store.undo();
    expect({ ...store.controls.race }).toEqual(light);
    store.undo(); // nothing left: Light stands, base is gone
    expect({ ...store.controls.race }).toEqual(light);
    expect({ ...store.controls.race }).not.toEqual(base);
  });

  it('keeps the object identity the sliders bind to', () => {
    const store = new RaceStore(scoringClient(() => 5).client);
    const alias = store.controls.race;
    store.applyPreset(PRESETS[2]);
    store.undo();
    expect(store.controls.race).toBe(alias);
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
    expect(store.coach?.text).toContain('kt VMG');
    expect(Object.keys(store.chevrons)).toEqual(['mainsheet']);
    expect(store.chevrons.mainsheet.dir).toBe(-1);
  });
});

describe('RaceStore.setPointOfSail', () => {
  /** Records the optimal requests and hands back their resolvers. */
  function optimalClient() {
    const calls: { req: OptimalRequest; resolve: (r: OptimalResult) => void }[] = [];
    const client: Client = {
      request: (req) =>
        new Promise((resolve) => {
          calls.push({
            req: req as unknown as OptimalRequest,
            resolve: resolve as (r: OptimalResult) => void,
          });
        }) as never,
    };
    return { client, calls };
  }

  function optimum(twaDeg: number): OptimalResult {
    return { ...result(-3), twaDeg, race: { ...BASE_RACE } };
  }

  beforeEach(() => conditions.apply(CONDITION));

  it('sets a fixed reach immediately and asks the solver for nothing', () => {
    const { client, calls } = optimalClient();
    const store = new RaceStore(client);
    store.setPointOfSail('beam-reach');
    expect(conditions.twaDeg).toBe(90);
    expect(conditions.sailset).toBe('jib');
    expect(store.pointOfSailBusy).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it('hoists the kite, then adopts the solved optimum angle', async () => {
    const { client, calls } = optimalClient();
    const store = new RaceStore(client);

    store.setPointOfSail('run');
    // The kite and the nominal angle land before the solve answers.
    expect(conditions.sailset).toBe('asym');
    expect(conditions.twaDeg).toBe(165);
    expect(store.pointOfSailBusy).toBe('run');
    expect(calls[0].req.optimiseTwa).toBe(true);
    expect(calls[0].req.condition.sailset).toBe('asym');
    expect(calls[0].req.dock).toEqual(BASE_DOCK);

    calls[0].resolve(optimum(148.7));
    await vi.advanceTimersByTimeAsync(0);
    expect(conditions.twaDeg).toBe(149);
    expect(store.pointOfSailBusy).toBeNull();
  });

  it('keeps the tapped chip active at the angle its solve returned', async () => {
    const { client, calls } = deferredClient();
    const store = new RaceStore(client);
    store.setPointOfSail('run');
    expect(store.pointOfSail).toEqual({ id: 'run', twaDeg: 165 });
    calls[0].resolve(optimum(148.7) as never);
    await Promise.resolve();
    await Promise.resolve();
    expect(conditions.twaDeg).toBe(149);
    expect(store.pointOfSail).toEqual({ id: 'run', twaDeg: 149 });
  });

  it('drops an optimum that lands after a newer chip tap', async () => {
    const { client, calls } = optimalClient();
    const store = new RaceStore(client);

    store.setPointOfSail('run');
    store.setPointOfSail('close-hauled');
    expect(conditions.sailset).toBe('jib');

    calls[1].resolve(optimum(41.4));
    await vi.advanceTimersByTimeAsync(0);
    calls[0].resolve(optimum(148.7)); // the stale Run answer
    await vi.advanceTimersByTimeAsync(0);

    expect(conditions.twaDeg).toBe(41);
    expect(conditions.sailset).toBe('jib');
  });

  it('keeps the nominal angle when the solve fails', async () => {
    const client: Client = { request: () => Promise.reject(new Error('diverged')) as never };
    const store = new RaceStore(client);
    store.setPointOfSail('close-hauled');
    await vi.advanceTimersByTimeAsync(0);
    expect(conditions.twaDeg).toBe(40);
    expect(store.pointOfSailBusy).toBeNull();
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
