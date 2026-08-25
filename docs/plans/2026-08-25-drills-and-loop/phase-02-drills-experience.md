# Phase 02: Drills experience

## Goal

The drill screen teaches: goal first, hint on request, live distance-to-goal
after Check with ghost ticks and Apply, a score that explains itself, a
reason to come back tomorrow. Closes M-02, M-03, M-06, M-16, M-17, M-18,
L-02.

## Tasks

- [x] Drill list shows progress per template (mastery dots), a "Today" card (`nextDue()`), streak (local, with the "this browser only" note), and hides tiers by mode consistently; Next drill respects the visible list.
- [x] Hint behind `<details>` after the first Check; `hintUsed` recorded.
- [x] Coach line persists through the attempt; after Check, ghost ticks + "Apply the answer" (tier B badge) reuse the Race components; a diff of what changed.
- [x] Score sheet: distance in steps per control, loss, tier, the model-vs-guide note when H-04 applies, personal best delta, "solved with a hint".
- [x] Daily challenge = deterministic seed from the date; shareable URL `#/drills/<template>/<seed>` (needs phase 04 router).
- [x] Phone layout: coach + controls first, score sheet as a sheet.

## Verification

```sh
make check
```

Manual: complete a drill twice on two days (fake the clock) and see the schedule move.

## Artifacts

- `src/ui/drills/{DrillList,DrillView,ScoreSheet,Today}.svelte`.

## Progress log

- **2026-08-25 — screens landed, `make check` green (862 tests, 56 files).**

  **Shipped.** `src/ui/drills/progress.ts` (+ test): `streakDays`,
  `masteryLevel`, `drillHash`/`parseDrillHash`, all pure with `now` injected.
  `src/ui/drills/Today.svelte` (new). Rewritten: `DrillView.svelte`,
  `Drills.svelte`. Edited: `ScoreSheet.svelte`, `DrillCard.svelte`,
  `store.svelte.ts`, `More.svelte` (the "Drill progress" card only).

  **Store additions**, all additive, all tested: `streak` (folded in
  `refresh()`), `today` (the most overdue template the current mode can see),
  `exportHistory()`, `resetHistory()`, and `DrillScore.prevBestSteps` so the
  sheet can name the record it beat. `track('drill.started')` fires in
  `open()`, `track('drill.checked')` in `check()` — the enum spells them
  `.started`/`.checked`, and until now nothing but the router called `track`.

  **The answer key stays hidden until the first Check.** Ghost ticks, the
  `Readouts` target column and "Apply the answer" all read
  `score.optimum.race`, which only exists once the learner has committed to an
  answer. Showing the target VMG up front would have handed over the drill; a
  live VMG readout that moves with the sliders is a hill to climb, a target
  value is the summit's altitude. M-16's live distance-to-goal is therefore
  "N clicks from the model's trim", recomputed on every move *after* Check.

  **M-06, on a phone.** The audit's fix was "keep the sheet mounted, dim it",
  but this phase also moves the score sheet into a bottom `Sheet` below 720 px,
  where a modal is by definition not co-visible with the sliders. So the coach
  line moved out of `ScoreSheet` into the Goal card — one place, above the
  controls in phone DOM order, dimmed rather than unmounted when the trim moves.
  The score sheet keeps the medal, the per-control ladder and the notes. The
  stronger fix for co-visibility is the ghost ticks: the correction is now *on*
  the control it names, so it does not have to be memorised at all.

  **M-03 verified closed**, not re-fixed: phase 01 had already moved the tier
  filter into `store.visible` and pointed `next()` at it. Added a test that the
  visible list is tier-ordered and that Advanced is Simple plus tier 3 in the
  same relative order, so a future sort cannot silently split the two curricula
  again.

  **Deep links without the router.** `router.parseHash` resolves
  `#/drills/<id>/<seed>` to the `drills` route and discards the rest, which is
  all this needs: `Drills.svelte` reads `location.hash` through
  `parseDrillHash` on mount and on `hashchange`, defensively (a bad seed, a
  stray `%`, a missing template all fall through to the list). Phase 04 owns
  the router and can hoist the parse; nothing here needs changing when it does.
  Share copies the absolute URL — the hash alone is not pasteable — and falls
  back to a Toast naming the hash when the clipboard is refused, which it is in
  any insecure context.

  **Streak rules** (`prov: assumed`, benchmarked against Duolingo/chess.com in
  audit M-18): consecutive local calendar days with ≥ 1 Check, counting back
  from today *or* yesterday — one day of forgiveness, not a hard reset. Days
  are walked from local noon, because stepping 86 400 000 ms from midnight
  double-counts a day when the clocks go back; there is a test for it. The
  "this browser only" note is on the Today card and again on More.

  **Not done, deliberately.** No celebration animation on a new best (a line of
  text says it; a confetti burst is phase 03 polish at best). No per-theme
  strike-rate dashboard from M-17 — the attempt history now supports it, the
  nine templates do not yet carry themes. Mastery is the best medal, not a
  rolling average: an average punishes the practice the spacing schedule exists
  to encourage.

  **Not browser-verified.** `make check` is green and `pnpm build` succeeds, but
  the two-day manual check (fake the clock, watch the schedule move) has not
  been run in a browser in this worktree.
