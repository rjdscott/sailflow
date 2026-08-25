# Phase 05: Helm and Rig panels, actions, puff replay

## Goal

The cockpit is complete on desktop: Helm & Conditions and the dock-gated
Rig panel land, Optimise / A/B / Log sit in one actions bar, a scripted
puff replay shows how the optimum trim changes through a gust, and Drills
use the same instrument bar.

## Tasks

- [x] `panels/Helm.svelte`: heel bullet gauge and helm-load bar side by side (research 02 §3: helm load only reads at constant heel); mode chip high / VMG / fast (TWA offset −3 / 0 / +3°, prov: Sailing World "Mechanics of Mode"), downwind plane / soak / wing / VMG mapping to the existing point-of-sail machinery; crew fore-aft (existing crew kg + a fore-aft position, drawing-only unless core supports it — say so); kite controls under asym.
- [x] `panels/Rig.svelte`: dock-gated (`rigLock.lockedToday`); read-only committed uppers/lowers/forestay, rake/prebend from `RigState`, `RigElevation` (existing), gear chart from `data/tuning/*.json` with the current TWS row highlighted and the source named; link to Dock.
- [x] Actions bar: Optimise ghost bugs + Apply + undo (existing), **A/B previous** (`race.previousRace` ↔ current with diff highlight on moved controls and Δ VMG in the bar), Log this trim. Store tests: A/B round-trip restores identity of bound objects; A/B disabled with no previous.
- [x] `src/ui/race/puff.ts` (pure): scripted sequences (`gust`, `lull`, `shift`), deterministic step scheduler (no `Date`, injected clock), power state per step (under / transition / over, from `aero.flat` and heel vs band, prov: assumed), panel order per Ingham (research 02 S10). Tests: order per state, determinism, cancel.
- [x] `PuffReplay.svelte`: plays the sequence, solves optimum each step, lights panels in order, shows the optimum's control moves as ghost bugs; keyboard `p`; honours reduced motion (steps, no easing).
- [x] Drills switch to `InstrumentBar`; `Readouts.svelte` deleted; `ScoreSheet` unchanged.
- [x] Telemetry: `race.abCompare`, `race.puffReplay` events (counts only).

## Verification

```sh
make check
```

Manual on Pages: puff replay at 8→14→10 kt lights Helm → Mainsail →
Headsail in the overpowered branch; A/B toggles within one frame.

## Artifacts

- `src/ui/race/panels/{Helm,Rig}.svelte`, `src/ui/race/{puff.ts,PuffReplay.svelte}` + tests, store tests, `Readouts.svelte` removed.

## Progress log

### 2026-08-25 — shipped

**One base trim, carried from phase 03.** `data/boats/j70.json` gained a
`baseRace` block with a provenance row per control (`app-convention`,
`assumed`). `core/shape/base.ts` returns a copy of it and
`src/ui/stores/conditions.svelte.ts` exports it as `BASE_RACE`, so the datum
the shape deltas are measured against, the trim the leech-stall and stripe
meters are calibrated on, and the trim the sliders start on are now one
object read from one file — the UI still never imports the core (ADR 0003).

*The core's values won, not Race mode's.* `baseRace()` is the datum
`shape/toOrc.ts` measures every delta against and the anchor phase 03
calibrated both meters on; Race mode's harder-sheeted `BASE_RACE` (main 70,
jib 70, traveller 20, outhaul 60, inhauler 20) was the one with no claim on
anything. So the JSON carries 60/60/0/50/30 and **Race mode's default trim
changed**, which is the visible consequence: the Race screen now opens on the
trim the guides' band was read onto, and the spreader-stripe verdict no
longer says "lead aft" at the screen's own starting trim.

**Golden diff: one line per file.** `boatHash c31fb449 → 2b39f8fb` in all
three corpora, `calibHash ab97c1e7` unchanged, and **not one solved value
moved** — `git diff --numstat validation/golden` is 1/1 per file, the hash
line. That is the proof the reconciliation is a data move and not a physics
change. `pnpm validate` regenerates identically: **FAIL, 21/25 gated rows
inside tolerance**, same four rows (TWS 6 jib 60°, TWS 14 jib vmgUp, TWS 14
asym vmgDn, TWS 20 jib 60°), worst residuals 15.1 % and 25.5°. `report.md` is
kept rather than reverted this time, because its boat-hash line would
otherwise be wrong.

**Decisions.**

- *`baseRace` is a top-level block, not `controls.<id>.base`.* Both cost the
  same eleven provenance rows (`validateBoat` wants an entry per numeric
  leaf), but a block is one cast on each side of the module boundary instead
  of a fold over `CONTROLS`, and it does not widen `ControlSpec` for a field
  only the eleven race controls have.
- *Modes are `race.setMode()` against a remembered base angle*, not a delta
  applied to whatever is on screen. High → Fast is 6°, not two 3° nudges, and
  tapping a point-of-sail chip re-takes the base (including after the chip's
  VMG solve answers, which is the angle a mode is defined against, S11).
  Downwind offsets are assumed outright: S15 describes its five modes by
  backstay percentage and crew position and prints no angles, so only the
  sign and the ordering are claimed. ASSUMPTIONS says exactly that.
