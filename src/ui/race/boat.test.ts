import { describe, expect, it } from 'vitest';
import type { SectionShape } from '../../core/types';
import {
  arrowLength,
  boomAngle,
  clewAt,
  deck,
  DIMS,
  drawnHeel,
  hullPath,
  MAX_DRAWN_HEEL,
  jibSheetAngle,
  openBy,
  sailPath,
  sailPoints,
  tackSide,
  windArrow,
  type Ring,
  type Side,
  localAoa,
  luffRibbon,
  leechRibbon,
} from './boat';
import type { Pt } from './geometry';

const section = (over: Partial<SectionShape> = {}): SectionShape => ({
  draft: 0.13,
  draftPos: 0.44,
  twistDeg: 9,
  entryDeg: 22,
  exitDeg: -4,
  ...over,
});

/** Every coordinate pair in an SVG path built only from M/C/L/Q/Z. */
function coords(d: string): Pt[] {
  const n = d.match(/-?\d+(\.\d+)?/g) ?? [];
  expect(n.length % 2).toBe(0);
  const out: Pt[] = [];
  for (let i = 0; i < n.length; i += 2) out.push({ x: Number(n[i]), y: Number(n[i + 1]) });
  return out;
}

const SCALE = 21;

// The layout the component draws in, repeated here so the label/clearance
// tests exercise the numbers that actually ship.
const HUB = { x: 160, y: 132 };
const TWA_RING: Ring = { rx: 110, ry: 100, len: 18, tagOff: 28 };
const AWA_RING: Ring = { rx: 110, ry: 100, len: 18, tagOff: -28 };
const VIEW = { w: 320, h: 264 };

