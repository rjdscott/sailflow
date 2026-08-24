# Phase 08: PWA, polish, docs close-out

- **Status:** 🔵 Not started

## Goal

Works offline on a phone after first load; provenance complete; acceptance criteria 1–7 from the brief walked on device.

## Tasks

- [ ] vite-plugin-pwa, IndexedDB LogStore, iOS Safari check [S]
- [ ] Visual pass: tokens only, reduced motion, dark mode [S]
- [ ] PROVENANCE.md + ASSUMPTIONS.md complete; `prov:` literal grep in docs-check [S]
- [ ] Runbooks: deploy-to-github-pages, release-and-pwa-cache-bust, export-import-tuning-log, add-a-boat-class [S]
- [ ] Acceptance 1–7 walked; README status updated

## Verification

```bash
make check
pnpm build && ls dist/sw.js
```

## Artifacts

`dist/sw.js`, `docs/runbooks/*.md`, updated README

## Progress log

