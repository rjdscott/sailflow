# Scope contract

- **Surfaces in scope:** every documentation surface against the code it
  describes — `docs/adr/*` (decisions vs implementation), `docs/plans/*`
  (status tables, progress logs, "state at end" sections vs git history),
  `docs/research/*` (numbers and claims later cited by ADRs/plans/code),
  `docs/audits/*` (`todo.md` ticks vs merged PRs; index integrity),
  `docs/runbooks/*` (steps vs current scripts/CI; last-verified stamps),
  `ASSUMPTIONS.md` and `PROVENANCE.md` (every row vs the constant in code
  and its `prov:` tag), `CHANGELOG.md` (entries vs PR titles #41–#80),
  `CLAUDE.md` ("This project" section vs reality), `validation/README.md` and
  `validation/report.md` (claimed gate state vs `pnpm validate`),
  `data/boats/j70.json` labels vs `src/core` tables, `README.md`.
- **Out of scope:** UX findings (ux-03 covers them); physics correctness
  beyond what the docs *claim* about it; the template's generic sections of
  CLAUDE.md.
- **Lens:** consistency — where a number, claim, status, or decision in one
  place contradicts another place or the code. Four sub-lenses: decisions
  (ADR ↔ code), numbers (ASSUMPTIONS/PROVENANCE/research ↔ constants),
  state (plans/audits/CHANGELOG/runbooks ↔ git history and CI), and gates
  (validation/bundle/contrast claims ↔ what the scripts actually check).
- **Commit:** `e9a0f7d` (main after #80, kite leech bulge).
- **Method:** fan-out, five read-only Opus lenses in parallel (ADRs;
  ASSUMPTIONS/PROVENANCE/constants; research→plan→code for the spinnaker and
  cockpit; plans/audits/CHANGELOG/runbooks/indices; validation and gate
  claims), each returning evidenced findings; adversarial re-check of every
  High by the orchestrator (Fable) against the files; synthesis and doc
  fixes by Fable in a remediation PR citing the codes. Findings the lens
  could not evidence with file:line or command output are dropped.
