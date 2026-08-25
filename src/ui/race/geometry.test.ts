import { describe, expect, it } from 'vitest';
import type { RigState, SectionShape } from '../../core/types';
import {
  type Box,
  mastPoints,
  rotate,
  SECTION_LAYOUT,
  sectionBox,
  sectionPath,
  sectionPoints,
  cropBox,
  telltaleState,
  twistRelativeDeg,
  unionBox,
} from './geometry';

const section = (over: Partial<SectionShape> = {}): SectionShape => ({
  draft: 0.12,
  draftPos: 0.42,
  twistDeg: 8,
  entryDeg: 22,
  exitDeg: -4,
  ...over,
});

describe('sectionPoints', () => {
  it('runs leading edge to trailing edge with finite coordinates', () => {
    const pts = sectionPoints(section(), 100);
    expect(pts).toHaveLength(17);
    expect(pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
    expect(pts[0].x).toBeCloseTo(0);
    expect(pts[0].y).toBeCloseTo(0);
    expect(pts[pts.length - 1].x).toBeCloseTo(100);
    expect(pts[pts.length - 1].y).toBeCloseTo(0);
  });

  it('has one camber peak: rises then falls, and x never goes backwards', () => {
    for (const dp of [0.3, 0.42, 0.55, 0.7]) {
      const pts = sectionPoints(section({ draftPos: dp }), 100, 40);
      const camber = pts.map((p) => -p.y);
      const peak = camber.indexOf(Math.max(...camber));
      for (let i = 1; i <= peak; i++) expect(camber[i]).toBeGreaterThan(camber[i - 1]);
      for (let i = peak + 1; i < camber.length; i++) expect(camber[i]).toBeLessThan(camber[i - 1]);
      for (let i = 1; i < pts.length; i++) expect(pts[i].x).toBeGreaterThan(pts[i - 1].x);
    }
  });

  it('scales camber depth with draft', () => {
    const shallow = sectionPoints(section({ draft: 0.05 }), 100);
    const deep = sectionPoints(section({ draft: 0.2 }), 100);
    expect(Math.max(...deep.map((p) => -p.y))).toBeGreaterThan(
      Math.max(...shallow.map((p) => -p.y)),
    );
  });

  it('emits a path with no NaN, even for a degenerate section', () => {
    const d = sectionPath(section({ draft: 0, draftPos: 0 }), 100);
    expect(d).not.toMatch(/NaN|Infinity/);
    expect(d.startsWith('M 0 0 Q')).toBe(true);
  });
});

describe('twistRelativeDeg', () => {
  it('measures twist against the reference section', () => {
    expect(twistRelativeDeg(section({ twistDeg: 14 }), section({ twistDeg: 6 }))).toBe(8);
    expect(twistRelativeDeg(section({ twistDeg: 6 }), section({ twistDeg: 6 }))).toBe(0);
  });
});

describe('telltaleState', () => {
  it('streams inside the band either side of the entry angle', () => {
    expect(telltaleState(20, 20)).toBe('streaming');
    expect(telltaleState(23, 20)).toBe('streaming');
    expect(telltaleState(17, 20)).toBe('streaming');
  });

  it('lifts below the band and stalls above it', () => {
    expect(telltaleState(16.9, 20)).toBe('lifting');
    expect(telltaleState(23.1, 20)).toBe('stalled');
    expect(telltaleState(40, 20)).toBe('stalled');
  });

  it('takes a custom band width', () => {
    expect(telltaleState(25, 20, 10)).toBe('streaming');
    expect(telltaleState(25, 20, 1)).toBe('stalled');
  });
});

describe('mastPoints', () => {
  const rig = (over: Partial<RigState> = {}): RigState => ({
    bendMm: [0, 5, 12, 22, 34, 48, 63, 78, 90, 98, 102],
    sagMm: 18,
    rakeMm: 600,
    prebendMm: 42,
    forestayN: 1800,
    upperN: 2100,
    lowerN: 900,
    ...over,
  });

  it('returns one finite point per station, partners at the bottom', () => {
    const pts = mastPoints(rig(), 200, 42.5);
    expect(pts).toHaveLength(11);
    expect(pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
    expect(pts[0].y).toBe(200);
    expect(pts[10].y).toBe(0);
  });

  it('rakes the tip aft and bends the middle forward', () => {
    const straight = mastPoints(rig({ bendMm: new Array(11).fill(0) }), 200, 42.5);
    expect(straight[10].x).toBeGreaterThan(0);
    expect(straight[0].x).toBe(0);
    const bent = mastPoints(rig({ rakeMm: 0 }), 200, 42.5);
    expect(bent[5].x).toBeLessThan(0);
  });

  it('exaggerates bend but not rake', () => {
    const x1 = mastPoints(rig({ rakeMm: 0 }), 200, 42.5, 1)[5].x;
    const x5 = mastPoints(rig({ rakeMm: 0 }), 200, 42.5, 5)[5].x;
    expect(x5).toBeCloseTo(x1 * 5);
  });
});

describe('rotate', () => {
  it('is the identity at zero and turns clockwise for positive degrees', () => {
    expect(rotate({ x: 3, y: 4 }, 0)).toEqual({ x: 3, y: 4 });
    const q = rotate({ x: 10, y: 0 }, 90);
    expect(q.x).toBeCloseTo(0);
    expect(q.y).toBeCloseTo(10); // +y is down in screen space
  });

  it('rotates about an arbitrary point', () => {
    const p = rotate({ x: 15, y: 5 }, 180, { x: 5, y: 5 });
    expect(p.x).toBeCloseTo(-5);
    expect(p.y).toBeCloseTo(5);
  });
});

describe('sectionBox', () => {
  it('spans the chord when the section is flat and unrotated', () => {
    const b = sectionBox(section({ draft: 0, twistDeg: 0 }), 100, { x: 10, y: 50 }, 0);
    expect(b.minX).toBeCloseTo(10);
    expect(b.maxX).toBeCloseTo(110);
    expect(b.minY).toBeCloseTo(50);
    expect(b.maxY).toBeCloseTo(50);
  });

  it('lifts the leech when the section is twisted open', () => {
    const flat = sectionBox(section(), 100, { x: 0, y: 100 }, 0);
    const open = sectionBox(section(), 100, { x: 0, y: 100 }, -20);
    expect(open.minY).toBeLessThan(flat.minY);
    expect(open.maxX).toBeLessThan(flat.maxX); // foreshortened by the rotation
  });
});

describe('SECTION_LAYOUT', () => {
  // src/core/shape/flying.ts clamps every section to these ranges, so the
  // extremes below are the worst the drawing will ever be asked to hold.
  // This is the "does it clip?" check that a browser would otherwise be for.
  const DRAFT = [0.05, 0.25];
  const POS = [0.3, 0.6];
  // Twist grows with height (flying.test.ts), so twist relative to the quarter
  // section is never negative and the component only ever rotates the leech up.
  const ROT = [-30, 0];

  /** Union of every section the component can draw, over the clamped extremes. */
  function worstCase(): Box {
    let box: Box | null = null;
    for (const sail of [0, 1]) {
      for (const [ri, y] of SECTION_LAYOUT.rowY.entries()) {
        // The quarter row is the twist reference, so it is never rotated.
        const twists = ri === 2 ? [0] : ROT;
        for (const draft of DRAFT) {
          for (const draftPos of POS) {
            for (const deg of twists) {
              const b = sectionBox(
                section({ draft, draftPos }),
                SECTION_LAYOUT.chord,
                { x: SECTION_LAYOUT.luffX[sail], y },
                deg,
              );
              box = box ? unionBox(box, b) : b;
            }
          }
        }
      }
    }
    return box as Box;
  }

  it('holds every extreme section inside the viewBox', () => {
    const b = worstCase();
    expect(b.minX).toBeGreaterThanOrEqual(0);
    expect(b.maxX).toBeLessThanOrEqual(SECTION_LAYOUT.w);
    expect(b.minY).toBeGreaterThanOrEqual(SECTION_LAYOUT.luffTop);
    // The sail name sits on its own baseline below the lowest row.
    expect(b.maxY).toBeLessThanOrEqual(SECTION_LAYOUT.labelY - 10);
  });

  it('leaves the rows clear of each other at maximum twist', () => {
    const [top, mid, bot] = SECTION_LAYOUT.rowY;
    const at = (y: number, deg: number) =>
      sectionBox(section({ draft: 0.25, draftPos: 0.6 }), SECTION_LAYOUT.chord, { x: 0, y }, deg);
    // Worst case: an untwisted row above a fully twisted one.
    expect(at(top, 0).maxY).toBeLessThanOrEqual(at(mid, -30).minY);
    expect(at(mid, 0).maxY).toBeLessThanOrEqual(at(bot, 0).minY);
  });

  it('keeps the two sail panels from overlapping', () => {
    const [mainX, jibX] = SECTION_LAYOUT.luffX;
    expect(jibX).toBeGreaterThan(mainX + SECTION_LAYOUT.chord);
  });
});

describe('cropBox', () => {
  it('is the tightest box round the points', () => {
    expect(
      cropBox([
        { x: 3, y: -1 },
        { x: -2, y: 7 },
        { x: 1, y: 2 },
      ]),
    ).toEqual({
      minX: -2,
      maxX: 3,
      minY: -1,
      maxY: 7,
    });
  });

  it('grows by the pad on every side', () => {
    expect(cropBox([{ x: 0, y: 0 }], 5)).toEqual({ minX: -5, maxX: 5, minY: -5, maxY: 5 });
  });

  it('returns an empty box rather than an infinite one with no points', () => {
    expect(cropBox([])).toEqual({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
  });
});
