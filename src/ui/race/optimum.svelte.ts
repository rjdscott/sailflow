/**
 * The solver's best legal trim for the condition and the committed rig: the
 * one source the ghost ticks, the readout targets and the Apply button read.
 *
 * Keyed on condition + dock, deliberately **not** on the race sliders. The
 * descent starts from whatever trim is on screen when the request fires, but
 * moving a slider must not re-run it: a tick that chases the thumb is not a
 * target, and one `optimalTrim` costs ~140–190 solves. So `request()` builds a
 * key from the condition and the dock and returns early when nothing in it
 * moved. Debounce + sequence guard on top of that, same as `RaceStore`: a
 * stepped wind speed fires one search, and a slow answer to an old condition
 * never overwrites a fresh one.
 */
import type {
  Condition,
  ControlState,
  OptimalTrimResult,
  RaceControls,
  Tier,
} from '../../core/types';
import type { OptimalTrimRequest } from '../../worker/protocol';
import { getClient, type Client } from './client';

/** Long enough to swallow a held wind-speed stepper, short enough to feel live. */
export const OPTIMUM_DEBOUNCE_MS = 150;

/**
 * prov: assumed. The optimum is a shape-layer answer, not a polar one: it is
 * `trimmed()` evaluated over the control grid, so it inherits the rig-bend →
 * sail-shape sensitivity layer's confidence (direction and band, calibrated),
 * not the polar's. Quote it as a target to steer at, not as a value.
 */
export const OPTIMUM_TIER: Tier = 'B';

/** What the target ticks and the Apply badge say when you press them. */
export const OPTIMUM_REASON =
  'Best trim the shape layer can find from here: a direction and a band, not a value to dial in.';

/**
 * The inputs a re-search depends on. Race controls are excluded on purpose —
 * see the module header.
 */
export function optimumKey(controls: ControlState, condition: Condition): string {
  return JSON.stringify([condition, controls.dock]);
}

export class OptimumStore {
  result: OptimalTrimResult | null = $state(null);
  busy = $state(false);
  /** A newer condition or rig is pending: what is on screen is the old answer. */
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
