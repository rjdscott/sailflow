# Phase 00: P0 defects

## Goal

Close every P0 line in the audit punchlist: the severed Dock→Race rig
handoff (C-01) and the five user-visible defects (H-01…H-05). One PR.

## Tasks

- [x] C-01 Race reads `rigLock` and mutates `controls.dock` in place; rig card
      gates lock + copy on `rigLock.lockedToday`; free to explore otherwise.
- [x] H-01 Drop the hardcoded `−` in the per-TWS regret table; header "Slower by".
- [x] H-02 Metrics strip no longer sticky (static; `ponytail:` note names the
      upgrade path).
- [x] H-03 `DockStore.searching` + `searchSeq` split from `busy`/`seq`.
- [x] H-04 Global `summary` rule with a drawn marker; local flex overrides removed.
- [x] H-05 Coach line carries the VMG confidence badge.
- [x] Tests: `syncDock` in-place mutation; rescore during search keeps both flags honest.

## Verification

```sh
make check
```

Manual: Dock → set uppers +3 → Commit → Race shows 🔒 3.0 turns and mast
bend changes; fresh install shows "not committed, free to explore" with live
rig sliders; regret table reads "Slower by 0.5 s/mi"; "Why" and "Model vs
tuning guides" show a triangle; Dock load does not say "Searching…".

## Artifacts

- `docs/audits/2026-08-25-ux-01/todo.md` with P0 lines ticked.

## Progress log

- 2026-08-25 — All six P0 fixes landed on `fix/ux-01-p0`, 619 tests green,
  manual walk done on the dev build (desktop). Wording of the coach line is
  still upwind-only (`+x kt VMG`); phase 02 reworks it with the target.
