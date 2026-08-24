# Phase 07: Drills

- **Status:** 🔵 Not started

## Goal

Ten static trim drills, each a condition plus a wrong setup, scored against the solver optimum, with best scores persisted.

## Tasks

- [ ] Drill schema + scorer (VMG loss %, Gold/Silver/Bronze) [O]
- [ ] 10 drill definitions across tiers, incl. one downwind C-tier [S]
- [ ] Drill screen reusing Race screen with locked controls + Check [S]
- [ ] Runbook add-a-drill

## Verification

```bash
make check
pnpm test -- drills
```

## Artifacts

`data/drills/*.json`, `src/ui/screens/Drills.svelte`

## Progress log

