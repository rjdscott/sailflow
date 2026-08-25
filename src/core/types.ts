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
  /** ORC certificate "RM measured", kg·m per degree of heel at small angles. */
  rmMeasuredKgMPerDeg?: number;
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
  /** The base race trim, read by `shape/base.ts` and by Race mode alike. */
  baseRace: RaceControls;
  /**
   * What changes about the base race trim once the kite is up: the overrides
   * that go on top of `baseRace`, not a second full trim. Currently one entry
   * — the mainsheet eased to the shroud — because that is the only control
   * whose upwind value draws an outright wrong picture downwind.
   */
  baseRaceDown: Partial<RaceControls> & { mainsheet: number };
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

/**
 * The four cues a crew watches, in the units they read them in
 * (`solve/instruments.ts`). Additive in protocol v1.
 */
export interface Instruments {
  /** Fraction of the main's leech ribbons stalled, 0..1. Tier C. */
  leechStallFrac: Tiered;
  /**
   * Where the jib leech crosses the spreader, as a continuous stripe index:
   * 0 = 18", 1 = 20", 2 = 22". Absent under the kite. Tier C.
   */
  jibLeechStripe?: Tiered;
  /** Weather-helm proxy, + = weather, 1.0 ≈ firm. Tier C. */
  helmLoad: Tiered;
  /** Boat speed as a percentage of the reference polar's target. */
  pctPolar: Tiered;
}

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
  instruments: Instruments;
  /** Normalised residuals [Fx, Fy, Mx] at the returned state. */
  residuals: [number, number, number];
}

/** Result of VPP mode: race controls optimised, optionally TWA too. */
export interface OptimalResult extends SolveResult {
  twaDeg: number;
  race: RaceControls;
}

/**
 * Result of the per-control trim search (`solve/optimalTrim.ts`): the best
 * legal trim reachable from a starting state, and the solve at it.
 */
export interface OptimalTrimResult {
  race: RaceControls;
  result: SolveResult;
  /** Race controls whose value changed, in `TRIM_CONTROLS` order. */
  moved: string[];
  /**
   * Race controls the search deliberately did not solve, in `TRIM_CONTROLS`
   * order. Their value in `race` is the incoming one, untouched — it is not an
   * answer, and a caller must not draw it as a target. See `optimalTrim`.
   */
  notSolved: string[];
  /** `trimmed()` evaluations spent — the cost measure for the UI's budget. */
  iters: number;
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
