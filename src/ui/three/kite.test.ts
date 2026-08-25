/**
 * The kite mapping is tier C, so nothing here asserts a *fitted* coefficient.
 * What it asserts is what ADR 0017 claims plus what research
 * `2026-08-25-spinnaker` measured: where the tack is, which way the clew goes
 * as the sheet moves, that the luff carries the sail's own luff length and
 * bows to the side the apparent wind angle says it should, that the clew sits
 * on the circle the published leech and foot pin it to, and that the surface
 * the loft makes of it is a surface rather than a NaN field.
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
  LUFF_CROSSOVER_AWA_DEG,
  LUFF_LEEWARD_AWA_DEG,
  LUFF_WINDWARD_AWA_DEG,
  luffLateral,
  SHEET_EASE_DEG,
  SHEET_TRIM_DEG,
  TACK_MIN_M,
} from './kite';
import { buildSail, gridRow } from './loft';
import { rig3d } from './rig3d';
import type { RigState } from '../../core/types';

const MID: DownControls = { kiteHalyard: 50, tackLine: 50, kiteSheet: 50, sprit: 0 };
const down = (over: Partial<DownControls> = {}): DownControls => ({ ...MID, ...over });

/**
 * Apparent wind angles either side of the measured crossover: a tight reach,
 * where the whole luff was measured on the leeward side, and a run, which is
 * where the J/70's own downwind optimum (142-174° TWA) actually sits.
 */
const AWA_REACH = 70;
const AWA_RUN = 150;

