/**
 * The solver's best legal trim for the condition and the committed rig: the
 * one source the ghost ticks, the readout targets and the Apply button read.
 *
 * Keyed on condition + dock + the trim the search is seeded from. The descent
 * starts from the trim on screen, so an answer computed at one trim is not an
 * answer at another: keying on condition and dock alone left the ticks
 * prescribing positions found from a trim the user had since dragged away
 * from, with nothing on screen saying so (audit ux-02 H-07).
 *
 * A search costs ~280–380 solves (two seeds), so the debounce is long enough
 * to sit out a slider drag and only the settled trim is searched. While one
 * is pending the last answer stays on screen marked `stale`, and Apply is
 * disabled: applying a target found from somewhere else is the defect.
 */
import type {
  Condition,
  ControlState,
  OptimalTrimResult,
  RaceControls,
  Tier,
} from '../../core/types';
import { TRIM_CONTROLS, type OptimalTrimRequest } from '../../worker/protocol';
import { getClient, type Client } from './client';

/**
 * Long enough to sit out a slider drag and a held wind-speed stepper, short
 * enough that a settled trim gets its answer before you look up. prov: assumed.
 */
export const OPTIMUM_DEBOUNCE_MS = 300;

/**
 * prov: assumed. The optimum is a shape-layer answer, not a polar one: it is
 * `trimmed()` evaluated over the control grid, so it inherits the rig-bend →
 * sail-shape sensitivity layer's confidence (direction and band, calibrated),
 * not the polar's. Quote it as a target to steer at, not as a value.
 */
export const OPTIMUM_TIER: Tier = 'B';

/**
 * What a row says instead of a tick when the search declined to solve it.
 * Under the kite that is the mainsheet: the model has no boom-angle gradient
 * worth the name past 150° AWA, so the honest answer is the sailmakers' cue,
 * at tier C, rather than a number dressed up as a solve
 * (`core/solve/optimalTrim`, `notSolved`).
 */
export const NOT_SOLVED_HINT =
  'Not solved under the kite — tier C cue: ease until the boom is out past the corner of the boat, leech bearing on the leeward shroud, and let the vang own the twist.';

/** What the target ticks and the Apply badge say when you press them. */
export const OPTIMUM_REASON =
  'Searched from where your sliders are and from the base tune: a local optimum on the control grid, a direction and a band, not a value to dial in.';

/**
 * The inputs a re-search depends on: condition, committed rig, and the trim
 * the descent is seeded from. Only `TRIM_CONTROLS` counts — the halyards and
 * the inhauler cannot move the answer, so moving one must not spend a search.
 */
export function optimumKey(controls: ControlState, condition: Condition): string {
  return JSON.stringify([condition, controls.dock, TRIM_CONTROLS.map((c) => controls.race[c])]);
}

export class OptimumStore {
  result: OptimalTrimResult | null = $state(null);
  busy = $state(false);
  /** A newer condition, rig or trim is pending: what is on screen is the old answer. */
  stale = $state(false);
  error: string | null = $state(null);

  #client: Client;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #seq = 0;
  #key: string | null = null;

  constructor(client: Client = getClient()) {
    this.#client = client;
  }

  /** The optimal race trim, or null before the first answer lands. */
  get race(): RaceControls | null {
    return this.result?.race ?? null;
  }

  /** Controls the search actually moved, in `TRIM_CONTROLS` order. */
  get moved(): string[] {
    return this.result?.moved ?? [];
  }

  /** Controls the search declined to solve: no tick, `NOT_SOLVED_HINT` instead. */
  get notSolved(): string[] {
    return this.result?.notSolved ?? [];
  }

  /** Call with plain snapshots, not proxies. No-op when the key has not moved. */
  request(controls: ControlState, condition: Condition): void {
    const key = optimumKey(controls, condition);
    if (key === this.#key) return;
    this.#key = key;
    this.stale = this.result !== null;
    this.busy = true;
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => void this.#run(controls, condition), OPTIMUM_DEBOUNCE_MS);
  }

  async #run(controls: ControlState, condition: Condition): Promise<void> {
    const seq = ++this.#seq;
    try {
      const result = await this.#client.request<OptimalTrimRequest>({
        type: 'optimalTrim',
        controls,
        condition,
      });
      if (seq !== this.#seq) return;
      this.result = result;
      this.error = null;
    } catch (e) {
      if (seq !== this.#seq) return;
      this.error = e instanceof Error ? e.message : String(e);
      this.result = null;
    } finally {
      if (seq === this.#seq) {
        this.busy = false;
        this.stale = false;
      }
    }
  }

  dispose(): void {
    clearTimeout(this.#timer);
    this.#seq++;
  }
}

/** One search for the screen, like `race`: ControlPanel and Race both read it. */
export const optimum = new OptimumStore();
