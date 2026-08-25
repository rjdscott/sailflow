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
- [x] Measure dock initial scoring on a mid phone; if >2 s, precompute
      T*(w) for the default forecast at build time or shrink the grid, and
      show a progress fraction instead of "Scoring…".
      Measured (10.5 s on a warm desktop, see log); the follow-up PR closed
      it in `src/core` + `src/worker` — coarse `DOCK_ITERS`, a provisional
      first pass, and a real `n / 324` progress fraction. Still owed: a
      measurement on real phone hardware.
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

### 2026-08-25 — Dock scoring latency

Baseline, measured on desktop with a scratch harness (default forecast
8/12/16 kt, 36 candidates + the user's setup, 9 wind speeds = 324 lap solves):
**10 594 ms** to first regret number. Each lap is two `optimal()` calls with
`optimiseTwa: true`, i.e. a 12-iteration golden search on `flat` nested inside
a 16-iteration one on TWA — about 600 equilibrium solves per lap.

Two changes, both measured before being kept.

**1. Progress over the protocol (additive, `PROTOCOL_VERSION` stays 1).**
`dockScore` requests may carry `progress: true`; the worker then posts
`{ type: 'progress', id, done, total }` messages before the `ok`. `handle()`
takes an optional `emit` callback (defaulting to a no-op) that the real
`onmessage` wires to `postMessage`. `SolverClient.request` gained an optional
second argument `{ onProgress }`; a `progress` message fires the callback and
leaves the request pending, so a client that ignores it still resolves
normally. `stubClient` ignores the option entirely. `DockStore.progress`
exposes `{ done, total } | null` and `RegretCard` renders "Scoring 47 / 324…".

**2. Cut the work.** Options weighed by measurement:

| Variant | First paint | Full result | Worst Δ expected regret vs full |
|---|---|---|---|
| Baseline (flat 12 / TWA 16) | 10 594 ms | 10 594 ms | — |
| Coarse budgets flat 7 / TWA 8 | — | 4 176 ms | 0.18 s/mi |
| Shared TWA per wind speed | — | 838 ms | 1.71 s/mi — rejected |
| **Coarse + provisional first pass** | **719 ms** | **4 235 ms** | 0.18 s/mi |

Option (b) chosen and capped at flat 7 / TWA 8: a sweep over three setups ×
four wind speeds put worst-case lap-time error at 0.35 %, and the knock-on to
a delivered expected-regret figure at 0.18 s/mile — under a tenth of the
2 s/mile tie band the UI already refuses to resolve inside. The budgets live
in `DOCK_ITERS` in `core/solve/dock.ts` and are passed through a new optional
`OptimalOptions.iters`; `optimal()`'s own defaults are untouched, so race
mode, calibration and the polar are unaffected and `validation/golden` replays
byte-identical (no `pnpm golden` needed).

Rejected: solving the optimal TWA once per wind speed against a reference rig
and holding it for every candidate. It is 19× faster and the argmax TWA barely
moves across the legal grid (≤ 0.1° at most wind speeds) — but at 16 kt
downwind the model's VMG-vs-TWA curve is genuinely spiky and multi-modal
(7.36 kt at 144°, 6.12 kt at 146° for a neighbouring rig), and collapsing to a
shared angle moved some setups' expected regret by 1.7 s/mile. On a quantity
whose values here run 0.0–0.5 s/mile that is not a rounding error. Noted in
passing: the same spikiness means the downwind `optimiseTwa` search is already
running golden section on a non-unimodal function. Not touched here — it is a
solver-physics question, not a latency one.

Option (a) also shipped, in the cheapest form that needed no new protocol
message: `DockStore.send()` now scores twice. The first pass uses
`quickCandidates()` (five setups spread through the grid) and paints in
**719 ms**; the second uses the full grid and replaces it. `RegretCard` labels
the first "Provisional — measured against five reference setups so far, so it
can only rise", which is exactly the direction the error runs: T*(w) over a
subset can only be slower than the true optimum. The solver's `lapCache` means
the second pass re-solves only the candidates the first did not cover, so the
two passes cost 333 laps against 324 for one.

Option (c), shrinking `candidateSetups()`, was not used — it changes which
setups can be suggested.

Net: first paint 10 594 ms → **719 ms**, final number → 4 235 ms with a live
count, and a slider nudge against a warm grid is 113 ms. All desktop; a phone
is several times slower, so the final number is still the slow part and the
progress count is what carries it. Not yet measured on real phone hardware —
the manual pass below still owes that.

### 2026-08-25 — Leftovers

- **M-06** (`disagree/Panel.svelte`): the three delta cells lost their
  valenced `muted`/`warn`/`bad` ramp and are now neutral `--ink-2`, with a
  legend line under the copy. The legend reads "Δ = model − guide, in the
  guide's units", not "guide − model" as the task text had it: the code
  computes `model - guide` (`Panel.svelte:88`) and the divergence log persists
  the same convention, so the stated direction was the one that would have
  been a lie. The history list keeps the magnitude ramp — ranking gaps is that
  list's whole job.
- The 🔒 emoji in the Dock top bar is now `<LockIcon />`, stroked in
  `currentColor` like the rest of the icon set.

Verification: `make check` green (docs, lint, typecheck, 672 tests).
New tests: worker round-trip asserts progress fires only when asked and is
JSON-safe; client asserts callbacks arrive before the result and never after;
`solve.test.ts` asserts the coarse budgets stay within 0.5 % of the full solve
at three conditions and that progress cannot change the result; store tests
cover the provisional→full handover and stale-run progress.
