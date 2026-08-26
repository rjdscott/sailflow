# Punchlist — ux-02

Priority: **P0** ship-blocker, **P1** before public release, **P2** soon,
**P3** nice. Details in [01-drills.md](01-drills.md),
[02-race-dock.md](02-race-dock.md), [03-log-more.md](03-log-more.md),
[04-shell-and-strategy.md](04-shell-and-strategy.md). Remediation PRs cite the
finding code.

## P0 — ship-blocker

- [x] **H-01** (P0, M) Drill answer key is the `baseRace()` constant, so every per-control coaching line is fabricated — score against `optimalTrim` run from `drill.start` with the drill's locked controls held, via the existing worker request plus an `only` option; suppress the ladder and coach line until it lands.
- [x] **H-02** (P0, M) Scoring measures nothing: 8 of 10 drills medal on arrival, 2 of them Gold, and the bands are finer than the model's held-out error — CI-gate every drill start against the model, score control-space distance *and* VMG loss, widen the bands, badge the loss.
- [x] **H-03** (P0, M) Two drills are unwinnable and three teach a control the shape layer never reads — sensitivity-gate `free`/`freeDown` in `drills.test.ts`, retire or rebuild `t3-12` and `t3-10`, drop cunningham and inhauler from `free`.
- [x] **H-04** (P0, M) The model's own optimum inverts the tuning guide the drill teaches (backstay 60→80 in 6 kt flat, 30→15 in 20 kt) — render both and the delta via `src/ui/disagree`, or suppress any imperative whose control's full-range spread is under the gold band.
- [x] **H-05** (P0, M) Log entry form overflows horizontally at every breakpoint and opens as a wall of zeros — `.row` to `grid` `auto-fit minmax(7rem,1fr)` plus `min-width:0`/`width:100%` in `NumberField`, seed from `conditions`/`rigLock` and allow null.
- [x] **H-06** (P0, S) Log editor shallow-copies the entry, so Cancel keeps the edits and a Dock draft writes into the committed rig — `form = $state.snapshot(entry)` at `Log.svelte:111` and around the draft merge at `:102`.
- [x] **H-07** (P0, M) Race's optimum is path-dependent while the Why copy claims a global answer — reword `Race.svelte:191-195`, and add a coarse trim term to `optimumKey` or grey the ticks once trim drifts a step.

## P1 — before public release

- [x] **M-01** (P1, M) No onboarding, no purpose statement, loop not visible, default route lands on Race — `.lede` on Race, `<meta name="description">`, About to the top of More, tabs reordered Dock/Race/Drills/Log/More, uncommitted-rig banner, three in-content handoffs.
- [x] **M-02** (P1, S) The hint prints the answer before the attempt — wrap it in the `<details>` primitive already in `DrillView.svelte`, keep the brief visible; `hintUsed` and the silver cap ride the v2 schema.
- [x] **M-03** (P1, S) "Next drill" walks raw JSON order into the tiers Simple mode hides — move the tier filter into the store as a `visible` getter, sort by tier then index, end the set instead of wrapping.
- [x] **M-04** (P1, S) Dock's "starts a log entry" is a volatile in-memory draft nothing surfaces — seed `Log.svelte:102` from `rigLock.locked`, drop `clearDraft()` from Cancel, add a waiting-to-be-logged card and a commit toast.
- [x] **M-05** (P1, M) Nothing is addressable: no drill/scenario URL, Back leaves the drill, conditions and trim not persisted, static `<title>` — `parseHash` to `{route, param}`, condition packed into the query, one versioned persistence key, nav as `<a>`, per-route title and focus.
- [x] **M-06** (P1, S) The coach line unmounts on the first slider move — keep the sheet mounted and mark it stale rather than gating it on `drills.score`.
- [x] **M-07** (P1, S) A failed log read renders as "No entries yet" and a failed save says nothing — `error` state on `LogUiStore` around all four writers, and stop `writeAll` swallowing.
- [x] **M-08** (P1, M) Log race/dock fields drop units, ranges and steps, and no path fills them — delete `RACE_FIELDS`, drive both rows off `CONTROLS`, add `min`/`max` to `NumberField`, add "Save this trim to the log" / "Load into Race".
- [x] **M-09** (P1, S) Downwind the target delta is signed backwards against the coach line on the same card — sign it with `objectiveKt` semantics as gap-to-target; add the downwind case beside `targetOf`.
- [x] **M-16** (P1, M) Drills have no target, no distance-to-goal and no ghost ticks — show the goal and a "vs start" delta on open, pass `target` into the free-control sliders after Check, add "Show the optimum"; blocked on H-01.
- [x] **M-17** (P1, M) No attempt history, spacing or retrieval schedule — bump to `sailflow.drills.v2` with `{best, attempts, lastISO, lastMedal}`, resurface failed drills at 1/3/7 days, add a "due today" row.

## P2 — soon

