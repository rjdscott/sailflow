import { describe, expect, it } from 'vitest';
import j70 from '../../../../data/boats/j70.json';
import type { AeroState, BoatDefinition } from '../../types';
import type { AeroInput, ShapeDeltas } from '../../internal';
import { aeroForces, apparentWind, fallbackGeometry, roachOf, windAt } from './forces';
import { WIND_Z_REF_M } from './tables';
import { PARACHUTE_AWA_HI, PARACHUTE_AWA_LO } from '../shape/sensitivity';

const boat = { ...(j70 as unknown as BoatDefinition), calibration: {} }; // module tests run on default knobs;

function withCalibration(cal: Record<string, number>): BoatDefinition {
  return { ...boat, calibration: { ...boat.calibration, ...cal } };
}

const BASE: AeroInput = {
  twsKt: 10,
  twaDeg: 45,
  bsKt: 6,
  heelDeg: 0,
  leewayDeg: 0,
  sailset: 'jib',
  tune: { flat: 1, reef: 1, twistEffDeg: 0 },
};

function run(over: Partial<AeroInput> = {}, b: BoatDefinition = boat): AeroState {
  return aeroForces(b, { ...BASE, ...over, tune: { ...BASE.tune, ...over.tune } });
}

// ---------------------------------------------------------------------------
// Apparent wind triangle
// ---------------------------------------------------------------------------

describe('apparentWind (eqs 7.2, 7.3)', () => {
  it('matches the hand calculation: TWS 10, TWA 90, BS 5, upright', () => {
    // perp  = 10 * sin(90) * cos(0) = 10
    // along = 10 * cos(90) + 5      = 5
    // AWS = sqrt(100 + 25) = 11.180340;  AWA = atan(10/5) = 63.434949 deg
    const aw = apparentWind(10, 90, 5, 0);
    expect(aw.awsMs).toBeCloseTo(11.18034, 5);
    expect(aw.awaDeg).toBeCloseTo(63.43495, 5);
  });

  it('head to wind the apparent wind is the sum, dead astern the difference', () => {
    expect(apparentWind(10, 0, 5, 0).awsMs).toBeCloseTo(15, 12);
    expect(apparentWind(10, 0, 5, 0).awaDeg).toBeCloseTo(0, 12);
    expect(apparentWind(10, 180, 5, 0).awsMs).toBeCloseTo(5, 12);
    expect(apparentWind(10, 180, 5, 0).awaDeg).toBeCloseTo(180, 12);
  });

  it('heel shrinks only the perpendicular component, so both AWA and AWS fall', () => {
    const up = apparentWind(10, 60, 5, 0);
    const over = apparentWind(10, 60, 5, 25);
    expect(over.awaDeg).toBeLessThan(up.awaDeg);
    expect(over.awsMs).toBeLessThan(up.awsMs);
    // The along-track component is untouched: at TWA 90 the whole triangle
    // collapses onto cos(heel).
    expect(apparentWind(10, 90, 0, 25).awsMs).toBeCloseTo(10 * Math.cos((25 * Math.PI) / 180), 12);
  });

  it('is even in the sign of TWA and of heel', () => {
    expect(apparentWind(10, -60, 5, -20)).toEqual(apparentWind(10, 60, 5, 20));
  });
});

describe('wind gradient (eq 7.1)', () => {
  it('is the reference speed at the reference height', () => {
    expect(windAt(5, WIND_Z_REF_M)).toBeCloseTo(5, 12);
  });

  it('grows monotonically with height and is slower below the reference', () => {
    let prev = -1;
    for (let z = 0.5; z <= 20; z += 0.5) {
      const v = windAt(5, z);
      expect(v).toBeGreaterThan(prev);
      prev = v;
    }
    expect(windAt(5, 4)).toBeLessThan(5);
    expect(windAt(5, 15)).toBeGreaterThan(5);
  });
});

// ---------------------------------------------------------------------------
// Geometry fallback
// ---------------------------------------------------------------------------

describe('fallbackGeometry', () => {
  it('uses rated area and CE = 0.39*span + 0.9 m', () => {
    expect(fallbackGeometry(boat, 'main')).toEqual({
      areaM2: 16,
      ceHeightM: 0.39 * 7.974 + 0.9,
    });
    expect(fallbackGeometry(boat, 'jib').ceHeightM).toBeCloseTo(0.39 * 8.0 + 0.9, 12);
    expect(fallbackGeometry(boat, 'asym').ceHeightM).toBeCloseTo(0.39 * 10.8 + 0.9, 12);
  });

  it('puts the spinnaker CE highest and the main and jib close together', () => {
    const m = fallbackGeometry(boat, 'main').ceHeightM;
    const j = fallbackGeometry(boat, 'jib').ceHeightM;
    const a = fallbackGeometry(boat, 'asym').ceHeightM;
    expect(a).toBeGreaterThan(m);
    expect(Math.abs(m - j)).toBeLessThan(0.1);
  });
});

