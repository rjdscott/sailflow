# Phase 03: Phone flow and loading states

## Goal

A beginner on a 390 px phone sees the instruction first, never a
"Searching…" they did not ask for, never an "n/a" that means "wait", and
cannot commit the rig by accident. Closes M-03, M-04, M-05, M-07, M-10,
M-14, and the dock scoring latency risk.

## Tasks

- [x] Coach line moves above the picture card on phone (M-04).
- [x] Plan view (telltales) is the default tab on phone; remember the tab
      in `localStorage` (M-10).
- [x] Commit bar: labelled ("Commit +3.0 / −2.0 / 0 mm for today"), scrim
      behind it, two-step (tap → "Confirm") on phone (M-03).
- [x] Model-vs-guides: skeleton rows while `busy`, "no guide value" vs
      "computing…" distinguished, "These disagree." only when a delta exists
      (M-05).
- [x] Applying a suggestion while locked today prompts to unlock first (M-07).
- [x] Dock columns get `.stack` (M-14).
- [ ] Measure dock initial scoring on a mid phone; if >2 s, precompute
      T*(w) for the default forecast at build time or shrink the grid, and
      show a progress fraction instead of "Scoring…".
      Measured (10.5 s on a warm desktop, see log) and the wait now names its
      own size; the precompute/grid-shrink and the progress fraction are
      **still open** — both need `src/core` or `src/worker`, which this phase
      does not own.
- [x] Tests: commit two-step state machine; panel loading states.

## Verification

```sh
make check
```

Manual on the phone harness and a real phone via the Pages URL.

## Artifacts

- Updated `Dock.svelte`, `Race.svelte`, `disagree/Panel.svelte`.

## Progress log

### 2026-08-25 — phone flow and loading states landed

`make check` green (630 tests, 0 svelte-check problems, prettier clean).

**M-04.** The insight card is now a `{#snippet insight()}` in `Race.svelte`
rendered twice — `.coach-sm` first in `.col-primary`, `.coach-md` in
`.col-secondary` — with a local 720 px media query picking one. 720 px, not the
1024 px of `.lg-only/.lg-hide`, because 720 is where `.screen` becomes two
columns and the secondary column stops being "a screen further down".

**M-10.** `Race.svelte` defaults the picture tab to `TABS.indexOf('Plan')` and
persists the choice in `sailflow.race.tab.v1`, read and written through
try/catch like `rigLock`. A missing key, a non-integer and an out-of-range index
all fall back to Plan. The telltale legend that M-10 also asks for belongs to
`PlanView` (owned elsewhere) and is not in this change.

**M-03.** `.commit-bar` is a full-bleed plate — `background: var(--bg)`, top
hairline, `padding-inline` on the gutter — so it never sits on live numbers, and
the page tail padding went 72 → 104 px to keep the old slack under a taller bar.
The label states the consequence: "Commit +0.0 / +0.0 / 0 mm for today" (new
`shortSetup()` in `dock/logic.ts`, reused by `CommitButton` so desktop reads the
same). Phone is two-step: `DockStore.arm()` sets `armed`, a `COMMIT_ARM_MS`
(4 s) timer clears it, the second tap commits, and moving any slider disarms
(the label quotes the setup, so a changed setup voids the arming). Desktop keeps
one tap.

Deliberate divergence from the audit: 02-dock.md M-03's corrected fix says keep
commit one tap. The phase brief asked for arm → confirm on the phone bar, so
that is what shipped — the plate and the label are the audit's, the second tap
is not. Reverting is deleting the `arm`/`disarm` pair and the ternary in the
bar's `onclick`.

**M-05.** `Panel.svelte` no longer prints `n/a` for "still solving": the five
Model cells go through a `modelCell` snippet driven by `cellState(value, busy)`
— a muted `.skel` bar while solving, an em dash with a `title` and
visually-hidden "no published value in this guide" when the value genuinely does
not exist. The headline is derived by `verdict()`: "Comparing…" while the first
solve runs, "Nothing to compare yet" when no guide publishes a comparable
number, "These disagree." only when some |Δ| exceeds `NOISE` (0.5, the same
constant `deltaClass` uses), otherwise "Model and guides agree within the
noise". The "calibrated here" chip waits for the model, and `error` is now a
prop rendered in `--bad` — it was set on the store and read by nobody.

Stale-optimum (the unfiled issue noted inside M-05): `ModelOptimumStore.stale`
is `busy && optimum !== null`, and the Panel dims the grid and shows
"updating…" while a newer solve is in flight, instead of presenting the previous
condition's numbers as current.

**M-07.** `DockStore.apply()` refuses while `rigLock.lockedToday` and sets
`needsUnlock`. Refusing beats unlocking-with-a-reason here: unlock is the
C.9.5(a)-violating direction, so it stays the deliberate two-tap in
`CommitButton`, and a suggestion tap must not perform it by side effect.
`SuggestButton` gets `locked` (disables the `.pick` buttons, so the block is
visible before it is hit) and `needsUnlock` (turns the same note into a
`role="alert"` for the keyboard/programmatic path).

**M-14.** `stack` added to both Dock columns.

**Dock scoring latency.** Measured by calling `worker/solver.worker.ts`'s
`handle()` directly under `tsx` with exactly the payload `DockStore.send()`
issues on mount (1 setup + 36 candidates, forecast 8/12/16 kt, sea state 1,
300 kg): **10.5 s** — 10 791 ms cold, then 10 454 / 10 636 / 10 524 / 10 309 /
10 463 ms with `crewKg` varied to defeat the `lapCache` memo in
`core/solve/dock.ts`. That is a warm desktop JIT in Node; a mid phone will be
several times worse. The 9 × 36 = 324 lap solves at ~31 ms each are the whole
cost. Repeat scores of an already-seen (setup, wind, sea state, crew) are ~0 ms
off the memo, so only the first paint and any forecast/crew change pay it.

Well over the 2 s bar. What shipped is not a fix: `RegretCard` takes a
`busyNote` and the Dock passes "Scoring 9 wind speeds × 36 setups…", so the wait
states its size instead of a bare "Scoring…". A real fraction is impossible from
the UI side — `worker/protocol.ts` is one request, one response, with no
progress message — so a progress callback needs a protocol change, and
precomputing T*(w) or shrinking the grid needs `src/core`. Both are left for the
owner; neither is in this phase's file ownership.
- 2026-08-25 — Merged as PR #31 except the scoring-latency item (measured 10.5 s desktop); a follow-up PR adds worker progress messages and cuts the work. Arm→confirm on phone shipped per owner brief, diverging from the audit's one-tap suggestion; revert is deleting `arm/disarm`.
