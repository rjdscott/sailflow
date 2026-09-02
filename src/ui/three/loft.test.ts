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
  ribbonAnchor,
  DEFAULT_M,
  DEFAULT_N,
  gridRow,
  HEAD_CAMBER_FACTOR,
  pchip,
  profileY,
  SKIRT_LOW_POINT_EXPONENT,
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

  // -------------------------------------------------------------------------
  // The rise term: a section whose two ends are at different heights (audit
  // `kite-3d-01` C-02). Only the kite sets `riseM`; the main and the jib have
  // to be drawn exactly as they were.
  // -------------------------------------------------------------------------

  it('lands a section with `riseM` on its leech-end height and leaves the luff end alone', () => {
    const risen: Section[] = stack.map((s, i) => ({ ...s, riseM: 0.4 + 0.3 * i }));
    const m = buildSail(risen, STRAIGHT, BOOM, 1);
    for (const [row, rise] of [
      [0, 0.4],
      [m.N - 1, 1.6],
    ] as const) {
      const h = row / (m.N - 1);
      const pts = gridRow(m, row);
      // The luff end is pinned on the spine: x = 0 carries none of the rise.
      expect(pts[0][1]).toBeCloseTo(STRAIGHT(h)[1], 6);
      // The leech end carries all of it.
      expect(pts[pts.length - 1][1]).toBeCloseTo(STRAIGHT(h)[1] + rise, 6);
    }
    // Proportional to chord fraction in between, so the row is a straight ramp
    // in height and not a curve of its own.
    const foot = gridRow(m, 0);
    for (let j = 0; j < m.M; j++)
      expect(foot[j][1]).toBeCloseTo(STRAIGHT(0)[1] + 0.4 * chordFraction(j, m.M), 6);
  });

  it("leaves a section without `riseM` in its luff point's own horizontal plane", () => {
    // The main and the jib regression: `sectionStack` sets no `riseM`, so
    // every row of this mesh stays flat, at the spine height it roots on.
    for (let i = 0; i < mesh.N; i++) {
      const want = STRAIGHT(i / (mesh.N - 1))[1];
      for (const p of gridRow(mesh, i)) expect(p[1]).toBeCloseTo(want, 6);
    }
  });

  it('hangs `dropM` below the end-to-end line, lowest a third of the chord aft', () => {
    // The skirt is measured off the *line between the two ends*, not off the
    // luff point's plane, so it composes with `riseM` without moving a corner.
    const skirted: Section[] = stack.map((s) => ({ ...s, riseM: 0.9, dropM: 0.35 }));
    const m = buildSail(skirted, STRAIGHT, BOOM, 1);
    const row = gridRow(m, 0);
    const base = STRAIGHT(0)[1];
    expect(row[0][1]).toBeCloseTo(base, 6);
    expect(row[m.M - 1][1]).toBeCloseTo(base + 0.9, 6);
    let deepest = 0;
    let atX = 0;
    for (let j = 0; j < m.M; j++) {
      const x = chordFraction(j, m.M);
      const sag = base + 0.9 * x - row[j][1];
      if (sag > deepest) {
        deepest = sag;
        atX = x;
      }
    }
    expect(deepest).toBeCloseTo(0.35, 2);
    // `sin(π·x^k)` peaks at x = ½^(1/k) — about a third of the chord aft. The
    // grid resolves it to its nearest cosine-clustered column, ~0.01 wide here.
    expect(Math.abs(atX - Math.pow(0.5, 1 / SKIRT_LOW_POINT_EXPONENT))).toBeLessThan(0.02);
    expect(atX).toBeGreaterThan(0.25);
    expect(atX).toBeLessThan(0.42);
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

describe('ribbonAnchor', () => {
  const shape: SailShape = {
    quarter: { draft: 0.1, draftPos: 0.4, twistDeg: 3, entryDeg: 20, exitDeg: 8 },
    half: { draft: 0.11, draftPos: 0.42, twistDeg: 8, entryDeg: 22, exitDeg: 9 },
    threeQuarter: { draft: 0.09, draftPos: 0.45, twistDeg: 14, entryDeg: 18, exitDeg: 7 },
  };
  const chords: SailChords = { foot: 3, quarter: 2.6, half: 2.1, threeQuarter: 1.4, head: 0.3 };
  const mesh = buildSail(sectionStack(shape, chords), (h) => [0, h * 8, 0], 0.15, 1);

  it('a leech ribbon roots exactly on the leech and streams aft', () => {
    for (const row of mesh.stripeRows) {
      const { root, along } = ribbonAnchor(mesh, row, mesh.M - 1, 0);
      const leech = gridRow(mesh, row)[mesh.M - 1];
      expect(root).toEqual(leech);
      expect(along[0]).toBeLessThan(0); // aft is −x
      expect(Math.hypot(...along)).toBeCloseTo(1, 9);
    }
  });

  it('a lifted ribbon sits `lift` off the cloth, horizontally, never buried', () => {
    const j = nearestColumn(mesh, 0.15);
    for (const row of mesh.stripeRows) {
      const on = gridRow(mesh, row)[j];
      const { root } = ribbonAnchor(mesh, row, j, 0.04);
      expect(root[1]).toBe(on[1]);
      expect(Math.hypot(root[0] - on[0], root[2] - on[2])).toBeCloseTo(0.04, 6);
    }
  });

  // The 3D hero hangs a windward and a leeward ribbon at the same station and
  // gives them different states (a windward telltale lifts, a leeward one
  // stalls), so the sign of `lift` has to mean the same face on both tacks.
  // The chord's own horizontal normal does not: it flips with the tack.
  it.each([1, -1] as const)('signs `lift` to leeward on tack %d', (side) => {
    const m = buildSail(sectionStack(shape, chords), (h) => [0, h * 8, 0], 0.15, side);
    const j = nearestColumn(m, 0.15);
    for (const row of m.stripeRows) {
      const on = gridRow(m, row)[j];
      const lee = ribbonAnchor(m, row, j, 0.04).root;
      const wind = ribbonAnchor(m, row, j, -0.04).root;
      // Leeward is -z on starboard tack, +z on port (`conventions.lee`).
      expect(Math.sign(lee[2] - on[2])).toBe(side === 1 ? -1 : 1);
      expect(Math.sign(wind[2] - on[2])).toBe(side === 1 ? 1 : -1);
    }
  });
});
