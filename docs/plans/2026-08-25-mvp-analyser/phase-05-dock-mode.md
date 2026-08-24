# Phase 05: Dock mode

- **Status:** 🟡 In progress

## Goal

Commit a rig setup against a forecast range, sea state and crew weight; see expected regret and the cost at each end of the range; the commit locks Race mode rig per C.9.5.

## Tasks

- [x] Dock store + batch worker request (N setups × TWS grid) [O]
- [x] Dock screen: forecast dual slider, sea state, crew stepper, rig sliders with guide ticks, regret card + sparkline, Commit [S]
- [x] Suggest: grid search over legal increments, tie band [S]
- [x] Lock indicator + unlock-with-warning in Race [S]
- [x] ADR 0009 (dock scoring)

## Verification

```bash
make check
pnpm test -- dock
```

## Artifacts

`src/ui/screens/Dock.svelte`, `src/ui/stores/dock.ts`

## Progress log

- 2026-08-25 — Built by an Opus agent in a worktree; PR #8 merged. 36-setup suggest grid; three labelled sliders instead of a dual-thumb range (ponytail note); optimum-at-min/max shown as text under sliders. ADR 0009 written by Fable. Real-worker swap in `src/ui/dock/client.ts` pending the solver PR.
