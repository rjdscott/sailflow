# Phase two: from a validated analyser to the trim platform sailors share

- **Status:** 🔵 Not started

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
| 01 | [Downwind physics passes its own gate](phase-01-downwind-physics.md) | 🔵 Not started | none |
| 02 | [Share a trim, pin and compare](phase-02-share-and-compare.md) | 🟡 In progress | 2026-08-26 |
| 03 | [Tuning guides as data](phase-03-guides-as-data.md) | 🟡 In progress | 2026-08-26 — schema, enumeration, selector and runbook landed; third guide blocked on sourcing |
| 04 | [Onboarding and explainers](phase-04-onboarding-and-explainers.md) | 🟡 In progress | 2026-08-26 — all six tasks landed on `feat/onboarding-explainers`; gates green, awaiting merge |
| 05 | [Second boat class](phase-05-second-boat.md) | 🔵 Not started | none |
| 06 | [Phone performance](phase-06-phone-performance.md) | 🔵 Not started | none |

Order: 01 first (credibility), then 02 and 03 in parallel (both data/UI,
no core), 04, 05, 06. 06 can be pulled forward if phone reports come in.

## Critical files

`src/core/aero/orc/{forces,depower}.ts`, `src/core/solve/{optimal,trimmed,tierFor}.ts`,
`src/core/reference/polar.ts`, `calibration/fit.ts`, `validation/{compare,report}.ts`,
`src/ui/router.svelte.ts`, `src/ui/race/store.svelte.ts`, `src/ui/log/`,
`src/ui/disagree/`, `data/tuning/*.json`, `data/boats/*.json`,
`src/ui/three/SailView3D.svelte`, `scripts/bundle_check.mjs`.

## Top risks

1. **Phase 01 needs a model change, not a refit.** The 25° downwind angle
   miss comes from an asym aero with no soak/plane switch; tuning knobs
   cannot fix structure. Budget for an ADR at the fork (ORC's own spinnaker
   model vs a mode-switched one) and for the golden corpus to move.
2. **Share URLs freeze the control schema.** Once a link is in a group chat
   it must keep working; the URL carries a version and the parser has a
   migration table from day one.
3. **Guide transcription is copyright-adjacent.** ADR 0008 covers it;
   every new guide file needs the same provenance block and a retrieval
   date, and the disagreement panel must degrade when a guide is absent.
4. **A second boat exposes J/70 constants in code.** Ten `src/core` files
   still name the J/70 (`grep -rl j70 src/core`). Phase 05 moves them into
   the boat file; the J/70 golden corpus must stay byte-identical.
5. **Phone perf work can regress the desktop first-frame gate.** Both are
   measured in CI (`bundle_check.mjs`, `FIRST_FRAME_BUDGET_MS`); keep them.

## Implements

- Research: `docs/research/2026-08-25-spinnaker/` (doc 04 §3a, §4 for phase
  01), `docs/research/2026-08-25-sailing-sim-landscape/05-second-class-readiness.md`
  (phase 05), `docs/research/2026-08-25-cockpit/` (phase 04).
- ADRs: 0006 (tiers), 0008 (third-party data), 0012 (hold-out gate), 0015
  (cockpit IA), 0017 (kite geometry). New ADRs expected at the phase 01 fork
  and, if needed, for the share-URL schema.
- Carries forward: `docs/plans/2026-08-25-ux-excellence/phase-06` (deferred
  into phase 04 here) and the open P2/P3 items of
  `docs/audits/2026-08-25-ux-03/todo.md` (phase 06 here).
