import { describe, expect, it } from 'vitest';
import type { BoatDefinition } from '../types';
import type { HydroInput } from '../internal';
import { G, KT_TO_MS } from '../internal';
import { crewArmM, froude, frictionCoeff, hydroForces } from './index';
import { residuaryResistance, viscousResistance } from './resistance';
import { effectiveAspectRatio, inducedDrag, sideForce } from './keel';
import { crewRighting, hullRighting } from './righting';
import { addedResistanceWaves, significantHeightM } from './waves';
import j70 from '../../../data/boats/j70.json';

const BOAT = { ...(j70 as unknown as BoatDefinition), calibration: {} }; // module tests run on default knobs;

/** A copy of the J/70 with calibration knobs overridden. */
function withKnobs(calibration: Record<string, number>): BoatDefinition {
  return { ...BOAT, calibration: { ...BOAT.calibration, ...calibration } };
}

function input(over: Partial<HydroInput> = {}): HydroInput {
  return { bsKt: 6, heelDeg: 15, leewayDeg: 4, seaState: 2, crewKg: 300, ...over };
}

describe('resistance', () => {
  it('is exactly zero at rest, every part of it', () => {
    const r = hydroForces(BOAT, input({ bsKt: 0 }));
    expect(r.resistanceN).toBe(0);
    expect(r.parts.viscousN).toBe(0);
    expect(r.parts.residuaryN).toBe(0);
    expect(r.parts.inducedN).toBe(0);
    expect(r.parts.heelN).toBe(0);
    expect(r.parts.wavesN).toBe(0);
  });

  it('increases strictly with boat speed from 0 to 12 kt', () => {
    let prev = -1;
    for (let bsKt = 0; bsKt <= 12; bsKt += 0.25) {
      const r = hydroForces(BOAT, input({ bsKt })).resistanceN;
      expect(r).toBeGreaterThan(prev);
      prev = r;
    }
  });

  it('viscous resistance matches a hand-worked ITTC-57 case', () => {
    // Re = 1e7 -> Cf = 0.075 / (7 - 2)^2 = 0.003 exactly.
    expect(frictionCoeff(1e7)).toBeCloseTo(0.003, 12);
    // Re = 1e8 -> 0.075 / 36.
    expect(frictionCoeff(1e8)).toBeCloseTo(0.075 / 36, 12);
    // And the full Rv at that Re: V = Re * nu / Lwl.
    const vMs = (1e7 * 1.19e-6) / BOAT.hull.lwlM;
    const expected = 0.5 * 1025 * vMs * vMs * BOAT.hull.wettedM2 * 0.003 * 1.1;
    expect(viscousResistance(BOAT, vMs)).toBeCloseTo(expected, 9);
  });

  it('scales viscous resistance with the form-factor knob', () => {
    const base = viscousResistance(BOAT, 3);
    const stiff = viscousResistance(withKnobs({ 'hydro.formFactor': 0.2 }), 3);
    expect(stiff / base).toBeCloseTo(1.2 / 1.1, 9);
  });
});

describe('residuary multipliers', () => {
  const at = (boat: BoatDefinition, fn: number) =>
    residuaryResistance(boat, fn * Math.sqrt(G * boat.hull.lwlM));

  it('a bin knob scales its own bin and leaves the far bins alone', () => {
    const tuned = withKnobs({ 'hydro.rrMul.fn30': 2 });
    expect(at(tuned, 0.3)).toBeCloseTo(2 * at(BOAT, 0.3), 9);
    expect(at(tuned, 0.6)).toBeCloseTo(at(BOAT, 0.6), 9);
    expect(at(tuned, 0.2)).toBeCloseTo(at(BOAT, 0.2), 9);
  });

  it('interpolates linearly between adjacent bins', () => {
    const tuned = withKnobs({ 'hydro.rrMul.fn30': 2 });
    // Halfway between fn30 (2) and fn40 (1) the multiplier is 1.5.
    expect(at(tuned, 0.35) / at(BOAT, 0.35)).toBeCloseTo(1.5, 9);
  });

  it('holds the end bins constant outside the fitted range', () => {
    const tuned = withKnobs({ 'hydro.rrMul.fn20': 3, 'hydro.rrMul.fn60': 3 });
    expect(at(tuned, 0.1) / at(BOAT, 0.1)).toBeCloseTo(3, 9);
    expect(at(tuned, 0.8) / at(BOAT, 0.8)).toBeCloseTo(3, 9);
  });

  it('sheds residuary resistance above Fn 0.5 when planing relief is fitted', () => {
    const planing = withKnobs({ 'hydro.planingRelief': 0.5 });
    expect(at(planing, 0.4)).toBeCloseTo(at(BOAT, 0.4), 9);
    expect(at(planing, 0.6)).toBeCloseTo(0.9 * at(BOAT, 0.6), 9);
    expect(at(planing, 1.0)).toBeCloseTo(0.5 * at(BOAT, 1.0), 9);
  });
});

