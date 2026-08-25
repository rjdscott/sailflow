/**
 * Trim drills, schema v2: fault templates, generated instances, control-space
 * scoring (ADR 0013).
 *
 * A drill is no longer a hand-written row. It is `(template, seed)`: the
 * template names a condition *range* and which controls are knocked off the
 * base trim and by how much; the seed picks the wind, the sea state and the
 * fault sizes. `generateDrill` is pure and deterministic — same seed, same
 * drill, forever — so a "drill of the day" needs no server.
 *
 * Two things the v1 schema got wrong and this one fixes:
 *
 *   - the answer key was `optimal()`'s guide base, i.e. a constant (audit
 *     ux-02 H-01). Here it is `optimalTrim` run from the drill's own start
 *     with every non-free control held, so it is the best trim reachable by
 *     the boat the learner is actually sailing;
 *   - the score was VMG loss alone, and the model's VMG surface is flat over
 *     most of control space, so eight of ten drills paid a medal for zero
 *     input (H-02). Here the medal is decided on distance to that key in
 *     legal control steps, with loss as the second gate.
 *
 * Fault and free controls are restricted to `TRIM_CONTROLS` (H-03): the shape
 * layer never reads the halyards, the inhauler or any gennaker control, so a
 * drill built on them has no feedback loop at all.
 *
 * Pure data + pure functions. No DOM, no `Date`, no `Math.random`.
 */
import type {
  Condition,
  DockControls,
  RaceControls,
  SailSet,
  SeaState,
  SolveResult,
  OptimalTrimResult,
} from '../core/types';
import { TRIM_CONTROLS, type TrimControl } from '../worker/protocol';
import type { OptimalTrimRequest, TrimmedRequest } from '../worker/protocol';
import type { SolverClient } from '../worker/client';
import { bandFor, guideFor, GUIDE_IDS, GUIDE_LABELS } from './reference';
import { hashSeed, mulberry32, pick, randInt } from './prng';
import j70 from '../../data/boats/j70.json';
import polarJson from '../../data/polar/orc-j70.json';
import templatesJson from '../../data/drills/j70-templates.json';

export type DrillTier = 1 | 2 | 3;
export type Medal = 'gold' | 'silver' | 'bronze' | 'none';

/** What "better" means for this drill: VMG up/down the course, or boat speed. */
export type DrillObjective = 'vmg' | 'speed';

export interface DrillFault {
  control: TrimControl;
  /** How far off the base trim, in whole control steps. Inclusive range. */
  steps: [number, number];
  /** Force the direction of the error. Omitted = the seed picks a side. */
  sign?: 1 | -1;
}

export interface DrillConditions {
  /** Inclusive TWS range, kt. Sampled to whole knots. */
  twsKt: [number, number];
  /** Inclusive TWA range, or the ORC polar's VMG-optimal angle at that TWS. */
  twaDeg: [number, number] | 'optimal';
  seaState: SeaState[];
  sailset: SailSet;
  /** Crew weight, kg. Constant across seeds — the drill is about trim. */
  crewKg: number;
}

export interface DrillTemplate {
  id: string;
  tier: DrillTier;
  title: string;
  /** Expert register, 1–2 sentences. Says what is wrong, not what to do. */
  brief: string;
  /** Direction and sequence, never a magnitude. Gated behind the first attempt. */
  hint: string;
  objective: DrillObjective;
  conditions: DrillConditions;
  /** Dock tune the drill is sailed on. Constant across seeds. */
  dock: DockControls;
  /** The sane trim the faults are applied to; also the locked controls' values. */
  base: RaceControls;
  faults: DrillFault[];
  /** Controls the learner may move. Must cover every fault control. */
  free: TrimControl[];
  /** True when the model can only give a direction here, not a number. */
  cTier?: boolean;
  /** Where the base trim and the fault sizes come from. */
  prov: string;
}

/** One generated instance of a template. */
export interface Drill {
  /** `<templateId>#<seed>` — unique per instance, stable for a given seed. */
  id: string;
  templateId: string;
  seed: number;
  tier: DrillTier;
  title: string;
  brief: string;
  hint: string;
  objective: DrillObjective;
  condition: Condition;
  dock: DockControls;
  /** The deliberately wrong setup the learner starts from. */
  start: RaceControls;
  free: TrimControl[];
  cTier?: boolean;
}

export const TEMPLATES = templatesJson as unknown as DrillTemplate[];

/** Exhaustive by construction: TS errors here if `RaceControls` gains a key. */
const RACE_KEY_MAP: Record<keyof RaceControls, true> = {
  backstay: true,
  mainsheet: true,
  traveller: true,
  cunningham: true,
  outhaul: true,
  vang: true,
  jibSheet: true,
  jibLead: true,
  inhauler: true,
  mainHalyard: true,
  jibHalyard: true,
};

