# 01 — Gates and calculations

What the docs say is enforced or computed, against what the scripts and
solver do. Evidence is `path:line` at commit `e9a0f7d`.

<a id="h-01"></a>
### H-01 — Two hold-out gates: the shipped report scores ADR 0007's 25 rows, the vitest gate scores ADR 0012's 10

- `validation/report.ts:130` — `if (c.kind === 'angle' || heldOut) gated.push(c);` → 25 rows → `validation/report.md:91` `**FAIL** — 21/25 gated rows inside tolerance`, naming `TWS 6 jib 60°` (5.7 %) and `TWS 20 jib 60°` (6.5 %).
- `validation/compare.ts:191–196` `gateRows()` = all rows at `HELD_OUT_TWS` (8, 14) → 10 rows; `validation/polar.test.ts:41–47` runs those. `pnpm validate` prints 10 rows, 2 failures (TWS 14 `jib vmgUp`, `asym vmgDn`).
- ADR 0012: "hold out every row at TWS 8 and 14 … the report shows the same 25 rows *with a clear FIT/HELD-OUT label*" — display 25, gate 10.
- Impact: two of the "four failing rows" are fit residuals at fitted wind speeds (ADR 0007: a fit residual "would mean only that the optimiser worked"). The report ships to users (`src/ui/screens/More.svelte:50–51`); "21/25, same four rows" is repeated in `CHANGELOG.md`, `docs/plans/2026-08-25-desktop-kite/phase-05-*.md`, `phase-06-*.md`, `phase-04-*.md`, `docs/plans/2026-08-25-cockpit/README.md` and the memory note.
- Fix: gate on `gateRows()` in `report.ts`; label fitted-TWS angle rows as residuals; retitle "Gate (ADR 0007 tolerances, ADR 0012 split)"; expect `FAIL — 8/10`; note the change where "21/25" is quoted.

<a id="h-02"></a>
### H-02 — `pnpm validate` cannot fail

- `package.json:16` — `"validate": "vitest run --config vitest.polar.config.ts; tsx validation/report.ts"` — `;` not `&&`. Observed: `Tests 1 failed | 4 passed` then exit 0.
- `.github/workflows/ci.yml` `validate` job: `continue-on-error: true` with "flip … off the day the gate is green" — flipping it would change nothing.
- Fix: `vitest … ; s=$?; tsx validation/report.ts; exit $s` (report still generates).

<a id="h-03"></a>
### H-03 — The golden corpus has been silently skipped since #79

