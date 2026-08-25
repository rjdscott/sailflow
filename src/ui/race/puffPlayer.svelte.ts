/**
 * Plays a `puff.ts` sequence against the live stores: it sets the condition,
 * lets the existing solve and optimum machinery answer, and lights the panels
 * in the order the power state calls for.
 *
 * It owns exactly one piece of state of its own — where it is in the sequence
 * — and borrows everything else, so a replay is the real screen doing the real
 * thing, not a mock of it. Whatever the condition was when you pressed play is
 * restored on the last step and on cancel, including a cancel mid-flight.
 */
import { conditions } from '../stores/conditions.svelte';
import type { PanelId } from '../keys';
import { optimum } from './optimum.svelte';
import {
  panelOrder,
  powerState,
  schedule,
  SEQUENCES,
  type PowerState,
  type ScheduledStep,
  type SequenceId,
} from './puff';
import { race } from './store.svelte';

/**
 * How long one step of the replay holds. Long enough to read the panels
 * lighting up and for the optimum search (a 300 ms debounce plus ~300 solves)
 * to answer at all; the player also waits on the search before stepping on.
 * prov: assumed (ASSUMPTIONS.md, puff replay).
 */
export const PUFF_STEP_MS = 1600;

/** Poll interval and cap while waiting for the step's solve to settle. prov: assumed. */
export const WAIT_MS = 200;
const MAX_WAIT_MS = 3000;

const TWA_MIN = 20;
const TWA_MAX = 180;

export class PuffPlayer {
  seq: SequenceId | null = $state.raw(null);
  step: ScheduledStep | null = $state.raw(null);
  power: PowerState | null = $state.raw(null);
  /** Panels to light, most urgent first (Ingham's order for this state). */
  lit: PanelId[] = $state.raw([]);

  #restore: { twsKt: number; twaDeg: number } | null = null;
  #steps: ScheduledStep[] = [];
  #at = 0;
  #stepMs = PUFF_STEP_MS;
  #waited = 0;
  /** This step's solve has landed and its cue is on screen. */
  #settled = false;
  #timer: ReturnType<typeof setTimeout> | undefined;

  get playing(): boolean {
    return this.seq !== null;
  }

  get label(): string {
    return this.seq ? SEQUENCES[this.seq].label : '';
  }

  /** Position in the lighting order, or −1 for a panel this state leaves alone. */
  litIndex(panel: PanelId): number {
    return this.lit.indexOf(panel);
  }

  /** Start a sequence. A second call while one is playing is ignored. */
  start(seq: SequenceId, stepMs = PUFF_STEP_MS): void {
    if (this.seq) return;
    this.#restore = { twsKt: conditions.twsKt, twaDeg: conditions.twaDeg };
    this.#steps = schedule(seq, stepMs);
    this.#stepMs = stepMs;
    this.#at = 0;
    this.seq = seq;
    this.#playStep();
  }

  /** Stop and put the condition back exactly as it was. Safe to call twice. */
  cancel(): void {
    clearTimeout(this.#timer);
    this.#timer = undefined;
    if (this.#restore) {
      conditions.twsKt = this.#restore.twsKt;
      conditions.twaDeg = this.#restore.twaDeg;
      this.#restore = null;
    }
    this.seq = null;
    this.step = null;
    this.power = null;
    this.lit = [];
    this.#steps = [];
    this.#at = 0;
  }

  #playStep(): void {
    const step = this.#steps[this.#at];
    const base = this.#restore!;
    if (step.twsKt !== undefined) conditions.twsKt = step.twsKt;
    if (step.twaOffsetDeg !== undefined) {
      conditions.twaDeg = Math.min(TWA_MAX, Math.max(TWA_MIN, base.twaDeg + step.twaOffsetDeg));
    }
    this.step = step;
    // No cue until the solve for *this* condition has landed. Reading the
    // previous step's solve mixed the new wind with the old heel, so the gust
    // peak read "underpowered" at 15° of heel (audit ux-03 H-05).
    this.power = null;
    this.lit = [];
    this.#at++;
    this.#waited = 0;
    this.#settled = false;
    this.#timer = setTimeout(() => this.#next(), WAIT_MS);
  }

  /**
   * Two jobs, in order: wait for this step's solve and light the panels off
   * it, then hold the step for what is left of its dwell and move on. Giving
   * up after `MAX_WAIT_MS` shows whatever is on screen rather than stalling.
   */
  #next(): void {
    if (!this.#settled) {
      this.#waited += WAIT_MS;
      if ((race.busy || optimum.busy || optimum.stale) && this.#waited < MAX_WAIT_MS) {
        this.#timer = setTimeout(() => this.#next(), WAIT_MS);
        return;
      }
      this.#settled = true;
      const r = race.result;
      this.power = r
        ? powerState({ flat: r.aero.flat, heelDeg: r.heelDeg.value, twsKt: conditions.twsKt })
        : null;
      this.lit = this.power ? panelOrder(this.power) : [];
      // The settle is spent out of the step's own dwell, so a sequence still
      // runs at one step per `stepMs` when the solver keeps up.
      this.#timer = setTimeout(() => this.#next(), Math.max(0, this.#stepMs - this.#waited));
      return;
    }
    if (this.#at < this.#steps.length) this.#playStep();
    else this.cancel();
  }
}

/** One player for the screen: the actions bar starts it, the panels read it. */
export const puffPlayer = new PuffPlayer();
