/**
 * VPP mode: for a given dock setup and condition, find the best race trim
 * and (optionally) the best TWA. Used by calibration, the polar report,
 * the coach line and dock-mode scoring.
 *
 * ponytail: race trim is optimised through the two ORC de-powering parameters
 * in ORC's own order (§5.1.3: flat first, reef only once flat has floored),
 * each by golden section, with race controls held at the guide base and
 * backstay mapped from flat so the rig and shape layers still respond to the
 * dock setup. A full search over eleven controls is Epic 2 work; this is what
 * the polar itself was produced with.
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
import { baseRace, baseRaceDown } from '../shape/base';
import { geometryFor } from './equilibrium';
import { trimmed } from './trimmed';
import type { SailId } from '../types';
import type { AeroGeometry } from '../aero/orc/forces';

const FLAT_ITERS = 12; // prov: assumed; golden section to ~0.5 % of the flat range
/**
 * Second de-powering stage. ORC §5.1.3 reduces sail area only once FLAT has
 * reached FlatMIN, so the reef search runs only from the flat floor — and,
 * because it never runs anywhere else, it costs nothing on the rows where the
 * boat is still choosing how hard to trim rather than how much sail to carry.
 *
 * Floor: ORC's RED = 2*reef, so at reef 0.5 the headsail is fully reduced with
 * the main still whole, and below it the *main* starts coming off
 * (§5.1.3, Figure 5.4; `aero/orc/depower.ts reduction()`). A one-design
 * sportboat main has no reef points, so 0.5 is where this app's second stage
 * stops. prov: ORC VPP 2023 §5.1.3 / Figure 5.4 for the RED decomposition;
 * the 0.5 floor is this app's convention.
 */
const REEF_MIN = 0.5;
const REEF_ITERS = 12; // prov: assumed; same budget and shape as the flat search
/**
 * "Flat is at its floor": within 1 % of the golden search's own bracket. Twelve
 * golden iterations shrink the bracket to ~0.4 % of it, so a flat that wanted
 * the floor lands inside this and one that did not cannot. prov: derived.
 */
const FLAT_FLOOR_FRAC = 0.01;
const TWA_ITERS = 16; // prov: assumed; ~0.2° on a 30° bracket
const TWA_UP: [number, number] = [35, 60]; // prov: ORC Speed Guide beat angles fall inside
const TWA_DN: [number, number] = [120, 178]; // prov: ORC Speed Guide run angles fall inside
/**
 * Coarse scan step for the downwind TWA search, degrees.
 *
 * Golden section finds *a* maximum, and only the global one if the objective is
 * unimodal. Downwind VMG is not: there is a reaching hump near 145° and, once
 * the offwind sail is in its parachute regime, a soak hump near 168°, with a
 * trough between them (docs/plans/2026-08-26-phase-two/phase-01, the TWA sweep).
 * Which hump a bare golden section lands on depends on the bracket, not on the
 * physics, so the search scans first and refines inside the winning hump.
 *
 * 6° puts at least three samples on either hump at every wind speed swept.
 * prov: assumed
 */
const TWA_SCAN_DEG = 6;

/**
 * Map an ORC flat value onto the backstay control so the rig responds.
 * Deliberately one function of flat for both sailsets — the jib floor stays
 * the denominator, so under the kite (floor 0.53) the map simply stops short
 * of 100 rather than re-scaling the rig's response to the sail carried.
 * prov: assumed
 */
export function backstayFromFlat(flat: number): number {
  const fmin = flatMin();
  return Math.round(((1 - flat) / (1 - fmin)) * 100);
}

export interface OptimalOptions {
  optimiseTwa: boolean;
  race?: RaceControls;
  /**
   * Golden-section budgets. Omitted means the accurate defaults above; dock
   * scoring passes a coarser pair because it runs hundreds of these per
   * screen (see `core/solve/dock`). Explicit numbers, not a `coarse` flag, so
   * the accuracy test can sweep them.
   */
  iters?: { flat: number; twa: number };
}

