import { describe, expect, it } from 'vitest';
import { guideColumns, needsSelector, SELECTOR_THRESHOLD } from './guides';
import { guidesFor, type Guide, type GuideEntry } from '../../lib/reference';

/** Two bands is enough to exercise `bandFor` and the turns interpolation. */
function fakeGuide(label: string): Guide {
  return {
    source: { label, id: `${label}-x`, title: `${label} guide`, url: '', revision: '' },
    base: { uppers: '', lowers: '', rakeMm: null, forestayMm: null },
    bands: [
      {
        label: '0-10 kt',
        twsMinKt: 0,
        twsMaxKt: 10,
        uppersTurns: -2,
        lowersTurns: -1,
        uppersGauge: null,
        lowersGauge: null,
        rakeMm: null,
        forestayMm: null,
        race: {},
        targets: { bsKt: null, heelDeg: null, leechTelltale: null },
      },
      {
        label: '10+ kt',
        twsMinKt: 10,
        twsMaxKt: null,
        uppersTurns: 4,
        lowersTurns: 2,
        uppersGauge: null,
        lowersGauge: null,
        rakeMm: null,
        forestayMm: null,
        race: {},
        targets: { bsKt: null, heelDeg: null, leechTelltale: null },
      },
    ],
  };
}

function entry(id: string, guide: Guide | null): GuideEntry {
  return { id, boatId: 'j70', label: id, guide };
}

describe('guidesFor', () => {
  it('enumerates the committed J/70 guides from data/tuning, not a hard-coded pair', () => {
    const ids = guidesFor().map((e) => e.id);
    expect(ids).toContain('north');
    expect(ids).toContain('quantum');
    expect(guidesFor().every((e) => e.boatId === 'j70')).toBe(true);
    expect(guidesFor().find((e) => e.id === 'north')?.label).toBe('North');
  });

  it('returns nothing for a boat with no guide file — the phase 05 starting state', () => {
    expect(guidesFor('j80')).toEqual([]);
  });
});

describe('guideColumns', () => {
  it('is empty when no guide is committed for the boat, without throwing', () => {
    expect(guideColumns([], 12)).toEqual([]);
  });

  it('keeps a guide whose table was removed as a column with no recommendation', () => {
    const cols = guideColumns([entry('north', null), entry('quantum', fakeGuide('Q'))], 12);
    expect(cols.map((c) => c.id)).toEqual(['north', 'quantum']);
    expect(cols[0].rec).toBeNull();
    expect(cols[1].rec?.band.label).toBe('10+ kt');
  });

  it('recommends the band covering the wind speed', () => {
    const [col] = guideColumns([entry('north', fakeGuide('N'))], 4);
    expect(col.rec?.band.label).toBe('0-10 kt');
    expect(col.rec?.uppersTurns).toBe(-2); // clamped flat below the first midpoint
  });

  it('shows one guide when one is selected', () => {
    const entries = [entry('a', fakeGuide('A')), entry('b', fakeGuide('B'))];
    expect(guideColumns(entries, 12, 'b').map((c) => c.id)).toEqual(['b']);
  });

  it('falls back to every guide when the selection names a guide that is gone', () => {
    const entries = [entry('a', fakeGuide('A')), entry('b', fakeGuide('B'))];
    expect(guideColumns(entries, 12, 'doyle').map((c) => c.id)).toEqual(['a', 'b']);
  });
});

describe('needsSelector', () => {
  it('holds off until the columns stop fitting', () => {
    const entries = Array.from({ length: SELECTOR_THRESHOLD }, (_, i) => entry(`g${i}`, null));
    expect(needsSelector(entries)).toBe(false);
    expect(needsSelector([...entries, entry('one-more', null)])).toBe(true);
  });
});
