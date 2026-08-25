/**
 * Race-mode state: control state in, `SolveResult` out, plus the coach line.
 *
 * Solves are debounced (a drag fires one solve, not sixty) and id-correlated
 * through a sequence number, so a slow answer to an old control state never
 * overwrites a fresh one. The coach line's finite differences only run once
 * the main solve has settled, never during a drag.
 */
import boatJson from '../../../data/boats/j70.json';
import type {
  Condition,
  ControlSpec,
  ControlState,
  DockControls,
  DownControls,
  RaceControls,
  SolveResult,
} from '../../core/types';
import type { OptimalRequest, TrimmedRequest } from '../../worker/protocol';
import { coachSentence, type Dir } from '../explain';
import { snap } from '../format';
import { History } from '../instruments/history';
import { BASE_RACE, conditions, type Preset } from '../stores/conditions.svelte';
import { getClient, type Client } from './client';
import { optimum } from './optimum.svelte';
import { POINTS_OF_SAIL } from './pointOfSail';

export const CONTROLS = boatJson.controls as Record<string, ControlSpec>;

/** Class rule C.9.5(a): standing rigging is committed at the dock, so race mode shows it locked. */
export const BASE_DOCK: DockControls = { upperTurns: 0, lowerTurns: 0, forestayMm: 0 };
/**
 * Sprit fully out and the halyard at the masthead: on a J/70 the pole is
 * either all the way out or the kite is not up, and the hoist is two-blocked
 * before the sheet is touched. Tack line and sheet mid-range, to be trimmed.
 * prov: assumed — class practice, sailmaker guides (research 2026-08-25-spinnaker).
 */
export const BASE_DOWN: DownControls = {
  kiteHalyard: 100,
  tackLine: 50,
  kiteSheet: 50,
  sprit: 100,
};

export const DEBOUNCE_MS = 80;

/** The four controls worth spending finite differences on. */
export const PROBE_CONTROLS = ['backstay', 'mainsheet', 'traveller', 'jibLead'] as const;

/** VMG gain below this is rounding noise at the 0.01 kt we display. */
export const GAIN_EPS = 0.005;

/**
 * What "faster" means at this condition. Mirrors `core/solve/optimalTrim`
 * exactly — VMG to windward under the jib inside 90°, VMG to leeward under
 * the kite from 90° out, boat speed everywhere else — so the coach line and
 * the Apply-optimum button can never point at different things.
 */
export type Objective = 'vmgUp' | 'vmgDown' | 'speed';

/**
 * What a trend line is allowed to span: one wind, one angle, one sail plan.
 * Change any of them and the samples either side are two different boats, so
 * `History` throws the buffer away rather than drawing a step (ADR 0015).
 */
export function historyKey(c: Condition): string {
  return `${c.twsKt}|${c.twaDeg}|${c.sailset}`;
}

export function raceObjective(c: Condition): Objective {
  const twa = Math.abs(c.twaDeg);
  if (twa < 90 && c.sailset === 'jib') return 'vmgUp';
  if (twa >= 90 && c.sailset === 'asym') return 'vmgDown';
  return 'speed';
}

/** The words the coach line puts on that number (audit ux-01 H-05). */
export const OBJECTIVE_METRIC: Record<Objective, string> = {
  vmgUp: 'VMG',
  vmgDown: 'VMG',
  speed: 'boat speed',
};

/**
 * The objective's value for one solve, signed so more is always better:
 * downwind VMG is negative towards the leeward mark, so it is flipped.
 */
export function objectiveKt(objective: Objective, r: SolveResult): number {
  if (objective === 'speed') return r.bsKt.value;
  return objective === 'vmgDown' ? -r.vmgKt.value : r.vmgKt.value;
}

