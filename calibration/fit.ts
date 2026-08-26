/**
 * Staged calibration of the J/70 free parameters (ADR 0007, split per ADR 0012).
 *
 * Run: `pnpm calibrate`. Writes the fitted values into the `calibration` block
 * of `data/boats/j70.json` and the full audit trail into
 * `calibration/residuals.json`. Nothing else is written; `validation/` only
 * ever reads.
 *
 * Four stages, each a Nelder-Mead search on log-normalised parameters with a
 * FIXED starting simplex (all-zero x0, uniform step), a FIXED restart count and
 * a FIXED iteration budget, so two runs on the same inputs give bit-identical
 * output. Values are carried between stages by freezing them into
 * `boat.calibration` in memory, which is the same object `knob()` reads, so a
 * frozen stage is simply part of the model for every later stage.
 *
 *   1. hydro, jib     formFactor, rrMul.fn20..fn60, planingRelief,
 *                     keelLiftSlope, heelDragK, aero.hbiM — against the jib
 *                     VMG row AND the 60/90/120 rows, which is what puts the
 *                     Fn 0.5-0.7 reaching regime in front of fn50/fn60
 *                     (ADR 0012; the first fit left them to the asym alone and
 *                     the reaching rows came out 7-15 % wrong)
 *   2. asym           aero.asymClMul + aero.asymCdMul — the two non-ORC aero
 *                     knobs, against the asymmetric VMG rows, over a
 *                     deterministic coarse grid before the simplex because the
 *                     downwind VMG optimum is bimodal (ADR 0018)
 *   3. righting       crewArmMul, refit on the high-wind heel rows only
 *   4. rig + shape    rig.EI/turnsToN/sagK, shape.bendToDraft/sagToDraft/
 *                     sheetToTwist, against the North guide's base settings
 *
 * Fit set (ADR 0012): every printed row at TWS 6, 10, 12, 16, 20. Every row at
 * TWS 8 and 14 is held out and never enters a loss here. Stage 4 sees only the
 * North 8-10 and 12-16 bands; the other bands and the whole Quantum guide are
 * held out.
 *
 * The rows, the sea state and the crew weight all come from
 * `validation/compare.ts`, and the model is evaluated through its `compareRow`,
 * so the fit and the gate cannot drift apart. That import is one-way:
 * `compare.ts` reads the boat and never writes it.
 *
 * Loss (stages 1-3), summed over the fit rows:
 *
 *   ((bs - bs_p)/bs_p)^2 + w_twa*((twa - twa_p)/10)^2 + w_heel*((heel - heel_p)/10)^2
 *
 * Weights: boat speed is what the ADR gates hardest on (3 %), so it carries
 * weight 1 as a *relative* error. The angle and heel terms are scaled by 10 deg
 * so a 10-degree miss costs the same as a 100 % speed miss before weighting.
 * w_twa = 0.15 makes a 2 deg angle miss (the VMG-row tolerance) worth about an
 * 8 % speed miss, which is roughly how the two tolerances rank in practice; on
 * fixed-angle rows the term is identically zero because the angle is an input.
 * w_heel = 0.02 keeps heel the weakest term in stages 1-2: the polar's heel
 * column is the output of a stability model we cannot reproduce (ADR 0007 notes
 * the 2011-vs-2023 gap) and letting it drive the resistance fit would trade a
 * gated quantity for an ungated one. Stage 3 exists to give heel its own pass,
 * and there w_heel = 1.0.
 */
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { format, resolveConfig } from 'prettier';
import northData from '../data/tuning/north-j70.json';
import type { Comparison, Polar, PolarRow } from '../validation/compare';
import {
  angleRows,
  boat,
  compareRow,
  HELD_OUT_TWS,
  loadPolar,
  POLAR_CREW_KG,
  POLAR_SEA_STATE,
  vmgRows,
} from '../validation/compare';
import type { Condition, DockControls } from '../src/core/types';
import { nelderMead } from '../src/core/math/nelderMead';
import { baseRace } from '../src/core/shape/base';
import { rigState } from '../src/core/rig/state';
import { flyingShape } from '../src/core/shape/flying';
import { geometryFor } from '../src/core/solve/equilibrium';
import { optimal } from '../src/core/solve/optimal';

// ---------------------------------------------------------------------------
// Log-normalised parameters
// ---------------------------------------------------------------------------

