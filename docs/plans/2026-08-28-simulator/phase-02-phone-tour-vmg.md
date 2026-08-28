# Phase 02 — Phone order, tour, VMG sign

**Goal.** A phone cold load shows the conditions, the numbers and the boat
in one 844 px viewport; the first tour card is about the wind; downwind VMG
never shows a minus sign. Audit ux-04 H-02, H-03, H-04, M-07, L-01, L-02.

## Tasks

- [x] `Race.svelte` phone `order` block: header → band (conditions half
  first, boat half second) → hero → panel tabs → panels. Hero capped at
  `min(56vw, 300px)` below 720 px.
- [x] `BottomNav.svelte` — delete the `.wordmark` row (M-07).
- [x] Lede shortened to "Trim for the wind in front of you." so it never
  ellipsises (L-02).
- [x] `onboarding/steps.ts` — card 1 "Set the wind" anchored on the band
  (`data-tour="conditions"` + a spotlight cut-out in `Tour.svelte`); card 2
  "Dock, then Race" rewritten for the merged page ("The rig is on the same
  screen; Commit for today greys it, because class rule C.9.5(a) …"); card 3
  Apply optimum unchanged. Tests in `steps.test.ts` for the anchor ids.
- [x] `InstrumentBar.svelte` — VMG cell renders `|vmg|` with a `↓` glyph in
  the unit slot when `objective === 'vmgDown'`; delta label becomes
  "to optimum (+ = optimum makes more VMG to leeward)". `format.ts` gains
  `vmgDisplay(value, objective)` with a test. Solver value and share link stay
  signed.
- [x] Cold-load toast "Restored your last session · Reset" when the restored
  state ≠ defaults (L-01); `Reset` clears to `BASE_RACE` + preset Medium.
- [x] Playwright: 390 cold load, tour skipped → `.bar` bottom < 844 and
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

### 2026-08-28 — built, `make check` and `pnpm test:ui` green

Branch `feat/phone-tour-vmg`, PR against `main`. Every task above shipped.

**Phone order (H-03).** Phase 01 had already moved the band above the hero and
made the conditions half `order: -1` inside it, so the ordering work left here
was the hero cap and the measurement. `SailHero`'s `.slot` gets
`--hero-h: min(56vw, 300px)` below 720 px — the cap lives there and not in
`Race.svelte` because `--hero-h` is declared on `.slot` and a value inherited
from the card would lose to it. Measured at 390×844 on `pnpm dev`: header
0–103, conditions half top 119, boat half top 402, band bottom **634**, hero
top **650**, picture 218 px (56vw exactly). `race.spec.ts` now pins the whole
order by box — head → conditions → boat → hero → tabs → panels — plus
`bar.bottom < 844`, `hero.top < 844` and the picture against `0.56 × 390`.

**Tour (H-02).** Three cards still. Card 1 *Set the wind* names the right half
and says every value there is the control; card 2 *The rig, and the day* is
written for the merged page — the shroud turns are in the Rig panel, `Commit
for today` greys them under class rule C.9.5(a), and the density-vs-confidence
half of the old card 2 survives in one shortened sentence. `TourStep` gained
`anchor`, a CSS selector, and `Tour.svelte` cuts a hole around it.

**Decisions worth knowing.**

- *The cut-out lives inside the dialog.* `Sheet` is a `<dialog showModal()>`,
  which is in the top layer; nothing outside it can paint above its
  `::backdrop`. So the ring is a `position: fixed` child of the dialog, and
  while a hole is open `[data-tour-spot]` on `<html>` makes the backdrop
  transparent — otherwise the "hole" would still be 40 % dimmed, which is not
  a hole. The huge `box-shadow` is then the only thing darkening the page.
- *The anchor is polled, not looked up once.* `Race.svelte` renders the
  instrument band only once the first solve lands, and the tour is up before
  that. A one-shot `querySelector` found nothing on a cold load and never
  looked again. One rAF loop, alive only while a card is up, covers the late
  mount, the smooth scroll settling, and the band growing when the solve
  arrives — instead of a MutationObserver, a scrollend handler and a
  ResizeObserver.
- *One bug the loop caused first.* `follow()` runs once synchronously inside
  the effect, so reading `spot` there to compare boxes made the effect depend
  on the state it writes: the tour re-ran its reset and `Next` stopped
  advancing. The previous box is a closure local now, and nothing in the
  effect reads `spot`.
- *Card 2's anchor points at something that does not exist yet.* Phase 04 owns
  `Rig.svelte` and adds `data-tour="rig"`; until then the loop finds nothing
  and the card simply dims the page. That is the designed fallback, and it is
  what `TourStep.anchor`'s doc comment promises.
- *The restore predicate compares against the store's own defaults, not the
  Medium preset.* The phase file said "`BASE_RACE` + preset Medium condition",
  but the app opens on 10 kt and Medium is 12: comparing against Medium would
  have shown "Restored your last session" to a visitor who had touched
  nothing, because `App.svelte` writes a session on mount. `DEFAULT_CONDITION`
  is now named in `conditions.svelte.ts`, the store is seeded from it, the
  predicate compares against it, and Reset puts it back — one definition of
  "the defaults" for all three.
- *The toast is wired from `Race.svelte`, not `App.svelte`.* Phase 04 owns
  `App.svelte`. `Race.svelte` re-reads the session at script init — not in an
  effect, because App's debounced writer rewrites the hash 400 ms after mount
  and after that "did the user arrive on a link?" is unanswerable — and gates
  on an allowlist of the app's own params (`sub`, `view`, `freeze`, `kit`).
  Anything unrecognised counts as a link, which is the safe way to be wrong: a
  shared link is not "your last session".
- *The VMG delta label yields to a pinned trim.* `VMG_DOWN_DELTA_LABEL` only
  replaces the default; with a trim pinned the delta is not against the
  optimum at all and `PINNED_DELTA_LABEL` stays the true sentence.
- *The spoken summary lost the sign too.* `InstrumentBar`'s live region read
  "VMG −4.95 knots"; it says "VMG 4.95 knots to leeward" now, so the screen
  reader and the face agree.

**Also changed, and worth a reviewer's eye.**

- The tour assertions moved out of `race/explain.test.ts` — a file about the
  control explainers — into the new `onboarding/steps.test.ts`. Two of them
  had to move anyway: the tier card is no longer titled "tier", and the
  no-numbers rule now strips a class-rule citation, because `C.9.5(a)` is a
  rule and not a measurement (the file's own docblock always said so).
- `share.spec.ts`'s `settled()` now waits for the band's numbers to stop
  changing, not just for `Apply optimum` to enable. The three primaries tween
  over 260 ms (phase 01), and the sender's read was catching them mid-flight:
  6.0 kt against the receiver's 6.1. That was a live flake, not this change.

**Deliberately not done.** The insight card stays at `order: 4`, between the
tab strip and the panels; the phase brief lists "panel tabs → panels" and says
nothing about moving the coach line, and it is the card that repeats the
verdict the band gives up on a phone.

**Gates.** `make check`: docs-check, contrast, 10 pytest, lint + prettier
clean, `svelte-check` 0 errors 0 warnings, 1305 vitest tests green.
`pnpm test:ui`: 84 passed. Screenshots at 390 cold (card 1 with the
spotlight), 390 skipped, and 1440 on a run showing `4.95 kt ↓`. Nothing red
for reasons outside this change.
