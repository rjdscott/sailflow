/**
 * The hold-out gate (ADR 0007).
 *
 * Held-out TWS 8 and 14 VMG rows: boat speed within 3 %, VMG angle within 2°.
 * The 60/90/120° rows at every TWS: boat speed within 5 %.
 *
 * These tolerances are frozen in ADR 0007. Do not loosen them here; a failure
 * is the harness working. Fix the model, or supersede the ADR.
 */
import { describe, expect, it } from 'vitest';
import { compareRow, gateRows, loadPolar, table, type Comparison, HELD_OUT_TWS } from './compare';

const polar = loadPolar();

describe('hold-out gate', () => {
  if (!polar) {
    it.skip('reference polar not present', () => {});
    return;
  }

  // One solve per gated row, done at collection time. Every assertion below
  // reports the whole table so a failure shows every comparison at once.
  const all: Comparison[] = gateRows(polar).map(compareRow);
  const full = `\n${table(all)}\n(* = TWS held out of the fit)\n`;
  const failing = (rows: Comparison[]) => rows.filter((c) => !c.pass).map((c) => c.label);

  it('every gated row converges', () => {
    expect(
      all.filter((c) => !c.converged).map((c) => c.label),
      full,
    ).toEqual([]);
  });

  for (const tws of HELD_OUT_TWS) {
    it(`held-out TWS ${tws}: VMG rows within 3 % boat speed and 2°`, () => {
      const rows = all.filter((c) => c.twsKt === tws && c.kind !== 'angle');
      expect(rows.length, 'no VMG rows in the polar at this TWS').toBeGreaterThan(0);
      expect(failing(rows), full).toEqual([]);
    });
  }

  for (const tws of HELD_OUT_TWS) {
    it(`held-out TWS ${tws}: 60/90/120° rows within 5 % boat speed`, () => {
      const rows = all.filter((c) => c.twsKt === tws && c.kind === 'angle');
      expect(rows.length, 'no 60/90/120 rows in the polar at this TWS').toBeGreaterThan(0);
      expect(failing(rows), full).toEqual([]);
    });
  }
});
