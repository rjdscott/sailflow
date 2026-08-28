import { describe, expect, it } from 'vitest';
import type { LogEntry } from '../../lib/logStore';
import type { RigLock } from '../stores/rigLock.svelte';
import {
  deltaLine,
  DOCK_KEYS,
  draftLabel,
  entryShare,
  outcomeLine,
  prefillEntry,
  RACE_KEYS,
  sortEntries,
  SPECS,
} from './logic';
import { decodeShare, encodeShare } from '../share';

function entry(over: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'a',
    v: 2,
    date: '2026-08-25',
    venue: 'Sandringham',
    forecast: { minKt: 8, likelyKt: 12, maxKt: 16 },
    actual: { minKt: 9, maxKt: 14 },
    seaState: 1,
    crewKg: 260,
    dock: { upperTurns: 2, lowerTurns: 1, forestayMm: 10 },
    notes: '',
    fast: '',
    status: 'complete',
    outcome: { result: '', placing: null },
    createdAt: '2026-08-25T10:00:00.000Z',
    ...over,
  };
}

const lock: RigLock = {
  setup: { upperTurns: 3, lowerTurns: -1, forestayMm: 20 },
  committedAt: '2026-08-25T22:00:00.000Z',
  forecast: { minKt: 6, likelyKt: 10, maxKt: 14, seaState: 2, crewKg: 285 },
};

describe('control specs', () => {
  it('drives the log fields off the boat definition, not a hand-rolled list', () => {
    expect(DOCK_KEYS).toEqual(['upperTurns', 'lowerTurns', 'forestayMm']);
    expect(RACE_KEYS).toHaveLength(11);
    expect(RACE_KEYS).toContain('backstay');
    // down-mode controls are not log fields
    expect(RACE_KEYS).not.toContain('kiteHalyard');
  });

  it('carries the unit, bounds and step the sliders use', () => {
    expect(SPECS.forestayMm).toMatchObject({ unit: 'mm', min: 0, max: 40, step: 2 });
    expect(SPECS.jibLead).toMatchObject({ unit: 'holes', min: 0, max: 10, step: 1 });
  });
});

describe('prefillEntry', () => {
  it('seeds the rig and the forecast from the committed lock', () => {
    const e = prefillEntry({ lock, today: '2026-08-25' });
    expect(e.dock).toEqual(lock.setup);
    expect(e.forecast).toEqual({ minKt: 6, likelyKt: 10, maxKt: 14 });
    expect(e.seaState).toBe(2);
    expect(e.crewKg).toBe(285);
    expect(e.date).toBe('2026-08-25');
  });

  it('does not alias the lock, so typing in the form cannot rewrite the committed rig', () => {
    const e = prefillEntry({ lock, today: '2026-08-25' });
    e.dock.upperTurns = 99;
    expect(lock.setup.upperTurns).toBe(3);
  });

  it('carries the venue over from the last entry', () => {
    const e = prefillEntry({ lock, last: entry({ venue: 'Black Rock' }), today: '2026-08-25' });
    expect(e.venue).toBe('Black Rock');
  });

  it('leaves an unsourced number null rather than 0', () => {
    const e = prefillEntry({ today: '2026-08-25' });
    expect(e.forecast).toEqual({ minKt: null, likelyKt: null, maxKt: null });
    expect(e.crewKg).toBeNull();
    expect(e.actual).toEqual({ minKt: null, maxKt: null });
    // 0 turns / 0 mm is the base tune, a real setting, so the rig row is not null
    expect(e.dock).toEqual({ upperTurns: 0, lowerTurns: 0, forestayMm: 0 });
  });

  it('never carries the actual wind or the outcome over from a past day', () => {
    const e = prefillEntry({
      lock,
      last: entry({ outcome: { result: '1, 1, 2', placing: 1 }, fast: 'flat main' }),
      today: '2026-08-25',
    });
    expect(e.actual).toEqual({ minKt: null, maxKt: null });
    expect(e.outcome).toEqual({ result: '', placing: null });
    expect(e.fast).toBe('');
  });
});

