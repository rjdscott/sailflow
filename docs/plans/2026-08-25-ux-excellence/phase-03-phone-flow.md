# Phase 03: Phone flow and loading states

## Goal

A beginner on a 390 px phone sees the instruction first, never a
"Searching…" they did not ask for, never an "n/a" that means "wait", and
cannot commit the rig by accident. Closes M-03, M-04, M-05, M-07, M-10,
M-14, and the dock scoring latency risk.

## Tasks

- [ ] Coach line moves above the picture card on phone (M-04).
- [ ] Plan view (telltales) is the default tab on phone; remember the tab
      in `localStorage` (M-10).
- [ ] Commit bar: labelled ("Commit +3.0 / −2.0 / 0 mm for today"), scrim
      behind it, two-step (tap → "Confirm") on phone (M-03).
- [ ] Model-vs-guides: skeleton rows while `busy`, "no guide value" vs
      "computing…" distinguished, "These disagree." only when a delta exists
      (M-05).
- [ ] Applying a suggestion while locked today prompts to unlock first (M-07).
- [ ] Dock columns get `.stack` (M-14).
- [ ] Measure dock initial scoring on a mid phone; if >2 s, precompute
      T*(w) for the default forecast at build time or shrink the grid, and
      show a progress fraction instead of "Scoring…".
- [ ] Tests: commit two-step state machine; panel loading states.

## Verification

```sh
make check
```

Manual on the phone harness and a real phone via the Pages URL.

## Artifacts

- Updated `Dock.svelte`, `Race.svelte`, `disagree/Panel.svelte`.

## Progress log

_None yet._
