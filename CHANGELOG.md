# Changelog

All notable changes to Sailflow are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) — pre-1.0, so the
minor number moves when the app gains or changes a surface.

Entries below 0.2.0 were reconstructed from the squash-merged PR titles #1–#40,
which are the permanent commit messages (see `CLAUDE.md`, "Branch + PR
discipline"). Bump `package.json` and add a section here per merged batch: the
version string is rendered on the More screen, so a stale one makes a bug report
undiagnosable.

## [Unreleased]

### Changed

- **Dock, Log, Drills and More wear the cockpit** (ADR 0015), with no change
  to what is on which screen. Every card sits on the raised `--surface-2` the
  Race panels use; the Dock's expected regret, the two ends of the forecast
  band and its worst case, the drill score sheet's "off optimum" and "VMG
  lost", and More's drill streak all render through the one instrument-cell
  contract, each with its tier badge and a delta that names what it is
  measured against. The Dock's regret card waits with the instrument bar's
  1 px sweep instead of fading the number you are waiting for. The
  model-vs-guides panel drops its column-header row — every cell names its own
  source, so three sources of numbers wrap to one column on a phone — and
  still shows Δ = model − guide in plain ink, picking no winner.
- The nav rail and phone tab bar are real links (`<a href="#/dock">`) with
  `aria-current="page"`, and the tab bar gained the rail's 3 px accent
  indicator so the current tab is not colour alone. Toasts are raised cockpit
  panels rather than an inverted white slab, and committing a rig now raises
  one.

### Fixed

- 3D hero: jib luff telltales sat on the forestay wire; they now sit 15 % aft of the luff, and the jib carries upper-leech ribbons (the North jib cue) alongside the main's. New "Helm" camera preset: from the cockpit looking up the main. Orbit may now look upward (polar clamp relaxed).
- 3D hero: main leech ribbons rooted 1 m off the leech after the telltale rewrite; anchor maths now lives in `loft.ribbonAnchor` under test.
- 3D hero perf gate timed the first render, which includes context creation and shader compiles, so it fell back to the plan view on every device (seen on a desktop GPU). It now times a warm second frame.
- Default theme is dark (ADR 0015 dark-first); Auto and Light remain selectable on More.

### Added

- The cockpit's last two panels (ADR 0015). **Helm & conditions** puts the
  heel gauge and the helm-load bar side by side — helm feel only reports trim
  while heel is steady, so neither is shown without the other — with a mode
  selector (high / VMG / fast upwind, plane / soak / wing / VMG downwind,
  steered off the angle the point-of-sail chip solved for), the crew-weight
  slider, a crew fore-aft position that is logged rather than solved and says
  so, and the kite controls under the gennaker. **Rig** is dock-gated: with
  nothing committed today it is the three dock sliders and a way to the Dock;
  once committed it reads the tune back, adds rake and prebend, and prints
  the wind-range gear chart from North or Quantum with your wind's row lit up
  and the source named.
- **A/B compare** in a new actions bar: swap between the trim on the sliders
  and the one you left, keeping _both_, with the objective delta between them
  and the controls that differ outlined. Keyboard `b`. Unlike "Back to my
  trim", pressing it twice is exactly where you started.
- **Puff replay** (keyboard `p`): a scripted gust — 8 → 14 → 10 kt, or a lull
  or a ±8° shift — solved a step at a time, lighting the panels in the order
  the power state calls for (Ingham's "controls, hike, ease, point, trim" in
  the transition, "ease, point, trim" overpowered) and showing the optimum's
  moves as ghost bugs. It is a slideshow of steady-state solves, not
  time-domain physics, and restores the wind exactly when it finishes or is
  stopped.
- Drills use the same instrument bar as Race, so a drill and a race read the
  same numbers the same way; `Readouts.svelte` is retired.

- Race mode's controls are two task-named cockpit panels (ADR 0015).
  **Mainsail** carries mainsheet, traveller, backstay, vang, outhaul and
  cunningham with the main halyard under a collapsed "Setup", beside the
  main's own section stack, a leech profile showing the boom angle and the
  top-batten angle, a leech-stall bullet gauge against the guide's 50–70 %
  band, and batten and draft cells. **Headsail** carries jib sheet, lead and
  inhauler beside the jib's section stack, a spreader-stripe gauge reading
  18/20/22" and a headstay-sag bar; under the kite it says the jib is not
  flying and locks its controls. `ControlPanel` is retired; the kite and dock
  rows keep a temporary card below the panels until phase 05 gives them one.
- Sliders gained an always-visible −/+ stepper (race and analyse tiers), a
  fatter 6 px track, a mark at the base trim, and an outline preview: hover
  or focus Apply optimum, "Back to my trim" or the new "Base trim" button and
  the sliders it would move outline themselves before it moves them.
- Keyboard: `m` jumps to the Mainsail controls, `j` to the Headsail controls.

- Four cockpit instruments on every solve (`SolveResult.instruments`, protocol
  v1, additive): main leech stall fraction, jib leech position against the
  18/20/22" spreader stripes, a weather-helm load proxy, and boat speed as a
  percentage of the ORC Speed Guide polar for the sail being carried. The
  first three are tier C, direction only; `%POLAR` is tier A inside the
  printed grid and C outside it. Assumptions and the stall meter's known
  ceiling are in `ASSUMPTIONS.md`.
- Race mode's readouts are now an instrument bar: BSP, %POLAR and VMG with
  target bugs and trend lines, TWA, a heel bullet gauge against the guide's
  wind-dependent target band, a helm load bar beside it, and one verdict
  sentence — "0.20 kt below target: main leech stalled, ease". Learn drops the
  angle and the helm bar and leads with the verdict; Analyse adds the two
  leech readings. Drills keeps the old readouts card for now.
- Solver invariants 15–18: leech stall rises with mainsheet, the jib stripe
  moves outboard as the lead goes aft, helm load rises as the crew comes off
  the rail, and `%POLAR` reads 100 ± 10 on every calibration fit row.

- Local-first usage counters (`src/lib/telemetry.ts`): screen views, drills
  started and checked, apply-optimum, rig commits and log saves, counted in
  IndexedDB on the device. An "Improve Sailflow" card on More shows them, with
  "Export usage JSON" and "Reset". Nothing is uploaded — the module has no
  network path and a test enforces that.
- "This felt wrong" on More: a prefilled GitHub issue carrying the screen and
  the app version, and nothing else. The helper is exported so Race and Drills
  can adopt it.
- `CHANGELOG.md`, linked from the version line on More.
- CI job `validate`: regenerates the polar hold-out report on every push,
  prints the held-out rows and the gate verdict in the job summary and uploads
  the report. Non-blocking while the gate has known failures.
- Addressable scenarios: `#/race?tws=…&twa=…&sea=…&crew=…&set=…&r=…` carries the
  condition and the whole race trim, written debounced with `replaceState` and
  read back on load or paste. `#/drills/<template>/<seed>` is parsed too.
- The session — condition, race trim and dock forecast — survives a reload,
  under `sailflow.session.v1`. A link wins over the stored session.
- Keyboard shortcuts on Race: `1`–`5` point of sail, `[`/`]` (and the arrow
  keys) to nudge the focused slider, `o` apply optimum, `u` undo, `?` for the
  list.
- Tap any readout label — BSP, Height, VMG, Heel, Leeway, AWA, Depower — for a
  one-paragraph explanation of the quantity.
- Provenance, Assumptions and the validation report are bundled with the app
  and open in a sheet from More, so they work with no signal. GitHub links kept.
- "Print tuning card" on Dock: rig setup, guide band, forecast and the
  per-wind-speed regret table on one sheet, with the app furniture hidden.
- A Motion setting on More (System / On / Reduced) overriding the OS
  reduce-motion preference, and a Detail setting carrying Simple/Advanced.
- "Log this trim" on Race, a committed-forecast chip on the conditions strip,
  a one-line purpose statement on Race and a wordmark on both navigations.

### Changed

- **One base trim.** The solver's `baseRace()` and Race mode's default trim
  were two different trims — Race sheeted harder (main 70 %, jib 70 % against
  60/60), so the meters were calibrated on a trim the screen never started
  from. Both now read one `baseRace` block in `data/boats/j70.json`. No
  physics moved: every value in the golden corpus is byte-identical, and only
  the boat-geometry hash changed.
- **The main leech stall meter is rescaled.** It now reads the leech's twist
  against the twist that would put the sail on the sheeting model's optimum,
  rather than borrowing that model's lift-loss e-fold — which had confined the
  whole upwind range to 0–0.11 and made the guides' 50–70 % band unreachable.
  Upwind the base trim now reads 0.53, inside the band; the mainsheet hard on
  reads 0.80 and well eased 0.09. Still tier C, still a direction.
- **The jib spreader-stripe reading is offset by 3.2 inches**, calibrated so
  the base trim sits on the middle 20" stripe where the guide puts it. It
  previously read −0.6 there — hooked inside the inner stripe — so the verdict
  line asked for lead aft from the trim the guide calls right.
- The PWA "new version available" prompt is an in-app toast with a Reload
  action instead of a native `confirm()`.
- Simple/Advanced is one control on More rather than a header segment on every
  screen; Race keeps a chip, the screens it did not change no longer show it.
- Each screen sets its own `<title>` ("Race · Sailflow") and starts at the top
  of the page.
- The `#/kit` design-system screen is dev-only and no longer ships; an
  unrecognised hash falls back to Race and says so in the console.
- The "Flat" readout is "Depower (flat)", so it no longer collides with the
  flat sea state.

### Fixed

- Light-air backstay direction (ux-02 H-04): the shape layer measured its
  CLmax/CD0 penalties against a single wind-independent datum, so the model
  wanted backstay on in 6 kt and too little in 20 kt. The target draft is now
  wind-dependent (`shape.draftTargetPerKt`, `prov: assumed`, direction only),
  which puts the model's backstay at 0 % in 6 kt and 65 % in 20 kt against the
  guides' 25 % and 90 %. The hold-out gate is unchanged at 21/25.

## [0.1.0] — 2026-08-25

Epic 1: a steady-state J/70 VPP analyser — Dock mode, Race mode, disagreement
panel, tuning log and drills — with an offline PWA shell and no backend.

### Added

- Physics core: type contracts, worker protocol, boat validator and reference
  data with provenance (#2); calibrated J/70 VPP with hold-out validation, a
  golden corpus and app integration (#9); per-control trim optimum via
  coordinate descent (#28); sheeting-angle efficiency in race mode (#38).
- Race mode: sail sections, rig elevation, plan view and coach line (#5);
  point-of-sail chips and an inline wind stepper (#27); a plan-view J/70
  illustration with live sails, telltales and a heel glyph (#19); telltale
  flutter, heel tilt, eased tweens and TWS-scaled arrows (#29); ghost optimum
  ticks, targets and Apply with undo (#33).
- Dock mode: forecast, regret card, suggest and the commit-for-today lock (#8);
  a provisional first pass with coarse lap budgets and worker progress (#35).
- Disagreement panel, guide reference lookup and divergence log (#6).
- Tuning log: store, JSON/CSV export and import, Log screen (#4).
- Ten static trim drills scored against the solver optimum (#7).
- Shell: design tokens, primitives, hash-routed shell and stub solver client
  (#3); design-system shell with a desktop nav rail and Race rebuilt (#15);
  desktop layouts and a visual pass for Dock, Log, Drills and More (#14);
  keyboard and screen-reader model for sliders, badges and segmented controls
  (#30); phone flow and loading states (#31).
- Offline PWA, IndexedDB tuning log, visual fixes and runbooks (#11).
- Provenance tagging on every physics literal, gated in `docs-check`, with the
  model's honest weaknesses written down (#10).
- Repo scaffold: Svelte 5, CI, plan and research (#1).

### Fixed

- Telltales read local angle of attack; traveller + is up; main leech telltales
  (#22), then telltale tuning so base trim streams and the main pair agrees
  (#24).
- Two-column screen grid from 720 px, so tablets and narrow desktops are not a
  stretched phone (#18); the boat hero fills its card on wide screens (#20);
  quiet metrics wrap at 390 px and regret copy reads as a cost (#17); target
  lines wrap inside their readout cell (#37).
- A tapped point-of-sail chip stays active after its solve; the jib is hidden
  under the kite (#34).
- Audit ux-01 P0 remediation: C-01 and H-01–H-05 (#26).

### Changed

- Golden corpus regenerated after the traveller label change (boat hash) (#23).

Documentation-only PRs (#12, #13, #16, #21, #25, #32, #36, #39, #40) are not
listed; the plans, audits and ADRs they carry live under `docs/`.
