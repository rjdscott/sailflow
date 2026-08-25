import { describe, expect, it } from 'vitest';
import { drillHash, localDay, masteryLevel, parseDrillHash, streakDays } from './progress';
import type { DrillAttempt, DrillBest } from '../../lib/drillHistory';

/** A Check at local noon on the given day, so no test depends on a timezone. */
function attempt(y: number, m: number, d: number): DrillAttempt {
  return {
    id: `${y}-${m}-${d}`,
    templateId: 't1',
    seed: 1,
    at: new Date(y, m - 1, d, 12).toISOString(),
    distanceSteps: 2,
    lossPct: 1,
    medal: 'silver',
    hintUsed: false,
    ms: 1000,
  };
}

const NOW = new Date(2026, 7, 25, 18); // 25 Aug 2026, local evening

describe('streakDays', () => {
  it('is zero with no attempts', () => {
    expect(streakDays([], NOW)).toBe(0);
  });

  it('counts consecutive days ending today, once per day', () => {
    const attempts = [
      attempt(2026, 8, 23),
      attempt(2026, 8, 24),
      attempt(2026, 8, 25),
      attempt(2026, 8, 25), // two drills in one day is still one day
    ];
    expect(streakDays(attempts, NOW)).toBe(3);
  });

  it('forgives one missed day: a streak ending yesterday still stands', () => {
    expect(streakDays([attempt(2026, 8, 23), attempt(2026, 8, 24)], NOW)).toBe(2);
  });

  it('is zero once the last attempt is two days old', () => {
    expect(streakDays([attempt(2026, 8, 22), attempt(2026, 8, 23)], NOW)).toBe(0);
  });

  it('stops at the gap, not at the oldest attempt', () => {
    const attempts = [attempt(2026, 8, 1), attempt(2026, 8, 2), attempt(2026, 8, 24)];
    expect(streakDays(attempts, NOW)).toBe(1);
  });

  it('steps whole calendar days across a clock change', () => {
    // Whatever the runner's timezone, three adjacent days are a streak of 3
    // and the loop terminates — a naive midnight + 86 400 000 ms walk can
    // repeat a day when the clocks go back.
    const days = [new Date(2026, 9, 24), new Date(2026, 9, 25), new Date(2026, 9, 26)];
    const attempts = days.map((d) => attempt(d.getFullYear(), d.getMonth() + 1, d.getDate()));
    expect(streakDays(attempts, new Date(2026, 9, 26, 20))).toBe(3);
  });

  it('reads the day in local time, not UTC', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});

describe('masteryLevel', () => {
  const best = (medal: DrillBest['medal']): DrillBest => ({
    attempts: 3,
    lossPct: 1,
    distanceSteps: 2,
    medal,
    lastAt: NOW.toISOString(),
  });

  it('fills one dot per medal rank, none for an unattempted template', () => {
    expect(masteryLevel(undefined)).toBe(0);
    expect(masteryLevel(best('none'))).toBe(0);
    expect(masteryLevel(best('bronze'))).toBe(1);
    expect(masteryLevel(best('silver'))).toBe(2);
    expect(masteryLevel(best('gold'))).toBe(3);
  });
});

describe('drill deep links', () => {
  it('round-trips a template id and seed', () => {
    expect(drillHash('t1-06-light-air-power', 421337)).toBe(
      '#/drills/t1-06-light-air-power/421337',
    );
    expect(parseDrillHash(drillHash('t1-06-light-air-power', 421337))).toEqual({
      templateId: 't1-06-light-air-power',
      seed: 421337,
    });
  });

  it('parses with or without the leading slash, and ignores a query', () => {
    expect(parseDrillHash('#drills/t2-10-slot/7')).toEqual({ templateId: 't2-10-slot', seed: 7 });
    expect(parseDrillHash('#/drills/t2-10-slot/7?utm=x')).toEqual({
      templateId: 't2-10-slot',
      seed: 7,
    });
  });

  it('rejects anything that is not a drill deep link', () => {
    for (const hash of [
      '',
      '#/drills',
      '#/drills/t1',
      '#/race',
      '#/drills/t1/notanumber',
      '#/drills/t1/1.5',
      '#/drills/t1/-1',
      '#/drills//4',
      '#/drills/t1/4/extra',
      '#/drills/%E0%A4%A/4',
    ]) {
      expect(parseDrillHash(hash), hash).toBeNull();
    }
  });
});