/**
 * Modes: a deliberate deviation from the VMG angle, which is what a mode *is*
 * (S11, "The Mechanics of Mode": typically 3–10° off VMG). Upwind the offset
 * is applied to the close-hauled solve, downwind to the run's.
 *
 * prov: assumed for every offset (ASSUMPTIONS.md). S11 gives the 3–10° range
 * but no per-mode number, and the downwind three come from the five-mode
 * article's descriptions (S15), not from a published angle table.
 */
export type RaceMode = 'high' | 'vmg' | 'fast' | 'plane' | 'soak' | 'wing';

export const MODE_OFFSET_DEG: Record<RaceMode, number> = {
  high: -3,
  vmg: 0,
  fast: 3,
  plane: -10,
  soak: 8,
  wing: 15,
};

export const UPWIND_MODES: { value: RaceMode; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'vmg', label: 'VMG' },
  { value: 'fast', label: 'Fast' },
];

export const DOWNWIND_MODES: { value: RaceMode; label: string }[] = [
  { value: 'plane', label: 'Plane' },
  { value: 'soak', label: 'Soak' },
  { value: 'wing', label: 'Wing' },
  { value: 'vmg', label: 'VMG' },
];

export const MODE_LABELS: Record<RaceMode, string> = {
  high: 'High',
  vmg: 'VMG',
  fast: 'Fast',
  plane: 'Plane',
  soak: 'Soak',
  wing: 'Wing',
};

/** The TWA slider's own range: a mode may not steer outside the boat's world. */
const TWA_MIN = 20;
const TWA_MAX = 180;

/** Where the crew sits fore and aft. Drawing only — the core has no input for it. */
export type ForeAft = 'fwd' | 'mid' | 'aft';

export const FORE_AFT: { value: ForeAft; label: string }[] = [
  { value: 'fwd', label: 'Fwd' },
  { value: 'mid', label: 'Mid' },
  { value: 'aft', label: 'Aft' },
];

export const FORE_AFT_LABELS: Record<ForeAft, string> = {
  fwd: 'forward',
  mid: 'mid',
  aft: 'aft',
};

export interface Probe {
  control: string;
  dir: Dir;
  /** The objective's value at the nudged state — VMG or boat speed, per `raceObjective`. */
  valueKt: number;
}

export interface Coach {
  control: string;
  dir: Dir;
  gainKt: number;
  text: string;
}

export function ids(mode: ControlSpec['mode']): string[] {
  return Object.keys(CONTROLS).filter((id) => CONTROLS[id].mode === mode);
}

/** Largest gain over the base, or null when nothing beats the noise floor. */
export function bestProbe(
  baseKt: number,
  probes: Probe[],
  eps = GAIN_EPS,
): (Probe & { gainKt: number }) | null {
  let best: (Probe & { gainKt: number }) | null = null;
  for (const p of probes) {
    const gainKt = p.valueKt - baseKt;
    if (gainKt > eps && (!best || gainKt > best.gainKt)) best = { ...p, gainKt };
  }
  return best;
}

/** A chevron is always a gain: the glyph says which way, the number how much. */
export interface Chevron {
  dir: Dir;
  gainKt: number;
}

/**
 * Per-control chevron: the better direction and what it buys. The magnitude
 * used to be computed and thrown away, which left the tooltip with nothing to
 * say (audit ux-01 M-02).
 */
export function gradients(
  baseKt: number,
  probes: Probe[],
  eps = GAIN_EPS,
): Record<string, Chevron> {
  const out: Record<string, Chevron> = {};
  for (const p of probes) {
    const gainKt = p.valueKt - baseKt;
    if (gainKt > eps && gainKt > (out[p.control]?.gainKt ?? eps)) {
      out[p.control] = { dir: p.dir, gainKt };
    }
  }
  return out;
}

function nudge(controls: ControlState, control: string, dir: Dir): ControlState | null {
  const spec = CONTROLS[control];
  const current = controls.race[control as keyof RaceControls];
  const next = snap(current + dir * spec.step, spec.min, spec.max, spec.step);
  if (next === current) return null; // at a stop
  return { ...controls, race: { ...controls.race, [control]: next } };
}