/** The solver's asym constants (`core/shape/flying.ts:asymShape`). */
const SHAPE: SailShape = {
  quarter: { draft: 0.3, draftPos: 0.46, twistDeg: 13, entryDeg: 52.5, exitDeg: 48.0 },
  half: { draft: 0.24, draftPos: 0.48, twistDeg: 20.8, entryDeg: 45.0, exitDeg: 42.7 },
  threeQuarter: { draft: 0.1899, draftPos: 0.58, twistDeg: 26, entryDeg: 33.2, exitDeg: 42.1 },
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
    expect(kiteGeometry(down({ sprit: 100 }), BARE_SPAR, 1, AWA_RUN).tack[0]).toBeCloseTo(
      SPRIT_TIP_X,
      9,
    );
    expect(kiteGeometry(down({ sprit: 0 }), BARE_SPAR, 1, AWA_RUN).tack[0]).toBeCloseTo(STEM_X, 9);
    // The sprit is on the centreline whatever the tack.
    for (const side of [1, -1] as Side[]) {
      expect(kiteGeometry(down(), BARE_SPAR, side, AWA_RUN).tack[2]).toBe(0);
    }
  });

  it('lifts the tack off the sprit as the tack line is eased', () => {
    const strapped = kiteGeometry(down({ tackLine: 100 }), BARE_SPAR, 1, AWA_RUN).tack[1];
    const mid = kiteGeometry(down({ tackLine: 50 }), BARE_SPAR, 1, AWA_RUN).tack[1];
    const eased = kiteGeometry(down({ tackLine: 0 }), BARE_SPAR, 1, AWA_RUN).tack[1];
    expect(strapped).toBeCloseTo(TACK_MIN_M, 9);
    expect(mid).toBeGreaterThan(strapped);
    expect(eased).toBeGreaterThan(mid);
    // The travel stays inside the J/70 band the sources give and the downwind
    // panel prints: 0–12 in (0–0.30 m), research doc 04 §2.4. It was 0.6 m.
    expect(eased - strapped).toBeLessThanOrEqual(0.3 + 1e-9);
  });

  it('puts the head at the masthead at full hoist and drops it below on ease', () => {
    const r = rig3d(RIG, 1, 0.3);
    expect(kiteGeometry(down({ kiteHalyard: 100 }), r, 1, AWA_RUN).head).toEqual(r.masthead);
    expect(kiteGeometry(down({ kiteHalyard: 0 }), r, 1, AWA_RUN).head[1]).toBeLessThan(
      r.masthead[1],
    );
  });

  it('flies the luff at the sail definition length, bowed to leeward and forward', () => {
    for (const side of [1, -1] as Side[]) {
      const g = kiteGeometry(down({ kiteHalyard: 100 }), rig3d(RIG, side, 0.3), side, AWA_REACH);
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
      const g = kiteGeometry(down({ kiteHalyard }), r, 1, AWA_REACH);
      return Math.abs(g.spine(0.5)[2] - (g.tack[2] + g.head[2]) / 2);
    };
    expect(bow(0)).toBeGreaterThan(bow(50));
    expect(bow(50)).toBeGreaterThan(bow(100));
  });

  it('flies the clew to leeward, on both tacks', () => {
    for (const side of [1, -1] as Side[]) {
      const g = kiteGeometry(down(), BARE_SPAR, side, AWA_RUN);
      expect(Math.sign(g.clew[2])).toBe(lee(side));
    }
  });

  it('keeps the clew on the circle the published leech and foot pin it to', () => {
    // The clew is not a free parameter: it is where a sphere of radius = leech
    // about the head meets one of radius = foot about the tack. The sheet
    // chooses a point on that circle and nothing else (research doc 02 §6).
    const leech = boat.sails.asym.leechMm / 1000;
    const foot = boat.sails.asym.footMm / 1000;
    for (const side of [1, -1] as Side[]) {
      for (const kiteSheet of [0, 25, 50, 75, 100]) {
        for (const sprit of [0, 100]) {
          for (const tackLine of [0, 100]) {
            for (const kiteHalyard of [0, 100]) {
              const g = kiteGeometry(
                { kiteSheet, sprit, tackLine, kiteHalyard },
                rig3d(RIG, side, 0.3),
                side,
                AWA_RUN,
              );
              // The straight head→clew distance is the leech less its bulge's
              // arc surplus; the cloth length itself is the drawn-leech test.
              expect(len(g.head, g.clew) / g.leechChord).toBeCloseTo(1, 2);
              expect(g.leechChord).toBeLessThan(leech);
              expect(g.leechChord / leech).toBeGreaterThan(0.95);
              expect(len(g.tack, g.clew) / foot).toBeCloseTo(1, 2);
            }
          }
        }
      }
    }
  });

  it('moves the clew forward, outboard and up, monotonically, as the sheet eases', () => {
    for (const side of [1, -1] as Side[]) {
      const clews = [100, 80, 60, 40, 20, 0].map(
        (kiteSheet) => kiteGeometry(down({ kiteSheet }), BARE_SPAR, side, AWA_RUN).clew,
      );
      for (let i = 1; i < clews.length; i++) {
        expect(clews[i][0]).toBeGreaterThan(clews[i - 1][0]); // forward
        expect(Math.abs(clews[i][2])).toBeGreaterThan(Math.abs(clews[i - 1][2])); // outboard
        expect(clews[i][1]).toBeGreaterThan(clews[i - 1][1]); // and up
      }
      // And the whole band lives inside the circle's achievable arc.
      expect(SHEET_TRIM_DEG).toBeGreaterThan(18);
      expect(SHEET_EASE_DEG).toBeLessThan(89);
    }
  });

  it('lifts the clew about a metre across the sheet band, as measured', () => {
    // Research doc 02 §6 solves the same circle on the app's own tack-down,
    // full-hoist head and tack and gets +0.09 m of clew height at 25° and
    // +1.17 m at 60°. Deparday measured 1.4 m of clew rise from AWA 64° to
    // 141° on the J/80 — two entirely different routes to about the same
    // number, which is the corroboration the construction rests on.
    const at = (kiteSheet: number): number =>
      kiteGeometry(
        { kiteSheet, sprit: 100, tackLine: 100, kiteHalyard: 100 },
        BARE_SPAR,
        1,
        AWA_RUN,
      ).clew[1];
    const rise = at(0) - at(100);
    expect(rise).toBeGreaterThan(0.9);
    // Up to 1.6: the leech bulge shortens the head→clew chord as the sheet
    // eases, which lifts the clew a little more than the straight-leech circle.
    expect(rise).toBeLessThan(1.6);
  });

  it('bows the luff to leeward reaching and to windward running, crossing once', () => {
    // Two full-scale programmes: the whole luff is to leeward at AWA 64°, and
    // it has rotated to windward and across the centreline by 120-141°.
    expect(luffLateral(LUFF_LEEWARD_AWA_DEG)).toBeCloseTo(1, 9);
    expect(luffLateral(LUFF_WINDWARD_AWA_DEG)).toBeCloseTo(-1, 9);
    expect(luffLateral(LUFF_CROSSOVER_AWA_DEG)).toBeCloseTo(0, 9);
    // Clamped, not extrapolated, outside the measured pair.
    expect(luffLateral(20)).toBe(1);
    expect(luffLateral(180)).toBe(-1);
    // Monotone, so the luff crosses the centreline exactly once.
    let prev = Infinity;
    for (let a = 0; a <= 180; a += 5) {
      expect(luffLateral(a)).toBeLessThanOrEqual(prev);
      prev = luffLateral(a);
    }

    for (const side of [1, -1] as Side[]) {
      const r = rig3d(RIG, side, 0.3);
      const offset = (awaDeg: number): number => {
        const g = kiteGeometry(down({ kiteHalyard: 100 }), r, side, awaDeg);
        return g.spine(0.5)[2] - (g.tack[2] + g.head[2]) / 2;
      };
      expect(Math.sign(offset(AWA_REACH))).toBe(lee(side));
      expect(Math.sign(offset(AWA_RUN))).toBe(-lee(side));
      expect(Math.abs(offset(LUFF_CROSSOVER_AWA_DEG))).toBeLessThan(1e-9);
    }
  });

  it('keeps the bow magnitude while its direction rotates', () => {
    // The research corroborates the *magnitude* model (within 3 % of the exact
    // circular arc) and contradicts only the direction, so the direction is
    // normalised before the arc-length surplus scales it: the mid-luff sits
    // the same distance off the tack-head line at every apparent wind angle.
    const r = rig3d(RIG, 1, 0.3);
    const bow = (awaDeg: number): number => {
      const g = kiteGeometry(down({ kiteHalyard: 100 }), r, 1, awaDeg);
      const mid = g.spine(0.5);
      const straight = [0, 1, 2].map((k) => (g.tack[k] + g.head[k]) / 2) as Vec3;
      return len(mid, straight);
    };
    const ref = bow(AWA_REACH);
    for (const awaDeg of [40, LUFF_CROSSOVER_AWA_DEG, 124, AWA_RUN, 180]) {
      expect(bow(awaDeg)).toBeCloseTo(ref, 9);
    }
  });

  it('curls when the sheet is eased past the threshold, and not when it is trimmed', () => {
    expect(kiteGeometry(down({ kiteSheet: 100 }), BARE_SPAR, 1, AWA_RUN).curl).toBe(false);
    expect(kiteGeometry(down({ kiteSheet: 50 }), BARE_SPAR, 1, AWA_RUN).curl).toBe(false);
    expect(kiteGeometry(down({ kiteSheet: 0 }), BARE_SPAR, 1, AWA_RUN).curl).toBe(true);
  });

  it('never emits NaN, at any corner of the four controls', () => {
    for (const kiteHalyard of [0, 100]) {
      for (const tackLine of [0, 100]) {
        for (const kiteSheet of [0, 100]) {
          for (const sprit of [0, 100]) {
            for (const awaDeg of [AWA_REACH, LUFF_CROSSOVER_AWA_DEG, AWA_RUN]) {
              const g = kiteGeometry(
                { kiteHalyard, tackLine, kiteSheet, sprit },
                rig3d(RIG, 1, 0.3),
                1,
                awaDeg,
              );
              for (const p of [g.tack, g.head, g.clew, g.spine(0.5), g.spine(0.25)]) {
                expect(p.every(Number.isFinite)).toBe(true);
              }
              expect(Number.isFinite(g.sheetRad)).toBe(true);
            }
          }
        }
      }
    }
  });
});

