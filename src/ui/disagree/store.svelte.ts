/**
 * Model side of the disagreement panel: what *this* model thinks the optimum
 * dock setup and upwind numbers are for a condition.
 *
 * The solver has no "best rig for this wind" request, so we approximate it the
 * way a sailor does: score a coarse grid of dock setups against a forecast
 * pinned to the single wind speed, take the least-regret one, then solve that
 * rig upwind with TWA optimised. Two round trips, not a search.
 */
import type { SolverClient } from '../../worker/client';
import type { DockScoreRequest, OptimalRequest } from '../../worker/protocol';
import type { DockControls, SeaState, Tiered } from '../../core/types';

export type Client = Pick<SolverClient, 'request'>;

export interface ModelOptimum {
  dock: DockControls;
  bsKt: Tiered;
  twaDeg: number;
  heelDeg: Tiered;
}

// ponytail: 24 candidates is a coarse net, chosen so one dockScore round trip
// stays interactive on a phone. Refine around the winner only if the grid
// spacing shows up as a visible plateau in the regret numbers.
const UPPERS = [-3, 0, 3, 6];
const LOWERS = [-2, 1, 3];
const FORESTAY = [0, 15];

export function candidateSetups(): DockControls[] {
  return UPPERS.flatMap((upperTurns) =>
    LOWERS.flatMap((lowerTurns) =>
      FORESTAY.map((forestayMm) => ({ upperTurns, lowerTurns, forestayMm })),
    ),
  );
}

export async function computeModelOptimum(
  client: Client,
  twsKt: number,
  seaState: SeaState,
  crewKg: number,
): Promise<ModelOptimum> {
  const scores = await client.request<DockScoreRequest>({
    type: 'dockScore',
    setups: candidateSetups(),
    forecast: { minKt: twsKt, likelyKt: twsKt, maxKt: twsKt, seaState, crewKg },
  });
  if (scores.length === 0) throw new Error('computeModelOptimum: solver returned no dock scores');
  const best = scores.reduce((a, b) =>
    b.expectedRegretSPerMile.value < a.expectedRegretSPerMile.value ? b : a,
  );
  const optimal = await client.request<OptimalRequest>({
    type: 'optimal',
    dock: best.setup,
    condition: { twsKt, twaDeg: 45, seaState, crewKg, sailset: 'jib' },
    optimiseTwa: true,
  });
  return {
    dock: best.setup,
    bsKt: optimal.bsKt,
    twaDeg: optimal.twaDeg,
    heelDeg: optimal.heelDeg,
  };
}

const DEBOUNCE_MS = 400;

/**
 * Debounced, stale-dropping wrapper. Sliders fire on every pixel; only the
 * last request's answer is allowed to land.
 */
export class ModelOptimumStore {
  optimum = $state<ModelOptimum | null>(null);
  busy = $state(false);
  error = $state<string | null>(null);

  #client: Client;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #seq = 0;

  constructor(client: Client) {
    this.#client = client;
  }

  request(twsKt: number, seaState: SeaState, crewKg: number): void {
    clearTimeout(this.#timer);
    this.busy = true;
    this.#timer = setTimeout(() => void this.#run(twsKt, seaState, crewKg), DEBOUNCE_MS);
  }

  async #run(twsKt: number, seaState: SeaState, crewKg: number): Promise<void> {
    const seq = ++this.#seq;
    try {
      const result = await computeModelOptimum(this.#client, twsKt, seaState, crewKg);
      if (seq !== this.#seq) return;
      this.optimum = result;
      this.error = null;
    } catch (e) {
      if (seq !== this.#seq) return;
      this.error = e instanceof Error ? e.message : String(e);
      this.optimum = null;
    } finally {
      if (seq === this.#seq) this.busy = false;
    }
  }

  dispose(): void {
    clearTimeout(this.#timer);
    this.#seq++;
  }
}
