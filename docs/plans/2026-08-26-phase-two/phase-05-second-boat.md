# Phase 05: Second boat class

- **Status:** 🔵 Not started

## Goal

A second one-design (J/24 or Melges 24 — pick by polar availability) sails
in the app from its own `data/boats/*.json`, and the J/70 golden corpus is
byte-identical before and after. The boat file is data; `src/core` names no
class.

## Tasks

- [ ] Inventory: `grep -rl j70 src/core` (ten files at close-out) — for each, move the constant into `BoatDefinition` or justify it as class-independent with a `prov:` tag.
- [ ] `validateBoat` covers every field the solver reads; a missing field is an error, not a silent default.
- [ ] Boat picker (More screen), persisted; router carries `boat=` in share URLs (phase 02 schema).
- [ ] Second boat file with full provenance; polar from ORC if published, else the class association; drills templates optional.
- [ ] Calibration per boat: `pnpm calibrate --boat <id>`; residuals and golden corpus per boat.
- [ ] Runbook `docs/runbooks/add-a-boat-class.md` re-verified by actually following it.

## Verification

```bash
make check
pnpm golden --boat j70 && git diff --exit-code validation/golden
pnpm validate --boat <second>
```

## Artifacts

`data/boats/<second>.json`, `data/polar/<second>.json`, per-boat golden
directory, updated runbook.

## Progress log