describe('the lofted kite', () => {
  const build = (side: Side, over: Partial<DownControls> = {}, awaDeg = AWA_RUN) => {
    const g = kiteGeometry(down(over), rig3d(RIG, side, 0.3), side, awaDeg);
    return { g, mesh: buildSail(g.sections(SHAPE), g.spine, g.sheetRad, side) };
  };

  it('bows the leech out to leeward, most in the upper half, and more as the sheet eases', () => {
    for (const side of [1, -1] as Side[]) {
      const offAt = (over: Partial<DownControls>) => {
        const { g, mesh } = build(side, over);
        const dir = [g.head[0] - g.clew[0], g.head[1] - g.clew[1], g.head[2] - g.clew[2]] as Vec3;
        const L = Math.hypot(...dir);
        let lower = 0;
        let upper = 0;
        for (let i = 0; i < mesh.N; i++) {
          const p = gridRow(mesh, i)[mesh.M - 1];
          const w = [p[0] - g.clew[0], p[1] - g.clew[1], p[2] - g.clew[2]];
          const t = (w[0] * dir[0] + w[1] * dir[1] + w[2] * dir[2]) / (L * L);
          const off = [0, 1, 2].map((k) => w[k] - t * dir[k]) as Vec3;
          const d = Math.hypot(...off);
          // Leeward, never windward (the foot row's outboard end sits a few
          // centimetres off the line where the clew hangs below the tack).
          if (d > 0.05 && t > 0.1 && t < 0.9) expect(Math.sign(off[2])).toBe(lee(side));
          if (t < 0.45) lower = Math.max(lower, d);
          else upper = Math.max(upper, d);
        }
        return { lower, upper };
      };
      const trimmed = offAt({ kiteSheet: 100 });
      const eased = offAt({ kiteSheet: 0 });
      expect(trimmed.upper).toBeGreaterThan(trimmed.lower);
      expect(eased.upper).toBeGreaterThan(trimmed.upper + 0.5);
    }
  });

  it('carries the published leech length, within 3 %, at every sheet setting', () => {
    // The old loft let the leech emerge and it emerged 25-40 % long: 11.0-12.4
    // m of drawn cloth against a published 8.800 m (research doc 02 §6). The
    // leech the mapping draws is now the head-to-clew line plus its own bulge,
    // with the straight chord shortened by exactly the bulge's arc surplus
    // (`chordForArc`), and the clew is on the circle the published leech and
    // foot pin it to. So the drawn leech carries the sail's leech length by
    // construction, bulged or not — at every sheet setting, not just one.
    const leech = boat.sails.asym.leechMm / 1000;
    for (const side of [1, -1] as Side[]) {
      for (const kiteSheet of [0, 25, 50, 75, 100]) {
        const { g, mesh } = build(side, { kiteSheet });
        // Cloth length: the drawn leech column's arc, within 3 % of published.
        // From the clew up: the rows below the clew's height end under it
        // (the foot wedge), which is foot, not leech.
        let arc = 0;
        let prev: Vec3 = g.clew;
        for (let i = 0; i < mesh.N; i++) {
          const p = gridRow(mesh, i)[mesh.M - 1];
          if (p[1] < g.clew[1] - 1e-6) continue;
          arc += len(prev, p);
          prev = p;
        }
        expect(arc / leech).toBeGreaterThan(0.97);
        expect(arc / leech).toBeLessThan(1.03);
      }
    }
  });

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
      // The foot row ends on the leech line at the tack's own height: the clew
      // no longer sits at that height, because the circle lifts it as the
      // sheet eases and drops it a little below when the sheet is trimmed.
      expect(foot[mesh.M - 1][1]).toBeCloseTo(g.tack[1], 6);
      expect(len(foot[mesh.M - 1], g.clew)).toBeLessThan(0.6);
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
