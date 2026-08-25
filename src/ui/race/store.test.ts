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
  historyKey,
  OBJECTIVE_METRIC,
  raceObjective,
  RaceStore,
} from './store.svelte';
import { BASE_RACE, conditions, PRESETS } from '../stores/conditions.svelte';
import { optimum } from './optimum.svelte';

const CONDITION: Condition = { twsKt: 12, twaDeg: 42, seaState: 1, crewKg: 300, sailset: 'jib' };

function controls(over: Partial<ControlState['race']> = {}): ControlState {
  return {
    dock: { ...BASE_DOCK },
    race: { ...BASE_RACE, ...over },
    down: { ...BASE_DOWN },
  };
}

function result(vmgKt: number, bsKt = 6, converged = true): SolveResult {
  return {
    converged,
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
    instruments: {
      leechStallFrac: { value: 0.4, tier: 'C', sign: 1 },
      jibLeechStripe: { value: 1, tier: 'C', sign: 1 },
      helmLoad: { value: 0.5, tier: 'C', sign: 1 },
      pctPolar: { value: 98, tier: 'A' },
    },
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
    // Easing the mainsheet one step off the base trim is worth more than
    // anything else; the traveller up one step is the runner-up.
    const { client } = scoringClient((r) => {
      if (r.mainsheet === BASE_RACE.mainsheet - 5) return 4.86;
      if (r.traveller === BASE_RACE.traveller + 5) return 4.83;
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

  it('does not probe the jib under the kite: it is furled, and its lead moves no number', async () => {
    const { client, seen } = scoringClient(() => 5);
    const store = new RaceStore(client);
    store.request(controls(), { ...CONDITION, twaDeg: 150, sailset: 'asym' });
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    // 1 main solve + 3 controls x 2 directions: jibLead is not asked.
    expect(seen).toHaveLength(7);
    expect(seen.some((r) => r.jibLead !== BASE_RACE.jibLead)).toBe(false);
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
      // One step up from the base trim, whatever the base trim is: these
      // used to be the literals 65 and 25, which quietly pinned the test to
      // Race mode's old base values (cockpit phase 05).
      const bsKt = race.mainsheet === BASE_RACE.mainsheet + 5 ? 6.4 : 6.0;
      const vmgKt = race.traveller === BASE_RACE.traveller + 5 ? 5.0 : 4.0;
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
    const { client } = scoringClient((r) =>
      r.mainsheet === BASE_RACE.mainsheet - 5 ? -3.2 : -3.0,
    );
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

/**
 * The Factorio preview (research §3 principle 24): before an action rewrites
 * the trim, the controls it would move say so. These are the three lists the
 * panels outline from.
 */
describe('RaceStore hover previews', () => {
  const store = () => new RaceStore(deferredClient().client);

  afterEach(() => {
    optimum.result = null;
  });

  it('lists only the controls whose value would change', () => {
    const s = store();
    expect(s.willMoveTo({ ...BASE_RACE })).toEqual([]);
    expect(s.willMoveTo({ ...BASE_RACE, mainsheet: BASE_RACE.mainsheet + 5 })).toEqual([
      'mainsheet',
    ]);
  });

  it('moves nothing when there is nothing to move to', () => {
    expect(store().willMoveTo(null)).toEqual([]);
  });

  it('previews a reset against the base trim, in control order', () => {
    const s = store();
    s.controls.race.backstay = BASE_RACE.backstay + 20;
    s.controls.race.vang = BASE_RACE.vang + 10;
    expect(s.willReset()).toEqual(['backstay', 'vang']);
    s.controls.race.backstay = BASE_RACE.backstay;
    s.controls.race.vang = BASE_RACE.vang;
    expect(s.willReset()).toEqual([]);
  });

  it("previews Apply from the search's own list, so the two cannot disagree", () => {
    const s = store();
    expect(s.willMove()).toEqual([]); // no search has answered yet
    optimum.result = {
      race: { ...BASE_RACE },
      result: result(4.5),
      moved: ['mainsheet', 'jibLead'],
      iters: 300,
    };
    expect(s.willMove()).toEqual(['mainsheet', 'jibLead']);
  });
});

describe('RaceStore.history', () => {
  /** Answers every request with a fixed solve, so only the pushes are under test. */
  const feeding = (r: SolveResult) => ({ request: () => Promise.resolve(r) }) as unknown as Client;

  it('keeps one sample per converged solve, in order', async () => {
    const store = new RaceStore(feeding(result(4.5, 6.1)));
    for (const mainsheet of [60, 65, 70]) {
      store.request(controls({ mainsheet }), CONDITION);
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    }
    expect(store.history.series('bs')).toEqual([6.1, 6.1, 6.1]);
    expect(store.history.series('vmg')).toHaveLength(3);
    expect(store.history.key).toBe(historyKey(CONDITION));
  });

  it('drops a solve that did not converge', async () => {
    const store = new RaceStore(feeding(result(4.5, 6.1, false)));
    store.request(controls(), CONDITION);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(store.result?.converged).toBe(false);
    expect(store.history.series('bs')).toEqual([]);
  });

  it('starts over when the condition changes', async () => {
    const store = new RaceStore(feeding(result(4.5, 6.1)));
    store.request(controls(), CONDITION);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(store.history.series('bs')).toHaveLength(1);

    store.request(controls(), { ...CONDITION, twsKt: 14 });
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(store.history.series('bs')).toHaveLength(1);
    expect(store.history.key).toBe(historyKey({ ...CONDITION, twsKt: 14 }));
  });
});

/**
 * A/B compare (cockpit phase 05): unlike undo, which throws the other trim
 * away, this keeps both — so the question "which of these two is faster" can
 * be asked as many times as it takes.
 */
describe('RaceStore.abToggle', () => {
  const store = () => new RaceStore(deferredClient().client);

  beforeEach(() => conditions.apply(CONDITION));

  it('swaps in the remembered trim and keeps the one it replaced', () => {
    const s = store();
    s.controls.race.mainsheet = 40;
    s.remember();
    s.controls.race.mainsheet = 80;

    s.abToggle();
    expect(s.controls.race.mainsheet).toBe(40);
    expect(s.previousRace?.mainsheet).toBe(80);
    expect(s.ab).toBe('B');
  });

  it('round-trips: two toggles are exactly where you started, same object', () => {
    const s = store();
    const bound = s.controls.race;
    s.controls.race.mainsheet = 40;
    s.controls.race.jibLead = 3;
    s.remember();
    s.controls.race.mainsheet = 80;
    s.controls.race.jibLead = 7;
    const started = { ...s.controls.race };

    s.abToggle();
    s.abToggle();

    // Identity, not just equality: every slider in the panels binds through
    // this object, so replacing it would silently unbind them.
    expect(s.controls.race).toBe(bound);
    expect({ ...s.controls.race }).toEqual(started);
    expect(s.ab).toBe('A');
  });

  it('does nothing with no previous trim to compare against', () => {
    const s = store();
    s.controls.race.mainsheet = 55;
    s.abToggle();
    expect(s.controls.race.mainsheet).toBe(55);
    expect(s.previousRace).toBeNull();
    expect(s.ab).toBe('A');
    expect(s.abMoved).toEqual([]);
    expect(s.abDeltaKt).toBeNull();
  });

  it('lists the controls that differ between the two sides', () => {
    const s = store();
    s.remember();
    s.controls.race.mainsheet += 5;
    s.controls.race.vang += 5;
    expect(s.abMoved).toEqual(['mainsheet', 'vang']);
  });

  it('reports the objective delta from the parked solve, signed this-way-round', () => {
    const s = store();
    s.result = result(4.2);
    s.remember(); // parks 4.2 kt VMG
    s.result = result(4.5);
    expect(s.abDeltaKt).toBeCloseTo(0.3, 6);

    s.abToggle(); // the parked side is now the 4.5 one
    expect(s.previousObjKt).toBeCloseTo(4.5, 6);
    expect(s.abDeltaKt).toBeCloseTo(0, 6); // same solve on screen until it re-solves
  });

  it('undo throws the other side away, so the compare ends', () => {
    const s = store();
    s.remember();
    s.controls.race.mainsheet += 5;
    s.abToggle();
    s.undo();
    expect(s.previousRace).toBeNull();
    expect(s.previousObjKt).toBeNull();
    expect(s.ab).toBe('A');
  });
});

describe('RaceStore.setMode', () => {
  const store = () => new RaceStore(deferredClient().client);

  beforeEach(() => conditions.apply(CONDITION));

  it('steers the offset off the angle the chip solved for, not off the last mode', () => {
    const s = store();
    s.modeBaseTwaDeg = 42;
    s.setMode('high');
    expect(conditions.twaDeg).toBe(39);
    s.setMode('fast');
    expect(conditions.twaDeg).toBe(45); // 6 degrees, not two 3s
    s.setMode('vmg');
    expect(conditions.twaDeg).toBe(42);
    expect(s.mode).toBe('vmg');
  });

  it('adopts the angle on screen as the base when no chip has been tapped', () => {
    const s = store();
    conditions.twaDeg = 150;
    s.setMode('soak');
    expect(s.modeBaseTwaDeg).toBe(150);
    expect(conditions.twaDeg).toBe(158);
  });

  it('never steers outside the angles the boat has', () => {
    const s = store();
    s.modeBaseTwaDeg = 175;
    s.setMode('wing');
    expect(conditions.twaDeg).toBe(180);
    s.modeBaseTwaDeg = 21;
    s.setMode('high');
    expect(conditions.twaDeg).toBe(20);
  });

  it('offers the downwind modes from a beam reach out', () => {
    const s = store();
    conditions.twaDeg = 42;
    conditions.sailset = 'jib';
    expect(s.downwindModes).toBe(false);
    conditions.twaDeg = 150;
    expect(s.downwindModes).toBe(true);
  });

  it('re-takes the base angle from a point-of-sail chip', () => {
    const s = store();
    s.setMode('high');
    s.setPointOfSail('beam-reach');
    expect(s.mode).toBe('vmg');
    expect(s.modeBaseTwaDeg).toBe(90);
    expect(conditions.twaDeg).toBe(90);
  });
});
