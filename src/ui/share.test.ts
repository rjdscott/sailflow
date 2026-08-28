import { describe, expect, it } from 'vitest';
import boat from '../../data/boats/j70.json';
import type {
  Condition,
  ControlSpec,
  DockControls,
  DownControls,
  Forecast,
  RaceControls,
} from '../core/types';
import { DEFAULT_BOAT_ID } from '../lib/boat';
import { snap } from './format';
import { parseHash } from './router.svelte';
import {
  decodeShare,
  DOCK_KEYS,
  DOWN_KEYS,
  encodeShare,
  migrate,
  normaliseForecast,
  RACE_KEYS,
  RACE_KEYS as SHARE_RACE_KEYS,
  SHARE_VERSION,
} from './share';

const SPECS = boat.controls as Record<string, ControlSpec>;

/**
 * The share schema's keys, keyed by the `mode` the boat file gives a control.
 * The whole point of driving the tests off `data/boats/j70.json` is that a
 * control added there has nowhere to hide: it lands in a mode, the mode maps
 * to a group, and every assertion below walks the groups.
 */
const GROUPS: Record<string, readonly string[]> = {
  race: RACE_KEYS,
  down: DOWN_KEYS,
  dock: DOCK_KEYS,
};

const CONDITION: Condition = { twsKt: 18, twaDeg: 42, seaState: 2, crewKg: 320, sailset: 'jib' };
const FORECAST: Forecast = { minKt: 8, likelyKt: 12, maxKt: 16, seaState: 1, crewKg: 300 };

/**
 * A legal value for a control that is not its minimum, its maximum, or the
 * base tune: `offset` steps up from the bottom of its range, snapped to the
 * control's own grid. Two different offsets give two states that differ in
 * *every* field, so a group whose encoding drops or transposes a slot shows up
 * as a mismatch rather than passing on a coincidence.
 */
function stateAt(keys: readonly string[], offset: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of keys) {
    const s = SPECS[k];
    out[k] = snap(s.min + s.step * offset, s.min, s.max, s.step);
  }
  return out;
}

describe('the share schema covers the boat file', () => {
  it('assigns every control in data/boats/j70.json to exactly one group', () => {
    const seen = new Map<string, number>();
    for (const keys of Object.values(GROUPS)) {
      for (const k of keys) seen.set(k, (seen.get(k) ?? 0) + 1);
    }
    // Every control the boat defines is carried by a link…
    expect(Object.keys(SPECS).filter((k) => !seen.has(k))).toEqual([]);
    // …exactly once, and the schema names nothing the boat does not have.
    expect([...seen].filter(([k, n]) => n !== 1 || !SPECS[k])).toEqual([]);
  });

  it('puts each control in the group its boat-file mode names', () => {
    for (const [mode, keys] of Object.entries(GROUPS)) {
      expect(keys.filter((k) => SPECS[k].mode !== mode)).toEqual([]);
    }
  });

  it('round-trips a distinct legal value for every single control', () => {
    // Two offsets, so a field that survives by landing on its neighbour's
    // value in one state cannot survive both.
    for (const offset of [1, 3]) {
      const state = {
        condition: CONDITION,
        race: stateAt(RACE_KEYS, offset) as unknown as RaceControls,
        down: stateAt(DOWN_KEYS, offset) as unknown as DownControls,
        dock: stateAt(DOCK_KEYS, offset) as unknown as DockControls,
        forecast: FORECAST,
        tier: 'analyse' as const,
      };
      const back = decodeShare(encodeShare(state));
      expect(back.race).toEqual(state.race);
      expect(back.down).toEqual(state.down);
      expect(back.dock).toEqual(state.dock);
      expect(back.condition).toEqual(CONDITION);
      expect(back.forecast).toEqual(FORECAST);
      expect(back.tier).toBe('analyse');
    }
  });

  it('survives the half-step dock turns a dot separator could not encode', () => {
    const dock: DockControls = { upperTurns: -1.5, lowerTurns: 2.5, forestayMm: 20 };
    expect(decodeShare(encodeShare({ dock })).dock).toEqual(dock);
  });
});

