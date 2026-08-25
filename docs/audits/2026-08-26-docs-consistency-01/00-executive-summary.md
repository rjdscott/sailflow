# Verdict: the code is more honest than its documentation — the gate the docs quote is not the gate that runs, the regression corpus has been silently off for two PRs, and the honesty surfaces carry three numbers for the perf budget and a sheeting formula with the wrong sign

- **Lens:** consistency — docs (ADRs, plans, research, audits, runbooks, ASSUMPTIONS, PROVENANCE, CHANGELOG, CLAUDE.md, validation) against the code and git history
- **Commit:** e9a0f7d

Five parallel read-only lenses (decisions, numbers, research chain, state,
gates) over every documentation surface, every High re-checked by the
orchestrator against the files. **0 Critical, 19 High, 36 Medium, 24 Low
(79).** Three themes. First, **the validation story is told twice and
neither telling is enforced**: `validation/report.md` computes its verdict
over the 25-row set ADR 0007 defined and ADR 0012 superseded, while the
vitest gate runs ADR 0012's 10 held-out rows — so "21/25, same four rows",
repeated in the CHANGELOG and six plan logs, counts two fitted-TWS residuals
as hold-out failures ([H-01](01-gates-and-calculations.md#h-01)); `pnpm
validate` joins its two steps with `;` and always exits 0
([H-02](01-gates-and-calculations.md#h-02)); and the golden corpus has been
`it.skip`ped since #79 changed the boat hash without regenerating it, so a
green `make check` has proved nothing about solver stability through #80's
geometry change ([H-03](01-gates-and-calculations.md#h-03)). Second, **the
honesty documents drifted from the constants they describe**: the 3D perf
budget is 50 ms in `ASSUMPTIONS.md`, 350 ms in ADR 0014's amendment heading,
the cockpit plan and the CHANGELOG, and 800 ms in the code
([H-05](03-numbers.md#h-05)); the plan-view sheeting formula in
`ASSUMPTIONS.md` is linear with the traveller sign inverted against a
quadratic implementation that its own generated row contradicts
([H-04](03-numbers.md#h-04)); `TACK_TRAVEL_M` swings the drawn tack through
0.6 m beside a panel quoting the 0–0.30 m band every cited source gives
([H-15](03-numbers.md#h-15)); two exported constants share the name
`SAG_FORWARD_FRACTION` with values 0.35 and 0.6 and one row
([H-16](03-numbers.md#h-16)); and phase 05's log attributes to research doc
04 §3 a premise the doc never states ([H-19](02-decisions.md#h-19)). Third,
**status is stale where a stranger resumes**: `README.md` still says the gate
fails 2 of 10 rows and Epic 1 phase 08 is in progress
([H-08](04-state.md#h-08)); two finished plans read as live and one has no
status line at all, so the plans index prints `?`
([H-09](04-state.md#h-09)); the desktop-kite state section lists two merged
PRs as next work ([H-10](04-state.md#h-10)); `package.json` is 0.1.0 after
forty merged PRs against the CHANGELOG's own bump rule, so every bug report
from the live app claims v0.1.0 ([H-11](04-state.md#h-11)); and the runbook
opened during a "stuck on an old version" incident points at a `confirm()`
in `src/main.ts` that #46 removed ([H-12](04-state.md#h-12)). Three accepted
ADRs state things that are not so without an amendment: 0001 says `main` is
branch-protected ([H-17](02-decisions.md#h-17)), 0008 says a tuning-guide
importer was built ([H-18](02-decisions.md#h-18)), 0016 says 1920×1080 holds
the whole cockpit — its own test asserts ≤ 1600 px
([H-06](02-decisions.md#h-06)) — and 0017 describes a luff that bows to
leeward unconditionally and a `src/core` that was never touched
([H-07](02-decisions.md#h-07)). The Mediums are the same drift at smaller
scale plus four calculation-description mismatches worth an owner decision
rather than a silent fix: `pctPolar` claims tier A under the kite while its
numerator is tier B, dock regret is documented as tier B and displayed as A,
the forecast pmf's "5 % floor" is 5 % of the peak weight (≈1 % probability),
and the dock `T*(w)` reference folds the scored setups in.

**Top risks:** a solver regression now passes CI (H-02, H-03); a maintainer
tuning from `ASSUMPTIONS.md` re-introduces the traveller sign bug or a 16×
perf-gate error (H-04, H-05); the shipped report and the `[Unreleased]` notes
tell users a gate verdict computed on the wrong rows (H-01); ADR readers act
on four decisions the code no longer implements (H-06, H-07, H-17, H-18).

**What is not broken:** ADR 0007's tolerances and ADR 0012's split are
implemented exactly in `compare.ts`; every ORC coefficient, the asym flying
shape, the playbook thresholds, the loft extrapolations, the cockpit
instrument constants and the generated halves of `ASSUMPTIONS.md` and
`PROVENANCE.md` reproduce; `src/core` is DOM-free and deterministic and
imports nothing from `src/ui`; the ADR, research and audit indices match
their directories; CI does what CLAUDE.md and the runbooks say it does.
