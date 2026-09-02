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
  MAST_STATION,
  PLAN_LAYOUT,
  roseArrow,
  sailPath,
  sailPoints,
  tackSide,
  type Side,
  localAoa,
  luffRibbon,
  leechRibbon,
} from './boat';
import { cropBox, rotate, type Pt } from './geometry';
import { BASE_RACE, BASE_RACE_DOWN } from '../stores/conditions.svelte';
import type { DownControls } from '../../core/types';
import { BARE_SPAR, kiteGeometry } from '../three/kite';
import type { Vec3 } from '../three/conventions';

/**
 * The drawn starboard sheerline, sampled: the hull's half-width at a given y.
 * `hullPath` is `M` plus two cubics down the starboard half before the mirror,
 * so the first seven coordinate pairs are that half.
 */
function sheerHalfWidthAt(y: number): number {
  const p = coords(hullPath(PLAN_LAYOUT.scale));
  const pts: Pt[] = [];
  for (let seg = 0; seg < 2; seg++) {
    const [p0, c1, c2, p3] = p.slice(seg * 3, seg * 3 + 4);
    for (let i = 0; i <= 400; i++) {
      const t = i / 400;
      const u = 1 - t;
      const at = (a: number, b: number, c: number, d: number) =>
        u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
      pts.push({ x: at(p0.x, c1.x, c2.x, p3.x), y: at(p0.y, c1.y, c2.y, p3.y) });
    }
  }
  return pts.reduce((best, q) => (Math.abs(q.y - y) < Math.abs(best.y - y) ? q : best)).x;
}

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

