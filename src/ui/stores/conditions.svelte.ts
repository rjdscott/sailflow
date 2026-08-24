/**
 * The condition the race screen solves for, plus the preset buttons.
 *
 * Preset numbers are UI starting points — a plausible place to begin dragging
 * sliders from — not tuning-guide settings. The guide comparison lives in the
 * disagreement panel, not here, and the screen says so next to the buttons.
 */
import type { Condition, RaceControls, SailSet, SeaState } from '../../core/types';

/** Midpoint-ish race trim, the state every other preset moves away from. */
export const BASE_RACE: RaceControls = {
  backstay: 30,
  mainsheet: 70,
  traveller: 20,
  cunningham: 20,
  outhaul: 60,
  vang: 30,
  jibSheet: 70,
  jibLead: 5,
  inhauler: 20,
  mainHalyard: 50,
  jibHalyard: 50,
};

export interface Preset {
  id: string;
  label: string;
  condition: Condition;
  race: RaceControls;
}

export const PRESETS: Preset[] = [
  {
    id: 'light',
    label: 'Light',
    condition: { twsKt: 6, twaDeg: 45, seaState: 0, crewKg: 300, sailset: 'jib' },
    race: {
      ...BASE_RACE,
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
    },
  },
  {
    id: 'medium',
    label: 'Medium',
    condition: { twsKt: 12, twaDeg: 42, seaState: 1, crewKg: 300, sailset: 'jib' },
    race: { ...BASE_RACE },
  },
  {
    id: 'heavy',
    label: 'Heavy',
    condition: { twsKt: 18, twaDeg: 40, seaState: 2, crewKg: 320, sailset: 'jib' },
    race: {
      ...BASE_RACE,
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
    },
  },
  {
    id: 'downwind',
    label: 'Downwind',
    condition: { twsKt: 12, twaDeg: 145, seaState: 1, crewKg: 300, sailset: 'asym' },
    race: {
      ...BASE_RACE,
      backstay: 10,
      mainsheet: 20,
      traveller: 0,
      cunningham: 0,
      outhaul: 100,
      vang: 40,
      jibSheet: 0,
      inhauler: 0,
    },
  },
];

export const SEA_STATES: { value: SeaState; label: string }[] = [
  { value: 0, label: 'Flat' },
  { value: 1, label: 'Ripple' },
  { value: 2, label: 'Chop' },
  { value: 3, label: 'Steep' },
  { value: 4, label: 'Waves' },
];

class Conditions {
  twsKt = $state(10);
  twaDeg = $state(42);
  seaState: SeaState = $state(1);
  crewKg = $state(300);
  sailset: SailSet = $state('jib');

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
