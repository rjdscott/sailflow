/**
 * Dock-mode state: the forecast, the setup under consideration, its score,
 * and the suggest/commit actions. All solver traffic goes through
 * `./client` (ADR 0003).
 */
import type { DockControls, DockScore, Forecast } from '../../core/types';
import type { DockScoreRequest } from '../../worker/protocol';
import { getClient, type Client } from './client';
import { candidateSetups, pickBest, quickCandidates, type Suggestion } from './logic';
import { rigLock, type RigLock } from '../stores/rigLock.svelte';

/** Long enough that dragging a slider is one solve, short enough to feel live. */
export const SCORE_DEBOUNCE_MS = 300;

/**
 * How long an armed commit stays armed on the phone bar. Long enough to read
 * the setup in the label, short enough that a pocket tap minutes later cannot
 * land on a live confirm (audit ux-01 M-03).
 */
export const COMMIT_ARM_MS = 4000;

export class DockStore {
  forecast: Forecast = $state({ minKt: 8, likelyKt: 12, maxKt: 16, seaState: 1, crewKg: 300 });
  setup: DockControls = $state({ upperTurns: 0, lowerTurns: 0, forestayMm: 0 });
  scores: DockScore[] | null = $state.raw(null);
  suggestion: Suggestion | null = $state.raw(null);
  /** Scoring the current setup. */
  busy: boolean = $state(false);
  /** Laps solved / laps to solve for the pass in flight, when it reports. */
  progress: { done: number; total: number } | null = $state.raw(null);
  /** `scores` came from the reduced reference grid; the full one is in flight. */
  provisional: boolean = $state(false);
  /** Searching the candidate grid. Separate from `busy`: a slider nudge must
      not cancel a search, and the Suggest button must not read "Searching…"
      while a rescore runs (audit ux-01 H-03). */
  searching: boolean = $state(false);
  error: string | null = $state.raw(null);
  /** The phone commit bar is armed and the next tap commits. */
  armed: boolean = $state(false);
  /** `apply()` refused because the rig is locked; the Suggest card says so. */
  needsUnlock: boolean = $state(false);

  private client: Client;
  /** Monotonic request ids; a response whose id is not current is dropped. */
  private seq = 0;
  private searchSeq = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private armTimer: ReturnType<typeof setTimeout> | undefined;
  private listeners: ((lock: RigLock) => void)[] = [];

  constructor(client: Client = getClient()) {
    this.client = client;
  }

  get score(): DockScore | null {
    return this.scores?.[0] ?? null;
  }

  get committed(): RigLock | null {
    return rigLock.locked;
  }

  /** Score the current setup. Debounced; the last call within the window wins. */
  rescore(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.send(), SCORE_DEBOUNCE_MS);
  }

  /**
   * Two passes. The first scores against `quickCandidates()` and paints a
   * provisional number in well under a second; the second scores against the
   * full grid and replaces it. The solver memoises lap times per setup, so
   * the second pass pays only for the candidates the first did not cover.
   */
  private async send(): Promise<void> {
    const id = ++this.seq;
    const setup = $state.snapshot(this.setup);
    this.busy = true;
    this.progress = null;
    try {
      const quick = await this.request([setup], quickCandidates());
      if (id !== this.seq) return; // stale
      this.scores = quick;
      this.provisional = true;
      this.error = null;

      const full = await this.request([setup], candidateSetups(), (done, total) => {
        if (id === this.seq) this.progress = { done, total };
      });
      if (id !== this.seq) return; // stale
      this.scores = full;
      this.provisional = false;
      this.error = null;
    } catch (e) {
      if (id === this.seq) this.error = e instanceof Error ? e.message : String(e);
    } finally {
      if (id === this.seq) {
        this.busy = false;
        this.progress = null;
      }
    }
  }

  /** Score the candidate grid and keep the lowest expected regret + tie band. */
  async suggest(): Promise<void> {
    const id = ++this.searchSeq;
    this.searching = true;
    try {
      const scores = await this.request(candidateSetups());
      if (id !== this.searchSeq) return; // stale
      this.suggestion = pickBest(scores);
      this.error = null;
    } catch (e) {
      if (id === this.searchSeq) this.error = e instanceof Error ? e.message : String(e);
    } finally {
      if (id === this.searchSeq) this.searching = false;
    }
  }

  private request(
    setups: DockControls[],
    candidates: DockControls[] = candidateSetups(),
    onProgress?: (done: number, total: number) => void,
  ): Promise<DockScore[]> {
    return this.client.request<DockScoreRequest>(
      {
        type: 'dockScore',
        setups,
        candidates,
        forecast: $state.snapshot(this.forecast),
        progress: onProgress !== undefined,
      },
      { onProgress },
    );
  }

  /**
   * Refuses while the rig is locked for the day rather than unlocking behind
   * the user's back: unlock is the C.9.5-violating direction, so it stays a
   * deliberate two-tap in `CommitButton` (audit ux-01 M-07).
   */
  apply(setup: DockControls): void {
    if (rigLock.lockedToday) {
      this.needsUnlock = true;
      return;
    }
    this.needsUnlock = false;
    this.setup = { ...setup };
    this.rescore();
  }

  /** First tap arms, a second within `COMMIT_ARM_MS` commits. */
  arm(): void {
    clearTimeout(this.armTimer);
    this.armed = true;
    this.armTimer = setTimeout(() => (this.armed = false), COMMIT_ARM_MS);
  }

  disarm(): void {
    clearTimeout(this.armTimer);
    this.armed = false;
  }

  /** Lock the rig for the day and tell anyone who asked (e.g. the log draft). */
  commit(): RigLock {
    this.disarm();
    const lock = rigLock.commit($state.snapshot(this.setup), $state.snapshot(this.forecast));
    for (const fn of this.listeners) fn(lock);
    return lock;
  }

  /** Returns an unsubscribe function. */
  onCommit(fn: (lock: RigLock) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((f) => f !== fn);
    };
  }
}

export const dock = new DockStore();
