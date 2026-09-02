/**
 * 3-DOF force and moment equilibrium: unknowns [boat speed, heel, leeway].
 *
 * Residuals (normalised by displacement weight so the tolerance is unitless):
 *   Fx: aero drive − hydro resistance
 *   Fy: aero side force − hydro side force
 *   Mx: aero heeling moment − righting moment
 *
 * Deterministic: seeds come from a fixed table, never from a previous call;
 * Newton runs a fixed budget and falls back to a second seed set.
 */
import type { AeroState, BoatDefinition, Condition, SailId } from '../types';
import {
  G,
  knob,
  type AeroInput,
  type OrcTune,
  type ShapeDeltas,
  type HydroState,
} from '../internal';
import { aeroForces, type AeroGeometry } from '../aero/orc/forces';
import { sailGeometry } from '../geometry/sailplan';
import { hydroForces } from '../hydro';
import { interp1, newton3 } from '../math';

export interface EquilibriumInput {
  condition: Condition;
  tune: OrcTune;
  deltas?: ShapeDeltas;
  sheeting?: AeroInput['sheeting'];
}

export interface Equilibrium {
  bsKt: number;
  heelDeg: number;
  leewayDeg: number;
  aero: AeroState;
  hydro: HydroState;
  residuals: [number, number, number];
  iters: number;
  converged: boolean;
}

const V_MIN_KT = 0.2; // prov: assumed, floor so the residual stays finite at rest
const HEEL_MAX_DEG = 45; // prov: assumed, beyond this the hull model is meaningless
const LEEWAY_MAX_DEG = 15; // prov: assumed
/**
 * Leeway is allowed slightly negative, and that is not a physical claim — it is
 * what keeps Newton differentiable through zero.
 *
 * A deep run needs almost no leeway: at TWA 168-180 the aero side force is
 * near zero, so the root sits within a fraction of a degree of the clamp, and
 * on a dead run it sits exactly on it. Clamped at 0 the residual is flat in
 * leeway on one whole side of the root, the Jacobian column goes singular, and
 * Newton stalls with `converged: false` while `optimal()` hands the stalled
 * state back as an answer. That produced a band of unconverged, 5 %-too-fast
 * rows around TWA 168-170 at TWS 16 and on every 180 deg row.
 *
 * The side-force model is linear and odd in leeway, so a small negative value
 * is perfectly well defined; -2 deg is far outside anything a real solve
 * settles at, and a converged answer at negative leeway would be a bug the
 * invariants would catch. prov: assumed (numerical guard, not physics).
 */
const LEEWAY_MIN_DEG = -2;

/**
 * Crew hike in proportion to need: at 0° heel they sit inboard, at
 * `hydro.hikeRampDeg` and beyond they are fully (legally) hiked. Without this
 * the crew's righting moment exceeds the heeling moment in light air and no
 * equilibrium exists.
 *
 * The ramp's *shape* is assumed — ORC does not publish one — but its endpoint
 * is not: "Sailing with the upwind sails the crew righting moment is only
 * applied in full once the heel angle exceeds 6 degrees" (ORC VPP
 * Documentation 2012 §4.4.3.3, the edition family behind the Speed Guide this
 * model is validated against). prov: ORC VPP 2012 §4.4.3.3 for the 6°;
 * linear below it is this app's assumption.
 */
export function hikeFraction(boat: BoatDefinition, heelDeg: number): number {
  const ramp = knob(boat, 'hydro.hikeRampDeg', 6);
  return Math.min(1, Math.max(0, heelDeg / ramp));
}

/**
 * Fixed seed table: boat speed (kt) versus TWS. Newton's *starting point*, not
 * an answer — the root it converges to is set by the residuals, not by where
 * the search began, and `validation/invariants.test.ts` asserts the solve is
 * seed-independent by replaying it.
 *
 * prov: class-independent. Read off the J/70's ORC Speed Guide and rounded,
 * but used here only as "a sport keelboat of this size does roughly this
 * speed" — any 6–8 m keelboat starts inside the basin of attraction from
 * these numbers. If a future class fails to converge from them, the fix is a
 * per-boat `solve.seedBs*` knob, not a second hard-coded table.
 */
// prov: class-independent Newton seeds, see the block comment above.
const SEED_TWS = [4, 6, 8, 10, 12, 14, 16, 20, 25];
// prov: class-independent Newton seeds, see the block comment above.
const SEED_BS_UP = [3.2, 4.6, 5.4, 5.9, 6.1, 6.2, 6.3, 6.4, 6.4];
// prov: class-independent Newton seeds, see the block comment above.
const SEED_BS_DN = [3.0, 4.4, 5.3, 6.0, 6.6, 7.2, 8.0, 10.0, 11.0];

