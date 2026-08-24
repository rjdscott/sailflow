/**
 * Public types for the physics core. Pure data, JSON-safe, no DOM.
 *
 * Everything the UI and the worker exchange is expressed here. Keep this file
 * the single source of truth: a Rust port (Epic 3) mirrors it 1:1.
 */

// ---------------------------------------------------------------------------
// Confidence tiers (ADR 0006)
// ---------------------------------------------------------------------------

/** A = number you may quote. B = direction + band. C = direction only. */
export type Tier = 'A' | 'B' | 'C';

export interface Tiered {
  value: number;
  tier: Tier;
  /** Present for tier B: [low, high] band around value. */
  band?: [number, number];
  /** Present for tier C: sign of the effect relative to the reference state. */
  sign?: -1 | 0 | 1;
}

// ---------------------------------------------------------------------------
// Boat definition (one JSON per class: data/boats/<id>.json)
// ---------------------------------------------------------------------------

export type ControlMode = 'dock' | 'race' | 'down';

export interface ControlSpec {
  mode: ControlMode;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  purchaseMin?: number;
  purchaseMax?: number;
}

export type ProvenanceKind = 'published' | 'measured' | 'derived' | 'assumed';

export interface ProvenanceEntry {
  source: string;
  kind: ProvenanceKind;
  note?: string;
}

export interface SourceRef {
  title: string;
  url: string;
  retrieved: string;
  edition?: string;
}

export interface HullDef {
  loaM: number;
  lwlM: number;
  beamM: number;
  bwlM: number;
  draftM: number;
  dispKg: number;
  minDryWeightKg: number;
  wettedM2: number;
  keelAreaM2: number;
  keelSpanM: number;
  /** Vertical centre of gravity above keel bottom, m. */
  kgM: number;
  /** Metacentric height, m. */
  gmM: number;
}

export interface RigDef {
  iM: number;
  jM: number;
  pM: number;
  eM: number;
  mastLenM: number;
  spreaderZM: number;
  spreaderLenM: number;
  sweepDeg: number;
  chainplateYM: number;
  boomOuterMm: number;
  bowspritOuterMm: number;
  wire: string;
  backstay: string;
}

export type SailId = 'main' | 'jib' | 'asym';

export interface SailDef {
  ratedAreaM2: number;
  /** ORC VPP Documentation 2023 coefficient table this sail uses. */
  orcTable: '5.1' | '5.4' | '5.6' | '5.7' | '5.8';
  [dimension: string]: number | string;
}

export interface CrewDef {
  minKg: number;
  maxKg: number;
  minCount: number;
  maxLegsOut: number;
  hikingRule: string;
}

export interface BoatDefinition {
  schemaVersion: 1;
  id: string;
  name: string;
  hull: HullDef;
  rig: RigDef;
  sails: Record<SailId, SailDef>;
  crew: CrewDef;
  controls: Record<string, ControlSpec>;
  /** Every fitted free parameter, flat namespace, e.g. "hydro.rrMul.fn30". */
  calibration: Record<string, number>;
  provenance: Record<string, ProvenanceEntry>;
  sources: Record<string, SourceRef>;
}

// ---------------------------------------------------------------------------
// Control state. Dock and race are separate types on purpose (rule C.9.5):
// race-mode code cannot touch dock controls.
// ---------------------------------------------------------------------------

export interface DockControls {
  /** Turns on upper shroud turnbuckles relative to guide base. */
  upperTurns: number;
  lowerTurns: number;
  /** Forestay length change from base, mm. Rake and prebend are derived. */
  forestayMm: number;
}

export interface RaceControls {
  backstay: number;
  mainsheet: number;
  traveller: number;
  cunningham: number;
  outhaul: number;
  vang: number;
  jibSheet: number;
  jibLead: number;
  inhauler: number;
  mainHalyard: number;
  jibHalyard: number;
}

export interface DownControls {
  kiteHalyard: number;
  tackLine: number;
  kiteSheet: number;
  sprit: number;
}

export interface ControlState {
  dock: DockControls;
  race: RaceControls;
  down?: DownControls;
}

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

/** 0 flat, 1 ripple, 2 chop, 3 short steep chop, 4 waves. */
export type SeaState = 0 | 1 | 2 | 3 | 4;

export type SailSet = 'jib' | 'asym';

export interface Condition {
  twsKt: number;
  /** True wind angle, degrees, 0 = head to wind. Positive = starboard tack. */
  twaDeg: number;
  seaState: SeaState;
  crewKg: number;
  sailset: SailSet;
}

/** A forecast for a race day: triangular distribution over TWS. */
export interface Forecast {
  minKt: number;
  likelyKt: number;
  maxKt: number;
  seaState: SeaState;
  crewKg: number;
}

// ---------------------------------------------------------------------------
// Intermediate physical state, exposed for drawing
// ---------------------------------------------------------------------------

export interface RigState {
  /** Fore-aft mast bend at 11 stations from partners to tip, mm. */
  bendMm: number[];
  sagMm: number;
  rakeMm: number;
  prebendMm: number;
  forestayN: number;
  upperN: number;
  lowerN: number;
}

/** Flying shape at one height, fractions of chord and degrees. */
export interface SectionShape {
  draft: number;
  draftPos: number;
  twistDeg: number;
  entryDeg: number;
  exitDeg: number;
}

export interface SailShape {
  quarter: SectionShape;
  half: SectionShape;
  threeQuarter: SectionShape;
}

export interface AeroState {
  flat: number;
  reef: number;
  twistEff: number;
  awaDeg: number;
  awsKt: number;
  fxN: number;
  fyN: number;
  mxNm: number;
  ceHeightM: number;
}

// ---------------------------------------------------------------------------
// Solver output
// ---------------------------------------------------------------------------

export interface SolveResult {
  converged: boolean;
  iters: number;
  bsKt: Tiered;
  vmgKt: Tiered;
  heelDeg: Tiered;
  leewayDeg: Tiered;
  aero: AeroState;
  rig: RigState;
  shape: Partial<Record<SailId, SailShape>>;
  /** Normalised residuals [Fx, Fy, Mx] at the returned state. */
  residuals: [number, number, number];
}

/** Result of VPP mode: race controls optimised, optionally TWA too. */
export interface OptimalResult extends SolveResult {
  twaDeg: number;
  race: RaceControls;
}

export interface DockRegret {
  twsKt: number;
  /** Seconds per mile of windward-leeward lost to the locked rig. */
  regretSPerMile: number;
  optimum: DockControls;
}

export interface DockScore {
  setup: DockControls;
  expectedRegretSPerMile: Tiered;
  atMin: DockRegret;
  atMax: DockRegret;
  worst: DockRegret;
  perTws: DockRegret[];
}