- *A/B is not undo, and both stayed.* `abToggle()` swaps `previousRace` with
  the live trim, keeping both, so pressing it twice is identity — the store
  test asserts the bound object's identity as well as its values, because the
  panels' sliders alias it. `undo()` still throws the other side away and now
  ends the compare. Two buttons that look alike was the risk; they are worded
  as what they do ("A/B" with the side badge and the delta, vs "Back to my
  trim") and the audit in phase 06 can cut one if novices trip on it.
- *The A/B delta costs no solve.* `remember()` parks the objective value of
  the trim it is parking, so the bar can print "+0.06 kt VMG" from two numbers
  it already had. It reads null until both sides have answered rather than
  showing a stale figure.
- *`gearChart.ts` is a view over `src/lib/reference.ts`*, not a second reader
  of the tuning JSON. `rowFor` is asserted to agree with the disagreement
  panel's `bandFor` at five wind speeds, so the highlighted row and the guide
  comparison can never point at different bands. Cells are the guide's own
  words, or an em dash where that guide publishes nothing.
- *The puff replay drives the real stores.* `puff.ts` stays pure (sequences,
  `powerState`, `panelOrder`, `schedule` — no clock, offsets only); the timer
  and the store writes live in `puffPlayer.svelte.ts`, which is why "cancel
  restores the wind exactly" is a unit test and not a hope. It waits on the
  optimum store between steps (200 ms poll, 3 s cap) so the ghost bugs on
  screen belong to the step being watched.
- *The lit panel is a static outline plus a pulse.* `tokens.css` collapses
  every animation under reduced motion, so a pulse-only cue would vanish for
  exactly the users who need the stepping to be obvious. `Panel` takes
  `lit={index}`, and the three `data-lit` values stagger the delay.
- *Two gauge constants moved into `instruments/gauges.ts`* (`HELM_TARGET`,
  `HEEL_SCALE_MAX`): the Helm panel draws the same pair as the instrument
  bar, and the same number written twice is the bug this phase was already
  fixing elsewhere.
- *Crew fore-aft is drawing-only and says so twice* — a C badge whose reason
  reads "the solver takes crew weight, never where it sits", and a learn-tier
  line under the control. It reaches the tuning log through the draft's
  `notes` field, with the mode, rather than growing a schema field for
  something the model does not read.

**Deviations from the brief.**

- **The Rig panel's gear chart is in the controls slot, not a fourth region.**
  `Panel` has three slots; the chart is what you *do* with the rig once it is
  locked, the elevation is what you look at, and the committed cells are the
  numbers. Uncommitted, the same slot holds the three dock sliders and the
  link to `#/dock`, so the panel has one shape in both states.
- **`Readouts.svelte` and `DownAndDock.svelte` are deleted, as planned**, but
  the kite section kept `DownAndDock`'s advanced-tier "show kite controls"
  checkbox (ux-01 M-22) rather than being reduced to "under asym only" — the
  checkbox is the only way to see those controls with the jib up.
- **A `p` press while a replay is running stops it**, which the brief left to
  a separate cancel control. The cancel button is there too; making the same
  key mean stop is what every media control does.

**Not done / for the next phase.**

- The replay's power state is read off the *previous* step's solve, since the
  current step has only just been asked for. A sailor has the same
  information, so it is honest, but it means the first step of a replay lights
  the panels for the trim you were already in. Fixing it means awaiting the
  solve rather than the optimum, which is phase 06 or later.
- Nothing tests the panel lighting end to end: `puff.ts` and `PuffPlayer` are
  unit-tested, and the pulse is a stylesheet rule. A Playwright assertion on
  `[data-lit]` would be a fair addition when phase 06 touches the specs.
- The one-screen desktop assertion is still not made (phases 04–06 own it);
  `tests/ui/race.spec.ts` now checks all four panel headings and the
  no-horizontal-scroll rule at both viewports, plus the A/B disabled state and
  the replay's restore.

**Verification.**

- `make check` — green (69 files, 1100 vitest tests; 10 doc tests; docs
  index, provenance, prov-check and contrast all pass).
- `pnpm test:ui` — 10 passed, and 3 passed inside
  `mcr.microsoft.com/playwright:v1.62.1-noble`, the tag CI pins.
  `tests/ui/race.spec.ts` gained the A/B disabled-state test and a puff-replay
  test that asserts the wind comes back.
  **The 3D screenshot baseline was regenerated**, inside that image: the new
  base trim (mainsheet 60 rather than 70) changes the sail the hero draws.
  Measured first — against the old baseline the new build differed by a 0.02
  pixel ratio on the host and *passed* in the image, i.e. the trim change
  alone is inside the 0.01 gate and the host's own antialiasing wobble
  (phase 04, ~2 %) is what tipped it over. Regenerating in the image puts both
  back inside the gate: host and image now agree.
  Command: `docker run --rm --ipc=host -v <repo>:/repo -w /repo/<worktree> -e
  CI=1 mcr.microsoft.com/playwright:v1.62.1-noble npx playwright test race-3d
  --update-snapshots=all`.
- `node scripts/bundle_check.mjs` after `pnpm build` — OK. Entry chunk
  **115,207 → 121,742 B gzip (+6,535 B)**, baseline raised deliberately to
  121,717 (the measurement it was taken at, 25 B before a last fix) in
  `scripts/bundle_baseline.json` with the reason: two panels, the actions bar,
  the replay and the gear chart are first-load Race UI, and the tuning JSON
  the chart reads was already in the entry for the disagreement panel. The
  three.js hero chunk is unchanged at 139.4 KB gzip and still lazy.
- `pnpm validate` — unchanged: **FAIL, 21/25**, as above.
