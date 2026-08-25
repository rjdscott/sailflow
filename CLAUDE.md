# CLAUDE.md

Template repo conventions. Everything above the "This project" section is
generic and travels to every project unchanged.

## Branch + PR discipline

- **Never push to `main`.** Always branch + PR + squash-merge.
- **Branch naming:** `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>`.
  Slug is short, hyphen-separated, lowercase.
- **One PR per logical change.** Don't bundle unrelated fixes. They are hard to
  review and harder to revert.
- **PR title:** `<type>(<scope>): <imperative summary>`, matching the branch
  type. With squash-merge the PR title becomes the commit message, so it is the
  permanent history.
- **Squash-merge only.** History stays linear.

**None of these are enforced.** `main` is deliberately unprotected, by
[ADR 0002](docs/adr/0002-branch-rules-stay-honour-code.md): the owner works
alone and the gate would cost more than it catches. A push straight to `main`
will succeed, so don't.

Reversing that is one command, `docs/runbooks/start-a-new-project.md` step 7,
and a repo with a second contributor should run it on day one. What *is*
enforced is below.


## Skills

One skill per doc surface. Each reads its surface's `README.md` first, so the
conventions live next to the artifact rather than in this file.

| Skill | Use when |
|-------|----------|
| `/adr` | a decision would cost more than a day to unwind |
| `/plan` | `new <slug>` to scaffold multi-phase work, `execute <dir>` to resume it |
| `/audit` | sweeping a whole surface at a point in time (not a single diff) |
| `/runbook` | a repeatable operation, or an incident worth teaching |
| `/code-review` | a single diff or PR. This is not an audit |

Invoke the skill rather than hand-rolling the document; the numbering, index
regeneration, and gates are in there.

## Documentation pipeline (research → ADR → plan → audit, + runbooks)

Four doc surfaces, four skills, one flow:
`docs/research/` (analysis) → `docs/adr/` (decisions) → `docs/plans/`
(execution) → `docs/audits/` (verification). Dated-directory convention
everywhere: `<YYYY-MM-DD>-<slug>/`. Alongside the flow: `docs/runbooks/`
(operations). ADRs record *why*, runbooks record *how*.

**Docs update as-you-go, in the same PR as the change**: plan status and
progress logs, ADRs at forks, runbook bumps when steps change. Incidents and
recoveries get written down, not buried.

### Tiers: adopt what the project earns

Not every repo needs all five surfaces. A scaffold applied where it isn't
earned generates ceremony and then gets abandoned wholesale.

| Tier | Surfaces | When |
|------|----------|------|
| 0 | `docs/adr/`, `docs/runbooks/` | every repo, including one-file scripts |
| 1 | + `docs/plans/` | work spanning more than a week, or more than one person |
| 2 | + `docs/audits/`, `docs/research/` | public, regulated, or large enough that a whole-surface sweep pays for itself |

Delete the directories you aren't at yet. Adding one back later costs nothing.

### ADRs: `docs/adr/`, `/adr` skill

- **Trigger: unwinding the decision would cost more than a day.** That is the
  test, not "significance". Cheap-to-reverse choices don't get an ADR, and a
  corpus padded with them is a corpus nobody reads.
- Nygard format + options considered (`docs/adr/template.md`); conventions in
  `docs/adr/README.md`. Accepted ADRs are immutable. Supersede, never edit.
- ADRs land in the same PR as the work they govern.

### Plans: `docs/plans/`, `/plan` skill

- Multi-phase work gets a plan: `docs/plans/<date>-<slug>/` with a status-table
  README + `phase-NN-slug.md` files. Conventions in `docs/plans/README.md`.
- **Resumable by a stranger** is the bar. Status table, checkboxes, and progress
  logs update as-you-go, not at phase end.
- Gates per phase: `make check` green, verification commands run, ADR captured
  at any mid-plan fork.
- **Staleness:** an in-progress plan with no progress-log entry in 60 days is
  flagged by `make docs-check`. Mark it ⏸ Deferred or delete it. An abandoned
  plan that looks live is worse than no plan.

### Audits: `docs/audits/`, `/audit` skill

- Point-in-time audits of a surface (code, security, UX, data):
  `docs/audits/<date>-<slug>/` with `00-executive-summary.md`, `NN-topic.md`
  findings, and a `todo.md` punchlist. Conventions in `docs/audits/README.md`.
- Findings carry evidence or get dropped; severity codes `C/H/M/L-NN`; audits
  are snapshots, never silently edited after publication.

### Runbooks: `docs/runbooks/`, `/runbook` skill

- Operational how-tos: one task per file, exact copy-pasteable commands,
  **Failure modes** fed by real incidents (dated), **Last verified** stamp.
- Conventions + index in `docs/runbooks/README.md`. A PR that invalidates a
  runbook's steps updates it in the same PR.

### Research: `docs/research/`

- Dated analysis workspaces. ADRs, plans, and audits cite research, never
  restate it. Conventions in `docs/research/README.md`.

## Linked docs

- `docs/adr/README.md`: ADR conventions + index of recorded decisions.
- `docs/plans/README.md`: plan conventions + index of phase plans (resumable).
- `docs/audits/README.md`: audit conventions + index of completed audits.
- `docs/runbooks/README.md`: runbook conventions + index of operational how-tos.
- `docs/research/README.md`: research conventions + index of analysis workspaces.
- `docs/runbooks/start-a-new-project.md`: how to cookie-cutter this template.
- `docs/adr/0001-tiered-docs-scaffold-with-machine-enforcement.md`: why the
  scaffold is shaped this way, and what it costs.

---

## This project

Sailflow: a free, web, mobile-first J/70 rig-tune and sail-trim trainer.
Svelte 5 + Vite + TS, pnpm, deployed to GitHub Pages, no backend. Full brief:
[`docs/initial-prompt.md`](docs/initial-prompt.md). Plans and their status:
[`docs/plans/README.md`](docs/plans/README.md) — resume from its status table,
not from a hard-coded plan; the Epic 1 plan is `2026-08-25-mvp-analyser`.

- **`make check` before every PR.** Docs-check, lint, typecheck, test all
  green, or don't open it.
- **Module boundary.** `src/core` is pure physics: no DOM, no framework, no
  imports from `src/ui`. The UI only talks to the solver through the
  `src/worker` protocol, never by importing `src/core` directly — the one
  exception is type-only imports from `src/core/types`, enforced by
  `no-restricted-imports` in `eslint.config.js`.
- **Honesty rules.** No number in the app or docs without a `prov:` source
  tag or a row in `ASSUMPTIONS.md` (enforced by `scripts/prov_check.py` for
  `src/core` literals; honour-code elsewhere). Every model output carries a confidence
  tier (A/B/C). When the model and a tuning guide disagree, show both and the
  delta — never resolve the disagreement silently in favour of either.
- **Determinism.** `src/core` never calls `Math.random` or `Date`. Same
  inputs, same outputs, always.
- **Third-party data.** Committed under `data/`, one JSON file per source, so
  a new source lands in a single commit. Provenance lives in the root
  `PROVENANCE.md`, one section per source, not restated elsewhere.
- **Cut order under time pressure:** downwind first, then the tuning-log
  export, then visual polish. Never cut the validation harness or
  provenance documentation.
- **Tests are part of the change.** Every non-trivial module lands with tests
  that would fail if its logic broke: unit tests on math and physics functions,
  invariant tests on the solver, store tests on UI logic. No placeholder or
  tautological tests.
