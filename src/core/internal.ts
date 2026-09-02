/**
 * Internal contracts between core modules. Each module implements exactly
 * these signatures so they can be built and tested independently.
 * All functions are pure and deterministic. Units: SI internally
 * (N, N·m, m, m/s, radians only inside functions; degrees and knots at the
 * boundaries as named).
 */
import type {
  AeroState,
  BoatDefinition,
  DockControls,
  RaceControls,
  RigState,
  SailId,
  SailSet,
  SailShape,
  SeaState,
} from './types';

export const KT_TO_MS = 0.514444; // prov: derived, 1 international nautical mile (1852 m) / 3600 s
export const RHO_AIR = 1.225; // kg/m³ prov: ISA sea level
export const RHO_WATER = 1025; // kg/m³ prov: seawater
export const G = 9.80665; // m/s² prov: standard gravity
export const NU_WATER = 1.19e-6; // m²/s prov: seawater 15 °C

// ---------------------------------------------------------------------------
// geometry/sailplan.ts
// ---------------------------------------------------------------------------

export interface SailGeometry {
  /** Reference area used by the aero model, m². */
  areaM2: number;
  /** Centre of effort height above the waterline, m (upright). */
  ceHeightM: number;
  /** Luff/span length, m. */
  spanM: number;
  /** Chord at fractional height h in [0,1], m. */
  chordAt(h: number): number;
}

export type SailGeometryFn = (boat: BoatDefinition, sail: SailId) => SailGeometry;

// ---------------------------------------------------------------------------
// rig/state.ts
// ---------------------------------------------------------------------------

/** Dock controls plus backstay (0–100 %) produce the rig state. */
export type RigStateFn = (
  boat: BoatDefinition,
  dock: DockControls,
  backstayPct: number,
) => RigState;

// ---------------------------------------------------------------------------
// shape/flying.ts and shape/toOrc.ts
// ---------------------------------------------------------------------------

export type FlyingShapeFn = (
  boat: BoatDefinition,
  rig: RigState,
  race: RaceControls,
  sail: SailId,
) => SailShape;

/** Deltas applied on top of the ORC coefficient model (aero/shape). */
export interface ShapeDeltas {
  /** Additive change to CLmax at the sailset level, e.g. −0.05. */
  dCLmax: number;
  /** Additive change to CD0 (parasitic drag coefficient). */
  dCD0: number;
  /** Fractional change to CE height, e.g. −0.03 for a lower CE. */
  dCEh: number;
  /** Additive change to effective twist, degrees. */
  dTwistDeg: number;
}

export interface OrcTune {
  /** ORC flat parameter in [flatMin, 1]. */
  flat: number;
  /** ORC reef parameter in [reefMin, 1]. */
  reef: number;
  /** Effective twist used by the twist function, degrees. */
  twistEffDeg: number;
}

export interface ShapeToOrcResult extends OrcTune {
  deltas: ShapeDeltas;
}

export type ShapeToOrcFn = (
  boat: BoatDefinition,
  shapes: Partial<Record<SailId, SailShape>>,
  race: RaceControls,
  sailset: SailSet,
  twsKt?: number,
) => ShapeToOrcResult;

// ---------------------------------------------------------------------------
// aero/orc/forces.ts
// ---------------------------------------------------------------------------

export interface AeroInput {
  twsKt: number;
  twaDeg: number;
  bsKt: number;
  heelDeg: number;
  leewayDeg: number;
  sailset: SailSet;
  tune: OrcTune;
  /** Optional shape-layer deltas; zero when absent. */
  deltas?: ShapeDeltas;
  /** Race mode only: per-sail sheeting angle + twist. Absent = ideal trim (VPP). */
  sheeting?: Partial<Record<SailId, { sheetDeg: number; twistDeg: number }>>;
}

/**
 * Returns forces in the boat's course frame (heeled): fxN along the course
 * (positive = drive), fyN athwartships (positive = to leeward), mxNm heeling
 * moment about the waterline (positive = heeling).
 */
export type AeroForcesFn = (boat: BoatDefinition, input: AeroInput) => AeroState;

// ---------------------------------------------------------------------------
// hydro/index.ts
// ---------------------------------------------------------------------------

export interface HydroInput {
  bsKt: number;
  heelDeg: number;
  leewayDeg: number;
  seaState: SeaState;
  crewKg: number;
}

export interface HydroState {
  /** Total resistance along the course, N (positive = opposing drive). */
  resistanceN: number;
  /** Hydrodynamic side force from keel + hull, N (positive = to windward, opposing aero fy). */
  sideForceN: number;
  /** Righting moment, N·m (positive = righting). */
  rightingNm: number;
  /** Breakdown for the report. */
  parts: {
    viscousN: number;
    residuaryN: number;
    inducedN: number;
    heelN: number;
    wavesN: number;
    hullRmNm: number;
    crewRmNm: number;
  };
}

export type HydroForcesFn = (boat: BoatDefinition, input: HydroInput) => HydroState;

// ---------------------------------------------------------------------------
// Calibration knob access. Every fitted parameter is read through this so
// the calibration block is the single source of truth.
// ---------------------------------------------------------------------------

export function knob(boat: BoatDefinition, name: string, fallback: number): number {
  const v = boat.calibration[name];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

// ---------------------------------------------------------------------------
// The two ORC vertical datums. Both are certificate quantities, and every
// sail-plan height in the model is measured from them, so they live here
// rather than in whichever module happened to need one first.
// ---------------------------------------------------------------------------

/**
 * ORC HBI, m: the height of the sheer at the base of I, above the water plane
 * (ORC VPP 2023, Appendix A, .DAT line 4: "SFBI ... is used to locate the mast
 * to get HBI (Height of sheer at the Base of I)"). It is a freeboard, not a
 * rig dimension, and it is the datum ORC measures the sail plan from —
 * eq (5.57)'s heeling arm is HBI + ZCE·REEF.
 */
export function hbiM(boat: BoatDefinition): number {
  // The certificate wins where there is one. Only a class whose freeboards
  // have not been transcribed falls through to the knob, and for that class
  // `calibration/fit.ts` still fits it — removing the knob everywhere would
  // have taken a degree of freedom away from a boat that has nothing
  // published to replace it (ADR 0024).
  return boat.hull.hbiM ?? knob(boat, 'aero.hbiM', HBI_DEFAULT_M);
}

/**
 * The same datum, but never the fitted knob: what `geometry/sailplan.ts`
 * measures the tacks from.
 *
 * The knob's real job is ORC eq (5.45)'s effective rig height, `cheff·(b+HBI)`
 * — that is what it was buying when it pinned at its bound for three rounds
 * (ADR 0024). Letting a *rig-height* fit also set the boat's freeboard put the
 * Melges 24's boom 2.2 m above the water, which no Melges 24 has. So the sail
 * plan reads the published or default freeboard and the fit cannot move it.
 */
export function hbiDatumM(boat: BoatDefinition): number {
  return boat.hull.hbiM ?? HBI_DEFAULT_M;
}

/** prov: assumed. Starting freeboard at the mast for a sportboat this size. */
const HBI_DEFAULT_M = 0.75;

/**
 * ORC BAS, m: the boom above the sheer, i.e. the gooseneck height on which the
 * whole mainsail sits. ORC prints it on the certificate (RIG: BAS).
 */
export function basM(boat: BoatDefinition): number {
  // prov: assumed. Same rule as `hbiM`: the certificate wins where there is
  // one, and 0.8 m is a typical sportboat gooseneck height above the sheer.
  return boat.rig.basM ?? knob(boat, 'aero.basM', 0.8);
}