export function optimal(
  boat: BoatDefinition,
  dock: DockControls,
  condition: Condition,
  opts: OptimalOptions,
  geom: Record<SailId, AeroGeometry> = geometryFor(boat),
): OptimalResult {
  // "Race controls held at the guide base" — and under the kite the guide's
  // base is the eased main, not a beat's mainsheet. Same datum the shape
  // deltas are measured against (`shape/base.ts`), so a downwind VPP row sits
  // at zero shape deviation instead of carrying the whole ease as one.
  const baseRaceCtl =
    opts.race ?? (condition.sailset === 'asym' ? baseRaceDown(boat) : baseRace(boat));
  const flatIters = opts.iters?.flat ?? FLAT_ITERS;
  // Reef shares flat's budget: it is the same search on the same kind of
  // parameter, and a caller that asked for a coarse flat wants a coarse reef.
  const reefIters = opts.iters?.flat ?? REEF_ITERS;
  const twaIters = opts.iters?.twa ?? TWA_ITERS;
  const upwind = Math.abs(condition.twaDeg) < 90; // prov: assumed, upwind/downwind split at 90° TWA

  const solveAt = (twaDeg: number, flat: number, reef?: number) => {
    const race = { ...baseRaceCtl, backstay: backstayFromFlat(flat) };
    const r = trimmed(boat, { dock, race }, { ...condition, twaDeg }, geom, flat, reef);
    return { r, race };
  };

  const scoreAt = (twaDeg: number, flat: number, reef?: number) => {
    const { r } = solveAt(twaDeg, flat, reef);
    if (!r.converged) return -1e3; // non-converged states lose the search
    const v = r.bsKt.value;
    // At a fixed angle the argmax of VMG is the argmax of boat speed, and
    // at 90° cos is ~0 so VMG would be a degenerate objective.
    if (!opts.optimiseTwa) return v;
    const vmg = v * Math.cos((twaDeg * Math.PI) / 180);
    return upwind ? vmg : -vmg;
  };

  const bestFlatAt = (twaDeg: number) => {
    // The search bracket is the sailset's own ORC floor: under the kite that
    // is 0.53, so the optimiser cannot pick a de-power the VPP forbids.
    const fmin = flatMin(1, condition.sailset);
    const g = goldenMax((f) => scoreAt(twaDeg, f), fmin, 1, flatIters);
    // Stage two (ORC §5.1.3): flat has floored and the boat is still overpowered,
    // so now the sail area comes off. Anywhere else this branch never runs.
    const noReef = { flat: g.x, score: g.fx, reef: undefined };
    if (g.x > fmin + FLAT_FLOOR_FRAC * (1 - fmin)) return noReef;
    const rg = goldenMax((rf) => scoreAt(twaDeg, fmin, rf), REEF_MIN, 1, reefIters);
    // A reef that does not pay is a reef ORC would not take.
    return rg.fx > g.fx ? { flat: fmin, score: rg.fx, reef: rg.x } : noReef;
  };

  let twaDeg = Math.abs(condition.twaDeg);
  if (opts.optimiseTwa) {
    const [a, b] = upwind ? TWA_UP : TWA_DN;
    const refine = (lo: number, hi: number) =>
      goldenMax((t) => bestFlatAt(t).score, lo, hi, twaIters).x;
    if (upwind) {
      // Upwind VMG has one hump; golden section over the whole bracket is right
      // and this path is unchanged, so the jib golden corpus does not move.
      twaDeg = refine(a, b);
    } else {
      // Pick the hump first (see TWA_SCAN_DEG). The scan runs at full power
      // rather than re-optimising flat at every sample: it only has to rank the
      // humps, and the refine below uses the real objective. That keeps the
      // extra cost at ~11 equilibria instead of ~11 × flatIters, which matters
      // because dock scoring runs hundreds of these per screen.
      const n = Math.max(1, Math.round((b - a) / TWA_SCAN_DEG));
      let bestT = a;
      let bestS = -Infinity;
      for (let i = 0; i <= n; i++) {
        const t = a + ((b - a) * i) / n;
        const s = scoreAt(t, 1);
        if (s > bestS) {
          bestS = s;
          bestT = t;
        }
      }
      const half = (b - a) / n;
      twaDeg = refine(Math.max(a, bestT - half), Math.min(b, bestT + half));
    }
  }
  const { flat, reef } = bestFlatAt(twaDeg);
  const { r, race } = solveAt(twaDeg, flat, reef);
  const sign = condition.twaDeg < 0 ? -1 : 1;
  return { ...r, twaDeg: twaDeg * sign, race };
}
