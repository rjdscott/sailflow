import { describe, expect, it } from 'vitest';
import j70 from '../../../data/boats/j70.json';
import type { BoatDefinition, RigState } from '../../core/types';
import { along, girthMm, layoutPoints, rigLayout, VIEW } from './rigLayout';

const boat = j70 as unknown as BoatDefinition;

const rig = (over: Partial<RigState> = {}): RigState => ({
  bendMm: Array.from({ length: 11 }, () => 0),
  sagMm: 0,
  rakeMm: 0,
  prebendMm: 0,
  forestayN: 1500,
  upperN: 3400,
  lowerN: 1600,
  ...over,
});

/** Drawn length of a dimension bar, viewBox units. */
function dim(label: string, l = rigLayout(boat, rig())): number {
  const d = l.dims.find((x) => x.label === label);
  if (!d) throw new Error(`no ${label} dimension`);
  return Math.hypot(d.to.x - d.from.x, d.to.y - d.from.y);
}

describe('scale', () => {
  it('draws I, J, P and E at the ratios in the boat JSON', () => {
    const l = rigLayout(boat, rig());
    const { iM, jM, pM, eM } = boat.rig;
    // Every dimension goes through one scale, so each drawn length over its
    // real length is the same number.
    for (const [label, m] of [
      ['I', iM],
      ['J', jM],
      ['P', pM],
      ['E', eM],
    ] as const) {
      expect(dim(label, l) / m, `${label} is off scale`).toBeCloseTo(l.scale, 6);
    }
  });

  it('puts the hounds at I above the sheer and the transom at LOA − J aft', () => {
    const l = rigLayout(boat, rig());
    expect((l.heel.y - l.hounds.y) / l.scale).toBeCloseTo(boat.rig.iM, 6);
    expect((l.transom.x - l.stem.x) / l.scale).toBeCloseTo(boat.hull.loaM, 6);
  });

  it('extends the bowsprit by its class maximum only under the gennaker', () => {
    const out = rigLayout(boat, rig(), { spritOut: true });
    const home = rigLayout(boat, rig(), { spritOut: false });
    expect((out.stem.x - out.spritTip.x) / out.scale).toBeCloseTo(
      boat.rig.bowspritOuterMm / 1000,
      6,
    );
    expect(home.spritTip.x).toBeCloseTo(home.stem.x, 6);
  });
});

describe('mast', () => {
  it('runs partners to tip, one station per bendMm entry', () => {
    const l = rigLayout(boat, rig());
    expect(l.mast).toHaveLength(11);
    expect(l.mast[0].y).toBeCloseTo(l.heel.y, 6);
    // Screen y grows downward: every station is above the one below it.
    for (let i = 1; i < l.mast.length; i++) expect(l.mast[i].y).toBeLessThan(l.mast[i - 1].y);
    expect((l.heel.y - l.tip.y) / l.scale).toBeCloseTo(boat.rig.mastLenM, 6);
  });

  it('rakes the tip aft by rakeMm, to scale and never exaggerated', () => {
    const raked = rigLayout(boat, rig({ rakeMm: 150 }));
    expect((raked.tip.x - raked.plumbTip.x) / raked.scale).toBeCloseTo(0.15, 6);
    const loud = rigLayout(boat, rig({ rakeMm: 150 }), { exaggeration: 20 });
    expect(loud.tip.x).toBeCloseTo(raked.tip.x, 6);
  });

  it('bows the mast forward at the bend stations, exaggerated', () => {
    const bend = Array.from({ length: 11 }, (_, i) => (i === 5 ? 100 : 0));
    const l = rigLayout(boat, rig({ bendMm: bend }), { exaggeration: 5 });
    const plumb = rigLayout(boat, rig());
    // +x is aft, so forward bend is a negative offset, five times life size.
    expect((l.mast[5].x - plumb.mast[5].x) / l.scale).toBeCloseTo(-0.5, 6);
  });

  it('hangs the mainsail luff on the bent mast, so bend moves the sail', () => {
    const bend = Array.from({ length: 11 }, () => 60);
    const l = rigLayout(boat, rig({ bendMm: bend }));
    const plumb = rigLayout(boat, rig());
    expect(along(l.main.luff, 0.5).x).toBeLessThan(along(plumb.main.luff, 0.5).x);
  });

  it('bows the jib luff with forestay sag', () => {
    const l = rigLayout(boat, rig({ sagMm: 60 }));
    const taut = rigLayout(boat, rig());
    expect(along(l.jib.luff, 0.5).x).toBeGreaterThan(along(taut.jib.luff, 0.5).x);
  });
});

