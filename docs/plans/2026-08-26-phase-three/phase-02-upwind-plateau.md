# Phase 02: Upwind speed plateau — envelope or fix

- **Status:** 🔵 Not started

## Goal

Either the TWS 14 `jib vmgUp` row passes (≤ 3 %) because a resistance term
the model lacks is added with provenance, or the plateau is proven to be a
limit of the ORC hydro model as transcribed and the gate row is documented
as an envelope statement with the number — not left as "FAIL" with no owner.

## Tasks

- [ ] Decompose the 14–20 kt upwind residual: aero drive vs hydro resistance vs righting moment, per row, from the solver's residual outputs; commit the table.
- [ ] Check the hydro transcription against ORC 2023 §6 (residuary resistance, heel-induced drag, added resistance in waves at sea state 1): any term omitted or simplified (`hydro.wavesK` default 0.06 is one known simplification) is a candidate.
- [ ] If a term is missing: add it with `prov:`, recalibrate on the fit set, jib golden moves are expected and explained; downwind rows must not get worse.
- [ ] If not: write the envelope statement in `ASSUMPTIONS.md` and `validation/report.ts` weaknesses with the decomposition, and record in the README that the upwind plateau is a model limit at 14 kt and above.

## Verification

```bash
make check
pnpm validate
```

## Artifacts

Decomposition table under `docs/research/2026-08-26-downwind-angle/02-upwind-plateau.md` (same workspace), `ASSUMPTIONS.md` row(s).

## Progress log
