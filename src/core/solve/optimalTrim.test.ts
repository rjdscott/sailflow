import { describe, expect, it } from 'vitest';
import j70 from '../../../data/boats/j70.json';
import type { BoatDefinition, RaceControls } from '../types';
import { baseDock, baseRace } from '../shape/base';
import { geometryFor } from './equilibrium';
import { trimmed } from './trimmed';
import { TRIM_CONTROLS, optimalTrim, snap } from './optimalTrim';

const boat = { ...(j70 as unknown as BoatDefinition), calibration: {} }; // module tests run on default knobs;
const GEOM = geometryFor(boat);

const up = { twsKt: 10, twaDeg: 42, seaState: 1 as const, crewKg: 300, sailset: 'jib' as const };
const dn = { twsKt: 12, twaDeg: 150, seaState: 1 as const, crewKg: 300, sailset: 'asym' as const };

/** Deliberately bad: over-flattened, over-vanged, sheets eased, lead at the stop. */
const mistrim: RaceControls = {
  ...baseRace(),
  backstay: 90,
  mainsheet: 20,
  traveller: -60,
  vang: 90,
  outhaul: 100,
  jibSheet: 20,
  jibLead: 10,
};

const from = (race: RaceControls) => ({ dock: baseDock(), race });

const onGrid = (race: RaceControls) =>
  (Object.keys(race) as (keyof RaceControls)[]).filter(
    (k) => race[k] !== snap(boat.controls[k], race[k]),
  );

describe('optimalTrim', () => {
  it('beats a mis-trimmed start on VMG upwind', () => {
    const base = trimmed(boat, from(mistrim), up, GEOM);
    const o = optimalTrim(boat, from(mistrim), up, {}, GEOM);
    expect(o.result.converged).toBe(true);
    expect(o.result.vmgKt.value).toBeGreaterThan(base.vmgKt.value);
    // The solve it reports is the solve at the controls it reports.
    expect(o.result.vmgKt.value).toBeCloseTo(trimmed(boat, from(o.race), up, GEOM).vmgKt.value, 12);
    expect(o.moved.length).toBeGreaterThan(0);
  });

  it('maximises −VMG downwind and leaves the jib alone under the kite', () => {
    const base = trimmed(boat, from(mistrim), dn, GEOM);
    const o = optimalTrim(boat, from(mistrim), dn, {}, GEOM);
    expect(-o.result.vmgKt.value).toBeGreaterThan(-base.vmgKt.value);
    expect(o.moved).not.toContain('jibSheet');
    expect(o.moved).not.toContain('jibLead');
    expect(o.race.jibSheet).toBe(mistrim.jibSheet);
    expect(o.race.jibLead).toBe(mistrim.jibLead);
  });

  it('is idempotent: re-optimising its own answer moves nothing', () => {
    const o = optimalTrim(boat, from(mistrim), up, {}, GEOM);
    const again = optimalTrim(boat, from(o.race), up, {}, GEOM);
    expect(again.moved).toEqual([]);
    expect(again.race).toEqual(o.race);
  });

  it('mirrors: the port tack gives the same controls', () => {
    const s = optimalTrim(boat, from(mistrim), up, {}, GEOM);
    const p = optimalTrim(boat, from(mistrim), { ...up, twaDeg: -up.twaDeg }, {}, GEOM);
    expect(p.race).toEqual(s.race);
    expect(p.moved).toEqual(s.moved);
    expect(p.result.vmgKt.value).toBeCloseTo(s.result.vmgKt.value, 9);
  });

  it('is deterministic: two calls are deep-equal', () => {
    const a = optimalTrim(boat, from(mistrim), up, {}, GEOM);
    const b = optimalTrim(boat, from(mistrim), up, {}, GEOM);
    expect(b).toEqual(a);
  });

  it('returns controls on the legal grid, inside min/max', () => {
    for (const cond of [up, dn]) {
      const o = optimalTrim(boat, from(mistrim), cond, {}, GEOM);
      expect(onGrid(o.race)).toEqual([]);
      for (const k of Object.keys(o.race) as (keyof RaceControls)[]) {
        expect(o.race[k]).toBeGreaterThanOrEqual(boat.controls[k].min);
        expect(o.race[k]).toBeLessThanOrEqual(boat.controls[k].max);
      }
    }
  });

  it('never touches a control outside TRIM_CONTROLS', () => {
    const o = optimalTrim(boat, from(mistrim), up, {}, GEOM);
    for (const k of ['inhauler', 'mainHalyard', 'jibHalyard'] as const) {
      expect(TRIM_CONTROLS).not.toContain(k);
      expect(o.race[k]).toBe(mistrim[k]);
      expect(o.moved).not.toContain(k);
    }
  });

  it('respects the sweep budget: fewer sweeps, fewer solves, no worse than the start', () => {
    const base = trimmed(boat, from(mistrim), up, GEOM);
    const small = optimalTrim(boat, from(mistrim), up, { sweeps: 1 }, GEOM);
    const big = optimalTrim(boat, from(mistrim), up, {}, GEOM);
    expect(small.iters).toBeLessThan(big.iters);
    expect(small.result.vmgKt.value).toBeGreaterThanOrEqual(base.vmgKt.value);
    expect(big.result.vmgKt.value).toBeGreaterThanOrEqual(small.result.vmgKt.value);
  });

  it('stops at a control stop instead of stepping off the grid', () => {
    // Backstay hard on, traveller hard down: the ± probe has one legal side.
    const atStops = { ...baseRace(), backstay: 100, traveller: -100 };
    const o = optimalTrim(boat, from(atStops), up, { sweeps: 2 }, GEOM);
    expect(o.race.backstay).toBeLessThanOrEqual(boat.controls.backstay.max);
    expect(o.race.traveller).toBeGreaterThanOrEqual(boat.controls.traveller.min);
  });
});

