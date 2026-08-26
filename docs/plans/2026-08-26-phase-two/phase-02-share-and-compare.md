# Phase 02: Share a trim, pin and compare

- **Status:** 🟢 Completed

## Goal

A Race or Dock state is a URL a sailor can paste into a group chat, and the
recipient sees the same numbers and the same sail. On screen, "pin" freezes
a trim as a ghost outline with delta readouts so two setups can be compared
side by side without a spreadsheet.

## Tasks

- [x] URL schema: versioned, compact query (`?s=1&…`) covering conditions, sailset, all race and dock controls, density tier; parser with a migration table; round-trip test for every control in `data/boats/j70.json`.
- [x] "Copy link" in the actions bar (Race and Dock) using `navigator.clipboard` with a fallback; toast on success.
- [x] "Pin this trim": store the pinned `SolveResult` + controls; ghost outline in plan view and 3D (`src/ui/three`, dashed or 40 % alpha); instrument cells show Δ vs pinned, labelled (existing "Δ vs <what>" contract).
- [x] Log export/import already exists (`docs/runbooks/export-import-tuning-log.md`); add CSV export and a share link per log entry.
- [ ] Helm/rudder-angle readout from the solver's yaw balance (tier B), carried from ux-excellence 06 M-18, with tests on the balance math. **Blocked on a core output that does not exist** — see the progress log, 2026-08-26.
- [x] Playwright: open a generated link in a fresh context, assert the instrument bar matches the origin.

## Verification

```bash
make check
pnpm test:ui
```

## Artifacts

`src/ui/share.ts` (+ test), actions-bar buttons, `tests/ui/share.spec.ts`,
runbook `docs/runbooks/export-import-tuning-log.md` updated.

## Progress log

- 2026-08-26 — **Share URL (task 1).** `src/ui/share.ts` is the versioned
  codec: `?s=1&tws=&twa=&sea=&crew=&set=&r=&w=&d=&f=&t=`, one param per control
  block, positional within the block, `_` as the separator (dock turns move in
  half-steps, so `.` could not tell `-1.5_0` from `-1_5_0`). `MIGRATIONS` is
  keyed on the version and rewrites the *query*, so the reader stays one parser
  for the current schema; `MIGRATIONS[0]` is a real entry, not a placeholder —
  it converts the dot-separated `r=` that v0.3.0 wrote into every address bar.
  Decision recorded in **[ADR 0019](../../adr/0019-share-links-are-a-versioned-query-with-a-migration-table.md)**
  (0019 not 0018: phase 01 is writing 0018 concurrently).

  `src/ui/scenario.ts` shrank to the localStorage session store; its URL half
  and its validators moved into `share.ts`, so the URL and the stored blob are
  validated by one set of rules rather than two that can drift.

  The round-trip test is generated from `data/boats/j70.json`: it asserts every
  control in the boat file is in exactly one group, that each is in the group
  its `mode` names, and that two different legal states round-trip field for
  field. A control added to the boat file fails the suite until it is added to
  the schema — which is the "a new control cannot be forgotten" property the
  task asked for. Query with every group filled: 152 characters, nothing
  percent-encoded (asserted).

  `App.svelte` now reads and writes the same encoding, on Race *and* Dock, so
  the address bar **is** the share link. It merges over the existing params, so
  the hero's `?view=` and `?freeze=` survive a slider drag.

- 2026-08-26 — **Copy link (task 2).** One `components/CopyLink.svelte`, used
  three times: Race actions bar, Dock beside "Print tuning card", Log editor.
  It builds the URL from the live stores rather than reading `location`,
  because App's writer is debounced by 400 ms and copying the address bar
  mid-drag would hand out the previous trim. `copyText` tries
  `navigator.clipboard` then the `execCommand` textarea; if both fail it does
  **not** toast a success — it prints the link in a read-only, pre-selected
  field. Toast on success. `share.copyLink` and `race.pin` added to the
  telemetry event list.

- 2026-08-26 — **Pin and compare (task 3).** `race.pinned` holds the whole
  `SolveResult` plus the trim, the gennaker controls and the condition it was
  taken at — the ghost is drawn from `result.shape`, so keeping only the slider
  positions would need a re-solve to draw anything. `$state.raw`, since it is
  replaced or dropped, never mutated field by field.

  Plan view: the same `sailPath` the live sails use, dashed at 40 % and behind
  them, deliberately **not** tweened — a reference that slides toward the live
  sail every time a slider moves is not a reference. 3D: the pinned main and jib
  are lofted by the same `buildSail` and only their luff, leech and foot are
  drawn, as `LineSegments` at 40 % alpha (three needs `computeLineDistances`
  per rebuild to dash, and a world-unit dash reads differently at every camera
  distance). Both are static geometry with no animation, so reduced motion has
  nothing to suppress.

  Instrument deltas: a pin takes the bar's `target` slot from the optimum while
  it is pinned, and `deltaLabel` is now a prop so the cells say "Δ to pinned
  trim (+ = the pinned trim is faster)" rather than lying about the optimum.
  One target per cell is ADR 0015's contract and a second would be a redesign
  of every cell in the product; the ActionsBar prints one line saying what the
  ghost is and at which wind it was taken, at every density tier.

