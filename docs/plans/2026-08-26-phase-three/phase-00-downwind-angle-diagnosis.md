# Phase 00: Downwind angle — find the second mechanism

- **Status:** 🔵 Not started

## Goal

An ADR that names the mechanism (or the source change) that lets the model's
downwind optimum span the polar's 162.5–174° instead of its own 165–170°,
with the evidence that it does so in a sweep and that it leaves the jib rows
untouched. Diagnosis only: no calibration is committed from this phase.

## Tasks

- [ ] Reproduce the residual from the phase-two 01 log without re-running its sweeps: table of VMG-vs-TWA at TWS 8/12/14/16/20 for the current model, 1° steps, 140–178°, committed under `docs/research/2026-08-26-downwind-angle/` as the baseline.
- [ ] Fetch the 2021 ORC one-design certificate polar for the J/70 (research doc 04 §3a names it); commit it as `data/polar/orc-j70-2021od.json` with provenance **only if** it can be fetched; tabulate its downwind optimum against the 2023 Speed Guide polar's. If they disagree by >10°, the fork includes "which polar is the target".
- [ ] Mechanism 1 (heel-coupled drive): sweep with the ORC spinnaker heel terms applied per the source; report the optimum-angle band per TWS and the jib golden diff.
- [ ] Mechanism 2 (twist function off past the changeover): same sweep and report.
- [ ] Mechanism 3 (changeover re-sweep with mechanism 2 in): same.
- [ ] Write research doc `docs/research/2026-08-26-downwind-angle/01-mechanisms.md` with the four sweeps side by side, then the ADR (`/adr`): mechanism chosen or target changed, options rejected with numbers.

## Verification

```bash
make check
pnpm validate   # must be unchanged by this phase — nothing is committed to the model
```

## Artifacts

`docs/research/2026-08-26-downwind-angle/{README,00-baseline,01-mechanisms}.md`,
one ADR, optionally `data/polar/orc-j70-2021od.json` + `PROVENANCE.md` section.

## Progress log