describe('snap', () => {
  it('lands on the grid and clamps to the stops', () => {
    const s = boat.controls.jibLead; // 0..10 step 1
    expect(snap(s, 3.4)).toBe(3);
    expect(snap(s, 3.6)).toBe(4);
    expect(snap(s, -2)).toBe(0);
    expect(snap(s, 99)).toBe(10);
    const t = boat.controls.traveller; // -100..100 step 5
    expect(snap(t, -37)).toBe(-35);
    expect(snap(t, 2)).toBe(0);
  });
});

describe('optimalTrim sheeting sanity (ux follow-up)', () => {
  const dock = { upperTurns: 0, lowerTurns: 0, forestayMm: 0 };
  const race = {
    backstay: 30,
    mainsheet: 70,
    traveller: 20,
    cunningham: 20,
    outhaul: 60,
    vang: 30,
    jibSheet: 70,
    jibLead: 5,
    inhauler: 20,
    mainHalyard: 50,
    jibHalyard: 50,
  };
  const down = { kiteHalyard: 50, tackLine: 50, kiteSheet: 50, sprit: 0 };
  const sea = { seaState: 1, crewKg: 300 } as const;
  it('does not dump the sheets in breeze upwind', () => {
    const o = optimalTrim(
      boat,
      { dock, race, down },
      { ...sea, twsKt: 16, twaDeg: 38, sailset: 'jib' },
    );
    expect(o.race.mainsheet).toBeGreaterThanOrEqual(50);
    expect(o.race.jibSheet).toBeGreaterThanOrEqual(50);
  });
  it('eases the sheets on a beam reach', () => {
    const o = optimalTrim(
      boat,
      { dock, race, down },
      { ...sea, twsKt: 10, twaDeg: 90, sailset: 'jib' },
    );
    expect(o.race.mainsheet).toBeLessThan(race.mainsheet);
    expect(o.race.jibSheet).toBeLessThan(race.jibSheet);
  });
  it('eases the main on a run rather than pinning it', () => {
    const o = optimalTrim(
      boat,
      { dock, race, down },
      { ...sea, twsKt: 10, twaDeg: 149, sailset: 'asym' },
    );
    expect(o.race.mainsheet).toBeLessThan(40);
  });
});
