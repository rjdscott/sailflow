# Phase 05: Helm and Rig panels, actions, puff replay

## Goal

The cockpit is complete on desktop: Helm & Conditions and the dock-gated
Rig panel land, Optimise / A/B / Log sit in one actions bar, a scripted
puff replay shows how the optimum trim changes through a gust, and Drills
use the same instrument bar.

## Tasks

- [ ] `panels/Helm.svelte`: heel bullet gauge and helm-load bar side by side (research 02 §3: helm load only reads at constant heel); mode chip high / VMG / fast (TWA offset −3 / 0 / +3°, prov: Sailing World "Mechanics of Mode"), downwind plane / soak / wing / VMG mapping to the existing point-of-sail machinery; crew fore-aft (existing crew kg + a fore-aft position, drawing-only unless core supports it — say so); kite controls under asym.
- [ ] `panels/Rig.svelte`: dock-gated (`rigLock.lockedToday`); read-only committed uppers/lowers/forestay, rake/prebend from `RigState`, `RigElevation` (existing), gear chart from `data/tuning/*.json` with the current TWS row highlighted and the source named; link to Dock.
- [ ] Actions bar: Optimise ghost bugs + Apply + undo (existing), **A/B previous** (`race.previousRace` ↔ current with diff highlight on moved controls and Δ VMG in the bar), Log this trim. Store tests: A/B round-trip restores identity of bound objects; A/B disabled with no previous.
- [ ] `src/ui/race/puff.ts` (pure): scripted sequences (`gust`, `lull`, `shift`), deterministic step scheduler (no `Date`, injected clock), power state per step (under / transition / over, from `aero.flat` and heel vs band, prov: assumed), panel order per Ingham (research 02 S10). Tests: order per state, determinism, cancel.
- [ ] `PuffReplay.svelte`: plays the sequence, solves optimum each step, lights panels in order, shows the optimum's control moves as ghost bugs; keyboard `p`; honours reduced motion (steps, no easing).
- [ ] Drills switch to `InstrumentBar`; `Readouts.svelte` deleted; `ScoreSheet` unchanged.
- [ ] Telemetry: `race.abCompare`, `race.puffReplay` events (counts only).

## Verification

```sh
make check
```

Manual on Pages: puff replay at 8→14→10 kt lights Helm → Mainsail →
Headsail in the overpowered branch; A/B toggles within one frame.

## Artifacts

- `src/ui/race/panels/{Helm,Rig}.svelte`, `src/ui/race/{puff.ts,PuffReplay.svelte}` + tests, store tests, `Readouts.svelte` removed.

## Progress log
