# Drills v2 and the closed loop: honest practice that people come back to

- **Status:** 🟡 In progress

Remediation of audit [`ux-02`](../../audits/2026-08-25-ux-02/) plus the
owner's 2026-08-25 questions: category-leading and intuitive; drills that
are best practice and engaging; how the platform keeps improving. Governed
by [ADR 0013](../../adr/0013-drills-generated-from-fault-templates-scored-in-control-space.md).

## Scope

Drills engine and screen, the Dock → Race → Log → Drills loop, shell
(onboarding, URLs, persistence, keyboard), and the two strategy items
that make continuous improvement possible without a backend (CI honesty
gate, local-first instrumentation + feedback link).

## Non-goals

- Time-domain simulation, replay, multiplayer (Epics 2–3).
- Solver accuracy beyond what H-04 and H-07 require; downwind model
  (M-28) is its own plan.
- 3D visuals.

## Phases

| NN | Phase | Status | Last update |
|----|-------|--------|-------------|
| 00 | [P0 defects](phase-00-p0-defects.md) | 🟢 Completed | 2026-08-25 |
| 01 | [Drills engine v2](phase-01-drills-engine-v2.md) | 🟢 Completed | 2026-08-25 |
| 02 | [Drills experience](phase-02-drills-experience.md) | 🟢 Completed | 2026-08-25 |
| 03 | [The loop: Dock → Race → Log](phase-03-the-loop.md) | 🟢 Completed | 2026-08-25 |
| 04 | [Shell: onboarding, URLs, persistence, keyboard](phase-04-shell.md) | 🟢 Completed | 2026-08-25 |
| 05 | [Continuous improvement: gate, instrumentation, feedback](phase-05-continuous-improvement.md) | 🟢 Completed | 2026-08-25 |

## Critical files

- `src/lib/drills.ts`, `data/drills/j70-static.json` → `data/drills/j70-templates.json`
- `src/ui/drills/**`, `src/ui/screens/{Drills,Log,Race,Dock,More}.svelte`
- `src/ui/router.svelte.ts`, `src/ui/stores/{conditions,settings}.svelte.ts`
- `src/core/solve/optimalTrim.ts` (H-07 seeding), `src/ui/race/optimum.svelte.ts`
- `docs/audits/2026-08-25-ux-02/todo.md` (tick as findings close)

## Top risks

1. Distance-to-optimum inherits `optimalTrim`'s local optimum: a drill
   could grade against a wrong answer. Mitigation: two-seed descent (from
   start and from base) in phase 00, tier B on every score sheet.
2. H-04: the model disagrees with the tuning guides in light air. If the
   drills coach the model's answer, they coach against North. Phase 00
   investigates before phase 01 builds on it.
3. Engagement mechanics (streaks, daily drill) without accounts live in one
   browser; a cleared cache erases the streak. Say so in the UI.

## Implements

- Audit ux-02 punchlist; ADR 0013; decision log rows 29–30.

## State at end of the third autonomous block (2026-08-25)

All six phases merged as PRs #41–#48. Punchlist: 7 H and 30 of 30 M/L
closed except M-15 (clicks vs purchase), M-19 (log prefill from Race
trim: "Log this trim" fills a draft but the form still needs "New entry"),
M-24 (Race ignores the committed forecast band — chip landed, Race solve
does not use it), M-28 (downwind model, own plan), L-05 (report only).

Owed by a human: on-device phone pass; the two-day drill spacing walk;
`pnpm calibrate` re-fit decision (the H-04 agent found a worse basin and
discarded it). Side findings: the model's optimum is powered-up everywhere
(over-flattening nearly free), so most drills are "eased too far" faults;
the polar gate still FAILs 4 of 25 rows, now visible in every CI run.
