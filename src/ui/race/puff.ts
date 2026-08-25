/**
 * The scripted puff replay (research 02 §2.4, S9/S10): a fixed sequence of
 * steady-state conditions, the power state each one lands in, and the order
 * the panels should be worked in at that state.
 *
 * Pure and clockless — `schedule()` returns offsets in milliseconds from the
 * start, and whoever plays them owns the timer. Epic 2 owns time-domain
 * physics; this is a slideshow of solves, and says so on the button.
 */
import { heelBands } from '../instruments/gauges';
import type { PanelId } from '../keys';

export type SequenceId = 'gust' | 'lull' | 'shift';

/** One frame of a sequence: the condition to solve, plus what to call it. */
export interface PuffStep {
  /** True wind speed for this step, kt. Absent means "leave it alone". */
  twsKt?: number;
  /** Wind shift for this step, degrees off the angle the replay started at. */
  twaOffsetDeg?: number;
  label: string;
}

export interface Sequence {
  id: SequenceId;
  label: string;
  /** What the replay does, in the words the button and the sheet both use. */
  what: string;
  steps: PuffStep[];
}

/**
 * The three sequences. Wind speeds are the brief's own numbers — a gust
 * building 8 → 14 and settling at 10, its mirror image, and an ±8° shift.
 * prov: assumed (ASSUMPTIONS.md, puff replay); they are a teaching sequence,
 * not a measured gust profile, and nothing downstream fits to them.
 */
export const SEQUENCES: Record<SequenceId, Sequence> = {
  gust: {
    id: 'gust',
    label: 'Gust',
    what: '8 → 14 → 10 kt',
    steps: [
      { twsKt: 8, label: '8 kt' },
      { twsKt: 10, label: '10 kt' },
      { twsKt: 12, label: '12 kt' },
      { twsKt: 14, label: '14 kt, on' },
      { twsKt: 12, label: '12 kt, easing' },
      { twsKt: 10, label: '10 kt, settled' },
    ],
  },
  lull: {
    id: 'lull',
    label: 'Lull',
    what: '14 → 8 → 12 kt',
    steps: [
      { twsKt: 14, label: '14 kt' },
      { twsKt: 12, label: '12 kt' },
      { twsKt: 10, label: '10 kt' },
      { twsKt: 8, label: '8 kt, soft' },
      { twsKt: 10, label: '10 kt, filling' },
      { twsKt: 12, label: '12 kt, back' },
    ],
  },
  shift: {
    id: 'shift',
    label: 'Shift',
    what: '±8° of wind angle',
    steps: [
      { twaOffsetDeg: 4, label: '+4° header' },
      { twaOffsetDeg: 8, label: '+8° header' },
      { twaOffsetDeg: 4, label: '+4°' },
      { twaOffsetDeg: 0, label: 'square' },
      { twaOffsetDeg: -4, label: '−4° lift' },
      { twaOffsetDeg: -8, label: '−8° lift' },
    ],
  },
};

export const SEQUENCE_IDS: SequenceId[] = ['gust', 'lull', 'shift'];

/** How powered up the boat is, which is what decides the order of work. */
export type PowerState = 'under' | 'transition' | 'over';

export interface PowerInput {
  /** The solver's flattening factor: 1 is full power, below it is depowered. */
  flat: number;
  heelDeg: number;
  twsKt: number;
}

/**
 * Full power and still not heeling to the guide's target: underpowered. Sails
 * already flattened, or heel past the top of the band: overpowered. Anything
 * between is the transition, which is the state S9 and S10 both single out as
 * the one with its own sequence.
 *
 * prov: assumed. `flat` 0.98 and 0.9 are the shape layer's own scale, not a
 * measurement, and the heel band is the North guide's (ASSUMPTIONS.md).
 */
export const FULL_POWER_FLAT = 0.98;
export const DEPOWERED_FLAT = 0.9;

export function powerState({ flat, heelDeg, twsKt }: PowerInput): PowerState {
  const band = heelBands(twsKt);
  const heel = Math.abs(heelDeg);
  if (flat < DEPOWERED_FLAT || heel > band.hi) return 'over';
  if (flat >= FULL_POWER_FLAT && heel < band.lo) return 'under';
  return 'transition';
}

/**
 * Ingham's answer to "ease, hike, trim" (S10): the order depends on how
 * powered up you are. Light — "weight up, point, trim" — starts with the crew,
 * so Helm leads. Transition — "controls, hike, ease, point, trim" — starts
 * with the controls, so Mainsail leads and the crew follows. Overpowered —
 * "ease, point, trim" — is sheets first and the body last.
 */
export const PANEL_ORDER: Record<PowerState, PanelId[]> = {
  under: ['helm', 'mainsail', 'headsail'],
  transition: ['mainsail', 'helm', 'headsail'],
  over: ['mainsail', 'headsail', 'helm'],
};

/** S10's own words for each state, shown while the replay lights the panels. */
export const POWER_CUE: Record<PowerState, string> = {
  under: 'Underpowered: weight up, point, trim.',
  transition: 'Transition: controls, hike, ease, point, trim.',
  over: 'Overpowered: ease, point, trim.',
};

export function panelOrder(state: PowerState): PanelId[] {
  return PANEL_ORDER[state];
}

/** A step with the offset, in ms from the start of the replay, it plays at. */
export interface ScheduledStep extends PuffStep {
  index: number;
  atMs: number;
}

/**
 * The sequence laid out on a relative timeline. No clock: the caller adds its
 * own start time, so the same sequence always schedules the same offsets.
 */
export function schedule(seq: SequenceId, stepMs: number): ScheduledStep[] {
  return SEQUENCES[seq].steps.map((step, index) => ({ ...step, index, atMs: index * stepMs }));
}