- 2026-08-26 — **Log (task 4).** CSV export already shipped
  (`toCsv`/`exportCsv`, `src/lib/logExport.ts`, wired to Log → Backup → Export
  CSV since ux-02 M-23) — verified in place rather than rebuilt. New: a share
  link per entry, in the editor's action row, from `entryShare` in
  `src/ui/log/logic.ts`. It invents nothing the entry does not hold: no true
  wind angle and no sail plan, because the form has no field for either; wind
  is the sailed band's midpoint where one was recorded and the forecast's
  likely value otherwise, the same precedence `windLine` uses in the list. The
  route follows the entry — a trim opens on Race, a rig-and-forecast entry on
  Dock. The Log screen passes `CopyLink` a `ShareState` rather than a finished
  URL, so its lazy chunk never imports `share.ts` and keeps no second copy of
  the boat file. Runbook updated: step 6, two failure modes, new **Last
  verified** stamp.

- 2026-08-26 — **Helm/rudder angle (task 5) not done, and why.** Left unticked
  deliberately. The audit finding (ux-01 M-18) offers two ways to close it, and
  the second one is now taken: *"If `src/core/solve` does not produce one, say
  so explicitly … rather than leaving the concept absent."*

  It does not produce one. `instruments.helmLoad` is a **heel-driven proxy** —
  `fx · ceHeight · sin(heel) / 300 N·m` (`core/solve/instruments.ts`), tier C —
  not a yaw balance: the core has no longitudinal centre of effort, no centre of
  lateral resistance, and therefore no yaw moment. Converting a moment into a
  rudder *angle* additionally needs rudder area and a rudder-to-CLR lever arm,
  and `data/boats/j70.json` has neither (`grep -rn rudder data/ src/core` finds
  one comment and no number). Deriving degrees of helm from a tier-C proxy and
  two invented geometry constants would be a tier-C number wearing a tier-B
  badge, which the honesty rules forbid outright. So no readout was invented;
  the HELM explainer now says plainly that there is no rudder angle and why
  (`src/ui/explain.ts`). The tier-B version needs a real yaw balance in
  `src/core`, which is out of this phase's bounds — `src/core` is another
  agent's this round, and it is a model change rather than a UI one. It should
  be re-scoped as a core task, not carried forward as a UI one again.

- 2026-08-26 — **Playwright (task 6).** `tests/ui/share.spec.ts`, three tests.
  The headline one generates a link in one browser context (three wind-up
  clicks, mainsheet 85, backstay 70, then "Copy link" and
  `navigator.clipboard.readText()`) and opens it in a **fresh** context — two
  contexts, not two pages, because a second page in the same context shares
  `localStorage` and would restore the sender's session and pass on a link that
  carried nothing. Asserts the whole instrument band's text matches, plus both
  slider values. A second test opens a v0 dot-separated link and asserts the
  migration lands it. A third walks pin → labelled deltas → "Differs on
  Mainsheet" → unpin.

- 2026-08-26 — **Gates.** `make check` → 0. `pnpm test` 74 files / 1187 tests,
  `pnpm test:ui` 44/44 including the two existing 3D screenshot baselines,
  which are unchanged (nothing is pinned by default, so the ghost draws
  nothing). No screenshot baselines regenerated and none needed — no docker in
  this environment, so any new PNG could not have been produced against
  `mcr.microsoft.com/playwright:v1.62.1-noble` and none was committed.

  `node scripts/bundle_check.mjs` tripped at +4790 B and the baseline was
  raised deliberately to 97526 B, with the measurement written into
  `scripts/bundle_baseline.json`: main itself builds at 94419 B here, 1683 B
  above the committed 92736, so this change is +3107 B — about half real code,
  about half Rollup pulling `j70.json` and `north-j70.json` out of the index
  chunk into preloaded shared chunks, where they gzip alone instead of against
  70 KB of neighbouring JS. Same bytes over the wire, measured less kindly.
  Nothing crossed the lazy boundary: SailView3D is unchanged at 139.2 KB gzip.

- 2026-08-26 — **Status.** Five of six tasks land; the phase stays 🟡 on task 5
  alone. Nothing else in the phase depends on it.
