import { describe, expect, it } from 'vitest';
import { numericLeaves, validateBoat } from './validate';
import j70 from '../../../data/boats/j70.json';

function clone<T>(v: unknown): T {
  return JSON.parse(JSON.stringify(v));
}

describe('validateBoat on the committed J/70', () => {
  it('accepts the committed boat file', () => {
    expect(validateBoat(j70)).toEqual([]);
  });

  it('every numeric leaf has a provenance row and every row names a known source', () => {
    const leaves = numericLeaves(j70, ['calibration', 'provenance', 'sources', 'schemaVersion']);
    expect(leaves.length).toBeGreaterThan(30);
    for (const leaf of leaves) expect(j70.provenance).toHaveProperty(leaf);
    for (const entry of Object.values(j70.provenance))
      expect(j70.sources).toHaveProperty(entry.source);
  });
});

describe('validateBoat rejects', () => {
  it('non-objects and wrong schema version', () => {
    expect(validateBoat(null)).toEqual(['boat: not an object']);
    const b = clone<{ schemaVersion: number }>(j70);
    b.schemaVersion = 2;
    expect(validateBoat(b)).toContain('schemaVersion: expected 1, got 2');
  });

  it('a missing sail', () => {
    const b = clone<{ sails: Record<string, unknown> }>(j70);
    delete b.sails.jib;
    expect(validateBoat(b)).toContain('sails.jib: missing');
  });

  it('a negative or non-finite hull number', () => {
    const b = clone<{ hull: Record<string, number> }>(j70);
    b.hull.dispKg = -1;
    expect(validateBoat(b)).toContain('hull.dispKg: must be positive');
    b.hull.dispKg = NaN;
    expect(validateBoat(b)).toContain('hull.dispKg: not a finite number');
  });

  it('a control whose purchase range is illegal', () => {
    const b = clone<{ controls: Record<string, Record<string, unknown>> }>(j70);
    b.controls.mainsheet.purchaseMin = 8;
    b.controls.mainsheet.purchaseMax = 6;
    expect(validateBoat(b)).toContain('controls.mainsheet: purchase range invalid');
  });

  it('a control with min >= max or zero step', () => {
    const b = clone<{ controls: Record<string, Record<string, number>> }>(j70);
    b.controls.backstay.min = b.controls.backstay.max;
    b.controls.backstay.step = 0;
    const p = validateBoat(b);
    expect(p).toContain('controls.backstay: min must be < max');
    expect(p).toContain('controls.backstay.step: must be positive');
  });

  it('a missing required control', () => {
    const b = clone<{ controls: Record<string, unknown> }>(j70);
    delete b.controls.vang;
    expect(validateBoat(b)).toContain('controls.vang: missing');
  });

  it('a number with no provenance row', () => {
    const b = clone<{ hull: Record<string, number> }>(j70);
    b.hull.magicM = 1;
    expect(validateBoat(b)).toContain('provenance: no entry for hull.magicM');
  });

  it('a provenance row pointing at an unknown source', () => {
    const b = clone<{ provenance: Record<string, { source: string; kind: string }> }>(j70);
    b.provenance['hull.loaM'].source = 'nope';
    expect(validateBoat(b)).toContain('provenance.hull.loaM.source: unknown source "nope"');
  });

  it('crew hiking bound other than the class rule', () => {
    const b = clone<{ crew: Record<string, number> }>(j70);
    b.crew.maxLegsOut = 3;
    expect(validateBoat(b)).toContain('crew.maxLegsOut: class rule allows exactly 2');
  });
});

/**
 * Phase 05, task 2: every field the solver reads is checked, and a missing one
 * is an error rather than a silent default. Each case below is a field that
 * previously passed validation and then surfaced as a `NaN` or a thrown stack
 * trace somewhere inside the solver.
 */