export class RaceStore {
  controls: ControlState = $state({
    dock: { ...BASE_DOCK },
    race: { ...BASE_RACE },
    down: { ...BASE_DOWN },
  });
  result: SolveResult | null = $state(null);
  /**
   * The last few converged answers at the current condition, for the
   * instrument bar's sparklines. Not `$state`: the bar re-reads it whenever
   * `result` changes, which is the only moment it can have grown.
   */
  readonly history = new History();
  busy = $state(false);
  coach: Coach | null = $state(null);
  chevrons: Record<string, Chevron> = $state({});
  /**
   * One-level undo for anything that rewrites the whole trim — a preset, or
   * Apply optimum (audit ux-01 M-11). One level, not a stack: the move being
   * undone is always the one the user just made, and a stack is a history UI
   * nobody asked for.
   */
  previousRace: RaceControls | null = $state(null);
  /**
   * The objective — VMG or boat speed, per `raceObjective` — at the trim in
   * `previousRace`, captured when it was remembered. The A/B bar's delta, so
   * comparing two trims costs no extra solve.
   */
  previousObjKt: number | null = $state(null);
  /** Which side of the A/B compare is on the sliders. 'A' until you toggle. */
  ab: 'A' | 'B' = $state('A');
  /** The chosen mode, and the angle its offset is measured from. */
  mode: RaceMode = $state('vmg');
  modeBaseTwaDeg: number | null = $state(null);
  /**
   * Crew fore-aft. **Not modelled**: the solver takes crew weight, never its
   * position, so this changes no number on the screen. It is here so the
   * tuning log can record what the crew was actually doing (tier C).
   */
  crewForeAft: ForeAft = $state('mid');
  /** Advanced mode only: reveals the downwind controls under the C-tier banner. */
  downwind = $state(false);
  error: string | null = $state(null);
  /**
   * Controls a pending action would move, while its button is hovered or
   * focused, or null. The panels read it and outline those sliders — the
   * consequence of a whole-trim action is previewed before it happens
   * (research §3 principle 24, Factorio's reset hover).
   */
  hovering: string[] | null = $state(null);
  /** Point-of-sail chip waiting on its VMG-optimal angle, or null. */
  pointOfSailBusy: string | null = $state(null);
  /** Last chip tapped and the angle it landed on; the strip keeps that chip
      active while the TWA still matches, so Run stays Run after its solve
      answers 149° (which the bands would call Broad reach). */
  pointOfSail: { id: string; twaDeg: number } | null = $state(null);

  #client: Client;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #seq = 0;
  #posSeq = 0;

  constructor(client: Client = getClient()) {
    this.#client = client;
  }

  /** Debounced solve. Call it with plain snapshots, not proxies. */
  request(controls: ControlState, condition: Condition): void {
    clearTimeout(this.#timer);
    this.busy = true;
    this.#timer = setTimeout(() => void this.#solve(controls, condition), DEBOUNCE_MS);
  }

  /**
   * Race solves the rig the Dock committed (rule C.9.5). Mutates in place:
   * ControlPanel's sliders alias this object. With no commit today the base
   * tune stays and the three controls are free to explore.
   */
  syncDock(setup: DockControls | null): void {
    Object.assign(this.controls.dock, setup ?? BASE_DOCK);
  }

  /**
   * Race controls whose value would change if the trim were set to `target`,
   * in `CONTROLS` order. Null target (no optimum yet, nothing to undo to)
   * moves nothing.
   */
  willMoveTo(target: RaceControls | null): string[] {
    if (!target) return [];
    return ids('race').filter(
      (id) => this.controls.race[id as keyof RaceControls] !== target[id as keyof RaceControls],
    );
  }

  /**
   * What Apply optimum would move: the search's own list, so the highlight
   * and the "moved" summary after the apply can never disagree.
   */
  willMove(): string[] {
    return optimum.moved;
  }

  /** What a reset to the base trim would move. */
  willReset(): string[] {
    return this.willMoveTo(BASE_RACE);
  }

  /** The objective at the trim currently solved, or null before the first answer. */
  #objectiveNow(): number | null {
    return this.result ? objectiveKt(raceObjective(conditions.value), this.result) : null;
  }

