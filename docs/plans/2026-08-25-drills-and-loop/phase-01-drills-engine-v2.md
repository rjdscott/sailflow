# Phase 01: Drills engine v2

## Goal

Drills are generated from fault templates, validated against the model,
scored on distance to the optimum in control space plus loss, and remember
every attempt (ADR 0013).

## Tasks

- [ ] Schema v2 in `src/lib/drills.ts`: `DrillTemplate { id, tier, title, brief, hint, controls: FaultSpec[], conditions: ConditionRange, objective }`, `FaultSpec { control, offsetSteps: [min,max] | 'random-sign' }`; `generateDrill(template, seed)` deterministic (seeded PRNG in `src/lib`, never `src/core`).
- [ ] Validity: generated start must lose ≥ threshold vs `optimalTrim`; resample up to N; test.
- [ ] Scoring v2: `distanceSteps` over free controls (legal-step L1), `lossPct`; medal by distance bands (0 / ≤2 / ≤5 steps, prov: assumed) with loss as tie-break; C-tier drills judged on distance only.
- [ ] Attempt history in IndexedDB (`LogStore` pattern): `{ templateId, seed, at, distance, lossPct, hintUsed, ms }`; migration of `best` scores.
- [ ] Spacing: SM-2-lite per template (ease, interval); `nextDue()` picks the drill; export/reset from More.
- [ ] Convert the surviving hand-written drills into templates; keep their titles.
- [ ] Tests for generator determinism, validity, scoring bands, SM-2 schedule.

## Verification

```sh
make check
```

## Artifacts

- `data/drills/j70-templates.json`, `src/lib/drills.ts` v2, `src/lib/spacing.ts` + tests.

## Progress log

_None yet._
