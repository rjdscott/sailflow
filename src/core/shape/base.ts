/**
 * The canonical base state: dock rig at the tuning-guide base setting and
 * race controls at a mid-range, guide-ish trim.
 *
 * This is the datum the shape deltas in `toOrc.ts` are measured against, so
 * by construction every delta is zero here. Tests use it as the reference
 * point for every monotonicity sweep.
 */
import type {
  BoatDefinition,
  DockControls,
  RaceControls,
  SailId,
  SailSet,
  SailShape,
} from '../types';
import { rigState } from '../rig/state';
import { flyingShape } from './flying';

/**
 * Dock base: zero turns from the class guide's base rig, forestay at base
 * length. Class-independent by construction — the dock controls are defined
 * as *deltas from the guide's base setting*, so the base is the origin for
 * every class, and the class-specific part is which rig that origin names
 * (`boat.provenance` records it per boat).
 * prov: definitional, not measured — zero is the datum, not a rig tension.
 */
export function baseDock(): DockControls {
  return { upperTurns: 0, lowerTurns: 0, forestayMm: 0 };
}

/**
 * Race base: mid-range trim for a boat sailing upwind in the guide's base
 * wind band, read from the boat's own `baseRace` block. The boat file is the
 * one source; the numbers and their provenance live there, not here.
 *
 * Race mode's default trim (`src/ui/stores/conditions.svelte.ts`) reads the
 * same block, so the datum the shape deltas are measured against and the trim
 * the sliders start on cannot drift apart again (cockpit phase 05, carried
 * from phase 03).
 */
export function baseRace(boat: BoatDefinition): RaceControls {
  return { ...boat.baseRace };
}

/**
 * Race base under the kite: the same trim with the mainsheet eased to
 * `baseRaceDown.mainsheet` — the boom out past the corner of the boat.
 *
 * The deltas in `toOrc.ts` claim to be "relative to the guide's base setup",
 * and downwind that setup is not a beat's mainsheet. Measured from the upwind
 * datum the correctly eased boom reads as ~2.2° of invented twist deviation,
 * which is enough `shapeInfluence` to demote the downwind default's own
 * outputs to tier C (ADR 0006). The reference was wrong, not the rule.
 *
 * Only `mainsheet` is picked across: `baseRaceDown` also carries the four
 * gennaker controls, which are not `RaceControls`. Same pick-key-by-key
 * reason as `BASE_RACE_DOWN` in `src/ui/stores/conditions.svelte.ts`.
 */
export function baseRaceDown(boat: BoatDefinition): RaceControls {
  return { ...baseRace(boat), mainsheet: boat.baseRaceDown.mainsheet };
}

/**
 * Flying shapes at the base state, for the sails asked for. `sailset` picks
 * the datum: upwind trim under the jib, the eased-main trim under the kite.
 */
export function referenceShapes(
  boat: BoatDefinition,
  sails: readonly SailId[],
  sailset: SailSet = 'jib',
): Partial<Record<SailId, SailShape>> {
  const race = sailset === 'asym' ? baseRaceDown(boat) : baseRace(boat);
  const rig = rigState(boat, baseDock(), race.backstay);
  const out: Partial<Record<SailId, SailShape>> = {};
  for (const s of sails) out[s] = flyingShape(boat, rig, race, s);
  return out;
}