export const RACE_KEYS = Object.keys(RACE_KEY_MAP) as (keyof RaceControls)[];

interface Spec {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
}
const CONTROLS = j70.controls as Record<string, Spec>;

export function controlSpec(key: string): Spec {
  return CONTROLS[key];
}

/** Nearest legal value on a control's grid. Mirrors `core/solve/optimalTrim.snap`. */
export function snapControl(key: string, v: number): number {
  const s = CONTROLS[key];
  const stepped = s.min + Math.round((v - s.min) / s.step) * s.step;
  return Math.min(s.max, Math.max(s.min, Number(stepped.toFixed(6))));
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

interface PolarRow {
  twsKt: number;
  sail: string;
  kind: string;
  twaDeg: number;
}
const POLAR_ROWS = (polarJson as unknown as { rows: PolarRow[] }).rows;

/**
 * VMG-optimal TWA at this wind speed, straight off the ORC Speed Guide rows
 * (`kind: 'vmgUp'` upwind, `'vmgDn'` under the kite), linearly interpolated
 * between the published wind speeds and clamped outside them.
 *
 * prov: `data/polar/orc-j70.json`, ORC Speed Guide J/70, VPP 2011 1.02.
 */
export function optimalTwaDeg(twsKt: number, sailset: SailSet): number {
  const kind = sailset === 'jib' ? 'vmgUp' : 'vmgDn';
  const pts = POLAR_ROWS.filter((r) => r.sail === sailset && r.kind === kind).sort(
    (a, b) => a.twsKt - b.twsKt,
  );
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (twsKt <= first.twsKt) return first.twaDeg;
  if (twsKt >= last.twsKt) return last.twaDeg;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (twsKt <= b.twsKt) {
      const t = (twsKt - a.twsKt) / (b.twsKt - a.twsKt);
      return Number((a.twaDeg + t * (b.twaDeg - a.twaDeg)).toFixed(1));
    }
  }
  return last.twaDeg;
}

/**
 * The drill a template yields at this seed. Pure: no clock, no randomness
 * beyond the seed, no solver. Validity (does this start actually cost the
 * learner anything?) is `generateDrillAsync`'s job — it needs the model.
 */
export function generateDrill(template: DrillTemplate, seed: number): Drill {
  // Mixing the id in keeps seed 1 from producing correlated drills across
  // templates; the odd constant is the 32-bit golden-ratio step.
  const rng = mulberry32((hashSeed(template.id) + Math.imul(seed >>> 0, 0x9e3779b1)) >>> 0);
  const { conditions: c } = template;
  const twsKt = randInt(rng, c.twsKt[0], c.twsKt[1]);
  const twaDeg =
    c.twaDeg === 'optimal'
      ? optimalTwaDeg(twsKt, c.sailset)
      : randInt(rng, c.twaDeg[0], c.twaDeg[1]);
  const seaState = pick(rng, c.seaState);

  const start: RaceControls = { ...template.base };
  for (const f of template.faults) {
    const spec = CONTROLS[f.control];
    const n = randInt(rng, f.steps[0], f.steps[1]);
    const dir = f.sign ?? (rng() < 0.5 ? 1 : -1);
    start[f.control] = snapControl(f.control, template.base[f.control] + dir * n * spec.step);
  }

  return {
    id: `${template.id}#${seed}`,
    templateId: template.id,
    seed,
    tier: template.tier,
    title: template.title,
    brief: template.brief,
    hint: template.hint,
    objective: template.objective,
    condition: { twsKt, twaDeg, seaState, crewKg: c.crewKg, sailset: c.sailset },
    dock: template.dock,
    start,
    free: template.free,
    cTier: template.cTier,
  };
}

/** Controls `optimalTrim` must hold for this drill: everything that is not free. */
export function fixedControls(free: readonly TrimControl[]): TrimControl[] {
  return TRIM_CONTROLS.filter((c) => !free.includes(c));
}

/**
 * Minimum the start must cost against its own answer key for the drill to be
 * worth posing. Below this the learner is already at the optimum on arrival,
 * which is the whole of audit finding H-02.
 *
 * prov: assumed. Set at 2× the gold loss gate and above the held-out upwind
 * VMG error (1.6 % at TWS 8, `validation/report.md`), so a valid drill is one
 * the model can actually tell is wrong.
 */
export const START_LOSS_MIN_PCT = 3;

/** How many consecutive seeds `generateDrillAsync` will try before giving up. */
export const SEED_TRIES = 8;

/**
 * The client surface the generator needs. Type-only import of the worker
 * client, so nothing from `src/worker` is pulled into this module's bundle —
 * the UI still reaches physics only through the protocol (ADR 0003).
 */
