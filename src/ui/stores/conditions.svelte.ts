/**
 * The condition the race screen solves for, plus the preset buttons.
 *
 * Preset numbers are UI starting points — a plausible place to begin dragging
 * sliders from — not tuning-guide settings. The guide comparison lives in the
 * disagreement panel, not here, and the screen says so next to the buttons.
 */
import { activeBoat } from '../../lib/boat';
import { snap } from '../format';
import type { Condition, RaceControls, SailSet, SeaState } from '../../core/types';

/**
 * Midpoint-ish race trim, the state every other preset moves away from, read
 * from the active class's boat file. It is the same block
 * `core/shape/base.ts`'s `baseRace()` returns — the datum the shape deltas are
 * measured against and the trim the leech-stall and spreader-stripe meters are
 * calibrated on. The UI cannot import the core (ADR 0003), so both sides read
 * the boat definition rather than keeping two "base trims" that disagreed
 * (carried from phase 03).
 */
export const BASE_RACE: RaceControls = activeBoat.baseRace;

/**
 * What changes about the base trim once the kite is up, from the same file:
 * the mainsheet eased until the boom is out past the corner of the boat. A
 * beat's mainsheet under a kite draws a boom on the centreline, which is the
 * one thing about the upwind trim that is not merely unfast but wrong.
 * Tier C — a cue from the sailmaker guides, not a solve (`optimalTrim`).
 */
// Picked key by key, not spread: `baseRaceDown` also carries the four
// gennaker controls (`BASE_DOWN` in `race/store.svelte.ts` reads those), and
// this constant is spread into a `RaceControls` below, where they do not
// belong.
export const BASE_RACE_DOWN: Partial<RaceControls> & { mainsheet: number } = {
  mainsheet: activeBoat.baseRaceDown.mainsheet,
};

export interface Preset {
  id: string;
  /** As it reads in the actions bar's `Start from` menu (audit ux-04 M-03). */
  label: string;
  condition: Condition;
  race: RaceControls;
}

/**
 * A preset's offsets from the base trim, snapped onto the active class's own
 * stops — the same rule `share.ts` applies to a link's values, and for the
 * same reason: a jib lead runs to a different number of holes on a different
 * boat, and a preset outside the sliders is a trim the user cannot return to.
 * The numbers below are read off the J/70 guides (`prov:` in the block
 * comment above `PRESETS`); on another class they are a starting point that
 * the class's own stops bound.
 */
function trim(over: Partial<RaceControls>): RaceControls {
  const out: Record<string, number> = { ...BASE_RACE, ...over };
  for (const [key, value] of Object.entries(out)) {
    const spec = activeBoat.controls[key];
    if (spec) out[key] = snap(value, spec.min, spec.max, spec.step);
  }
  return out as unknown as RaceControls;
}

/** Crew weight is a class limit, not a slider, so it is clamped not snapped. */
function crewOf(kg: number): number {
  return Math.min(activeBoat.crew.maxKg, Math.max(activeBoat.crew.minKg, kg));
}

export const PRESETS: Preset[] = [
  {
    id: 'light',
    label: 'Light day',
    condition: { twsKt: 6, twaDeg: 45, seaState: 0, crewKg: crewOf(300), sailset: 'jib' },
    race: trim({
      backstay: 10,
      mainsheet: 60,
      traveller: 40,
      cunningham: 0,
      outhaul: 45,
      vang: 10,
      jibSheet: 60,
      jibLead: 4,
      inhauler: 30,
      mainHalyard: 40,
      jibHalyard: 40,
    }),
  },
  {
    id: 'medium',
    label: 'Medium day',
    condition: { twsKt: 12, twaDeg: 42, seaState: 1, crewKg: crewOf(300), sailset: 'jib' },
    race: { ...BASE_RACE },
  },
  {
    id: 'heavy',
    label: 'Heavy day',
    condition: { twsKt: 18, twaDeg: 40, seaState: 2, crewKg: crewOf(320), sailset: 'jib' },
    race: trim({
      backstay: 70,
      mainsheet: 75,
      traveller: 0,
      cunningham: 60,
      outhaul: 85,
      vang: 55,
      jibSheet: 75,
      jibLead: 7,
      inhauler: 10,
      mainHalyard: 60,
      jibHalyard: 70,
    }),
  },
  {
    id: 'downwind',
    label: 'Downwind',
    condition: { twsKt: 12, twaDeg: 145, seaState: 1, crewKg: crewOf(300), sailset: 'asym' },
    race: trim({
      backstay: 10,
      traveller: 0,
      cunningham: 0,
      outhaul: 100,
      vang: 40,
      jibSheet: 0,
      inhauler: 0,
      // Last, so the one downwind number that lives in the boat JSON wins
      // over anything above it rather than being restated here.
      ...BASE_RACE_DOWN,
    }),
  },
];

/**
 * The condition the app opens on, before any link or stored session. It is
 * named rather than left inline in the store because two other things need
 * the same values: the cold-load restore cue, which is "the session differs
 * from this", and its Reset, which is "put this back" (audit ux-04 L-01).
 * Deliberately not the Medium preset — that is a *starting point you chose*,
 * and a session that equals it is not the same thing as a session nobody has
 * touched.
 */
export const DEFAULT_CONDITION: Condition = {
  twsKt: 10,
  twaDeg: 42,
  seaState: 1,
  crewKg: crewOf(300),
  sailset: 'jib',
};

export const SEA_STATES: { value: SeaState; label: string }[] = [
  { value: 0, label: 'Flat' },
  { value: 1, label: 'Ripple' },
  { value: 2, label: 'Chop' },
  { value: 3, label: 'Steep' },
  { value: 4, label: 'Waves' },
];

class Conditions {
  twsKt = $state(DEFAULT_CONDITION.twsKt);
  twaDeg = $state(DEFAULT_CONDITION.twaDeg);
  seaState: SeaState = $state(DEFAULT_CONDITION.seaState);
  crewKg = $state(DEFAULT_CONDITION.crewKg);
  sailset: SailSet = $state(DEFAULT_CONDITION.sailset);

  /** Reading this tracks every field, so an effect on it re-runs on any change. */
  get value(): Condition {
    return {
      twsKt: this.twsKt,
      twaDeg: this.twaDeg,
      seaState: this.seaState,
      crewKg: this.crewKg,
      sailset: this.sailset,
    };
  }

  apply(c: Condition): void {
    this.twsKt = c.twsKt;
    this.twaDeg = c.twaDeg;
    this.seaState = c.seaState;
    this.crewKg = c.crewKg;
    this.sailset = c.sailset;
  }
}

export const conditions = new Conditions();
