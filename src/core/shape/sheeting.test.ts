import { describe, expect, it } from 'vitest';
import j70 from '../../../data/boats/j70.json';
import type { BoatDefinition } from '../types';
import { boomAngle, jibSheetAngle, sheetingEffect } from './sheeting';
// The plan view cannot reach the solver for a line it draws every frame
// (ADR 0003), so `src/ui/race/boat.ts` keeps its own copy of these two
// formulas. Test-only import, and the only place the two sides meet.
import {
  boomAngle as drawnBoomAngle,
  jibSheetAngle as drawnJibSheetAngle,
} from '../../ui/race/boat';

const boat = { ...j70, calibration: {} } as unknown as BoatDefinition;

describe('sheeting angles', () => {
  it('boom: a beat is ~12°, a run reaches the cap, traveller up pulls it in', () => {
    expect(boomAngle(70, 20)).toBeCloseTo(12, 0);
    expect(boomAngle(0, 0)).toBe(90);
    expect(boomAngle(70, 60)).toBeLessThan(boomAngle(70, 20));
  });
  it('jib: 70 % sheet is ~10°, fully eased reaches a beam-reach angle', () => {
    expect(jibSheetAngle(5, 70)).toBeCloseTo(9.8, 0);
    expect(jibSheetAngle(5, 0)).toBeGreaterThan(45);
  });
});

// ---------------------------------------------------------------------------
// The plan view's copy of the two formulas (M-08)
//
// Both files carry a "keep them identical" comment and nothing was checking.
// Sweeping the whole legal control grid — read from the boat file, so a
// widened slider widens the sweep — is what notices when one side is edited.
// ---------------------------------------------------------------------------

const CONTROLS = j70.controls as Record<string, { min: number; max: number; step: number }>;

/** Every legal value of one control, from its own min/max/step. */
function sweep(id: string): number[] {
  const { min, max, step } = CONTROLS[id];
  const out: number[] = [];
  for (let v = min; v <= max; v += step) out.push(v);
  return out;
}

describe('the drawn sheeting angles match the core formulas', () => {
  it('sweeps a non-empty grid (a zero-length sweep would pass vacuously)', () => {
    for (const id of ['mainsheet', 'traveller', 'jibSheet', 'jibLead'])
      expect(sweep(id).length, id).toBeGreaterThan(1);
  });

  it('boomAngle agrees over the whole mainsheet × traveller grid', () => {
    const diffs: string[] = [];
    for (const mainsheet of sweep('mainsheet'))
      for (const traveller of sweep('traveller')) {
        const core = boomAngle(mainsheet, traveller);
        const drawn = drawnBoomAngle(mainsheet, traveller);
        if (core !== drawn)
          diffs.push(
            `mainsheet ${mainsheet}, traveller ${traveller}: core ${core} ≠ drawn ${drawn}`,
          );
      }
    expect(diffs).toEqual([]);
  });

  it('jibSheetAngle agrees over the whole jibLead × jibSheet grid', () => {
    const diffs: string[] = [];
    for (const jibLead of sweep('jibLead'))
      for (const jibSheet of sweep('jibSheet')) {
        const core = jibSheetAngle(jibLead, jibSheet);
        const drawn = drawnJibSheetAngle(jibLead, jibSheet);
        if (core !== drawn)
          diffs.push(`jibLead ${jibLead}, jibSheet ${jibSheet}: core ${core} ≠ drawn ${drawn}`);
      }
    expect(diffs).toEqual([]);
  });
});

describe('sheetingEffect', () => {
  const twist = 8;
  it('is ideal inside the band and for the kite', () => {
    // AWA 26, boom 12, twist 8: AoA = 26 − 12 − 2 = 12, opt 16, band 4 → in.
    expect(sheetingEffect(boat, 'main', 26, { sheetDeg: 12, twistDeg: twist })).toEqual({
      clMul: 1,
      dCd0: 0,
    });
    expect(sheetingEffect(boat, 'asym', 112, { sheetDeg: 0, twistDeg: 0 })).toEqual({
      clMul: 1,
      dCd0: 0,
    });
  });
  it('eased past the band loses lift monotonically, without drag', () => {
    const a = sheetingEffect(boat, 'main', 26, { sheetDeg: 20, twistDeg: twist });
    const b = sheetingEffect(boat, 'main', 26, { sheetDeg: 40, twistDeg: twist });
    expect(a.clMul).toBeLessThan(1);
    expect(b.clMul).toBeLessThan(a.clMul);
    expect(b.clMul).toBeGreaterThanOrEqual(0.2);
    expect(b.dCd0).toBe(0);
  });
  it('over-trimmed upwind loses lift and gains drag; on a run only lift', () => {
    const up = sheetingEffect(boat, 'jib', 40, { sheetDeg: 4, twistDeg: 0 });
    expect(up.clMul).toBeLessThan(1);
    expect(up.dCd0).toBeGreaterThan(0);
    const run = sheetingEffect(boat, 'main', 112, { sheetDeg: 4, twistDeg: 0 });
    expect(run.clMul).toBeLessThan(1);
    expect(run.dCd0).toBe(0);
  });
  it('does not penalise a boom that is out as far as it goes on a deep run', () => {
    expect(sheetingEffect(boat, 'main', 150, { sheetDeg: 90, twistDeg: 0 }).clMul).toBe(1);
  });
});
