# Second-class readiness: what a J/24 costs today

- **Question:** How much work is a second boat class, and what exactly is in
  the way? (audit [`ux-02` L-05](../../audits/2026-08-25-ux-02/04-shell-and-strategy.md#l-05))
- **Date:** 2026-08-25
- **Method:** `grep -rn "boats/j70.json"` over `src/`, `validation/`,
  `calibration/` and `scripts/` at the drills-and-loop phase-05 worktree, then
  reading each site for what it actually needs from the boat.
- **Status:** Assessment only. No code changed by this file; the refactor is
  unscheduled.

Decision [#13](04-decision-log.md) committed to "one `BoatDefinition` JSON per
boat, no plugin abstraction". That is still the right shape. What is in the way
is not the abstraction — it is that eight modules reach for the file by path
instead of asking for the active boat.

## The eight production import sites

Each is `import <name> from '.../data/boats/j70.json'` at the line given.

| # | Site | What it takes from the boat | Notes |
|---|------|------------------------------|-------|
| 1 | `src/ui/solverClient.ts:8` | the whole `BoatDefinition`, sent to the worker as `loadBoat` | The single point where the boat enters the physics; the other seven are UI convenience reads. |
| 2 | `src/ui/race/store.svelte.ts:9` | control ranges and base trim for the race controls | |
| 3 | `src/ui/race/boat.ts:14` | hull and sailplan dimensions for the plan-view drawing | Module-level constants derived at import time. |
| 4 | `src/ui/race/RigElevation.svelte:2` | mast, shroud and forestay geometry | |
| 5 | `src/ui/race/ConditionsStrip.svelte:2` | control ranges for the wind/condition strip | |
| 6 | `src/ui/dock/logic.ts:14` | dock control ranges and the guide base tune | |
| 7 | `src/ui/drills/DrillView.svelte:9` | control ranges for the drill sliders | |
| 8 | `src/lib/drills.ts:13` | control ranges to build and score drills | Also imports `data/drills/j70-static.json` on the next line — see below. |

Four more sites are outside the app and are refactored differently: the
harness (`validation/compare.ts:11`) and the fitter
(`calibration/fit.ts:695`, which *writes* the file) are per-boat by nature and
should take a boat argument or a CLI flag, not read a store; and
`scripts/provenance.mjs:11` reads `data/boats/j70.json` by name rather than by
glob, so a second boat file would be invisible to `make docs-check` — the bug
`docs/runbooks/add-a-boat-class.md` already warns about. Fourteen test files
import the J/70 directly and should keep doing so: a test wants a *specific*
boat, not the active one.

## Not just the boat file

Three sibling couplings have the same shape and would otherwise be discovered
mid-refactor:

- **Tuning guides.** `src/lib/reference.ts:14-15` imports
  `data/tuning/north-j70.json` and `quantum-j70.json` by path, and
  `src/ui/disagree/Panel.svelte:319` prints `data/tuning/{id}-j70.json` as a
  literal in the provenance line. The disagreement panel is a headline feature,
  so a class with no published guide needs a defined empty state, not a crash.
- **Drills.** `src/lib/drills.ts:14` imports `data/drills/j70-static.json`. Per
  ADR 0013 drills become generated fault templates, so this becomes "which
  template file for which class".
- **The polar.** `data/polar/orc-j70.json` is referenced only through
  `validation/`, which is already the per-boat harness, so it costs nothing
  extra.

## Estimated cost

Mechanical and small *today*, and it grows with screen count — every new screen
that reads a control range adds a ninth, tenth, eleventh site.

| Step | Estimate |
|------|----------|
| `src/lib/boat.ts` exporting the active `BoatDefinition` (a module constant now; a `$state` store the day a picker exists), plus a `boat.assets` lookup for the guide/drill/polar file per class | 0.5 day |
| Repoint the eight sites; `boat.ts` and `drills.ts` need their import-time constants deferred behind a function or `$derived` | 0.5 day |
| Guides and drills keyed by class in `reference.ts` / `drills.ts`, with an honest empty state in the disagreement panel | 0.5 day |
| Glob `scripts/provenance.mjs` over `data/boats/*.json`; `validation/` and `calibration/` take the boat as an argument | 0.5 day |
| **Total, no new class content** | **~2 days** |

Adding the class itself is then data plus calibration, not code: a measured
`BoatDefinition`, a polar to fit against, and a tuning guide to disagree with —
which is the shape decision #13 intended, and which
`docs/runbooks/add-a-boat-class.md` should be rewritten to describe once the
refactor lands.

Doing it after Epic 2 (3D rendering, more drill surfaces) costs several times
this, because the count of sites is proportional to screen count and Epic 2 is
where screen count grows.