export type DrillClient = Pick<SolverClient, 'request'>;

export interface GeneratedDrill {
  drill: Drill;
  /** The answer key: best trim reachable from `start` moving only free controls. */
  optimum: OptimalTrimResult;
  /** The solve at the start trim, so the UI need not re-request it. */
  startResult: SolveResult;
  /** What the start costs against the key, percent. */
  startLossPct: number;
  /** False when no seed in the budget produced a costly enough start. */
  valid: boolean;
}

async function evaluate(
  client: DrillClient,
  drill: Drill,
): Promise<Omit<GeneratedDrill, 'valid' | 'drill'>> {
  const controls = { dock: drill.dock, race: drill.start };
  const startResult = await client.request<TrimmedRequest>({
    type: 'trimmed',
    controls,
    condition: drill.condition,
  });
  const optimum = await client.request<OptimalTrimRequest>({
    type: 'optimalTrim',
    controls,
    condition: drill.condition,
    fixed: fixedControls(drill.free),
  });
  return {
    optimum,
    startResult,
    startLossPct: lossPct(startResult, optimum.result, drill),
  };
}

/**
 * Generate a drill whose start actually costs something, walking consecutive
 * seeds from `seed` until one clears `START_LOSS_MIN_PCT`.
 *
 * ponytail: on exhausting the budget it returns the costliest candidate with
 * `valid: false` rather than throwing — a screen that shows a slightly easy
 * drill beats a screen that shows an error. The authoring gate that stops
 * that ever shipping is the per-template test in `drills.test.ts`.
 */
