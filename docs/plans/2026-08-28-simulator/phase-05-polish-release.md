# Phase 05 — Polish, snapshots, audit tick-off, 0.5.0

**Goal.** The remaining audit ux-04 items land, the README screenshots show
the Simulator, the audit punchlist is ticked against git history, and
0.5.0 is cut.

## Tasks

- [ ] M-04 — hero re-fits on `.hero-boat` resize (`ResizeObserver` →
  `presets.ts` fit); Learn tier frames the whole boat at 1440.
- [ ] M-05 — Log empty state's second sentence.
- [ ] M-06 — `Lull` / `Shift` / `Replay a gust` grouped under a "Simulate"
  label with ▶ glyphs; TWS cell pulses during a replay.
- [ ] README screenshots reshot (desktop 1440, phone 390) per the
  `docs/runbooks/` screenshot runbook; "Dock" wording gone from README,
  `initial-prompt.md` note, More → About.
- [ ] `docs/audits/2026-08-28-ux-04/todo.md` ticked with PR numbers.
- [ ] `CHANGELOG.md` 0.5.0; `package.json` version; tag per the release
  runbook.
- [ ] Successor audit `ux-05` **not** in this plan — the owner shares the app
  first and the next audit takes the skipper's feedback as input.

## Verification

```sh
make check
pnpm test:ui
pnpm build && du -sh dist   # bundle gate still green
```

## Artifacts

- Reshot screenshots; ticked `todo.md`; 0.5.0 in CHANGELOG and tag.

## Progress log

