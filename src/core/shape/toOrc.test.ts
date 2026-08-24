import { describe, expect, it } from 'vitest';
import type { BoatDefinition, DockControls, RaceControls, SailId, SailShape } from '../types';
import type { ShapeToOrcFn } from '../internal';
import { rigState } from '../rig/state';
import { flyingShape } from './flying';
import { baseDock, baseRace } from './base';
import { shapeToOrc } from './toOrc';
import j70 from '../../../data/boats/j70.json';

const boat = { ...(j70 as unknown as BoatDefinition), calibration: {} }; // module tests run on default knobs;
const UPWIND: SailId[] = ['main', 'jib'];

function shapesAt(
  over: Partial<RaceControls> = {},
  dock: DockControls = baseDock(),
  sails: SailId[] = UPWIND,
): { shapes: Partial<Record<SailId, SailShape>>; race: RaceControls } {
  const race = { ...baseRace(), ...over };
  const rig = rigState(boat, dock, race.backstay);
  const shapes: Partial<Record<SailId, SailShape>> = {};
  for (const s of sails) shapes[s] = flyingShape(boat, rig, race, s);
  return { shapes, race };
}

function orcAt(over: Partial<RaceControls> = {}, dock?: DockControls) {
  const { shapes, race } = shapesAt(over, dock);
  return shapeToOrc(boat, shapes, race, 'jib');
}

function ramp(min: number, max: number, n = 11): number[] {
  return Array.from({ length: n }, (_, i) => min + ((max - min) * i) / (n - 1));
}

describe('shapeToOrc contract', () => {
  it('satisfies ShapeToOrcFn', () => {
    const fn: ShapeToOrcFn = shapeToOrc;
    expect(typeof fn).toBe('function');
  });

  it('is deterministic', () => {
    expect(orcAt()).toEqual(orcAt());
  });

  it('handles an empty sail set without dividing by zero', () => {
    const r = shapeToOrc(boat, {}, baseRace(), 'jib');
    expect(Number.isFinite(r.flat)).toBe(true);
    expect(Number.isFinite(r.twistEffDeg)).toBe(true);
    for (const v of Object.values(r.deltas)) expect(Number.isFinite(v)).toBe(true);
  });
});

describe('the base state is the datum', () => {
  it('returns exactly zero deltas at base dock and base race controls', () => {
    const r = orcAt();
    // Math.abs so that a signed zero still reads as exactly zero.
    expect(Math.abs(r.deltas.dCLmax)).toBe(0);
    expect(Math.abs(r.deltas.dCD0)).toBe(0);
    expect(Math.abs(r.deltas.dCEh)).toBe(0);
    expect(Math.abs(r.deltas.dTwistDeg)).toBe(0);
  });

  it('returns flat 1 and reef 1 at base', () => {
    const r = orcAt();
    expect(r.flat).toBe(1);
    expect(r.reef).toBe(1);
  });

  it('is the datum for the downwind sail set too', () => {
    const { shapes, race } = shapesAt({}, baseDock(), ['main', 'asym']);
    const r = shapeToOrc(boat, shapes, race, 'asym');
    expect(Math.abs(r.deltas.dCLmax)).toBe(0);
    expect(Math.abs(r.deltas.dTwistDeg)).toBe(0);
    expect(r.flat).toBe(1);
  });
});

describe('flat', () => {
  const flats = ramp(0, 100).map((backstay) => orcAt({ backstay }).flat);

  it('stays inside the ORC 2023 range everywhere in the control space', () => {
    const corners: Partial<RaceControls>[] = [
      {},
      { backstay: 0, outhaul: 0, jibLead: 0, mainsheet: 0, vang: 0 },
      { backstay: 100, outhaul: 100, jibLead: 10, mainsheet: 100, vang: 100 },
      { backstay: 100, outhaul: 100, jibLead: 10, cunningham: 100 },
    ];
    const docks: DockControls[] = [
      baseDock(),
      { upperTurns: -6, lowerTurns: -6, forestayMm: 40 },
      { upperTurns: 6, lowerTurns: 6, forestayMm: 0 },
    ];
    for (const c of corners)
      for (const d of docks) {
        const f = orcAt(c, d).flat;
        expect(f).toBeGreaterThanOrEqual(0.42);
        expect(f).toBeLessThanOrEqual(1);
      }
  });

  it('never increases as the backstay comes on', () => {
    for (let i = 1; i < flats.length; i++) expect(flats[i]).toBeLessThanOrEqual(flats[i - 1]);
  });

  it('is strictly lower at full backstay than at none', () => {
    expect(flats[flats.length - 1]).toBeLessThan(flats[0]);
    expect(flats[0]).toBe(1);
  });

  it('falls further when the outhaul is added to the backstay', () => {
    expect(orcAt({ backstay: 100, outhaul: 100 }).flat).toBeLessThan(orcAt({ backstay: 100 }).flat);
  });

  it('gets close to the ORC floor at full depower', () => {
    const f = orcAt({ backstay: 100, outhaul: 100, jibLead: 10, cunningham: 100 }).flat;
    expect(f).toBeLessThan(0.6);
  });
});