describe('sails', () => {
  it('measures the girths off the luff at the class widths', () => {
    const l = rigLayout(boat, rig());
    const width = (g: { luff: { x: number; y: number }; leech: { x: number; y: number } }) =>
      (Math.hypot(g.leech.x - g.luff.x, g.leech.y - g.luff.y) / l.scale) * 1000;
    const main = Object.fromEntries(l.main.girths.map((g) => [g.label, width(g)]));
    expect(main['¾']).toBeCloseTo(girthMm(boat.sails.main, 'threeQuarterMm'), 3);
    expect(main['½']).toBeCloseTo(girthMm(boat.sails.main, 'halfMm'), 3);
    expect(main['¼']).toBeCloseTo(girthMm(boat.sails.main, 'quarterMm'), 3);
    const jib = Object.fromEntries(l.jib.girths.map((g) => [g.label, width(g)]));
    expect(jib['½']).toBeCloseTo(girthMm(boat.sails.jib, 'halfMm'), 3);
  });

  it('drops the jib outline when the gennaker is up', () => {
    const l = rigLayout(boat, rig(), { jibUp: false });
    expect(l.jib.path).toBe('');
    expect(l.jib.girths).toHaveLength(0);
    // The forestay is still there: the headsail furls, it does not come down.
    expect(l.forestayPath).not.toBe('');
  });
});

describe('viewBox', () => {
  /**
   * Bend, sag and rake envelope the drawing has to survive.
   *
   * `src/ui` may only import `src/core/types` (eslint no-restricted-imports),
   * so this cannot call `rigState` to sweep the dock controls. Instead it
   * sweeps an envelope that contains the solver's whole reachable range with
   * room to spare: over every corner of the j70.json dock and backstay ranges
   * (upper/lower turns ±6, forestay 0–40 mm, backstay 0–100 %) `rigState`
   * produces at most 134 mm of bend, 70 mm of sag and 152 mm of rake. If a
   * calibration change pushes the solver past these, widen the envelope and
   * re-check the margins rather than deleting the test.
   */
  const BEND_MM = [-250, 0, 250];
  const SAG_MM = [0, 150];
  const RAKE_MM = [0, 300];

  function* states(): Generator<RigState> {
    for (const bend of BEND_MM)
      for (const sagMm of SAG_MM)
        for (const rakeMm of RAKE_MM) {
          // Peak amidships and at the tip: two different worst cases for the
          // luff, since the leech is measured off the bent mast.
          for (const shape of [
            (i: number) => bend * Math.sin((Math.PI * i) / 10),
            (i: number) => (bend * i) / 10,
          ])
            yield rig({ bendMm: Array.from({ length: 11 }, (_, i) => shape(i)), sagMm, rakeMm });
        }
  }

  it('keeps every point inside the viewBox across that envelope', () => {
    let n = 0;
    for (const state of states()) {
      for (const opts of [
        { spritOut: true, jibUp: true },
        { spritOut: false, jibUp: false },
      ]) {
        const where = `bend ${state.bendMm[5].toFixed(0)} sag ${state.sagMm} rake ${state.rakeMm}`;
        for (const p of layoutPoints(rigLayout(boat, state, opts))) {
          expect(Number.isFinite(p.x) && Number.isFinite(p.y), where).toBe(true);
          expect(p.x, `x escapes left at ${where}`).toBeGreaterThanOrEqual(0);
          expect(p.x, `x escapes right at ${where}`).toBeLessThanOrEqual(VIEW.w);
          expect(p.y, `y escapes top at ${where}`).toBeGreaterThanOrEqual(0);
          expect(p.y, `y escapes bottom at ${where}`).toBeLessThanOrEqual(VIEW.h);
        }
      }
      n++;
    }
    expect(n).toBe(24);
  });
});
