/**
 * The pure half of the Drills screen's engagement surface (audit ux-02 M-18):
 * the local practice streak, per-template mastery, and the shareable link to
 * one exact drill.
 *
 * No clock, no DOM, no store — `now` is always injected, so every rule here is
 * testable and the screen keeps no arithmetic of its own.
 */
import type { DrillAttempt, DrillBest } from '../../lib/drillHistory';
import type { Medal } from '../../lib/drills';

const DAY_MS = 86400000;

/**
 * Local noon on the calendar day of `d`. Stepping a streak by 86 400 000 ms
 * from midnight lands on the previous day when the clocks go back an hour and
 * counts it twice; from noon, a ±1 h shift never crosses a date boundary.
 */
function noon(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
}

/** `YYYY-MM-DD` in the viewer's own timezone: a streak is a local calendar thing. */
export function localDay(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Consecutive local days carrying at least one Check, counting back from
 * today — or from yesterday, one day of forgiveness, so a missed evening does
 * not wipe a fortnight (audit ux-02 M-18 takes that from Duolingo). Zero once
 * the last attempt is older than that.
 *
 * ponytail: recomputed from the attempt list on every refresh rather than
 * cached. Nine templates and a handful of attempts a day is a set of strings,
 * not a data structure. Upgrade path if the history ever runs to thousands:
 * store the streak alongside the attempts and fold forward.
 */
export function streakDays(attempts: readonly DrillAttempt[], now: Date): number {
  const days = new Set(attempts.map((a) => localDay(new Date(a.at))));
  if (days.size === 0) return 0;

  const today = noon(now);
  const yesterday = new Date(today.getTime() - DAY_MS);
  let cursor = days.has(localDay(today))
    ? today
    : days.has(localDay(yesterday))
      ? yesterday
      : undefined;
  if (!cursor) return 0;

  let n = 0;
  while (days.has(localDay(cursor))) {
    n += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return n;
}

const MASTERY: Record<Medal, 0 | 1 | 2 | 3> = { none: 0, bronze: 1, silver: 2, gold: 3 };

/**
 * How many of the three mastery dots are filled on a drill card: the best
 * medal ever earned on that template. Never attempted, or attempted and never
 * medalled, is zero — an outline, not a claim.
 */
export function masteryLevel(best?: DrillBest): 0 | 1 | 2 | 3 {
  return best ? MASTERY[best.medal] : 0;
}

/** The link the Share button copies: the same drill, the same seed, for anyone. */
export function drillHash(templateId: string, seed: number): string {
  return `#/drills/${encodeURIComponent(templateId)}/${seed}`;
}

/**
 * The inverse, defensive: anything that is not a drill deep link is `null`.
 * Phase 04 owns the router and may learn this shape itself; until it does the
 * screen reads `location.hash` through here, so this has to survive whatever
 * is actually in the address bar.
 */
export function parseDrillHash(hash: string): { templateId: string; seed: number } | null {
  const parts = hash.replace(/^#\/?/, '').split('?')[0].split('/');
  if (parts.length !== 3 || parts[0] !== 'drills') return null;
  let templateId: string;
  try {
    templateId = decodeURIComponent(parts[1]);
  } catch {
    return null; // a stray % in the bar is not a drill
  }
  const seed = Number(parts[2]);
  if (!templateId || !Number.isInteger(seed) || seed < 0) return null;
  return { templateId, seed };
}
