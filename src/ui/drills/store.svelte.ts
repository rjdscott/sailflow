/**
 * Drill screen state: which template is open, the generated instance, what the
 * learner has trimmed, the live `trimmed` solve, and the score once they hit
 * Check.
 *
 * Schema v2 (ADR 0013): a drill is `(template, seed)`. Opening one generates
 * it, validates the start against the model, and keeps the answer key that
 * validation produced — `optimalTrim` from the drill's own start with every
 * locked control held, so the key is the optimum of the boat the learner is
 * sailing (audit ux-02 H-01), not a constant.
 *
 * Live solves are debounced 80 ms and stale-dropped: a slider drag fires many
 * changes and out-of-order worker replies must not overwrite a newer result.
 */
import type { OptimalTrimResult, RaceControls, SolveResult } from '../../core/types';
import type { TrimmedRequest } from '../../worker/protocol';
import {
  TEMPLATES,
  coachLine,
  generateDrillAsync,
  perControlDelta,
  scoreDrill,
  type ControlDelta,
  type Drill,
  type DrillClient,
  type DrillTemplate,
  type Medal,
} from '../../lib/drills';
import {
  attemptId,
  bestByTemplate,
  chooseDrillHistory,
  type DrillAttempt,
  type DrillBest,
  type DrillHistory,
} from '../../lib/drillHistory';
import { nextDue, type Spacing } from '../../lib/spacing';
import { hashSeed } from '../../lib/prng';
import { track } from '../../lib/telemetry';
import { settings } from '../stores/settings.svelte';
import { streakDays } from './progress';
import { getClient } from './client';

const DEBOUNCE_MS = 80;

/* eslint-disable svelte/prefer-svelte-reactivity --
   These Dates are transient: a seed for today, a timestamp on an attempt, a
   clock reading for the spacing sort. None is stored in $state, so
   SvelteDate's reactivity would buy nothing. */

export interface DrillScore {
  lossPct: number;
  /** L1 distance from the answer key over the free controls, in legal steps. */
  distanceSteps: number;
  medal: Medal;
  deltas: ControlDelta[];
  coach: string;
  /** Set when a tuning guide publishes a value for one of the free controls. */
  guideNote?: string;
  optimum: OptimalTrimResult;
  hintUsed: boolean;
  /** True when this attempt beat every previous one on control distance. */
  isBest: boolean;
  /** The best distance before this attempt: `null` when there was none to beat. */
  prevBestSteps: number | null;
}

/**
 * The seed everyone gets today, without a server: a hash of the local
 * calendar date. Same day, same drill; a new one tomorrow.
 */
export function dailySeed(now: Date = new Date()): number {
  const ymd = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  return hashSeed(ymd) % 1_000_000;
}

export class DrillStore {
  /** Every template, tier order then file order. */
  readonly templates: DrillTemplate[] = [...TEMPLATES].sort((a, b) => a.tier - b.tier);

  template = $state<DrillTemplate | undefined>(undefined);
  current = $state<Drill | undefined>(undefined);
  controls = $state<RaceControls>({} as RaceControls);
  result = $state<SolveResult | undefined>(undefined);
  score = $state<DrillScore | undefined>(undefined);
  /** The open score sheet belongs to an older trim: shown, but marked stale. */
  scoreStale = $state(false);
  checking = $state(false);
  loading = $state(false);
  hintUsed = $state(false);
  /** What the generated start costs against its own key, percent. */
  startLossPct = $state(0);
  /** False when no seed in the budget produced a costly enough start. */
  valid = $state(true);
  best = $state<Record<string, DrillBest>>({});
  due = $state<Spacing[]>([]);
  /** Consecutive local days with at least one Check, in this browser only. */
  streak = $state(0);
  /** Set when `next()` walks off the end of the visible list. */
  endNote = $state<string | undefined>(undefined);

  private key: OptimalTrimResult | undefined;
  private openedAt = 0;
  private seq = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;

  /** Dependencies are injected so the store is testable without a worker. */
  constructor(
    private client: DrillClient = getClient(),
    private history: DrillHistory = chooseDrillHistory(),
    private now: () => Date = () => new Date(),
  ) {
    void this.refresh();
  }

  /**
   * Simple mode hides tier 3 — the multi-control puzzles are noise until the
   * basics are automatic. `next()` and the list read the same getter, so the
   * end-of-drill button can no longer walk into content the list hides
   * (audit ux-02 M-03).
   */
  get visible(): DrillTemplate[] {
    return settings.mode === 'simple' ? this.templates.filter((t) => t.tier <= 2) : this.templates;
  }

  /** Re-read the attempt history: best-per-template, the spacing queue, the streak. */
  async refresh(): Promise<void> {
    const attempts = await this.history.list();
    this.best = bestByTemplate(attempts);
    this.due = nextDue(this.templates, attempts, this.now());
    this.streak = streakDays(attempts, this.now());
  }

