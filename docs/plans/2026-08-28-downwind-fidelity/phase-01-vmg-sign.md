# Phase 01 — VMG magnitude everywhere

**Goal.** No surface in the app shows a negative VMG. The face already shows
`4.95 kt ↓` (simulator plan phase 02); the `target −4.99 +0.03` sub-line, the
verdict sentence, the drill score sheet, the log columns and the A/B chip
still carry the sign. All show magnitude with the direction stated once per
surface (`↓ to leeward` / `↑ to windward`), deltas keep the one convention
(+ = optimum is faster). Solver, store, share link, tests on the physics stay
signed.

## Tasks

- [ ] `format.ts`: `targetOf` gains an `abs` option (or a `vmgTargetOf`
  wrapper) so the target text is `|to|`; delta unchanged. Tests both objectives.
- [ ] `InstrumentBar.svelte` VMG cell target line; A/B chip `+1.11 kt VMG`
  text (check sign under `vmgDown`).
- [ ] `race/verdict.ts`: any VMG number in the sentence goes through the same
  helper; test a downwind verdict string contains no `−` before a VMG.
- [ ] `drills/ScoreSheet.svelte` / `DrillView.svelte`: downwind drills' VMG
  rows.
- [ ] `log/**`: VMG columns and the entry share text.
- [ ] `grep -rn "vmg" src/ui --include='*.svelte' -i` — every hit is either
  through the helper or a comment saying why not.
- [ ] Playwright: on `Run`, assert no text matching `/[−-]\d+\.\d+ kt/` inside
  `.bar` and the insight card.

## Verification

```sh
make check
pnpm test:ui
```

## Artifacts

Updated `format.ts` + tests, the surfaces above, one Playwright case.

## Progress log

