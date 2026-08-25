# Phase 06 — Core downwind corrections the research surfaced

## Goal

Fix the solver-side discrepancies the research found (doc 04 (b) and doc 01),
each as its own commit with the hold-out gate re-run: the spinnaker
`flatmin` (ORC 0.53 since 2024, the code applies 0.42 to every sailset); the
asym's ORC table label in `data/boats/j70.json` (5.6 is the symmetric; the
bowsprit asymmetric is 5.7 in the edition the repo cites); and the ORC
edition pinned by year in `PROVENANCE.md` given the 2024→2026 asym
coefficient change. Anything that moves the hold-out report is reported,
not hidden.

## Tasks

- [ ] `src/core/aero/orc/depower.ts` (or wherever `clampFlat` lives): spinnaker `flatmin = 0.53` when `sailset === 'asym'`; test; `pnpm validate` before/after diff in the progress log. If the asym hold-out rows move, say by how much and whether it is towards or away from the published polar.
- [ ] `data/boats/j70.json` `sails.asym.orcTable` → the correct table for the cited edition; `PROVENANCE.md` row.
- [ ] `PROVENANCE.md`: ORC VPP edition pinned by year for the spinnaker tables; note the 2026 coefficient change and that the repo carries the earlier edition.
- [ ] Progress log.

## Verification

`make check`; `pnpm validate` (report the numbers).

## Artifacts

Core depower, boat data, `PROVENANCE.md`, tests.

## Progress log

