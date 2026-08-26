# release-01 punchlist

Severity and priority, two axes. P0 ship-blocker, P1 before public release,
P2 soon, P3 nice. Effort is a rough tag, not an estimate.

Ticked items were fixed on `docs/close-out-v0.3` in the same commit as this
audit, cited as **release-01 close-out**. Unticked items are code changes, left
for the owner.

## P0 — ship-blocker

- [x] **H-18** — `make check` is red at `c5da8d7` on a clean tree: — fixed in #90
  `validation/hash.test.ts` (#88) fails `prettier --check` and `svelte-check`
  because `kind: 'assumed'` widens to `string` where `ProvenanceKind` is
  wanted. `kind: 'assumed' as const` plus `prettier --write`. CI runs
  `make check` on every push, so the release branch cannot merge green.
  *(code, `validation/hash.test.ts`, 5 min)*
  → [03](03-contributor-path.md#h-18)
- [x] **H-01** — `README.md:55-57` reverses the sign of all four held-out
  residuals and swaps the polar's 172° with the model's 146.5°. Rewrite against
  `validation/report.md:60-61`. *(docs, 15 min)* — fixed, release-01 close-out.
  → [01](01-repo-first-impressions.md#h-01)

## P1 — before public release

- [x] **H-02** — the shipped `validation/report.md` names boat hash
  `3527bccc`; HEAD produces `6272af4c`. Regenerate with `pnpm validate`, and
  soften `README.md:37`'s "regenerated on every push" to what CI actually does.
  *(generated doc, 5 min)* — fixed, release-01 close-out.
  → [01](01-repo-first-impressions.md#h-02)
- [x] **H-15** — `make check` fails on a machine provisioned per
  `README.md:90` because `docs-check` runs `uvx` and `uv` is never named.
  *(docs, 10 min)* — fixed, release-01 close-out.
  → [03](03-contributor-path.md#h-15)
- [x] **M-03** — `README.md:21` ships an internal note pointing at
  `docs/img/race-desktop.png`, a path that does not exist. *(docs, 2 min)* —
  fixed, release-01 close-out. → [01](01-repo-first-impressions.md#m-03)
- [x] **M-05** — `README.md:126` counts three audits where there are five, and
  `README.md:128` lists five runbooks where there are seven. *(docs, 5 min)* —
  fixed, release-01 close-out. → [01](01-repo-first-impressions.md#m-05)
- [x] **M-06** — the plan and audit docs a reader reaches in two clicks are
  written in Fable/Opus/Sonnet vocabulary the README never introduces. One
  sentence in the README; the progress logs and published audits stay
  untouched, they are append-only. *(docs, 10 min)* — fixed, release-01
  close-out. → [01](01-repo-first-impressions.md#m-06)
- [x] **M-16** — `pnpm test:ui` (`README.md:86`) fails on a fresh clone with no
  Playwright browsers. Add the install line to Quick start. *(docs, 5 min)* —
  fixed, release-01 close-out. → [03](03-contributor-path.md#m-16)

## P2 — soon

- [x] **M-04** — `CHANGELOG.md:69` bills "#41 to #80" to 0.2.0 while 0.3.0
  claims #66, #78 and #80; #66 is described in both sections. *(docs, 10 min)*
  — fixed, release-01 close-out. → [01](01-repo-first-impressions.md#m-04)
- [ ] **M-10** — Log at 1920×1080 is 85 % empty and shows two contradicting
  empty states; the detail-pane placeholder should not render while the list is
  empty. *(code, `src/ui/log/`, 1 h)* → [02](02-live-first-run.md#m-10)
- [ ] **M-11** — "tier" names confidence (A/B/C), drill difficulty (Tier 1–3)
  and density (Learn/Race/Analyse); Race never prints the word at all. Label the
  badge explainer "confidence tier" and rename drill difficulty. *(code, copy
  across `src/ui/`, 2 h)* → [02](02-live-first-run.md#m-11)
- [ ] **M-17** — `package.json` has no `engines` and no `packageManager`, so
  "Node 20, pnpm 9" is enforced only inside CI. *(code, `package.json`, 5 min)*
  → [03](03-contributor-path.md#m-17)
- [ ] **L-12** — Race's orientation line ("Trim for the wind in front of you…")
  renders on the phone and not on the desktop. *(code, `src/ui/race/`, 30 min)*
  → [02](02-live-first-run.md#l-12)

## P3 — nice

- [x] **L-07** — `README.md:115` says "~12 k lines of tests"; measured 13,913.
  *(docs, 1 min)* — fixed, release-01 close-out.
  → [01](01-repo-first-impressions.md#l-07)
- [x] **L-09** — `README.md:133` and `:151` send contributors to `CLAUDE.md`,
  whose first 122 lines are template boilerplate; point at
  `CLAUDE.md#this-project`. *(docs, 2 min)* — fixed, release-01 close-out.
  → [01](01-repo-first-impressions.md#l-09)
- [ ] **L-08** — `scripts/docs_index.py:67-88` credits a plan with the newest
  date anywhere in its tree, so phase-two reports activity from a cross-reference
  path. Same function feeds the 60-day staleness gate. *(code,
  `scripts/docs_index.py`, 30 min)* → [01](01-repo-first-impressions.md#l-08)
- [ ] **L-13** — Dock prints "EXPECTED REGRET" twice, as panel title and metric
  label. *(code, `src/ui/dock/`, 5 min)* → [02](02-live-first-run.md#l-13)
- [x] **L-14** — on the phone the "Sailflow" wordmark strip sits over the
  scrolling content above the tab bar and cuts the last line. *(code,
  `src/ui/` shell, 20 min)* → [02](02-live-first-run.md#l-14)
  **Fixed** (phase-two 06, `perf/phone`): the strip was already opaque — the
  fault was its `--line` top edge at 1.28:1 against `--surface`, which is also
  the card colour, so text scrolling under it stopped mid-word with no visible
  boundary and read as clipping rather than as a bar. `--line-strong` in
  `BottomNav.svelte` gives it the edge. Nothing was unreachable either way:
  measured at 390×844 at the end of the scroll, `main` ends at 766 px and the
  sticky bar is back in flow from 766, so the last line always clears; what
  remains is the ordinary sticky-tab-bar overlay.
