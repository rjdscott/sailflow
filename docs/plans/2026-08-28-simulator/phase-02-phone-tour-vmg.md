# Phase 02 — Phone order, tour, VMG sign

**Goal.** A phone cold load shows the conditions, the numbers and the boat
in one 844 px viewport; the first tour card is about the wind; downwind VMG
never shows a minus sign. Audit ux-04 H-02, H-03, H-04, M-07, L-01, L-02.

## Tasks

- [ ] `Race.svelte` phone `order` block: header → band (conditions half
  first, boat half second) → hero → panel tabs → panels. Hero capped at
  `min(56vw, 300px)` below 720 px.
- [ ] `BottomNav.svelte` — delete the `.wordmark` row (M-07).
- [ ] Lede shortened to "Trim for the wind in front of you." so it never
  ellipsises (L-02).
- [ ] `onboarding/steps.ts` — card 1 "Set the wind" anchored on the band
  (`data-tour="conditions"` + a spotlight cut-out in `Tour.svelte`); card 2
  "Dock, then Race" rewritten for the merged page ("The rig is on the same
  screen; Commit for today greys it, because class rule C.9.5(a) …"); card 3
  Apply optimum unchanged. Tests in `steps.test.ts` for the anchor ids.
- [ ] `InstrumentBar.svelte` — VMG cell renders `|vmg|` with a `↓` glyph in
  the unit slot when `objective === 'vmgDown'`; delta label becomes
  "to optimum (+ = optimum makes more VMG to leeward)". `format.ts` gains
  `vmgDisplay(value, objective)` with a test. Solver value and share link stay
  signed.
- [ ] Cold-load toast "Restored your last session · Reset" when the restored
  state ≠ defaults (L-01); `Reset` clears to `BASE_RACE` + preset Medium.
- [ ] Playwright: 390 cold load, tour skipped → `.bar` bottom < 844 and
  `.hero-boat` bottom < 1300.

## Verification

```sh
make check
pnpm test:ui
```

## Artifacts

- Updated `steps.ts`, `Tour.svelte`, `InstrumentBar.svelte`, `format.ts`,
  `BottomNav.svelte`, snapshots.

## Progress log

