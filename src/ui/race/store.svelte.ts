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
import type { TrimmedRequest } from '../../worker/protocol';
import { coachSentence, type Dir } from '../explain';
import { snap } from '../format';
import { BASE_RACE, conditions, type Preset } from '../stores/conditions.svelte';
import { getClient, type Client } from './client';

export const CONTROLS = boatJson.controls as Record<string, ControlSpec>;

/** Class rule C.9.5(a): standing rigging is committed at the dock, so race mode shows it locked. */
export const BASE_DOCK: DockControls = { upperTurns: 0, lowerTurns: 0, forestayMm: 0 };
export const BASE_DOWN: DownControls = { kiteHalyard: 50, tackLine: 50, kiteSheet: 50, sprit: 0 };

export const DEBOUNCE_MS = 80;

/** The four controls worth spending finite differences on. */
export const PROBE_CONTROLS = ['backstay', 'mainsheet', 'traveller', 'jibLead'] as const;

/** VMG gain below this is rounding noise at the 0.01 kt we display. */
export const GAIN_EPS = 0.005;

export interface Probe {
  control: string;
  dir: Dir;
  vmgKt: number;
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

/** Largest VMG gain over the base, or null when nothing beats the noise floor. */
export function bestProbe(
  baseVmgKt: number,
  probes: Probe[],
  eps = GAIN_EPS,
): (Probe & { gainKt: number }) | null {
  let best: (Probe & { gainKt: number }) | null = null;
  for (const p of probes) {
    const gainKt = p.vmgKt - baseVmgKt;
    if (gainKt > eps && (!best || gainKt > best.gainKt)) best = { ...p, gainKt };
  }
  return best;
}

/** Per-control chevron direction: which way helps, or 0 for neither. */
export function gradients(baseVmgKt: number, probes: Probe[], eps = GAIN_EPS): Record<string, Dir> {
  const out: Record<string, Dir> = {};
  const gains: Record<string, number> = {};
  for (const p of probes) {
    const gainKt = p.vmgKt - baseVmgKt;
    if (gainKt > eps && gainKt > (gains[p.control] ?? eps)) {
      gains[p.control] = gainKt;
      out[p.control] = p.dir;
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
  chevrons: Record<string, Dir> = $state({});
  /** Advanced mode only: reveals the downwind controls under the C-tier banner. */
  downwind = $state(false);
  error: string | null = $state(null);

  #client: Client;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #seq = 0;

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

  applyPreset(p: Preset): void {
    conditions.apply(p.condition);
    // Mutate in place: the panel's sliders bind to this object.
    Object.assign(this.controls.race, p.race);
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
    await this.#probe(seq, controls, condition, result.vmgKt.value);
  }

  /** Finite differences on the four influential controls, one legal step each way. */
  async #probe(
    seq: number,
    controls: ControlState,
    condition: Condition,
    baseVmgKt: number,
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
    // Downwind VMG is negative (towards the leeward mark); "gain" means more
    // negative. Flip the sign so bestProbe/gradients read one way (ux-01 H-05).
    const sign = condition.sailset === 'asym' ? -1 : 1;
    const probes: Probe[] = asked.map((a, i) => ({
      control: a.control,
      dir: a.dir,
      vmgKt: sign * solved[i].vmgKt.value,
    }));
    baseVmgKt *= sign;
    const best = bestProbe(baseVmgKt, probes);
    this.coach = best
      ? { ...best, text: coachSentence(best.control, best.dir, best.gainKt) }
      : null;
    this.chevrons = gradients(baseVmgKt, probes);
  }
}

export const race = new RaceStore();
