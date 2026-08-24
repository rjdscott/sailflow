import { describe, expect, it } from 'vitest';
import type { BoatDefinition } from '../types';
import j70 from '../../../data/boats/j70.json';
import { baseDock, baseRace } from '../shape/base';
import { hikeFraction, seedFor, solveEquilibrium } from './equilibrium';
import { trimmed } from './trimmed';
import { backstayFromFlat, optimal } from './optimal';
import { candidateGrid, forecastPmf, scoreDockSetups } from './dock';

const boat = j70 as unknown as BoatDefinition;
const up = { twsKt: 10, twaDeg: 42, seaState: 1 as const, crewKg: 300, sailset: 'jib' as const };
const dn = { twsKt: 10, twaDeg: 150, seaState: 1 as const, crewKg: 300, sailset: 'asym' as const };
const tune = { flat: 1, reef: 1, twistEffDeg: 10 };

describe('equilibrium', () => {
  it('converges upwind and downwind with tiny residuals', () => {
    for (const c of [up, dn]) {
      const e = solveEquilibrium(boat, { condition: c, tune });
      expect(e.converged).toBe(true);
      expect(Math.max(...e.residuals.map(Math.abs))).toBeLessThan(1e-6);
      expect(e.bsKt).toBeGreaterThan(2);
      expect(e.heelDeg).toBeGreaterThanOrEqual(0);
    }
  });
  it('is deterministic and independent of call order', () => {
    const a1 = solveEquilibrium(boat, { condition: up, tune });
    const b1 = solveEquilibrium(boat, { condition: dn, tune });
    const b2 = solveEquilibrium(boat, { condition: dn, tune });
    const a2 = solveEquilibrium(boat, { condition: up, tune });
    expect(a1).toEqual(a2);
    expect(b1).toEqual(b2);
  });
  it('mirrors on the other tack', () => {
    const s = solveEquilibrium(boat, { condition: up, tune });
    const p = solveEquilibrium(boat, { condition: { ...up, twaDeg: -up.twaDeg }, tune });
    expect(p.bsKt).toBeCloseTo(s.bsKt, 9);
    expect(p.heelDeg).toBeCloseTo(-s.heelDeg, 9);
    expect(p.leewayDeg).toBeCloseTo(-s.leewayDeg, 9);
  });
  it('more wind means more heel and more speed at fixed trim', () => {
    const a = solveEquilibrium(boat, { condition: { ...up, twsKt: 6 }, tune });
    const b = solveEquilibrium(boat, { condition: { ...up, twsKt: 12 }, tune });
    expect(b.heelDeg).toBeGreaterThan(a.heelDeg);
    expect(b.bsKt).toBeGreaterThan(a.bsKt);
  });
  it('seed table is monotone in TWS and hike fraction ramps 0..1', () => {
    expect(seedFor({ ...up, twsKt: 6 })[0]).toBeLessThan(seedFor({ ...up, twsKt: 14 })[0]);
    expect(hikeFraction(boat, 0)).toBe(0);
    expect(hikeFraction(boat, 100)).toBe(1);
    expect(hikeFraction(boat, 4)).toBeGreaterThan(0);
  });
});

describe('trimmed', () => {
  it('returns tiers per ADR 0006 upwind under jib', () => {
    const r = trimmed(boat, { dock: baseDock(), race: baseRace() }, up);
    expect(r.bsKt.tier).toBe('A');
    expect(r.heelDeg.tier).toBe('B');
    expect(r.shape.main && r.shape.jib).toBeTruthy();
  });
  it('backstay on flattens the main and reduces heeling moment', () => {
    const off = trimmed(boat, { dock: baseDock(), race: { ...baseRace(), backstay: 0 } }, up);
    const on = trimmed(boat, { dock: baseDock(), race: { ...baseRace(), backstay: 100 } }, up);
    expect(on.shape.main!.half.draft).toBeLessThan(off.shape.main!.half.draft);
    expect(on.aero.mxNm).toBeLessThan(off.aero.mxNm);
  });
  it('race controls cannot change the rig geometry set at the dock', () => {
    const a = trimmed(boat, { dock: baseDock(), race: { ...baseRace(), mainsheet: 0 } }, up);
    const b = trimmed(boat, { dock: baseDock(), race: { ...baseRace(), mainsheet: 100 } }, up);
    expect(a.rig.rakeMm).toBe(b.rig.rakeMm);
    expect(a.rig.upperN).toBe(b.rig.upperN);
  });
});

