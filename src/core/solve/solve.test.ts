import { describe, expect, it } from 'vitest';
import type { BoatDefinition, DockControls } from '../types';
import j70 from '../../../data/boats/j70.json';
import { baseDock, baseRace } from '../shape/base';
import { hikeFraction, seedFor, solveEquilibrium } from './equilibrium';
import { trimmed } from './trimmed';
import { backstayFromFlat, optimal } from './optimal';
import {
  candidateGrid,
  DOCK_ITERS,
  forecastPmf,
  lapTimeHoursUncached,
  scoreDockSetups,
} from './dock';
import { geometryFor } from './equilibrium';

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
  it('floors flat at the sailset ORC minimum, 0.53 under the kite', () => {
    // prov: ORC VPP 2026 §5.1 footnote 3. Guards the sailset threading through
    // forces.ts, which a floor test on clampFlat alone would not catch.
    const deep = { flat: 0.1, reef: 1, twistEffDeg: 10 };
    expect(solveEquilibrium(boat, { condition: dn, tune: deep }).aero.flat).toBe(0.53);
    expect(solveEquilibrium(boat, { condition: up, tune: deep }).aero.flat).toBe(0.42);
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
  /**
   * The score is tier B by design, not by accident of the wind range: half of
   * every lap time is a downwind leg the model does not fit (M-06). Tier A
   * would print without a band, which is the claim that must not be made.
   */
  it('scores a 6–20 kt jib forecast tier B, with a band', () => {
    const setups = [baseDock()];
    const [score] = scoreDockSetups(
      boat,
      setups,
      { minKt: 6, likelyKt: 12, maxKt: 20, seaState: 1, crewKg: 300 },
      setups,
    );
    const r = score.expectedRegretSPerMile;
    expect(r.tier).toBe('B');
    expect(r.band).toEqual([r.value - Math.abs(r.value) * 0.2, r.value + Math.abs(r.value) * 0.2]);
  });
  it('still drops to tier C above the polar range', () => {
    const setups = [baseDock()];
    const [score] = scoreDockSetups(
      boat,
      setups,
      { minKt: 20, likelyKt: 22, maxKt: 24, seaState: 1, crewKg: 300 },
      setups,
    );
    expect(score.expectedRegretSPerMile.tier).toBe('C');
  });
});

describe('optimal at a fixed angle', () => {
  it('maximises boat speed at 90° instead of collapsing flat to its floor', () => {
    const r = optimal(boat, baseDock(), { ...up, twaDeg: 90 }, { optimiseTwa: false });
    expect(r.converged).toBe(true);
    expect(r.aero.flat).toBeGreaterThan(0.6);
    const base = trimmed(boat, { dock: baseDock(), race: baseRace() }, { ...up, twaDeg: 90 });
    expect(r.bsKt.value).toBeGreaterThanOrEqual(base.bsKt.value - 0.05);
  });
});

describe('dock lap-time memo', () => {
  it('returns identical results on a second call and is much faster', () => {
    const f = { minKt: 9, likelyKt: 10, maxKt: 11, seaState: 1 as const, crewKg: 300 };
    const setups = [baseDock()];
    const cands = [baseDock(), { upperTurns: 2, lowerTurns: 1, forestayMm: 0 }];
    const t0 = performance.now();
    const a = scoreDockSetups(boat, setups, f, cands);
    const t1 = performance.now();
    const b = scoreDockSetups(boat, setups, f, cands);
    const t2 = performance.now();
    expect(b).toEqual(a);
    expect(t2 - t1).toBeLessThan((t1 - t0) / 5);
  });
});

describe('dock coarse solve budgets', () => {
  const geom = geometryFor(boat);
  const f = { minKt: 8, likelyKt: 12, maxKt: 16, seaState: 1 as const, crewKg: 300 };
  const FULL = { flat: 12, twa: 16 }; // `optimal`'s own defaults

  it('stays within 0.5 % of the full solve at three conditions', () => {
    const cases: [DockControls, number][] = [
      [baseDock(), 8],
      [{ upperTurns: 6, lowerTurns: 5, forestayMm: 30 }, 12],
      [{ upperTurns: -3, lowerTurns: -2, forestayMm: 0 }, 16],
    ];
    for (const [setup, twsKt] of cases) {
      const full = lapTimeHoursUncached(boat, setup, f, twsKt, geom, FULL);
      const coarse = lapTimeHoursUncached(boat, setup, f, twsKt, geom, DOCK_ITERS);
      expect(Math.abs(coarse - full) / full).toBeLessThan(0.005);
    }
  });

  it('is cheaper than the full budget it replaces', () => {
    const setup = { upperTurns: 2, lowerTurns: 3, forestayMm: 15 };
    const t0 = performance.now();
    lapTimeHoursUncached(boat, setup, f, 14, geom, FULL);
    const t1 = performance.now();
    lapTimeHoursUncached(boat, setup, f, 14, geom, DOCK_ITERS);
    expect(performance.now() - t1).toBeLessThan(t1 - t0);
  });
});

describe('dock scoring progress', () => {
  it('reports one step per lap, monotonically, ending at the total', () => {
    const setups = [baseDock()];
    const cands = [baseDock(), { upperTurns: 2, lowerTurns: 1, forestayMm: 0 }];
    const f = { minKt: 10, likelyKt: 11, maxKt: 12, seaState: 1 as const, crewKg: 300 };
    const seen: [number, number][] = [];
    scoreDockSetups(boat, setups, f, cands, undefined, (done, total) => seen.push([done, total]));
    // 2 candidates (baseDock is also the setup, deduped) x 3 wind speeds.
    expect(seen).toHaveLength(6);
    expect(seen.map(([done]) => done)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const [, total] of seen) expect(total).toBe(6);
  });

  it('does not change the result it reports on', () => {
    const setups = [baseDock(), { upperTurns: 3, lowerTurns: 1, forestayMm: 0 }];
    const f = { minKt: 10, likelyKt: 10, maxKt: 11, seaState: 1 as const, crewKg: 300 };
    const quiet = scoreDockSetups(boat, setups, f, setups);
    const noisy = scoreDockSetups(boat, setups, f, setups, undefined, () => {});
    expect(noisy).toEqual(quiet);
  });
});