export function seedFor(c: Condition): [number, number, number] {
  const up = Math.abs(c.twaDeg) < 90; // prov: assumed, upwind/downwind split at 90° TWA
  const bs = interp1(SEED_TWS, up ? SEED_BS_UP : SEED_BS_DN, c.twsKt);
  const heel = up ? Math.min(25, 4 + c.twsKt * 1.1) : Math.min(12, 2 + c.twsKt * 0.4);
  const leeway = up ? 4 : 1.5; // prov: assumed seed leeway guess, just a Newton starting point
  return [bs, heel * Math.sign(c.twaDeg || 1), leeway];
}

export function geometryFor(boat: BoatDefinition): Record<SailId, AeroGeometry> {
  const g = (s: SailId) => {
    const sg = sailGeometry(boat, s);
    return { areaM2: sg.areaM2, ceHeightM: sg.ceHeightM };
  };
  return { main: g('main'), jib: g('jib'), asym: g('asym') };
}

export function solveEquilibrium(
  boat: BoatDefinition,
  input: EquilibriumInput,
  geom: Record<SailId, AeroGeometry> = geometryFor(boat),
): Equilibrium {
  const c = input.condition;
  assertFiniteCondition(c);
  const sign = c.twaDeg < 0 ? -1 : 1;
  const weightN = boat.hull.dispKg * G;
  const scale: [number, number, number] = [weightN * 0.05, weightN * 0.05, weightN * 0.05]; // prov: assumed, residual normalisation ~5% of displacement weight so Newton's tolerance is unitless

  const evalState = (x: readonly number[]) => {
    const bs = Math.max(V_MIN_KT, x[0]);
    const heel = clamp(x[1], 0, HEEL_MAX_DEG);
    const leeway = clamp(x[2], LEEWAY_MIN_DEG, LEEWAY_MAX_DEG);
    const aero = aeroForces(
      boat,
      {
        twsKt: c.twsKt,
        twaDeg: Math.abs(c.twaDeg),
        bsKt: bs,
        heelDeg: heel,
        leewayDeg: leeway,
        sailset: c.sailset,
        tune: input.tune,
        deltas: input.deltas,
        sheeting: input.sheeting,
      },
      geom,
    );
    const hydro = hydroForces(boat, {
      bsKt: bs,
      heelDeg: heel,
      leewayDeg: leeway,
      seaState: c.seaState,
      crewKg: c.crewKg * hikeFraction(boat, heel),
    });
    return { bs, heel, leeway, aero, hydro };
  };

  const residual = (x: [number, number, number]): [number, number, number] => {
    const s = evalState(x);
    return [
      (s.aero.fxN - s.hydro.resistanceN) / scale[0],
      (s.aero.fyN - s.hydro.sideForceN) / scale[1],
      (s.aero.mxNm - s.hydro.rightingNm) / scale[2],
    ];
  };

  const seed = seedFor(c);
  const seeds: [number, number, number][] = [
    seed,
    [seed[0] * 0.7, seed[1] * 0.5, seed[2]],
    [seed[0] * 1.2, Math.min(HEEL_MAX_DEG, seed[1] * 1.5), seed[2] * 1.5],
  ];

  let best: ReturnType<typeof newton3> | null = null;
  let iters = 0;
  for (const s0 of seeds) {
    const r = newton3(residual, [s0[0], Math.abs(s0[1]), s0[2]], {
      tol: 1e-6,
      maxIter: 50, // prov: assumed, Newton iteration budget
      fdStep: [1e-3, 1e-3, 1e-3],
    });
    iters += r.iters;
    if (!best || norm(r.residual) < norm(best.residual)) best = r;
    if (r.converged) break;
  }
  if (!best) throw new Error('unreachable');

  const s = evalState(best.x);
  return {
    bsKt: s.bs,
    heelDeg: s.heel * sign,
    leewayDeg: s.leeway * sign,
    aero: s.aero,
    hydro: s.hydro,
    residuals: best.residual,
    iters,
    converged: best.converged,
  };
}

/**
 * Reject a non-finite condition up front instead of letting NaN reach the
 * residual, where Newton would bail on iteration 1 of every seed and the
 * caller would get the seed table value back with `converged: false` — a
 * silent wrong answer. Same contract as SciPy `root` / MATLAB `fsolve`:
 * bad inputs raise, they do not "not converge".
 */
function assertFiniteCondition(c: Condition): void {
  const bad = (['twsKt', 'twaDeg', 'seaState', 'crewKg'] as const).filter(
    (k) => !Number.isFinite(c[k]),
  );
  if (bad.length) throw new Error(`solveEquilibrium: non-finite condition ${bad.join(', ')}`);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function norm(r: readonly number[]): number {
  return Math.max(...r.map(Math.abs));
}
