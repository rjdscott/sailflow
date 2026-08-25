/**
 * The canonical base state: dock rig at the tuning-guide base setting and
 * race controls at a mid-range, guide-ish trim.
 *
 * This is the datum the shape deltas in `toOrc.ts` are measured against, so
 * by construction every delta is zero here. Tests use it as the reference
 * point for every monotonicity sweep.
 */
import boatJson from '../../../data/boats/j70.json';
import type { BoatDefinition, DockControls, RaceControls, SailId, SailShape } from '../types';
import { rigState } from '../rig/state';
import { flyingShape } from './flying';

/**
 * Dock base: zero turns from the guide's base rig, forestay at base length.
 * prov: North J/70 tuning guide base (Loos PT-2 22 uppers / 12 lowers).
 */
export function baseDock(): DockControls {
  return { upperTurns: 0, lowerTurns: 0, forestayMm: 0 };
}

/**
 * Race base: mid-range trim for a boat sailing upwind in the guide's base
 * wind band, read from `data/boats/j70.json` (`baseRace`; prov: assumed — the
 * North guide publishes qualitative settings, not percentages).
 *
 * The JSON is the one source. Race mode's default trim
 * (`src/ui/stores/conditions.svelte.ts`) reads the same block, so the datum
 * the shape deltas are measured against and the trim the sliders start on
 * cannot drift apart again (cockpit phase 05, carried from phase 03).
 */
export function baseRace(): RaceControls {
  return { ...(boatJson.baseRace as RaceControls) };
}

/** Flying shapes at the base state, for the sails asked for. */
export function referenceShapes(
  boat: BoatDefinition,
  sails: readonly SailId[],
): Partial<Record<SailId, SailShape>> {
  const race = baseRace();
  const rig = rigState(boat, baseDock(), race.backstay);
  const out: Partial<Record<SailId, SailShape>> = {};
  for (const s of sails) out[s] = flyingShape(boat, rig, race, s);
  return out;
}
