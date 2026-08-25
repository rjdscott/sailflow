# Phase 04 — Verify and close out

## Goal

Live walk of both features on Pages at the two target sizes; docs current.

## Tasks

- [x] Pages live-verified at 1920×1080 (all on screen, hero ≥ 480 px) and 1536×864 (primary controls in first viewport, one scroll to Rig); no internal scrollbars; kite drawn on Run and answering its sheet.
- [x] ux-03 `todo.md`: tick M-01 and M-04 with PR numbers.
- [x] `CHANGELOG.md` entry; runbooks touched if steps changed (none: no operational step changed).
- [x] Plan README state section; memory note.

## Verification

`make check`; `gh run list --workflow=pages.yml --limit 1`.

## Artifacts

Progress logs; CHANGELOG.

## Progress log

- 2026-08-25 — Live walk of `1be7c2e` on Pages (headless Chromium, production URL): 1920×1080 doc 1539 px, hero 768×1112 with WebGL on, zero elements with an internal scroller; 1536×864 hero band 1416×480, first sail controls in the first viewport; Broad reach shows the Gennaker panel and the reworked kite from astern (luff bowed, leech straight, clew inboard/aft). ux-03 M-01 and M-04 ticked (#70). Next-block list in the plan README state section (downwind main ease first).

## Follow-ups

- 2026-08-25 — ux-03 M-23 done (#78): the honesty markdown and the secondary screens left the first-load chunk. `PROVENANCE.md`, `ASSUMPTIONS.md` and `validation/report.md` are `await import('...?raw')` inside More's document sheet, and Log, Drills and More are `{#await import()}` in `App.svelte` the way Kit already was; Race and Dock stay static. First load 134066 → 92736 B gzip (−41330 B). `bundle_check.mjs` now sums every chunk `index.html` names — the split leaves four first-load chunks, not one — and `scripts/bundle_baseline.json` is lowered to match, which retires this plan's phase-05 note that its ASSUMPTIONS rows were riding in the entry. New `tests/ui/more.spec.ts` covers the three sheets; it caught a real bug on the way in (`$state` proxied the DOCS entry, so the `openDoc === doc` in-flight guard never matched and the sheet sat on "Loading…" — `$state.raw` now).
