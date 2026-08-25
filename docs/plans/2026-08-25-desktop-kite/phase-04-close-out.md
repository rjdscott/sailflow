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
