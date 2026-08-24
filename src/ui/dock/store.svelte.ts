/**
 * Dock-mode state: the forecast, the setup under consideration, its score,
 * and the suggest/commit actions. All solver traffic goes through
 * `./client` (ADR 0003).
 */
import type { DockControls, DockScore, Forecast } from '../../core/types';
import type { DockScoreRequest } from '../../worker/protocol';
import { getClient, type Client } from './client';
import { candidateSetups, pickBest, type Suggestion } from './logic';
import { rigLock, type RigLock } from '../stores/rigLock.svelte';

/** Long enough that dragging a slider is one solve, short enough to feel live. */
export const SCORE_DEBOUNCE_MS = 300;

export class DockStore {
  forecast: Forecast = $state({ minKt: 8, likelyKt: 12, maxKt: 16, seaState: 1, crewKg: 300 });
  setup: DockControls = $state({ upperTurns: 0, lowerTurns: 0, forestayMm: 0 });
  scores: DockScore[] | null = $state.raw(null);
  suggestion: Suggestion | null = $state.raw(null);
  busy: boolean = $state(false);
  error: string | null = $state.raw(null);

  private client: Client;
  /** Monotonic request id; a response whose id is not current is dropped. */
  private seq = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
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

  private async send(): Promise<void> {
    const id = ++this.seq;
    this.busy = true;
    try {
      const scores = await this.request([$state.snapshot(this.setup)]);
      if (id !== this.seq) return; // stale
      this.scores = scores;
      this.error = null;
    } catch (e) {
      if (id === this.seq) this.error = e instanceof Error ? e.message : String(e);
    } finally {
      if (id === this.seq) this.busy = false;
    }
  }

  /** Score the candidate grid and keep the lowest expected regret + tie band. */
  async suggest(): Promise<void> {
    const id = ++this.seq;
    this.busy = true;
    try {
      const scores = await this.request(candidateSetups());
      if (id !== this.seq) return; // stale
      this.suggestion = pickBest(scores);
      this.error = null;
    } catch (e) {
      if (id === this.seq) this.error = e instanceof Error ? e.message : String(e);
    } finally {
      if (id === this.seq) this.busy = false;
    }
  }

  private request(setups: DockControls[]): Promise<DockScore[]> {
    return this.client.request<DockScoreRequest>({
      type: 'dockScore',
      setups,
      candidates: candidateSetups(),
      forecast: $state.snapshot(this.forecast),
    });
  }

  apply(setup: DockControls): void {
    this.setup = { ...setup };
    this.rescore();
  }

  /** Lock the rig for the day and tell anyone who asked (e.g. the log draft). */
  commit(): RigLock {
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
