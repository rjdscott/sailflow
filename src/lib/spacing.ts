/**
 * Spaced repetition over drill templates: SM-2-lite.
 *
 * Research 03 ranks "failed drills resurface at 1/3/7 days" as the highest
 * learning-per-minute item in the whole candidate list, and audit ux-02 M-17
 * points out the v1 schema recorded nothing you could space on. This is the
 * smallest thing that does the job: one ease factor and one interval per
 * template, folded over the attempt history in order.
 *
 * ponytail: no per-item fuzz, no learning steps, no leech queue — SM-2's
 * ease/interval recurrence and nothing else. Upgrade path if the schedule
 * ever bunches up: add ±10 % jitter seeded from the template id.
 *
 * `now` is always injected. This module never reads the clock, so its tests
 * are not time-dependent.
 */
import type { DrillAttempt } from './drillHistory';
import type { Medal } from './drills';

export interface Spacing {
  templateId: string;
  /** SM-2 ease factor. Starts at 2.5, floors at 1.3. */
  ease: number;
  /** Days until the next showing, from the last attempt. */
  intervalDays: number;
  /** ISO 8601 of when this template comes back. */
  due: string;
  attempts: number;
  /** Days overdue at `now`; negative when it is not due yet. */
  overdueDays: number;
}

const START_EASE = 2.5; // prov: SM-2 (Woźniak 1990), unchanged
const MIN_EASE = 1.3; // prov: SM-2
const DAY_MS = 86400000;

/**
 * SM-2 quality 0–5 from a medal. Gold is a clean recall, silver a recall with
 * hesitation, bronze a struggle, no medal a failure. Using a hint costs one
 * grade and can never be a clean recall. prov: assumed mapping.
 */
export function qualityOf(medal: Medal, hintUsed: boolean): number {
  const base = { gold: 5, silver: 4, bronze: 3, none: 1 }[medal];
  return hintUsed ? Math.max(1, base - 1) : base;
}

/** One SM-2 step. Exported for the test; the fold below is the public path. */
export function sm2(
  prev: { ease: number; intervalDays: number; reps: number },
  quality: number,
): { ease: number; intervalDays: number; reps: number } {
  const ease = Math.max(
    MIN_EASE,
    prev.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)), // prov: SM-2 EF update
  );
  // A failed attempt goes back to tomorrow but keeps the ease it earned.
  if (quality < 3) return { ease, intervalDays: 1, reps: 0 };
  const reps = prev.reps + 1;
  const intervalDays = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(prev.intervalDays * ease);
  return { ease, intervalDays, reps };
}

/**
 * The schedule for every template, soonest first. A template with no attempts
 * is due now — never practised is the most overdue thing there is.
 */
export function nextDue(
  templates: readonly { id: string }[],
  history: readonly DrillAttempt[],
  now: Date,
): Spacing[] {
  const byTemplate = new Map<string, DrillAttempt[]>();
  for (const a of history) {
    const list = byTemplate.get(a.templateId);
    if (list) list.push(a);
    else byTemplate.set(a.templateId, [a]);
  }

  const out = templates.map((t) => {
    const attempts = (byTemplate.get(t.id) ?? []).slice().sort((a, b) => a.at.localeCompare(b.at));
    if (attempts.length === 0) {
      return {
        templateId: t.id,
        ease: START_EASE,
        intervalDays: 0,
        due: now.toISOString(),
        attempts: 0,
        overdueDays: 0,
      };
    }
    let state = { ease: START_EASE, intervalDays: 0, reps: 0 };
    for (const a of attempts) state = sm2(state, qualityOf(a.medal, a.hintUsed));
    const last = new Date(attempts[attempts.length - 1].at).getTime();
    const due = last + state.intervalDays * DAY_MS;
    return {
      templateId: t.id,
      ease: Number(state.ease.toFixed(4)),
      intervalDays: state.intervalDays,
      due: new Date(due).toISOString(),
      attempts: attempts.length,
      overdueDays: Number(((now.getTime() - due) / DAY_MS).toFixed(4)),
    };
  });

  // Most overdue first; unattempted templates (overdue 0) rank above anything
  // still in its interval, and ties break on id so the order is deterministic.
  return out.sort(
    (a, b) => b.overdueDays - a.overdueDays || a.templateId.localeCompare(b.templateId),
  );
}

/** Templates whose interval has elapsed at `now`, in the same order. */
export function dueNow(spacing: readonly Spacing[]): Spacing[] {
  return spacing.filter((s) => s.overdueDays >= 0);
}
