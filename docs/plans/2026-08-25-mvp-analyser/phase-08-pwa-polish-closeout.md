# Phase 08: PWA, polish, docs close-out

- **Status:** 🟡 In progress

## Goal

Works offline on a phone after first load; provenance complete; acceptance criteria 1–7 from the brief walked on device.

## Tasks

- [x] vite-plugin-pwa, IndexedDB LogStore, iOS Safari check [S]
- [x] Visual pass: tokens only, reduced motion, dark mode [S]
- [x] PROVENANCE.md + ASSUMPTIONS.md complete; `prov:` literal grep in docs-check [S]
- [x] Runbooks: deploy-to-github-pages, release-and-pwa-cache-bust, export-import-tuning-log, add-a-boat-class [S]
- [ ] Acceptance 1–7 walked; README status updated

## Verification

```bash
make check
pnpm build && ls dist/sw.js
```

## Artifacts

`dist/sw.js`, `docs/runbooks/*.md`, updated README

## Progress log

- 2026-08-25 — Sonnet agent in a worktree: vite-plugin-pwa (autoUpdate, SVG icons, `/sailflow/` base verified), IndexedDB LogStore with one-time localStorage migration + `storage.persist()`, visual fixes (TWA readout wrap, sail-section viewBox so all three slices fit, visible slider track on surface cards, version from package.json 0.1.0), six runbooks. prov literal gate + ASSUMPTIONS weaknesses landed in PR #10. Worktree predated the solver merge; `run-validation-and-recalibrate.md` rewritten against the real harness. Remaining: on-device acceptance walk (1–7) in airplane mode; PWA update prompt uses `confirm()` (ponytail: swap for the Toast when it annoys).
