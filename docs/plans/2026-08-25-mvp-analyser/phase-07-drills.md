# Phase 07: Drills

- **Status:** 🟢 Completed

## Goal

Ten static trim drills, each a condition plus a wrong setup, scored against the solver optimum, with best scores persisted.

## Tasks

- [x] Drill schema + scorer (VMG loss %, Gold/Silver/Bronze) [O]
- [x] 10 drill definitions across tiers, incl. one downwind C-tier [S]
- [x] Drill screen reusing Race screen with locked controls + Check [S]
- [x] Runbook add-a-drill

## Verification

```bash
make check
pnpm test -- drills
```

## Artifacts

`data/drills/*.json`, `src/ui/screens/Drills.svelte`

## Progress log

- 2026-08-25 — Built by an Opus agent; PR #7 merged. Downwind drill needed `down`/`freeDown` fields; downwind drills score on VMG only. Medal thresholds (1/3/6 %) assumed — ASSUMPTIONS row and add-a-drill runbook owed in close-out.
- 2026-08-25 — Integrated with the real solver worker in PR #9; browser-verified on preview. Phase closed.
