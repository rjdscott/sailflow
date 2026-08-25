/**
 * The rig and hull are drawn from the boat JSON through the same reductions
 * `race/rigLayout.ts` uses. These hold the class proportions, the sag
 * directions and the outward hull normals — the three things that would be
 * wrong silently.
 */
import { describe, expect, it } from 'vitest';
import boat from '../../../data/boats/j70.json';
import type { RigState } from '../../core/types';
import { DEG2RAD, dot, leeward, norm, sub, type Side, type Vec3 } from './conventions';
import { deckMesh, hullMesh, STEM_X, TRANSOM_X, WATER_Y } from './hull';
import { JIB_CHORDS, MAIN_CHORDS, rig3d, SAG_FORWARD_FRACTION } from './rig3d';

const RIG: RigState = {
  bendMm: [0, 12, 28, 47, 66, 80, 86, 82, 68, 44, 14],
  sagMm: 90,
  rakeMm: 420,
  prebendMm: 40,
  forestayN: 3200,
  upperN: 2600,
  lowerN: 1400,
};

const SIDES: Side[] = [1, -1];
const STRAIGHT: RigState = { ...RIG, bendMm: RIG.bendMm.map(() => 0), sagMm: 0, rakeMm: 0 };

describe('mast', () => {
  it('stands the full spar length above the sheer', () => {
    const { mast } = rig3d(STRAIGHT, 1, 0);
    expect(mast[0]).toEqual([0, 0, 0]);
    expect(mast[mast.length - 1][1]).toBeCloseTo(boat.rig.mastLenM, 9);
  });

  it('leans the tip aft with rake and bows the middle forward with bend', () => {
    const { mast, masthead } = rig3d(RIG, 1, 0);
    expect(masthead[0]).toBeLessThan(0);
    expect(masthead[0]).toBeCloseTo((RIG.bendMm[10] - RIG.rakeMm) / 1000, 9);
    // Peak bend is forward of the straight line between heel and tip.
    const f = 0.6;
    const chordX = mast[0][0] + (masthead[0] - mast[0][0]) * f;
    expect(mast[6][0]).toBeGreaterThan(chordX);
  });

  it('draws bend and rake true — no exaggeration', () => {
    const { masthead } = rig3d({ ...STRAIGHT, rakeMm: 420 }, 1, 0);
    expect(Math.abs(masthead[0])).toBeCloseTo(0.42, 9);
  });

  it('puts the hounds at I and the gooseneck at mastLen minus P', () => {
    const { hounds, gooseneck } = rig3d(STRAIGHT, 1, 0);
    expect(hounds[1]).toBeCloseTo(boat.rig.iM, 6);
    expect(gooseneck[1]).toBeCloseTo(boat.rig.mastLenM - boat.rig.pM, 6);
  });
});

describe('forestay', () => {
  it('runs stem to hounds', () => {
    const { forestay, hounds } = rig3d(STRAIGHT, 1, 0);
    expect(forestay[0]).toEqual([STEM_X, 0, 0]);
    expect(Math.hypot(...sub(forestay[forestay.length - 1], hounds))).toBeCloseTo(0, 9);
  });

  it.each(SIDES)('sags to leeward and forward on side %i', (side) => {
    const { forestay } = rig3d(RIG, side, 0);
    const mid = forestay[forestay.length >> 1];
    const chordMid: Vec3 = [
      (forestay[0][0] + forestay[forestay.length - 1][0]) / 2,
      (forestay[0][1] + forestay[forestay.length - 1][1]) / 2,
      (forestay[0][2] + forestay[forestay.length - 1][2]) / 2,
    ];
    const off = sub(mid, chordMid);
    expect(dot(off, leeward(side))).toBeCloseTo(RIG.sagMm / 1000, 3);
    expect(off[0]).toBeCloseTo((SAG_FORWARD_FRACTION * RIG.sagMm) / 1000, 3);
  });

  it('is straight when the solver reports no sag', () => {
    const { forestay } = rig3d(STRAIGHT, 1, 0);
    const dir = norm(sub(forestay[forestay.length - 1], forestay[0]));
    for (const p of forestay) {
      const d = sub(p, forestay[0]);
      const along = dot(d, dir);
      expect(
        Math.hypot(d[0] - dir[0] * along, d[1] - dir[1] * along, d[2] - dir[2] * along),
      ).toBeCloseTo(0, 9);
    }
  });
});

