import { describe, expect, it } from 'vitest';
import { dueNow, nextDue, qualityOf, sm2 } from './spacing';
import type { DrillAttempt } from './drillHistory';
import type { Medal } from './drills';

const TEMPLATES = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const NOW = new Date('2026-08-25T09:00:00.000Z');

function attempt(templateId: string, at: string, medal: Medal, hintUsed = false): DrillAttempt {
  return {
    id: `${templateId}-${at}`,
    templateId,
    seed: 1,
    at,
    distanceSteps: 0,
    lossPct: 0,
    medal,
    hintUsed,
    ms: 1000,
  };
}

const of = (list: ReturnType<typeof nextDue>, id: string) => list.find((s) => s.templateId === id)!;

describe('qualityOf', () => {
  it('grades gold high and no medal as a failure', () => {
    expect(qualityOf('gold', false)).toBe(5);
    expect(qualityOf('silver', false)).toBe(4);
    expect(qualityOf('bronze', false)).toBe(3);
    expect(qualityOf('none', false)).toBe(1);
  });

  it('costs a grade for reading the hint, and never drops below 1', () => {
    expect(qualityOf('gold', true)).toBe(4);
    expect(qualityOf('bronze', true)).toBe(2); // a hinted bronze is a lapse
    expect(qualityOf('none', true)).toBe(1);
  });
});

describe('sm2', () => {
  const start = { ease: 2.5, intervalDays: 0, reps: 0 };

  it('walks 1, 3, then interval x ease on repeated success', () => {
    const one = sm2(start, 5);
    expect(one.intervalDays).toBe(1);
    const two = sm2(one, 5);
    expect(two.intervalDays).toBe(3);
    const three = sm2(two, 5);
    expect(three.intervalDays).toBe(Math.round(3 * three.ease));
    expect(three.intervalDays).toBeGreaterThan(3);
  });

  it('sends a failure back to tomorrow and resets the repetition count', () => {
    const grown = sm2(sm2(sm2(start, 5), 5), 5);
    const failed = sm2(grown, 1);
    expect(failed.intervalDays).toBe(1);
    expect(failed.reps).toBe(0);
    expect(failed.ease).toBeLessThan(grown.ease);
  });

  it('raises ease on a clean recall and floors it at 1.3', () => {
    expect(sm2(start, 5).ease).toBeGreaterThan(2.5);
    let s = start;
    for (let i = 0; i < 20; i++) s = sm2(s, 1);
    expect(s.ease).toBe(1.3);
  });
});

describe('nextDue', () => {
  it('makes a never-attempted template due now', () => {
    const out = nextDue(TEMPLATES, [], NOW);
    expect(out).toHaveLength(3);
    for (const s of out) {
      expect(s.attempts).toBe(0);
      expect(s.due).toBe(NOW.toISOString());
      expect(s.overdueDays).toBe(0);
    }
    expect(dueNow(out)).toHaveLength(3);
  });

  it('pushes a gold attempt one day out and a failure back to tomorrow too', () => {
    const yesterday = '2026-08-24T09:00:00.000Z';
    const out = nextDue(TEMPLATES, [attempt('a', yesterday, 'gold')], NOW);
    const a = of(out, 'a');
    expect(a.attempts).toBe(1);
    expect(a.intervalDays).toBe(1);
    expect(a.due).toBe(NOW.toISOString());
    expect(a.overdueDays).toBe(0);
  });

  it('spaces a run of golds further out than a run of failures', () => {
    const days = ['2026-08-01', '2026-08-05', '2026-08-15'].map((d) => `${d}T09:00:00.000Z`);
    const golds = nextDue(
      [{ id: 'a' }],
      days.map((d) => attempt('a', d, 'gold')),
      NOW,
    );
    const fails = nextDue(
      [{ id: 'a' }],
      days.map((d) => attempt('a', d, 'none')),
      NOW,
    );
    expect(golds[0].intervalDays).toBeGreaterThan(fails[0].intervalDays);
    expect(fails[0].intervalDays).toBe(1);
    expect(fails[0].ease).toBeLessThan(golds[0].ease);
  });

  it('sorts most overdue first and is deterministic on ties', () => {
    const out = nextDue(
      TEMPLATES,
      [
        attempt('a', '2026-08-01T09:00:00.000Z', 'none'), // 1 day interval, weeks overdue
        attempt('c', '2026-08-25T08:00:00.000Z', 'gold'), // due tomorrow, not yet
      ],
      NOW,
    );
    expect(out.map((s) => s.templateId)).toEqual(['a', 'b', 'c']);
    expect(of(out, 'c').overdueDays).toBeLessThan(0);
    expect(dueNow(out).map((s) => s.templateId)).toEqual(['a', 'b']);
  });

  it('reads the clock only from the injected `now`', () => {
    const history = [attempt('a', '2026-08-20T09:00:00.000Z', 'silver')];
    const early = nextDue(TEMPLATES, history, new Date('2026-08-20T10:00:00.000Z'));
    const late = nextDue(TEMPLATES, history, new Date('2026-09-20T10:00:00.000Z'));
    expect(of(early, 'a').due).toBe(of(late, 'a').due);
    expect(of(late, 'a').overdueDays).toBeGreaterThan(of(early, 'a').overdueDays);
  });

  it('folds attempts in chronological order however the history is stored', () => {
    const days = ['2026-08-01', '2026-08-03', '2026-08-09'].map((d) => `${d}T09:00:00.000Z`);
    const ordered = days.map((d) => attempt('a', d, 'gold'));
    const shuffled = [ordered[2], ordered[0], ordered[1]];
    expect(nextDue([{ id: 'a' }], shuffled, NOW)).toEqual(nextDue([{ id: 'a' }], ordered, NOW));
  });
});
