# Phase 00: Research and decisions

## Goal

The evidence and the decisions exist on disk before any code changes: the
four research reports, ADR 0014 (3D view, supersedes 0011), ADR 0015
(cockpit IA), decision-log rows, and this plan.

## Tasks

- [x] `docs/research/2026-08-25-cockpit/` README + 01 instrument/simulator UX + 02 J/70 trim mental model + 03 WebGL sail rendering.
- [x] ADR 0014 three.js sail view behind lazy chunk and perf gate; ADR 0011 status set to Superseded.
- [x] ADR 0015 cockpit panels by sail system, instrument cell contract, density tiers.
- [x] Decision-log rows 35–43 appended.
- [x] Plan directory with seven phase files; index regenerated.
- [x] PR merged, `make check` green on main.

## Verification

```sh
make docs && make check
```

## Artifacts

- `docs/research/2026-08-25-cockpit/{README,01-*,02-*,03-*}.md`
- `docs/adr/0014-*.md`, `docs/adr/0015-*.md`
- `docs/plans/2026-08-25-cockpit/*`

## Progress log

- **2026-08-25 — research and ADRs written.** Four research agents ran in
  parallel (codebase map, instrument/simulator UX, J/70 mental model, WebGL
  rendering); two owner Q&A rounds fixed canvas, grouping, look, scope,
  rendering tech, modes, dynamics and execution style (decision log 35–43).
  The codebase map is not a research file: it is a snapshot of code that
  the plan's Critical files section points at directly.
- **2026-08-25 — PR #50 merged.**