describe('roachOf (eq 5.3)', () => {
  it('is positive and modest for the J/70 square-top main', () => {
    const r = roachOf(boat);
    expect(r).toBeGreaterThan(0.2);
    expect(r).toBeLessThan(0.6);
    expect(r).toBeCloseTo(0.3577, 4);
  });
});

// ---------------------------------------------------------------------------
// Forces
// ---------------------------------------------------------------------------

describe('aeroForces upwind reference point', () => {
  const s = run();

  it('returns finite values in every field', () => {
    for (const v of Object.values(s)) expect(Number.isFinite(v)).toBe(true);
  });

  it('drives, heels to leeward, and produces a heeling moment', () => {
    expect(s.fxN).toBeGreaterThan(0);
    expect(s.fyN).toBeGreaterThan(0);
    expect(s.mxNm).toBeGreaterThan(0);
  });

  it('side force is of the documented order for a J/70 at TWA 45 / TWS 10 / BS 6', () => {
    // ~1.09 kN. Cross-check: 26 m2 of sail at CH ~1.32 in 13.7 kt of apparent
    // wind gives q*Aref*CH ~ 30.5 Pa * 26.0 m2 * 1.32. Against the J/70's
    // measured RM of 18.5 kg.m/deg (181 N.m/deg) the resulting 4.3 kN.m
    // heeling moment implies about 23 deg of heel at flat = 1, which is why
    // the VPP would be de-powering here. Both are plausible, so the band is
    // deliberately wide: this test catches an order-of-magnitude slip, not a
    // few percent.
    expect(s.fyN).toBeGreaterThan(500);
    expect(s.fyN).toBeLessThan(1500);
  });

  it('drive is a few hundred newtons, well under the side force', () => {
    expect(s.fxN).toBeGreaterThan(100);
    expect(s.fxN).toBeLessThan(800);
    expect(s.fxN).toBeLessThan(s.fyN);
  });

  it('the apparent wind is forward of and stronger than the true wind', () => {
    expect(s.awaDeg).toBeLessThan(45);
    expect(s.awaDeg).toBeGreaterThan(20);
    expect(s.awsKt).toBeGreaterThan(10);
  });

  it('the centre of effort sits between the deck and the masthead', () => {
    expect(s.ceHeightM).toBeGreaterThan(1);
    expect(s.ceHeightM).toBeLessThan(boat.rig.mastLenM);
  });

  it('echoes the applied tune back', () => {
    expect(s.flat).toBe(1);
    expect(s.reef).toBe(1);
    expect(s.twistEff).toBe(0);
  });
});

describe('determinism', () => {
  it('same inputs, same outputs, every time', () => {
    const a = run();
    const b = run();
    expect(a).toEqual(b);
    for (let i = 0; i < 20; i++) expect(run()).toEqual(a);
  });

  it('holds across the whole polar grid', () => {
    for (const twsKt of [6, 10, 16, 20]) {
      for (const twaDeg of [40, 60, 90, 120, 165]) {
        const sailset = twaDeg < 80 ? 'jib' : 'asym';
        const o = { twsKt, twaDeg, sailset } as const;
        expect(run(o)).toEqual(run(o));
      }
    }
  });
});

describe('tack symmetry', () => {
  it('a mirrored TWA gives the same drive and mirrored side force and moment', () => {
    const stbd = run({ twaDeg: 45 });
    const port = run({ twaDeg: -45 });
    expect(port.fxN).toBeCloseTo(stbd.fxN, 12);
    expect(port.fyN).toBeCloseTo(-stbd.fyN, 12);
    expect(port.mxNm).toBeCloseTo(-stbd.mxNm, 12);
    expect(port.awaDeg).toBeCloseTo(-stbd.awaDeg, 12);
    expect(port.awsKt).toBeCloseTo(stbd.awsKt, 12);
    expect(Math.abs(port.fyN)).toBeCloseTo(Math.abs(stbd.fyN), 12);
  });

  it('holds downwind under the asymmetric too', () => {
    const stbd = run({ twaDeg: 140, sailset: 'asym' });
    const port = run({ twaDeg: -140, sailset: 'asym' });
    expect(port.fxN).toBeCloseTo(stbd.fxN, 12);
    expect(port.fyN).toBeCloseTo(-stbd.fyN, 12);
  });
});