export async function generateDrillAsync(
  client: DrillClient,
  template: DrillTemplate,
  seed: number,
  tries = SEED_TRIES,
): Promise<GeneratedDrill> {
  let best: GeneratedDrill | undefined;
  for (let i = 0; i < tries; i++) {
    const drill = generateDrill(template, seed + i);
    const evaluated = await evaluate(client, drill);
    const candidate: GeneratedDrill = { drill, ...evaluated, valid: true };
    // A start the solver could not converge on prints junk in the Live card
    // and scores against a junk objective, so it is not a drill.
    if (candidate.startResult.converged && candidate.startLossPct >= START_LOSS_MIN_PCT)
      return candidate;
    const better =
      !best ||
      (candidate.startResult.converged && !best.startResult.converged) ||
      (candidate.startResult.converged === best.startResult.converged &&
        candidate.startLossPct > best.startLossPct);
    if (better) best = candidate;
  }
  return { ...best!, valid: false };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/** Signed so that bigger is always better, whatever the leg and objective. */
export function objectiveKt(
  r: Pick<SolveResult, 'vmgKt' | 'bsKt'>,
  drill: Pick<Drill, 'objective' | 'condition'>,
): number {
  if (drill.objective === 'speed') return r.bsKt.value;
  const upwind = Math.abs(drill.condition.twaDeg) < 90;
  return upwind ? r.vmgKt.value : -r.vmgKt.value;
}

/** Percent of the key's objective the user is giving away. Clamped to [0, 100]. */
export function lossPct(
  user: Pick<SolveResult, 'vmgKt' | 'bsKt'>,
  key: Pick<SolveResult, 'vmgKt' | 'bsKt'>,
  drill: Pick<Drill, 'objective' | 'condition'>,
): number {
  const keyObj = objectiveKt(key, drill);
  const userObj = objectiveKt(user, drill);
  // Sailing the wrong way up the course is a total loss, not a small one.
  if (keyObj <= 0 || userObj <= 0) return 100;
  return Math.min(100, Math.max(0, ((keyObj - userObj) / keyObj) * 100));
}

/**
 * Medal bands. Distance first — the model's objective is flat over much of
 * control space, so loss alone cannot grade it (ADR 0013) — with loss as the
 * second gate so a lucky flat-optimum trim cannot buy gold while the boat is
 * measurably slow.
 *
 * prov: assumed. No published drill grading scale exists. Gold is "on the
 * model's answer"; silver is a click or two per control on a two-control
 * drill; bronze is recognisably the right shape. The loss ceilings are the
 * v1 bands, which sit at and above the held-out VMG error.
 */
export const MEDAL_BANDS: { medal: Medal; maxSteps: number; maxLossPct: number }[] = [
  { medal: 'gold', maxSteps: 0, maxLossPct: 1 },
  { medal: 'silver', maxSteps: 2, maxLossPct: 3 },
  { medal: 'bronze', maxSteps: 5, maxLossPct: 6 },
];

export function medalFor(distanceSteps: number, lossPct: number): Medal {
  // Epsilon: a band edge that lands on 3.0000000000000004 must not drop a medal.
  return (
    MEDAL_BANDS.find((b) => distanceSteps <= b.maxSteps + 1e-9 && lossPct <= b.maxLossPct + 1e-9)
      ?.medal ?? 'none'
  );
}

export interface DrillScoreResult {
  /** L1 distance from the answer key over the free controls, in legal steps. */
  distanceSteps: number;
  lossPct: number;
  medal: Medal;
  /** Set when a tuning guide publishes a value for a control the key moved. */
  guideNote?: string;
}

/** Σ |user − key| / step over the free controls. Both are on the legal grid. */
export function distanceSteps(
  user: RaceControls,
  key: RaceControls,
  free: readonly TrimControl[],
): number {
  const sum = free.reduce((n, c) => n + Math.abs(user[c] - key[c]) / CONTROLS[c].step, 0);
  return Math.round(sum * 1e6) / 1e6;
}

export function scoreDrill(
  user: { race: RaceControls; result: Pick<SolveResult, 'vmgKt' | 'bsKt'> },
  key: { race: RaceControls; result: Pick<SolveResult, 'vmgKt' | 'bsKt'> },
  drill: Pick<Drill, 'objective' | 'condition' | 'free'>,
): DrillScoreResult {
  const steps = distanceSteps(user.race, key.race, drill.free);
  const loss = lossPct(user.result, key.result, drill);
  // The key is a local optimum reachable from the start, so a learner can
  // legitimately land somewhere the descent never looked. Matching or beating
  // its objective is gold whatever the control distance says.
  const beatsKey = objectiveKt(user.result, drill) >= objectiveKt(key.result, drill);
  return {
    distanceSteps: steps,
    lossPct: loss,
    medal: beatsKey ? 'gold' : medalFor(steps, loss),
    guideNote: guideNoteFor(drill, key.race),
  };
}

// ---------------------------------------------------------------------------
// Model vs guide (decision log row 32, CLAUDE.md honesty rule)
// ---------------------------------------------------------------------------

/**
 * Where a tuning guide publishes a setting for one of this drill's free
 * controls, say so and print the model's answer beside it. The grade is the
 * model's (that is the owner's decision); the disagreement is not resolved
 * silently in either direction.
 *
 * Guide race settings are free text ("14 in - Max", "25%"), never numbers, so
 * there is no delta to compute — both values are shown and the reader judges.
 */
export function guideNoteFor(
  drill: Pick<Drill, 'condition' | 'free'>,
  key: RaceControls,
): string | undefined {
  for (const id of GUIDE_IDS) {
    const guide = guideFor(id);
    if (!guide) continue;
    const band = bandFor(guide, drill.condition.twsKt);
    for (const c of drill.free) {
      const published = band.race[c];
      if (typeof published !== 'string' || published.trim() === '') continue;
      const spec = CONTROLS[c];
      const modelled = `${key[c]}${spec.unit === '%' ? ' %' : ` ${spec.unit}`}`;
      return (
        `${GUIDE_LABELS[id]} (${band.label}) publishes ${spec.label.toLowerCase()} ` +
        `"${published}"; the model's optimum here is ${modelled}. ` +
        `You are graded on the model — the two do not have to agree.`
      );
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Per-control deltas
// ---------------------------------------------------------------------------

export interface ControlDelta {
  key: TrimControl;
  label: string;
  unit: string;
  /** Optimum minus user, in the control's own units. */
  delta: number;
  /** The same delta in whole control steps ("clicks"). Signed. */
  steps: number;
}

/** Free controls ranked by how far the learner is from the optimum. */
export function perControlDelta(
  user: RaceControls,
  opt: RaceControls,
  free: readonly TrimControl[],
): ControlDelta[] {
  return free
    .map((key) => {
      const spec = CONTROLS[key];
      const delta = opt[key] - user[key];
      return {
        key,
        label: spec?.label ?? key,
        unit: spec?.unit ?? '',
        delta,
        steps: Math.round(delta / (spec?.step ?? 1)),
      };
    })
    .sort((a, b) => Math.abs(b.steps) - Math.abs(a.steps) || a.key.localeCompare(b.key));
}

/** The one thing to fix, phrased as an instruction. Empty when already there. */
export function coachLine(deltas: ControlDelta[]): string {
  const worst = deltas[0];
  if (!worst) return 'No per-control answer key here: judge this one on VMG alone.';
  if (worst.steps === 0) return 'Nothing left on the table — that is the optimum.';
  const clicks = Math.abs(worst.steps);
  const unit = clicks === 1 ? 'click' : 'clicks';
  const verb = worst.steps > 0 ? 'More' : 'Less';
  return `${verb} ${worst.label.toLowerCase()}: ${clicks} ${unit}.`;
}