  /** Park the current trim so `undo()` and the A/B toggle can put it back exactly. */
  remember(): void {
    this.previousRace = { ...$state.snapshot(this.controls.race) };
    this.previousObjKt = this.#objectiveNow();
    this.ab = 'A';
  }

  /** Restore the remembered trim, every key, exactly. No-op with nothing to undo. */
  undo(): void {
    if (!this.previousRace) return;
    // Mutate in place: the panel's sliders bind to this object.
    Object.assign(this.controls.race, this.previousRace);
    this.previousRace = null;
    this.previousObjKt = null;
    this.ab = 'A';
  }

  /**
   * A/B compare: swap the trim on the sliders with the remembered one, keeping
   * **both**, so toggling twice is exactly where you started. Undo throws the
   * other trim away; this one does not, which is the whole difference between
   * "put it back" and "which of these two is faster".
   */
  abToggle(): void {
    if (!this.previousRace) return;
    const other = this.previousRace;
    const current = { ...$state.snapshot(this.controls.race) };
    const currentObjKt = this.#objectiveNow();
    // Mutate in place: the panels' sliders bind to this object.
    Object.assign(this.controls.race, other);
    this.previousRace = current;
    this.previousObjKt = currentObjKt;
    // The incoming trim's own objective is re-solved, not restored: the
    // condition may have moved since it was parked.
    this.ab = this.ab === 'A' ? 'B' : 'A';
  }

  /** Controls that differ between the two sides of the compare. */
  get abMoved(): string[] {
    return this.willMoveTo(this.previousRace);
  }

  /**
   * This trim's objective minus the other one's, in knots — positive means
   * the trim on the sliders is the faster of the two. Null until both sides
   * have a solved answer.
   */
  get abDeltaKt(): number | null {
    const now = this.#objectiveNow();
    if (now === null || this.previousObjKt === null) return null;
    return now - this.previousObjKt;
  }

  /**
   * Pick a mode: the same point of sail, steered `MODE_OFFSET_DEG` off the
   * angle the chip solved for. The base angle is remembered, so High → Fast
   * is a 6° change and not two 3° ones, and it is re-taken every time a chip
   * is tapped.
   */
  setMode(mode: RaceMode): void {
    const base = this.modeBaseTwaDeg ?? conditions.twaDeg;
    this.modeBaseTwaDeg = base;
    this.mode = mode;
    conditions.twaDeg = Math.min(TWA_MAX, Math.max(TWA_MIN, base + MODE_OFFSET_DEG[mode]));
  }

  /** Modes for the point of sail on screen: reaching offsets are downwind ones. */
  get downwindModes(): boolean {
    return Math.abs(conditions.twaDeg) >= 90 || conditions.sailset === 'asym';
  }

  applyPreset(p: Preset): void {
    this.remember();
    conditions.apply(p.condition);
    // Mutate in place: the panel's sliders bind to this object.
    Object.assign(this.controls.race, p.race);
  }

