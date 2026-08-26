# Phase two: from a validated analyser to the trim platform sailors share

- **Status:** 🟢 Completed

## Goal

A J/70 sailor can open a link a crewmate sent, see the exact trim state
they were looking at, compare it with their own, and trust the downwind
numbers as much as the upwind ones — and an engineer can add a second boat
class or a third tuning guide without touching `src/core`.

## Scope

Six phases, ordered by what a sailor would notice first. Each is one or two
PRs, independently shippable; the plan is not a big-bang release.

Non-goals (by the brief, `docs/initial-prompt.md`): multiplayer, race
simulation, tactics, starts, accounts, any backend. Epic 2 (time-domain) and
Epic 3 (Rust engine) stay unstarted; nothing here pre-commits to them.

## Status

| NN | Phase | Status | Last update |
|----|-------|--------|-------------|
| 01 | [Downwind physics passes its own gate](phase-01-downwind-physics.md) | ⏸ Deferred | 2026-08-26 — the model soaks (ADR 0018); gate 8/10, downwind angle 3.0° vs 2°, needs a second mechanism |
| 02 | [Share a trim, pin and compare](phase-02-share-and-compare.md) | 🟢 Completed | 2026-08-26 — rudder-angle readout re-scoped as a core task (no yaw balance) |
| 03 | [Tuning guides as data](phase-03-guides-as-data.md) | 🟢 Completed | 2026-08-26 — schema, enumeration, selector and runbook; third guide unsourceable |
| 04 | [Onboarding and explainers](phase-04-onboarding-and-explainers.md) | 🟢 Completed | 2026-08-26 |
| 05 | [Second boat class](phase-05-second-boat.md) | 🟢 Completed | 2026-08-26 — the cockpit reads the active boat; Melges 24 registered, calibrated and gated at 7/10 (ADR 0020) |
| 06 | [Phone performance](phase-06-phone-performance.md) | 🟢 Completed | 2026-08-26 — ux-03 M-20/21/22/24/25 and every P3 low fixed with measured before/after; the seven remaining P2 mediums are instrument content, deferred to 04 with reasons |

Order: 01 first (credibility), then 02 and 03 in parallel (both data/UI,
no core), 04, 05, 06. 06 can be pulled forward if phone reports come in.

## Critical files

`src/core/aero/orc/{forces,depower}.ts`, `src/core/solve/{optimal,trimmed,tierFor}.ts`,
`src/core/reference/polar.ts`, `calibration/fit.ts`, `validation/{compare,report}.ts`,
`src/ui/router.svelte.ts`, `src/ui/race/store.svelte.ts`, `src/ui/log/`,
`src/ui/disagree/`, `data/tuning/*.json`, `data/boats/*.json`,
`src/ui/three/SailView3D.svelte`, `scripts/bundle_check.mjs`.

## Top risks

1. **Phase 01 needs a model change, not a refit.** Confirmed 2026-08-26, and
   the cause was more specific than this risk anticipated: the only non-ORC
   offwind knob multiplied CLmax, which ORC puts at 0.100 by AWA 150°, so the
   fit had no lever on a soak at all.
   [ADR 0018](../../adr/0018-offwind-parachute-drag-knob-not-a-mode-switch.md)
   adds a drag knob rather than a mode switch, and the golden corpus moved as
   budgeted. After: the gate still reads 8/10, with the downwind miss down from
   15.1 % / 25.5° to 1.9 % / 3.0° and the two remaining misses named in numbers
   in the phase-01 progress log.
2. **Share URLs freeze the control schema.** Once a link is in a group chat
   it must keep working; the URL carries a version and the parser has a
   migration table from day one.
3. **Guide transcription is copyright-adjacent.** ADR 0008 covers it;
   every new guide file needs the same provenance block and a retrieval
   date, and the disagreement panel must degrade when a guide is absent.
4. **A second boat exposes J/70 constants in code.** ~~Ten `src/core` files
   still name the J/70.~~ Closed 2026-08-26. It was three layers, not one: ten
   `src/core` files, thirteen UI files importing `data/boats/j70.json` by path,
   and — the one no inventory caught until the Melges 24 was calibrated —
   `calibration/fit.ts` importing `north-j70.json`, which would have fitted a
   second class's rig to the J/70's tuning guide. All three are per-boat now and
   the J/70 corpus is byte-identical (`boatHash 6272af4c`).
5. **Phone perf work can regress the desktop first-frame gate.** Both are
   measured in CI (`bundle_check.mjs`, `FIRST_FRAME_BUDGET_MS`); keep them.

## Implements

- Research: `docs/research/2026-08-25-spinnaker/` (doc 04 §3a, §4 for phase
  01), `docs/research/2026-08-25-sailing-sim-landscape/05-second-class-readiness.md`
  (phase 05), `docs/research/2026-08-25-cockpit/` (phase 04).
- ADRs: 0006 (tiers), 0008 (third-party data), 0012 (hold-out gate), 0015
  (cockpit IA), 0017 (kite geometry), 0018 (the phase 01 fork). A further ADR
  may still be needed for the share-URL schema.
- Carries forward: `docs/plans/2026-08-25-ux-excellence/phase-06` (deferred
  into phase 04 here) and the open P2/P3 items of
  `docs/audits/2026-08-25-ux-03/todo.md` (phase 06 here).

## State at close (2026-08-26, v0.4.0)

All six phases merged (#93–#103). Open, with reasons in the phase files: downwind optimum angle 3° hot (01), rudder-angle readout needs a core yaw balance (02), no third J/70 guide and no Melges 24 guide fetchable (03, 05), Melges 24 gate 7/10 (05). Next plan should start from the downwind angle mechanism — it is the last physics item between the J/70 and a PASS.
