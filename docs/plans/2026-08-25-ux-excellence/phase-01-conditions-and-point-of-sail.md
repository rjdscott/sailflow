# Phase 01: Conditions and point of sail

## Goal

Wind and point of sail become one-tap on Race. Chips for Close-hauled,
Close reach, Beam reach, Broad reach, Run replace the buried TWA slider as
the primary way to change angle; the TWA slider stays for fine control.
Closes M-01, M-21, M-22; owner decision row 25.

## Tasks

- [ ] `pointOfSail.ts`: named angles. Reaches fixed 60 / 90 / 135
      (`prov: assumed`); Close-hauled and Run resolve to the VPP-optimal VMG
      angle at the current TWS via `optimal` with `optimiseTwa: true`
      (upwind jib set; downwind asym set). Unit test: monotone in TWS band.
- [ ] Chips in `ConditionsStrip` (both breakpoints); active chip reflects the
      nearest named angle to the current TWA; sailset follows (asym on
      broad reach / run, jib otherwise).
- [ ] TWS chip becomes a stepper (±1 kt) inline; sea state and crew stay in
      the sheet.
- [ ] Wind arrows in `PlanView` scale with TWS (M-21).
- [ ] Simple mode + Run/Broad reach: show the kite controls (M-22) or a
      one-line explainer why downwind is direction-only.
- [ ] Store tests for chip → condition mapping; UI test that the Run chip
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

_None yet._