- [x] **M-10** (P2, S) "Flat" means sea state and ORC depower on one screen, "Height" mislabels TWA, no readout has an explainer — rename to TWA and Depower, add `?` sheets reusing the `EXPLAIN` pattern.
- [x] **M-11** (P2, S) Dock's provisional regret wears an A badge above its own hedge — suppress the value while provisional or label the badge provisional, hoist the definition under the title.
- [x] **M-12** (P2, S) Simple/Advanced is global but rendered per screen, inert on Log and More — make `TopBar`'s toggle opt-in and add a mode row to More.
- [x] **M-13** (P2, M) No keyboard shortcuts on a desktop study tool — one `svelte:window` handler plus a `?` help sheet.
- [x] **M-14** (P2, S) Scroll position carries across tab switches — per-route offset map restored in one `$effect`.
- [ ] **M-15** (P2, M) "Clicks" are 5 %-of-range slider steps, not purchase-derived — express deltas in turns, holes, cm and purchase pulls from the committed `purchaseMin`/`purchaseMax`.
- [x] **M-18** (P2, M) No streak, daily challenge, list progress or celebration — date-derived drill of the day, streak chip with one day's forgiveness, "x of 10 attempted · Start here →", best on the card face and in the ScoreSheet.
- [x] **M-19** (#46) (P2, S) The log's daily ritual starts from a blank 20-field form — prefill date/forecast/dock from `rigLock.locked` and race from live trim, add "Log this day" on Dock and Race.
- [x] **M-20** (P2, M) The log is write-only and records no outcome — search over venue/notes, forecast-vs-actual delta on the card, "Open on the Dock", then a `result` field plus the model's prediction at the actual wind.
- [x] **M-21** (P2, S) Import merges irreversibly and there is no reset — wire the existing `LogStore.clear()` to a two-step button on More, confirm the import count before writing.
- [x] **M-22** (P2, M) The three honesty links are network-only in an offline app — inline the markdown with Vite `?raw` into the existing `Sheet`.
- [x] **M-23** (P2, S) The log's empty state is inert while Export/Import take equal billing — disable Export at zero entries, put the primary action in the empty card, collapse backup into a disclosure.
- [ ] **M-24** (P2, M) Race ignores the forecast band the rig was committed against — mark the band on the TWS control and warn outside it; then a min/likely/max compare strip.
- [x] **M-25** (P2, M) Nothing prints — one `@media print` block plus a tuning-card layout from data already on screen.
- [x] **M-26** (P2, S) Apply optimum rewrites eight sliders with no statement of what changed — render `optimum.moved` as before → after against the state `race.remember()` already parks.
- [x] **M-27** (P2, M) The polar hold-out gate FAILs and CI never notices — CI job diffing the regenerated report row-by-row, failing on regression against a frozen baseline; publish the table in-app.
- [ ] **M-28** (P2, L) Downwind is the largest modelling deficit and where the coach emits noise — next physics epic (tack-line/sprit/rotation, downwind righting moment, planing relief); until then suppress sub-resolution downwind recommendations.
- [x] **M-29** (P2, S) No in-app feedback path — "This felt wrong" link per solving screen, pre-filling a GitHub issue by URL with the visible state; no upload.
- [x] **M-30** (P2, M) Zero usage instrumentation — local-only counters surfaced to the user as a "your practice" panel and folded into the log export; nothing leaves the device.

## P3 — nice

- [x] **L-01** (P3, S) `#/kit` ships in production with untiered invented numbers and a duplicate nav — gate route and import on `import.meta.env.DEV`, toast the unknown-hash redirect.
- [x] **L-02** (P3, S) Drill progress is invisible, unexportable and unresettable on More — one Data row, fold `sailflow.drills.v1` into the log export, confirm-guarded reset.
- [x] **L-03** (P3, M) More has no units, no reduced-motion override, and About is a 100-word jargon block at the bottom — Motion control, kg/lb toggle, plain-language lead.
- [x] **L-04** (P3, S) No release surface: v0.1.0 since the initial commit, no changelog, native `confirm()` — bump per batch, add `CHANGELOG.md`, "What's new" line plus build stamp, in-app update toast.
- [ ] **L-05** (P3, M) A second class is blocked by eight hardcoded `boats/j70.json` imports — one `src/lib/boat.ts` export, repoint all eight, glob the provenance script.

## Reconciliation — 2026-08-26

Checked against `main` at `3a2e96d`.

- **M-19** — ticked, closed incidentally by #46 (which cited M-01/M-05/M-10 and
  friends but shipped this too). The form seeds date, forecast and dock from the
  committed rig and merges the Dock draft rather than opening blank
  (`src/ui/screens/Log.svelte:84,89`); Dock starts the draft on commit
  (`src/ui/screens/Dock.svelte:36`); Race hands the live trim over and navigates
  (`logTrim()`, `src/ui/screens/Race.svelte:151-162`, wired at `:341`).
- **M-24** — half done, so it stays open. The committed band *is* on screen and
  clickable: `ConditionsStrip.svelte:29,76-85` renders "Committed: X–Y kt" and
  `takeForecast()` snaps the condition back to it (#46). Not done: no warning
  when the live TWS is outside that band, and no min/likely/max compare strip.
  Deferred to phase two.
- **M-15** — open, unchanged. Nothing in `src/ui` reads `purchaseMin`/
  `purchaseMax`; the coach line still says "one click"
  (`src/ui/explain.ts:97-98`). This blocks ux-03 M-03, which says so.
  Deferred to phase two.
- **M-28** — open. #79, #86 and #87 improved downwind honesty (the mainsheet
  eases with the point of sail, the shape datum under the kite is the downwind
  base trim, `notSolved` says what it does not solve), but the physics epic the
  finding asks for — tack line, sprit, rotation, downwind righting moment,
  planing relief — is unstarted, and sub-resolution downwind recommendations are
  still emitted. Deferred to phase two.
- **L-05** — open, and larger than when it was written: 15 files import
  `data/boats/j70.json` directly (`grep -rn "boats/j70.json" src/`), and there is
  no `src/lib/boat.ts`. Deferred to phase two.

## Log

- 2026-08-26 — reconciled against main at `3a2e96d`; 1 ticked, 4 deferred.

