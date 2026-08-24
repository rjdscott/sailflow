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

describe('numericLeaves', () => {
  it('walks nested objects, skips arrays and top-level exclusions', () => {
    const leaves = numericLeaves({ a: 1, b: { c: 2, d: [3] }, skip: { e: 4 } }, ['skip']);
    expect(leaves).toEqual(['a', 'b.c']);
  });
});
