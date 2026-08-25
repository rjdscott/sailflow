/**
 * Risk 2 of the cockpit plan: signs drifting between the core, the 2D pictures
 * and the 3D scene. These tests hold the 3D conventions against the 2D helpers
 * that already ship, so a sail that twists or bellies the wrong way fails here
 * rather than a month later.
 */
import { describe, expect, it } from 'vitest';
import { clewAt, sailPoints, tackSide, type Side } from '../race/boat';
import type { SectionShape } from '../../core/types';
import {
  camberDir,
  chordDir,
  cross,
  DEG2RAD,
  dot,
  heelRad,
  lee,
  leeward,
  norm,
  planToWorld,
  sub,
  type Vec3,
} from './conventions';

const SECTION: SectionShape = {
  draft: 0.12,
  draftPos: 0.45,
  twistDeg: 8,
  entryDeg: 28,
  exitDeg: 24,
};

const SIDES: Side[] = [1, -1];
const TACK = { x: 0, y: 0 };
const CHORD_PX = 100;

/**
 * Which way the plan view's sail bellies off its chord, as a world direction.
 * The quadratic's mid point sits at the draft position, not half chord, so the
 * along-chord part of the offset is projected out first.
 */
function planBelly(deg: number, side: Side): Vec3 {
  const clew = clewAt(TACK, deg, CHORD_PX, side);
  const pts = sailPoints(TACK, clew, SECTION, side, 24);
  const chord = norm(planToWorld({ x: clew.x - TACK.x, y: clew.y - TACK.y }));
  const off = planToWorld({ x: pts[12].x - TACK.x, y: pts[12].y - TACK.y });
  const along = dot(off, chord);
  return norm(sub(off, [chord[0] * along, chord[1] * along, chord[2] * along]));
}

describe('tack and leeward', () => {
  it('agrees with boat.ts on which tack a TWA is', () => {
    expect(tackSide(42)).toBe(1);
    expect(tackSide(-42)).toBe(-1);
    expect(tackSide(0)).toBe(1);
  });

  it('puts leeward to port on starboard tack and to starboard on port', () => {
    expect(leeward(1)).toEqual([0, 0, -1]);
    expect(leeward(-1)).toEqual([0, 0, 1]);
  });
});

describe('chordDir', () => {
  it.each(SIDES)('matches the plan view chord on side %i', (side) => {
    for (const deg of [2, 12, 28, 45, 80]) {
      const clew = clewAt(TACK, deg, CHORD_PX, side);
      const want = norm(planToWorld({ x: clew.x - TACK.x, y: clew.y - TACK.y }));
      const got = chordDir(deg * DEG2RAD, side);
      expect(dot(got, want)).toBeCloseTo(1, 10);
    }
  });

  it('runs aft, so a sheeted-in chord points at the transom', () => {
    expect(chordDir(0, 1)[0]).toBeLessThan(0);
  });
});

describe('camberDir', () => {
  it.each(SIDES)('bellies the same way sailPath does on side %i', (side) => {
    for (const deg of [2, 12, 28, 45]) {
      const got = camberDir(deg * DEG2RAD, side);
      expect(dot(got, planBelly(deg, side))).toBeCloseTo(1, 6);
    }
  });

  it.each(SIDES)('bellies to leeward on side %i', (side) => {
    expect(dot(camberDir(15 * DEG2RAD, side), leeward(side))).toBeGreaterThan(0);
  });

  it('is perpendicular to the chord', () => {
    for (const side of SIDES) {
      for (const deg of [2, 30, 70]) {
        expect(dot(chordDir(deg * DEG2RAD, side), camberDir(deg * DEG2RAD, side))).toBeCloseTo(
          0,
          12,
        );
      }
    }
  });
});

describe('heel', () => {
  it.each(SIDES)('tips the masthead to leeward on side %i', (side) => {
    const a = heelRad(18, side);
    // Rotate +y about +x by `a`: y -> (0, cos a, sin a).
    const top: Vec3 = [0, Math.cos(a), Math.sin(a)];
    expect(dot(top, leeward(side))).toBeGreaterThan(0);
    expect(top[1]).toBeGreaterThan(0.9);
  });

  it('is flat at zero heel', () => {
    expect(heelRad(0, 1)).toBe(-0);
  });
});

describe('frame', () => {
  it('is right-handed: x cross y is z', () => {
    expect(cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
  });

  it('maps the plan view aft direction onto -x', () => {
    expect(planToWorld({ x: 0, y: 1 })).toEqual([-1, 0, 0]);
    expect(dot(planToWorld({ x: 1, y: 0 }), [0, 0, 1])).toBe(1);
  });

  it('reports lee as the opposite of the tack', () => {
    expect(lee(1)).toBe(-1);
    expect(lee(-1)).toBe(1);
  });

  it('subtracts componentwise', () => {
    expect(sub([3, 2, 1], [1, 1, 1])).toEqual([2, 1, 0]);
  });
});
