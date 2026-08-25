/**
 * UI-side worker client (ADR 0003). `SolverClient` talks to a real
 * `solver.worker.ts` over postMessage with id correlation; `stubClient()`
 * implements the same `request` shape with fixed plausible results so UI
 * phases (03+) can build against the protocol before the solver lands
 * (Phase 04). The worker module is constructed lazily inside a function so
 * a missing `solver.worker.ts` doesn't break the build.
 */
import { PROTOCOL_VERSION, type Request, type ResultOf, type Response } from './protocol';
import type {
  DockControls,
  DockScore,
  OptimalResult,
  OptimalTrimResult,
  SolveResult,
} from '../core/types';

export interface RequestOptions {
  /**
   * Called for every `progress` message the worker sends before the result.
   * Only requests that set `progress: true` produce any (today: `dockScore`).
   */
  onProgress?: (done: number, total: number) => void;
}

function createSolverWorker(): Worker {
  return new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' });
}

export class SolverClient {
  private worker: Worker;
  private nextId = 1;
  private pending = new Map<
    number,
    {
      resolve: (v: unknown) => void;
      reject: (e: Error) => void;
      onProgress?: (done: number, total: number) => void;
    }
  >();

  constructor(worker?: Worker) {
    this.worker = worker ?? createSolverWorker();
    this.worker.addEventListener('message', (e: MessageEvent<Response>) => {
      const res = e.data;
      const entry = this.pending.get(res.id);
      if (!entry) return;
      // Progress is reporting, not completion: leave the request pending.
      if (res.type === 'progress') return entry.onProgress?.(res.done, res.total);
      this.pending.delete(res.id);
      if (res.type === 'error') entry.reject(new Error(res.message));
      else entry.resolve(res.result);
    });
  }

  request<R extends Request>(
    req: Omit<R, 'id' | 'protocolVersion'>,
    opts?: RequestOptions,
  ): Promise<ResultOf<R>> {
    const id = this.nextId++;
    // The protocol is JSON by contract; the round-trip also strips reactive
    // proxies (Svelte $state) that structured clone refuses.
    const message = JSON.parse(
      JSON.stringify({ ...req, id, protocolVersion: PROTOCOL_VERSION }),
    ) as R;
    return new Promise<ResultOf<R>>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
        onProgress: opts?.onProgress,
      });
      this.worker.postMessage(message);
    });
  }
}

const stubSolve: SolveResult = {
  converged: true,
  iters: 12,
  bsKt: { value: 6.2, tier: 'A' },
  vmgKt: { value: 4.8, tier: 'A' },
  heelDeg: { value: 14, tier: 'A' },
  leewayDeg: { value: 3.5, tier: 'B', band: [3, 4] },
  aero: {
    flat: 0.9,
    reef: 1,
    twistEff: 12,
    awaDeg: 22,
    awsKt: 11.5,
    fxN: 480,
    fyN: 210,
    mxNm: 950,
    ceHeightM: 4.2,
  },
  rig: {
    bendMm: [0, 5, 12, 22, 34, 48, 63, 78, 90, 98, 102],
    sagMm: 18,
    rakeMm: 620,
    prebendMm: 42,
    forestayN: 1800,
    upperN: 2100,
    lowerN: 900,
  },
  shape: {},
  residuals: [0.001, 0.001, 0.002],
};

const stubOptimal: OptimalResult = {
  ...stubSolve,
  twaDeg: 42,
  race: {
    backstay: 20,
    mainsheet: 45,
    traveller: 0,
    cunningham: 10,
    outhaul: 30,
    vang: 15,
    jibSheet: 60,
    jibLead: 3,
    inhauler: 0,
    mainHalyard: 100,
    jibHalyard: 100,
  },
};

const stubOptimalTrim: OptimalTrimResult = {
  race: stubOptimal.race,
  result: stubSolve,
  moved: ['backstay', 'mainsheet'],
  iters: 96,
};

function stubDockScore(setup: DockControls): DockScore {
  const regret = { twsKt: 10, regretSPerMile: 2.5, optimum: setup };
  return {
    setup,
    expectedRegretSPerMile: { value: 2.5, tier: 'B', band: [1.5, 3.5] },
    atMin: regret,
    atMax: regret,
    worst: regret,
    perTws: [regret],
  };
}

/** UI target for Phase 03: fixed plausible results, no worker, no async solve. */
export function stubClient(): Pick<SolverClient, 'request'> {
  return {
    // ponytail: the stub answers instantly, so it ignores RequestOptions
    // entirely — a shorter parameter list still satisfies the same type.
    request<R extends Request>(req: Omit<R, 'id' | 'protocolVersion'>): Promise<ResultOf<R>> {
      const type = (req as { type: Request['type'] }).type;
      switch (type) {
        case 'loadBoat':
          return Promise.resolve(null as ResultOf<R>);
        case 'trimmed':
          return Promise.resolve(stubSolve as ResultOf<R>);
        case 'optimal':
          return Promise.resolve(stubOptimal as ResultOf<R>);
        case 'optimalTrim':
          return Promise.resolve(stubOptimalTrim as ResultOf<R>);
        case 'dockScore': {
          const setups = (req as unknown as { setups: DockControls[] }).setups;
          return Promise.resolve(setups.map(stubDockScore) as ResultOf<R>);
        }
        default:
          return Promise.reject(new Error(`stubClient: unhandled request type ${String(type)}`));
      }
    },
  };
}