describe('heel', () => {
  it('reduces drive monotonically', () => {
    let prev = Infinity;
    for (const heelDeg of [0, 2, 5, 10, 15, 20, 25, 30]) {
      const s = run({ heelDeg });
      expect(s.fxN).toBeLessThan(prev);
      prev = s.fxN;
    }
  });

  it('reduces the heeling moment substantially by 30 deg', () => {
    // Side force is not monotonic in the first few degrees: heel drops the AWA
    // as well as the AWS, and CH = CL*cos(beta) + CD*sin(beta) briefly gains
    // more from the smaller beta than it loses from the smaller dynamic head.
    // The moment, which also carries cos(heel), is not affected by that.
    const up = run({ heelDeg: 0 });
    const over = run({ heelDeg: 30 });
    expect(over.mxNm).toBeLessThan(up.mxNm * 0.85);
    expect(over.fyN).toBeLessThan(up.fyN);
  });

  it('is even in the sign of heel', () => {
    expect(run({ heelDeg: -18 })).toEqual(run({ heelDeg: 18 }));
  });
});

describe('flat (de-powering, §5.1.3)', () => {
  it('flat = 0.5 halves the sailplan lift coefficient, so side force falls sharply', () => {
    const full = run({ twsKt: 16, tune: { ...BASE.tune, flat: 1 } });
    const half = run({ twsKt: 16, tune: { ...BASE.tune, flat: 0.5 } });
    // Lift halves exactly (eq 5.48); the reported side force also carries the
    // unflattened parasitic and windage drag, so it falls by a little less.
    expect(half.fyN).toBeLessThan(full.fyN * 0.62);
    expect(half.fyN).toBeGreaterThan(full.fyN * 0.45);
  });

  it('reduces the heeling moment monotonically', () => {
    let prev = Infinity;
    for (let flat = 1; flat >= 0.42; flat -= 0.02) {
      const s = run({ twsKt: 16, tune: { ...BASE.tune, flat } });
      expect(s.mxNm).toBeLessThan(prev);
      prev = s.mxNm;
    }
  });

  it('reduces drive monotonically as well: de-powering is not free', () => {
    let prev = Infinity;
    for (let flat = 1; flat >= 0.42; flat -= 0.02) {
      const s = run({ twsKt: 16, tune: { ...BASE.tune, flat } });
      expect(s.fxN).toBeLessThan(prev);
      prev = s.fxN;
    }
  });

  it('lowers the centre of effort through the twist function', () => {
    expect(run({ tune: { ...BASE.tune, flat: 0.5 } }).ceHeightM).toBeLessThan(
      run({ tune: { ...BASE.tune, flat: 1 } }).ceHeightM,
    );
  });

  it('clamps flat to the 2023 minimum of 0.42', () => {
    expect(run({ tune: { ...BASE.tune, flat: 0.1 } }).flat).toBe(0.42);
    expect(run({ tune: { ...BASE.tune, flat: 1.4 } }).flat).toBe(1);
    expect(run({ tune: { ...BASE.tune, flat: 0.1 } })).toEqual(
      run({ tune: { ...BASE.tune, flat: 0.42 } }),
    );
  });
});