- `validation/golden/*.json` carry `boatHash: 60104ed1`; current hash `39464adf` (from `3277de9`, #79, which added `baseRaceDown` to `data/boats/j70.json` without `pnpm golden`). `validation/golden.test.ts:67–70` turns a hash mismatch into `it.skip`. `pnpm vitest run validation/golden` → `3 skipped`; `pnpm test` → `1156 passed | 3 skipped`.
- Impact: ADR 0004's regression net has been off through #80's kite-geometry change; `make check` green proves nothing about solver output.
- Fix: regenerate and commit; make a `boatHash`-only mismatch fail (a geometry edit is not a recalibration; `validation/README.md`'s skip rationale only covers `calibHash`).

<a id="h-13"></a>
### H-13 — Four places still describe ADR 0007's superseded row set

- `validation/README.md` "**60°, 90° and 120° rows at every TWS**: boat speed within 5 %" two lines after citing ADR 0012; `validation/polar.test.ts:5` docstring; `validation/report.ts:117` / `report.md:15` "held out at every TWS (ADR 0007)"; `validation/compare.ts:65` comment. `calibration/fit.ts:230` fits exactly those rows.
- Fix: one sweep to ADR 0012's wording.

<a id="h-14"></a>
### H-14 — `prov_check.py` scans `src/core` only; CLAUDE.md and ADR 0006 promise every literal in the app

- `scripts/prov_check.py:42` — `(ROOT / "src" / "core").rglob("*.ts")`. Same checker over `src/ui/three/kite.ts` → 19 untagged literals, `src/ui/race/boat.ts` 21, `src/ui/three/loft.ts` 9 (mostly window false positives — the tags sit in the doc block above); `.svelte` never scanned.
- Fix: narrow the claim in CLAUDE.md/ADR 0006 to `src/core` + `ASSUMPTIONS.md` rows (honest, one line), and file widening the checker (with a doc-block-aware window) as a follow-up.

### M-01 — `validation/README.md` "Running" table: one command runs nothing, one runs two of three suites
- `pnpm vitest run validation/polar` → "No test files found" (excluded in `vite.config.ts`), annotated "the gate". `pnpm vitest run validation` → 1 passed, 1 skipped, annotated "all three".
- Fix: `pnpm validate` / `--config vitest.polar.config.ts`; correct the count.

### M-02 — `validation/README.md` misdescribes two of its files
- "Fails until calibration lands; that is correct" — calibration landed in #9; "The thirteen solver invariants" — 18 `describe(` blocks.

### M-03 — `phase-04-close-out.md:108–112` records a boat hash that never existed and "No golden move"
- Says `60104ed1 → 278aa109`; actual at `3277de9` is `39464adf`. "1150 passed, 3 skipped" — the three skips are the corpus.

### M-04 — ADR 0009's `T*(w)` reference folds the scored setups in
- ADR: "the minimum over a coarse legal grid … the grid may miss a better setup, making regret slightly optimistic". `src/core/solve/dock.ts:132` `dedupe([...candidates, ...setups])`, min over `all`. Risk mitigated; caveat stale; a user setup better than every grid point scores 0. Owner decision: document or change.

### M-05 — The pmf "5 % floor" is 5 % of the peak weight, ≈1 % probability
- `dock.ts:41` `Math.max(p, 0.05)` before normalisation at `:43–44`. ADR 0009 and `ASSUMPTIONS.md:59` say "5 % floor so the range ends always count". Owner decision: reword or move the floor after normalisation.

### M-06 — Dock regret documented tier B, displayed tier A with no band
- `dock.ts:161` `tiered(expected, tier, 0.2) // … (tier B)`; `tierFor.ts:20` returns A for jib 6–20 kt; `tiered()` drops the band for A. `ASSUMPTIONS.md:26–27` "tier-B in practice". Owner decision.

### M-07 — `pctPolar` claims tier A under the kite while its numerator is tier B
- `src/core/solve/instruments.ts:219` `target.inGrid ? 'A' : 'C'`, never via `tierFor`; at TWS 12 / TWA 140 / asym, `pctPolar.tier = 'A'` and `bsKt.tier = 'B'` (`tierFor.ts:19`). Also spreads a `band` onto a tier-A value. Owner decision: route through `tierFor` (recommended) or document.

### M-08 — The sheeting mapping exists twice with nothing pinning them
- `src/core/shape/sheeting.ts:24–34` and `src/ui/race/boat.ts:165–167, 215` — identical today (verified over a sweep), both say "keep them identical", no test imports both.
- Fix: a sweep-equality test in `sheeting.test.ts`.

### M-09 — `validation/report.md`'s commit stamp can never name the commit it ships with
- `report.ts:51–56, 89` stamps HEAD at generation (pre-merge). Committed `e2087b6` at HEAD `e9a0f7d`; numbers byte-identical.
- Fix: drop the commit line (hashes identify the model) or diff in CI ignoring the stamp.

### M-10 — `boat.ts` "ponytail" ceiling states a boom angle it does not produce
- `src/ui/race/boat.ts:158–159` "tops out near 39°"; `boomAngle(0, 100)` = 83°, `boomAngle(0, −100)` = 90° (clamp).

### M-11 — `tokens.css` says `--range-*` are literal hex "so the contrast checker can parse them"; the checker has no rule for them
- `src/ui/tokens.css:31–34` vs `scripts/contrast_check.mjs:62–84`. Dark: `--range-1` 3.32:1, `--range-2` 2.09:1, `--range-3` 1.30:1 on `--surface`. ADR 0015 promises 3:1 on non-text. Decide: decorative (amend wording) or gated (add rows, retune).

### M-12 — `contrast_check.mjs` never reads the `prefers-color-scheme` light block
- `contrast_check.mjs:87–90` reads `:root` and `:root[data-theme='light']`; `tokens.css:96–121` has a third full palette under the media query (currently a byte copy) — unchecked. `tokens.css:8–11` claims "a hand-edited hex here fails CI".

### L-01 — `report.ts:176` hardcodes "108 legal setups" while `:187` computes `grid.length`.
### L-02 — `bundle_baseline.json` history mixes entry-chunk rows (1–8) with first-load-set rows (9+) without a marker.
### L-03 — `vite.config.ts:59` and `vitest.polar.config.ts:3` say the gate is local-only; CI runs it non-blocking.
### L-04 — `loft.ts:226` floors head twist (`Math.max`) where docs say "linear"; `instruments.ts:151` never reads `STRIPE_INCHES[2]`; `drills.ts:409–413` `beatsKey` gold escape hatch is not in ADR 0013.
### L-05 — ADR 0009 Cons "several hundred VMG solves" vs ~2,400 for an 8–18 kt forecast.
### L-06 — `kite.ts:308–309` "to the centimetre" is 3.6–4.3 cm; `kite.test.ts:345` title says 2 %, asserts 3 %; `kite.ts:396` says 2 % arc accuracy where docs/research say 3 %.
