/**
 * The kite mapping is tier C and every number in it is assumed, so nothing
 * here asserts a coefficient. What it asserts is what ADR 0017 actually
 * claims: where the tack is, which way the clew goes as the sheet moves, that
 * the luff carries the sail's own luff length, and that the surface the loft
 * makes of it is a surface rather than a NaN field.
 */
import { describe, expect, it } from 'vitest';
import boat from '../../../data/boats/j70.json';
import type { DownControls, SailShape } from '../../core/types';
import { lee, SPRIT_TIP_X, STEM_X, type Side, type Vec3 } from './conventions';
import {
  BARE_SPAR,
  FLYING_CHORD_FRACTION,
  kiteGeometry,
  kiteGirthM,
  KITE_CHORDS,
  TACK_MIN_M,
} from './kite';
import { buildSail, gridRow, sectionStack } from './loft';
import { rig3d } from './rig3d';
import type { RigState } from '../../core/types';

const MID: DownControls = { kiteHalyard: 50, tackLine: 50, kiteSheet: 50, sprit: 0 };
const down = (over: Partial<DownControls> = {}): DownControls => ({ ...MID, ...over });

/** The solver's asym constants, mid-band (`core/shape/flying.ts:asymShape`). */
const SHAPE: SailShape = {
  quarter: { draft: 0.17, draftPos: 0.45, twistDeg: 6, entryDeg: 37.1, exitDeg: 31.7 },
  half: { draft: 0.17, draftPos: 0.45, twistDeg: 9.6, entryDeg: 37.1, exitDeg: 31.7 },
  threeQuarter: { draft: 0.145, draftPos: 0.45, twistDeg: 12, entryDeg: 32.8, exitDeg: 27.7 },
};

const RIG: RigState = {
  bendMm: [0, 12, 28, 47, 66, 80, 86, 82, 68, 44, 14],
  sagMm: 90,
  rakeMm: 420,
  prebendMm: 40,
  forestayN: 3200,
  upperN: 2600,
  lowerN: 1400,
};

const len = (a: Vec3, b: Vec3): number => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);

/** Arc length of the spine, sampled fine enough that the parabola is resolved. */
function luffLength(spine: (h: number) => Vec3, n = 400): number {
  let total = 0;
  let prev = spine(0);
  for (let i = 1; i <= n; i++) {
    const p = spine(i / n);
    total += len(prev, p);
    prev = p;
  }
  return total;
}

describe('KITE_CHORDS', () => {
  it('fits the ORC girth parabola through the sail definition', () => {
    // Foot and half width are measured; the parabola is what carries the two
    // stations between them and the point at the head.
    expect(kiteGirthM(0)).toBeCloseTo(boat.sails.asym.footMm / 1000, 6);
    expect(kiteGirthM(0.5)).toBeCloseTo(boat.sails.asym.halfMm / 1000, 6);
    expect(kiteGirthM(1)).toBeCloseTo(0, 6);
  });

  it('flies a shorter chord than the girth, at every station', () => {
    for (const [h, chord] of [
      [0, KITE_CHORDS.foot],
      [0.25, KITE_CHORDS.quarter],
      [0.5, KITE_CHORDS.half],
      [0.75, KITE_CHORDS.threeQuarter],
      [1, KITE_CHORDS.head],
    ] as const) {
      expect(chord).toBeCloseTo(kiteGirthM(h) * FLYING_CHORD_FRACTION, 9);
      expect(chord).toBeLessThanOrEqual(kiteGirthM(h) + 1e-9);
    }
    // The widest part of a spinnaker is above its foot, not at it.
    expect(KITE_CHORDS.quarter).toBeGreaterThan(KITE_CHORDS.foot);
    expect(KITE_CHORDS.head).toBe(0);
  });
});

