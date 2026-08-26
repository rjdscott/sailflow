/**
 * The boat registry: every class the app can sail, keyed by id.
 *
 * One `BoatDefinition` JSON per boat, no plugin abstraction (research
 * 2026-08-25-sailing-sim-landscape, decision #13). This module is the single
 * place that knows which files make up a class, so adding one is an entry in
 * `BOATS` plus the data files it names — `docs/runbooks/add-a-boat-class.md`.
 *
 * The reference polar is attached here rather than committed inside the boat
 * file: `data/polar/` keeps one file per source with its own provenance
 * section (`PROVENANCE.md`), and inlining a copy per boat would duplicate it.
 *
 * Static imports, not dynamic: the boat files are small, the bundler needs
 * them resolvable at build time for GitHub Pages, and `bundle_check.mjs`
 * gates the size.
 */
import j70 from '../../data/boats/j70.json';
import polarJ70 from '../../data/polar/orc-j70.json';
import type { BoatDefinition, PolarTable } from '../core/types';

/** The class shown when nothing has been chosen, and the one every gate runs on. */
export const DEFAULT_BOAT_ID = 'j70';

function withPolar(raw: unknown, polar?: PolarTable): BoatDefinition {
  return { ...(raw as BoatDefinition), ...(polar ? { polar } : {}) };
}

/**
 * Every committed class. A boat whose class has no published polar is listed
 * with none — the app still sails it, it just cannot report a percentage of
 * target (`core/reference/polar.ts`).
 */
const BOATS: Record<string, BoatDefinition> = {
  j70: withPolar(j70, polarJ70 as PolarTable),
};

/** Ids of every committed class, stable order, default first. */
export function boatIds(): string[] {
  const rest = Object.keys(BOATS)
    .filter((id) => id !== DEFAULT_BOAT_ID)
    .sort();
  return [DEFAULT_BOAT_ID, ...rest];
}

/** `{ id, name }` for every committed class — what a picker renders. */
export function boatChoices(): { id: string; name: string }[] {
  return boatIds().map((id) => ({ id, name: BOATS[id].name }));
}

export function isBoatId(id: unknown): id is string {
  return typeof id === 'string' && id in BOATS;
}

/**
 * The boat for an id, falling back to the default. Unknown ids come from old
 * share links and hand-edited settings, so this must not throw: a link naming
 * a class this build does not carry should open the default boat, not a blank
 * screen.
 */
export function boatFor(id: string | undefined): BoatDefinition {
  return BOATS[id ?? ''] ?? BOATS[DEFAULT_BOAT_ID];
}
