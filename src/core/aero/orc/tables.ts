/**
 * ORC VPP aerodynamic coefficient tables, transcribed verbatim.
 *
 * Source: ORC VPP Documentation 2023,
 * https://orc.org/uploads/files/ORC-VPP-Documentation-2023.pdf
 *
 * Every literal in this file is a cell of a published table or a constant
 * stated in the running text; each carries a `prov:` tag naming the table or
 * equation number. Nothing here is invented. Anything invented lives in
 * `../shape/sensitivity.ts` and says so in its header.
 *
 * Units: apparent wind angle (AWA, ORC calls it `beta`) in degrees; all
 * coefficients dimensionless and referred to rated (cloth) sail area.
 */

/** Coefficient set selector. prov: ORC VPP 2023 §5.1.2, Tables 5.2 / 5.5 */
export const SET_LOW = 0;
export const SET_MEDIUM = 1;
export const SET_HIGH = 2;
export type CoeffSet = 0 | 1 | 2;

export interface CoeffTable {
  /** Apparent wind angles the rows are tabulated at, degrees. */
  awaDeg: readonly number[];
  /** Parasitic (viscous) drag coefficient, low-adjustability set. */
  cdLow: readonly number[];
  /** Maximum lift coefficient, low-adjustability set. */
  clLow: readonly number[];
  cdHigh: readonly number[];
  clHigh: readonly number[];
  /** Two-dimensional quadratic viscous drag coefficient (kpm / kpj / kpasc). */
  kp: number;
}

// ---------------------------------------------------------------------------
// Table 5.1 — Mainsail force coefficients
// prov: ORC VPP 2023 Table 5.1 (kpmm 0.01379; rows cdnc/clnc = low set,
// cdyc/clyc = high set). Transcribed cell for cell.
// ---------------------------------------------------------------------------
export const MAIN_TABLE: CoeffTable = {
  awaDeg: [0, 7, 9, 12, 28, 60, 90, 120, 150, 180], // prov: ORC VPP 2023 Table 5.1, awa row
  cdLow: [0.0431, 0.02586, 0.02328, 0.02328, 0.03259, 0.11302, 0.3825, 0.96888, 1.31578, 1.34483], // prov: ORC VPP 2023 Table 5.1, cdnc row
  clLow: [0.0, 0.86207, 1.05172, 1.16379, 1.34698, 1.35345, 1.26724, 0.93103, 0.38793, -0.11207], // prov: ORC VPP 2023 Table 5.1, clnc row
  cdHigh: [0.03448, 0.01724, 0.01466, 0.01466, 0.02586, 0.11302, 0.3825, 0.96888, 1.31578, 1.34483], // prov: ORC VPP 2023 Table 5.1, cdyc row
  clHigh: [0.0, 0.94828, 1.13793, 1.25, 1.42681, 1.38319, 1.26724, 0.93103, 0.38793, -0.11207], // prov: ORC VPP 2023 Table 5.1, clyc row
  kp: 0.01379, // prov: ORC VPP 2023 Table 5.1, kpmm
};

// ---------------------------------------------------------------------------
// Table 5.4 — Genoa (jib) force coefficients
// prov: ORC VPP 2023 Table 5.4 (kpj 0.016). The drag rows cdjnb and cdjyb are
// identical in the published table; both are kept so the shape of the data
// matches the source rather than being "helpfully" deduplicated.
// ---------------------------------------------------------------------------
export const JIB_TABLE: CoeffTable = {
  awaDeg: [7, 15, 20, 27, 50, 60, 100, 150, 180], // prov: ORC VPP 2023 Table 5.4, awa row
  cdLow: [0.05, 0.032, 0.031, 0.037, 0.25, 0.35, 0.73, 0.95, 0.9], // prov: ORC VPP 2023 Table 5.4, cdjnb row
  clLow: [0.0, 1.0, 1.375, 1.45, 1.45, 1.25, 0.4, 0.0, -0.1], // prov: ORC VPP 2023 Table 5.4, cljnb row
  cdHigh: [0.05, 0.032, 0.031, 0.037, 0.25, 0.35, 0.73, 0.95, 0.9], // prov: ORC VPP 2023 Table 5.4, cdjyb row
  clHigh: [0.0, 1.1, 1.475, 1.5, 1.45, 1.25, 0.4, 0.0, -0.1], // prov: ORC VPP 2023 Table 5.4, cljyb row
  kp: 0.016, // prov: ORC VPP 2023 Table 5.4, kpj
};