describe('validateBoat covers every field the solver reads', () => {
  it('a missing baseRace, the datum every shape delta is measured against', () => {
    const b = clone<Record<string, unknown>>(j70);
    delete b.baseRace;
    expect(validateBoat(b)).toContain(
      'baseRace: missing (the datum shape deltas are measured against)',
    );
  });

  it('a baseRace entry that is absent rather than merely odd', () => {
    const b = clone<{ baseRace: Record<string, unknown> }>(j70);
    delete b.baseRace.vang;
    expect(validateBoat(b)).toContain('baseRace.vang: not a finite number');
  });

  it('a base trim outside the stops the slider actually has', () => {
    // Reachable only by hand-editing: the user could never return to it.
    const b = clone<{ baseRace: Record<string, number> }>(j70);
    b.baseRace.backstay = 140;
    expect(validateBoat(b)).toContain(
      'baseRace.backstay: 140 is outside controls.backstay [0, 100]',
    );
  });

  it('a missing baseRaceDown, so the kite has no base state', () => {
    const b = clone<Record<string, unknown>>(j70);
    delete b.baseRaceDown;
    expect(validateBoat(b)).toContain('baseRaceDown: missing (the base state once the kite is up)');
  });

  it('a missing downwind control inside baseRaceDown', () => {
    const b = clone<{ baseRaceDown: Record<string, unknown> }>(j70);
    delete b.baseRaceDown.sprit;
    expect(validateBoat(b)).toContain('baseRaceDown.sprit: not a finite number');
  });

  it('a sail girth the geometry integrates — it used to throw instead', () => {
    const b = clone<{ sails: Record<string, Record<string, unknown>> }>(j70);
    delete b.sails.main.halfMm;
    expect(validateBoat(b)).toContain(
      'sails.main.halfMm: not a finite girth in mm (read by geometry/sailplan.ts)',
    );
  });

  it('a missing asym girth, which has a different required set from the main', () => {
    const b = clone<{ sails: Record<string, Record<string, unknown>> }>(j70);
    delete b.sails.asym.leechMm;
    expect(validateBoat(b)).toContain(
      'sails.asym.leechMm: not a finite girth in mm (read by geometry/sailplan.ts)',
    );
  });

  it('a missing rig.wire, which the windage model reads a diameter from', () => {
    const b = clone<{ rig: Record<string, unknown> }>(j70);
    delete b.rig.wire;
    expect(validateBoat(b)).toContain(
      'rig.wire: missing (aero/orc/forces.ts reads the shroud diameter from it)',
    );
  });

  it('the spar and dry-weight numbers a class rule gives for free', () => {
    const b = clone<{ rig: Record<string, unknown>; hull: Record<string, unknown> }>(j70);
    delete b.rig.sweepDeg;
    delete b.hull.minDryWeightKg;
    const out = validateBoat(b);
    expect(out).toContain('rig.sweepDeg: not a finite number');
    expect(out).toContain('hull.minDryWeightKg: not a finite number');
  });
});

/**
 * The polar rides on the boat but is not part of the boat file: absent is
 * legal, malformed is not, and its 182 printed cells are not restated as
 * provenance rows.
 */
describe('validateBoat on the attached reference polar', () => {
  const polar = {
    twsKt: [6, 8],
    rows: [{ twsKt: 6, sail: 'jib', kind: 'vmgUp', twaDeg: 44, bsKt: 4, vmgKt: 3, heelDeg: 3 }],
    source: { title: 'x', url: 'https://example.invalid/polar.pdf', retrieved: '2026-08-26' },
  };

  it('accepts a boat with no polar at all', () => {
    expect(validateBoat(j70)).toEqual([]);
  });

  it('accepts a well-formed polar without demanding provenance for every cell', () => {
    expect(validateBoat({ ...clone<Record<string, unknown>>(j70), polar })).toEqual([]);
  });

  it('rejects a polar with no source url — a number with no origin (ADR 0008)', () => {
    const noSource = { ...polar, source: { title: 'x', url: '' } };
    expect(validateBoat({ ...clone<Record<string, unknown>>(j70), polar: noSource })).toContain(
      'polar.source.url: a committed polar must name where it came from (ADR 0008)',
    );
  });

  it('rejects a TWS grid that is not ascending, which would interpolate backwards', () => {
    const jumbled = { ...polar, twsKt: [8, 6] };
    expect(validateBoat({ ...clone<Record<string, unknown>>(j70), polar: jumbled })).toContain(
      'polar.twsKt: must be numbers in ascending order',
    );
  });

  it('rejects an empty row set, which would read as speed zero everywhere', () => {
    expect(
      validateBoat({ ...clone<Record<string, unknown>>(j70), polar: { ...polar, rows: [] } }),
    ).toContain('polar.rows: missing or empty');
  });
});

describe('numericLeaves', () => {
  it('walks nested objects, skips arrays and top-level exclusions', () => {
    const leaves = numericLeaves({ a: 1, b: { c: 2, d: [3] }, skip: { e: 4 } }, ['skip']);
    expect(leaves).toEqual(['a', 'b.c']);
  });
});
