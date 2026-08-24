# Phase 06: Disagreement panel + tuning log

- **Status:** 🔵 Not started

## Goal

Model optimum, North, Quantum side by side with deltas in native units, never resolved silently, divergences logged; a tuning log that persists and exports.

## Tasks

- [ ] Disagreement panel: banded guide lookup, interpolation, delta in turns/mm/hole/kt/°, "calibrated here" marker, divergence log [O]
- [ ] LogStore (localStorage impl), entry form, list, JSON + CSV export, JSON import [S]
- [ ] Commit-for-today drafts a log entry [S]
- [ ] ADR 0010 (persistence)

## Verification

```bash
make check
pnpm test -- log
```

## Artifacts

`src/ui/screens/Log.svelte`, `src/ui/components/Disagreement.svelte`, `src/lib/logStore.ts`

## Progress log

