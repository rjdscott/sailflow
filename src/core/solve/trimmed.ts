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
import { boomAngle, jibSheetAngle } from '../shape/sheeting';
import { geometryFor, solveEquilibrium } from './equilibrium';
import { instrumentsFor } from './instruments';
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
  const orc = shapeToOrc(boat, shape, controls.race, condition.sailset, condition.twsKt);
  const tune = {
    flat: flatOverride ?? orc.flat,
    reef: orc.reef,
    twistEffDeg: orc.twistEffDeg,
  };
  // VPP mode (flatOverride given) assumes ideal sheeting, as ORC does. Race
  // mode reads the sheets: an eased or pinned sail costs lift (shape/sheeting.ts).
  const r = controls.race;
  const sheeting =
    flatOverride === undefined
      ? {
          main: {
            sheetDeg: boomAngle(r.mainsheet, r.traveller),
            twistDeg: shape.main?.threeQuarter.twistDeg ?? 0,
          },
          jib: {
            sheetDeg: jibSheetAngle(r.jibLead, r.jibSheet),
            twistDeg: shape.jib?.threeQuarter.twistDeg ?? 0,
          },
        }
      : undefined;
  const eq = solveEquilibrium(boat, { condition, tune, deltas: orc.deltas, sheeting }, geom);
  const ctx = { sailset: condition.sailset, twsKt: condition.twsKt, deltas: orc.deltas };
  const vmg = eq.bsKt * Math.cos((condition.twaDeg * Math.PI) / 180);
  const bsTier = tierFor('bs', ctx);
  return {
    converged: eq.converged,
    iters: eq.iters,
    bsKt: tiered(eq.bsKt, bsTier),
    vmgKt: tiered(vmg, tierFor('vmg', ctx)),
    heelDeg: tiered(eq.heelDeg, tierFor('heel', ctx), 0.15), // prov: assumed, wider ±15% band for heel (tier B)
    leewayDeg: tiered(eq.leewayDeg, tierFor('leeway', ctx), 0.25), // prov: assumed, wider ±25% band for leeway (tier B)
    aero: eq.aero,
    rig,
    shape,
    // Every solve carries the instrument block: `optimal()` and the dock
    // scorer both come through here, so Race, Drills and Dock all get it.
    instruments: instrumentsFor(boat, controls, condition, {
      aero: eq.aero,
      shape,
      bsKt: eq.bsKt,
      bsTier,
      heelDeg: eq.heelDeg,
    }),
    residuals: eq.residuals,
  };
}

/** Boat speed in m/s helper for callers that need SI. */
export function bsMs(r: SolveResult): number {
  return r.bsKt.value * KT_TO_MS;
}
