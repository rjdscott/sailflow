/**
 * Race mode, best trim: a per-control optimum the UI can draw a tick on.
 *
 * `optimal.ts` optimises the single ORC `flat` parameter and returns the
 * guide base for the other ten controls, which is fine for a polar but is a
 * fabricated answer key if you put it on eleven sliders (audit M-09). This
 * file searches the controls themselves: deterministic coordinate descent,
 * one legal step at a time, through `trimmed` — so the optimum it reports is
 * exactly the state the Race screen would solve if you moved the sliders
 * there yourself.
 *
 * Deterministic: fixed control order, fixed sweep budget, no Math.random, no
 * Date, no state carried between calls.
 *
 * ponytail: one step per control per sweep, no line search. Total travel is
 * therefore bounded by `sweeps` steps per control; raise `sweeps` if the UI
 * needs an optimum farther from the starting trim than that. The result is a
 * local optimum on the control grid, not a global one, and it is idempotent
 * only when the descent stopped on its own (a sweep that moved nothing)
 * rather than by exhausting the budget.
 */
import type {
  BoatDefinition,
  Condition,
  ControlSpec,
  ControlState,
  OptimalTrimResult,
  RaceControls,
  SailId,
  SolveResult,
} from '../types';
import type { AeroGeometry } from '../aero/orc/forces';
import { geometryFor } from './equilibrium';
import { trimmed } from './trimmed';

/**
 * The race controls that actually change a solve, in descent order.
 *
 * Everything downstream of the shape layer reads exactly two numbers out of
 * it — mean section draft and half-height twist (`shape/toOrc.ts`,
 * `meanDraft`/`meanTwist`) — plus the reef corner. So a control earns a place
 * here only if it moves draft or twist:
 *
 *   backstay    mast bend -> main draft and main twist, forestay sag -> jib
 *               draft (`shape/flying.ts` mainShape/jibShape via rig.sagMm)
 *   mainsheet   main twist (`shape/flying.ts` sheetToTwist)
 *   traveller   main twist, small (`shape/flying.ts` travToTwist)
 *   vang        main twist (`shape/flying.ts` vangToTwist)
 *   outhaul     main lower-section draft (`shape/flying.ts` outhaulToDraft)
 *   cunningham  reef only, and only at the everything-on corner where
 *               cunningham and backstay are both at their stops
 *               (`shape/toOrc.ts`, `maxed`); its draft-position effect is
 *               drawing-only
 *   jibSheet    jib twist (`shape/flying.ts` jibSheetToTwist)
 *   jibLead     jib twist and foot draft (`shape/flying.ts` leadToTwist,
 *               leadToFootDraft)
 *
 * Deliberately absent, because `shape/toOrc.ts` never reads what they move:
 * `mainHalyard` and `jibHalyard` (draft *position* only) and `inhauler`
 * (entry angle only). Those three change the drawn sail section and nothing
 * else, so they get no tick.
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
] as const;

export type TrimControl = (typeof TRIM_CONTROLS)[number];

export interface OptimalTrimOptions {
  /** Max coordinate sweeps. Default `SWEEPS`. */
  sweeps?: number;
  /** Objective gain (kt) below which a move is solver noise. prov: assumed. */
  epsilon?: number;
}

/**
 * prov: assumed sweep budget. Measured (desktop, 2026-08-25): a descent from
 * a badly mis-trimmed 10 kt beat needs ~10 sweeps to reach the same VMG as
 * the guide base; 6 sweeps leaves it ~0.13 kt short. 12 costs ~140–190
 * `trimmed` calls, ~20 ms, which is ~1/50th of the phase's 1.5 s phone budget.
 * The search stops early the moment a sweep moves nothing, so a trim already
 * near its optimum costs one sweep.
 */
const SWEEPS = 12; // prov: assumed, sweep budget (measured, see above)
const EPS_KT = 1e-4; // prov: assumed, below Newton's own convergence noise
const LOST = -1e3; // a non-converged state loses the search, as in optimal.ts

/** Nearest legal value on a control's min/max/step grid. */
export function snap(spec: ControlSpec, v: number): number {
  const stepped = spec.min + Math.round((v - spec.min) / spec.step) * spec.step;
  // Rounding kills the float dust that `min + n*step` leaves on e.g. step 0.5.
  return Math.min(spec.max, Math.max(spec.min, Number(stepped.toFixed(6))));
}

export function optimalTrim(
  boat: BoatDefinition,
  controls: ControlState,
  condition: Condition,
  opts: OptimalTrimOptions = {},
  geom: Record<SailId, AeroGeometry> = geometryFor(boat),
): OptimalTrimResult {
  const sweeps = opts.sweeps ?? SWEEPS;
  const eps = opts.epsilon ?? EPS_KT;
  const twa = Math.abs(condition.twaDeg);
  const upwind = twa < 90 && condition.sailset === 'jib'; // prov: assumed, upwind/downwind split at 90° TWA
  const downwind = twa >= 90 && condition.sailset === 'asym';

  // Under the kite the jib carries no shape, so its controls cannot move the
  // solve and must not be reported as moved.
  const active = TRIM_CONTROLS.filter((c) => condition.sailset === 'jib' || !c.startsWith('jib'));

  const race = { ...controls.race };
  for (const c of active) race[c] = snap(boat.controls[c], race[c]);
  const start = { ...race };

  let iters = 0;
  const solve = (r: RaceControls) => {
    iters++;
    return trimmed(boat, { ...controls, race: r }, condition, geom);
  };
  /** Upwind: VMG. Downwind under the kite: −VMG. Reaches: boat speed. */
  const score = (r: SolveResult) => {
    if (!r.converged) return LOST;
    if (upwind) return r.vmgKt.value;
    if (downwind) return -r.vmgKt.value;
    return r.bsKt.value;
  };

  let best = solve(race);
  let bestScore = score(best);

  for (let s = 0; s < sweeps; s++) {
    let anyMove = false;
    for (const c of active) {
      const spec = boat.controls[c];
      for (const dir of [1, -1]) {
        const v = snap(spec, race[c] + dir * spec.step);
        if (v === race[c]) continue; // at a stop in this direction
        const r = solve({ ...race, [c]: v });
        const sc = score(r);
        if (sc > bestScore + eps) {
          race[c] = v;
          best = r;
          bestScore = sc;
          anyMove = true;
          break; // one accepted step per control per sweep
        }
      }
    }
    if (!anyMove) break;
  }

  return {
    race,
    result: best,
    moved: active.filter((c) => race[c] !== start[c]),
    iters,
  };
}
