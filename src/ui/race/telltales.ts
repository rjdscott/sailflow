/**
 * Telltale state, per station, for both pictures of the boat.
 *
 * The plan view had this arithmetic inline; the 3D hero had none of it and
 * waved its ribbons off a clock instead, so the two pictures on the same
 * screen could disagree about the same trim (plan risk 2, owner's report
 * 2026-08-28). One module, one answer: `PlanView.svelte` and
 * `three/SailView3D.svelte` both read their ribbons from here.
 *
 * The physics stays in `boat.ts` (`localAoa`, `luffRibbon`, `leechRibbon`) —
 * this only says which stations get read and against what entry angle, which
 * is the part the two views have to share. Extraction was behaviour-preserving:
 * `telltales.test.ts` holds the plan view's answers as they were before the
 * move.
 */
import { leechRibbon, localAoa, luffRibbon, type Ribbon } from './boat';

export type { Ribbon };

/** Jib luff stations, fractions of luff length, tack to head. */
export const JIB_LUFF_STATIONS = [0.25, 0.5, 0.75, 1] as const;

/** Leech stations: the top batten first, then mid-leech. */
export const MAIN_LEECH_STATIONS = [0.75, 0.5] as const;

/**
 * Target entry angle of attack the luff ribbons are read against, degrees.
 * prov: assumed 12° — the flying shape's own `entryDeg` mixes datums (camber
 * plus inhauler) and is not this angle.
 */
export const ENTRY_DEG = 12;

/** A ribbon's state at a station, `at` being the fraction up the edge. */
export interface TelltaleState {
  at: number;
  state: Ribbon;
}

/** Jib luff ribbon at fraction `at` up the luff. Sheeting angle in degrees. */
export function jibLuffState(
  awaDeg: number,
  sheetDeg: number,
  twistTopDeg: number,
  at: number,
): Ribbon {
  return luffRibbon(localAoa(awaDeg, sheetDeg, twistTopDeg, at), ENTRY_DEG);
}

/** The jib luff, station by station. */
export function jibLuffStates(
  awaDeg: number,
  sheetDeg: number,
  twistTopDeg: number,
  stations: readonly number[] = JIB_LUFF_STATIONS,
): TelltaleState[] {
  return stations.map((at) => ({ at, state: jibLuffState(awaDeg, sheetDeg, twistTopDeg, at) }));
}

/**
 * A leech, station by station. `sheetDeg` is the spar's sheeting angle, so the
 * same function reads the main's leech off the boom and the jib's off the jib
 * lead — a leech stalls for the one reason either way, too little twist over a
 * too-closed spar.
 */
export function leechStates(
  awaDeg: number,
  sheetDeg: number,
  twistTopDeg: number,
  stations: readonly number[] = MAIN_LEECH_STATIONS,
): TelltaleState[] {
  return stations.map((at) => ({ at, state: leechRibbon(awaDeg, sheetDeg, twistTopDeg, at) }));
}