  /**
   * Point-of-sail chip: sailset and angle in one tap. The reaches are fixed
   * angles and land immediately; Close-hauled and Run show their nominal angle,
   * then adopt the VMG optimum for the current wind and committed rig when the
   * solve answers. Stale answers are dropped, so tapping twice keeps the second.
   */
  setPointOfSail(id: string): void {
    const p = POINTS_OF_SAIL.find((x) => x.id === id);
    if (!p) return;
    const seq = ++this.#posSeq;
    conditions.sailset = p.sailset;
    conditions.twaDeg = p.twaDeg;
    this.pointOfSail = { id, twaDeg: p.twaDeg };
    // A new point of sail is a new VMG angle, so the mode offsets start again
    // from it rather than compounding onto the last chip's angle.
    this.mode = 'vmg';
    this.modeBaseTwaDeg = p.twaDeg;
    if (!p.optimal) {
      this.pointOfSailBusy = null;
      return;
    }
    this.pointOfSailBusy = id;
    this.#client
      .request<OptimalRequest>({
        type: 'optimal',
        dock: { ...this.controls.dock },
        condition: conditions.value,
        optimiseTwa: true,
      })
      .then((r) => {
        if (seq !== this.#posSeq) return;
        conditions.twaDeg = Math.round(Math.abs(r.twaDeg));
        this.pointOfSail = { id, twaDeg: conditions.twaDeg };
        // The solved VMG angle is what a mode is measured off (S11).
        this.modeBaseTwaDeg = conditions.twaDeg;
        if (this.mode !== 'vmg') this.setMode(this.mode);
        this.pointOfSailBusy = null;
      })
      .catch(() => {
        // No optimum: the nominal angle stands, which is already on screen.
        if (seq === this.#posSeq) this.pointOfSailBusy = null;
      });
  }

  #trimmed(controls: ControlState, condition: Condition): Promise<SolveResult> {
    return this.#client.request<TrimmedRequest>({ type: 'trimmed', controls, condition });
  }

  async #solve(controls: ControlState, condition: Condition): Promise<void> {
    const seq = ++this.#seq;
    let result: SolveResult;
    try {
      result = await this.#trimmed(controls, condition);
    } catch (e) {
      if (seq !== this.#seq) return;
      this.busy = false;
      this.error = e instanceof Error ? e.message : String(e);
      return;
    }
    if (seq !== this.#seq) return; // a newer control state is already in flight
    this.result = result;
    // A trend of last iterates is a trend of noise: only a solve that settled
    // gets a point on the line.
    if (result.converged) {
      this.history.push(historyKey(condition), {
        bs: result.bsKt.value,
        vmg: result.vmgKt.value,
        heel: result.heelDeg.value,
      });
    }
    this.busy = false;
    this.error = null;
    await this.#probe(seq, controls, condition, result);
  }

  /** Finite differences on the four influential controls, one legal step each way. */
  async #probe(
    seq: number,
    controls: ControlState,
    condition: Condition,
    base: SolveResult,
  ): Promise<void> {
    const asked: { control: string; dir: Dir; solve: Promise<SolveResult> }[] = [];
    for (const control of PROBE_CONTROLS) {
      for (const dir of [1, -1] as Dir[]) {
        const nudged = nudge(controls, control, dir);
        if (nudged) asked.push({ control, dir, solve: this.#trimmed(nudged, condition) });
      }
    }
    let solved: SolveResult[];
    try {
      solved = await Promise.all(asked.map((a) => a.solve));
    } catch {
      return; // a failed probe costs the coach line, nothing else
    }
    if (seq !== this.#seq) return;
    // One objective for the whole screen (ux-01 H-05): VMG upwind, VMG to
    // leeward under the kite — negative, so flipped to read one way — and boat
    // speed on a reach, exactly as `optimalTrim` scores it.
    const objective = raceObjective(condition);
    const probes: Probe[] = asked.map((a, i) => ({
      control: a.control,
      dir: a.dir,
      valueKt: objectiveKt(objective, solved[i]),
    }));
    const baseKt = objectiveKt(objective, base);
    const best = bestProbe(baseKt, probes);
    const metric = OBJECTIVE_METRIC[objective];
    this.coach = best
      ? { ...best, text: coachSentence(best.control, best.dir, best.gainKt, metric) }
      : null;
    this.chevrons = gradients(baseKt, probes);
  }
}

export const race = new RaceStore();
