/**
 * Invariants, not coefficients (research 03 §7). The loft is the one part of
 * the 3D view that can be wrong in a way nobody notices, so every number the
 * readouts show is asserted to come back out of the surface, and the head and
 * foot extrapolation is pinned by one golden snapshot.
 */
import { describe, expect, it } from 'vitest';
import type { SailShape } from '../../core/types';
import { camberDir, chordDir, cross, DEG2RAD, dot, norm, sub, type Vec3 } from './conventions';
import {
  buildSail,
  chordFraction,
  nearestColumn,
  DEFAULT_M,
  DEFAULT_N,
  gridRow,
  HEAD_CAMBER_FACTOR,
  pchip,
  profileY,
  sectionStack,
  solveSectionBezier,
  type Profile,
  type SailChords,
  type Section,
} from './loft';

const CHORDS: SailChords = {
  foot: 2.876,
  quarter: 2.57,
  half: 2.134,
  threeQuarter: 1.425,
  head: 0.364,
};

/** A canonical mid-range main: the solver's own clamps, mid-band. */
const SHAPE: SailShape = {
  quarter: { draft: 0.12, draftPos: 0.45, twistDeg: 2.4, entryDeg: 28.1, exitDeg: 23.6 },
  half: { draft: 0.114, draftPos: 0.45, twistDeg: 5.2, entryDeg: 26.9, exitDeg: 22.5 },
  threeQuarter: { draft: 0.096, draftPos: 0.45, twistDeg: 8, entryDeg: 23.1, exitDeg: 19.2 },
};

/** A straight vertical luff: the loft under test, not the rig. */
const STRAIGHT = (h: number): Vec3 => [0, 7.974 * h, 0];

const BOOM = 14 * DEG2RAD;

function sample(prof: Profile, n = 2000): { x: number; y: number }[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = i / n;
    return { x, y: profileY(prof, x) };
  });
}

describe('solveSectionBezier', () => {
  const cases: [camber: number, draftPos: number, entryDeg: number][] = [
    [0.12, 0.45, 28],
    [0.06, 0.35, 19],
    [0.2, 0.55, 36],
    [0.09, 0.6, 17],
  ];

  it.each(cases)('puts max camber %f at %f with entry %f', (camber, draftPos, entryDeg) => {
    const prof = solveSectionBezier(camber, draftPos, entryDeg * DEG2RAD);
    const pts = sample(prof);
    const peak = pts.reduce((a, b) => (b.y > a.y ? b : a));
    expect(peak.y).toBeCloseTo(camber, 3);
    expect(peak.x).toBeCloseTo(draftPos, 2);
  });

  it.each(cases)(
    'leaves the luff at the entry angle for %f/%f/%f',
    (camber, draftPos, entryDeg) => {
      const prof = solveSectionBezier(camber, draftPos, entryDeg * DEG2RAD);
      const eps = 1e-6;
      const slope = (profileY(prof, eps) - profileY(prof, 0)) / eps;
      expect(slope).toBeCloseTo(Math.tan(entryDeg * DEG2RAD), 4);
    },
  );

  it('closes at both ends', () => {
    const prof = solveSectionBezier(0.12, 0.45, 28 * DEG2RAD);
    expect(profileY(prof, 0)).toBeCloseTo(0, 12);
    expect(profileY(prof, 1)).toBeCloseTo(0, 12);
  });

  it('is planar when there is no camber and no entry', () => {
    const prof = solveSectionBezier(0, 0.45, 0);
    expect(prof).toEqual({ a: 0, b: 0, c: 0 });
    expect(sample(prof, 50).every((p) => p.y === 0)).toBe(true);
  });

  it('never returns NaN for degenerate inputs', () => {
    const degenerate: [number, number, number][] = [
      [0, 0, 0],
      [0.5, 1, Math.PI],
      [-1, -1, -Math.PI],
      [Number.MAX_VALUE, 0.5, 1e9],
    ];
    for (const [camber, draftPos, entry] of degenerate) {
      const prof = solveSectionBezier(camber, draftPos, entry);
      expect(Number.isFinite(prof.a + prof.b + prof.c)).toBe(true);
      expect(sample(prof, 20).every((p) => Number.isFinite(p.y))).toBe(true);
    }
  });
});