describe('optimal', () => {
  it('maps flat to backstay monotonically', () => {
    expect(backstayFromFlat(1)).toBe(0);
    expect(backstayFromFlat(0.42)).toBe(100);
    expect(backstayFromFlat(0.7)).toBeGreaterThan(backstayFromFlat(0.9));
  });
  it('finds an interior upwind VMG angle with VMG below boat speed', () => {
    const r = optimal(boat, baseDock(), up, { optimiseTwa: true });
    expect(r.converged).toBe(true);
    expect(r.twaDeg).toBeGreaterThan(35);
    expect(r.twaDeg).toBeLessThan(60);
    expect(r.vmgKt.value).toBeLessThan(r.bsKt.value);
    expect(r.vmgKt.value).toBeGreaterThan(0);
  });
  it('finds an interior downwind VMG angle', () => {
    const r = optimal(boat, baseDock(), dn, { optimiseTwa: true });
    expect(r.converged).toBe(true);
    expect(r.twaDeg).toBeGreaterThan(120);
    expect(r.twaDeg).toBeLessThan(178);
    expect(r.vmgKt.value).toBeLessThan(0);
  });
  it('depowers more in more wind', () => {
    const light = optimal(boat, baseDock(), { ...up, twsKt: 8 }, { optimiseTwa: false });
    const heavy = optimal(boat, baseDock(), { ...up, twsKt: 20 }, { optimiseTwa: false });
    expect(heavy.aero.flat).toBeLessThanOrEqual(light.aero.flat);
  });
});

describe('dock scoring', () => {
  it('forecast pmf sums to one, is single-peaked at the likely wind', () => {
    const pmf = forecastPmf({ minKt: 8, likelyKt: 12, maxKt: 16, seaState: 1, crewKg: 300 });
    expect(pmf.reduce((a, b) => a + b.p, 0)).toBeCloseTo(1, 12);
    const peak = pmf.reduce((a, b) => (b.p > a.p ? b : a));
    expect(peak.twsKt).toBe(12);
    expect(forecastPmf({ minKt: 10, likelyKt: 10, maxKt: 10, seaState: 0, crewKg: 300 })).toEqual([
      { twsKt: 10, p: 1 },
    ]);
  });
  it('candidate grid is legal and non-empty', () => {
    const g = candidateGrid();
    expect(g.length).toBeGreaterThan(20);
    for (const s of g) {
      expect(s.upperTurns).toBeGreaterThanOrEqual(boat.controls.upperTurns.min);
      expect(s.forestayMm).toBeLessThanOrEqual(boat.controls.forestayMm.max);
    }
  });
  it('regret is non-negative and zero for the best candidate at a single wind speed', () => {
    const setups = [baseDock(), { upperTurns: 4, lowerTurns: 2, forestayMm: 0 }];
    const scores = scoreDockSetups(
      boat,
      setups,
      { minKt: 10, likelyKt: 10, maxKt: 10, seaState: 1, crewKg: 300 },
      setups,
    );
    expect(scores).toHaveLength(2);
    const regrets = scores.map((s) => s.expectedRegretSPerMile.value);
    expect(Math.min(...regrets)).toBe(0);
    for (const r of regrets) expect(r).toBeGreaterThanOrEqual(0);
    expect(scores[0].perTws).toHaveLength(1);
  });
});
