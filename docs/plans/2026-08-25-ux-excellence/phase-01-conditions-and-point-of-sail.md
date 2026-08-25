# Phase 01: Conditions and point of sail

## Goal

Wind and point of sail become one-tap on Race. Chips for Close-hauled,
Close reach, Beam reach, Broad reach, Run replace the buried TWA slider as
the primary way to change angle; the TWA slider stays for fine control.
Closes M-01, M-21, M-22; owner decision row 25.

## Tasks

- [x] `pointOfSail.ts`: named angles. Reaches fixed 60 / 90 / 135
      (`prov: assumed`); Close-hauled and Run resolve to the VPP-optimal VMG
      angle at the current TWS via `optimal` with `optimiseTwa: true`
      (upwind jib set; downwind asym set). Unit test: monotone in TWS band.
- [x] Chips in `ConditionsStrip` (both breakpoints); active chip reflects the
      nearest named angle to the current TWA; sailset follows (asym on
      broad reach / run, jib otherwise).
- [x] TWS chip becomes a stepper (±1 kt) inline; sea state and crew stay in
      the sheet.
- [ ] Wind arrows in `PlanView` scale with TWS (M-21).
- [x] Simple mode + Run/Broad reach: show the kite controls (M-22) or a
      one-line explainer why downwind is direction-only.
- [x] Store tests for chip → condition mapping; UI test that the Run chip
      switches sailset.

## Verification

```sh
make check
```

Manual on desktop and phone harness: tap each chip, watch AWA/boat rotate,
readouts update; Run shows asym, VMG negative and badged.

## Artifacts

- `src/ui/race/pointOfSail.ts` + test, updated `ConditionsStrip.svelte`.

## Progress log

- **2026-08-25** — Point-of-sail chips shipped. `src/ui/race/pointOfSail.ts`
  holds the five named angles (reaches fixed at 60/90/135, `prov: assumed`;
  Close-hauled and Run carry a nominal 40/165 that is only the band centre and
  the fallback) plus `nearestPointOfSail`, banded at the midpoints with ties to
  the tighter angle. `race.setPointOfSail(id)` sets sailset + angle at once;
  the two optimal ones then fire one `optimal` request (`optimiseTwa: true`,
  current `controls.dock`, condition with the new sailset) through the shared
  client and round the returned `twaDeg` to 1°, sequence-guarded so a stale
  answer is dropped and a failed solve leaves the nominal angle standing.
  `ConditionsStrip` renders the five chips as `aria-pressed` buttons above the
  conditions row (they wrap to two rows at 390 px) and the TWS chip became a
  ±1 kt stepper with 44 px buttons; sea state, crew and the fine TWA slider
  stay in the Edit sheet. M-22: `ControlPanel` now shows the kite rows under
  the C-tier banner whenever `conditions.sailset === 'asym'`, in both modes,
  and hides the now-redundant checkbox in that state. `make check` green
  (630 tests).
- **2026-08-25** — Deviations. (a) The wind-arrow task (M-21) is untouched —
  `PlanView.svelte` is owned by another agent this run; leave the box unticked
  until that lands. (b) The planned "monotone in TWS band" unit test was not
  written: the module holds no TWS term, the angle comes back from the solver,
  so the monotonicity claim belongs to `core/solve/optimal.ts` rather than
  here. `pointOfSail.test.ts` covers the bands and the sailset split instead;
  the store test covers the fetch, the rounding and the stale drop.