// ---------------------------------------------------------------------------
// Table 5.7 — Asymmetric spinnaker tacked on centreline
// prov: ORC VPP 2023 Table 5.7 (kpasc 0.02648). This is the J/70 configuration
// (gennaker tacked to the bowsprit on the centreline), not Table 5.8 (asym on
// a pole). Table 5.8 shares kpasp = 0.02648 and the same values out to AWA 100;
// they diverge from 115 deg. Spinnakers have a single coefficient set, so low
// and high rows are the same data.
// ---------------------------------------------------------------------------
export const ASYM_TABLE: CoeffTable = {
  awaDeg: [28, 41, 50, 60, 67, 75, 100, 115, 130, 150, 170, 180], // prov: ORC VPP 2023 Table 5.7, awa row
  cdLow: [
    // prov: ORC VPP 2023 Table 5.7, cdasc row
    0.15405, 0.23925, 0.30877, 0.38852, 0.43624, 0.47713, 0.5453, 0.56574, 0.475, 0.352, 0.29,
    0.262,
  ],
  clLow: [0.01738, 0.69825, 0.89933, 1.04, 1.072, 1.075, 0.985, 0.805, 0.372, 0.1, 0.02, 0.0], // prov: ORC VPP 2023 Table 5.7, clasc row
  cdHigh: [
    // prov: ORC VPP 2023 Table 5.7, cdasc row (single coefficient set)
    0.15405, 0.23925, 0.30877, 0.38852, 0.43624, 0.47713, 0.5453, 0.56574, 0.475, 0.352, 0.29,
    0.262,
  ],
  clHigh: [0.01738, 0.69825, 0.89933, 1.04, 1.072, 1.075, 0.985, 0.805, 0.372, 0.1, 0.02, 0.0], // prov: ORC VPP 2023 Table 5.7, clasc row (single coefficient set)
  kp: 0.02648, // prov: ORC VPP 2023 Table 5.7, kpasc (== kpasp of Table 5.8)
};

/**
 * Table 5.8 kp, kept because the brief asked for it explicitly. Identical to
 * kpasc. prov: ORC VPP 2023 Table 5.8, kpasp
 */
export const KPASP = 0.02648;

export type OrcSail = 'main' | 'jib' | 'asym';

export const TABLES: Record<OrcSail, CoeffTable> = {
  main: MAIN_TABLE,
  jib: JIB_TABLE,
  asym: ASYM_TABLE,
};

// ---------------------------------------------------------------------------
// De-powering
// ---------------------------------------------------------------------------

/**
 * Baseline minimum flat. FlatMIN = 0.42 * Flat8, where Flat8 is the flat used
 * with jib upwind at TWS 8 kt / TWA 52 deg.
 * prov: ORC VPP 2023 §5.1.3 (reduced from 0.62 to 0.42 in 2023)
 */
export const FLAT_MIN_BASE = 0.42;

/**
 * Baseline minimum flat with a spinnaker or a headsail set flying. ORC raised
 * this floor to 0.53 in 2024, so it is the one constant in this file that does
 * NOT come from the 2023 edition: the 2023 text states only the 0.42 upwind
 * baseline and gives no separate offwind floor. Carried anyway, because 0.42
 * downwind lets the solver de-power past what ORC permits; the mixed edition
 * is recorded in PROVENANCE.md rather than hidden. Read against the 2026 text
 * in docs/research/2026-08-25-spinnaker/01-asymmetric-aerodynamics.md §2.4.
 * prov: ORC VPP Documentation 2026 §5.1, footnote 3 (changed in 2024)
 */
