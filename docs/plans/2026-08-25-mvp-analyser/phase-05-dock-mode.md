# Phase 05: Dock mode

- **Status:** 🔵 Not started

## Goal

Commit a rig setup against a forecast range, sea state and crew weight; see expected regret and the cost at each end of the range; the commit locks Race mode rig per C.9.5.

## Tasks

- [ ] Dock store + batch worker request (N setups × TWS grid) [O]
- [ ] Dock screen: forecast dual slider, sea state, crew stepper, rig sliders with guide ticks, regret card + sparkline, Commit [S]
- [ ] Suggest: grid search over legal increments, tie band [S]
- [ ] Lock indicator + unlock-with-warning in Race [S]
- [ ] ADR 0009 (dock scoring)

## Verification

```bash
make check
pnpm test -- dock
```

## Artifacts

`src/ui/screens/Dock.svelte`, `src/ui/stores/dock.ts`

## Progress log

