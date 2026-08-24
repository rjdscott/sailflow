/**
 * Trim drills: schema, scorer, and best-score persistence.
 *
 * A drill is a condition plus a deliberately wrong race setup. The learner
 * moves the free controls; the solver's VPP optimum at the same condition and
 * dock tune is the answer key. Scoring is VMG loss against that optimum
 * (research 03, candidates #3 and #5).
 *
 * Pure data + pure functions: no DOM beyond the localStorage wrapper, which is
 * try/catch'd because iOS Safari private mode throws on access.
 */
import type { Condition, DockControls, DownControls, RaceControls } from '../core/types';
import j70 from '../../data/boats/j70.json';
import drillsJson from '../../data/drills/j70-static.json';

export type DrillTier = 1 | 2 | 3;
export type Medal = 'gold' | 'silver' | 'bronze' | 'none';

export interface Drill {
  id: string;
  title: string;
  tier: DrillTier;
  /** Expert register, 1–2 sentences. Says what is wrong, not what to do. */
  brief: string;
  condition: Condition;
  dock: DockControls;
  /** The deliberately wrong setup the learner starts from. */
  start: RaceControls;
  /** Controls the learner may move. Everything else is locked. */
  free: (keyof RaceControls)[];
  hint: string;
  /**
   * Downwind starting setup. Present only for `sailset: 'asym'` drills; the
   * solver needs gennaker controls to reach an equilibrium at all.
   */
  down?: DownControls;
  /**
   * Free gennaker controls. Not scored per-control: `OptimalResult` carries a
   * race-control optimum only, so downwind drills score on VMG loss alone.
   */
  freeDown?: (keyof DownControls)[];
  /** True when the model can only give a direction here, not a number. */
  cTier?: boolean;
}

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

export const DRILLS = drillsJson as unknown as Drill[];

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * VMG loss bands, percent. prov: assumed thresholds — no published drill
 * grading scale exists; chosen so gold is roughly "indistinguishable from the
 * optimum" at solver resolution and bronze is roughly "one place per beat".
 */
export const MEDAL_BANDS: { medal: Medal; maxLossPct: number }[] = [
  { medal: 'gold', maxLossPct: 1 },
  { medal: 'silver', maxLossPct: 3 },
  { medal: 'bronze', maxLossPct: 6 },
];

export function medalFor(lossPct: number): Medal {
  // Epsilon so a loss that is exactly on a band edge in decimal arithmetic
  // (3 % lands as 3.0000000000000004 in binary floats) doesn't drop a medal.
  return MEDAL_BANDS.find((b) => lossPct <= b.maxLossPct + 1e-9)?.medal ?? 'none';
}

/**
 * Loss = (|optimum| − |user|) / |optimum|, clamped to [0, 100] %. Sailing the
 * wrong way (VMG the wrong side of zero for the leg) is a total loss, which is
 * what `upwind` distinguishes: upwind VMG is positive, downwind negative.
 */
export function scoreDrill(
  user: { vmgKt: number },
  optimum: { vmgKt: number },
  upwind: boolean,
): { lossPct: number; medal: Medal } {
  const optAbs = Math.abs(optimum.vmgKt);
  const signed = upwind ? user.vmgKt : -user.vmgKt;
  if (optAbs === 0 || signed <= 0) return { lossPct: 100, medal: 'none' };
  const lossPct = Math.min(100, Math.max(0, ((optAbs - Math.abs(user.vmgKt)) / optAbs) * 100));
  return { lossPct, medal: medalFor(lossPct) };
}

// ---------------------------------------------------------------------------
// Per-control deltas
// ---------------------------------------------------------------------------

export interface ControlDelta {
  key: keyof RaceControls;
  label: string;
  unit: string;
  /** Optimum minus user, in the control's own units. */
  delta: number;
  /** The same delta in whole control steps ("clicks"). Signed. */
  steps: number;
}

const CONTROLS = j70.controls as Record<string, { label: string; unit: string; step: number }>;

/** Free controls ranked by how far the learner is from the optimum. */
export function perControlDelta(
  user: RaceControls,
  opt: RaceControls,
  free: (keyof RaceControls)[],
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
  // Downwind drills free only gennaker controls, which `OptimalResult` has no
  // answer key for, so there is nothing to rank.
  if (!worst) return 'No per-control answer key here: judge this one on VMG alone.';
  if (worst.steps === 0) return 'Nothing left on the table — that is the optimum.';
  const clicks = Math.abs(worst.steps);
  const unit = clicks === 1 ? 'click' : 'clicks';
  const verb = worst.steps > 0 ? 'More' : 'Less';
  return `${verb} ${worst.label.toLowerCase()}: ${clicks} ${unit}.`;
}

// ---------------------------------------------------------------------------
// Best scores
// ---------------------------------------------------------------------------

export const BEST_KEY = 'sailflow.drills.v1';

/** drill id → best (lowest) VMG loss percent achieved. */
export type BestScores = Record<string, number>;

export function loadBest(): BestScores {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: BestScores = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/** Records `lossPct` if it beats the stored best. Returns the updated map. */
export function saveBest(id: string, lossPct: number): BestScores {
  const best = loadBest();
  if (best[id] !== undefined && best[id] <= lossPct) return best;
  best[id] = lossPct;
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    // ignore: no persistence available (private mode, quota, etc.)
  }
  return best;
}
