# Phase 05 — Polish, snapshots, audit tick-off, 0.5.0

**Goal.** The remaining audit ux-04 items land, the README screenshots show
the Simulator, the audit punchlist is ticked against git history, and
0.5.0 is cut.

## Tasks

- [x] M-04 — hero re-fits on `.hero-boat` resize (`ResizeObserver` →
  `presets.ts` fit); Learn tier frames the whole boat at 1440.
- [x] M-05 — Log empty state's second sentence.
- [x] M-06 — `Lull` / `Shift` / `Replay a gust` grouped under a "Simulate"
  label with ▶ glyphs; TWS cell pulses during a replay.
- [x] README screenshots reshot (desktop 1440, phone 390) per the
  `docs/runbooks/` screenshot runbook; "Dock" wording gone from README,
  `initial-prompt.md` note, More → About.
- [x] `docs/audits/2026-08-28-ux-04/todo.md` ticked with PR numbers.
- [x] `CHANGELOG.md` 0.5.0; `package.json` version; tag per the release
  runbook.
- [x] Successor audit `ux-05` **not** in this plan — the owner shares the app
  first and the next audit takes the skipper's feedback as input.

Also carried in from phases 01–04:

- [x] `Race.svelte`'s apply-optimum tween reads `settings.motion` (phase 01).
- [x] `data-tour="rig"` for tour card 2's spotlight (phase 02).
- [x] The 1920×1080 one-short-scroll gate, red on `main` at 1626 px (phase 04).
- [x] The three specs that flaked only under a full parallel run (phase 04).

## Verification

```sh
make check
pnpm test:ui
pnpm build && du -sh dist   # bundle gate still green
```

## Artifacts

- Reshot screenshots; ticked `todo.md`; 0.5.0 in CHANGELOG and tag.

## Progress log


### 2026-08-28 — built by Opus on `feat/simulator-polish-0-5-0` (PR #111)

Branch off `main` at 03dcc99, in a worktree. Everything above shipped, plus the
four items phases 01–04 handed forward.

**The 1920×1080 gate: 1626 px → 1593 px, against a 1600 px budget.** The
budget stands; the 33 px came off three pieces of furniture, none of it off the
cockpit:

- *The replay chips were still 44 px in the cockpit* (−10). `PuffReplay.svelte`
  had its `@media (min-width: 1280px) { .chip { min-height: 32px } }` block
  written **above** the `.chip` rule it was overriding. A media query adds no
  specificity, so the later rule won and the three chips stayed at thumb size —
  making the whole actions row 44 px tall where every other control in it is
  32. Moving the block below the rule is the fix.
- *Panel padding is the cockpit's, not the phone's* (−16). `.cockpit .panel`
  takes `var(--space-3)` instead of `Panel`'s own `var(--space-4)` at ≥ 1280,
  twice over because there are two panel rows. The phone keeps 16 px.
- *Panels stopped stretching to their grid row* (−7 of document height, and
  that is not the point of it: see below).

**The half-empty cards.** A grid row is as tall as the taller of its two
panels, and `align-items: stretch` made the shorter one pretend to fill it: at
1440 the Headsail card ran 200 px past its last control to match Mainsail's,
and Helm — three fields and two gauges since crew weight moved to the band —
was a **510 px card around 124 px of content** (at 1920: 580 px around 177).
`align-self: start` on the four panel cells, with `align-self: stretch` kept on
the hero because it spans both rows and has no intrinsic height, gives every
card its own height. The row keeps its height, so the void is now page rather
than card. Measured after: Helm 177 px at 1920 for 177 px of content.
`race.spec` pins it — a panel may be at most 8 px taller than its head, grid
and padding.

**A collision the screenshots caught.** At Learn density every band reading
also prints its delta in words, which is 422 px of content in the band's 359 px
left half at 1440: flex shrank the cells past their own labels, `%POLAR ?` ran
under the VMG value beside it, and `.bar`'s `overflow: hidden` cut off the
rest. Three one-liners: the delta label gets `white-space: normal` when the
Learn tier un-hides it (the `nowrap` belonged to the sr-only clip), the cell's
label line may wrap its tier badge, and `.cells` wraps rather than squeezing.
At Learn the three readings stack; at the race tier, where the words are for
the screen reader only, nothing wraps and the band is unchanged. Pinned in
both tiers by `no instrument cell overflows its box`.

