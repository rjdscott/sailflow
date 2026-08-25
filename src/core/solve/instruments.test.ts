import { describe, expect, it } from 'vitest';
import j70 from '../../../data/boats/j70.json';
import type { BoatDefinition, SailSet } from '../types';
import { polarTarget, POLAR_TWS } from '../reference/polar';
import { sheetingDeviation, sheetingEffect, TWIST_TO_AOA } from '../shape/sheeting';
import { baseDock, baseRace } from '../shape/base';
import { geometryFor } from './equilibrium';
import { trimmed } from './trimmed';
import {
  HELM_REF_NM,
  jibChordAtSpreaderM,
  jibLeechStripe,
  leechStallFrac,
  leechTwistDevDeg,
  LEECH_STALL_BAND,
  STRIPE_INCHES,
  helmLoad,
  PCT_POLAR_BAND,
} from './instruments';

const boat = j70 as unknown as BoatDefinition;

describe('polar lookup', () => {
  it('reproduces a printed cell exactly', () => {
    // ORC Speed Guide J/70, TWS 6, jib, 90°: 4.93 kt.
    expect(polarTarget(6, 90, 'jib').bsKt).toBeCloseTo(4.93, 10);
    expect(polarTarget(6, -90, 'jib').bsKt).toBeCloseTo(4.93, 10);
  });

  it('reads the sail it is asked for, not the faster one', () => {
    // At 6 kt the kite is over half a knot faster at 90°, so the two lookups
    // must differ: a boat under its jib is not sailing the kite's polar.
    expect(polarTarget(6, 90, 'asym').bsKt).toBeGreaterThan(polarTarget(6, 90, 'jib').bsKt);
  });

  it('interpolates between TWS columns', () => {
    const lo = polarTarget(10, 90, 'jib').bsKt;
    const hi = polarTarget(12, 90, 'jib').bsKt;
    expect(polarTarget(11, 90, 'jib').bsKt).toBeCloseTo((lo + hi) / 2, 10);
  });

  it('marks the grid it printed and the space outside it', () => {
    expect(polarTarget(12, 90, 'jib').inGrid).toBe(true);
    // Above the top TWS column, and inside the VMG angle the guide prints.
    expect(polarTarget(25, 90, 'jib').inGrid).toBe(false);
    expect(polarTarget(12, 20, 'jib').inGrid).toBe(false);
    expect(POLAR_TWS[0]).toBe(6);
  });
});

describe('leech stall fraction', () => {
  it('turns a deviation in angle of attack into the twist that would remove it', () => {
    // Only a quarter of head twist reaches the mid-height station the angle of
    // attack is measured at, so a degree over-trimmed is four degrees of twist.
    expect(leechTwistDevDeg(1)).toBeCloseTo(1 / TWIST_TO_AOA, 12);
    expect(leechTwistDevDeg(-12.88)).toBeCloseTo(-51.52, 6);
    expect(leechTwistDevDeg(0)).toBe(0);
  });

  it('rises monotonically with over-trim and stays inside (0, 1)', () => {
    let prev = -1;
    for (let dev = -90; dev <= 90; dev += 1) {
      const f = leechStallFrac(dev);
      expect(f, `dev ${dev}`).toBeGreaterThan(prev);
      expect(f).toBeGreaterThan(0);
      expect(f).toBeLessThan(1);
      prev = f;
    }
  });

  it('quotes the guide band, not a point target', () => {
    expect(LEECH_STALL_BAND[0]).toBeLessThan(LEECH_STALL_BAND[1]);
    expect(LEECH_STALL_BAND).toEqual([0.5, 0.7]);
  });

  it('reads the same deviation the forces do', () => {
    // One number, two consumers: the deviation that costs the sail lift is the
    // one that stalls its ribbons, not a second copy of the angle formulas.
    const groove = { sheetDeg: 12, twistDeg: 8 };
    const pinned = { sheetDeg: 2, twistDeg: 8 };
    const inGroove = sheetingDeviation(boat, 'main', 30, groove);
    const overTrimmed = sheetingDeviation(boat, 'main', 30, pinned);
    expect(Math.abs(inGroove.devDeg)).toBeLessThanOrEqual(inGroove.bandDeg);
    expect(overTrimmed.devDeg).toBeGreaterThan(overTrimmed.bandDeg);
    expect(sheetingEffect(boat, 'main', 30, groove).clMul).toBe(1);
    expect(sheetingEffect(boat, 'main', 30, pinned).clMul).toBeLessThan(1);
    expect(leechStallFrac(overTrimmed.devDeg)).toBeGreaterThan(leechStallFrac(inGroove.devDeg));
  });
});

/**
 * The calibration the meter exists for (cockpit phase 03). Phase 02 scaled it
 * on the sheeting layer's lift-loss e-fold, which left the whole upwind range
 * inside 0–0.11 and the guide's 50–70 % band unreachable. These three points
 * are what the rescale had to hit; they fail if either constant moves.
 */
describe('leech stall calibration, upwind at 10 kt', () => {
  const stall = (mainsheet: number): number =>
    trimmed(
      boat,
      { dock: baseDock(), race: { ...baseRace(), mainsheet } },
      { twsKt: 10, twaDeg: 42, seaState: 1, crewKg: 300, sailset: 'jib' },
      geometryFor(boat),
    ).instruments.leechStallFrac.value;

  it('sits inside the guide band at base trim', () => {
    const f = stall(baseRace().mainsheet);
    expect(f).toBeGreaterThan(LEECH_STALL_BAND[0]);
    expect(f).toBeLessThan(LEECH_STALL_BAND[1]);
  });

  it('reads above the band with the mainsheet hard on', () => {
    expect(stall(100)).toBeGreaterThan(LEECH_STALL_BAND[1]);
  });

  it('reads below 0.3 with the mainsheet eased to 30 %', () => {
    expect(stall(30)).toBeLessThan(0.3);
  });
});

