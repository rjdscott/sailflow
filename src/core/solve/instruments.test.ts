import { describe, expect, it } from 'vitest';
import j70 from '../../../data/boats/j70.json';
import type { BoatDefinition } from '../types';
import { polarTarget, POLAR_TWS } from '../reference/polar';
import { sheetingDeviation } from '../shape/sheeting';
import {
  HELM_REF_NM,
  jibChordAtSpreaderM,
  jibLeechStripe,
  leechStallFrac,
  LEECH_STALL_BAND,
  STRIPE_INCHES,
  helmLoad,
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
  const band = 4;
  const scale = 30;

  it('is zero anywhere the sail is not over-trimmed', () => {
    for (const dev of [-50, -5, -0.1, 0]) expect(leechStallFrac(dev, band, scale)).toBe(0);
  });

  it('rises monotonically and reaches ~1 at band + 2 stall scales', () => {
    let prev = -1;
    for (let dev = 0; dev <= 70; dev += 1) {
      const f = leechStallFrac(dev, band, scale);
      expect(f, `dev ${dev}`).toBeGreaterThanOrEqual(prev);
      expect(f).toBeLessThan(1);
      prev = f;
    }
    expect(leechStallFrac(band + 2 * scale, band, scale)).toBeCloseTo(0.95, 2);
  });

  it('quotes the guide band, not a point target', () => {
    expect(LEECH_STALL_BAND[0]).toBeLessThan(LEECH_STALL_BAND[1]);
    expect(LEECH_STALL_BAND).toEqual([0.5, 0.7]);
  });

  it('reads the same deviation the forces do', () => {
    // The refactor must not have grown a second copy of the angle formulas:
    // a sail inside its groove costs no lift and stalls no ribbons.
    const s = { sheetDeg: 12, twistDeg: 8 };
    const d = sheetingDeviation(boat, 'main', 30, s);
    expect(Math.abs(d.devDeg)).toBeLessThanOrEqual(d.bandDeg);
    expect(leechStallFrac(d.devDeg, d.bandDeg, d.stallScaleDeg)).toBe(0);
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

  it('reads 0, 1 and 2 at the three painted stripes', () => {
    const chord = jibChordAtSpreaderM(boat);
    for (const [i, inches] of STRIPE_INCHES.entries()) {
      const deg = (Math.asin((inches * 0.0254) / chord) * 180) / Math.PI;
      expect(jibLeechStripe(boat, deg, 0), `${inches}"`).toBeCloseTo(i, 9);
    }
  });

  it('goes negative inside the innermost stripe rather than clamping', () => {
    // A hooked leech has to stay distinguishable from one on the 18" stripe,
    // or the verdict cannot tell "lead aft" from "you are there".
    expect(jibLeechStripe(boat, 2, 0)).toBeLessThan(0);
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