describe('hullPath', () => {
  it('is finite and closed', () => {
    const d = hullPath(SCALE);
    expect(d.endsWith('Z')).toBe(true);
    expect(coords(d).every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });

  it('is symmetric about the centreline', () => {
    const pts = coords(hullPath(SCALE));
    for (const p of pts) {
      expect(pts.some((q) => Math.abs(q.x + p.x) < 1e-6 && Math.abs(q.y - p.y) < 1e-6)).toBe(true);
    }
  });

  it('runs bow to transom at class proportions, never wider than the beam', () => {
    const pts = coords(hullPath(SCALE));
    const maxY = Math.max(...pts.map((p) => p.y));
    const maxX = Math.max(...pts.map((p) => p.x));
    expect(maxY).toBeCloseTo(DIMS.loaM * SCALE, 5);
    // Control points may sit a hair outside the curve; the curve itself must not.
    expect(maxX).toBeLessThanOrEqual(DIMS.halfBeamM * SCALE * 1.05);
    expect(maxX / maxY).toBeCloseTo(DIMS.halfBeamM / DIMS.loaM, 1);
  });

  it('scales linearly', () => {
    const big = coords(hullPath(32));
    coords(hullPath(16)).forEach((p, i) => {
      expect(big[i].x / 2).toBeCloseTo(p.x, 1);
      expect(big[i].y / 2).toBeCloseTo(p.y, 1);
    });
  });
});

describe('deck', () => {
  const d = deck(SCALE);

  it('puts the cabin forward of the mast and the cockpit aft of it', () => {
    const cabinAft = Math.max(...coords(d.cabin).map((p) => p.y));
    const cockpitFwd = Math.min(...coords(d.cockpit).map((p) => p.y));
    expect(cabinAft).toBeLessThan(d.mast.y);
    expect(cockpitFwd).toBeGreaterThan(d.mast.y);
  });

  it('keeps cabin and cockpit inside the deck', () => {
    const beam = DIMS.halfBeamM * SCALE;
    for (const path of [d.cabin, d.cockpit]) {
      for (const p of coords(path)) {
        expect(Math.abs(p.x)).toBeLessThan(beam);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(d.sternY);
      }
    }
  });

  it('extends the bowsprit forward of the stem', () => {
    expect(d.spritTip.y).toBeCloseTo(-DIMS.spritM * SCALE);
    expect(d.tack).toEqual({ x: 0, y: 0 });
  });
});

describe('boomAngle', () => {
  it('opens monotonically as the mainsheet eases', () => {
    const angles = [100, 80, 60, 40, 20, 0].map((ms) => boomAngle(ms, 0));
    for (let i = 1; i < angles.length; i++) expect(angles[i]).toBeGreaterThan(angles[i - 1]);
  });

  it('opens with the traveller down (−) and closes with it up (+)', () => {
    expect(boomAngle(50, -100)).toBeGreaterThan(boomAngle(50, 0));
    expect(boomAngle(50, 100)).toBeLessThan(boomAngle(50, 0));
  });

  it('stays a drawable angle over the whole control range', () => {
    for (const ms of [0, 50, 100]) {
      for (const tr of [-100, 0, 100]) {
        const a = boomAngle(ms, tr);
        expect(a).toBeGreaterThanOrEqual(2);
        expect(a).toBeLessThanOrEqual(90);
      }
    }
  });
});

describe('jibSheetAngle', () => {
  it('opens with the lead aft and closes as the sheet comes on', () => {
    expect(jibSheetAngle(10, 50)).toBeGreaterThan(jibSheetAngle(0, 50));
    expect(jibSheetAngle(5, 100)).toBeLessThan(jibSheetAngle(5, 0));
  });

  it('stays between the centreline and a beam-reach angle at every legal control state', () => {
    for (const lead of [0, 5, 10]) {
      for (const sheet of [0, 50, 100]) {
        const a = jibSheetAngle(lead, sheet);
        expect(a).toBeGreaterThanOrEqual(2);
        expect(a).toBeLessThanOrEqual(60);
      }
    }
  });
});

describe('sailPath', () => {
  const tack = { x: 160, y: 132 };

  it('starts at the tack, ends at the clew, and closes', () => {
    const clew = clewAt(tack, 14, 46, 1);
    const pts = sailPoints(tack, clew, section(), 1, 8);
    expect(pts[0].x).toBeCloseTo(tack.x);
    expect(pts[0].y).toBeCloseTo(tack.y);
    expect(pts[pts.length - 1].x).toBeCloseTo(clew.x);
    expect(pts[pts.length - 1].y).toBeCloseTo(clew.y);
    expect(sailPath(tack, clew, section(), 1).endsWith('Z')).toBe(true);
    expect(coords(sailPath(tack, clew, section(), 1)).every((p) => Number.isFinite(p.x))).toBe(
      true,
    );
  });

  it('bellies to leeward, and deeper draft bellies further', () => {
    const clew = clewAt(tack, 0, 46, 1); // boom on the centreline: leeward is −x
    const belly = (draft: number) =>
      tack.x - Math.min(...sailPoints(tack, clew, section({ draft }), 1, 32).map((p) => p.x));
    expect(belly(0.05)).toBeGreaterThan(0);
    expect(belly(0.18)).toBeGreaterThan(belly(0.05));
  });

  it('mirrors on port tack', () => {
    for (const deg of [6, 18, 34]) {
      const s = sailPoints(tack, clewAt(tack, deg, 46, 1), section(), 1, 16);
      const p = sailPoints(tack, clewAt(tack, deg, 46, -1), section(), -1, 16);
      s.forEach((q, i) => {
        expect(p[i].x).toBeCloseTo(2 * tack.x - q.x);
        expect(p[i].y).toBeCloseTo(q.y);
      });
    }
  });

  it('opens the twist ghost to leeward on both tacks', () => {
    for (const side of [1, -1] as Side[]) {
      const clew = clewAt(tack, 12, 46, side);
      const ghost = openBy(tack, clew, 9, side);
      // Further from the centreline than the boom, same distance from the tack.
      expect(Math.abs(ghost.x - tack.x)).toBeGreaterThan(Math.abs(clew.x - tack.x));
      expect(Math.hypot(ghost.x - tack.x, ghost.y - tack.y)).toBeCloseTo(46);
    }
  });
});

describe('windArrow', () => {
  it('mirrors on port tack', () => {
    for (const deg of [24, 42, 90, 155]) {
      const s = windArrow(deg, HUB, TWA_RING);
      const p = windArrow(-deg, HUB, TWA_RING);
      for (const k of ['head', 'tail', 'tag'] as const) {
        expect(p[k].x).toBeCloseTo(2 * HUB.x - s[k].x);
        expect(p[k].y).toBeCloseTo(s[k].y);
      }
    }
  });

  it('points inward: the head is nearer the boat than the tail', () => {
    for (let deg = 20; deg <= 180; deg += 5) {
      const a = windArrow(deg, HUB, TWA_RING);
      const d = (p: Pt) => Math.hypot(p.x - HUB.x, p.y - HUB.y);
      expect(d(a.head)).toBeLessThan(d(a.tail));
      expect(d(a.tail) - d(a.head)).toBeCloseTo(TWA_RING.len);
    }
  });

  it('keeps both tags clear of the sails and inside the viewBox, TWA 20..180', () => {
    const d = deck(SCALE);
    const origin = { x: HUB.x, y: HUB.y - (d.sternY + d.spritTip.y) / 2 };
    const mast = { x: origin.x, y: origin.y + d.mast.y };
    const bow = { x: origin.x, y: origin.y };
    // The heel inset, mirrored to windward with the tack.
    const heel = (sd: Side) => {
      const cx = sd === 1 ? 50 : VIEW.w - 50;
      return { minX: cx - 34, maxX: cx + 34, minY: 226 - 44, maxY: 226 + 36 };
    };

    for (let twa = 20; twa <= 180; twa += 2) {
      for (const side of [1, -1] as Side[]) {
        // Widest sails the controls can produce: sheets fully eased.
        const boom = clewAt(mast, boomAngle(0, 100), d.boomPx, side);
        const clew = clewAt(bow, jibSheetAngle(10, 0), d.jibFootPx, side);
        const sail = [
          ...sailPoints(mast, boom, section({ draft: 0.2 }), side, 24),
          ...sailPoints(bow, clew, section({ draft: 0.2 }), side, 24),
        ];
        const box = {
          minX: Math.min(...sail.map((p) => p.x)),
          maxX: Math.max(...sail.map((p) => p.x)),
          minY: Math.min(...sail.map((p) => p.y)),
          maxY: Math.max(...sail.map((p) => p.y)),
        };
        // AWA never exceeds TWA on the wind and trails it downwind.
        for (const [deg, ring] of [
          [twa, TWA_RING],
          [Math.max(12, twa - 18), AWA_RING],
        ] as [number, Ring][]) {
          const { tag } = windArrow(side * deg, HUB, ring);
          const outside =
            tag.x < box.minX || tag.x > box.maxX || tag.y < box.minY || tag.y > box.maxY;
          expect(outside, `tag ${deg}° side ${side} inside sail bbox`).toBe(true);
          // Tags are centre-anchored; allow for the widest label we draw.
          expect(tag.x - 24).toBeGreaterThan(0);
          expect(tag.x + 24).toBeLessThan(VIEW.w);
          expect(tag.y - 8).toBeGreaterThan(0);
          expect(tag.y + 4).toBeLessThan(VIEW.h);
          // ...and clear of the heel inset in the windward bottom corner.
          const h = heel(side);
          const clear =
            tag.x + 26 < h.minX || tag.x - 26 > h.maxX || tag.y + 4 < h.minY || tag.y - 8 > h.maxY;
          expect(clear, `tag ${deg}° side ${side} over the heel inset`).toBe(true);
        }
      }
    }
  });

  it('parks the arrow head clear of the bowsprit and the transom', () => {
    const d = deck(SCALE);
    const reach = (d.sternY - d.spritTip.y) / 2;
    for (let deg = -180; deg <= 180; deg += 5) {
      for (const ring of [TWA_RING, AWA_RING]) {
        const { head } = windArrow(deg, HUB, ring);
        expect(Math.hypot(head.x - HUB.x, head.y - HUB.y)).toBeGreaterThan(reach + 4);
      }
    }
  });
});

describe('tackSide', () => {
  it('reads positive TWA as starboard and negative as port', () => {
    expect(tackSide(42)).toBe(1);
    expect(tackSide(0)).toBe(1);
    expect(tackSide(-42)).toBe(-1);
  });
});

describe('telltales and traveller sign', () => {
  it('traveller up (+) pulls the boom towards the centreline', () => {
    expect(boomAngle(70, 50)).toBeLessThan(boomAngle(70, 0));
    expect(boomAngle(70, -50)).toBeGreaterThan(boomAngle(70, 0));
  });
  it('sheeting the jib in at fixed apparent wind stalls the luff telltales', () => {
    const awa = 26;
    const states = [40, 70, 100].map((sheet) =>
      luffRibbon(localAoa(awa, jibSheetAngle(5, sheet), 6, 0.5)),
    );
    expect(states[0]).toBe('lifting');
    expect(states[2]).toBe('stalled');
    expect(new Set(states).size).toBeGreaterThan(1);
  });
  it('the top telltale lifts before the bottom one when twist opens the head', () => {
    const awa = 20;
    const sheetDeg = jibSheetAngle(5, 70);
    const low = luffRibbon(localAoa(awa, sheetDeg, 12, 0.25));
    const top = luffRibbon(localAoa(awa, sheetDeg, 12, 1));
    expect(low === 'lifting' && top !== 'lifting').toBe(false);
    expect(localAoa(awa, sheetDeg, 12, 1)).toBeLessThan(localAoa(awa, sheetDeg, 12, 0.25));
  });
  it('main leech stalls when over-sheeted with little twist and streams when eased', () => {
    expect(leechRibbon(26, boomAngle(100, 40), 3)).toBe('stalled');
    expect(leechRibbon(26, boomAngle(55, 0), 12)).not.toBe('stalled');
  });

  // The state is the CSS class: PlanView writes `class="ribbon {state}"` and
  // styles .streaming/.lifting/.stalled, so a renamed state loses its flutter.
  it('only ever returns a state the stylesheet animates', () => {
    const classes = new Set(['streaming', 'lifting', 'stalled']);
    for (let aoa = -40; aoa <= 60; aoa += 1) {
      expect(classes.has(luffRibbon(aoa))).toBe(true);
      expect(classes.has(leechRibbon(aoa, 12, 8))).toBe(true);
    }
  });
});

describe('arrowLength', () => {
  it('grows with wind speed and clamps outside the app range', () => {
    expect(arrowLength(4)).toBeLessThan(arrowLength(12));
    expect(arrowLength(12)).toBeLessThan(arrowLength(25));
    expect(arrowLength(1)).toBe(arrowLength(4));
    expect(arrowLength(60)).toBe(arrowLength(25));
  });

  it('keeps the longest arrow inside the viewBox at every angle', () => {
    const len = arrowLength(25);
    for (let deg = 0; deg <= 180; deg += 2) {
      for (const side of [1, -1] as Side[]) {
        const { tail } = windArrow(side * deg, HUB, { ...TWA_RING, len });
        expect(tail.x, `tail x at ${deg}°`).toBeGreaterThan(0);
        expect(tail.x).toBeLessThan(VIEW.w);
        expect(tail.y, `tail y at ${deg}°`).toBeGreaterThan(0);
        expect(tail.y).toBeLessThan(VIEW.h);
      }
    }
  });
});

describe('drawnHeel', () => {
  it('tips the deck to leeward, mirrored by tack', () => {
    expect(drawnHeel(18, 1)).toBeLessThan(0);
    expect(drawnHeel(18, -1)).toBeGreaterThan(0);
    expect(drawnHeel(18, -1)).toBe(-drawnHeel(18, 1));
    expect(drawnHeel(10, 1)).toBe(-10);
  });

  it('is capped, so a broach does not spin the drawing', () => {
    expect(Math.abs(drawnHeel(90, 1))).toBe(MAX_DRAWN_HEEL);
    expect(Math.abs(drawnHeel(-90, 1))).toBe(MAX_DRAWN_HEEL);
  });
});