describe('reef', () => {
  it('is 1 everywhere except cunningham and backstay both at their stops', () => {
    expect(orcAt({ backstay: 100 }).reef).toBe(1);
    expect(orcAt({ cunningham: 100 }).reef).toBe(1);
    expect(orcAt({ backstay: 95, cunningham: 100 }).reef).toBe(1);
    expect(orcAt({ backstay: 100, cunningham: 100 }).reef).toBeLessThan(1);
  });

  it('stays inside [0, 1]', () => {
    const r = orcAt({ backstay: 100, cunningham: 100 }).reef;
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThanOrEqual(1);
  });
});

describe('twistEffDeg and dTwistDeg', () => {
  it('rises as the sheets are eased', () => {
    const eased = orcAt({ mainsheet: 0, jibSheet: 0 });
    const on = orcAt({ mainsheet: 100, jibSheet: 100 });
    expect(eased.twistEffDeg).toBeGreaterThan(on.twistEffDeg);
    expect(eased.deltas.dTwistDeg).toBeGreaterThan(0);
    expect(on.deltas.dTwistDeg).toBeLessThan(0);
  });

  it('is the delta of twistEffDeg from the base state', () => {
    const base = orcAt().twistEffDeg;
    for (const mainsheet of ramp(0, 100)) {
      const r = orcAt({ mainsheet });
      expect(r.deltas.dTwistDeg).toBeCloseTo(r.twistEffDeg - base, 12);
    }
  });
});

describe('deltas', () => {
  it('lowers CE height as twist increases and raises it as twist closes', () => {
    expect(orcAt({ mainsheet: 0, jibSheet: 0 }).deltas.dCEh).toBeLessThan(0);
    expect(orcAt({ mainsheet: 100, jibSheet: 100 }).deltas.dCEh).toBeGreaterThan(0);
  });

  it('never adds CLmax: any departure from the base camber costs', () => {
    for (const backstay of ramp(0, 100))
      for (const outhaul of ramp(0, 100, 5))
        expect(orcAt({ backstay, outhaul }).deltas.dCLmax).toBeLessThanOrEqual(0);
    // Both a rounder and a flatter sail than base lose CLmax.
    expect(orcAt({ backstay: 0, outhaul: 0 }).deltas.dCLmax).toBeLessThan(0);
    expect(orcAt({ backstay: 100, outhaul: 100 }).deltas.dCLmax).toBeLessThan(0);
  });

  it('never removes parasitic drag', () => {
    for (const backstay of ramp(0, 100))
      for (const mainsheet of ramp(0, 100, 5))
        expect(orcAt({ backstay, mainsheet }).deltas.dCD0).toBeGreaterThanOrEqual(0);
    expect(orcAt({ backstay: 100, mainsheet: 0 }).deltas.dCD0).toBeGreaterThan(0);
  });

  it('keeps the deltas small enough to be a correction, not a model', () => {
    const corners = [
      { backstay: 0, mainsheet: 0, outhaul: 0, vang: 0, jibLead: 0 },
      { backstay: 100, mainsheet: 100, outhaul: 100, vang: 100, jibLead: 10 },
    ];
    for (const c of corners) {
      const d = orcAt(c).deltas;
      expect(Math.abs(d.dCLmax)).toBeLessThan(0.3);
      expect(Math.abs(d.dCD0)).toBeLessThan(0.1);
      expect(Math.abs(d.dCEh)).toBeLessThan(0.2);
      expect(Math.abs(d.dTwistDeg)).toBeLessThan(20);
    }
  });
});

describe('knobs', () => {
  it('shape.flatK owns the flat gain', () => {
    const soft = { ...boat, calibration: { 'shape.flatK': 0 } };
    const { shapes, race } = shapesAt({ backstay: 100 });
    expect(shapeToOrc(soft, shapes, race, 'jib').flat).toBe(1);
  });

  it('shape.dClmaxK owns the CLmax penalty', () => {
    const off = { ...boat, calibration: { 'shape.dClmaxK': 0 } };
    const { shapes, race } = shapesAt({ backstay: 100 });
    expect(shapeToOrc(off, shapes, race, 'jib').deltas.dCLmax).toBeCloseTo(0, 12);
  });

  it('shape.reefAtMaxDepower owns the reef floor', () => {
    const b = { ...boat, calibration: { 'shape.reefAtMaxDepower': 0.8 } };
    const { shapes, race } = shapesAt({ backstay: 100, cunningham: 100 });
    expect(shapeToOrc(b, shapes, race, 'jib').reef).toBe(0.8);
  });
});