describe('kiteGeometry', () => {
  it('tacks on the bowsprit tip at sprit = 100, at the stem at 0', () => {
    expect(kiteGeometry(down({ sprit: 100 }), BARE_SPAR, 1).tack[0]).toBeCloseTo(SPRIT_TIP_X, 9);
    expect(kiteGeometry(down({ sprit: 0 }), BARE_SPAR, 1).tack[0]).toBeCloseTo(STEM_X, 9);
    // The sprit is on the centreline whatever the tack.
    for (const side of [1, -1] as Side[]) {
      expect(kiteGeometry(down(), BARE_SPAR, side).tack[2]).toBe(0);
    }
  });

  it('lifts the tack off the sprit as the tack line is eased', () => {
    const strapped = kiteGeometry(down({ tackLine: 100 }), BARE_SPAR, 1).tack[1];
    const mid = kiteGeometry(down({ tackLine: 50 }), BARE_SPAR, 1).tack[1];
    const eased = kiteGeometry(down({ tackLine: 0 }), BARE_SPAR, 1).tack[1];
    expect(strapped).toBeCloseTo(TACK_MIN_M, 9);
    expect(mid).toBeGreaterThan(strapped);
    expect(eased).toBeGreaterThan(mid);
  });

  it('puts the head at the masthead at full hoist and drops it below on ease', () => {
    const r = rig3d(RIG, 1, 0.3);
    expect(kiteGeometry(down({ kiteHalyard: 100 }), r, 1).head).toEqual(r.masthead);
    expect(kiteGeometry(down({ kiteHalyard: 0 }), r, 1).head[1]).toBeLessThan(r.masthead[1]);
  });

  it('flies the luff at the sail definition length, bowed to leeward and forward', () => {
    for (const side of [1, -1] as Side[]) {
      const g = kiteGeometry(down({ kiteHalyard: 100 }), rig3d(RIG, side, 0.3), side);
      // The cloth is the cloth: the drawn luff carries the sail's luff length,
      // which is why it has to bow at all.
      expect(luffLength(g.spine)).toBeCloseTo(boat.sails.asym.luffMm / 1000, 0);
      const mid = g.spine(0.5);
      const straight: Vec3 = [
        (g.tack[0] + g.head[0]) / 2,
        (g.tack[1] + g.head[1]) / 2,
        (g.tack[2] + g.head[2]) / 2,
      ];
      // Leeward is -side; forward is +x. Both, and neither by a whisker.
      expect(Math.sign(mid[2] - straight[2])).toBe(lee(side));
      expect(mid[0] - straight[0]).toBeGreaterThan(0.3);
      expect(Math.abs(mid[2] - straight[2])).toBeGreaterThan(0.5);
      expect(g.spine(0)).toEqual(g.tack);
      expect(g.spine(1)).toEqual(g.head);
    }
  });

  it('sags more as the halyard is eased and the luff goes slacker', () => {
    const r = rig3d(RIG, 1, 0.3);
    const bow = (kiteHalyard: number): number => {
      const g = kiteGeometry(down({ kiteHalyard }), r, 1);
      return Math.abs(g.spine(0.5)[2] - (g.tack[2] + g.head[2]) / 2);
    };
    expect(bow(0)).toBeGreaterThan(bow(50));
    expect(bow(50)).toBeGreaterThan(bow(100));
  });

  it('flies the clew to leeward, on both tacks', () => {
    for (const side of [1, -1] as Side[]) {
      const g = kiteGeometry(down(), BARE_SPAR, side);
      expect(Math.sign(g.clew[2])).toBe(lee(side));
      // And a foot chord away from the tack, which is the loft's foot row.
      expect(len(g.tack, g.clew)).toBeCloseTo(KITE_CHORDS.foot, 9);
    }
  });

  it('moves the clew forward and outboard, monotonically, as the sheet eases', () => {
    for (const side of [1, -1] as Side[]) {
      const clews = [100, 80, 60, 40, 20, 0].map(
        (kiteSheet) => kiteGeometry(down({ kiteSheet }), BARE_SPAR, side).clew,
      );
      for (let i = 1; i < clews.length; i++) {
        expect(clews[i][0]).toBeGreaterThan(clews[i - 1][0]); // forward
        expect(Math.abs(clews[i][2])).toBeGreaterThan(Math.abs(clews[i - 1][2])); // outboard
      }
    }
  });

  it('curls when the sheet is eased past the threshold, and not when it is trimmed', () => {
    expect(kiteGeometry(down({ kiteSheet: 100 }), BARE_SPAR, 1).curl).toBe(false);
    expect(kiteGeometry(down({ kiteSheet: 50 }), BARE_SPAR, 1).curl).toBe(false);
    expect(kiteGeometry(down({ kiteSheet: 0 }), BARE_SPAR, 1).curl).toBe(true);
  });

  it('never emits NaN, at any corner of the four controls', () => {
    for (const kiteHalyard of [0, 100]) {
      for (const tackLine of [0, 100]) {
        for (const kiteSheet of [0, 100]) {
          for (const sprit of [0, 100]) {
            const g = kiteGeometry(
              { kiteHalyard, tackLine, kiteSheet, sprit },
              rig3d(RIG, 1, 0.3),
              1,
            );
            for (const p of [g.tack, g.head, g.clew, g.spine(0.5), g.spine(0.25)]) {
              expect(p.every(Number.isFinite)).toBe(true);
            }
            expect(Number.isFinite(g.sheetRad)).toBe(true);
          }
        }
      }
    }
  });
});

describe('the lofted kite', () => {
  const build = (side: Side, over: Partial<DownControls> = {}) => {
    const g = kiteGeometry(down(over), rig3d(RIG, side, 0.3), side);
    return { g, mesh: buildSail(sectionStack(SHAPE, g.chords), g.spine, g.sheetRad, side) };
  };

  it('is a finite surface with unit normals', () => {
    for (const side of [1, -1] as Side[]) {
      const { mesh } = build(side);
      expect(mesh.positions.every(Number.isFinite)).toBe(true);
      for (let k = 0; k < mesh.normals.length; k += 3) {
        const n = Math.hypot(mesh.normals[k], mesh.normals[k + 1], mesh.normals[k + 2]);
        expect(n).toBeCloseTo(1, 6);
      }
    }
  });

  it('roots every section on the luff and ends the foot on the clew', () => {
    for (const side of [1, -1] as Side[]) {
      const { g, mesh } = build(side);
      const foot = gridRow(mesh, 0);
      expect(len(foot[0], g.tack)).toBeCloseTo(0, 6);
      expect(len(foot[mesh.M - 1], g.clew)).toBeCloseTo(0, 6);
      // The head closes to a point: the ORC parabola's head girth is zero.
      const head = gridRow(mesh, mesh.N - 1);
      expect(len(head[0], head[mesh.M - 1])).toBeCloseTo(0, 6);
    }
  });

  it('bellies to leeward, never to windward', () => {
    for (const side of [1, -1] as Side[]) {
      const { mesh } = build(side);
      for (const r of mesh.stripeRows) {
        const row = gridRow(mesh, r);
        const [cx, , cz] = [row[mesh.M - 1][0] - row[0][0], 0, row[mesh.M - 1][2] - row[0][2]];
        for (let j = 1; j < mesh.M - 1; j++) {
          // Horizontal cross product of the chord with the offset from the
          // luff: it comes out -lee for a point on the leeward side of the
          // chord line, whichever way the chord itself is pointing.
          const px = row[j][0] - row[0][0];
          const pz = row[j][2] - row[0][2];
          expect(Math.sign(cx * pz - cz * px)).toBe(-lee(side));
        }
      }
    }
  });
});
