import { describe, expect, it } from 'vitest';
import type { BoatDefinition, RaceControls, SailId, SailShape, SectionShape } from '../types';
import type { FlyingShapeFn } from '../internal';
import { rigState } from '../rig/state';
import { baseDock, baseRace } from './base';
import { flyingShape } from './flying';
import j70 from '../../../data/boats/j70.json';

const boat = j70 as unknown as BoatDefinition;
const SAILS: SailId[] = ['main', 'jib', 'asym'];
const SECTIONS = ['quarter', 'half', 'threeQuarter'] as const;

function rigAt(backstay = baseRace().backstay, dock = baseDock()) {
  return rigState(boat, dock, backstay);
}

function shapeAt(sail: SailId, over: Partial<RaceControls> = {}): SailShape {
  const race = { ...baseRace(), ...over };
  return flyingShape(boat, rigAt(race.backstay), race, sail);
}

function sections(s: SailShape): SectionShape[] {
  return SECTIONS.map((k) => s[k]);
}

function monotone(values: number[], dir: 1 | -1, label: string) {
  expect(values.length).toBeGreaterThan(2);
  for (let i = 1; i < values.length; i++)
    expect(
      dir * (values[i] - values[i - 1]),
      `${label} step ${i}: ${values[i - 1]} -> ${values[i]}`,
    ).toBeGreaterThan(0);
}

function ramp(min: number, max: number, n = 11): number[] {
  return Array.from({ length: n }, (_, i) => min + ((max - min) * i) / (n - 1));
}

describe('flyingShape contract', () => {
  it('satisfies FlyingShapeFn', () => {
    const fn: FlyingShapeFn = flyingShape;
    expect(typeof fn).toBe('function');
  });

  it.each(SAILS)('returns three finite sections for the %s', (sail) => {
    const s = shapeAt(sail);
    expect(Object.keys(s).sort()).toEqual(['half', 'quarter', 'threeQuarter']);
    for (const sec of sections(s))
      for (const v of Object.values(sec)) expect(Number.isFinite(v)).toBe(true);
  });

  it('is deterministic', () => {
    for (const sail of SAILS) expect(shapeAt(sail)).toEqual(shapeAt(sail));
  });
});

describe('clamps hold across the whole control space', () => {
  // Corners of the race-control box: every control at each of its stops.
  const stops: RaceControls[] = [];
  for (const pick of [0, 1] as const) {
    const race = baseRace();
    for (const key of Object.keys(race) as (keyof RaceControls)[]) {
      const spec = boat.controls[key];
      race[key] = pick === 0 ? spec.min : spec.max;
    }
    stops.push(race);
  }
  // Plus the extremes of the rig, which drive draft and twist hardest.
  const rigs = [
    rigState(boat, { upperTurns: -6, lowerTurns: -6, forestayMm: 40 }, 0),
    rigState(boat, { upperTurns: 6, lowerTurns: 6, forestayMm: 0 }, 100),
  ];

  it.each(SAILS)('keeps the %s inside the physical ranges', (sail) => {
    for (const race of stops)
      for (const rig of rigs)
        for (const sec of sections(flyingShape(boat, rig, race, sail))) {
          expect(sec.draft).toBeGreaterThanOrEqual(0.05);
          expect(sec.draft).toBeLessThanOrEqual(0.25);
          expect(sec.draftPos).toBeGreaterThanOrEqual(0.3);
          expect(sec.draftPos).toBeLessThanOrEqual(0.6);
          expect(sec.twistDeg).toBeGreaterThanOrEqual(0);
          expect(sec.twistDeg).toBeLessThanOrEqual(30);
        }
  });

  it('stays inside the ranges at the base state without touching a clamp', () => {
    for (const sail of SAILS)
      for (const sec of sections(shapeAt(sail))) {
        expect(sec.draft).toBeGreaterThan(0.05);
        expect(sec.draft).toBeLessThan(0.25);
        expect(sec.draftPos).toBeGreaterThan(0.3);
        expect(sec.draftPos).toBeLessThan(0.6);
        expect(sec.twistDeg).toBeGreaterThan(0);
        expect(sec.twistDeg).toBeLessThan(30);
      }
  });
});