  /** The drill the schedule puts up next, or the first visible one if it is hidden. */
  get today(): DrillTemplate | undefined {
    const visible = this.visible;
    for (const s of this.due) {
      const t = visible.find((v) => v.id === s.templateId);
      if (t) return t;
    }
    return visible[0];
  }

  /** Every recorded attempt as JSON. What the More screen's export saves. */
  async exportHistory(): Promise<string> {
    return JSON.stringify({ v: 2, attempts: await this.history.list() }, null, 2);
  }

  /** Delete every attempt: the bests, the streak and the schedule go with it. */
  async resetHistory(): Promise<void> {
    await this.history.clear();
    await this.refresh();
  }

  /** Generate and open a drill. Default seed is today's, the same for everyone. */
  async open(template: DrillTemplate, seed: number = dailySeed(this.now())): Promise<void> {
    this.template = template;
    this.current = undefined;
    this.score = undefined;
    this.result = undefined;
    this.endNote = undefined;
    this.hintUsed = false;
    this.loading = true;
    const ticket = ++this.seq;
    try {
      const g = await generateDrillAsync(this.client, template, seed);
      if (ticket !== this.seq) return; // a later open won
      this.current = g.drill;
      this.key = g.optimum;
      this.startLossPct = g.startLossPct;
      this.valid = g.valid;
      this.controls = { ...g.drill.start };
      this.result = g.startResult;
      this.scoreStale = false;
      this.openedAt = this.now().getTime();
      track('drill.started');
    } finally {
      if (ticket === this.seq) this.loading = false;
    }
  }

  close(): void {
    this.seq++;
    this.template = undefined;
    this.current = undefined;
    this.result = undefined;
    this.score = undefined;
    this.key = undefined;
  }

  /** Back to the drill's wrong setup, keeping the same generated drill open. */
  reset(): void {
    const drill = this.current;
    if (!drill) return;
    this.controls = { ...drill.start };
    this.score = undefined;
    this.scoreStale = false;
    this.openedAt = this.now().getTime();
    this.solve();
  }

  /** The hint costs a grade in the spacing schedule, so record that it was read. */
  revealHint(): void {
    this.hintUsed = true;
  }

  /** The next template in the visible list; at the end, back to the list. */
  next(): void {
    const template = this.template;
    if (!template) return;
    const list = this.visible;
    const i = list.findIndex((t) => t.id === template.id);
    const following = list[i + 1];
    if (!following) {
      this.close();
      this.endNote =
        settings.mode === 'simple'
          ? 'Tier 1 and 2 complete — switch to Advanced for tier 3.'
          : 'That is every drill in the set. Pick one to run again.';
      return;
    }
    void this.open(following);
  }

  /** Debounced live `trimmed` solve for the current control state. */
  solve(): void {
    const drill = this.current;
    if (!drill) return;
    const controls = { dock: drill.dock, race: { ...this.controls } };
    // A score belongs to the trim it was taken on. Moving a control voids it,
    // but the sheet stays mounted and marked stale so the coach line is still
    // on screen while the learner acts on it (audit ux-02 M-06).
    if (this.score) this.scoreStale = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      const ticket = this.seq;
      void this.client
        .request<TrimmedRequest>({ type: 'trimmed', controls, condition: drill.condition })
        .then((r) => {
          if (ticket === this.seq) this.result = r;
        });
    }, DEBOUNCE_MS);
  }

  /** Score the current trim against the drill's answer key and record it. */
  async check(): Promise<void> {
    const drill = this.current;
    const user = this.result;
    const key = this.key;
    if (!drill || !user || !key || this.checking) return;
    this.checking = true;
    try {
      const race = { ...this.controls };
      const s = scoreDrill({ race, result: user }, { race: key.race, result: key.result }, drill);
      const deltas = perControlDelta(race, key.race, drill.free);
      const prev = this.best[drill.templateId];
      const prevBestSteps = prev?.distanceSteps ?? null;
      const isBest = prevBestSteps === null || s.distanceSteps < prevBestSteps;
      this.score = {
        ...s,
        deltas,
        coach: coachLine(deltas),
        optimum: key,
        hintUsed: this.hintUsed,
        isBest,
        prevBestSteps,
      };
      this.scoreStale = false;
      track('drill.checked');

      const attempt: DrillAttempt = {
        id: attemptId(),
        templateId: drill.templateId,
        seed: drill.seed,
        at: this.now().toISOString(),
        distanceSteps: s.distanceSteps,
        lossPct: s.lossPct,
        medal: s.medal,
        hintUsed: this.hintUsed,
        ms: Math.max(0, this.now().getTime() - this.openedAt),
      };
      await this.history.add(attempt);
      await this.refresh();
    } finally {
      this.checking = false;
    }
  }
}

export const drills = new DrillStore();
