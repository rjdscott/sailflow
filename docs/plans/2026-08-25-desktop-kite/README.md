# Desktop fit and the kite: a cockpit that fills a real screen and sails downwind

**Goal:** on a 1920×1080 monitor the whole cockpit is on screen with nothing
hidden; on a 14" laptop (1536×864) the primary controls are in the first
viewport and one scroll reaches the rest; and under Broad reach / Run the
gennaker is drawn, answers its four controls, and has its own panel.

## Scope

- Desktop layout ≥ 1280 px: fluid width, content-sized rows, no internal
  panel scrolling, components grow with the room (ADR 0016).
- Gennaker geometry in the 3D hero, the plan view and a section stack,
  driven by `DownControls` through a tier-C UI mapping (ADR 0017).
- The Headsail panel becomes the Gennaker panel under `asym`; Helm loses its
  Kite section.

## Non-goals

- Phone and tablet layouts (unchanged).
- Any change to the hold-out gate's tolerances. (`src/core` is touched only
  by phases 05 and 06, each with the validation report diffed in its log.)
- The ux-03 Medium/Low punchlist beyond M-01 and M-04, which this plan
  closes as a side effect.

## Status

| NN | Phase | Status | Last update |
|----|-------|--------|-------------|
| 00 | [ADRs and plan](phase-00-adrs-and-plan.md) | 🟢 Completed | 2026-08-25 |
| 01 | [Desktop layout: fill the screen, no internal scroll](phase-01-desktop-layout.md) | 🟢 Completed | 2026-08-25 |
| 02 | [Kite geometry: loft, plan view, section stack](phase-02-kite-geometry.md) | 🟢 Completed | 2026-08-25 |
| 03 | [Gennaker panel](phase-03-gennaker-panel.md) | 🟢 Completed | 2026-08-25 |
| 04 | [Verify and close out](phase-04-close-out.md) | 🟢 Completed | 2026-08-25 |
| 05 | [Kite flying shape from the research](phase-05-kite-shape-from-research.md) | 🟢 Completed | 2026-08-25 |
| 06 | [Core downwind corrections](phase-06-core-downwind-corrections.md) | 🟢 Completed | 2026-08-25 |

Order: 00 → 01 ∥ 02 → 03 ∥ 05 ∥ 06 → 04. Phases 03, 05 and 06 touch disjoint
files and run in parallel; 04 closes out after all of them. 05 and 06 were
added after research `2026-08-25-spinnaker` (owner: "do the deep dive on
spinnaker physics and the shape and trimming best practices").

## Critical files

`src/ui/screens/Race.svelte` (cockpit grid), `src/ui/components/{Panel,Slider}.svelte`,
`src/ui/race/panels/{ControlRow,Headsail,Helm}.svelte`, `src/ui/race/InstrumentBar.svelte`,
`src/App.svelte` (`main` max-width), `src/ui/tokens.css` (`--content-max`),
`src/ui/three/{kite.ts,SailView3D.svelte,loft.ts,rig3d.ts,hull.ts}`,
`src/ui/race/{PlanView,SailSectionStack}.svelte`, `src/ui/race/geometry.ts`,
`tests/ui/race.spec.ts`, `tests/ui/race-3d.spec.ts`, `ASSUMPTIONS.md`.

## Top risks

1. Growing components pushes 1536×864 below the "primary controls in the
   first viewport" bar — phase 01 measures both sizes in Playwright before
   any restyle.
2. The kite loft's head/foot extrapolation from one `halfMm` girth
   dominates the silhouette — phase 02 fits the ORC girths explicitly and
   tests the section widths against the sail definition.
3. Sign conventions (tack side, leeward) drift between the jib and the kite
   — phase 02 reuses `conventions.ts` and asserts the clew is to leeward.
4. The Headsail → Gennaker swap breaks keyboard/puff/keys wiring that assume
   `headsail` ids — phase 03 keeps the panel id and the `j` key.

## Implements

- ADR 0016, ADR 0017; audit ux-03 M-01, M-04; owner direction 2026-08-25
  ("expand the surface to a proper desktop monitor or 14-inch laptop screen
  as default, then scale down"; "spinnaker mode is not deployed").

## State at end of the fifth autonomous block (2026-08-25)

- All phases 🟢. Main at
  `1be7c2e` after #68–#76.
- Live: desktop cockpit fills the screen with no internal scroll; gennaker
  drawn and trimmable from its own panel; solver spinnaker floor per ORC.
- Next block, in order: (1) downwind mainsail trim — at 150° TWA the boom
  still sits at the upwind sheet mapping's angle; the optimum and the drawn
  boom need a downwind ease (research doc 03 gives the numbers);
  (2) ux-03 M-23 — `ASSUMPTIONS.md`/`PROVENANCE.md` are imported `?raw` into
  first load and now cost ~10 KB gzip; lazy-load them behind the More
  disclosure; (3) `TACK_TRAVEL_M` (0.6 m vs the class 0–0.30 m band) and
  `HALYARD_DROP_M` per `ASSUMPTIONS.md`; (4) ORC downwind flat/reef coupling
  and the ~21.5° spinnaker heel ceiling (research doc 01 §2.4);
  (5) the remaining ux-03 Mediums.
