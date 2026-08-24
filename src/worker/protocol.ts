/**
 * Worker protocol: the only path from UI to physics (ADR 0003).
 * Every message is plain JSON. Bump PROTOCOL_VERSION on any breaking change
 * and regenerate validation/golden.
 */
import type {
  BoatDefinition,
  Condition,
  ControlState,
  DockControls,
  DockScore,
  Forecast,
  OptimalResult,
  SolveResult,
} from '../core/types';

export const PROTOCOL_VERSION = 1 as const;

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

export interface DockScoreRequest extends Base {
  type: 'dockScore';
  setups: DockControls[];
  forecast: Forecast;
}

export type Request = LoadBoatRequest | TrimmedRequest | OptimalRequest | DockScoreRequest;

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
  | OkResponse<DockScore[]>
  | ErrorResponse;

export type ResultOf<R extends Request> = R extends LoadBoatRequest
  ? null
  : R extends TrimmedRequest
    ? SolveResult
    : R extends OptimalRequest
      ? OptimalResult
      : R extends DockScoreRequest
        ? DockScore[]
        : never;
