# 04 — State: plans, audits, CHANGELOG, runbooks, README, CLAUDE.md

<a id="h-08"></a>
### H-08 — `README.md` status is sixty PRs stale and states a gate that no longer exists
- `README.md:18` "Epic 1 phases 00–07 merged; phase 08 in progress … fails on 2 of 10 held-out rows"; no mention of drills v2, cockpit, 3D, gennaker; no live URL.

<a id="h-09"></a>
### H-09 — Finished plans read as live; one has no status line
- `docs/plans/2026-08-25-cockpit/README.md:3` and `…drills-and-loop/README.md:3` `🟡 In progress` with every phase 🟢 (closed by #67, #49); `…desktop-kite/README.md` has no `- **Status:**` line → `docs/plans/README.md` prints `?`; `…mvp-analyser/phase-06-disagreement-and-log.md:3` `🔵 Not started` with all tasks ticked and "Phase closed".

<a id="h-10"></a>
### H-10 — desktop-kite "State at end" is four PRs stale and lists #78/#79 as next work (`README.md:72–84`).

<a id="h-11"></a>
### H-11 — `package.json:4` is `0.1.0`; `CHANGELOG.md:10–12` requires a bump per merged batch; `More.svelte:150` renders it and `:312` puts it in the feedback issue. `[0.1.0]` covers #1–#40; #41–#80 sit under `[Unreleased]`.

<a id="h-12"></a>
### H-12 — `docs/runbooks/release-and-pwa-cache-bust.md:21–26, 50` says `src/main.ts` registers the SW and fires a `confirm()`; `src/main.ts:8–9` says registration and the toast live in `App.svelte` (#46, `CHANGELOG.md:230–231`).

### M-32 — `[Unreleased]` contradicts itself: `:118` "times a warm second frame" vs `:111–112`; `:79–80` "each panel scrolls its own body" vs `:18–25`; three `### Changed` and three `### Fixed` headings plus `### Fixed (earlier in this block)`; #66, #78, #80 absent; the #79 entry unnumbered.
### M-33 — `CLAUDE.md:127–128` "Current build plan: mvp-analyser" — four plans later; `:142` places `PROVENANCE.md` "next to the data" (it is at the root).
### M-34 — ux-01 M-18 (helm load) and M-19 (A/B compare) shipped (#52, #58) but unticked; `ux-excellence/README.md:66–67` repeats them as open. Unticked tasks in 🟢 phases: `ux-excellence/phase-01:21`, `phase-05:20`, `drills-and-loop/phase-03:13`, `mvp-analyser/phase-02:25`. `drills-and-loop/phase-00-p0-defects.md:11–25` lists H-01–H-07 twice, half ticked.
### M-35 — Runbook stamps predate the changes they cover: `add-a-boat-class.md:94` (`a55d993`; `j70.json` changed in #56, #58, #75, #79), `run-validation-and-recalibrate.md:55` (`4d50e8f`; validation/calibration changed in eight PRs since).
### M-36 — `validation/README.md` (see 01 M-01/M-02).
### L-12 — `docs/runbooks/README.md:36–42` index leaks wrapped Last-verified prose into the table (five of seven rows).
### L-13 — `start-a-new-project.md:139` cites `6ced8b9`, not a commit in this repo; deleting the file is still an open owner decision in `mvp-analyser/README.md:76–77`.
### L-14 — `make docs-check` was red while this audit's directory lacked its summary (fixed by publishing).
