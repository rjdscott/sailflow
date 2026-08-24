/**
 * Drill screen state: which drill is open, what the learner has trimmed, the
 * live `trimmed` solve, and the score once they hit Check.
 *
 * Live solves are debounced 80 ms and stale-dropped: a slider drag fires many
 * changes and out-of-order worker replies must not overwrite a newer result.
 */
import type { DownControls, OptimalResult, RaceControls, SolveResult } from '../../core/types';
import type { OptimalRequest, TrimmedRequest } from '../../worker/protocol';
import {
  DRILLS,
  coachLine,
  loadBest,
  perControlDelta,
  saveBest,
  scoreDrill,
  type BestScores,
  type ControlDelta,
  type Drill,
  type Medal,
} from '../../lib/drills';
import { getClient } from './client';

const DEBOUNCE_MS = 80;

export interface DrillScore {
  lossPct: number;
  medal: Medal;
  deltas: ControlDelta[];
  coach: string;
  optimum: OptimalResult;
}

class DrillStore {
  readonly list: Drill[] = DRILLS;

  current = $state<Drill | undefined>(undefined);
  controls = $state<RaceControls>({ ...DRILLS[0].start });
  down = $state<DownControls | undefined>(undefined);
  result = $state<SolveResult | undefined>(undefined);
  score = $state<DrillScore | undefined>(undefined);
  checking = $state(false);
  best = $state<BestScores>(loadBest());

  private seq = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;

  open(drill: Drill): void {
    this.current = drill;
    this.reset();
  }

  close(): void {
    this.current = undefined;
    this.result = undefined;
    this.score = undefined;
  }

  /** Back to the drill's wrong setup, keeping the drill open. */
  reset(): void {
    const drill = this.current;
    if (!drill) return;
    this.controls = { ...drill.start };
    this.down = drill.down ? { ...drill.down } : undefined;
    this.score = undefined;
    this.solve();
  }

  next(): void {
    const drill = this.current;
    if (!drill) return;
    const i = this.list.indexOf(drill);
    this.open(this.list[(i + 1) % this.list.length]);
  }

  /** Debounced live `trimmed` solve for the current control state. */
  solve(): void {
    const drill = this.current;
    if (!drill) return;
    const controls = { dock: drill.dock, race: { ...this.controls }, down: this.down };
    // A score belongs to the trim it was taken on; moving anything voids it.
    this.score = undefined;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      const ticket = ++this.seq;
      void getClient()
        .request<TrimmedRequest>({ type: 'trimmed', controls, condition: drill.condition })
        .then((r) => {
          if (ticket === this.seq) this.result = r;
        });
    }, DEBOUNCE_MS);
  }

  /** Score the current trim against the VPP optimum at the drill's condition. */
  async check(): Promise<void> {
    const drill = this.current;
    const user = this.result;
    if (!drill || !user || this.checking) return;
    this.checking = true;
    try {
      const optimum = await getClient().request<OptimalRequest>({
        type: 'optimal',
        dock: drill.dock,
        condition: drill.condition,
        optimiseTwa: false,
      });
      const upwind = Math.abs(drill.condition.twaDeg) < 90;
      const { lossPct, medal } = scoreDrill(
        { vmgKt: user.vmgKt.value },
        { vmgKt: optimum.vmgKt.value },
        upwind,
      );
      const deltas = perControlDelta(this.controls, optimum.race, drill.free);
      this.score = { lossPct, medal, deltas, coach: coachLine(deltas), optimum };
      this.best = saveBest(drill.id, lossPct);
    } finally {
      this.checking = false;
    }
  }
}

export const drills = new DrillStore();
