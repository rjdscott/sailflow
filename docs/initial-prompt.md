## Goal

Build and publish an animated, mobile-first web app that lets an experienced keelboat sailor rehearse J/70 rig tuning and sail trim decisions, and that shows where a physics model and the published class tuning guidance disagree.

Deliver a public GitHub repository with a working GitHub Pages deployment. I will review it tomorrow. Prioritise a correct, validated, honest core over visual polish.

## Who this is for

An experienced offshore and keelboat sailor, Yachtmaster Offshore, currently racing a handicap boat and planning a J/70 one-design program. Assume fluency with twist, draft, forestay sag, leech tension, VMG, apparent wind. Do not build a learn-to-sail tutorial. Do not explain what a traveller is.

## Primary job

Train my own trim and tuning decisions, and help others too. Everything else is secondary.

## Scope

- Upwind: full control set.
- Downwind under gennaker: reduced control set, flagged as lower confidence.
- Two distinct modes, driven by the class rules (see below).

Out of scope for this build, to be run as a follow up sprint: multiplayer, race simulation, tactics, starts, 3D orbit camera, account systems, any backend.

## The rule that shapes the architecture

International J/70 Class Rules, effective 1 February 2026, rule C.9.5(a): the forestay, shrouds and backstay legs shall not be adjusted while racing, and the forestay shall not be adjusted from the time the boat leaves the dock until racing has finished for the day.

Therefore the app has two modes:

**Dock mode.** Shroud tension (upper and lower), mast rake, prebend, forestay length. These are committed once per day against a forecast wind range, then locked. Score the chosen setup across the whole forecast range, not a single wind speed, and show what it costs at the top and bottom of that range. This is the mode nobody else has built and it is the most valuable part of the app.

**Race mode.** Only running rigging moves: backstay, mainsheet, traveller, cunningham, outhaul, vang, jib sheet, jib lead car, inhauler, main and jib halyard fine tunes. Downwind adds gennaker halyard, tack line, sheet and bowsprit position.

## Evidence base

Use these sources. Cite each one in PROVENANCE.md with a link and the date you retrieved it. Do not invent numbers. Where you must assume a value, mark it clearly as an assumption in both the code and PROVENANCE.md.

**International J/70 Class Rules, effective 1 February 2026** (j70ica.org, class office rules page). Take from it:
- Minimum dry boat weight 812 kg.
- Mainsail maxima: leech 8335 mm, luff 7974 mm, foot 2876 mm, top width 364 mm, upper width 880 mm, three-quarter width 1425 mm, half width 2134 mm, quarter width 2570 mm. Five leech battens, top three full length.
- Headsail maxima: luff 8000 mm, luff perpendicular 2450 mm, top width 64 mm, three-quarter width 650 mm, half width 1250 mm, quarter width 1860 mm.
- Gennaker maxima: luff 10800 mm, leech 8800 mm, foot 5700 mm, half width 5560 mm.
- Boom outer point 2876 mm. Bowsprit outer point 1495 mm from hull.
- Standing rigging: forestay, uppers and lowers are 5 mm 1x19 stainless steel wire with open body turnbuckles. Backstay is low-stretch composite rope, minimum 5 mm.
- Purchase limits, which set the resolution and feel of each control: mainsheet 4:1 to 6:1, vang 8:1, traveller 2:1 to 3:1, backstay control 2:1 to 4:1, outhaul 4:1 to 8:1, cunningham 1:1 to 8:1, jib sheet 2:1, jib halyard fine tune 4:1 to 8:1, main halyard fine tune 1:1 to 2:1.
- Crew: 3 or more. Crew must remain aft of the mast. When hiking, the base of the spine stays on the horizontal deck surface and no part of the torso is outboard of a vertical line from the lifeline. Not more than two crew may have legs outboard of the sheerline. This bounds the righting moment model. Do not model unlimited hiking.

**ORC public one-design certificate for the J/70** (data.orc.org public one-design section). Take from it: LOA 6.910 m, maximum beam 2.254 m, draft 1.383 m, displacement 811 kg, rated mainsail 16.00 m2, rated headsail 10.01 m2, rated asymmetric 45.64 m2, crew weight range 255 to 340 kg.

**ORC Speed Guide polar for the J/70 one design** (published PDF, TWS 6, 8, 10, 12, 14, 16 and 20 knots, jib and asymmetric on centreline). This is the calibration target for the physics model.

**ORC VPP Documentation** (orc.org, current published edition). Implement its documented sail force coefficient model and depowering parameterisation rather than inventing an aero model. Cite the section numbers you implement.

**North Sails J/70 tuning guide** (published on northsails.com, current revision). This is the second predictor. See the licensing constraint below.

## Licensing constraint, important

The repository is public. Do not commit third-party tabular data.

- The North tuning guide numbers and the ORC polar table must be loaded at runtime from a local file `data/user-tables.json` which is listed in `.gitignore`.
- Commit `data/user-tables.example.json` with the correct schema, empty values, and a comment telling the user where to obtain the numbers.
- The app must run without those files, in physics-only mode, with the disagreement panel showing "reference tables not loaded".
- Your own model, your own code, your own derived validation tolerances: all committed freely.
- PROVENANCE.md links to the sources. It does not reproduce them.

