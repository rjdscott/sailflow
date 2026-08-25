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
 * Multi-start: the descent runs once per seed and the best result wins
 * (default seeds: the trim passed in, then `baseRace()`). One descent is
 * path-dependent — same condition, same rig, three starting trims, three
 * different answer keys (audit ux-02 H-07) — and the ticks prescribe
 * positions, so the positions cannot depend on the order the sliders were
 * touched. Two seeds does not make it global; it makes it reproducible from
 * the two places the UI can actually be in, and it costs one extra descent.
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
import { baseRace } from '../shape/base';
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
 *
 * `mainsheet` is here but is dropped from the search under the kite; see
 * `notSolved` below.
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
  /**
   * Starting trims. One descent per seed, best score wins; ties go to the
   * earlier seed, so re-optimising an answer returns that answer. Default:
   * the trim passed in, then `baseRace()`. Only the controls the search moves
   * are taken from a seed — halyards and the inhauler stay where the sailor
   * left them, because a seed must not rewrite trim the model never reads.
   */
  seeds?: RaceControls[];
  /**
   * Controls the descent may not touch, held at their incoming value. Drills
   * need this: the answer key must be the best trim reachable with only the
   * drill's *free* controls, not the best trim of a boat the learner is not
   * sailing (audit ux-02 H-01). Unknown names are ignored.
   */
  fixed?: readonly string[];
}

/**
 * prov: assumed sweep budget. Measured (desktop, 2026-08-25): a descent from
 * a badly mis-trimmed 10 kt beat needs ~10 sweeps to reach the same VMG as
 * the guide base; 6 sweeps leaves it ~0.13 kt short. 12 costs ~140–190
 * `trimmed` calls, ~20 ms, which is ~1/50th of the phase's 1.5 s phone budget.
 * The search stops early the moment a sweep moves nothing, so a trim already
 * near its optimum costs one sweep.
 */
const SWEEPS = 20; // prov: assumed, sweep budget (measured, see above)
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
  const held = new Set(opts.fixed ?? []);
  /**
   * Under the kite the mainsheet is a cue, not a solve, and the search says so
   * instead of handing back the trim it was given as if it were an answer.
   *
   * The sheet has two routes into a downwind solve, and neither is a boom
   * angle the descent can climb. `sheetingEffect`'s multiplier on the main's
   * CLmax is the direct one, and past ~150° AWA the ORC main makes almost no
   * lift for it to scale (research `2026-08-25-spinnaker` doc 01 §2.6: for a
   * sloop there is no downwind blanketing anywhere in the model, and the
   * deep-angle collapse lives in the coefficient tables); the stall-drag term
   * is switched off past 90° AWA on purpose, because past there drag is
   * drive. The other route is the shape layer — sheet ease opens the leech,
   * and `shape/toOrc.ts` scores that twist against the sail set's base trim.
   * So the descent has no boom-angle gradient worth the name out here — what
   * it actually climbs is leech twist, and it labels the result "mainsheet".
   * Measured (2026-08-25): from 165° out, and at 165°/20 kt, that handed back
   * mainsheet 100 with vang 100 — the boom pinned on the centreline on a dead
   * run — for 0.006 kt.
   *
   * The answer is a cue with provenance, not a number this model found:
   * `baseRaceDown.mainsheet`, eased until the boom is out past the corner of
   * the boat. It is not written into `race` — the reported `result` stays
   * exactly the solve at the reported `race` — so a caller draws no target
   * here and says the cue in words instead.
   */
  const notSolved = TRIM_CONTROLS.filter(
    (c) => condition.sailset === 'asym' && c === 'mainsheet' && !held.has(c),
  );
  const skip = new Set<string>(notSolved);
  const active = TRIM_CONTROLS.filter(
    (c) => (condition.sailset === 'jib' || !c.startsWith('jib')) && !held.has(c) && !skip.has(c),
  );

  const start = { ...controls.race };
  for (const c of active) start[c] = snap(boat.controls[c], start[c]);

  let iters = 0;
  const solve = (r: RaceControls) => {
    iters++;
    return trimmed(boat, { ...controls, race: r }, condition, geom);
  };
  /** Upwind: VMG. Downwind under the kite: −VMG. Reaches: boat speed. */
  const score = (r: SolveResult) => {
    const obj = upwind ? r.vmgKt.value : downwind ? -r.vmgKt.value : r.bsKt.value;
    // A non-converged state loses to any converged one, but still ranks
    // against other non-converged states so a flogging start can climb out.
    return r.converged ? obj : LOST + obj;
  };

  /** One coordinate descent, from `seed` on the active controls only. */
  const descend = (seed: RaceControls) => {
    const race = { ...controls.race };
    for (const c of active) race[c] = snap(boat.controls[c], seed[c]);

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
    return { race, result: best, score: bestScore };
  };

  const seeds = opts.seeds?.length ? opts.seeds : [controls.race, baseRace()];
  let won = descend(seeds[0]);
  // Strictly better, so an exact tie keeps the earlier seed and the search
  // stays idempotent on its own answer.
  for (let i = 1; i < seeds.length; i++) {
    const c = descend(seeds[i]);
    if (c.score > won.score) won = c;
  }

  return {
    race: won.race,
    result: won.result,
    // Measured against the trim on screen, not against the winning seed:
    // this is the list of things Apply would move.
    moved: active.filter((c) => won.race[c] !== start[c]),
    notSolved,
    iters,
  };
}
