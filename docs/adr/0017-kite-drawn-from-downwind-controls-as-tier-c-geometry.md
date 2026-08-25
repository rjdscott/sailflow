# 0017. The gennaker is drawn from the downwind controls by a UI-side, tier-C geometry mapping, not by the solver

- **Status:** Accepted; luff direction, leech and core scope amended 2026-08-26
- **Date:** 2026-08-25

## Context

Under `sailset = 'asym'` (Broad reach, Run) the solver carries the kite: the
ORC aero tables, the polar curves and the depower reduction all switch, and
`shape.asym` is produced. But `shape.asym` is a set of constants
(`src/core/shape/flying.ts`: "DownControls are not part of FlyingShapeFn"),
the kite sheet, tack line, halyard and sprit are tier-C controls that change
no number ("Downwind is direction only"), and neither the 3D hero nor the
plan view draws a kite — they hide the jib and stop. The owner's report:
"no spinnaker mode is working, it's not deployed". A trim trainer whose
downwind sail never appears is not teaching downwind.

Making the kite respond to its controls needs a mapping from the four
`DownControls` to a drawn shape. Two places could own it.

## Options considered

**A. Extend the solver: DownControls enter `FlyingShapeFn` and `shape.asym` moves.**
- Pros: one source of truth; the numbers could follow.
- Cons: there is no calibration data for kite shape versus sheet, so the
  physics would be invented and then carried at tier C through a layer that
  is otherwise faithful ORC; it touches the hold-out gate for no gain; it
  turns a rendering need into a physics change.

**B. A pure UI-side mapping from DownControls to kite geometry, tier C, provenance-tagged.** (chosen)
- Pros: `src/core` stays untouched and deterministic; the mapping lives
  beside the loft it feeds; it is honest — labelled C, direction-only, and
  every number in it is `prov:` tagged; it can be replaced by a solver output
  later without touching the panel.
- Cons: two shape sources (solver constants for camber; UI mapping for
  position, luff sag and curl); the picture can suggest more than the
  numbers know.

**C. Draw a static kite; ignore the controls.**
- Pros: cheapest.
- Cons: a sail that does not move under its sheet is a poster, not a
  trainer.

## Decision

**We will draw the gennaker in the 3D hero, the plan view and its own
section stack from a pure, tested UI-side mapping of the four downwind
controls to geometry, at tier C, because the solver has no calibrated
downwind shape model and inventing one in the physics layer would cost the
layer its honesty.** The mapping (`src/ui/three/kite.ts`) sets: tack point
from `sprit` (fraction of `bowspritOuterMm`) and `tackLine` (height above
the sprit); head at the masthead with luff length from `kiteHalyard`; clew
from `kiteSheet` (eased = clew forward and outboard, luff sagging to
leeward, the luff-curl cue on); camber and draft position from
`shape.asym`. Every constant carries `prov: assumed` and a row in
`ASSUMPTIONS.md`. The panel says "direction only" wherever it shows a number
from this mapping.

## Consequences

Easier: the kite is on screen and answers its controls; the Headsail slot
becomes a Gennaker panel under the kite without a solver change. Harder:
the cue "ease until the luff curls" is a geometric threshold, not aero; it
must be labelled as such. Committed to: `src/core` untouched by this work;
the hold-out gate unchanged. Cost to unwind: replacing the mapping with a
solver output is a one-file swap at the loft boundary.

**Revisit when:** a downwind shape dataset exists (photographs with sheet
positions, or a class coach's curl-onset table), at which point the mapping
moves into the solver under ADR 0006's tiering.

### Consequences — 2026-08-26 note (audit docs-consistency-01)

Three clauses of the Decision are no longer what the code does (H-07):
the luff bows **to windward across the centreline past ~102° AWA**
(`luffLateral`, published endpoints 64°/141°, #76), not to leeward
unconditionally; the leech **bulges to leeward and forward** on a profile
peaking at ~63 % height so the head opens as the sheet eases (#80); and
`src/core` **was** touched under the same plan — `asymShape`'s camber, draft
position and twist were re-based on measured flying shapes (#76) and the
spinnaker `flatmin` set to ORC's 0.53 (#75), each with the hold-out report
diffed. Tags are now per constant (`published`/`derived`/`assumed`, see
`ASSUMPTIONS.md`), not uniformly assumed. The revisit trigger has partly
fired: a measured shape-vs-AWA dataset exists (Deparday, `F1`) and was
applied; curl onset versus sheet is still unmeasured and stays tier C.

## Related

ADR 0006 (tiers), ADR 0014 (3D hero), ADR 0015 (sail-system panels);
plan `docs/plans/2026-08-25-desktop-kite/`; `ASSUMPTIONS.md` kite rows.
