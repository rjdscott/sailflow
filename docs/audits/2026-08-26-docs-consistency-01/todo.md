# Punchlist — docs-consistency-01

Priority: **P0** ship-blocker, **P1** before public release, **P2** soon,
**P3** nice. Effort in brackets. Details in [01](01-gates-and-calculations.md),
[02](02-decisions.md), [03](03-numbers.md), [04](04-state.md).
Remediation PRs cite the code. Items marked *owner decision* change a
number the app shows and were not fixed silently.

## P0 — gates that cannot fail

- [ ] **H-02** (P0, S) `pnpm validate` propagates the vitest exit code.
- [ ] **H-03** (P0, S) Regenerate the golden corpus; `boatHash`-only mismatch fails instead of skipping.
- [ ] **H-01** (P0, S) `report.ts` gates on `gateRows()` (ADR 0012); fitted-TWS angle rows labelled residuals; "21/25" quotes annotated.

## P1 — docs a maintainer would act on

- [ ] **H-04** (P1, S) `ASSUMPTIONS.md` sheeting formulas rewritten from `sheeting.ts`.
- [ ] **H-05** (P1, S) Perf budget 800 ms in `ASSUMPTIONS.md`, ADR 0014 heading, CHANGELOG, cockpit plan.
- [ ] **H-06** (P1, S) ADR 0016 amendment: measured 1522–1539 px; promise restated; phase-04 task reworded.
- [ ] **H-07** (P1, S) ADR 0017 amendment: luff by AWA, leech bulge, core touched by phases 05/06, trigger partly fired.
- [ ] **H-08** (P1, S) `README.md` status, features, gate, live URL.
- [ ] **H-09** (P1, S) Plan status lines (cockpit, drills-and-loop 🟢; desktop-kite Status line; mvp phase-06 🟢).
- [ ] **H-10** (P1, S) desktop-kite state section to `e9a0f7d` / #80; drop merged items.
- [ ] **H-11** (P1, S) Cut `[0.2.0]`, bump `package.json`.
- [ ] **H-12** (P1, S) Cache-bust runbook → `App.svelte` toast; stamp.
- [ ] **H-13** (P1, S) ADR 0012 wording in `validation/README.md`, `polar.test.ts`, `report.ts`, `compare.ts`.
- [ ] **H-14** (P1, S) CLAUDE.md/ADR 0006 claim narrowed to what `prov_check` enforces; widening filed.
- [ ] **H-15** (P1, S) `TACK_TRAVEL_M` 0.6 → 0.3 (doc 04 §2.4); row re-tagged.
- [ ] **H-16** (P1, S) Rename kite `SAG_FORWARD_FRACTION` → `LUFF_FORWARD_FRACTION`; row added.
- [ ] **H-17** (P1, S) ADR 0001 status line + note (branch protection never enabled; 0002).
- [ ] **H-18** (P1, S) ADR 0008 note: importer not built, deferred.
- [ ] **H-19** (P1, S) Phase-05 premise/citation corrected.
- [ ] **M-01**–**M-03** (P1, S) `validation/README.md` commands, counts, gate sentence; phase-04 hash.
- [ ] **M-08** (P1, S) Sweep-equality test pinning `sheeting.ts` to `boat.ts`.
- [ ] **M-13**–**M-19**, **M-21**–**M-25** (P1, S each) ADR status/notes (0011, 0012, 0007, 0003, 0002, 0014 bundle), cockpit plan heading + `app.css` comment, leech-bulge prov → doc 02 §6, `baseRaceDown` provenance, `downwind.ts` §5.6.3, phase-03 log, straight-leech comments; plan view leech bulge filed.
- [ ] **M-26**–**M-31** (P1, S) ASSUMPTIONS sag sentence, clew rise, clew row, `BASE_DOWN` rows via `j70.json`, PROVENANCE source-id section + `gauges.ts` tag, ungated-prose note.
- [ ] **M-32**–**M-35** (P1, S) CHANGELOG cleanup (#66/#78/#80, contradictions, headings), CLAUDE.md plan pointer + PROVENANCE location, ux-01 ticks and stale task boxes, runbook stamps.

## P2 — owner decisions on displayed numbers

- [x] **M-07** (P2, S) `pctPolar` tier under the kite: routed through `lowerTier` — the lower of the grid tier and `bsKt`'s, no band at A (#TBD).
- [x] **M-06** (P2, S) Dock regret tier: B, by design — the lap time sums a downwind leg the model does not fit (#TBD).
- [x] **M-05** (P2, S) Forecast pmf floor: kept as coded, 5 % of peak; ADR 0009 and `ASSUMPTIONS.md` record the decision (#TBD).
- [x] **M-04** (P2, S) Dock `T*(w)` reference: fold-in kept and documented — regret stays non-negative and monotone (#TBD).
- [x] **M-11** (P2, S) `--range-*` are decorative: `tokens.css` reworded, ADR 0015's 3:1 promise narrowed to `contrast_check`'s gated list (#TBD).
- [ ] **M-12** (P2, S) Third palette block in `contrast_check` (the `prefers-color-scheme: light` media query is unread).
- [x] **M-09** (P2, S) Report commit stamp dropped; the boat and calibration hashes identify the model (#TBD).
- [ ] **M-10**, **M-20** (P2, S) `boat.ts` ceiling comment; research doc 02 §6 clew-rise cell.
- [x] **M-25b** (P2, M) Plan view draws the bulged leech: `leechAt` sampled at 9 heights, same projection as the luff (#TBD).

## P3

- [ ] **L-01**–**L-14** (P3, S) wording, stale paths and triggers, index leak, `start-a-new-project` decision, duplicate bullets, hardcoded 108, bundle history marker.