describe('heel drag', () => {
  it('is zero upright and grows with the square of heel', () => {
    expect(hydroForces(BOAT, input({ heelDeg: 0 })).parts.heelN).toBe(0);
    const a = hydroForces(BOAT, input({ heelDeg: 10 })).parts.heelN;
    const b = hydroForces(BOAT, input({ heelDeg: 20 })).parts.heelN;
    expect(b / a).toBeCloseTo(4, 6);
  });

  it('stays a small fraction of viscous resistance at sailing heel', () => {
    const r = hydroForces(BOAT, input({ heelDeg: 20 }));
    expect(r.parts.heelN / r.parts.viscousN).toBeLessThan(0.1);
  });
});

describe('keel side force', () => {
  it('is linear in leeway at small angles', () => {
    const one = sideForce(BOAT, 3, 0, 1);
    expect(sideForce(BOAT, 3, 0, 2)).toBeCloseTo(2 * one, 9);
    expect(sideForce(BOAT, 3, 0, 3)).toBeCloseTo(3 * one, 9);
    expect(sideForce(BOAT, 3, 0, 0)).toBe(0);
  });

  it('grows with the square of boat speed', () => {
    expect(sideForce(BOAT, 4, 0, 4) / sideForce(BOAT, 2, 0, 4)).toBeCloseTo(4, 9);
  });

  it('falls with heel, because the athwartships span does', () => {
    const upright = sideForce(BOAT, 3, 0, 4);
    const heeled = sideForce(BOAT, 3, 25, 4);
    expect(heeled).toBeLessThan(upright);
    expect(effectiveAspectRatio(BOAT, 25)).toBeLessThan(effectiveAspectRatio(BOAT, 0));
  });

  it('picks up the hull-lift fraction knob', () => {
    const none = sideForce(withKnobs({ 'hydro.hullLiftFrac': 0 }), 3, 0, 4);
    expect(sideForce(BOAT, 3, 0, 4) / none).toBeCloseTo(1.3, 9);
  });
});

describe('induced drag', () => {
  it('goes as the square of side force', () => {
    const a = inducedDrag(BOAT, 3, 0, 500);
    expect(inducedDrag(BOAT, 3, 0, 1000)).toBeCloseTo(4 * a, 9);
    expect(inducedDrag(BOAT, 3, 0, 0)).toBe(0);
  });

  it('matches the closed form Fy^2 / (2 q pi s^2)', () => {
    const q = 0.5 * 1025 * 3 * 3;
    const s = BOAT.hull.keelSpanM;
    expect(inducedDrag(BOAT, 3, 0, 800)).toBeCloseTo(800 ** 2 / (2 * q * Math.PI * s * s), 6);
  });

  it('is zero at rest rather than infinite', () => {
    expect(inducedDrag(BOAT, 0, 0, 0)).toBe(0);
  });
});

describe('righting moment', () => {
  it('reproduces the certificate slope at 1 degree with no crew', () => {
    expect(hullRighting(BOAT, 1)).toBeCloseTo(18.5 * G, 9);
    expect(hullRighting(BOAT, 5)).toBeCloseTo(5 * 18.5 * G, 9);
    expect(hullRighting(BOAT, 0)).toBe(0);
    expect(hydroForces(BOAT, input({ heelDeg: 1, crewKg: 0 })).rightingNm).toBeCloseTo(18.5 * G, 9);
  });

  it('tapers past the knee instead of staying linear', () => {
    expect(hullRighting(BOAT, 60)).toBeLessThan(60 * 18.5 * G);
    // Below the knee it is still exactly linear.
    expect(hullRighting(BOAT, 24)).toBeCloseTo(24 * 18.5 * G, 9);
    const early = withKnobs({ 'hydro.rmKnee': 10 });
    expect(hullRighting(early, 24)).toBeLessThan(hullRighting(BOAT, 24));
  });

  it('increases monotonically with heel up to 30 degrees', () => {
    let prev = -1;
    for (let heelDeg = 0; heelDeg <= 30; heelDeg += 0.5) {
      const rm = hullRighting(BOAT, heelDeg);
      expect(rm).toBeGreaterThan(prev);
      prev = rm;
    }
  });

  it('increases with crew weight', () => {
    const light = hydroForces(BOAT, input({ crewKg: 255 })).rightingNm;
    const heavy = hydroForces(BOAT, input({ crewKg: 340 })).rightingNm;
    expect(heavy).toBeGreaterThan(light);
    expect(crewRighting(BOAT, 0, 15)).toBe(0);
  });

  it('never lets the crew arm out past the lifeline, whatever the knob says', () => {
    const half = BOAT.hull.beamM / 2;
    expect(crewArmM(BOAT)).toBeGreaterThan(0);
    expect(crewArmM(BOAT)).toBeLessThanOrEqual(half);
    expect(crewArmM(withKnobs({ 'hydro.crewArmMul': 5 }))).toBeLessThanOrEqual(half);
    expect(crewArmM(withKnobs({ 'hydro.crewArmMul': 0 }))).toBeLessThanOrEqual(half);
  });

  it('falls off with cos(heel) for the crew term', () => {
    expect(crewRighting(BOAT, 300, 30) / crewRighting(BOAT, 300, 0)).toBeCloseTo(
      Math.cos(Math.PI / 6),
      9,
    );
  });
});

