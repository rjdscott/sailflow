# Phase 04: Race mode

- **Status:** 🟢 Completed

## Goal

Every class-legal running-rigging control moves a visible sail section, rig elevation, or plan view, and updates speed, height, VMG with confidence tiers and a one-line coach hint.

## Tasks

- [x] Race store: ControlState → worker solve → SolveResult; coach line from largest ∂VMG/∂control × legal step [O]
- [x] SailSections.svelte (¼ ½ ¾ slices), RigElevation.svelte, PlanView.svelte (telltales, heel) [S]
- [x] Conditions strip + sheet; slider groups; Simple (5) vs Advanced (11 + downwind with C banner) [S]
- [x] Presets + tap-control explainer sheets (expert register) [S]
- [x] Rounding rules: 0.1 kt, 1°, 0.01 VMG

## Verification

```bash
make check
pnpm test -- race
```

## Artifacts

`src/ui/screens/Race.svelte`, `src/ui/stores/race.ts`

## Progress log

- 2026-08-25 — Built by an Opus agent in a worktree against `stubClient()`; PR #5 merged. Store at `src/ui/race/store.svelte.ts` (plan said `src/ui/stores/race.ts`). Coach line probes 4 controls ±1 step via extra `trimmed` requests. Real-worker swap is one line in `src/ui/race/client.ts`; done in the solver integration PR.
- 2026-08-25 — Integrated with the real solver worker in PR #9; browser-verified on preview. Phase closed.