describe('pchip', () => {
  it('passes through every knot', () => {
    const xs = [0, 0.25, 0.5, 0.75, 1];
    const ys = [0, 2.4, 5.2, 8, 10.8];
    const f = pchip(xs, ys);
    xs.forEach((x, i) => expect(f(x)).toBeCloseTo(ys[i], 12));
  });

  it('does not overshoot a monotone twist ramp — the Catmull-Rom bug', () => {
    const xs = [0, 0.25, 0.5, 0.75, 1];
    const ys = [0, 2.4, 5.2, 8, 10.8];
    const f = pchip(xs, ys);
    for (let i = 0; i <= 400; i++) {
      const h = i / 400;
      const lo = ys[Math.max(0, Math.floor(h * 4))];
      const hi = ys[Math.min(4, Math.ceil(h * 4))];
      expect(f(h)).toBeGreaterThanOrEqual(lo - 1e-9);
      expect(f(h)).toBeLessThanOrEqual(hi + 1e-9);
    }
  });

  it('flattens at a local extremum instead of ringing', () => {
    const f = pchip([0, 1, 2, 3], [0, 1, 1, 0]);
    for (let i = 0; i <= 300; i++) {
      const v = f((i / 300) * 3);
      expect(v).toBeGreaterThanOrEqual(-1e-9);
      expect(v).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it('clamps outside the knot range and survives short inputs', () => {
    const f = pchip([0, 1], [3, 5]);
    expect(f(-2)).toBe(3);
    expect(f(9)).toBe(5);
    expect(pchip([0.5], [7])(0)).toBe(7);
    expect(pchip([], [])(0)).toBe(0);
  });
});

describe('sectionStack', () => {
  const stack = sectionStack(SHAPE, CHORDS);

  it('is five sections, foot to head, in order', () => {
    expect(stack.map((s) => s.h)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it('carries the solved knots through untouched', () => {
    expect(stack[2].camber).toBe(SHAPE.half.draft);
    expect(stack[2].draftPos).toBe(SHAPE.half.draftPos);
    expect(stack[2].twistRad).toBeCloseTo(SHAPE.half.twistDeg * DEG2RAD, 12);
  });

  it('gives the foot no twist and the quarter section shape', () => {
    expect(stack[0].twistRad).toBe(0);
    expect(stack[0].camber).toBe(SHAPE.quarter.draft);
    expect(stack[0].chord).toBe(CHORDS.foot);
  });

  it('flattens the head and extrapolates its twist off the half-to-three-quarter ramp', () => {
    expect(stack[4].camber).toBeCloseTo(SHAPE.threeQuarter.draft * HEAD_CAMBER_FACTOR, 12);
    expect(stack[4].twistRad).toBeCloseTo(
      (2 * SHAPE.threeQuarter.twistDeg - SHAPE.half.twistDeg) * DEG2RAD,
      12,
    );
    expect(stack[4].chord).toBe(CHORDS.head);
  });

  it('keeps twist monotone up the sail even when the solver flattens the ramp', () => {
    const flat: SailShape = {
      ...SHAPE,
      half: { ...SHAPE.half, twistDeg: 9 },
      threeQuarter: { ...SHAPE.threeQuarter, twistDeg: 8 },
    };
    const s = sectionStack(flat, CHORDS);
    expect(s[4].twistRad).toBeGreaterThanOrEqual(s[3].twistRad);
  });
});

describe('buildSail', () => {
  const stack = sectionStack(SHAPE, CHORDS);
  const mesh = buildSail(stack, STRAIGHT, BOOM, 1);

  it('is an N x M grid with 16-bit indices', () => {
    expect(mesh.N).toBe(DEFAULT_N);
    expect(mesh.M).toBe(DEFAULT_M);
    expect(mesh.positions).toHaveLength(DEFAULT_N * DEFAULT_M * 3);
    expect(mesh.normals).toHaveLength(DEFAULT_N * DEFAULT_M * 3);
    expect(mesh.indices).toHaveLength((DEFAULT_N - 1) * (DEFAULT_M - 1) * 6);
    expect(DEFAULT_N * DEFAULT_M).toBeLessThanOrEqual(65535);
  });

  it('indexes only vertices it built', () => {
    for (const i of mesh.indices) expect(i).toBeLessThan(DEFAULT_N * DEFAULT_M);
  });

  it('has no NaN anywhere', () => {
    expect([...mesh.positions].every(Number.isFinite)).toBe(true);
    expect([...mesh.normals].every(Number.isFinite)).toBe(true);
  });

  it('has unit normals', () => {
    for (let k = 0; k < mesh.normals.length; k += 3) {
      expect(Math.hypot(mesh.normals[k], mesh.normals[k + 1], mesh.normals[k + 2])).toBeCloseTo(
        1,
        6,
      );
    }
  });

  it.each([1, -1] as const)('points every normal to leeward on side %i', (side) => {
    const m = buildSail(stack, STRAIGHT, BOOM, side);
    const lee = camberDir(BOOM, side);
    for (let k = 0; k < m.normals.length; k += 3) {
      expect(dot([m.normals[k], m.normals[k + 1], m.normals[k + 2]], lee)).toBeGreaterThan(0);
    }
  });

  it.each([1, -1] as const)('winds its triangles to match those normals on side %i', (side) => {
    const m = buildSail(stack, STRAIGHT, BOOM, side);
    const vert = (i: number): Vec3 => [
      m.positions[i * 3],
      m.positions[i * 3 + 1],
      m.positions[i * 3 + 2],
    ];
    for (let t = 0; t < m.indices.length; t += 3) {
      const [a, b, c] = [m.indices[t], m.indices[t + 1], m.indices[t + 2]];
      const face = cross(sub(vert(b), vert(a)), sub(vert(c), vert(a)));
      const n: Vec3 = [m.normals[a * 3], m.normals[a * 3 + 1], m.normals[a * 3 + 2]];
      expect(dot(norm(face), n)).toBeGreaterThan(0);
    }
  });

  it('starts each row on the luff spine and reproduces the section camber', () => {
    for (const [row, want] of [
      [mesh.stripeRows[0], SHAPE.quarter],
      [mesh.stripeRows[1], SHAPE.half],
      [mesh.stripeRows[2], SHAPE.threeQuarter],
    ] as const) {
      const h = row / (mesh.N - 1);
      const pts = gridRow(mesh, row);
      const luff = STRAIGHT(h);
      expect(Math.hypot(...sub(pts[0], luff))).toBeCloseTo(0, 5);
      // Camber is the peak offset from the chord line, as a fraction of chord.
      const chord = Math.hypot(...sub(pts[pts.length - 1], pts[0]));
      const dir = norm(sub(pts[pts.length - 1], pts[0]));
      const peak = Math.max(
        ...pts.map((p) => {
          const d = sub(p, pts[0]);
          return Math.hypot(
            ...sub(d, [dir[0] * dot(d, dir), dir[1] * dot(d, dir), dir[2] * dot(d, dir)]),
          );
        }),
      );
      expect(peak / chord).toBeCloseTo(want.draft, 2);
    }
  });

  it('opens the leech to leeward as it goes up: the twist sign', () => {
    const foot = gridRow(mesh, 0);
    const head = gridRow(mesh, mesh.N - 1);
    const angle = (row: Vec3[]): number => {
      const d = norm(sub(row[row.length - 1], row[0]));
      return Math.atan2(dot(d, camberDir(0, 1)), dot(d, chordDir(0, 1)));
    };
    expect(angle(head)).toBeGreaterThan(angle(foot));
  });

  it('puts the draft stripes on the quarter, half and three-quarter rows', () => {
    expect(mesh.stripeRows.map((r) => r / (mesh.N - 1))).toEqual([6 / 23, 12 / 23, 17 / 23]);
  });

  it('survives a head chord of zero without NaN normals', () => {
    const degenerate: Section[] = sectionStack(SHAPE, { ...CHORDS, head: 0 });
    const m = buildSail(degenerate, STRAIGHT, BOOM, 1);
    expect([...m.positions].every(Number.isFinite)).toBe(true);
    expect([...m.normals].every(Number.isFinite)).toBe(true);
  });

  it('is flat when every section is', () => {
    const flat: Section[] = sectionStack(
      {
        quarter: { draft: 0, draftPos: 0.45, twistDeg: 0, entryDeg: 0, exitDeg: 0 },
        half: { draft: 0, draftPos: 0.45, twistDeg: 0, entryDeg: 0, exitDeg: 0 },
        threeQuarter: { draft: 0, draftPos: 0.45, twistDeg: 0, entryDeg: 0, exitDeg: 0 },
      },
      CHORDS,
    );
    const m = buildSail(flat, STRAIGHT, BOOM, 1);
    const off = camberDir(BOOM, 1);
    for (let v = 0; v < m.N * m.M; v++) {
      const p: Vec3 = [m.positions[v * 3], m.positions[v * 3 + 1], m.positions[v * 3 + 2]];
      expect(dot(p, off)).toBeCloseTo(0, 6);
    }
  });

  /**
   * One snapshot, not one per function. It catches an unintended global change
   * to the loft — including a change to the head and foot extrapolation, which
   * dominates the silhouette — and it is cheap to regenerate on purpose.
   */
  it('matches the golden surface for the canonical trim', () => {
    expect([...mesh.positions].map((v) => Number(v.toFixed(4)))).toMatchSnapshot();
  });
});

describe('chord columns', () => {
  it('cosine clustering runs luff to leech and nearestColumn inverts it', () => {
    const M = 32;
    expect(chordFraction(0, M)).toBe(0);
    expect(chordFraction(M - 1, M)).toBeCloseTo(1, 12);
    for (let j = 1; j < M; j++)
      expect(chordFraction(j, M)).toBeGreaterThan(chordFraction(j - 1, M));
    // 15 % chord lands well aft of the wire and well short of the draft.
    const j = nearestColumn({ M }, 0.15);
    expect(j).toBeGreaterThan(2);
    expect(Math.abs(chordFraction(j, M) - 0.15)).toBeLessThan(0.03);
    expect(nearestColumn({ M }, 0)).toBe(0);
    expect(nearestColumn({ M }, 1)).toBe(M - 1);
  });
});
