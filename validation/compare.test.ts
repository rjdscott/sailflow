/**
 * The VMG-shortfall criterion (ADR 0023): what the hold-out gate asks of a VMG
 * row's angle now that it no longer compares two argmaxes.
 *
 * The synthetic rows below are built from the model's own answer to a real
 * printed row, so "the polar's angle equals the model's optimum" is exact
 * rather than approximate — a fixed literal would only ever be near it.
 */
import { describe, expect, it } from 'vitest';
import {
  compareRow,
  loadPolar,
  vmgRows,
  vmgShortfall,
  TOL_VMG_SHORTFALL_FRAC,
  type PolarRow,
} from './compare';

describe('vmgShortfall', () => {
  it('is zero when the polar angle costs no VMG, positive when it costs some', () => {
    expect(vmgShortfall(6, 6)).toBe(0);
    expect(vmgShortfall(6, 5.94)).toBeCloseTo(0.01, 12);
    // The model's optimum is an optimum: a polar angle cannot beat it, and a
    // search artefact that says otherwise is not credit towards the gate.
    expect(vmgShortfall(6, 6.5)).toBe(0);
  });

  it('scores a broken solve as a full shortfall rather than a NaN', () => {
    expect(vmgShortfall(0, 0)).toBe(1);
  });
});

const polar = loadPolar();

describe('compareRow VMG rows (ADR 0023)', () => {
  if (!polar) {
    it.skip('reference polar not present', () => {});
    return;
  }
  // One real held-out row, then two synthetic ones built from what the model
  // said about it. Downwind, because that is where the VMG curve is flat.
  const row = vmgRows(polar, 14).find((r) => r.kind === 'vmgDn') as PolarRow;
  const base = compareRow(row);
  const synthetic = (twaDeg: number): PolarRow => ({
    ...row,
    twaDeg,
    // The model's own boat speed, so the speed half of the gate is satisfied
    // by construction and only the angle half can fail.
    bsKt: base.model.bsKt,
  });

  it('a polar angle equal to the model optimum has no shortfall, and passes', () => {
    const c = compareRow(synthetic(base.model.twaDeg));
    expect(c.bsErrFrac).toBeCloseTo(0, 12);
    expect(c.vmgShortfallFrac).toBe(0);
    expect(c.pass).toBe(true);
  });

  it('a polar angle well off the optimum fails on shortfall alone', () => {
    // 130° is on the far side of the reaching hump: real VMG, badly down on
    // the optimum, so this is the criterion biting rather than a degenerate
    // solve.
    const c = compareRow(synthetic(130));
    expect(c.bsErrFrac).toBeLessThanOrEqual(0.03);
    expect(c.vmgShortfallFrac ?? 0).toBeGreaterThan(TOL_VMG_SHORTFALL_FRAC);
    expect(c.pass).toBe(false);
  });

  it('reports no shortfall on a printed-angle row, where the angle is an input', () => {
    const angle = polar.rows.find((r) => r.twsKt === 14 && r.kind === 'angle') as PolarRow;
    expect(compareRow(angle).vmgShortfallFrac).toBeNull();
  });
});