export const FLAT_MIN_SPINNAKER = 0.53;

/**
 * fcdmult: non-linear correction to the Cd-vs-Cl^2 de-powering line, indexed
 * by flat. Note the value at flat = 1.00 is 1.06, not 1.00 — the published
 * curve rises at both ends (full power and heavily de-powered).
 * prov: ORC VPP 2023 §5.4.3, table under Figure 5.15
 */
export const FCDMULT_FLAT: readonly number[] = [
  // prov: ORC VPP 2023 §5.4.3, table under Figure 5.15 (flat index row)
  0.1, 0.2, 0.3, 0.4, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0,
];
export const FCDMULT_VALUE: readonly number[] = [
  // prov: ORC VPP 2023 §5.4.3, table under Figure 5.15 (fcdmult row)
  1.06, 1.06, 1.06, 1.06, 1.06, 1.06, 1.055, 1.048, 1.035, 1.02, 1.008, 1.002, 1.0, 1.004, 1.06,
];

// ---------------------------------------------------------------------------
// Effective span / induced drag
// ---------------------------------------------------------------------------

/**
 * kheff: reduction of effective span as the sails are eased at wider apparent
 * wind angles. The doc gives this as Figure 5.14 (a curve) plus the sentence
 * "varies from 1.45 at 20 degrees to 0.80 as the apparent wind angle widens
 * from 20 to 80 degrees". Only the two endpoints are numerically stated, so
 * this is a straight line between them, held flat outside [20, 80].
 * SIMPLIFIED — the published figure is gently curved.
 * prov: ORC VPP 2023 §5.4.3, Figure 5.14 (1.45 value revised in 2023)
 */
export const KHEFF_AWA: readonly number[] = [20, 80];
export const KHEFF_VALUE: readonly number[] = [1.45, 0.8]; // prov: ORC VPP 2023 §5.4.3, Figure 5.14 endpoints

// ---------------------------------------------------------------------------
// Twist function
// ---------------------------------------------------------------------------

/**
 * ZCE = ZCE|flat=1 * [1 - 0.406*(1-flat) - 0.902*(1-flat)*(1-frac)]
 * prov: ORC VPP 2023 §5.4.4, eq (5.49) (CE lowering doubled in 2023)
 */
export const TWIST_K_FLAT = 0.406;
export const TWIST_K_FRAC = 0.902; // prov: ORC VPP 2023 §5.4.4, eq (5.49)

// ---------------------------------------------------------------------------
// Table 5.10 — Windage force model
// ---------------------------------------------------------------------------

/**
 * Drag coefficients from Table 5.10. `front` applies at AWA 0 (and 180, which
 * the doc says takes the headwind values), `side` at AWA 90.
 * prov: ORC VPP 2023 Table 5.10
 */
export const WINDAGE_CD = {
  hullFront: 0.816, // prov: ORC VPP 2023 Table 5.10, HULL front
  hullSide: 0.816, // prov: ORC VPP 2023 Table 5.10, HULL side
  mastSailFront: 0.4, // prov: ORC VPP 2023 Table 5.10, mast with mainsail set, AWA 0
  mastSailSide: 0.6, // prov: ORC VPP 2023 Table 5.10, mast with mainsail set, AWA 90
  mastBareFront: 0.8, // prov: ORC VPP 2023 Table 5.10, mast above the reefed portion, both angles
  mastBareSide: 0.8,
  rigging: 1.0, // prov: ORC VPP 2023 Table 5.10, round rigging; non-round would be 0.25
  crew: 1.08, // prov: ORC VPP 2023 Table 5.10, CREW
} as const;