**M-04 was already fixed; it needed measuring, not rebuilding.** The audit
asked for a `ResizeObserver` on `.hero-boat` feeding the `presets.ts` fit.
`SailView3D` has had one since #72 (both axes since #101), and in the cockpit
`--hero-h` is `100cqh`, so the canvas does resize with its card. Measured at
Learn/1440: the head of the mainsail projects to **11 % of the canvas height**,
inside the top quarter, whole boat in frame. The regression test projects the
mesh through the live camera rather than reading pixels out of a WebGL canvas,
which is why `camera` joined the `__sail` DEV handle.

**M-05's proposed sentence was false, so it is not the one that shipped.** The
audit wanted "Next time you open Dock with a similar forecast, the setup you
logged is the first suggestion." `suggest()` scores a candidate grid by
expected regret over the forecast (`ui/dock/logic.ts`, `pickBest`) and never
reads the log. What is true is the link every entry carries (`entryShare` →
`sim` with the condition, the rig and the trim), and that is what the empty
card now says.

**The three flakes, made deterministic.** `share.spec`'s `settled()` — the
only helper that also waits for the band's 260 ms number tween — moved to
`tests/ui/fixtures.ts` and is now the suite's one definition of "the Simulator
has stopped changing on its own". `race.spec`'s own `settled` calls it after
`heroDrawn`; `boat.spec`'s `crewRange` calls it before reading the class
limits (it was waiting 5 s for a band that mounts on the first solve); and
`phone-perf` calls it before counting WebGL contexts. That last one also had a
real bug behind it: **`__sailViewReady` was never cleared on unmount**, so
after the first visit `heroReady()` returned immediately and the loop could
navigate away before the next view had made its context. `SailView3D` deletes
the flag with the rest of its DEV handle now.

**Wording.** `grep -rn "Dock" src README.md` leaves the class-rule sentences
(`explain.ts`'s "committed at the dock", the rig-lock copy, the tour's
C.9.5(a)), the `DockControls` / `DockScore` / `syncDock` / `DOCK_KEYS`
identifiers — which are the share schema and the worker protocol, not
navigation — and the history in `router.svelte.ts` about old links. The Log's
`Dock setup` heading is `Rig setup`; the comments in `format.ts`, `app.css`,
`BottomNav.svelte`, `guides.ts`, `ControlRow.svelte`, `log/store.svelte.ts` and
`Log.svelte` name the Rig panel. More → About never mentioned either screen, so
nothing changed there; `docs/initial-prompt.md` keeps phase 03's one-line
superseded note and is otherwise untouched, as a record.

**Screenshots.** `docs/img/race-desktop.png` and `race-phone.png` are replaced
by `sim-desktop.png` (1440, the whole cockpit) and `sim-phone.png` (390 @2x,
the top 1180 px), both reshot from `vite preview` at this commit, with new
captions. The recipe is now
[`docs/runbooks/reshoot-readme-screenshots.md`](../../runbooks/reshoot-readme-screenshots.md),
which the plan assumed existed and did not.

**Gates.** `make check` green (docs-check, contrast, 10 pytest, lint +
prettier, `svelte-check` 0 errors 0 warnings, 1305 vitest tests).
`pnpm test:ui` **98 passed**, including the 1920 gate that was red on `main`.
`pnpm build` + `scripts/bundle_check.mjs` green: first load 112 432 B gzip
against a 113 178 B limit — **746 B of headroom**, worth knowing before the
next feature lands. Pixel baselines regenerated inside
`mcr.microsoft.com/playwright:v1.62.1-noble` (96 → 98 passed in the image).

**Not done, deliberately.** The Rig panel at Learn/390 is 958 px against ADR
0021's 844 px revisit trigger; phase 04 measured it and left the decision here,
and the decision is to leave it — Mainsail at the same tier and width is
1808 px, so a Rig panel that is 1.1 viewports is not the outlier the trigger
imagined, and splitting the panel would undo the merge this plan exists to
make. `race.spec` pins it at 1100 px so it cannot grow quietly. The successor
audit `ux-05` stays out of this plan, as written above.