describe('reef', () => {
  const at = (reef: number) =>
    run({ twsKt: 20, tune: { flat: 0.42, reef, twistEffDeg: 12 }, heelDeg: 20 });

  it('reduces the centre of effort monotonically', () => {
    let prev = Infinity;
    for (let reef = 1; reef >= 0.4; reef -= 0.05) {
      const s = at(reef);
      expect(s.ceHeightM).toBeLessThan(prev);
      prev = s.ceHeightM;
    }
  });

  it('reduces side force and heeling moment monotonically as area comes off', () => {
    let prevFy = Infinity;
    let prevMx = Infinity;
    for (let reef = 1; reef >= 0.4; reef -= 0.05) {
      const s = at(reef);
      expect(s.fyN).toBeLessThan(prevFy);
      expect(s.mxNm).toBeLessThan(prevMx);
      prevFy = s.fyN;
      prevMx = s.mxNm;
    }
  });

  it('taking the jib off entirely (reef 0.5) still leaves the full mainsail driving', () => {
    const s = at(0.5);
    expect(s.fyN).toBeGreaterThan(0);
    expect(s.reef).toBe(0.5);
  });

  it('is clamped into [0, 1]', () => {
    expect(run({ tune: { ...BASE.tune, reef: 3 } }).reef).toBe(1);
    expect(run({ tune: { ...BASE.tune, reef: -1 } }).reef).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Shape deltas (INVENTED layer)
// ---------------------------------------------------------------------------

describe('shape deltas', () => {
  const zero: ShapeDeltas = { dCLmax: 0, dCD0: 0, dCEh: 0, dTwistDeg: 0 };

  it('zero deltas are indistinguishable from no deltas', () => {
    expect(run({ deltas: zero })).toEqual(run());
  });

  it('a negative dCLmax reduces both drive and side force', () => {
    const base = run();
    const flatter = run({ deltas: { ...zero, dCLmax: -0.15 } });
    expect(flatter.fxN).toBeLessThan(base.fxN);
    expect(flatter.fyN).toBeLessThan(base.fyN);
  });

  it('a positive dCLmax raises both, so the sign is not accidentally inverted', () => {
    const base = run();
    const fuller = run({ deltas: { ...zero, dCLmax: 0.15 } });
    expect(fuller.fxN).toBeGreaterThan(base.fxN);
    expect(fuller.fyN).toBeGreaterThan(base.fyN);
  });

  it('added parasitic drag costs drive', () => {
    expect(run({ deltas: { ...zero, dCD0: 0.05 } }).fxN).toBeLessThan(run().fxN);
  });

  it('a lower CE reduces the heeling moment without touching the forces', () => {
    const base = run();
    const lower = run({ deltas: { ...zero, dCEh: -0.1 } });
    expect(lower.ceHeightM).toBeLessThan(base.ceHeightM);
    expect(lower.mxNm).toBeLessThan(base.mxNm);
    expect(lower.fxN).toBeCloseTo(base.fxN, 9);
    expect(lower.fyN).toBeCloseTo(base.fyN, 9);
  });

  it('more twist lowers the CE and shows up in the reported twistEff', () => {
    const base = run();
    const twisted = run({ deltas: { ...zero, dTwistDeg: 10 } });
    expect(twisted.twistEff).toBe(10);
    expect(twisted.ceHeightM).toBeLessThan(base.ceHeightM);
    expect(twisted.mxNm).toBeLessThan(base.mxNm);
  });

  it('deltas are monotonic in dCLmax across their plausible range', () => {
    let prev = -Infinity;
    for (let d = -0.3; d <= 0.3001; d += 0.05) {
      const s = run({ deltas: { ...zero, dCLmax: d } });
      expect(s.fyN).toBeGreaterThan(prev);
      prev = s.fyN;
    }
  });
});

// ---------------------------------------------------------------------------
// Sailsets, geometry injection, knobs
// ---------------------------------------------------------------------------

describe('sailsets', () => {
  it('the asymmetric drives hard downwind', () => {
    for (const twaDeg of [110, 130, 150, 165]) {
      const s = run({ twaDeg, sailset: 'asym', bsKt: 7 });
      expect(s.fxN).toBeGreaterThan(0);
      expect(s.fyN).toBeGreaterThan(0);
      expect(s.mxNm).toBeGreaterThan(0);
    }
  });

  it('beats the jib for drive at 130 deg, which is why the crossover exists', () => {
    const kite = run({ twaDeg: 130, sailset: 'asym', bsKt: 7 });
    const jib = run({ twaDeg: 130, sailset: 'jib', bsKt: 7 });
    expect(kite.fxN).toBeGreaterThan(jib.fxN);
  });

  it('loses to the jib upwind, likewise', () => {
    const kite = run({ twaDeg: 45, sailset: 'asym' });
    const jib = run({ twaDeg: 45, sailset: 'jib' });
    expect(jib.fxN).toBeGreaterThan(kite.fxN);
  });
});

describe('injected geometry', () => {
  it('overrides the fallback', () => {
    const big = aeroForces(boat, BASE, {
      main: { areaM2: 24, ceHeightM: 5.0 },
      jib: { areaM2: 15, ceHeightM: 5.0 },
    });
    const base = run();
    expect(big.fxN).toBeGreaterThan(base.fxN);
    expect(big.fyN).toBeGreaterThan(base.fyN);
    expect(big.ceHeightM).toBeGreaterThan(base.ceHeightM);
  });

  it('a partial injection falls back for the sails it does not cover', () => {
    const partial = aeroForces(boat, BASE, { main: fallbackGeometry(boat, 'main') });
    expect(partial).toEqual(run());
  });
});

describe('coefficient set knob', () => {
  it('high lift beats medium beats low, for the main and the jib alike', () => {
    const lo = run({}, withCalibration({ 'aero.mainSet': 0, 'aero.jibSet': 0 }));
    const md = run({}, withCalibration({ 'aero.mainSet': 1, 'aero.jibSet': 1 }));
    const hi = run({}, withCalibration({ 'aero.mainSet': 2, 'aero.jibSet': 2 }));
    expect(md.fyN).toBeGreaterThan(lo.fyN);
    expect(hi.fyN).toBeGreaterThan(md.fyN);
  });

  it('defaults to the medium set for the J/70 (backstay, no runners)', () => {
    expect(run()).toEqual(run({}, withCalibration({ 'aero.mainSet': 1, 'aero.jibSet': 1 })));
  });
});

describe('other knobs move the answer in the right direction', () => {
  it('the base of I sets how much of the CE the twist function can lower', () => {
    // At flat = 1 and reef = 1 the arm is HBI + (CE - HBI), so HBI cancels
    // exactly -- which is the correct behaviour, not a missing dependency.
    const full = { tune: { ...BASE.tune, flat: 1 } };
    expect(run(full, withCalibration({ 'aero.hbiM': 1.5 })).ceHeightM).toBeCloseTo(
      run(full).ceHeightM,
      9,
    );
    // De-powered, the twist function only acts on the part above HBI, so a
    // higher base of I leaves the centre of effort higher.
    const soft = { tune: { ...BASE.tune, flat: 0.5 } };
    expect(run(soft, withCalibration({ 'aero.hbiM': 1.5 })).ceHeightM).toBeGreaterThan(
      run(soft).ceHeightM,
    );
  });

  it('a longer boom-above-sheer makes the rig less fractional, so it de-powers less', () => {
    // frac = I / (P*rfm + BAS): a bigger BAS lowers fractionality, and eq
    // (5.49) says fractional rigs lower their CE more for a given flat.
    const soft = { tune: { ...BASE.tune, flat: 0.5 } };
    expect(run(soft, withCalibration({ 'aero.basM': 1.6 })).ceHeightM).toBeLessThan(
      run(soft).ceHeightM,
    );
  });

  it('more crew is more windage, so less drive', () => {
    expect(run({}, withCalibration({ 'aero.crewCount': 5 })).fxN).toBeLessThan(run().fxN);
  });

  it('a fatter mast section costs drive', () => {
    expect(run({}, withCalibration({ 'aero.mastFrontM': 0.3 })).fxN).toBeLessThan(run().fxN);
  });
});

// ---------------------------------------------------------------------------
// The parachute-regime CD knob (INVENTED, ADR 0018)
// ---------------------------------------------------------------------------

describe('aero.asymCdMul', () => {
  /** Deep run under the kite: TWS 14, TWA 172 lands at AWA ~165. */
  const DEEP = { sailset: 'asym', twaDeg: 172, twsKt: 14, bsKt: 5.8 } as const;
  /** Tight reach under the kite: AWA well below the changeover. */
  const REACH = { sailset: 'asym', twaDeg: 100, twsKt: 14, bsKt: 6.5 } as const;

  it('the deep run really is in the parachute regime and the reach is not', () => {
    expect(Math.abs(run(DEEP).awaDeg)).toBeGreaterThan(PARACHUTE_AWA_HI);
    expect(Math.abs(run(REACH).awaDeg)).toBeLessThan(PARACHUTE_AWA_LO);
  });

  it('raises drive on a deep run — the drag IS the drive there', () => {
    const on = run(DEEP, withCalibration({ 'aero.asymCdMul': 2.5 })).fxN;
    expect(on).toBeGreaterThan(run(DEEP).fxN * 1.3);
  });

  it('leaves a reach byte-identical — below the changeover the ramp is 1', () => {
    expect(run(REACH, withCalibration({ 'aero.asymCdMul': 2.5 }))).toEqual(run(REACH));
  });

  it('never touches the jib sailset, at any angle', () => {
    for (const twaDeg of [45, 100, 150]) {
      const over = { sailset: 'jib', twaDeg, twsKt: 14, bsKt: 6 } as const;
      expect(run(over, withCalibration({ 'aero.asymCdMul': 2.5 }))).toEqual(run(over));
    }
  });

  it('the default is ORC unmodified', () => {
    expect(run(DEEP, withCalibration({ 'aero.asymCdMul': 1 }))).toEqual(run(DEEP));
  });
});
