/**
 * Staged calibration of the J/70 free parameters (ADR 0007).
 *
 * Run: `pnpm calibrate`. Writes the fitted values into the `calibration` block
 * of `data/boats/j70.json` and the full audit trail into
 * `calibration/residuals.json`. Nothing else is written; `validation/` only
 * ever reads.
 *
 * Four stages, each a Nelder-Mead search on log-normalised parameters with a
 * FIXED starting simplex (all-zero x0, uniform step) and a FIXED iteration
 * budget, so two runs on the same inputs give bit-identical output. Values are
 * carried between stages by freezing them into `boat.calibration` in memory,
 * which is the same object `knob()` reads, so a frozen stage is simply part of
 * the model for every later stage.
 *
 *   1. hydro upwind   rrMul.fn20/30/40, keelLiftSlope, heelDragK, aero.hbiM
 *   2. hydro downwind rrMul.fn50/60, planingRelief
 *   3. righting       crewArmMul, refit on the high-wind heel rows only
 *   4. rig + shape    rig.EI/turnsToN/sagK, shape.bendToDraft/sagToDraft/
 *                     sheetToTwist, against the North guide's base settings
 *
 * Fit set (ADR 0007): TWS 6, 10, 12, 16, 20. TWS 8 and 14 are held out and
 * never enter a loss here. Stage 4 sees only the North 8-10 and 12-16 bands;
 * the other bands and the whole Quantum guide are held out.
 *
 * Loss (stages 1-3), summed over the fit rows:
 *
 *   ((bs - bs_p)/bs_p)^2 + w_twa*((twa - twa_p)/10)^2 + w_heel*((heel - heel_p)/10)^2
 *
 * Weights: boat speed is the quantity the ADR gates on (3 %), so it carries
 * weight 1 as a *relative* error. The angle and heel terms are scaled by 10 deg
 * so a 10-degree miss costs the same as a 100 % speed miss before weighting.
 * w_twa = 0.05 makes a 2 deg angle miss worth about a 4.5 % speed miss;
 * w_heel = 0.02 makes a 5 deg heel miss worth about a 7 % speed miss. Heel is
 * deliberately the weakest term in stages 1-2: the polar's heel column is the
 * output of a stability model we cannot reproduce (ADR 0007 notes the 2011 vs
 * 2023 gap) and letting it drive the resistance fit would trade a gated
 * quantity for an ungated one. Stage 3 exists precisely to give heel its own
 * pass, and there w_heel = 1.0.
 */
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { format, resolveConfig } from 'prettier';
import j70 from '../data/boats/j70.json';
import polarData from '../data/polar/orc-j70.json';
import northData from '../data/tuning/north-j70.json';
import type { BoatDefinition, Condition, DockControls, SailSet } from '../src/core/types';
import { nelderMead } from '../src/core/math/nelderMead';
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
  target: FitPoint;
  dBsPct: number;
  dTwaDeg: number;
  dHeelDeg: number;
  loss: number;
}