const SCALE = PLAN_LAYOUT.scale;

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

  /**
   * audit kite-3d-01 H-11: the station was an assumed 0.45·LOA, 0.77 m aft of
   * the boat's own J, and every deck feature and the whole kite projection
   * hung off it. `data/boats/j70.json` carries `rig.jM` 2.34 and
   * `hull.loaM` 6.91.
   */
  it("steps the mast at the boat file's own J", () => {
    expect(MAST_STATION * DIMS.loaM).toBeCloseTo(2.34, 6);
    expect(d.mast.y).toBeCloseTo(2.34 * SCALE, 6);
  });

  it('sweeps the chainplates aft of the spar and keeps them inboard of the sheer', () => {
    expect(d.chainplates).toHaveLength(2);
    for (const c of d.chainplates) {
      // On the mast station itself a 1.0 m chainplate lands outside the drawn
      // sheerline; swept by `sweepDeg`, it is on deck.
      expect(c.y).toBeGreaterThan(d.mast.y);
      expect(Math.abs(c.x)).toBeLessThan(sheerHalfWidthAt(c.y));
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

  /**
   * The owner-visible defect: at 150° TWA the plan view and the 3D hero drew a
   * beat's boom, ~20° off the centreline, because the upwind mainsheet was
   * still on the slider. The mapping is right about that — boom angle is sheet
   * and traveller, not wind angle — so the fix is the trim, and this is the
   * number the trim now uses. Out past the corner of the boat, leech bearing
   * on the leeward shroud, the 60-80° band the guides describe (research
   * `2026-08-25-spinnaker` doc 03 §2.1 `T3`, §2.2 `T2`).
   */
  it('draws the downwind base trim in the eased band and the upwind one on a beat', () => {
    const down = boomAngle(BASE_RACE_DOWN.mainsheet, BASE_RACE.traveller);
    expect(down).toBeGreaterThanOrEqual(60);
    expect(down).toBeLessThanOrEqual(80);
    expect(boomAngle(BASE_RACE.mainsheet, BASE_RACE.traveller)).toBeLessThan(25);
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

describe('roseArrow', () => {
  const C = { x: 40, y: 40 };

  it('blows inward: the head is nearer the centre than the tail', () => {
    for (let deg = 20; deg <= 180; deg += 5) {
      const a = roseArrow(deg, C, 22, 14);
      const d = (p: Pt) => Math.hypot(p.x - C.x, p.y - C.y);
      expect(d(a.tail)).toBeCloseTo(22);
      expect(d(a.head)).toBeCloseTo(8);
    }
  });

  it('parks the tail where the wind comes from, bow up', () => {
    // Head to wind: dead ahead, which is -y. Dead downwind: astern, +y.
    expect(roseArrow(0, C, 20, 10).tail).toEqual({ x: 40, y: 20 });
    expect(roseArrow(180, C, 20, 10).tail.y).toBeCloseTo(60);
    // On the wind, starboard tack: to windward, which is +x.
    expect(roseArrow(90, C, 20, 10).tail.x).toBeCloseTo(60);
  });

  it('mirrors on port tack', () => {
    for (const deg of [24, 42, 90, 155]) {
      const st = roseArrow(deg, C, 22, 14);
      const pt = roseArrow(-deg, C, 22, 14);
      for (const k of ['head', 'tail'] as const) {
        expect(pt[k].x).toBeCloseTo(2 * C.x - st[k].x);
        expect(pt[k].y).toBeCloseTo(st[k].y);
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

  it('fits inside the rose, arrowhead included, at every wind speed', () => {
    for (const kt of [2, 4, 12, 25, 40]) {
      expect(arrowLength(kt)).toBeGreaterThan(4);
      expect(arrowLength(kt)).toBeLessThan(PLAN_LAYOUT.rose.radius);
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

// ---------------------------------------------------------------------------
// The crop. SECTION_LAYOUT's fit test does this for the sail sections; this is
// the same check for the plan view, and it is the reason the viewBox can be
// cropped tight to the hull instead of padded until nothing could possibly
// clip (owner feedback, 2026-08-25).
// ---------------------------------------------------------------------------

describe('PLAN_LAYOUT', () => {
  const L = PLAN_LAYOUT;
  const D = deck(L.scale);
  const ORIGIN = L.origin;
  const MAST = { x: ORIGIN.x, y: ORIGIN.y + D.mast.y };
  const HUB = { x: ORIGIN.x, y: ORIGIN.y + (D.sternY + D.spritTip.y) / 2 };
  /** Widest label the drawing writes ("AWA 149°"), at font-size 7, centred. */
  const LABEL = { halfW: 17, up: 6, down: 3 };
  /** A ribbon is 16.5 units of rect and swings ±54° about its anchor. */
  const RIBBON = 16.5;

  const labelInk = (c: Pt): Pt[] => [
    { x: c.x - LABEL.halfW, y: c.y - LABEL.up },
    { x: c.x + LABEL.halfW, y: c.y + LABEL.down },
  ];
  const around = (p: Pt, r: number): Pt[] => [
    { x: p.x - r, y: p.y - r },
    { x: p.x + r, y: p.y + r },
  ];

  /** Everything the heeling group draws, at one tack and one drawn heel. */
  function boatInk(side: Side, tiltDeg: number): Pt[] {
    // Deepest legal section, sheets fully eased: the widest the picture goes.
    const s = section({ draft: 0.25, draftPos: 0.6 });
    const boomDeg = boomAngle(0, -100);
    const boomTip = clewAt(MAST, boomDeg, D.boomPx, side);
    const jibClew = clewAt(ORIGIN, jibSheetAngle(10, 0), D.jibFootPx, side);
    const ghostHead = openBy(
      MAST,
      clewAt(MAST, boomDeg, D.boomPx * DIMS.headChord.main, side),
      30,
      side,
    );

    const deckPts = coords(D.hull).map((p) => ({ x: ORIGIN.x + p.x, y: ORIGIN.y + p.y }));
    const sailPts = [
      ...sailPoints(MAST, boomTip, s, side, 24),
      ...sailPoints(ORIGIN, jibClew, s, side, 24),
      ...sailPoints(MAST, ghostHead, s, side, 12),
    ];
    // Telltales: four up the jib luff, two on the main leech.
    const tell = [
      ...sailPoints(ORIGIN, jibClew, s, side, 4).slice(1),
      ghostHead,
      clewAt(MAST, boomDeg, D.boomPx * 0.88, side),
    ];

    const pts = [
      ...deckPts,
      { x: ORIGIN.x, y: ORIGIN.y + D.spritTip.y },
      { x: ORIGIN.x, y: ORIGIN.y + D.sternY },
      ...sailPts,
      ...tell.flatMap((p) => around(p, RIBBON)),
    ];
    return pts.map((p) => rotate(p, tiltDeg, HUB));
  }

  /** The wind rose and the heel figure: fixed to the tack, never heeled. */
  function chromeInk(side: Side): Pt[] {
    const c = { x: ORIGIN.x + side * L.rose.dx, y: ORIGIN.y + L.rose.dy };
    return [
      ...around(c, L.rose.radius),
      ...L.rose.labelY.flatMap((y) => labelInk({ x: c.x, y })),
      ...labelInk({ x: ORIGIN.x + side * L.heelTag.dx, y: L.heelTag.y }),
    ];
  }

  it('holds every tack, heel and trim inside the viewBox', () => {
    for (const side of [1, -1] as Side[]) {
      for (let heel = 0; heel <= 40; heel += 5) {
        const tilt = drawnHeel(heel, side);
        const b = cropBox([...boatInk(side, tilt), ...chromeInk(side)]);
        expect(b.minX, `minX side ${side} heel ${heel}`).toBeGreaterThanOrEqual(0);
        expect(b.maxX, `maxX side ${side} heel ${heel}`).toBeLessThanOrEqual(L.w);
        expect(b.minY, `minY side ${side} heel ${heel}`).toBeGreaterThanOrEqual(0);
        expect(b.maxY, `maxY side ${side} heel ${heel}`).toBeLessThanOrEqual(L.h);
      }
    }
  });

  it('crops to the boat: the hull owns the height of the card', () => {
    const boatLen = D.sternY - D.spritTip.y;
    expect(boatLen / L.h).toBeGreaterThan(0.9);
    // ...and the hull alone, which is what "how big is the boat" reads off.
    expect(D.sternY / L.h).toBeGreaterThan(0.75);
  });

  it('keeps the wind rose clear of the deck on both tacks', () => {
    const D2 = deck(L.scale);
    const beam = Math.max(...coords(D2.hull).map((p) => Math.abs(p.x)));
    expect(L.rose.dx - L.rose.radius).toBeGreaterThan(beam);
  });

  describe('under the gennaker', () => {
    /**
     * Both bounds of the asym crop, from one sweep rather than from the
     * shipping default: every downwind control at 0/50/100, the four solved
     * apparent wind angles the app reaches under the kite, both tacks, with
     * the boat group's own heel rotation applied. The old version of this test
     * bounded x only, at kiteSheet 50 and AWA 150 only, and passed green while
     * six states were clipped — the luff's forward bow at every kite state and
     * the clew at full ease (audit kite-3d-01 H-02).
     */
    const CONTROL_STEPS = [0, 50, 100];
    const KITE_AWAS = [69, 93, 118, 159];

    /** Same world → viewBox map as `PlanView.svelte`'s `toPlan`: one scale, both axes. */
    const toPlan = (p: Vec3): Pt => ({ x: ORIGIN.x + p[2] * L.scale, y: MAST.y - p[0] * L.scale });

    /** The polygon `PlanView` strokes: luff tack-to-head, then leech head-to-clew. */
    function kitePlan(down: DownControls, side: Side, awaDeg: number, n = 32): Pt[] {
      const g = kiteGeometry(down, BARE_SPAR, side, awaDeg);
      const [headY, clewY] = [g.head[1], g.clew[1]];
      return [
        ...Array.from({ length: n + 1 }, (_, i) => g.spine(i / n)),
        ...Array.from({ length: n + 1 }, (_, i) => g.leechAt(headY + ((clewY - headY) * i) / n)),
      ].map(toPlan);
    }

    it('tacks the kite on the drawn bowsprit tip', () => {
      // The projection is isotropic again (H-11): with the mast stepped at the
      // rig's own J, `L.scale` on both axes lands the kite's tack exactly on
      // the sprit tip the deck plan draws, with no fore-and-aft stretch to
      // bridge a wrong mast station.
      const down: DownControls = { kiteHalyard: 100, tackLine: 50, kiteSheet: 50, sprit: 100 };
      for (const side of [1, -1] as Side[]) {
        const tack = toPlan(kiteGeometry(down, BARE_SPAR, side, 150).tack);
        expect(tack.x, `side ${side}`).toBeCloseTo(ORIGIN.x, 6);
        expect(tack.y, `side ${side}`).toBeCloseTo(ORIGIN.y + D.spritTip.y, 6);
      }
    });

    it('keeps the kite luff and leech inside the widened viewBox', () => {
      const box = {
        minX: ORIGIN.x - L.asymHalfW,
        maxX: ORIGIN.x + L.asymHalfW,
        minY: L.asymTop,
        maxY: L.h,
      };
      for (const kiteSheet of CONTROL_STEPS) {
        for (const tackLine of CONTROL_STEPS) {
          for (const kiteHalyard of CONTROL_STEPS) {
            for (const sprit of CONTROL_STEPS) {
              const down: DownControls = { kiteHalyard, tackLine, kiteSheet, sprit };
              for (const awaDeg of KITE_AWAS) {
                for (const side of [1, -1] as Side[]) {
                  const pts = kitePlan(down, side, awaDeg);
                  for (let heel = 0; heel <= 40; heel += 10) {
                    const b = cropBox(pts.map((p) => rotate(p, drawnHeel(heel, side), HUB)));
                    const at = `sheet ${kiteSheet} tack ${tackLine} halyard ${kiteHalyard} sprit ${sprit} awa ${awaDeg} side ${side} heel ${heel}`;
                    expect(b.minX, `minX ${at}`).toBeGreaterThanOrEqual(box.minX);
                    expect(b.maxX, `maxX ${at}`).toBeLessThanOrEqual(box.maxX);
                    expect(b.minY, `minY ${at}`).toBeGreaterThanOrEqual(box.minY);
                    expect(b.maxY, `maxY ${at}`).toBeLessThanOrEqual(box.maxY);
                  }
                }
              }
            }
          }
        }
      }
    });

    it('leaves the jib-settings viewBox untouched', () => {
      // asymHalfW only widens the crop when the kite might be drawn; the hull
      // test above already holds `0 0 w h` for every jib trim and heel.
      expect(2 * L.asymHalfW).toBeGreaterThan(L.w);
    });
  });
});