export interface KnobSpec {
  name: string;
  /** Value the optimiser starts from; x = 0 maps here. */
  start: number;
  min: number;
  max: number;
}

/** Parameter value -> optimiser coordinate. */
export function toX(spec: KnobSpec, value: number): number {
  return Math.log(value / spec.start);
}

/** Optimiser coordinate -> parameter value, clamped into the knob's bounds. */
export function fromX(spec: KnobSpec, x: number): number {
  return Math.min(spec.max, Math.max(spec.min, spec.start * Math.exp(x)));
}

// ---------------------------------------------------------------------------
// Loss
// ---------------------------------------------------------------------------

export interface FitPoint {
  twsKt: number;
  bsKt: number;
  twaDeg: number;
  heelDeg: number;
}

export interface LossWeights {
  twa: number;
  heel: number;
}

export interface PointResidual extends FitPoint {
  label: string;
  target: FitPoint;
  dBsPct: number;
  dTwaDeg: number;
  dHeelDeg: number;
  loss: number;
}

export function pointResidual(
  model: FitPoint,
  target: FitPoint,
  w: LossWeights,
  label = '',
): PointResidual {
  const dBs = (model.bsKt - target.bsKt) / target.bsKt;
  const dTwa = model.twaDeg - target.twaDeg;
  const dHeel = model.heelDeg - target.heelDeg;
  return {
    ...model,
    label,
    target,
    dBsPct: dBs * 100,
    dTwaDeg: dTwa,
    dHeelDeg: dHeel,
    loss: dBs * dBs + w.twa * (dTwa / 10) ** 2 + w.heel * (dHeel / 10) ** 2,
  };
}

