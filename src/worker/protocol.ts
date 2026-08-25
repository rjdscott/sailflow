/**
 * Worker protocol: the only path from UI to physics (ADR 0003).
 * Every message is plain JSON. Bump PROTOCOL_VERSION on any breaking change
 * and regenerate validation/golden.
 */
import type { TrimControl } from '../core/solve/optimalTrim';
import type {
  BoatDefinition,
  Condition,
  ControlState,
  DockControls,
  DockScore,
  Forecast,
  OptimalResult,
  OptimalTrimResult,
  SolveResult,
} from '../core/types';

export const PROTOCOL_VERSION = 1 as const;

/**
 * The race controls an `optimalTrim` request actually moves — the list the UI
 * needs to decide which sliders get a ghost tick and which get "no modelled
 * effect on speed" instead.
 *
 * Restated here rather than re-exported from `core/solve/optimalTrim`: the UI
 * may not import the core (ADR 0003), and a value re-export would drag the
 * whole solver into the main bundle for the sake of eight strings. The
 * `satisfies` keeps it honest — `core/solve/optimalTrim.ts` owns the truth,
 * and renaming or dropping a control there fails the typecheck here.
 */
export const TRIM_CONTROLS = [
  'backstay',
  'mainsheet',
  'traveller',
  'vang',
  'outhaul',
  'cunningham',
  'jibSheet',
  'jibLead',
] as const satisfies readonly TrimControl[];

export type { TrimControl };

interface Base {
  protocolVersion: typeof PROTOCOL_VERSION;
  id: number;
}

/** Load (or replace) the boat the worker solves for. */
export interface LoadBoatRequest extends Base {
  type: 'loadBoat';
  boat: BoatDefinition;
}

/** Race mode: fixed controls, single equilibrium. */
export interface TrimmedRequest extends Base {
  type: 'trimmed';
  controls: ControlState;
  condition: Condition;
}

/** VPP mode: race controls (and TWA when `optimiseTwa`) optimised. */
export interface OptimalRequest extends Base {
  type: 'optimal';
  dock: DockControls;
  condition: Condition;
  optimiseTwa: boolean;
}

/**
 * Race mode: the best legal trim reachable from `controls` by moving the
 * race controls the shape layer responds to (`core/solve/optimalTrim`).
 * Additive in protocol v1: older clients simply never send it.
 */
export interface OptimalTrimRequest extends Base {
  type: 'optimalTrim';
  controls: ControlState;
  condition: Condition;
}

export interface DockScoreRequest extends Base {
  type: 'dockScore';
  setups: DockControls[];
  forecast: Forecast;
  /** Optional reference grid for T*(w); defaults to the solver's legal grid. */
  candidates?: DockControls[];
}

export type Request =
  LoadBoatRequest | TrimmedRequest | OptimalRequest | OptimalTrimRequest | DockScoreRequest;

export interface OkResponse<T> extends Base {
  type: 'ok';
  result: T;
}

export interface ErrorResponse extends Base {
  type: 'error';
  message: string;
}

export type Response =
  | OkResponse<null>
  | OkResponse<SolveResult>
  | OkResponse<OptimalResult>
  | OkResponse<OptimalTrimResult>
  | OkResponse<DockScore[]>
  | ErrorResponse;

export type ResultOf<R extends Request> = R extends LoadBoatRequest
  ? null
  : R extends TrimmedRequest
    ? SolveResult
    : R extends OptimalRequest
      ? OptimalResult
      : R extends OptimalTrimRequest
        ? OptimalTrimResult
        : R extends DockScoreRequest
          ? DockScore[]
          : never;
