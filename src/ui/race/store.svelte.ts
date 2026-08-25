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
import { BASE_RACE, conditions, type Preset } from '../stores/conditions.svelte';
import { getClient, type Client } from './client';
import { POINTS_OF_SAIL } from './pointOfSail';

export const CONTROLS = boatJson.controls as Record<string, ControlSpec>;

/** Class rule C.9.5(a): standing rigging is committed at the dock, so race mode shows it locked. */
export const BASE_DOCK: DockControls = { upperTurns: 0, lowerTurns: 0, forestayMm: 0 };
export const BASE_DOWN: DownControls = { kiteHalyard: 50, tackLine: 50, kiteSheet: 50, sprit: 0 };

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
  /** Advanced mode only: reveals the downwind controls under the C-tier banner. */
  downwind = $state(false);
  error: string | null = $state(null);
  /** Point-of-sail chip waiting on its VMG-optimal angle, or null. */
  pointOfSailBusy: string | null = $state(null);

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

  /** Park the current trim so `undo()` can put it back exactly. */
  remember(): void {
    this.previousRace = { ...$state.snapshot(this.controls.race) };
  }

  /** Restore the remembered trim, every key, exactly. No-op with nothing to undo. */
  undo(): void {
    if (!this.previousRace) return;
    // Mutate in place: the panel's sliders bind to this object.
    Object.assign(this.controls.race, this.previousRace);
    this.previousRace = null;
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