export function pointResidual(model: FitPoint, target: FitPoint, w: LossWeights): PointResidual {
  const dBs = (model.bsKt - target.bsKt) / target.bsKt;
  const dTwa = model.twaDeg - target.twaDeg;
  const dHeel = model.heelDeg - target.heelDeg;
  return {
    ...model,
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
// Reference data lookups
// ---------------------------------------------------------------------------

export interface PolarRow {
  twsKt: number;
  sail: string;
  kind: string;
  twaDeg: number;
  bsKt: number;
  vmgKt: number;
  heelDeg: number;
}

const POLAR_ROWS = polarData.rows as PolarRow[];

/** The one polar row for a (sail, kind, TWS) triple. Throws if it is not printed. */
export function polarRow(sail: SailSet, kind: string, twsKt: number): PolarRow {
  const r = POLAR_ROWS.find((x) => x.sail === sail && x.kind === kind && x.twsKt === twsKt);
  if (!r) throw new Error(`no polar row for ${sail}/${kind} at TWS ${twsKt}`);
  return r;
}

export function polarPoint(sail: SailSet, kind: string, twsKt: number): FitPoint {
  const r = polarRow(sail, kind, twsKt);
  return { twsKt, bsKt: r.bsKt, twaDeg: Math.abs(r.twaDeg), heelDeg: Math.abs(r.heelDeg) };
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

/** ADR 0007 fit set. TWS 8 and 14 are held out. */
const FIT_TWS = [6, 10, 12, 16, 20];
/**
 * The 20 kt asymmetric row is dropped from stage 2: the guide prints
 * 137.1 deg at 11.53 kt (Fn 0.73, planing) directly above a 16 kt row of
 * 174.0 deg at 6.73 kt (Fn 0.43). No monotone resistance curve passes through
 * both, so including it would corrupt fn50/fn60 to chase one unreachable row.
 * Recorded in the residuals file as a skipped target.
 */
const FIT_TWS_DN = FIT_TWS.filter((t) => t !== 20);
/** Stage 3 refits righting on the rows where heel is actually large. */
const FIT_TWS_HEEL = [16, 20];
/** Stage 4 samples the middle of the two North bands the ADR allows us to fit. */
const FIT_TWS_RIG = [9, 14];

const WEIGHTS: LossWeights = { twa: 0.15, heel: 0.02 };
/** Stage 3 is the heel pass: heel dominates, speed still restrains it. */
const WEIGHTS_HEEL: LossWeights = { twa: 0.0, heel: 1.0 };

/**
 * Flat water and a mid-range crew. The ORC Speed Guide is a flat-water VPP
 * polar, so sea state 0; crew 300 kg is the midpoint of the class range
 * (255-340 kg) since the guide does not print the crew weight it used.
 * prov: assumed.
 */
const SEA_STATE = 0;
const CREW_KG = 300;

/** Fixed simplex step in log space: a factor of e^0.35 ~ 1.42 per parameter. */
const SIMPLEX_STEP = 0.35;

const boat = j70 as unknown as BoatDefinition;
const geom = geometryFor(boat);
const BASE_DOCK: DockControls = { upperTurns: 0, lowerTurns: 0, forestayMm: 0 };

function condition(twsKt: number, twaDeg: number, sailset: SailSet): Condition {
  return { twsKt, twaDeg, seaState: SEA_STATE, crewKg: CREW_KG, sailset };
}

/** One VMG-optimal model point at this wind speed. */
function modelVmg(twsKt: number, sailset: SailSet, dock = BASE_DOCK): FitPoint {
  const seed = sailset === 'jib' ? 45 : 150;
  const r = optimal(boat, dock, condition(twsKt, seed, sailset), { optimiseTwa: true }, geom);
  return {
    twsKt,
    bsKt: r.bsKt.value,
    twaDeg: Math.abs(r.twaDeg),
    heelDeg: Math.abs(r.heelDeg.value),
  };
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
  evals: number;
  lossStart: number;
  lossEnd: number;
  knobs: { name: string; start: number; end: number; bounds: [number, number] }[];
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
  /** Loss at the current calibration block. */
  loss: () => number;
  /** Per-point residuals at the current calibration block, for the report. */
  residuals: () => PointResidual[] | TurnsResidual[];
  notes?: string;
}

function runStage(spec: StageSpec): StageReport {
  // Wall time is printed, never written: residuals.json has to be a pure
  // function of the code and the reference data or a re-run churns the diff.
  const t0 = Date.now();
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

  const x0 = spec.knobs.map(() => 0);
  const lossStart = f(x0);
  const res = nelderMead(f, x0, { step: SIMPLEX_STEP, maxIter: spec.maxIter, tol: 1e-9 });
  apply(res.x); // nelderMead leaves the last probe applied, not the best point
  const lossEnd = spec.loss();

  const report: StageReport = {
    stage: spec.stage,
    name: spec.name,
    target: spec.target,
    weights: spec.weights,
    maxIter: spec.maxIter,
    evals,
    lossStart,
    lossEnd,
    knobs: spec.knobs.map((k, i) => ({
      name: k.name,
      start: k.start,
      end: fromX(k, res.x[i]),
      bounds: [k.min, k.max] as [number, number],
    })),
    residuals: spec.residuals(),
    notes: spec.notes,
  };
  console.log(
    `stage ${spec.stage} ${spec.name}: loss ${lossStart.toExponential(4)} -> ` +
      `${lossEnd.toExponential(4)} in ${evals} evals, ${((Date.now() - t0) / 1000).toFixed(1)} s`,
  );
  for (const k of report.knobs) console.log(`    ${k.name}: ${k.start} -> ${k.end.toPrecision(6)}`);
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

function lapTimeHours(twsKt: number, dock: DockControls): number {
  const up = optimal(boat, dock, condition(twsKt, LAP_TWA_UP, 'jib'), { optimiseTwa: false }, geom);
  const dn = optimal(
    boat,
    dock,
    condition(twsKt, LAP_TWA_DN, 'asym'),
    { optimiseTwa: false },
    geom,
  );
  return 1 / Math.max(0.1, up.vmgKt.value) + 1 / Math.max(0.1, -dn.vmgKt.value);
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

  // --- stage 1: upwind hydro ------------------------------------------------
  // Fn upwind spans 0.26 (6 kt) to 0.38 (20 kt), so fn20/fn30/fn40 are the bins
  // that carry it. keelLiftSlope trades leeway against induced drag, heelDragK
  // pays for heel, and aero.hbiM is the single aero heeling-arm knob: raising
  // the base of I lifts the whole sailplan CE and with it the heeling moment.
  const upTargets = FIT_TWS.map((t) => polarPoint('jib', 'vmgUp', t));
  const upModels = () => FIT_TWS.map((t) => modelVmg(t, 'jib'));
  stages.push(
    runStage({
      stage: 1,
      name: 'hydro-upwind',
      target: `jib vmgUp at TWS ${FIT_TWS.join('/')}`,
      weights: WEIGHTS,
      maxIter: 220,
      knobs: [
        { name: 'hydro.rrMul.fn20', start: 1, min: 0.3, max: 3 },
        { name: 'hydro.rrMul.fn30', start: 1, min: 0.3, max: 3 },
        { name: 'hydro.rrMul.fn40', start: 1, min: 0.3, max: 3 },
        { name: 'hydro.keelLiftSlope', start: 1, min: 0.4, max: 2 },
        // Deliberately wider than the module's own guess. `hydro/resistance.ts`
        // sizes this at ~6 % of Rv at 20 deg and `hydro.test.ts` asserts under
        // 10 %; capped there, nothing in the model can hold the boat to the
        // polar's upwind speed plateau above 12 kt and the 16/20 kt rows come
        // out 9-15 % fast. Heel drag is the one lever in this stage that grows
        // with heel, so the fit uses it, and it lands well outside that
        // assumption. Read the resulting value as the model saying the heeled
        // penalty on this hull is several times what was guessed, and treat
        // that 10 % assertion as the thing to revisit.
        { name: 'hydro.heelDragK', start: 0.5, min: 0.05, max: 4 },
        // Base of I above the water. Freeboard is 0.62 m and the ORC CE-height
        // tests treat 1.5 m as a high value, so this is the honest envelope for
        // the one aero heeling-arm knob.
        { name: 'aero.hbiM', start: 0.75, min: 0.5, max: 1.4 },
      ],
      loss: () => vmgLoss(upModels(), upTargets, WEIGHTS),
      residuals: () => upModels().map((m, i) => pointResidual(m, upTargets[i], WEIGHTS)),
    }),
  );

  // --- stage 2: downwind hydro ---------------------------------------------
  const dnTargets = FIT_TWS_DN.map((t) => polarPoint('asym', 'vmgDn', t));
  const dnModels = () => FIT_TWS_DN.map((t) => modelVmg(t, 'asym'));
  stages.push(
    runStage({
      stage: 2,
      name: 'hydro-downwind',
      target: `asym vmgDn at TWS ${FIT_TWS_DN.join('/')}`,
      weights: WEIGHTS,
      maxIter: 150,
      knobs: [
        { name: 'hydro.rrMul.fn50', start: 1, min: 0.3, max: 6 },
        { name: 'hydro.rrMul.fn60', start: 1, min: 0.3, max: 6 },
        // The code fallback is 0 (no relief), which has no logarithm; the fit
        // starts from a token 0.05 instead.
        { name: 'hydro.planingRelief', start: 0.05, min: 0.001, max: 0.95 },
      ],
      loss: () => vmgLoss(dnModels(), dnTargets, WEIGHTS),
      residuals: () => dnModels().map((m, i) => pointResidual(m, dnTargets[i], WEIGHTS)),
      notes:
        'TWS 20 asym (137.1 deg at 11.53 kt, Fn 0.73) is excluded: it sits above a ' +
        '16 kt row of 6.73 kt (Fn 0.43) and no monotone residuary curve reaches both.',
    }),
  );

  // --- stage 3: righting ----------------------------------------------------
  const heelTargets = FIT_TWS_HEEL.map((t) => polarPoint('jib', 'vmgUp', t));
  const heelModels = () => FIT_TWS_HEEL.map((t) => modelVmg(t, 'jib'));
  stages.push(
    runStage({
      stage: 3,
      name: 'righting',
      target: `jib vmgUp heel at TWS ${FIT_TWS_HEEL.join('/')}`,
      weights: WEIGHTS_HEEL,
      maxIter: 60,
      knobs: [{ name: 'hydro.crewArmMul', start: 1, min: 0.2, max: 1.05 }],
      loss: () => vmgLoss(heelModels(), heelTargets, WEIGHTS_HEEL),
      residuals: () => heelModels().map((m, i) => pointResidual(m, heelTargets[i], WEIGHTS_HEEL)),
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
    // Bounds are the model's tested-valid region, not just numerics. Every
    // one of these knobs can, pushed far enough, saturate a clamp in
    // shape/flying.ts and kill the trim response the whole app is built on,
    // which is exactly what the src/core invariant tests assert against. A
    // calibration that wins 0.5 turns and costs the mainsheet its effect is
    // not a better model.
    knobs: [
      // EI is pinned within ~13 % by beam.test.ts: the mast bends 35-45 mm at
      // the full backstay load, and that target defines the value.
      { name: 'rig.EI', start: 6.0e5, min: 5.4e5, max: 6.85e5 },
      { name: 'rig.turnsToN', start: 220, min: 100, max: 600 },
      { name: 'rig.sagK', start: 45, min: 25, max: 90 },
      // Above ~0.36 (measured over the corners of the race-control box, at the
      // stiffest and softest EI in range) the mainsail draft reaches its 0.05
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
    `${rigReport.notes}. The dock-setup ranking this model produces is the same at ` +
    `both wind speeds (model ${rigPoints
      .map((p) => `TWS ${p.twsKt} ${p.uppersModel.toFixed(2)}/${p.lowersModel.toFixed(2)}`)
      .join(', ')} against guide ${rigPoints
      .map((p) => `${p.uppersGuide}/${p.lowersGuide}`)
      .join(', ')}), so the best a wind-independent optimum can do is the midpoint ` +
    `of the two bands, loss ${floor.toFixed(2)}. None of these six knobs opens a ` +
    `wind-dependent channel; see the report.`;
  stages.push(rigReport);

  // --- report ---------------------------------------------------------------
  const heldOut = [8, 14].flatMap((twsKt) => [
    pointResidual(modelVmg(twsKt, 'jib'), polarPoint('jib', 'vmgUp', twsKt), WEIGHTS),
    pointResidual(modelVmg(twsKt, 'asym'), polarPoint('asym', 'vmgDn', twsKt), WEIGHTS),
  ]);
  console.log('\nheld-out TWS 8 / 14 (never fitted):');
  for (const r of heldOut)
    console.log(
      `  TWS ${r.twsKt}: bs ${r.bsKt.toFixed(2)} vs ${r.target.bsKt} (${r.dBsPct.toFixed(1)} %), ` +
        `twa ${r.twaDeg.toFixed(1)} vs ${r.target.twaDeg} (${r.dTwaDeg.toFixed(1)} deg), ` +
        `heel ${r.heelDeg.toFixed(1)} vs ${r.target.heelDeg} (${r.dHeelDeg.toFixed(1)} deg)`,
    );

  await writeJson('data/boats/j70.json', boat);
  await writeJson('calibration/residuals.json', {
    schemaVersion: 1,
    fitTws: FIT_TWS,
    heldOutTws: [8, 14],
    condition: { seaState: SEA_STATE, crewKg: CREW_KG },
    simplexStep: SIMPLEX_STEP,
    stages,
    heldOut,
  });
  console.log(
    `\nwrote data/boats/j70.json and calibration/residuals.json in ` +
      `${((Date.now() - t0) / 1000).toFixed(1)} s total`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
