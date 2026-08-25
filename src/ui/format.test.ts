import { describe, expect, it } from 'vitest';
import { fmt, round, snap, targetOf, windLine } from './format';
import type { LogEntry } from '../lib/logStore';

describe('round', () => {
  it('avoids float artefacts', () => {
    expect(round(0.1 + 0.2, 2)).toBe(0.3);
    expect(round(1.005, 2)).toBe(1.01);
  });

  it('rounds to the requested decimals', () => {
    expect(round(6.2456, 1)).toBe(6.2);
    expect(round(6.25, 0)).toBe(6);
  });
});

describe('fmt', () => {
  it('formats with fixed decimals and no unit', () => {
    expect(fmt(6.2456, 1)).toBe('6.2');
  });

  it('appends a unit when given', () => {
    expect(fmt(6.2, 1, 'kt')).toBe('6.2 kt');
  });

  it('pads trailing zeros to the requested precision', () => {
    expect(fmt(6, 2)).toBe('6.00');
  });
});

describe('snap', () => {
  it('snaps to the nearest step', () => {
    expect(snap(6.3, 0, 10, 0.5)).toBe(6.5);
    expect(snap(6.2, 0, 10, 0.5)).toBe(6);
  });

  it('clamps to the range first', () => {
    expect(snap(-5, 0, 10, 1)).toBe(0);
    expect(snap(15, 0, 10, 1)).toBe(10);
  });

  it('handles a fractional step without float artefacts', () => {
    expect(snap(0.3, 0, 1, 0.1)).toBe(0.3);
  });
});

describe('windLine', () => {
  const entry = (over: Partial<LogEntry> = {}): LogEntry => ({
    id: 'a',
    v: 2,
    date: '2026-08-25',
    venue: 'Sydney',
    forecast: { minKt: 6, likelyKt: 9, maxKt: 14 },
    actual: { minKt: 8, maxKt: 12 },
    seaState: 2,
    crewKg: 300,
    dock: { upperTurns: 2, lowerTurns: 1, forestayMm: 15 },
    notes: '',
    fast: '',
    status: 'complete',
    outcome: { result: '', placing: null },
    createdAt: '2026-08-25T00:00:00.000Z',
    ...over,
  });

  it('summarises the wind actually sailed', () => {
    expect(windLine(entry())).toBe('8–12 kt · chop · 300 kg');
  });

  it('falls back to the forecast when no actual wind was recorded', () => {
    expect(windLine(entry({ actual: { minKt: 0, maxKt: 0 } }))).toBe('6–14 kt · chop · 300 kg');
  });

  it('keeps a half-recorded actual rather than mixing the two sources', () => {
    expect(windLine(entry({ actual: { minKt: 0, maxKt: 11 } }))).toBe('0–11 kt · chop · 300 kg');
  });

  it('treats an unrecorded actual as absent, not as 0 kt', () => {
    expect(windLine(entry({ actual: { minKt: null, maxKt: null } }))).toBe(
      '6–14 kt · chop · 300 kg',
    );
  });

  it('says so rather than inventing a band when no wind was recorded at all', () => {
    expect(
      windLine(
        entry({
          forecast: { minKt: null, likelyKt: null, maxKt: null },
          actual: { minKt: null, maxKt: null },
        }),
      ),
    ).toBe('wind not recorded · chop · 300 kg');
  });

  it('drops crew weight when it was never recorded', () => {
    expect(windLine(entry({ crewKg: null }))).toBe('8–12 kt · chop');
  });

  it('names every sea state', () => {
    const states = ([0, 1, 2, 3, 4] as const).map(
      (seaState) => windLine(entry({ seaState })).split(' · ')[1],
    );
    expect(states).toEqual(['flat', 'ripple', 'chop', 'steep', 'waves']);
  });
});

describe('targetOf', () => {
  it('is undefined with no optimum to compare against', () => {
    expect(targetOf(5.5, undefined, 1)).toBeUndefined();
  });

  it('signs the gap positive when the target is ahead of you', () => {
    expect(targetOf(5.5, 5.8, 1)).toEqual({ text: '5.8', delta: '+0.3' });
    expect(targetOf(5.9, 5.8, 1)).toEqual({ text: '5.8', delta: '−0.1' });
    expect(targetOf(5.8, 5.8, 1)).toEqual({ text: '5.8', delta: '±0.0' });
  });

  // audit ux-02 M-09: downwind VMG is negative towards the leeward mark, so
  // the raw difference signs a gain as a loss. Same card, same convention.
  it('flips downwind, where a more negative VMG is the gain', () => {
    expect(targetOf(-5.0, -5.02, 2, 'less')).toEqual({ text: '-5.02', delta: '+0.02' });
    expect(targetOf(-5.0, -4.9, 2, 'less')?.delta).toBe('−0.10');
  });
});