/** Crew reference areas. prov: ORC VPP 2023 Table 5.10, CREW row */
export const CREW_AREF_FRONT_M2 = 0.25; // whole crew, in line, at AWA 0
export const CREW_AREF_SIDE_PER_HEAD_M2 = 0.5; // 0.5 * Mvblcrew at AWA 90
/** Crew CE height offset above HBI. prov: ORC VPP 2023 Table 5.10, CREW ZCE */
export const CREW_ZCE_OFFSET_M = 0.5;
/** Hull CE height factor. prov: ORC VPP 2023 Table 5.10, HULL ZCE 0.66(FBAV+B sin phi) */
export const HULL_ZCE_FACTOR = 0.66;
/** Spreader drag multiplier on the rigging wire. prov: ORC VPP 2023 §5.3.1, eq (5.33) */
export const SPREADER_FACTOR_WINDAGE = 0.2;
/**
 * Pre-2017 heeled hull side area growth term.
 * HSA = HSA0 + 0.75 * IMSB/2 * sin(phi) * LOA
 * prov: ORC VPP 2023 §5.3, eq (5.28). SIMPLIFIED — the current ORC formulation
 * (eq 5.29) needs the heeled average freeboard from a hull offset file, which
 * this project does not have, so the superseded closed form is used instead.
 */
export const HSA_HEEL_FACTOR = 0.75; // prov: ORC VPP 2023 §5.3, eq (5.28)

// ---------------------------------------------------------------------------
// Wind gradient
// ---------------------------------------------------------------------------

/** prov: ORC VPP 2023 §7.1, eq (7.1) */
export const WIND_Z_REF_M = 10.0;
/** prov: ORC VPP 2023 §7.1, eq (7.1) footnote (raised from 0.001 to 0.005 in 2022) */
export const WIND_Z0_M = 0.005;

// ---------------------------------------------------------------------------
// Effective span coefficient, eq (5.42)
// eff_span_corr = 1.1 + 0.08*(roach - 0.2)
//               + 0.5*(0.68 + 0.31*fractionality + 0.075*overlap - 1.1)
// prov: ORC VPP 2023 §5.4.3, eq (5.42)
// ---------------------------------------------------------------------------
export const EFF_SPAN = {
  base: 1.1, // prov: ORC VPP 2023 §5.4.3, eq (5.42)
  roachGain: 0.08, // prov: ORC VPP 2023 §5.4.3, eq (5.42)
  roachRef: 0.2, // prov: ORC VPP 2023 §5.4.3, eq (5.42)
  outerGain: 0.5,
  innerBase: 0.68, // prov: ORC VPP 2023 §5.4.3, eq (5.42)
  fracGain: 0.31, // prov: ORC VPP 2023 §5.4.3, eq (5.42)
  overlapGain: 0.075, // prov: ORC VPP 2023 §5.4.3, eq (5.42)
  innerRef: 1.1, // prov: ORC VPP 2023 §5.4.3, eq (5.42)
} as const;

/** Roach normalising constant. prov: ORC VPP 2023 §5.2.1, eq (5.3) */
export const ROACH_NORM = 0.844;

/**
 * Jib-twist CE reduction: Zce drops by up to 5% of IG as the jib foot is
 * reduced. prov: ORC VPP 2023 §5.4.2, eq (5.40)
 */
export const JIB_TWIST_CEH_FRACTION_OF_IG = 0.05;

/**
 * Mainsail CE constant: CEH = centroid + 0.024 * P.
 * prov: ORC VPP 2023 §5.2.1, eq (5.7)
 */
export const MAIN_CEH_CONST = 0.024;

/** Effective-height shape factor tf = 0.16 * Zm/P + 0.94. prov: ORC VPP 2023 §5.3 / eq (5.44) */
export const TF_GAIN = 0.16;
export const TF_BASE = 0.94;

/** Fractionality coefficient limits. prov: ORC VPP 2023 §5.2.1, eq (5.5) */
export const FCOEF = { period: 0.6, cap: 0.3 } as const;