describe('mainsail responses', () => {
  it('opens the leech as the mainsheet is eased', () => {
    monotone(
      ramp(100, 0).map((mainsheet) => shapeAt('main', { mainsheet }).threeQuarter.twistDeg),
      1,
      'main twist vs sheet ease',
    );
  });

  it('closes the leech as the vang comes on', () => {
    monotone(
      ramp(0, 100).map((vang) => shapeAt('main', { vang }).threeQuarter.twistDeg),
      -1,
      'main twist vs vang',
    );
  });

  it('closes the leech slightly as the traveller comes up', () => {
    const down = shapeAt('main', { traveller: -100 }).threeQuarter.twistDeg;
    const up = shapeAt('main', { traveller: 100 }).threeQuarter.twistDeg;
    expect(up).toBeLessThan(down);
    // "Small" is part of the spec: less than the mainsheet's authority.
    const sheet =
      shapeAt('main', { mainsheet: 0 }).threeQuarter.twistDeg -
      shapeAt('main', { mainsheet: 100 }).threeQuarter.twistDeg;
    expect(down - up).toBeLessThan(sheet);
  });

  it('flattens the lower sections as the outhaul comes on', () => {
    monotone(
      ramp(0, 100).map((outhaul) => shapeAt('main', { outhaul }).quarter.draft),
      -1,
      'main quarter draft vs outhaul',
    );
    // The head barely notices.
    const dQuarter =
      shapeAt('main', { outhaul: 0 }).quarter.draft -
      shapeAt('main', { outhaul: 100 }).quarter.draft;
    const dTop =
      shapeAt('main', { outhaul: 0 }).threeQuarter.draft -
      shapeAt('main', { outhaul: 100 }).threeQuarter.draft;
    expect(dTop).toBeLessThan(dQuarter);
  });

  it('flattens the main and opens its leech as the backstay comes on', () => {
    const backstays = ramp(0, 100);
    monotone(
      backstays.map((backstay) => shapeAt('main', { backstay }).half.draft),
      -1,
      'main draft vs backstay',
    );
    monotone(
      backstays.map((backstay) => shapeAt('main', { backstay }).threeQuarter.twistDeg),
      1,
      'main twist vs backstay',
    );
  });

  it('pulls the draft forward with cunningham and main halyard', () => {
    monotone(
      ramp(0, 100).map((cunningham) => shapeAt('main', { cunningham }).half.draftPos),
      -1,
      'main draftPos vs cunningham',
    );
    monotone(
      ramp(0, 100).map((mainHalyard) => shapeAt('main', { mainHalyard }).half.draftPos),
      -1,
      'main draftPos vs halyard',
    );
  });

  it('twists progressively from the foot to the head', () => {
    const s = shapeAt('main');
    expect(s.quarter.twistDeg).toBeLessThan(s.half.twistDeg);
    expect(s.half.twistDeg).toBeLessThan(s.threeQuarter.twistDeg);
  });
});

