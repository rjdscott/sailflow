# Phase 02: Drills experience

## Goal

The drill screen teaches: goal first, hint on request, live distance-to-goal
after Check with ghost ticks and Apply, a score that explains itself, a
reason to come back tomorrow. Closes M-02, M-03, M-06, M-16, M-17, M-18,
L-02.

## Tasks

- [ ] Drill list shows progress per template (mastery dots), a "Today" card (`nextDue()`), streak (local, with the "this browser only" note), and hides tiers by mode consistently; Next drill respects the visible list.
- [ ] Hint behind `<details>` after the first Check; `hintUsed` recorded.
- [ ] Coach line persists through the attempt; after Check, ghost ticks + "Apply the answer" (tier B badge) reuse the Race components; a diff of what changed.
- [ ] Score sheet: distance in steps per control, loss, tier, the model-vs-guide note when H-04 applies, personal best delta, "solved with a hint".
- [ ] Daily challenge = deterministic seed from the date; shareable URL `#/drills/<template>/<seed>` (needs phase 04 router).
- [ ] Phone layout: coach + controls first, score sheet as a sheet.

## Verification

```sh
make check
```

Manual: complete a drill twice on two days (fake the clock) and see the schedule move.

## Artifacts

- `src/ui/drills/{DrillList,DrillView,ScoreSheet,Today}.svelte`.

## Progress log

_None yet._
