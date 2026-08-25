# Phase 03: The loop — Dock → Race → Log

## Goal

Commit at the Dock starts a durable log entry, Race knows the committed
forecast, the on-screen trim can be logged in one tap, and the log can be
read back with an outcome. Closes M-04, M-07, M-08, M-19, M-20, M-21, M-23,
M-24, M-11.

## Tasks

- [x] Commit creates a persisted draft entry (IndexedDB) and the Log shows it as "Today, in progress".
- [ ] Race: "Log this trim" button; conditions strip offers the committed forecast band as a chip.
      _(Left for the Race agent — `src/ui/race/**` and `Race.svelte` are owned
      elsewhere. The seam is ready: `logStoreUi.setDraft({ race, … })` is kept
      and `openNew()` merges the draft over the prefill.)_
- [x] Log fields carry units/steps from `boat.controls`; failed read/save surfaces an error line.
- [x] Outcome fields: actual wind, result/placing, "what was fast", with forecast-vs-actual delta shown.
- [x] Import asks before merging (count shown) and offers replace; reset in More; empty state has one primary action and Export/Import is a Backup menu. _(Venue/wind filters not built — M-20's filter half is not in this brief.)_
- [x] Dock provisional number wears B while provisional.

## Verification

```sh
make check
```

## Artifacts

- `src/lib/logStore.ts` v2 schema + migration, `src/ui/log/**`.

## Progress log

- **2026-08-25 — everything except the two Race-screen items.** M-04: a Dock
  commit now calls `logStoreUi.startDraft(lock)`, which writes a real
  IndexedDB entry with `status: 'draft'` and id `draft-<date>` (one per
  committed day — a second commit updates it in place and keeps whatever has
  been typed). The Log lists drafts first, badged "Today · in progress", and
  saving one through the form sets `status: 'complete'`. Schema v2
  (`status`, `outcome`, `LogNumber = number | null`) migrates on read via
  `migrateEntry` — no IndexedDB version bump, since the keyPath and store
  shape are unchanged and the same function also migrates v1 rows arriving
  from an old export. M-07: every store call goes through `LogUiStore.guard`,
  which leaves a message in `error` rendered as a `role="alert"` line in place
  of "No entries yet"; a failed save returns `false` so the editor stays open;
  `writeAll` no longer swallows a localStorage failure. M-08: the dock and
  race rows are driven off `boat.controls` (`DOCK_KEYS`/`RACE_KEYS`/`SPECS` in
  `src/ui/log/logic.ts`), so unit, min, max, step and label match the sliders
  and the hand-rolled `RACE_FIELDS` table (and its forestay step drift) is
  gone. M-20: `outcome.result` / `outcome.placing` on the form, and
  `deltaLine()` shows "forecast 8–16 · sailed 9–14 kt (min +1, max −2)" per
  entry. M-21/M-23: import parses first and asks — count, unreadable rows, and
  what you have now — then merges or replaces; More → Data has a two-tap
  "Reset log" with a Toast; the empty state has one primary "Start today's
  entry" and Export/Import live under a "Backup" disclosure, with Export
  hidden while the log is empty. M-11: the Dock hero badge reads B while
  provisional, with the reason in the badge popover. Tests:
  `src/ui/log/logic.test.ts` (prefill, sort, draft label, delta),
  `src/ui/log/store.test.ts` (draft lifecycle, aliasing, error surface,
  merge/replace, reset), migration + null-round-trip cases in
  `src/lib/logStore.test.ts` and `src/lib/logExport.test.ts`. `make check`
  green. `docs/runbooks/export-import-tuning-log.md` updated for the new
  Backup menu, the merge/replace prompt, the reset step and the v2 rules.
- **Still open for the Race agent:** the "Log this trim" button and the
  committed-forecast chip on the conditions strip (task 2 above), i.e. M-24
  and the Race half of M-08.
