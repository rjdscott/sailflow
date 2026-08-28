# Simulator: Dock and Race become one page, and the wind is the first thing you touch

- **Status:** 🟡 In progress

Implements [ADR 0021](../../adr/0021-dock-and-race-merge-into-one-simulator-page.md)
and remediates audit [ux-04](../../audits/2026-08-28-ux-04/) (H-01..H-04,
M-01..M-09, L-01..L-03). Outcome: a sailor opens `/`, sees the wind, the
sea, the boat's numbers and the boat on one screen, changes any of them in
place, and watches every other number move.

## Scope

- Instrument band split: boat (left) · conditions (right), every conditions
  value editable in place; `ConditionsStrip` and the `Edit` sheet deleted.
- Route `sim` replaces `race` and `dock`; nav becomes four items.
- Rig panel absorbs the Dock: forecast band, regret, suggest, commit.
- Phone order, tour rewrite, downwind VMG sign, the audit's Mediums and Lows.

## Non-goals

- No solver change. `src/core` and the worker protocol are untouched.
- No new modelled inputs (current, gusts, gradient). "Other things like
  wave, sea state" = sea state, which the solver already reads.
- Melges 24 and phase-three physics stay on their own plans.

## Working method

Fable orchestrates and reviews; each phase is built by an Opus subagent
from its phase file, on a branch, one PR per phase, `make check` green
before the PR opens. Review on Fable before merge.

## Status

| NN | Phase | Status | Last update |
|----|-------|--------|-------------|
| 01 | [Conditions band](phase-01-conditions-band.md) | 🟢 Completed | 2026-08-28 |
| 02 | [Phone order, tour, VMG sign](phase-02-phone-tour-vmg.md) | 🔵 Not started | none |
| 03 | [Route `sim` and the four-item nav](phase-03-sim-route.md) | 🟢 Done | 2026-08-28 |
| 04 | [Rig panel absorbs the Dock](phase-04-rig-absorbs-dock.md) | 🔵 Not started | none |
| 05 | [Polish, snapshots, audit tick-off, 0.5.0](phase-05-polish-release.md) | 🔵 Not started | none |

## Critical files

- `src/ui/race/InstrumentBar.svelte`, `src/ui/components/InstrumentCell.svelte`
  — the band contract; `DrillView.svelte` mounts it too.
- `src/ui/race/ConditionsStrip.svelte`, `src/ui/stores/conditions.svelte.ts`
  — what phase 01 replaces and what it keeps.
- `src/ui/screens/Race.svelte` (960 lines) — grid areas per breakpoint,
  phone `order` block at ~589-611.
- `src/ui/screens/Dock.svelte`, `src/ui/dock/*`, `src/ui/stores/rigLock.svelte.ts`
  — what phase 04 folds into `src/ui/race/panels/Rig.svelte`.
- `src/ui/router.svelte.ts`, `src/ui/components/navItems.ts`, `src/ui/share.ts`
  — phase 03.
- `src/ui/onboarding/steps.ts` — phase 02.
- `tests/ui/**` Playwright snapshots — every phase re-baselines what it moved.

## Top risks

1. **Band density on a phone.** Two halves × four cells must fit two rows
   at 390 px without dropping the `?` badges. Prototype at 390 first.
2. **`DrillView` reuses `InstrumentBar`.** A drill withholds the target;
   the right half must be read-only there (the drill sets the condition).
3. **Rig lock semantics.** Commit becomes a toggle on the same screen as
   the sliders; the greyed state and the copy must make "frozen on the
   water" obvious or ADR 0021's revisit trigger fires on day one.
4. **Share links.** `#/race?…` and `#/dock?…` in the wild must keep working
   through the migration table (ADR 0019).
