# Phase 08: PWA, polish, docs close-out

- **Status:** 🟢 Completed

## Goal

Works offline on a phone after first load; provenance complete; acceptance criteria 1–7 from the brief walked on device.

## Tasks

- [x] vite-plugin-pwa, IndexedDB LogStore, iOS Safari check [S]
- [x] Visual pass: tokens only, reduced motion, dark mode [S]
- [x] PROVENANCE.md + ASSUMPTIONS.md complete; `prov:` literal grep in docs-check [S]
- [x] Runbooks: deploy-to-github-pages, release-and-pwa-cache-bust, export-import-tuning-log, add-a-boat-class [S]
- [x] Acceptance 1–7 walked; README status updated

## Verification

```bash
make check
pnpm build && ls dist/sw.js
```

## Artifacts

`dist/sw.js`, `docs/runbooks/*.md`, updated README

## Progress log

- 2026-08-25 — Sonnet agent in a worktree: vite-plugin-pwa (autoUpdate, SVG icons, `/sailflow/` base verified), IndexedDB LogStore with one-time localStorage migration + `storage.persist()`, visual fixes (TWA readout wrap, sail-section viewBox so all three slices fit, visible slider track on surface cards, version from package.json 0.1.0), six runbooks. prov literal gate + ASSUMPTIONS weaknesses landed in PR #10. Worktree predated the solver merge; `run-validation-and-recalibrate.md` rewritten against the real harness. Remaining: on-device acceptance walk (1–7) in airplane mode; PWA update prompt uses `confirm()` (ponytail: swap for the Toast when it annoys).
- 2026-08-25 — PR #11 merged; Pages deploy green. Live check at https://rjdscott.github.io/sailflow/: service worker registered (scope `/sailflow/`), manifest served, race screen solves with the calibrated model (5.5 kt / 7° at 10 kt, coach line active), no console errors. Left open for the owner: acceptance 1 (offline reload on a real phone) and the sail-sections pane still crops the ¼ slice at 380 px (P2, `src/ui/race/SailSections.svelte` viewBox/height). Phase stays 🟡 until the on-device walk.
- 2026-08-26 — Acceptance 1–7 walked against Pages at `3a2e96d` with headless Chromium (390×844 mobile context for 1, 1920×1080 for the rest). 1 ✓ service worker registered, context set offline, reload renders the Race screen with all six instrument cells. 2 ✓ `validation/report.md` present, verdict line and tolerance column shown. 3 ✓ Dock commits a setup against 8–16 kt and prints the cost at each end (0.3 s/mi at 8 kt, 8.6 s/mi at 16 kt, worst end named). 4 ✓ all sixteen race and rig controls move the sail outline; boat speed moves at 1 dp on eight of them, the rest change shape within the display rounding. 5 ✓ disagreement panel renders North and Quantum deltas; the absent-table path is covered by `src/ui/race/disagreement.test.ts`. 6 honour-code: every `src/core` literal passes `scripts/prov_check.py`; UI literals are reviewed, not machine-checked (CLAUDE.md). 7 superseded by ADR 0008: tuning-guide tables are committed under `data/` with inline provenance rather than kept out of the repo. Phase closed; the deferred physics residual is recorded in phase 02.
