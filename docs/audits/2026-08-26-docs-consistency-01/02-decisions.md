# 02 — Decisions: ADRs and the research chain against the code

<a id="h-06"></a>
### H-06 — ADR 0016's "1920×1080 holds the whole cockpit" is false and its own test says so
- `docs/adr/0016-…md:53–55`; `tests/ui/race.spec.ts:153` "ADR 0016 aimed at 'the document fits 1080'. It does not: measured 1384 px", asserting `≤ 1600`; `phase-04-close-out.md:131` "doc 1539 px" while `:9` ticks "all on screen".
- Fix: dated Consequences amendment (measured 1522–1539 px; promise is "one short scroll, hero ≥ 480 px, Apply above the fold"); status line noting it; reword phase-04 task and README goal.

<a id="h-07"></a>
### H-07 — ADR 0017 is false in three places with no amendment
- `0017:50–54` "luff sagging to leeward" — `src/ui/three/kite.ts:183` `luffLateral` → windward past ~102° AWA (#76); `0017:64–65` "`src/core` untouched" — `flying.ts` asym constants (#76) and `FLAT_MIN_SPINNAKER` (#75) changed under the same plan; `0017:68–70` revisit trigger ("a downwind shape dataset exists") fired per research doc 04. Also: leech bulge (#80) is a fifth mapping output; tags are now published/derived, not all assumed.
- Fix: dated Consequences amendment + status line.

<a id="h-17"></a>
### H-17 — ADR 0001 still says `main` is branch-protected; ADR 0002 reversed it
- `0001:74` "'Never push to main' is enforced by branch protection"; `0002:3` Accepted, "leave `main` unprotected"; `0001:3` carries no marker.
- Fix: status line "branch-protection consequence superseded by 0002" + one-line Consequences note.

<a id="h-18"></a>
### H-18 — ADR 0008 commits to a tuning-guide importer that does not exist
- `0008:44` "The importer from option B is still built"; `grep -rni importer src` → 0; only `src/lib/logExport.ts` imports anything.
- Fix: dated "not built; deferred" note in 0008 Consequences; track or retire.

<a id="h-19"></a>
### H-19 — Phase 05 carries a false premise and a fabricated citation
- `phase-05-kite-shape-from-research.md:18` "the flying shape does not feed the aero tables", `:26` "pnpm validate unchanged" (both ticked); `:56–57` "Doc 04 §3 says the flying shape does not feed the aero tables" — `04-model-implications.md:217–259` never says it; the same log's `:56–76` records the shape moving `flat` and two golden rows via `toOrc.ts`.
- Fix: rewrite the task/verification lines; delete the attribution; state it as the phase's own wrong prior.

### M-13 — ADR 0011's status claims a total supersede; ADR 0014 supersedes the Race hero only (`0014:63`).
### M-14 — ADR 0014's Decision says 50 ms, amendment heading 350 ms (`:85`), body 800 ms (`:109`); status line silent. Bundle line (`:137`) "entry 101.5 KB, +1.3 KB" vs `bundle_baseline.json` 102.5 KB / +2.3 KB; measurement is now a 4-chunk first-load set (#78), three chunk 139.0 KB.
### M-15 — ADR 0012 "Committed to `FIT_TWS` and `HOLDOUT_TWS` in `validation/compare.ts`" — real names `HELD_OUT_TWS` (`compare.ts:64`), `FIT_TWS` derived in `calibration/fit.ts:159`.
### M-16 — ADR 0007 "regressions in the solver fail CI" — `validate` job is `continue-on-error: true`, `make check` doesn't run it, and H-02 makes it moot.
### M-17 — Module-boundary rule stricter than enforced: ADR 0003 "`src/ui` never imports from `src/core`" and CLAUDE.md, vs `eslint.config.js:40–52` allowing `core/types` (type-only), used by ~35 UI files. Verified: every UI→core import is `import type` from `core/types`; core imports nothing from ui; no DOM/`Math.random`/`Date` in core.
### M-18 — ADR 0002's revisit trigger fired: `02bf851 docs(plan): phase 06 owns the desktop cockpit grid` went straight to `main` without a PR and changed `src/core/shape/base.ts` (+27/−…) and `data/boats/j70.json`; unrecorded. (Orchestrator's own accidental push, 2026-08-25.)
### M-19 — Cockpit plan README `:29` "## Layout (desktop ≥ 1280 px, one screen, no scroll)", risk 6, and `src/app.css:288` "height-capped to one screen (ADR 0015)" — reversed by ADR 0016.
### M-20 — Research doc 02 §6 "1.28 m of clew rise over 25°–60°" is the 63° absolute height in its own table; the range rise is 1.08 m. `ASSUMPTIONS.md:183` and `kite.ts:313` quote 1.1 m (pre-#80); the shipped kite gives ~1.42–1.46 m because the bulge shortens the chord.
### M-21 — Leech-bulge `prov:` (`kite.ts:226–228`, `ASSUMPTIONS.md:157–160`) cites doc 02 §5 (luff curl) and says "no measured leech profile exists"; doc 02 §6 (`F1`) measures the leech "more curved, more twisted at 3/4 height" — direction and high peak are published-supported.
### M-22 — `baseRaceDown.mainsheet` provenance (`PROVENANCE.md:98`, `ASSUMPTIONS.md:353`) cites a "60–80° band of doc 03 §2.1/§2.2" the research does not contain (§2.1: "out past the corner of the boat"; §2.2 attributes the S-turn to the vang). The 60–87° band is the solver's own descent (`phase-04-close-out.md:41–43`).
### M-23 — `src/ui/race/downwind.ts:25–28` attributes `bk(β) = 1` to "ORC Table 5.7"; it is ORC §5.6.3 (research doc 01 §2.6, as `optimalTrim.ts:150–152` cites correctly).
### M-24 — Phase-03 log `:107–109` "the Analyse cells … move with the condition"; `asymShape(boat)` takes only `boat` — constants in every condition.
### M-25 — Straight-leech comments survive #80: `kite.ts:354–357`, `:426–428`, `kite.test.ts:348–350`, `phase-05…md:17`, `phase-04…md:131`; and `src/ui/race/PlanView.svelte:117–122` still draws the leech straight — two pictures, two leeches.
### L-07 — ADR 0013 points at `src/lib/drills.ts` for the migration; it is `src/lib/drillHistory.ts:61,115–124` (IndexedDB).
### L-08 — ADR 0001 trigger "200-line script" (274 lines, four scripts); ADR 0005 "~30 components" (54); ADR 0004 trigger conditioned on a CI dock sweep never built.
### L-09 — Plans cite "doc 04 (a)/(b)"; the lettered list is doc 02 §2; `phase-05…md:44` tags the crossover both derived and assumed; `SailView3D.svelte:421–425` says five curl heights, there are four.