## Architecture

- Pure client-side. No backend yet, no build-time secrets, no network calls at runtime.
- TypeScript. Vite. No heavyweight framework unless you can justify it in the README.
- The solver is a separate, framework-free module with no DOM dependencies, so it can be tested headlessly and reused.
- Deterministic: same inputs always produce the same outputs. No randomness in the physics.

Module boundaries:

1. `core/geometry` builds rig and sail geometry from class dimensions plus the current control state.
2. `core/rig` models mast bend from backstay and shroud tension, forestay sag, and rake. Treat the mast as a beam with the one-design section stiffness as a single calibrated parameter, and say so.
3. `core/shape` maps control state to a parametric flying shape at quarter, half and three-quarter heights: draft depth, draft position, twist, entry angle, exit angle.
4. `core/aero` implements the ORC-documented coefficient model against that shape.
5. `core/hydro` implements resistance and righting moment, with crew weight and the rule-legal hiking limit.
6. `core/solve` finds the force and moment equilibrium, returning boat speed, heel, leeway, VMG.
7. `core/reference` loads the optional third-party tables and exposes the guide's recommendation for a given condition.
8. `ui/` everything else.

## Validation first

Write the validation harness before the UI. Do not build any interface until this passes.

- The model must reproduce the ORC Speed Guide polar for the J/70 at all seven published wind speeds, upwind VMG angle and downwind VMG angle, within a stated tolerance. Choose the tolerance, justify it in the README, and make the harness fail the build if it regresses.
- If the tables are not present, the harness skips with a clear message rather than passing silently.
- Free parameters in the rig and shape models are calibrated so the model's optimum rig tension and rake at each wind band land near the published tuning guide base settings. Record the residual.
- Print a validation report to `validation/report.md` on every run, committed.

## The disagreement panel

This is the feature I care most about. For any condition and control state, show three things side by side:

1. What my physics model says the optimum is.
2. What the tuning guide recommends.
3. The delta, in the units that matter (shroud tension turns, rake in mm, jib lead position, target boat speed and height).

When they diverge, say so plainly and do not resolve it silently in favour of either. Log every divergence to a local history so patterns are visible over time.

## Mobile UX constraints

Primary use is a phone, on a dock, in sunlight, one-handed, possibly with wet fingers and no signal.

- Design for a 380 px viewport first. Desktop is a stretched version of the same layout, not a different one.
- 2D, not 3D. Show sail sections as slices at three heights plus a rig elevation showing bend, rake and forestay sag. No orbit camera. No WebGL unless you can prove it is faster than canvas for this.
- Controls must be usable with a thumb. Minimum 44 px targets. Sliders with numeric readouts and the class-legal purchase-derived increments.
- High contrast. Readable in direct sun. Respect dark mode.
- Every displayed number rounded to a sensible precision. No float artifacts.
- PWA with a service worker so it works fully offline after first load.
- No localStorage assumptions beyond what a PWA on iOS Safari reliably supports. Persist the tuning log to IndexedDB and provide JSON export.

## Tuning log

A first-class feature, not an afterthought. Records: date, venue, forecast, actual wind range, sea state, crew weight, the dock-mode setup committed, the race-mode settings used, and free-text notes on what was fast. Exports to JSON and CSV. This is where the app becomes useful beyond the simulator.

## Repository requirements

- Public repo, MIT licence.
- README stating clearly, near the top, what this model is and is not. Specifically: it implements a documented parametric VPP, calibrated against published polars, and parametric VPPs are known to under-predict relative to CFD-based programs. It is a decision-rehearsal tool, not a wind tunnel.
- PROVENANCE.md listing every number, its source, the retrieval date, and whether it is measured, published, derived or assumed.
- ASSUMPTIONS.md listing every free parameter, its calibrated value, and how it was calibrated.
- GitHub Actions workflow that runs the validation harness and typecheck on push, then deploys to GitHub Pages on main.
- Conventional commits. Small, reviewable commits, not one giant drop.

## Acceptance criteria

I will check these tomorrow, in this order:

1. The Pages URL loads on a phone and works offline after first visit.
2. `validation/report.md` exists and shows the polar match against the stated tolerance.
3. Dock mode lets me commit a rig setup against a forecast range and tells me what it costs at each end of that range.
4. Race mode responds to every class-legal control with a visible shape change and a speed and height number.
5. The disagreement panel works, and degrades honestly when reference tables are absent.
6. PROVENANCE.md accounts for every number in the app.
7. No third-party tabular data is committed.

## How to handle uncertainty

Where the evidence does not settle a question, do not guess quietly. Implement your best assumption, mark it in ASSUMPTIONS.md, and surface it in the UI with a confidence indicator. I would rather have a model that tells me where it is weak than one that is confidently wrong.

Downwind under gennaker is the weakest part of any parametric VPP. Mark it as such in the interface.

If you run out of time, cut in this order: downwind, then the tuning log export, then visual polish. Never cut the validation harness or the provenance documentation.