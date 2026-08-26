# Phase 03: Tuning guides as data

- **Status:** 🔵 Not started

## Goal

Adding a tuning guide is one JSON file under `data/tuning/` plus one
`PROVENANCE.md` section, and the disagreement panel lists every guide it
finds — including "none for this boat" — without a code change.

## Tasks

- [ ] Guide schema documented in `data/tuning/README.md` (bands by TWS, controls covered, units, provenance block); `scripts/provenance.mjs` validates it.
- [ ] Disagreement panel enumerates guides from data, not from a hard-coded North/Quantum pair; absent-guide path tested (`src/ui/disagree`).
- [ ] Add at least one more J/70 guide (Doyle or a class-association crib sheet) with retrieval date and ADR 0008 provenance.
- [ ] Guide selector in the panel and in the Dock recommendation; the model's own row stays first and the delta is always shown.
- [ ] Runbook `docs/runbooks/add-a-tuning-guide.md`.

## Verification

```bash
make check
node scripts/provenance.mjs && git diff --exit-code PROVENANCE.md
```

## Artifacts

`data/tuning/README.md`, new guide JSON, runbook, `PROVENANCE.md` section.

## Progress log
