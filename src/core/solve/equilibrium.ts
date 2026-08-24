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
import { G, knob, type OrcTune, type ShapeDeltas, type HydroState } from '../internal';
import { aeroForces, type AeroGeometry } from '../aero/orc/forces';
import { sailGeometry } from '../geometry/sailplan';
import { hydroForces } from '../hydro';
import { interp1, newton3 } from '../math';

export interface EquilibriumInput {
  condition: Condition;
  tune: OrcTune;
  deltas?: ShapeDeltas;
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
 * Crew hike in proportion to need: at 0° heel they sit inboard, at
 * `hydro.hikeRampDeg` and beyond they are fully (legally) hiked. Without this
 * the crew's righting moment exceeds the heeling moment in light air and no
 * equilibrium exists. prov: assumed ramp; the limit itself is rule-bound.
 */
export function hikeFraction(boat: BoatDefinition, heelDeg: number): number {
  const ramp = knob(boat, 'hydro.hikeRampDeg', 8);
  return Math.min(1, Math.max(0, heelDeg / ramp));
}

/** Fixed seed table: boat speed (kt) versus TWS for an upwind J/70. prov: ORC Speed Guide J/70 rounded */
const SEED_TWS = [4, 6, 8, 10, 12, 14, 16, 20, 25];
const SEED_BS_UP = [3.2, 4.6, 5.4, 5.9, 6.1, 6.2, 6.3, 6.4, 6.4];
const SEED_BS_DN = [3.0, 4.4, 5.3, 6.0, 6.6, 7.2, 8.0, 10.0, 11.0]; // prov: ORC Speed Guide J/70 rounded

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
  const sign = c.twaDeg < 0 ? -1 : 1;
  const weightN = boat.hull.dispKg * G;
  const scale: [number, number, number] = [weightN * 0.05, weightN * 0.05, weightN * 0.05]; // prov: assumed, residual normalisation ~5% of displacement weight so Newton's tolerance is unitless

  const evalState = (x: readonly number[]) => {
    const bs = Math.max(V_MIN_KT, x[0]);
    const heel = clamp(x[1], 0, HEEL_MAX_DEG);
    const leeway = clamp(x[2], 0, LEEWAY_MAX_DEG);
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

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function norm(r: readonly number[]): number {
  return Math.max(...r.map(Math.abs));
}
