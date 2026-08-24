import { describe, expect, it } from 'vitest';
import type { BoatDefinition, DockControls, RigState } from '../types';
import type { RigStateFn } from '../internal';
import { MAST_STATIONS } from '../geometry/rig';
import { peakBendMm, rigState } from './state';
import { baseDock } from '../shape/base';
import j70 from '../../../data/boats/j70.json';

const boat = { ...(j70 as unknown as BoatDefinition), calibration: {} }; // module tests run on default knobs;
const BASE_BACKSTAY = 30;

function sweep(spec: { min: number; max: number; step: number }): number[] {
  const out: number[] = [];
  for (let v = spec.min; v <= spec.max + 1e-9; v += spec.step) out.push(v);
  return out;
}

/** Asserts a series is strictly monotone in the given direction. */
function monotone(values: number[], dir: 1 | -1, label: string) {
  expect(values.length).toBeGreaterThan(2);
  for (let i = 1; i < values.length; i++)
    expect(
      dir * (values[i] - values[i - 1]),
      `${label} step ${i}: ${values[i - 1]} -> ${values[i]}`,
    ).toBeGreaterThan(0);
}

function at(dock: Partial<DockControls>, backstay = BASE_BACKSTAY): RigState {
  return rigState(boat, { ...baseDock(), ...dock }, backstay);
}

describe('rigState contract', () => {
  it('satisfies RigStateFn', () => {
    const fn: RigStateFn = rigState;
    expect(typeof fn).toBe('function');
  });

  it('reports 11 finite bend stations, zero at the partners and tip', () => {
    const r = at({});
    expect(r.bendMm).toHaveLength(MAST_STATIONS);
    for (const v of r.bendMm) expect(Number.isFinite(v)).toBe(true);
    expect(r.bendMm[0]).toBe(0);
    expect(r.bendMm[MAST_STATIONS - 1]).toBeCloseTo(0, 9);
  });

  it('is deterministic and does not alias its inputs', () => {
    const dock = baseDock();
    const a = rigState(boat, dock, 55);
    const b = rigState(boat, dock, 55);
    expect(a).toEqual(b);
    expect(a.bendMm).not.toBe(b.bendMm);
    expect(dock).toEqual(baseDock());
  });

  it('lands in plausible physical bands at the guide base setup', () => {
    const r = at({}, 0);
    expect(r.prebendMm).toBeGreaterThan(20); // North: 1.5-2.5 in of prebend
    expect(r.prebendMm).toBeLessThan(80);
    expect(r.sagMm).toBeGreaterThan(10);
    expect(r.sagMm).toBeLessThan(200);
    expect(r.rakeMm).toBeCloseTo(0, 9);
    expect(r.upperN).toBeGreaterThan(r.lowerN);
    expect(peakBendMm(r)).toBeGreaterThan(0);
  });
});

describe('backstay monotonicity', () => {
  const pcts = sweep(boat.controls.backstay);
  const states = pcts.map((p) => at({}, p));

  it('sweeps the full published range', () => {
    expect(pcts[0]).toBe(0);
    expect(pcts[pcts.length - 1]).toBe(100);
  });

  it('increases bend', () => {
    monotone(
      states.map((s) => peakBendMm(s)),
      1,
      'bend',
    );
  });

  it('increases forestay tension', () => {
    monotone(
      states.map((s) => s.forestayN),
      1,
      'forestayN',
    );
  });

  it('decreases forestay sag', () => {
    monotone(
      states.map((s) => s.sagMm),
      -1,
      'sagMm',
    );
  });

  it('leaves prebend, rake and shroud tensions alone', () => {
    for (const s of states) {
      expect(s.prebendMm).toBe(states[0].prebendMm);
      expect(s.rakeMm).toBe(states[0].rakeMm);
      expect(s.upperN).toBe(states[0].upperN);
      expect(s.lowerN).toBe(states[0].lowerN);
    }
  });
});

describe('upper shroud monotonicity', () => {
  const turns = sweep(boat.controls.upperTurns);
  const states = turns.map((t) => at({ upperTurns: t }));

  it('increases upper tension over the full range without clamping', () => {
    monotone(
      states.map((s) => s.upperN),
      1,
      'upperN',
    );
    expect(states[0].upperN).toBeGreaterThan(0);
  });

  it('increases forestay tension', () => {
    monotone(
      states.map((s) => s.forestayN),
      1,
      'forestayN',
    );
  });

  it('does not move the lower tension', () => {
    for (const s of states) expect(s.lowerN).toBe(states[0].lowerN);
  });
});

describe('lower shroud monotonicity', () => {
  const turns = sweep(boat.controls.lowerTurns);
  const states = turns.map((t) => at({ lowerTurns: t }));

  it('increases lower tension over the full range without clamping', () => {
    monotone(
      states.map((s) => s.lowerN),
      1,
      'lowerN',
    );
    expect(states[0].lowerN).toBeGreaterThan(0);
  });

  it('decreases prebend: tighter lowers straighten the mast', () => {
    monotone(
      states.map((s) => s.prebendMm),
      -1,
      'prebendMm',
    );
  });

  it('decreases total bend with prebend', () => {
    monotone(
      states.map((s) => peakBendMm(s)),
      -1,
      'bend',
    );
  });

  it('keeps prebend non-negative at the tight end', () => {
    expect(states[states.length - 1].prebendMm).toBeGreaterThanOrEqual(0);
  });
});

describe('forestay length monotonicity', () => {
  const mms = sweep(boat.controls.forestayMm);
  const states = mms.map((m) => at({ forestayMm: m }));

  it('increases rake', () => {
    monotone(
      states.map((s) => s.rakeMm),
      1,
      'rakeMm',
    );
    expect(states[0].rakeMm).toBeCloseTo(0, 9);
  });

  it('slackens the forestay and so increases sag', () => {
    monotone(
      states.map((s) => s.forestayN),
      -1,
      'forestayN',
    );
    monotone(
      states.map((s) => s.sagMm),
      1,
      'sagMm',
    );
    expect(states[states.length - 1].forestayN).toBeGreaterThan(100);
  });
});

describe('knobs', () => {
  it('rig.turnsToN scales the turns-to-tension conversion', () => {
    const soft = { ...boat, calibration: { 'rig.turnsToN': 0 } };
    expect(rigState(soft, { ...baseDock(), upperTurns: 6 }, 0).upperN).toBe(
      rigState(soft, baseDock(), 0).upperN,
    );
  });

  it('rig.prebendPerLowerTurnMm can be re-signed by calibration', () => {
    const flipped = { ...boat, calibration: { 'rig.prebendPerLowerTurnMm': 6 } };
    const loose = rigState(flipped, { ...baseDock(), lowerTurns: -6 }, 0).prebendMm;
    const tight = rigState(flipped, { ...baseDock(), lowerTurns: 6 }, 0).prebendMm;
    expect(tight).toBeGreaterThan(loose);
  });

  it('rig.EI stiffens the bend response without touching prebend', () => {
    const stiff = { ...boat, calibration: { 'rig.EI': 1.2e6 } };
    const a = rigState(boat, baseDock(), 100);
    const b = rigState(stiff, baseDock(), 100);
    expect(b.prebendMm).toBe(a.prebendMm);
    expect(peakBendMm(b)).toBeLessThan(peakBendMm(a));
  });
});
