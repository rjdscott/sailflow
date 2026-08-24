import { describe, expect, it } from 'vitest';
import { fromJson, toCsv, toJson } from './logExport';
import type { LogEntry } from './logStore';

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'a',
    v: 1,
    date: '2026-08-25',
    venue: 'Sandringham',
    forecast: { minKt: 8, likelyKt: 12, maxKt: 16 },
    actual: { minKt: 9, maxKt: 14 },
    seaState: 1,
    crewKg: 260,
    dock: { upperTurns: 6, lowerTurns: 4, forestayMm: 0 },
    notes: 'flat water',
    fast: 'more lower tension',
    createdAt: '2026-08-25T10:00:00.000Z',
    ...overrides,
  };
}

const RACE = {
  backstay: 1,
  mainsheet: 2,
  traveller: 3,
  cunningham: 4,
  outhaul: 5,
  vang: 6,
  jibSheet: 7,
  jibLead: 8,
  inhauler: 9,
  mainHalyard: 10,
  jibHalyard: 11,
};

describe('toCsv', () => {
  it('has a stable header row', () => {
    const csv = toCsv([]);
    expect(csv.split('\r\n')[0]).toBe(
      [
        'id',
        'v',
        'date',
        'venue',
        'forecast.minKt',
        'forecast.likelyKt',
        'forecast.maxKt',
        'actual.minKt',
        'actual.maxKt',
        'seaState',
        'crewKg',
        'dock.upperTurns',
        'dock.lowerTurns',
        'dock.forestayMm',
        'race.backstay',
        'race.mainsheet',
        'race.traveller',
        'race.cunningham',
        'race.outhaul',
        'race.vang',
        'race.jibSheet',
        'race.jibLead',
        'race.inhauler',
        'race.mainHalyard',
        'race.jibHalyard',
        'notes',
        'fast',
        'createdAt',
      ].join(','),
    );
  });

  it('flattens nested dock and race controls into dotted columns', () => {
    const csv = toCsv([makeEntry({ race: RACE })]);
    const [header, row] = csv.split('\r\n');
    const cols = header.split(',');
    const vals = row.split(',');
    expect(vals[cols.indexOf('dock.upperTurns')]).toBe('6');
    expect(vals[cols.indexOf('dock.forestayMm')]).toBe('0');
    expect(vals[cols.indexOf('race.jibHalyard')]).toBe('11');
  });

  it('leaves race columns blank when race is absent', () => {
    const csv = toCsv([makeEntry()]);
    const [header, row] = csv.split('\r\n');
    const cols = header.split(',');
    const vals = row.split(',');
    expect(vals[cols.indexOf('race.backstay')]).toBe('');
  });

  it('escapes commas', () => {
    const csv = toCsv([makeEntry({ venue: 'Club, Inc.' })]);
    expect(csv).toContain('"Club, Inc."');
  });

  it('escapes quotes by doubling them', () => {
    const csv = toCsv([makeEntry({ notes: 'she said "go" at the mark' })]);
    expect(csv).toContain('"she said ""go"" at the mark"');
  });

  it('escapes embedded newlines', () => {
    const csv = toCsv([makeEntry({ notes: 'line one\nline two' })]);
    expect(csv).toContain('"line one\nline two"');
    // still only two \r\n-separated records: header + one row
    expect(csv.split('\r\n')).toHaveLength(2);
  });

  it('passes unicode through untouched', () => {
    const csv = toCsv([makeEntry({ venue: 'Société Nautique ⛵' })]);
    expect(csv).toContain('Société Nautique ⛵');
  });
});

describe('fromJson', () => {
  it('round-trips what toJson produced', () => {
    const entries = [makeEntry({ id: 'a' }), makeEntry({ id: 'b', race: RACE })];
    const { entries: parsed, reasons } = fromJson(toJson(entries));
    expect(reasons).toEqual([]);
    expect(parsed).toEqual(entries);
  });

  it('rejects non-array input', () => {
    const { entries, reasons } = fromJson(JSON.stringify({ not: 'an array' }));
    expect(entries).toEqual([]);
    expect(reasons).toEqual(['not an array']);
  });

  it('rejects invalid JSON', () => {
    const { entries, reasons } = fromJson('{not json');
    expect(entries).toEqual([]);
    expect(reasons.length).toBeGreaterThan(0);
  });

  it('drops rows with the wrong schema version, keeping the reason', () => {
    const good = makeEntry({ id: 'a' });
    const bad = { ...makeEntry({ id: 'b' }), v: 2 };
    const { entries, reasons } = fromJson(JSON.stringify([good, bad]));
    expect(entries).toEqual([good]);
    expect(reasons).toEqual(['row 1: unsupported version 2']);
  });

  it('drops malformed rows and reports one reason per row', () => {
    const good = makeEntry({ id: 'a' });
    const missingVenue = { ...makeEntry({ id: 'b' }), venue: undefined };
    const badSeaState = { ...makeEntry({ id: 'c' }), seaState: 9 };
    const { entries, reasons } = fromJson(JSON.stringify([good, missingVenue, badSeaState]));
    expect(entries).toEqual([good]);
    expect(reasons).toHaveLength(2);
    expect(reasons[0]).toContain('row 1');
    expect(reasons[1]).toContain('row 2');
  });
});