describe('jib responses', () => {
  it('deepens the jib as the forestay sags', () => {
    // Sag is a rig output, so sweep it through the backstay, which sets it.
    const drafts = ramp(0, 100).map((backstay) => {
      const rig = rigAt(backstay);
      return { sag: rig.sagMm, draft: flyingShape(boat, rig, baseRace(), 'jib').half.draft };
    });
    monotone(
      drafts.map((d) => d.sag),
      -1,
      'sag vs backstay',
    );
    monotone(
      drafts.map((d) => d.draft),
      -1,
      'jib draft vs backstay (i.e. up with sag)',
    );
    // Stated directly: more sag, more draft.
    expect(drafts[0].sag).toBeGreaterThan(drafts[10].sag);
    expect(drafts[0].draft).toBeGreaterThan(drafts[10].draft);
  });

  it('opens the jib leech and flattens its foot as the lead goes aft', () => {
    const leads = ramp(0, 10);
    monotone(
      leads.map((jibLead) => shapeAt('jib', { jibLead }).threeQuarter.twistDeg),
      1,
      'jib twist vs lead',
    );
    monotone(
      leads.map((jibLead) => shapeAt('jib', { jibLead }).quarter.draft),
      -1,
      'jib foot draft vs lead',
    );
    // The head's depth is not a function of the lead.
    expect(shapeAt('jib', { jibLead: 0 }).threeQuarter.draft).toBeCloseTo(
      shapeAt('jib', { jibLead: 10 }).threeQuarter.draft,
      12,
    );
  });

  it('opens the jib leech as the sheet is eased', () => {
    monotone(
      ramp(100, 0).map((jibSheet) => shapeAt('jib', { jibSheet }).threeQuarter.twistDeg),
      1,
      'jib twist vs sheet ease',
    );
  });

  it('pulls the jib draft forward with halyard tension', () => {
    monotone(
      ramp(0, 100).map((jibHalyard) => shapeAt('jib', { jibHalyard }).half.draftPos),
      -1,
      'jib draftPos vs halyard',
    );
  });

  it('narrows the entry angle as the inhauler comes on', () => {
    const inhaulers = ramp(0, 100);
    monotone(
      inhaulers.map((inhauler) => shapeAt('jib', { inhauler }).half.entryDeg),
      -1,
      'jib entry vs inhauler',
    );
    // Inhauler is a sheeting-angle shift only; it does not change the camber.
    expect(shapeAt('jib', { inhauler: 0 }).half.draft).toBeCloseTo(
      shapeAt('jib', { inhauler: 100 }).half.draft,
      12,
    );
  });
});

describe('entry and exit angles', () => {
  it('follow the camber: deeper section, wider angles', () => {
    const flat = shapeAt('main', { backstay: 100, outhaul: 100 }).half;
    const full = shapeAt('main', { backstay: 0, outhaul: 0 }).half;
    expect(full.draft).toBeGreaterThan(flat.draft);
    expect(full.entryDeg).toBeGreaterThan(flat.entryDeg);
    expect(full.exitDeg).toBeGreaterThan(flat.exitDeg);
  });

  it('give a forward-drafted section a wider entry than exit', () => {
    const s = shapeAt('main').half;
    expect(s.draftPos).toBeLessThan(0.5);
    expect(s.entryDeg).toBeGreaterThan(s.exitDeg);
  });
});

describe('asym', () => {
  it('is deeper and more twisted than the upwind sails, and constant for now', () => {
    const a = shapeAt('asym');
    expect(a.half.draft).toBeGreaterThan(shapeAt('main').half.draft);
    expect(a.threeQuarter.twistDeg).toBeGreaterThan(a.quarter.twistDeg);
    // Documented gap: RaceControls carries no kite trim, so nothing moves it.
    expect(shapeAt('asym', { backstay: 100, vang: 100 })).toEqual(a);
  });
});

describe('knobs', () => {
  it('shape.bendToDraft owns the bend-to-flattening gain and can be zeroed', () => {
    const off = { ...boat, calibration: { 'shape.bendToDraft': 0 } };
    const race = baseRace();
    const soft = flyingShape(off, rigState(off, baseDock(), 0), race, 'main').half.draft;
    const hard = flyingShape(off, rigState(off, baseDock(), 100), race, 'main').half.draft;
    expect(hard).toBeCloseTo(soft, 12);
  });

  it('shape.sagToDraft owns the sag-to-camber gain', () => {
    const hot = { ...boat, calibration: { 'shape.sagToDraft': 0.002 } };
    const rig = rigState(hot, baseDock(), 0);
    expect(flyingShape(hot, rig, baseRace(), 'jib').half.draft).toBeGreaterThan(
      flyingShape(boat, rig, baseRace(), 'jib').half.draft,
    );
  });
});
