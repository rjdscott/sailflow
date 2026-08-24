# Phase 04: Race mode

- **Status:** 🔵 Not started

## Goal

Every class-legal running-rigging control moves a visible sail section, rig elevation, or plan view, and updates speed, height, VMG with confidence tiers and a one-line coach hint.

## Tasks

- [ ] Race store: ControlState → worker solve → SolveResult; coach line from largest ∂VMG/∂control × legal step [O]
- [ ] SailSections.svelte (¼ ½ ¾ slices), RigElevation.svelte, PlanView.svelte (telltales, heel) [S]
- [ ] Conditions strip + sheet; slider groups; Simple (5) vs Advanced (11 + downwind with C banner) [S]
- [ ] Presets + tap-control explainer sheets (expert register) [S]
- [ ] Rounding rules: 0.1 kt, 1°, 0.01 VMG

## Verification

```bash
make check
pnpm test -- race
```

## Artifacts

`src/ui/screens/Race.svelte`, `src/ui/stores/race.ts`

## Progress log