describe('boom', () => {
  it.each(SIDES)('swings E to leeward on side %i and stays level', (side) => {
    const { boom, gooseneck } = rig3d(STRAIGHT, side, 16 * DEG2RAD);
    expect(Math.hypot(...sub(boom[1], boom[0]))).toBeCloseTo(boat.rig.eM, 9);
    expect(boom[1][1]).toBeCloseTo(gooseneck[1], 9);
    expect(dot(sub(boom[1], boom[0]), leeward(side))).toBeGreaterThan(0);
    expect(boom[1][0]).toBeLessThan(boom[0][0]);
  });
});

describe('standing rigging', () => {
  it('is whole vertex pairs and reaches both chainplates', () => {
    const { lines } = rig3d(STRAIGHT, 1, 0);
    expect(lines.length % 6).toBe(0);
    const zs = [...lines].filter((_, i) => i % 3 === 2);
    expect(Math.max(...zs)).toBeCloseTo(boat.rig.chainplateYM, 6);
    expect(Math.min(...zs)).toBeCloseTo(-boat.rig.chainplateYM, 6);
  });

  it('takes the backstay to the transom', () => {
    const { lines } = rig3d(STRAIGHT, 1, 0);
    // Float32Array, so single precision is the tolerance.
    expect(lines[3]).toBeCloseTo(TRANSOM_X, 5);
  });
});

describe('spines', () => {
  it('runs the mainsail luff from gooseneck to masthead', () => {
    const r = rig3d(RIG, 1, 0);
    expect(Math.hypot(...sub(r.mainSpine(0), r.gooseneck))).toBeCloseTo(0, 6);
    expect(Math.hypot(...sub(r.mainSpine(1), r.masthead))).toBeCloseTo(0, 6);
  });

  it('runs the headsail luff up the sagged forestay', () => {
    const r = rig3d(RIG, 1, 0);
    expect(r.jibSpine(0)).toEqual([STEM_X, 0, 0]);
    expect(Math.hypot(...sub(r.jibSpine(1), r.hounds))).toBeCloseTo(0, 6);
    expect(dot(sub(r.jibSpine(0.5), r.jibSpine(0)), leeward(1))).toBeGreaterThan(0);
  });
});

describe('chords', () => {
  it('are the class girths, foot to head', () => {
    expect(MAIN_CHORDS.foot).toBeCloseTo(boat.rig.eM, 6);
    expect(MAIN_CHORDS.head).toBeCloseTo(boat.sails.main.topMm / 1000, 9);
    expect(JIB_CHORDS.foot).toBeCloseTo(boat.sails.jib.lpMm / 1000, 9);
    const main = Object.values(MAIN_CHORDS);
    expect(main).toEqual([...main].sort((a, b) => b - a));
  });
});

describe('hull', () => {
  const hull = hullMesh();

  it('spans the class LOA and beam', () => {
    const xs = [...hull.positions].filter((_, i) => i % 3 === 0);
    const zs = [...hull.positions].filter((_, i) => i % 3 === 2);
    expect(Math.max(...xs)).toBeCloseTo(STEM_X, 6);
    expect(Math.min(...xs)).toBeCloseTo(TRANSOM_X, 6);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(boat.hull.loaM, 6);
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(boat.hull.beamM, 6);
  });

  it('hangs below the sheer and floats on the waterline', () => {
    const ys = [...hull.positions].filter((_, i) => i % 3 === 1);
    expect(Math.max(...ys)).toBeCloseTo(0, 9);
    expect(Math.min(...ys)).toBeLessThan(WATER_Y);
  });

  it('has finite outward unit normals', () => {
    expect([...hull.normals].every(Number.isFinite)).toBe(true);
    for (let v = 0; v < hull.normals.length; v += 3) {
      const n: Vec3 = [hull.normals[v], hull.normals[v + 1], hull.normals[v + 2]];
      expect(Math.hypot(...n)).toBeCloseTo(1, 6);
      const p: Vec3 = [0, hull.positions[v + 1], hull.positions[v + 2]];
      // Outward means away from the centreline axis at the same station.
      if (Math.hypot(p[1], p[2]) > 0.05) expect(dot(n, norm(p))).toBeGreaterThan(0);
    }
  });

  it('decks over flat at the sheer', () => {
    const deck = deckMesh();
    for (let v = 0; v < deck.positions.length; v += 3) expect(deck.positions[v + 1]).toBe(0);
    expect([...deck.normals].every(Number.isFinite)).toBe(true);
  });
});
