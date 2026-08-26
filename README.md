# Sailflow

A free, browser-based rig-tune and sail-trim trainer for the J/70. No
backend, no account, works offline on a phone after the first visit.

**Live:** https://rjdscott.github.io/sailflow/

Sailflow answers two questions a J/70 crew asks every race day:

- **Dock mode** — *what shroud, rake and forestay setting do I commit to for
  today's forecast, and what does it cost me at each end of the range?*
- **Race mode** — *with the rig I have, where do the sheets, traveller,
  backstay, vang, outhaul, cunningham, leads and kite controls go for the wind
  in front of me, and what does each move do to the sail?*

It solves a steady-state velocity-prediction model (VPP) in a Web Worker, draws
the flying shape of every sail in 3D and plan view, compares its answer against
the North and Quantum tuning guides, logs what you tried, and drills you on
the decisions with fault-injection exercises.

## Why it is different

Most trim advice is a table in a PDF. Sailflow is a model you can argue with:

- **Every number carries a confidence tier.** A = a number you can use; B = a
  direction and a band; C = a direction only. Tiers are computed, not
  asserted — an output is demoted the moment its inputs leave the calibrated
  envelope.
- **Provenance is enforced.** Every literal in the physics core has a `prov:`
  tag or a row in [`ASSUMPTIONS.md`](ASSUMPTIONS.md); a script fails CI if
  one is missing. Third-party data is committed one file per source with its
  citation in [`PROVENANCE.md`](PROVENANCE.md).
- **Disagreement is shown, never resolved silently.** When the model and a
  tuning guide differ, you see both and the delta.
- **Validation is public.** [`validation/report.md`](validation/report.md)
  replays the ORC J/70 polar through the solver with two wind speeds held out
  of the fit. CI regenerates it on every push and puts the held-out tables and
  the gate verdict in the job summary, so a regression is visible in the PR.
  The current verdict, and the rows it fails, are below.
- **Deterministic core.** Same inputs, same outputs. No randomness, no clock,
  no framework in `src/core`. A golden corpus of 65 solved cases catches any
  drift.

## Current state (v0.3.0, 2026-08-26)

Complete and live: Race cockpit with 3D hero (three.js, lazy-loaded, first-
frame budget), gennaker mode, Dock mode with expected-regret scoring over a
forecast distribution, disagreement panel, tuning log with export/import,
drills v2, PWA offline, dark/light themes, desktop-first layout down to phone.

**Known limitation, stated plainly.** The polar hold-out gate
([ADR 0012](docs/adr/0012-hold-out-split-by-wind-speed-not-by-angle.md): every
row at TWS 8 and 14 kt withheld from calibration) currently reads
**FAIL — 8 of 10 rows** inside 3 % boat speed / 2° angle. The two misses are
both at 14 kt, and both are the model being optimistic: upwind VMG 5.8 % fast
and 1.8° wide, downwind VMG 15 % fast and 25° tight — the polar runs 172° where
the model gybes at 146°, so it will not soak. The downwind miss is
structural — the asymmetric-kite aero has no soak/plane mode switch — and is
phase 01 of [the phase-two plan](docs/plans/2026-08-26-phase-two/). Until it
lands, downwind boat speed is tier B and downwind optimum angle is tier C, and
the app says so on screen.

## Model

The aero layer is the documented ORC VPP parametric model (2023 edition,
[`PROVENANCE.md`](PROVENANCE.md)) with an explicitly **invented** layer on top
that maps rig bend, headstay sag and sheet positions to sail draft, draft
position and twist, and those to ORC's `flat`, `reef` and effective twist.
There is no public evidence base for that layer on a J/70; it is calibrated
against the ORC polar and labelled tier B or C throughout. Hydro is ORC's
canoe-body and appendage resistance with added resistance in waves.
[ADR 0006](docs/adr/0006-faithful-orc-aero-layer-plus-invented-shape-layer-with-confidence-tiers.md)
records the split; `ASSUMPTIONS.md` "Where the model is honestly weak" lists
what a sailor should not trust.

Parametric VPPs under-predict boat speed relative to CFD tools. This is a
decision-rehearsal tool for tuning and trim choices, not a wind tunnel.

## Quick start

```bash
make setup      # pnpm install --frozen-lockfile
make dev        # vite dev server on http://localhost:5173
make check      # docs-check + lint + typecheck + 1100+ unit tests
make validate   # polar hold-out gate, regenerates validation/report.md
make help       # every target

pnpm exec playwright install chromium   # once, before the first test:ui run
pnpm test:ui    # Playwright: layout, a11y, 3D smoke, screenshots
```