describe('links are versioned', () => {
  it('stamps the current version and reads it back', () => {
    const params = encodeShare({ condition: CONDITION });
    expect(params.s).toBe(String(SHARE_VERSION));
    expect(decodeShare(params).version).toBe(SHARE_VERSION);
  });

  it('migrates a v0 scenario link — no `s=`, dot-separated trim', () => {
    // The shape v0.3.0 wrote into every address bar, and therefore the shape
    // sitting in group chats: RACE_KEYS order, dots, no version.
    const race = stateAt(SHARE_RACE_KEYS, 2) as unknown as RaceControls;
    const v0 = {
      tws: '18',
      twa: '42',
      sea: '2',
      crew: '320',
      set: 'jib',
      r: RACE_KEYS.map((k) => String(race[k])).join('.'),
    };
    const back = decodeShare(v0);
    expect(back.version).toBe(0);
    expect(back.race).toEqual(race);
    expect(back.condition).toEqual(CONDITION);
    // The groups v0 never had are absent, not defaulted to a made-up trim.
    expect(back.down).toBeNull();
    expect(back.dock).toBeNull();
    expect(back.tier).toBeNull();
  });

  it('leaves a link from a future version alone rather than dropping it', () => {
    const params = { ...encodeShare({ condition: CONDITION }), s: String(SHARE_VERSION + 5) };
    expect(migrate(params).params.s).toBe(String(SHARE_VERSION + 5));
    // Best-effort read: the fields this version understands still land.
    expect(decodeShare(params).condition).toEqual(CONDITION);
  });
});

describe('a link is user input', () => {
  it('snaps an out-of-range control onto its own grid', () => {
    const race = decodeShare({
      s: '1',
      r: ['999', '-40', '0', '0', '0', '0', '0', '-3', '0', '0', '0'].join('_'),
    }).race;
    expect(race?.backstay).toBe(100);
    expect(race?.mainsheet).toBe(0);
    expect(race?.jibLead).toBe(0);
  });

  it('clamps a hostile condition instead of passing it to the solver', () => {
    expect(
      decodeShare({ s: '1', tws: '9999', twa: '-40', sea: '9', set: 'sails' }).condition,
    ).toEqual({ twsKt: 30, twaDeg: 0, seaState: 4 });
  });

  it('drops a group of the wrong length rather than half-applying it', () => {
    expect(decodeShare({ s: '1', r: '30_60_0' }).race).toBeNull();
    expect(decodeShare({ s: '1', d: '0_0' }).dock).toBeNull();
    expect(decodeShare({ s: '1', w: '100_50_50_x' }).down).toBeNull();
    expect(decodeShare({ s: '1', f: '8_12_16_1' }).forecast).toBeNull();
  });

  it('ignores a density tier it does not have', () => {
    expect(decodeShare({ s: '1', t: 'expert' }).tier).toBeNull();
    expect(decodeShare({ s: '1', t: 'learn' }).tier).toBe('learn');
  });

  it('accepts a hand-written partial link', () => {
    const back = decodeShare({ tws: '22' });
    expect(back.condition).toEqual({ twsKt: 22 });
    expect(back.race).toBeNull();
  });

  it('rejects a forecast missing a field', () => {
    expect(normaliseForecast({ minKt: 8, likelyKt: 12, maxKt: 16, seaState: 1 })).toBeNull();
  });
});

describe('the query stays short and readable', () => {
  it('is under 200 characters with every group filled', () => {
    const query = new URLSearchParams(
      encodeShare({
        condition: CONDITION,
        race: boat.baseRace as RaceControls,
        down: stateAt(DOWN_KEYS, 4) as unknown as DownControls,
        dock: { upperTurns: -1.5, lowerTurns: 0, forestayMm: 20 },
        forecast: FORECAST,
        tier: 'race',
      }),
    ).toString();
    expect(query.length).toBeLessThan(200);
    // Nothing percent-encoded: `_`, `-` and `.` are unreserved, which is what
    // keeps the link legible after a chat client has been at it.
    expect(query).not.toContain('%');
  });
});