describe('added resistance in waves', () => {
  const vMs = 6 * KT_TO_MS;

  it('is exactly zero in flat water', () => {
    expect(addedResistanceWaves(BOAT, vMs, 0)).toBe(0);
    expect(significantHeightM(0)).toBe(0);
  });

  it('increases with sea state', () => {
    for (const s of [1, 2, 3] as const) {
      expect(addedResistanceWaves(BOAT, vMs, (s + 1) as 2 | 3 | 4)).toBeGreaterThan(
        addedResistanceWaves(BOAT, vMs, s),
      );
      expect(significantHeightM((s + 1) as 2 | 3 | 4)).toBeGreaterThan(significantHeightM(s));
    }
  });

  it('increases with boat speed and is zero at rest', () => {
    expect(addedResistanceWaves(BOAT, 0, 4)).toBe(0);
    let prev = -1;
    for (let bsKt = 0; bsKt <= 12; bsKt += 0.5) {
      const raw = addedResistanceWaves(BOAT, bsKt * KT_TO_MS, 3);
      expect(raw).toBeGreaterThan(prev);
      prev = raw;
    }
  });

  it('scales linearly with the wavesK knob', () => {
    const one = addedResistanceWaves(withKnobs({ 'hydro.wavesK': 1 }), vMs, 3);
    const half = addedResistanceWaves(withKnobs({ 'hydro.wavesK': 0.5 }), vMs, 3);
    expect(half).toBeCloseTo(0.5 * one, 9);
    expect(addedResistanceWaves(withKnobs({ 'hydro.wavesK': 0 }), vMs, 3)).toBe(0);
  });

  it('stays a minority of total resistance at the default scale', () => {
    // The whole point of the fitted-down fallback: waves must not swamp the
    // hull. If someone retunes wavesK this test is the tripwire.
    for (const seaState of [1, 2, 3, 4] as const) {
      const r = hydroForces(BOAT, input({ bsKt: 6, seaState }));
      expect(r.parts.wavesN / r.resistanceN).toBeLessThan(0.5);
      expect(r.parts.wavesN).toBeGreaterThan(0);
    }
  });
});

describe('hydroForces assembly', () => {
  it('sums its parts into the reported totals', () => {
    const r = hydroForces(BOAT, input());
    const { viscousN, residuaryN, inducedN, heelN, wavesN, hullRmNm, crewRmNm } = r.parts;
    expect(viscousN + residuaryN + inducedN + heelN + wavesN).toBeCloseTo(r.resistanceN, 9);
    expect(hullRmNm + crewRmNm).toBeCloseTo(r.rightingNm, 9);
    for (const part of Object.values(r.parts)) expect(Number.isFinite(part)).toBe(true);
  });

  it('is deterministic', () => {
    const a = hydroForces(BOAT, input());
    const b = hydroForces(BOAT, input());
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('lands in a plausible range for the J/70 upwind', () => {
    const r = hydroForces(BOAT, input({ bsKt: 6, heelDeg: 18, leewayDeg: 4, seaState: 0 }));
    // A few hundred newtons of drag and a kilonewton-ish of side force.
    expect(r.resistanceN).toBeGreaterThan(150);
    expect(r.resistanceN).toBeLessThan(900);
    expect(r.sideForceN).toBeGreaterThan(400);
    expect(r.sideForceN).toBeLessThan(2500);
    expect(froude(BOAT, 6 * KT_TO_MS)).toBeCloseTo(0.381, 3);
  });
});
