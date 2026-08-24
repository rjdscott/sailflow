import { describe, expect, it } from 'vitest';
import type { RigState, SectionShape } from '../../core/types';
import {
  mastPoints,
  sectionPath,
  sectionPoints,
  telltaleState,
  twistRelativeDeg,
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