/**
 * ADR 0021 merged Dock and Race into one Simulator page. That moved the
 * *route*, not the query: the groups, their order and their meaning are
 * untouched, so `SHARE_VERSION` does not move and `MIGRATIONS` gains no entry.
 * What carries the old links is the router's alias table — and these tests are
 * what say that the whole link, hash and query together, lands the same state.
 */
describe('links written before the Simulator merge', () => {
  const trim = stateAt(SHARE_RACE_KEYS, 3) as unknown as RaceControls;
  const setup = stateAt(DOCK_KEYS, 2) as unknown as DockControls;

  /** The whole link, the way it sits in a group chat, back to a state. */
  function open(hash: string) {
    const { screen, params } = parseHash(hash);
    return { screen, sub: params.sub, ...decodeShare(params) };
  }

  const query = (state: Parameters<typeof encodeShare>[0]): string =>
    new URLSearchParams(encodeShare(state)).toString();

  it('opens a v1 `#/race?…` link on the simulator with the same trim', () => {
    const opened = open(`#/race?${query({ condition: CONDITION, race: trim })}`);
    expect(opened.screen).toBe('sim');
    expect(opened.sub).toBeUndefined();
    expect(opened.condition).toEqual(CONDITION);
    expect(opened.race).toEqual(trim);
  });

  it('opens a v1 `#/dock?…` link on the dock sub-path, forecast intact', () => {
    const opened = open(`#/dock?${query({ forecast: FORECAST, dock: setup })}`);
    expect(opened.screen).toBe('sim');
    expect(opened.sub).toBe('dock');
    expect(opened.forecast).toEqual(FORECAST);
    expect(opened.dock).toEqual(setup);
  });

  it('opens a v0 dot-separated `#/race?…` link — both rewrites at once', () => {
    const r = RACE_KEYS.map((k) => String(trim[k])).join('.');
    const opened = open(`#/race?tws=18&twa=42&sea=2&crew=320&set=jib&r=${r}`);
    expect(opened.screen).toBe('sim');
    expect(opened.version).toBe(0);
    expect(opened.race).toEqual(trim);
    expect(opened.condition).toEqual(CONDITION);
  });

  it('does not bump the schema version, because the query did not change', () => {
    expect(SHARE_VERSION).toBe(1);
    expect(encodeShare({ condition: CONDITION }).s).toBe('1');
  });
});

/**
 * Phase 05: `boat=` is additive in v1 (ADR 0019). A link that names no class
 * means the default, which is exactly what every link written before this
 * field existed meant — so there is no version bump and no migration entry,
 * and these tests are what say so.
 */
describe('boat= in a share link', () => {
  it('round-trips the class', () => {
    const p = encodeShare({ boat: DEFAULT_BOAT_ID, condition: { twsKt: 12 } });
    expect(p.boat).toBe(DEFAULT_BOAT_ID);
    expect(decodeShare(p).boat).toBe(DEFAULT_BOAT_ID);
  });

  it('stays out of the query when no class is named', () => {
    // Otherwise every existing link would grow a parameter on the next copy,
    // and links already in a group chat would stop matching new ones.
    expect(encodeShare({ condition: { twsKt: 12 } }).boat).toBeUndefined();
  });

  it('does not bump the schema version, because it added no meaning', () => {
    expect(encodeShare({ boat: DEFAULT_BOAT_ID }).s).toBe(String(SHARE_VERSION));
  });

  it('reads a pre-boat v1 link as the default class, not as an error', () => {
    const decoded = decodeShare({ s: '1', tws: '12' });
    expect(decoded.boat).toBeNull();
    expect(decoded.condition.twsKt).toBe(12);
  });

  it('reads an unknown class as null so an older build still opens the link', () => {
    // A crewmate on a build that predates a class must get the app, not a
    // blank screen. Null means "fall back to the default".
    const decoded = decodeShare({ s: '1', boat: 'not-a-boat', tws: '12' });
    expect(decoded.boat).toBeNull();
    expect(decoded.condition.twsKt).toBe(12);
  });
});