/** Total loss over paired model/target rows. Pure; the unit tests drive this. */
export function vmgLoss(models: FitPoint[], targets: FitPoint[], w: LossWeights): number {
  if (models.length !== targets.length) throw new Error('vmgLoss: length mismatch');
  return models.reduce((a, m, i) => a + pointResidual(m, targets[i], w).loss, 0);
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

const loaded = loadPolar();
if (!loaded) throw new Error('data/polar/orc-j70.json is missing; nothing to fit against');
const polar: Polar = loaded;

/** ADR 0012: fit every printed row at the wind speeds that are not held out. */
export const FIT_TWS = polar.twsKt.filter((t) => !HELD_OUT_TWS.includes(t));

/** The one polar row for a (sail, kind, TWS) triple. Throws if it is not printed. */
export function polarRow(sail: string, kind: string, twsKt: number): PolarRow {
  const r = polar.rows.find((x) => x.sail === sail && x.kind === kind && x.twsKt === twsKt);
  if (!r) throw new Error(`no polar row for ${sail}/${kind} at TWS ${twsKt}`);
  return r;
}

export function rowPoint(r: PolarRow): FitPoint {
  return {
    twsKt: r.twsKt,
    bsKt: r.bsKt,
    twaDeg: Math.abs(r.twaDeg),
    heelDeg: Math.abs(r.heelDeg),
  };
}

/** The model's answer for one printed row, in the loss's shape. */
function modelPoint(c: Comparison): FitPoint {
  return { twsKt: c.twsKt, bsKt: c.model.bsKt, twaDeg: c.model.twaDeg, heelDeg: c.model.heelDeg };
}

export interface TuningBand {
  label: string;
  uppersTurns: number;
  lowersTurns: number;
}

const NORTH_BANDS = northData.bands as (TuningBand & {
  twsMinKt: number;
  twsMaxKt: number | null;
})[];

/**
 * The North band covering this wind speed. Bands are half-open [min, max) so a
 * boundary speed (10 kt sits in both the "8-10" and "10-12" rows as printed)
 * resolves to exactly one band; the last band is open-ended.
 */
export function northBand(twsKt: number): TuningBand {
  const b = NORTH_BANDS.find(
    (x) => twsKt >= x.twsMinKt && (x.twsMaxKt === null || twsKt < x.twsMaxKt),
  );
  if (!b) throw new Error(`no North band for TWS ${twsKt}`);
  return { label: b.label, uppersTurns: b.uppersTurns, lowersTurns: b.lowersTurns };
}

// ---------------------------------------------------------------------------
// Fit configuration
// ---------------------------------------------------------------------------

/** Stage 3 refits righting on the rows where heel is actually large. */
const FIT_TWS_HEEL = [16, 20];
/** Stage 4 samples the middle of the two North bands the ADR allows us to fit. */
const FIT_TWS_RIG = [9, 14];

const WEIGHTS: LossWeights = { twa: 0.15, heel: 0.02 };
/** Stage 3 is the heel pass: heel dominates, speed still restrains it. */
const WEIGHTS_HEEL: LossWeights = { twa: 0.0, heel: 1.0 };

/** Fixed simplex step in log space: a factor of e^0.35 ~ 1.42 per parameter. */
const SIMPLEX_STEP = 0.35;

const geom = geometryFor(boat);
const BASE_DOCK: DockControls = { upperTurns: 0, lowerTurns: 0, forestayMm: 0 };

// ---------------------------------------------------------------------------
// Row sets
// ---------------------------------------------------------------------------

/** Jib rows in the fit: the upwind VMG row plus the printed 60/90/120 rows. */
const JIB_ROWS: PolarRow[] = FIT_TWS.flatMap((t) => [
  polarRow('jib', 'vmgUp', t),
  ...angleRows(polar, t),
]);
/** Asymmetric rows in the fit: the running VMG row at each fitted wind speed. */
const ASYM_ROWS: PolarRow[] = FIT_TWS.map((t) => polarRow('asym', 'vmgDn', t));
const HEEL_ROWS: PolarRow[] = FIT_TWS_HEEL.map((t) => polarRow('jib', 'vmgUp', t));

function residualsFor(rows: PolarRow[], w: LossWeights): PointResidual[] {
  return rows.map((r) => {
    const c = compareRow(r);
    return pointResidual(modelPoint(c), rowPoint(r), w, c.label);
  });
}

function lossFor(rows: PolarRow[], w: LossWeights): number {
  return residualsFor(rows, w).reduce((a, r) => a + r.loss, 0);
}

// ---------------------------------------------------------------------------
// Stage runner
// ---------------------------------------------------------------------------

export interface StageReport {
  stage: number;
  name: string;
  target: string;
  weights: LossWeights;
  maxIter: number;
  restarts: number;
  evals: number;
  lossStart: number;
  lossEnd: number;
  knobs: { name: string; start: number; end: number; bounds: [number, number]; atBound: boolean }[];
  residuals: PointResidual[] | TurnsResidual[];
  notes?: string;
}

/** Stage 4 measures turns of disagreement, not knots, so it has its own row. */
export interface TurnsResidual {
  twsKt: number;
  band: string;
  uppersModel: number;
  uppersGuide: number;
  lowersModel: number;
  lowersGuide: number;
  loss: number;
}

interface StageSpec {
  stage: number;
  name: string;
  target: string;
  weights: LossWeights;
  knobs: KnobSpec[];
  maxIter: number;
  /**
   * Nelder-Mead restarts. A simplex that has collapsed on a ridge cannot get
   * off it; restarting from the best point with a fresh full-size simplex can.
   * Fixed, so the search stays deterministic.
   */
  restarts?: number;
  /**
   * Optional deterministic coarse grid, one array of candidate values per knob,
   * evaluated before Nelder-Mead so the simplex starts from the best cell.
   *
   * Needed where the loss surface has cliffs rather than curvature: stage 2's
   * downwind rows switch between the reaching and the soak VMG hump within the
   * knobs' plausible range (ADR 0018), and a simplex started at x0 collapses on
   * whichever side of a cliff it lands. Same reason `softOptimum` exists in
   * stage 4 and the TWA search scans before it refines.
   */
  scan?: number[][];
  /** Loss at the current calibration block. */
  loss: () => number;
  /** Per-point residuals at the current calibration block, for the report. */
  residuals: () => PointResidual[] | TurnsResidual[];
  notes?: string;
}

/** Cartesian product of the per-knob candidate lists, in a fixed order. */
export function gridCells(values: number[][]): number[][] {
  return values.reduce<number[][]>(
    (acc, vs) => acc.flatMap((row) => vs.map((v) => [...row, v])),
    [[]],
  );
}

function runStage(spec: StageSpec): StageReport {
  // Wall time is printed, never written: residuals.json has to be a pure
  // function of the code and the reference data or a re-run churns the diff.
  const t0 = Date.now();
  const restarts = spec.restarts ?? 1;
  let evals = 0;
  const apply = (x: number[]) => {
    spec.knobs.forEach((k, i) => {
      boat.calibration[k.name] = fromX(k, x[i]);
    });
  };
  const f = (x: number[]) => {
    apply(x);
    const l = spec.loss();
    evals++;
    if (evals % 10 === 0) {
      const shown = spec.knobs
        .map((k) => `${k.name.split('.').pop()}=${boat.calibration[k.name].toPrecision(4)}`)
        .join(' ');
      console.log(`  [${spec.name}] eval ${evals} loss ${l.toExponential(4)}  ${shown}`);
    }
    return l;
  };

  let x = spec.knobs.map(() => 0);
  const lossStart = f(x);
  if (spec.scan) {
    let best = lossStart;
    for (const cell of gridCells(spec.scan)) {
      const cand = cell.map((v, i) => toX(spec.knobs[i], v));
      const l = f(cand);
      if (l < best) {
        best = l;
        x = cand;
      }
    }
    console.log(
      `  [${spec.name}] grid scan: loss ${lossStart.toExponential(4)} -> ${best.toExponential(4)}`,
    );
  }
  for (let r = 0; r < restarts; r++) {
    x = nelderMead(f, x, { step: SIMPLEX_STEP, maxIter: spec.maxIter, tol: 1e-9 }).x;
  }
  apply(x); // nelderMead leaves the last probe applied, not the best point
  const lossEnd = spec.loss();

  const report: StageReport = {
    stage: spec.stage,
    name: spec.name,
    target: spec.target,
    weights: spec.weights,
    maxIter: spec.maxIter,
    restarts,
    evals,
    lossStart,
    lossEnd,
    knobs: spec.knobs.map((k, i) => {
      const end = fromX(k, x[i]);
      return {
        name: k.name,
        start: k.start,
        end,
        bounds: [k.min, k.max] as [number, number],
        atBound: end <= k.min * (1 + 1e-9) || end >= k.max * (1 - 1e-9),
      };
    }),
    residuals: spec.residuals(),
    notes: spec.notes,
  };
  console.log(
    `stage ${spec.stage} ${spec.name}: loss ${lossStart.toExponential(4)} -> ` +
      `${lossEnd.toExponential(4)} in ${evals} evals, ${((Date.now() - t0) / 1000).toFixed(1)} s`,
  );
  for (const k of report.knobs)
    console.log(
      `    ${k.name}: ${k.start} -> ${k.end.toPrecision(6)}${k.atBound ? '  [bound]' : ''}`,
    );
  return report;
}

// ---------------------------------------------------------------------------
// Stage 4: dock setup versus the North guide
// ---------------------------------------------------------------------------

/** Turns the stage-4 grid searches over. Forestay stays at base: the North
 *  guide prints no forestay or rake number, so there is nothing to fit it to. */
const RIG_GRID_UPPERS = [-3, 0, 2, 4, 6];
const RIG_GRID_LOWERS = [-2, 0, 2, 3];
/** ponytail: fixed TWA proxy for the lap, not a TWA optimisation. Stage 4 only
 *  compares dock setups against each other; re-optimising the angle inside a
 *  6-parameter fit costs ~16x for a second-order effect on the ranking. */
const LAP_TWA_UP = 42;
const LAP_TWA_DN = 150;

function condition(twsKt: number, twaDeg: number, sailset: 'jib' | 'asym'): Condition {
  return { twsKt, twaDeg, seaState: POLAR_SEA_STATE, crewKg: POLAR_CREW_KG, sailset };
}

function lapTimeHours(twsKt: number, dock: DockControls): number {
  const up = optimal(boat, dock, condition(twsKt, LAP_TWA_UP, 'jib'), { optimiseTwa: false }, geom);
  const dn = optimal(
    boat,
    dock,
    condition(twsKt, LAP_TWA_DN, 'asym'),
    { optimiseTwa: false },
    geom,
  );
  const vmgUp = up.bsKt.value * Math.cos((LAP_TWA_UP * Math.PI) / 180);
  const vmgDn = -dn.bsKt.value * Math.cos((LAP_TWA_DN * Math.PI) / 180);
  return 1 / Math.max(0.1, vmgUp) + 1 / Math.max(0.1, vmgDn);
}

export interface SoftOptimum {
  uppersTurns: number;
  lowersTurns: number;
}

/**
 * Soft argmin of lap time over the turns grid.
 *
 * A hard argmin over a discrete grid is piecewise constant, and Nelder-Mead on
 * a piecewise-constant surface does nothing at all. Weighting the candidates by
 * softmin(-T/temp) gives the same answer when one setup is a clear winner and a
 * smooth, differentiable-enough surface in between. The temperature is a
 * quarter of the observed spread, so it is scale-free and needs no knob.
 */
export function softOptimum(times: number[], grid: DockControls[]): SoftOptimum {
  const lo = Math.min(...times);
  const hi = Math.max(...times);
  const temp = Math.max((hi - lo) / 4, 1e-12);
  const w = times.map((t) => Math.exp(-(t - lo) / temp));
  const sum = w.reduce((a, b) => a + b, 0);
  return {
    uppersTurns: grid.reduce((a, g, i) => a + (w[i] / sum) * g.upperTurns, 0),
    lowersTurns: grid.reduce((a, g, i) => a + (w[i] / sum) * g.lowerTurns, 0),
  };
}

function rigGrid(): DockControls[] {
  const out: DockControls[] = [];
  for (const upperTurns of RIG_GRID_UPPERS)
    for (const lowerTurns of RIG_GRID_LOWERS) out.push({ upperTurns, lowerTurns, forestayMm: 0 });
  return out;
}

function rigStagePoints(): TurnsResidual[] {
  const grid = rigGrid();
  return FIT_TWS_RIG.map((twsKt) => {
    const opt = softOptimum(
      grid.map((d) => lapTimeHours(twsKt, d)),
      grid,
    );
    const band = northBand(twsKt);
    return {
      twsKt,
      band: band.label,
      uppersModel: opt.uppersTurns,
      uppersGuide: band.uppersTurns,
      lowersModel: opt.lowersTurns,
      lowersGuide: band.lowersTurns,
      loss: (opt.uppersTurns - band.uppersTurns) ** 2 + (opt.lowersTurns - band.lowersTurns) ** 2,
    };
  });
}

/** Stage-4 loss: turns of disagreement with the guide, squared. One turn = 1. */
function rigLoss(): number {
  return rigStagePoints().reduce((a, p) => a + p.loss, 0);
}

/**
 * The lowest stage-4 loss reachable if the model's preferred dock setup does
 * not vary with wind speed: the best single setup is the mean of the guide's
 * bands, and the residual is their spread. Reported so a loss sitting on this
 * number is read as "no wind-dependent mechanism" rather than "bad optimiser".
 */
export function structuralFloor(points: TurnsResidual[]): number {
  const spread = (g: number[]) => {
    const m = g.reduce((a, b) => a + b, 0) / g.length;
    return g.reduce((a, b) => a + (b - m) ** 2, 0);
  };
  return spread(points.map((p) => p.uppersGuide)) + spread(points.map((p) => p.lowersGuide));
}

// ---------------------------------------------------------------------------
// Shape-clamp guard
// ---------------------------------------------------------------------------

export interface ShapeHeadroom {
  minDraft: number;
  maxDraft: number;
  minTwist: number;
  maxTwist: number;
}

/**
 * Main half-section draft and twist over the full backstay range at the base
 * dock and base race trim. If any of these touches a clamp the mainsail stops
 * responding to trim at that end of the range, and every downstream sign
 * invariant with it — which is a far worse model than one that misses half a
 * turn against the tuning guide. The stage-4 bounds exist to keep this strictly
 * inside (0.06, 0.20) in draft and (1, 29) degrees in twist.
 */
export function shapeHeadroom(): ShapeHeadroom {
  let minDraft = Infinity;
  let maxDraft = -Infinity;
  let minTwist = Infinity;
  let maxTwist = -Infinity;
  for (let backstay = 0; backstay <= 100; backstay += 5) {
    const race = { ...baseRace(), backstay };
    const s = flyingShape(boat, rigState(boat, BASE_DOCK, backstay), race, 'main').half;
    minDraft = Math.min(minDraft, s.draft);
    maxDraft = Math.max(maxDraft, s.draft);
    minTwist = Math.min(minTwist, s.twistDeg);
    maxTwist = Math.max(maxTwist, s.twistDeg);
  }
  return { minDraft, maxDraft, minTwist, maxTwist };
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

async function writeJson(file: string, value: unknown): Promise<void> {
  const cfg = await resolveConfig(file);
  const text = await format(JSON.stringify(value, null, 2), {
    ...cfg,
    filepath: file,
    parser: 'json',
  });
  await writeFile(file, text, 'utf8');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function main(): Promise<void> {
  const t0 = Date.now();
  const stages: StageReport[] = [];

  // Cold start, always. `data/boats/j70.json` already holds the previous fit,
  // and leaving it in place would make each run start where the last one
  // finished: the output would depend on how many times the script had been
  // run, which is exactly the kind of drift the determinism rule forbids.
  // Every knob's `start` below is the same fallback the source code uses, so
  // an empty block is the documented zero state.
  for (const k of Object.keys(boat.calibration)) delete boat.calibration[k];
  console.log(
    `fit TWS ${FIT_TWS.join('/')}, held out ${HELD_OUT_TWS.join('/')}; ` +
      `sea state ${POLAR_SEA_STATE}, crew ${POLAR_CREW_KG} kg`,
  );

  // --- stage 1: hydro against every jib row --------------------------------
  // The jib rows span Fn 0.26 (6 kt beating) to Fn 0.70 (20 kt at 90 deg), so
  // all five residuary bins plus the planing relief are constrained here, and
  // the form factor gives the light-air end something to move. keelLiftSlope
  // trades leeway against induced drag, heelDragK pays for heel, and aero.hbiM
  // is the single aero heeling-arm knob.
  stages.push(
    runStage({
      stage: 1,
      name: 'hydro-jib',
      target: `jib vmgUp + 60/90/120 rows at TWS ${FIT_TWS.join('/')} (${JIB_ROWS.length} rows)`,
      weights: WEIGHTS,
      maxIter: 320,
      restarts: 3,
      knobs: [
        { name: 'hydro.formFactor', start: 0.1, min: 0.02, max: 0.6 },
        { name: 'hydro.rrMul.fn20', start: 1, min: 0.3, max: 3 },
        { name: 'hydro.rrMul.fn30', start: 1, min: 0.3, max: 3 },
        { name: 'hydro.rrMul.fn40', start: 1, min: 0.3, max: 3 },
        { name: 'hydro.rrMul.fn50', start: 1, min: 0.3, max: 3 },
        { name: 'hydro.rrMul.fn60', start: 1, min: 0.3, max: 3 },
        // The code fallback is 0 (no relief), which has no logarithm; the fit
        // starts from a token 0.05 instead.
        { name: 'hydro.planingRelief', start: 0.05, min: 0.001, max: 0.9 },
        { name: 'hydro.keelLiftSlope', start: 1, min: 0.4, max: 2 },
        // Deliberately wider than the module's own guess.
        // `hydro/resistance.ts` sizes this at ~6 % of Rv at 20 deg; capped
        // there, nothing in the model can hold the boat to the polar's upwind
        // speed plateau above 12 kt. Heel drag is the one lever in this stage
        // that grows with heel, so the fit uses it. Read the resulting value as
        // the model saying the heeled penalty on this hull is several times
        // what was guessed.
        { name: 'hydro.heelDragK', start: 0.5, min: 0.05, max: 4 },
        // Base of I above the water. Freeboard is 0.62 m and the ORC CE-height
        // tests treat 1.5 m as a high value, so this is the honest envelope for
        // the one aero heeling-arm knob.
        { name: 'aero.hbiM', start: 0.75, min: 0.5, max: 1.4 },
      ],
      loss: () => lossFor(JIB_ROWS, WEIGHTS),
      residuals: () => residualsFor(JIB_ROWS, WEIGHTS),
    }),
  );

  // --- stage 2: the asymmetric ---------------------------------------------
  // Two knobs, and neither is ORC. With the hydro frozen, the running rows are
  // still reached far too fast and far too high; the remaining degrees of
  // freedom that change the asym without disturbing the jib fit are the sail's
  // own lift and, above the wing-to-parachute changeover, its own drag.
  //
  // `asymCdMul` is the one added in ADR 0018 and it is the one that carries the
  // deep rows: ORC Table 5.7 puts CLmax at 0.100 by AWA 150 and 0.020 by 170,
  // so `asymClMul` has no authority at all over a soak. Before it existed this
  // stage fitted to 1.011 — a no-op — because there was nothing to turn.
  stages.push(
    runStage({
      stage: 2,
      name: 'asym',
      target: `asym vmgDn at TWS ${FIT_TWS.join('/')}`,
      weights: WEIGHTS,
      maxIter: 160,
      restarts: 2,
      // Bounds, both of them, come from what is published about the
      // coefficient each knob acts on — not from numerics.
      knobs: [
        // CL: ORC's own two editions bracket the lift regime this knob has any
        // authority in (AWA <= 115, where the TWS 6/8/20 rows sit) at 1.00 to
        // 1.10 — 2026 raises Table 5.7's CL by 5 % at 75 deg and 10 % at
        // 115 deg over 2023, and the wind-tunnel corpus sits above both
        // (research doc 01 §2.2, §3.1). Nothing published supports de-powering
        // the printed table, so 1.0 is the floor. An earlier bound of
        // [0.3, 2] let the fit run to 0.82, which is less lift than either
        // edition prints; see ADR 0018.
        { name: 'aero.asymClMul', start: 1, min: 1.0, max: 1.1 },
        // CD above the changeover is bracketed by nothing: this is where the
        // two ORC editions disagree most and where the wind-tunnel corpus sits
        // far above both, so the knob is wide.
        // Upper bound from the published wind-tunnel band: ORC's rated-area CD
        // at AWA 130-150 is 0.475-0.352, and Souppez & Viola 2024 report
        // 0.6-1.0 on full moulded area over the same window, which is
        // 0.83-1.39 on ORC's rated area at the historical 0.72 asymmetric
        // efficiency factor (research doc 01 §3.1, §7.2). 4.0 is comfortably
        // outside that band in both directions, so a value that lands on the
        // bound is a signal, not a fit.
        { name: 'aero.asymCdMul', start: 1, min: 0.5, max: 4 },
      ],
      // 5 x 8 cells, ~40 extra solves. The cliffs are in cdMul, so it is the
      // finer axis.
      scan: [
        [1.0, 1.025, 1.05, 1.075, 1.1],
        [1.2, 1.6, 2.0, 2.2, 2.4, 2.6, 3.0, 3.4],
      ],
      loss: () => lossFor(ASYM_ROWS, WEIGHTS),
      residuals: () => residualsFor(ASYM_ROWS, WEIGHTS),
      notes:
        'The 20 kt asym row (137.1 deg at 11.53 kt, Fn 0.73) is a planing row ' +
        'against a displacement model and still pulls against the rest; the ' +
        'residuals show the split.',
    }),
  );

  // --- stage 3: righting ----------------------------------------------------
  stages.push(
    runStage({
      stage: 3,
      name: 'righting',
      target: `jib vmgUp heel at TWS ${FIT_TWS_HEEL.join('/')}`,
      weights: WEIGHTS_HEEL,
      maxIter: 60,
      knobs: [{ name: 'hydro.crewArmMul', start: 1, min: 0.2, max: 1.05 }],
      loss: () => lossFor(HEEL_ROWS, WEIGHTS_HEEL),
      residuals: () => residualsFor(HEEL_ROWS, WEIGHTS_HEEL),
      notes:
        'crewArmM is capped at beam/2 by the class hiking rule, so values above ' +
        '~1.05 have no effect; the knob can only soften the rig, never stiffen it.',
    }),
  );

  // --- stage 4: rig + shape against the North guide -------------------------
  const rigReport = runStage({
    stage: 4,
    name: 'rig-shape',
    target: `North base turns at TWS ${FIT_TWS_RIG.join('/')} (8-10 and 12-16 bands)`,
    weights: { twa: 0, heel: 0 },
    maxIter: 120,
    // Bounds are the model's tested-valid region, not just numerics. Every one
    // of these knobs can, pushed far enough, saturate a clamp in
    // shape/flying.ts and kill the trim response the whole app is built on.
    // `shapeHeadroom()` below is the assertion that they did not.
    knobs: [
      // EI is pinned within ~13 % by beam.test.ts: the mast bends 35-45 mm at
      // the full backstay load, and that target defines the value.
      { name: 'rig.EI', start: 6.0e5, min: 5.4e5, max: 6.85e5 },
      { name: 'rig.turnsToN', start: 220, min: 100, max: 600 },
      { name: 'rig.sagK', start: 45, min: 25, max: 90 },
      // Above ~0.36, measured over the corners of the race-control box at the
      // stiffest and softest EI in range, the mainsail draft reaches its 0.05
      // floor and every main shape response goes flat.
      { name: 'shape.bendToDraft', start: 0.45, min: 0.25, max: 0.36 },
      { name: 'shape.sagToDraft', start: 0.0006, min: 3e-4, max: 1.2e-3 },
      // Above ~0.15 twist reaches its 30 deg ceiling at full sheet ease.
      { name: 'shape.sheetToTwist', start: 0.12, min: 0.06, max: 0.15 },
    ],
    loss: rigLoss,
    residuals: rigStagePoints,
    notes: `soft-argmin over ${rigGrid().length} dock setups, lap time at fixed TWA ${LAP_TWA_UP}/${LAP_TWA_DN}`,
  });
  const rigPoints = rigReport.residuals as TurnsResidual[];
  const floor = structuralFloor(rigPoints);
  rigReport.notes =
    `${rigReport.notes}. The dock-setup ranking this model produces barely moves ` +
    `with wind speed (model ${rigPoints
      .map((p) => `TWS ${p.twsKt} ${p.uppersModel.toFixed(2)}/${p.lowersModel.toFixed(2)}`)
      .join(', ')} against guide ${rigPoints
      .map((p) => `${p.uppersGuide}/${p.lowersGuide}`)
      .join(', ')}), so the best a wind-independent optimum can do is the ` +
    `midpoint of the two bands, loss ${floor.toFixed(2)}. None of these six ` +
    `knobs opens a wind-dependent channel.`;
  stages.push(rigReport);

  // --- guard: the shape layer must still respond ---------------------------
  const headroom = shapeHeadroom();
  const clampOk =
    headroom.minDraft > 0.06 &&
    headroom.maxDraft < 0.2 &&
    headroom.minTwist > 1 &&
    headroom.maxTwist < 29;
  console.log(
    `\nmain half section over backstay 0..100: draft ` +
      `${headroom.minDraft.toFixed(4)}..${headroom.maxDraft.toFixed(4)}, twist ` +
      `${headroom.minTwist.toFixed(2)}..${headroom.maxTwist.toFixed(2)} deg — ` +
      `${clampOk ? 'clear of every clamp' : 'CLAMPED, shrink a stage-4 bound'}`,
  );
  if (!clampOk) throw new Error('stage 4 saturated a shape clamp; shrink the bound, not the clamp');

  // --- report ---------------------------------------------------------------
  const heldOut = HELD_OUT_TWS.flatMap((tws) =>
    [...vmgRows(polar, tws), ...angleRows(polar, tws)].map((r) => {
      const c = compareRow(r);
      return pointResidual(modelPoint(c), rowPoint(r), WEIGHTS, c.label);
    }),
  );
  console.log(`\nheld-out TWS ${HELD_OUT_TWS.join(' / ')} (never fitted):`);
  for (const r of heldOut)
    console.log(
      `  ${r.label.padEnd(22)} bs ${r.bsKt.toFixed(2)} vs ${r.target.bsKt.toFixed(2)} ` +
        `(${r.dBsPct >= 0 ? '+' : ''}${r.dBsPct.toFixed(1)} %), twa ${r.twaDeg.toFixed(1)} vs ` +
        `${r.target.twaDeg.toFixed(1)} (${r.dTwaDeg >= 0 ? '+' : ''}${r.dTwaDeg.toFixed(1)} deg), ` +
        `heel ${r.heelDeg.toFixed(1)} vs ${r.target.heelDeg.toFixed(1)}`,
    );

  await writeJson('data/boats/j70.json', boat);
  await writeJson('calibration/residuals.json', {
    schemaVersion: 1,
    adr: '0012 (fit/hold-out split), 0007 (tolerances)',
    fitTws: FIT_TWS,
    heldOutTws: HELD_OUT_TWS,
    condition: { seaState: POLAR_SEA_STATE, crewKg: POLAR_CREW_KG },
    simplexStep: SIMPLEX_STEP,
    shapeHeadroom: headroom,
    stages,
    heldOut,
  });
  console.log(
    `\nwrote data/boats/j70.json and calibration/residuals.json in ` +
      `${((Date.now() - t0) / 1000).toFixed(1)} s total`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