describe('jib leech stripe', () => {
  it('measures the chord at the spreaders from the class girths', () => {
    // Spreaders are at 4.4 m of an 8.0 m luff, i.e. between the half girth
    // (1.25 m) and the three-quarter girth (0.65 m).
    const c = jibChordAtSpreaderM(boat);
    expect(c).toBeLessThan(1.25);
    expect(c).toBeGreaterThan(0.65);
  });

  it('opens outboard with sheeting angle and with twist', () => {
    const base = jibLeechStripe(boat, 13, 9);
    expect(jibLeechStripe(boat, 15, 9)).toBeGreaterThan(base);
    expect(jibLeechStripe(boat, 13, 14)).toBeGreaterThan(base);
  });

  it('reads 0, 1 and 2 two inches apart, at the painted stripe spacing', () => {
    // The index is the leech's position in stripes, so a leech two inches
    // further outboard is one stripe further out, wherever the offset puts it.
    const chord = jibChordAtSpreaderM(boat);
    const at = (m: number) => (Math.asin(m / chord) * 180) / Math.PI;
    const zero = jibLeechStripe(boat, at(0.3), 0);
    for (const [i, inches] of STRIPE_INCHES.entries()) {
      const step = (inches - STRIPE_INCHES[0]) * 0.0254;
      expect(jibLeechStripe(boat, at(0.3 + step), 0), `${inches}"`).toBeCloseTo(zero + i, 9);
    }
  });

  it('goes negative inside the innermost stripe rather than clamping', () => {
    // A hooked leech has to stay distinguishable from one on the 18" stripe,
    // or the verdict cannot tell "lead aft" from "you are there".
    expect(jibLeechStripe(boat, 2, 0)).toBeLessThan(0);
  });
});

/**
 * The spreader offset (cockpit phase 03). Phase 02 read −0.6 at the base
 * trim — hooked inside the 18" stripe — so the verdict asked for lead aft
 * from the trim the guide calls right. The offset puts base trim on the
 * middle 20" stripe, and the lead car then walks a stripe either side of it.
 */
describe('jib stripe calibration, upwind at 10 kt', () => {
  const stripe = (jibLead: number): number => {
    const r = trimmed(
      boat,
      { dock: baseDock(), race: { ...baseRace(), jibLead } },
      { twsKt: 10, twaDeg: 42, seaState: 1, crewKg: 300, sailset: 'jib' },
      geometryFor(boat),
    );
    return r.instruments.jibLeechStripe!.value;
  };

  it('reads the 20" stripe at base trim', () => {
    expect(stripe(baseRace().jibLead)).toBeCloseTo(1, 1);
  });

  it('reads the 22" stripe three holes aft and the 18" three holes forward', () => {
    // Nearest stripe, not the exact index: three holes move the model 1.35
    // stripes, and the lead-to-twist gain is not calibrated to make it 1.00.
    expect(stripe(baseRace().jibLead + 3)).toBeCloseTo(2, 0);
    expect(stripe(baseRace().jibLead - 3)).toBeCloseTo(0, 0);
  });
});

describe('helm load', () => {
  it('is zero upright and grows with heel at a fixed drive', () => {
    expect(helmLoad(300, 3.6, 0)).toBe(0);
    let prev = -1;
    for (const heel of [0, 5, 10, 15, 20, 25, 30]) {
      const h = helmLoad(300, 3.6, heel);
      expect(h, `heel ${heel}`).toBeGreaterThanOrEqual(prev);
      prev = h;
    }
  });

  it('is weather-positive on both tacks', () => {
    expect(helmLoad(300, 3.6, 12)).toBeGreaterThan(0);
    expect(helmLoad(300, 3.6, -12)).toBe(helmLoad(300, 3.6, 12));
  });

  it('reads 1.0 at the reference moment', () => {
    const heelDeg = 15;
    const fxN = HELM_REF_NM / (3.6 * Math.sin((heelDeg * Math.PI) / 180));
    expect(helmLoad(fxN, 3.6, heelDeg)).toBeCloseTo(1, 12);
  });
});

/**
 * `pctPolar` is a ratio, and a ratio is no more confident than its numerator
 * (audit docs-consistency-01 M-07). The grid tier on its own printed A under
 * the kite, where the boat speed it divides is tier B.
 */
describe('pctPolar tier never beats its numerator', () => {
  const solve = (sailset: SailSet, twsKt: number, twaDeg: number) =>
    trimmed(
      boat,
      { dock: baseDock(), race: baseRace() },
      { twsKt, twaDeg, seaState: 1, crewKg: 300, sailset },
      geometryFor(boat),
    );

  it('is tier A with no band under the jib, in grid', () => {
    expect(polarTarget(10, 42, 'jib').inGrid).toBe(true);
    const r = solve('jib', 10, 42);
    expect(r.bsKt.tier).toBe('A');
    expect(r.instruments.pctPolar.tier).toBe('A');
    expect(r.instruments.pctPolar.band).toBeUndefined();
  });

  it('is tier B under the kite, in grid, and keeps its band', () => {
    expect(polarTarget(12, 140, 'asym').inGrid).toBe(true);
    const r = solve('asym', 12, 140);
    expect(r.bsKt.tier).toBe('B');
    const p = r.instruments.pctPolar;
    expect(p.tier).toBe('B');
    expect(p.band).toEqual([p.value - PCT_POLAR_BAND, p.value + PCT_POLAR_BAND]);
  });

  it('is tier C outside the polar TWS range even under the jib', () => {
    expect(solve('jib', 24, 42).instruments.pctPolar.tier).toBe('C');
  });
});