describe('sortEntries', () => {
  it('puts drafts first, then the newest date', () => {
    const list = sortEntries([
      entry({ id: 'old', date: '2026-08-20' }),
      entry({ id: 'draft', date: '2026-08-01', status: 'draft' }),
      entry({ id: 'new', date: '2026-08-24' }),
    ]);
    expect(list.map((e) => e.id)).toEqual(['draft', 'new', 'old']);
  });
});

describe('draftLabel', () => {
  it('marks today’s unfinished entry', () => {
    expect(draftLabel(entry({ status: 'draft' }), '2026-08-25')).toBe('Today · in progress');
  });

  it('still marks an older unfinished entry', () => {
    expect(draftLabel(entry({ status: 'draft' }), '2026-08-30')).toBe('In progress');
  });

  it('says nothing about a finished entry', () => {
    expect(draftLabel(entry(), '2026-08-25')).toBeNull();
  });
});

describe('deltaLine', () => {
  it('shows the forecast, the wind sailed and the difference at each end', () => {
    expect(deltaLine(entry())).toBe('forecast 8–16 · sailed 9–14 kt (min +1, max −2)');
  });

  it('says so when the forecast held', () => {
    expect(deltaLine(entry({ actual: { minKt: 8, maxKt: 16 } }))).toBe(
      'forecast 8–16 · sailed 8–16 kt (as forecast)',
    );
  });

  it('is silent when either band is incomplete', () => {
    expect(deltaLine(entry({ actual: { minKt: null, maxKt: null } }))).toBeNull();
    expect(deltaLine(entry({ actual: { minKt: 9, maxKt: null } }))).toBeNull();
    expect(deltaLine(entry({ forecast: { minKt: null, likelyKt: null, maxKt: null } }))).toBeNull();
  });
});

describe('outcomeLine', () => {
  it('joins whatever was recorded', () => {
    expect(outcomeLine(entry({ outcome: { result: '3, 1, 7', placing: 4 } }))).toBe(
      '3, 1, 7 · placing 4',
    );
    expect(outcomeLine(entry({ outcome: { result: '', placing: 2 } }))).toBe('placing 2');
    expect(outcomeLine(entry())).toBeNull();
  });
});

describe('entryShare', () => {
  const RACE = {
    backstay: 45,
    mainsheet: 70,
    traveller: -20,
    cunningham: 20,
    outhaul: 60,
    vang: 30,
    jibSheet: 70,
    jibLead: 5,
    inhauler: 20,
    mainHalyard: 50,
    jibHalyard: 50,
  };

  // ADR 0021: one screen answers both, so the route no longer forks on what
  // the entry happens to carry.
  it('opens on the Simulator whether or not the entry recorded a trim', () => {
    expect(entryShare(entry({ race: RACE })).route).toBe('sim');
    expect(entryShare(entry()).route).toBe('sim');
  });

  it('round-trips the rig, the trim and the forecast through a link', () => {
    const { state } = entryShare(entry({ race: RACE }));
    const back = decodeShare(encodeShare(state));
    expect(back.race).toEqual(RACE);
    expect(back.dock).toEqual({ upperTurns: 2, lowerTurns: 1, forestayMm: 10 });
    expect(back.forecast).toEqual({
      minKt: 8,
      likelyKt: 12,
      maxKt: 16,
      seaState: 1,
      crewKg: 260,
    });
  });

  it('uses the sailed band midpoint for the wind, and the forecast when there is none', () => {
    expect(entryShare(entry()).state.condition?.twsKt).toBe(12); // (9 + 14) / 2, rounded
    const noActual = entry({ actual: { minKt: null, maxKt: null } });
    expect(entryShare(noActual).state.condition?.twsKt).toBe(12); // forecast likely
  });

  it('invents no angle and no sail plan: the entry never recorded either', () => {
    const { state } = entryShare(entry({ race: RACE }));
    expect(state.condition?.twaDeg).toBeUndefined();
    expect(state.condition?.sailset).toBeUndefined();
    const params = encodeShare(state);
    expect(params.twa).toBeUndefined();
    expect(params.set).toBeUndefined();
  });

  it('omits a half-recorded forecast rather than shipping nulls', () => {
    const half = entry({ forecast: { minKt: 8, likelyKt: null, maxKt: 16 } });
    expect(entryShare(half).state.forecast).toBeUndefined();
    expect(entryShare(entry({ crewKg: null })).state.forecast).toBeUndefined();
  });
});
