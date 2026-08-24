/**
 * Race mode: a fixed control state, one equilibrium. No optimisation.
 * controls → rig state → flying shapes → ORC tune + shape deltas → equilibrium.
 */
import type {
  BoatDefinition,
  Condition,
  ControlState,
  SailId,
  SailShape,
  SolveResult,
} from '../types';
import { rigState } from '../rig/state';
import { flyingShape } from '../shape/flying';
import { shapeToOrc } from '../shape/toOrc';
import { geometryFor, solveEquilibrium } from './equilibrium';
import { tierFor, tiered } from './tierFor';
import type { AeroGeometry } from '../aero/orc/forces';
import { KT_TO_MS } from '../internal';

const SAILS_OF = { jib: ['main', 'jib'], asym: ['main', 'asym'] } as const;

export function trimmed(
  boat: BoatDefinition,
  controls: ControlState,
  condition: Condition,
  geom: Record<SailId, AeroGeometry> = geometryFor(boat),
  /** Override the shape-derived flat (used by VPP mode); undefined = from shape. */
  flatOverride?: number,
): SolveResult {
  const rig = rigState(boat, controls.dock, controls.race.backstay);
  const shape: Partial<Record<SailId, SailShape>> = {};
  for (const s of SAILS_OF[condition.sailset]) shape[s] = flyingShape(boat, rig, controls.race, s);
  const orc = shapeToOrc(boat, shape, controls.race, condition.sailset);
  const tune = {
    flat: flatOverride ?? orc.flat,
    reef: orc.reef,
    twistEffDeg: orc.twistEffDeg,
  };
  const eq = solveEquilibrium(boat, { condition, tune, deltas: orc.deltas }, geom);
  const ctx = { sailset: condition.sailset, twsKt: condition.twsKt, deltas: orc.deltas };
  const vmg = eq.bsKt * Math.cos((condition.twaDeg * Math.PI) / 180);
  return {
    converged: eq.converged,
    iters: eq.iters,
    bsKt: tiered(eq.bsKt, tierFor('bs', ctx)),
    vmgKt: tiered(vmg, tierFor('vmg', ctx)),
    heelDeg: tiered(eq.heelDeg, tierFor('heel', ctx), 0.15), // prov: assumed, wider ±15% band for heel (tier B)
    leewayDeg: tiered(eq.leewayDeg, tierFor('leeway', ctx), 0.25), // prov: assumed, wider ±25% band for leeway (tier B)
    aero: eq.aero,
    rig,
    shape,
    residuals: eq.residuals,
  };
}

/** Boat speed in m/s helper for callers that need SI. */
export function bsMs(r: SolveResult): number {
  return r.bsKt.value * KT_TO_MS;
}
