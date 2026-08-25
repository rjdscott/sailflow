/// <reference lib="webworker" />
/**
 * Solver worker: the only entry point from the UI into src/core (ADR 0003).
 * Zero logic beyond dispatch; every request/response is JSON-safe.
 */
import type { BoatDefinition } from '../core/types';
import { validateBoat } from '../core/boat/validate';
import { geometryFor } from '../core/solve/equilibrium';
import { trimmed } from '../core/solve/trimmed';
import { optimal } from '../core/solve/optimal';
import { optimalTrim } from '../core/solve/optimalTrim';
import { scoreDockSetups } from '../core/solve/dock';
import type { AeroGeometry } from '../core/aero/orc/forces';
import type { SailId } from '../core/types';
import { PROTOCOL_VERSION, type Request, type Response } from './protocol';

let boat: BoatDefinition | null = null;
let geom: Record<SailId, AeroGeometry> | null = null;

export function handle(req: Request): Response {
  const base = { protocolVersion: PROTOCOL_VERSION, id: req.id } as const;
  if (req.protocolVersion !== PROTOCOL_VERSION)
    return {
      ...base,
      type: 'error',
      message: `protocol ${req.protocolVersion} != ${PROTOCOL_VERSION}`,
    };
  try {
    switch (req.type) {
      case 'loadBoat': {
        const problems = validateBoat(req.boat);
        if (problems.length) return { ...base, type: 'error', message: problems.join('; ') };
        boat = req.boat;
        geom = geometryFor(boat);
        return { ...base, type: 'ok', result: null };
      }
      case 'trimmed':
        return { ...base, type: 'ok', result: trimmed(need(), req.controls, req.condition, geom!) };
      case 'optimal':
        return {
          ...base,
          type: 'ok',
          result: optimal(need(), req.dock, req.condition, { optimiseTwa: req.optimiseTwa }, geom!),
        };
      case 'optimalTrim':
        return {
          ...base,
          type: 'ok',
          result: optimalTrim(need(), req.controls, req.condition, {}, geom!),
        };
      case 'dockScore':
        return {
          ...base,
          type: 'ok',
          result: scoreDockSetups(need(), req.setups, req.forecast, req.candidates, geom!),
        };
    }
  } catch (e) {
    return { ...base, type: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}

function need(): BoatDefinition {
  if (!boat) throw new Error('no boat loaded');
  return boat;
}

// In a real worker context, wire onmessage; in tests `handle` is called directly.
if (typeof self !== 'undefined' && 'postMessage' in self && typeof window === 'undefined') {
  self.onmessage = (ev: MessageEvent<Request>) => self.postMessage(handle(ev.data));
}
