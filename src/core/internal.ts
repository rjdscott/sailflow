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

export const KT_TO_MS = 0.514444;
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
