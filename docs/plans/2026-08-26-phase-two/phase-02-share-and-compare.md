# Phase 02: Share a trim, pin and compare

- **Status:** 🔵 Not started

## Goal

A Race or Dock state is a URL a sailor can paste into a group chat, and the
recipient sees the same numbers and the same sail. On screen, "pin" freezes
a trim as a ghost outline with delta readouts so two setups can be compared
side by side without a spreadsheet.

## Tasks

- [ ] URL schema: versioned, compact query (`?s=1&…`) covering conditions, sailset, all race and dock controls, density tier; parser with a migration table; round-trip test for every control in `data/boats/j70.json`.
- [ ] "Copy link" in the actions bar (Race and Dock) using `navigator.clipboard` with a fallback; toast on success.
- [ ] "Pin this trim": store the pinned `SolveResult` + controls; ghost outline in plan view and 3D (`src/ui/three`, dashed or 40 % alpha); instrument cells show Δ vs pinned, labelled (existing "Δ vs <what>" contract).
- [ ] Log export/import already exists (`docs/runbooks/export-import-tuning-log.md`); add CSV export and a share link per log entry.
- [ ] Helm/rudder-angle readout from the solver's yaw balance (tier B), carried from ux-excellence 06 M-18, with tests on the balance math.
- [ ] Playwright: open a generated link in a fresh context, assert the instrument bar matches the origin.

## Verification

```bash
make check
pnpm test:ui
```

## Artifacts

`src/ui/share.ts` (+ test), actions-bar buttons, `tests/ui/share.spec.ts`,
runbook `docs/runbooks/export-import-tuning-log.md` updated.

## Progress log
