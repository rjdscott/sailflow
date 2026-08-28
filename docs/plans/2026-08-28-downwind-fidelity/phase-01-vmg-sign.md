# Phase 01 — VMG magnitude everywhere

**Goal.** No surface in the app shows a negative VMG. The face already shows
`4.95 kt ↓` (simulator plan phase 02); the `target −4.99 +0.03` sub-line, the
verdict sentence, the drill score sheet, the log columns and the A/B chip
still carry the sign. All show magnitude with the direction stated once per
surface (`↓ to leeward` / `↑ to windward`), deltas keep the one convention
(+ = optimum is faster). Solver, store, share link, tests on the physics stay
signed.

## Tasks

- [x] `format.ts`: `targetOf` gains an `abs` option (or a `vmgTargetOf`
  wrapper) so the target text is `|to|`; delta unchanged. Tests both objectives.
- [x] `InstrumentBar.svelte` VMG cell target line; A/B chip `+1.11 kt VMG`
  text (check sign under `vmgDown`).
- [x] `race/verdict.ts`: any VMG number in the sentence goes through the same
  helper; test a downwind verdict string contains no `−` before a VMG.
- [x] `drills/ScoreSheet.svelte` / `DrillView.svelte`: downwind drills' VMG
  rows.
- [x] `log/**`: VMG columns and the entry share text.
- [x] `grep -rn "vmg" src/ui --include='*.svelte' -i` — every hit is either
  through the helper or a comment saying why not.
- [x] Playwright: on `Run`, assert no text matching `/[−-]\d+\.\d+ kt/` inside
  `.bar` and the insight card.

## Verification

```sh
make check
pnpm test:ui
```

## Artifacts

Updated `format.ts` + tests, the surfaces above, one Playwright case.

## Progress log
- 2026-08-28 — Traced every surface that prints a VMG before touching one, and
  the sign only survives in one place: `targetOf`'s `text`. Everything else
  either abs's already or never had a signed number to lose.
  - `InstrumentBar` face: `vmgDisplay` (0.5.0). Announce line: `Math.abs` plus
    "to leeward"/"to windward".
  - `race/verdict.ts`: `Math.abs(gap)` with "above"/"below" in words. Already
    unsigned; the sentence needed no helper because it never prints a reading,
    only a gap said in prose.
  - `drills/ScoreSheet.svelte`: "VMG lost" is `lossPct`, clamped to `[0, 100]`
    in `src/lib/drills.ts`. `DrillView` hands the raw signed `vmgKt` to the
    instrument bar's `target` prop, so it goes through the one fixed helper.
  - `log/**`: no VMG column and no VMG in the share text — `grep -rni vmg
    src/ui/log src/lib/logStore.ts` is empty. Nothing to change.
  - A/B chip: `abDeltaKt` is a difference of `objectiveKt`, which already flips
    downwind so that more is better. `+1.11 kt VMG` is a gain, not a reading,
    and a negative one is the honest "this trim is slower". Left signed, per
    the delta convention. It prints ASCII `-` where the rest of the app uses
    `−`; noted, not fixed here — a delta glyph is not this phase.
- 2026-08-28 — Fix: `targetOf` gains `abs = false`; the VMG cell passes `true`.
  `4.95 kt ↓` now sits over `target 4.99`, one convention for the cell, with
  the direction stated once — the `↓` on the unit. The delta is untouched:
  it is a gap, not a reading, and `+` still means the optimum is faster.
- 2026-08-28 — Tests: `format.test.ts` covers `abs` on both objectives (a no-op
  upwind) and the whole cell as rendered; `verdict.test.ts` sweeps four
  downwind targets for `/[−-]\d/`; `race.spec.ts` asserts the face matches
  `/^\d+\.\d{2} ?kt ↓$/` on a run, the target line is unsigned, and neither
  `.bar` nor the insight sentence carries a signed number wearing a unit.
- 2026-08-28 — Gates green. `make check`: 1308 tests in 79 files, svelte-check
  0 errors, lint and prettier clean. `pnpm test:ui`: 100 passed (17.3 s).
  Status 🟢.
