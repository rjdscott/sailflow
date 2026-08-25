# Sailflow

A free, web, mobile-first rig-tune and sail-trim trainer for the J/70,
covering beginners through Grand Prix. See
[`docs/initial-prompt.md`](docs/initial-prompt.md) for the build brief.

## What this is, and isn't

Sailflow implements the documented ORC VPP parametric aero model, plus an
explicitly **invented** rig-bend-to-sail-shape sensitivity layer — there is no
public evidence base for that layer on a J/70. It is calibrated against the
ORC J/70 Speed Guide polar with held-out points. Parametric VPPs are known to
under-predict boat speed relative to CFD-based tools. Every output carries a
confidence tier: **A** (a number), **B** (direction + a band), or **C**
(direction only, no magnitude). This is a decision-rehearsal tool for tuning
and trim choices, not a wind tunnel.

Status: **Epic 1 phases 00–07 merged; phase 08 (PWA, polish, docs) in progress.** The polar hold-out gate currently **fails on 2 of 10 held-out rows**; see [`validation/report.md`](validation/report.md) and `ASSUMPTIONS.md` "Where the model is honestly weak". Build plan:
[`docs/plans/2026-08-25-mvp-analyser/`](docs/plans/2026-08-25-mvp-analyser/).

Two epics are in scope after the MVP analyser (Epic 1): Epic 2 is a
quasi-static time-domain simulation; Epic 3 is a Rust engine with
multiplayer. Neither is started.

Epic 1 covers a steady-state VPP analyser with two modes, split along the
J/70 class rule (C.9.5): **Race mode** for running rigging adjusted while
racing, and **Dock mode** for shrouds, rake and forestay, committed once per
day against a forecast wind range. A disagreement panel compares the model's
recommendation against the North and Quantum tuning guides. A tuning log
records what was tried; drills rehearse the decisions.

## Model honesty

Every push regenerates the polar hold-out comparison in CI (the `validate`
job, non-blocking) and prints the held-out rows and the gate verdict in the
job summary — see [`validation/report.md`](validation/report.md) and
[`docs/runbooks/run-validation-and-recalibrate.md`](docs/runbooks/run-validation-and-recalibrate.md).

## Quick start

```bash
make setup   # pnpm install --frozen-lockfile
make dev     # vite dev server
make check   # docs-check + lint + typecheck + test
make help    # every target
```

Requires Node 20, pnpm 9. Python 3.12 is used only for docs tooling
(`scripts/docs_index.py`), not the app itself.

## Repository layout

| Path | Holds |
|------|-------|
| `src/core/` | Pure physics: geometry, rig, shape, aero, hydro, solve. No DOM, no framework. |
| `src/worker/` | The solver worker protocol — the only path from UI to physics. |
| `src/ui/` | Svelte UI. |
| `validation/` | The polar-match harness and its committed report. |
| `calibration/` | Free-parameter calibration for the rig and shape models. |
| `data/` | Boats, tuning guides, and the ORC polar. Third-party numbers, committed with provenance in `PROVENANCE.md`. |
| `docs/adr/` | Decisions, and what each one costs. |
| `docs/plans/` | Multi-phase work, resumable by a stranger. |
| `docs/audits/` | Point-in-time sweeps of a surface. |
| `docs/runbooks/` | How to run the operations. |
| `docs/research/` | Analysis feeding the above. |
| `scripts/docs_index.py` | Generates the index tables, checks the docs rules. |

Conventions live in each directory's `README.md`, and are summarised in
[`CLAUDE.md`](CLAUDE.md).

## Using this repo as a template

The scaffold above the "This project" line in `CLAUDE.md` is generic and meant
to be reused. Procedure, including branch protection and which doc surfaces to
keep at which project size:
[`docs/runbooks/start-a-new-project.md`](docs/runbooks/start-a-new-project.md).
Rationale and trade-offs:
[`ADR 0001`](docs/adr/0001-tiered-docs-scaffold-with-machine-enforcement.md).

## Licence

MIT. See [`LICENSE`](LICENSE).
