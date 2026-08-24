/**
 * VPP mode: for a given dock setup and condition, find the best race trim
 * and (optionally) the best TWA. Used by calibration, the polar report,
 * the coach line and dock-mode scoring.
 *
 * ponytail: race trim is optimised through the single ORC `flat` parameter
 * (golden section), with race controls held at the guide base and backstay
 * mapped from flat so the rig and shape layers still respond to the dock
 * setup. A full search over eleven controls is Epic 2 work; this is the
 * ORC-documented depowering order (§5.1.3: flat first, reef only if flat
 * floors) and is what the polar itself was produced with.
 */
import type {
  BoatDefinition,
  Condition,
  DockControls,
  OptimalResult,
  RaceControls,
} from '../types';
import { goldenMax } from '../math';
import { flatMin } from '../aero/orc/depower';
import { baseRace } from '../shape/base';
import { geometryFor } from './equilibrium';
import { trimmed } from './trimmed';
import type { SailId } from '../types';
import type { AeroGeometry } from '../aero/orc/forces';

const FLAT_ITERS = 12; // prov: assumed; golden section to ~0.5 % of the flat range
const TWA_ITERS = 16; // prov: assumed; ~0.2° on a 30° bracket
const TWA_UP: [number, number] = [35, 60]; // prov: ORC Speed Guide beat angles fall inside
const TWA_DN: [number, number] = [120, 178]; // prov: ORC Speed Guide run angles fall inside

/** Map an ORC flat value onto the backstay control so the rig responds. prov: assumed */
export function backstayFromFlat(flat: number): number {
  const fmin = flatMin();
  return Math.round(((1 - flat) / (1 - fmin)) * 100);
}

export interface OptimalOptions {
  optimiseTwa: boolean;
  race?: RaceControls;
}

export function optimal(
  boat: BoatDefinition,
  dock: DockControls,
  condition: Condition,
  opts: OptimalOptions,
  geom: Record<SailId, AeroGeometry> = geometryFor(boat),
): OptimalResult {
  const baseRaceCtl = opts.race ?? baseRace();
  const upwind = Math.abs(condition.twaDeg) < 90; // prov: assumed, upwind/downwind split at 90° TWA

  const solveAt = (twaDeg: number, flat: number) => {
    const race = { ...baseRaceCtl, backstay: backstayFromFlat(flat) };
    const r = trimmed(boat, { dock, race }, { ...condition, twaDeg }, geom, flat);
    return { r, race };
  };

  const bestFlatAt = (twaDeg: number) => {
    const objective = (flat: number) => {
      const { r } = solveAt(twaDeg, flat);
      if (!r.converged) return -1e3; // non-converged states lose the search
      const v = r.bsKt.value;
      // At a fixed angle the argmax of VMG is the argmax of boat speed, and
      // at 90° cos is ~0 so VMG would be a degenerate objective.
      if (!opts.optimiseTwa) return v;
      const vmg = v * Math.cos((twaDeg * Math.PI) / 180);
      return upwind ? vmg : -vmg;
    };
    const g = goldenMax(objective, flatMin(), 1, FLAT_ITERS);
    return { flat: g.x, score: g.fx };
  };

  let twaDeg = Math.abs(condition.twaDeg);
  if (opts.optimiseTwa) {
    const [a, b] = upwind ? TWA_UP : TWA_DN;
    twaDeg = goldenMax((t) => bestFlatAt(t).score, a, b, TWA_ITERS).x;
  }
  const { flat } = bestFlatAt(twaDeg);
  const { r, race } = solveAt(twaDeg, flat);
  const sign = condition.twaDeg < 0 ? -1 : 1;
  return { ...r, twaDeg: twaDeg * sign, race };
}
