import { describe, expect, it } from 'vitest';
import { windageElements, windageForces, type WindageGeometry } from './windage';
import { SPREADER_FACTOR_WINDAGE, WINDAGE_CD } from './tables';

const G: WindageGeometry = {
  hbiM: 0.75,
  fbavM: 0.62,
  beamM: 2.254,
  loaM: 6.91,
  iM: 8.0,
  ehmM: 8.6,
  mastFrontM: 0.075,
  mastSideM: 0.115,
  wireDiaM: 0.005,
  crewCount: 3,
  rfm: 1,
  heelDeg: 0,
};

const flat = (v: number) => () => v;

describe('windage elements (Table 5.10)', () => {
  it('builds hull, both mast rows, rigging and crew', () => {
    const names = windageElements(G).map((e) => e.name);
    expect(names).toEqual(['hull', 'mast-sail', 'mast-bare', 'rigging', 'crew']);
  });

  it('every element has non-negative areas and a centre of effort above the water', () => {
    for (const heelDeg of [0, 10, 25]) {
      for (const e of windageElements({ ...G, heelDeg })) {
        expect(e.aFrontM2).toBeGreaterThanOrEqual(0);
        expect(e.aSideM2).toBeGreaterThanOrEqual(0);
        expect(e.zceM).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('a full mainsail puts all the mast area in the mast-sail row', () => {
    const els = windageElements(G);
    const sail = els[1];
    const bare = els[2];
    expect(sail.aFrontM2).toBeCloseTo(G.ehmM * G.mastFrontM, 12);
    expect(bare.aFrontM2).toBe(0);
    expect(sail.cdFront).toBe(WINDAGE_CD.mastSailFront);
    expect(bare.cdFront).toBe(WINDAGE_CD.mastBareFront);
  });

  it('reefing the main moves mast area from the sailed row to the bare row', () => {
    const els = windageElements({ ...G, rfm: 0.5 });
    expect(els[1].aFrontM2).toBeCloseTo(0.5 * G.ehmM * G.mastFrontM, 12);
    expect(els[2].aFrontM2).toBeCloseTo(0.5 * G.ehmM * G.mastFrontM, 12);
  });

  it('rigging area is I * wire diameter with the spreader factor on Cd', () => {
    // prov: ORC VPP 2023 eqs (5.32) and (5.33)
    const rig = windageElements(G)[3];
    expect(rig.aFrontM2).toBeCloseTo(8.0 * 0.005, 12);
    expect(rig.cdFront).toBeCloseTo(WINDAGE_CD.rigging * (1 + SPREADER_FACTOR_WINDAGE), 12);
    expect(rig.zceM).toBeCloseTo(0.75 + 4.0, 12);
  });

  it('crew side area scales with head count, frontal area does not', () => {
    const three = windageElements(G)[4];
    const four = windageElements({ ...G, crewCount: 4 })[4];
    expect(three.aSideM2).toBeCloseTo(1.5, 12);
    expect(four.aSideM2).toBeCloseTo(2.0, 12);
    expect(four.aFrontM2).toBe(three.aFrontM2);
    expect(four.aFrontM2).toBeCloseTo(0.25, 12);
  });

  it('heel raises the hull and crew centres of effort and grows the hull side area', () => {
    const up = windageElements(G);
    const over = windageElements({ ...G, heelDeg: 25 });
    expect(over[0].zceM).toBeGreaterThan(up[0].zceM);
    expect(over[0].aSideM2).toBeGreaterThan(up[0].aSideM2);
    expect(over[4].zceM).toBeGreaterThan(up[4].zceM);
  });
});

describe('windage forces', () => {
  const els = windageElements(G);

  it('drag is strictly positive at every apparent wind angle', () => {
    for (let awa = 0; awa <= 180; awa += 5)
      expect(windageForces(els, awa, flat(6)).dragN).toBeGreaterThan(0);
  });

  it('drag grows as the square of apparent wind speed', () => {
    const a = windageForces(els, 45, flat(5)).dragN;
    const b = windageForces(els, 45, flat(10)).dragN;
    expect(b / a).toBeCloseTo(4, 9);
    const c = windageForces(els, 45, flat(15)).dragN;
    expect(c / a).toBeCloseTo(9, 9);
  });

  it('drag grows monotonically with apparent wind speed', () => {
    let prev = 0;
    for (let v = 1; v <= 20; v++) {
      const d = windageForces(els, 60, flat(v)).dragN;
      expect(d).toBeGreaterThan(prev);
      prev = d;
    }
  });

  it('retards the boat upwind and drives it downwind', () => {
    expect(windageForces(els, 30, flat(8)).frN).toBeLessThan(0);
    expect(windageForces(els, 150, flat(8)).frN).toBeGreaterThan(0);
    expect(windageForces(els, 90, flat(8)).frN).toBeCloseTo(0, 9);
  });

  it('heeling force and moment are zero head to wind, positive on a reach', () => {
    expect(windageForces(els, 0, flat(8)).fhN).toBeCloseTo(0, 12);
    expect(windageForces(els, 0, flat(8)).mhNm).toBeCloseTo(0, 12);
    expect(windageForces(els, 90, flat(8)).fhN).toBeGreaterThan(0);
    expect(windageForces(els, 90, flat(8)).mhNm).toBeGreaterThan(0);
  });

  it('is symmetric about 90 deg in the frontal contribution', () => {
    // eq (5.26) uses |cos b|, so 45 and 135 deg see the same blend of areas.
    expect(windageForces(els, 45, flat(8)).dragN).toBeCloseTo(
      windageForces(els, 135, flat(8)).dragN,
      9,
    );
  });

  it('is plausible in magnitude: tens of newtons for a J/70 in a breeze', () => {
    // 8 m/s (about 15.5 kt) apparent on the beam.
    const d = windageForces(els, 90, flat(8)).dragN;
    expect(d).toBeGreaterThan(20);
    expect(d).toBeLessThan(400);
  });

  it('uses the per-element wind gradient rather than one speed for the whole rig', () => {
    const gradient = (z: number) => 4 + 0.3 * z;
    const graded = windageForces(els, 60, gradient).dragN;
    const uniform = windageForces(els, 60, flat(gradient(0))).dragN;
    expect(graded).toBeGreaterThan(uniform);
  });
});
