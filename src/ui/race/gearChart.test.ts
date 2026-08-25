import { describe, expect, it } from 'vitest';
import { guideFor } from '../../lib/reference';
import { bandLabel, GEAR_COLUMNS, gearChart, gearRows, rowFor } from './gearChart';

const north = guideFor('north')!;

describe('gearRows', () => {
  it('is one row per published wind band, in the published order', () => {
    const rows = gearRows(north);
    expect(rows).toHaveLength(north.bands.length);
    expect(rows.map((r) => r.label)).toEqual(north.bands.map((b) => b.label));
  });

  it('gives every row a cell for every column, blank where unpublished', () => {
    for (const row of gearRows(north)) {
      expect(row.cells).toHaveLength(GEAR_COLUMNS.length);
      for (const c of row.cells) expect(typeof c).toBe('string');
    }
  });

  it('signs the turns from base, so +2 and -2 cannot be confused', () => {
    const rows = gearRows(north);
    const light = rows[0].cells[0];
    expect(light.startsWith('-')).toBe(true);
    const heavy = rows[rows.length - 1].cells[0];
    expect(heavy.startsWith('+') || heavy === '0' || heavy === '—').toBe(true);
  });

  it('reproduces the guide own words, never a number of its own', () => {
    const rows = gearRows(north);
    const travellerCol = GEAR_COLUMNS.findIndex((c) => c.key === 'traveller');
    expect(rows[0].cells[travellerCol]).toBe(north.bands[0].race.traveller ?? '—');
  });
});

describe('gearChart', () => {
  it('names its source', () => {
    const chart = gearChart('north')!;
    expect(chart.source.title).toBe(north.source.title);
    expect(chart.source.url).toContain('http');
    expect(chart.base).toContain('uppers');
  });

  it('loads both guides', () => {
    expect(gearChart('north')).not.toBeNull();
    expect(gearChart('quantum')).not.toBeNull();
  });
});

describe('rowFor', () => {
  const chart = gearChart('north')!;

  it('picks the band containing the wind speed', () => {
    const i = rowFor(chart, 12);
    const row = chart.rows[i];
    expect(row.twsMinKt).toBeLessThanOrEqual(12);
    expect(row.twsMaxKt === null || row.twsMaxKt > 12).toBe(true);
  });

  it('is half-open: a wind on a boundary belongs to the band above', () => {
    const rows = chart.rows;
    const edge = rows[0].twsMaxKt!;
    expect(rowFor(chart, edge - 0.1)).toBe(0);
    expect(rowFor(chart, edge)).toBe(1);
  });

  it('clamps outside the table rather than reporting no row', () => {
    expect(rowFor(chart, 0)).toBe(0);
    expect(rowFor(chart, 99)).toBe(chart.rows.length - 1);
  });

  it('has no row without a chart', () => {
    expect(rowFor(null, 12)).toBe(-1);
  });

  it('agrees with the disagreement panel band lookup', () => {
    for (const tws of [3, 7, 12, 18, 25]) {
      expect(chart.rows[rowFor(chart, tws)].label).toBe(bandLabel('north', tws));
    }
  });
});
