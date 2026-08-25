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

### Added

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

### Changed

- The PWA "new version available" prompt is an in-app toast with a Reload
  action instead of a native `confirm()`.

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
