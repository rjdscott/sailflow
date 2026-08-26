# Punchlist — docs-consistency-01

Priority: **P0** ship-blocker, **P1** before public release, **P2** soon,
**P3** nice. Effort in brackets. Details in [01](01-gates-and-calculations.md),
[02](02-decisions.md), [03](03-numbers.md), [04](04-state.md).
Remediation PRs cite the code. Items marked *owner decision* change a
number the app shows and were not fixed silently.

## P0 — gates that cannot fail

- [x] **H-02** (P0, S) `pnpm validate` propagates the vitest exit code. (#82)
- [x] **H-03** (P0, S) Regenerate the golden corpus; `boatHash`-only mismatch fails instead of skipping. (#82; corpus regenerated again in #84, hash scope narrowed in #88)
- [x] **H-01** (P0, S) `report.ts` gates on `gateRows()` (ADR 0012); fitted-TWS angle rows labelled residuals; "21/25" quotes annotated. (#82)

## P1 — docs a maintainer would act on

- [x] **H-04** (P1, S) `ASSUMPTIONS.md` sheeting formulas rewritten from `sheeting.ts`. (#83)
- [x] **H-05** (P1, S) Perf budget 800 ms in `ASSUMPTIONS.md`, ADR 0014 heading, CHANGELOG, cockpit plan. (#83)
- [x] **H-06** (P1, S) ADR 0016 amendment: measured 1522–1539 px; promise restated; phase-04 task reworded. (#83)
- [x] **H-07** (P1, S) ADR 0017 amendment: luff by AWA, leech bulge, core touched by phases 05/06, trigger partly fired. (#83)
- [x] **H-08** (P1, S) `README.md` status, features, gate, live URL. (#83)
- [x] **H-09** (P1, S) Plan status lines (cockpit, drills-and-loop 🟢; desktop-kite Status line; mvp phase-06 🟢). (#83)
- [x] **H-10** (P1, S) desktop-kite state section to `e9a0f7d` / #80; drop merged items. (#83)
- [x] **H-11** (P1, S) Cut `[0.2.0]`, bump `package.json`. (#83)
- [x] **H-12** (P1, S) Cache-bust runbook → `App.svelte` toast; stamp. (#83)
- [x] **H-13** (P1, S) ADR 0012 wording in `validation/README.md`, `polar.test.ts`, `report.ts`, `compare.ts`. (#82)
- [x] **H-14** (P1, S) CLAUDE.md/ADR 0006 claim narrowed to what `prov_check` enforces; widening filed. (#83)
- [ ] **H-15** (P1, S) `TACK_TRAVEL_M` 0.6 → 0.3 (doc 04 §2.4); row re-tagged.
- [ ] **H-16** (P1, S) Rename kite `SAG_FORWARD_FRACTION` → `LUFF_FORWARD_FRACTION`; row added.
- [x] **H-17** (P1, S) ADR 0001 status line + note (branch protection never enabled; 0002). (#83)
- [x] **H-18** (P1, S) ADR 0008 note: importer not built, deferred. (#83)
- [x] **H-19** (P1, S) Phase-05 premise/citation corrected. (#83)
- [x] **M-01**–**M-03** (P1, S) `validation/README.md` commands, counts, gate sentence; phase-04 hash. (#82 M-01/M-02, #83 M-03)
- [x] **M-08** (P1, S) Sweep-equality test pinning `sheeting.ts` to `boat.ts`. (#82)
- [x] **M-13**–**M-19**, **M-21**–**M-25** (P1, S each) ADR status/notes (0011, 0012, 0007, 0003, 0002, 0014 bundle), cockpit plan heading + `app.css` comment, leech-bulge prov → doc 02 §6, `baseRaceDown` provenance, `downwind.ts` §5.6.3, phase-03 log, straight-leech comments; plan view leech bulge filed. (#82 M-23 and the straight-leech half of M-25, #83 the rest; M-25b in #85)
- [x] **M-26**–**M-31** (P1, S) ASSUMPTIONS sag sentence, clew rise, clew row, `BASE_DOWN` rows via `j70.json`, PROVENANCE source-id section + `gauges.ts` tag, ungated-prose note. (#82 M-29 and the M-30 code half, #83 the rest)
- [x] **M-32**–**M-35** (P1, S) CHANGELOG cleanup (#66/#78/#80, contradictions, headings), CLAUDE.md plan pointer + PROVENANCE location, ux-01 ticks and stale task boxes, runbook stamps. (#83)

## P2 — owner decisions on displayed numbers

- [x] **M-07** (P2, S) `pctPolar` tier under the kite: routed through `lowerTier` — the lower of the grid tier and `bsKt`'s, no band at A (#85).
- [x] **M-06** (P2, S) Dock regret tier: B, by design — the lap time sums a downwind leg the model does not fit (#85).
- [x] **M-05** (P2, S) Forecast pmf floor: kept as coded, 5 % of peak; ADR 0009 and `ASSUMPTIONS.md` record the decision (#85).
- [x] **M-04** (P2, S) Dock `T*(w)` reference: fold-in kept and documented — regret stays non-negative and monotone (#85).
- [x] **M-11** (P2, S) `--range-*` are decorative: `tokens.css` reworded, ADR 0015's 3:1 promise narrowed to `contrast_check`'s gated list (#85).
- [x] **M-12** (P2, S) Third palette block in `contrast_check` (the `prefers-color-scheme: light` media query is unread). (#82)
- [x] **M-09** (P2, S) Report commit stamp dropped; the boat and calibration hashes identify the model (#85).
- [x] **M-10**, **M-20** (P2, S) `boat.ts` ceiling comment; research doc 02 §6 clew-rise cell. (#82 boat.ts comment, #83 research doc 02 §6)
- [x] **M-25b** (P2, M) Plan view draws the bulged leech: `leechAt` sampled at 9 heights, same projection as the luff (#85).

## P3

- [ ] **L-01**–**L-14** (P3, S) wording, stale paths and triggers, index leak, `start-a-new-project` decision, duplicate bullets, hardcoded 108, bundle history marker.

## Still open, and why

Reconciled against `main` at `3a2e96d` on 2026-08-26. Three lines above stay
unticked:

- **H-15** and **H-16** — the code half of both landed in #82
  (`TACK_TRAVEL_M` = 0.3 at `src/ui/three/kite.ts:131`; the kite constant
  renamed `LUFF_FORWARD_FRACTION` at `:217`), but #83 was branched off `main`
  before #82 merged and its `ASSUMPTIONS.md` rewrite **reverted both rows**.
  The file today still reads "`TACK_TRAVEL_M` = 0.6 m eased … Narrowing it and
  showing the band is doc 04 §2.4, not done" (`ASSUMPTIONS.md:172`), and the
  `LUFF_FORWARD_FRACTION` row #82 added is gone — so the doc contradicts the
  code it documents, which is the exact failure both findings named. Restoring
  the two rows from `git show b4caa2e -- ASSUMPTIONS.md` closes them.
- **L-01–L-14** — partly done, so the line stays open. Closed: L-01, L-03, L-06
  (#82); L-07, L-08, L-09, L-10, L-11, L-12, L-13 (#83); L-14 on publication.
  Still open: **L-02** (`scripts/bundle_baseline.json` history rows 1–8 are
  entry-chunk measurements and 9+ are first-load-set measurements, with no
  marker saying where the basis changed) and two thirds of **L-04**
  (`src/ui/three/loft.ts:226` still floors head twist with `Math.max` while the
  doc block above it says "twist linearly extrapolated"; `STRIPE_INCHES[2]` at
  `src/core/solve/instruments.ts:100` is still never read — only `[0]` and `[1]`
  are, at `:153–154`). L-04's third part, the `beatsKey` gold escape hatch, is
  recorded in ADR 0013 (#83).

## Log

- 2026-08-26 — reconciled against main at `3a2e96d`; 24 ticked, 3 left open.