Node 20, pnpm 9, and [`uv`](https://docs.astral.sh/uv/) — `make docs-check`
runs the documentation tests through `uvx pytest`, so `make check` needs it:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Python 3.12 is used only by that docs tooling. Playwright screenshot baselines
are generated inside `mcr.microsoft.com/playwright:v1.62.1-noble` so they match
CI — see [`docs/runbooks/`](docs/runbooks/README.md).

## Architecture

```
src/core      pure physics — geometry, rig, shape, aero (ORC), hydro, solve
              no DOM, no framework, no Math.random, no Date
src/worker    the typed request/response protocol; the UI's only door to core
src/ui        Svelte 5 — race cockpit, dock, log, drills, three.js hero
data/         boats, tuning guides, ORC polar: one JSON per source
calibration/  fits the invented-layer knobs to the polar; writes the golden corpus
validation/   replays the polar through the solver; hold-out gate; report
```

The core/UI boundary is enforced by ESLint (`no-restricted-imports`): the UI
may import only types from `src/core/types`
([ADR 0003](docs/adr/0003-ui-talks-to-physics-only-through-a-typed-worker-protocol.md)).
Solves run in a Web Worker with a fixed Newton budget and a fixed seed table,
so a solve is reproducible and never blocks the frame.

Stack: Svelte 5 runes, Vite, TypeScript strict, Vitest, Playwright,
three.js (one lazy chunk, gated by a measured first-frame budget), vite-plugin-pwa,
GitHub Pages. ~26 k lines of app code, ~14 k lines of tests, 17 ADRs.

## Documentation

The repo is run on a documentation pipeline that is machine-checked
(`make docs-check`): research → decision → plan → audit, plus runbooks.

| Where | What |
|-------|------|
| [`docs/adr/`](docs/adr/README.md) | 17 decisions, Nygard format, immutable once accepted |
| [`docs/plans/`](docs/plans/README.md) | Phase plans with status tables; resumable by a stranger |
| [`docs/audits/`](docs/audits/README.md) | Point-in-time sweeps (UX ×3, docs consistency, first impressions) with evidence and punchlists |
| [`docs/research/`](docs/research/README.md) | Cockpit UX, spinnaker aerodynamics and trim, simulator landscape |
| [`docs/runbooks/`](docs/runbooks/README.md) | Seven operational how-tos: deploy, release and cache-bust, recalibrate, add a boat, add a drill, export the log, start a new project from the template |
| [`docs/initial-prompt.md`](docs/initial-prompt.md) | The original build brief and acceptance criteria |
| [`CHANGELOG.md`](CHANGELOG.md) | Per-release, from squash-merge titles |

Start with [`docs/plans/README.md`](docs/plans/README.md) for what is done and
what is next, and [`CLAUDE.md`](CLAUDE.md#this-project) for the engineering
rules.

One thing that corpus will not explain about itself: Sailflow was built
autonomously by Claude Code agents against a written brief, with the owner
reviewing and merging. That is why the plan progress logs and audit method
lines name models — Fable, Opus, Sonnet — as the party that did a piece of
work. Those logs are dated, append-only records of what happened; they are
kept as written rather than tidied up, for the same reason the polar gate is
published while it still reads FAIL.

## What's next

[`docs/plans/2026-08-26-phase-two/`](docs/plans/2026-08-26-phase-two/), in
order: downwind physics that passes its own gate; shareable trim URLs and
pin-and-compare; more tuning guides as data; onboarding and control
explainers; a second boat class to prove the boat file is data, not code;
phone performance.

Out of scope, by the brief: multiplayer, race simulation, tactics, starts,
accounts, any backend.

## Contributing

Issues and PRs welcome, especially from J/70 sailors with measured numbers.
The rules are short: branch + PR + squash, `make check` green, every literal
carries provenance, every model output carries a tier, tests land with the
change. Details in [`CLAUDE.md`](CLAUDE.md#this-project) — the sections above
that heading are generic template conventions, not Sailflow's. To add a boat
class, follow
[`docs/runbooks/add-a-boat-class.md`](docs/runbooks/add-a-boat-class.md).

## Licence

MIT. See [`LICENSE`](LICENSE). Tuning-guide numbers are transcribed from
publicly available guides with attribution
([ADR 0008](docs/adr/0008-third-party-reference-data-committed-with-provenance.md));
if you own one of those guides and object, open an issue.
