# Export and import the tuning log

## When to use

Backing up a tuning log before clearing browser storage, moving entries to a
new device or browser, or restoring after IndexedDB got evicted (see
`src/lib/logStore.ts` — iOS Safari can evict storage under pressure; the
tuning log is otherwise the app's only persistent data).

## Steps

1. **Export.** Log screen → "Backup" → "Export JSON" or "Export CSV" (the two
   Export buttons only appear once the log has at least one entry). Both
   download the full log (`src/ui/log/store.svelte.ts` → `exportJson()` /
   `exportCsv()`, backed by `src/lib/logExport.ts`). JSON is the round-trip
   format; CSV is one-way, for spreadsheets — the app cannot re-import a CSV.

2. **Import.** Log screen → "Backup" → "Import a log file" → pick a `.json`
   file previously exported by this app (`accept=".json"` on the file input,
   `src/ui/screens/Log.svelte`). The file is parsed but **not** written yet: a
   sheet says how many entries it holds, how many rows cannot be read, and how
   many you have now, then offers two writes and a cancel
   (`logStoreUi.parseImport` → `applyImport`, `src/ui/log/store.svelte.ts`):

   - **Merge into my log** — additive and idempotent by `id`: re-importing the
     same file does not duplicate entries, since `applyImport` calls
     `store.put()` per row, which replaces on a matching `id`.
   - **Replace my log** — `store.clear()` first, then the same per-row put.
     Every existing entry is deleted. Export first if you might want them.

3. Confirm what landed. The app shows a toast: `Imported N entries` /
   `Replaced with N entries`, or the same with `, M skipped` — `M` is
   malformed rows that were dropped
   rather than failing the whole import (`fromJson` in
   `src/lib/logExport.ts`). If rows were skipped, open the JSON file and
   check each row against `validateRow`'s rules: `v: 1` or `v: 2` (a v1 row is
   accepted and migrated to v2 on the way in — `migrateEntry` adds `status:
   'complete'` and an empty `outcome`); string
   `id`/`date`/`venue`/`notes`/`fast`/`createdAt`; a `forecast` object
   (`minKt`/`likelyKt`/`maxKt`); an `actual` object (`minKt`/`maxKt`);
   `seaState` 0–4; numeric `crewKg`; a `dock` object
   (`upperTurns`/`lowerTurns`/`forestayMm`); and, if present, a `race` object
   with all eleven `RaceControls` fields numeric. Since v2, every numeric log
   field except `dock` may also be `null`, meaning "not recorded" — it exports
   as an empty CSV cell, never as a 0. `status` must be `draft` or `complete`
   when present, and `outcome` (when present) must be
   `{ result: string, placing: number | null }`.

4. **Start clean.** More → Data → "Reset log", then "Tap again to delete every
   entry" (`logStoreUi.reset()` → `store.clear()`). Two taps, no native
   `confirm()`, no undo, no cloud copy — export first.

5. Restore onto a fresh browser/device: open the app once (so a store —
   IndexedDB, or the localStorage fallback; `chooseLogStore()` in
   `src/lib/logStore.ts` — initialises), then Import the JSON file from
   step 1.

## Failure modes

- **Import silently does nothing, no sheet.** The file picker was cancelled
  or no file was selected — `handleImportFile` returns early when
  `input.files?.[0]` is empty. Not a bug, just no file chosen.

- **A red line above the log instead of entries.** The store could not be
  read, saved to or imported into — the message comes from
  `LogUiStore.error` and names which call failed. The entries are still on the
  device; a blocked or erroring `indexedDB.open` (private mode, a browser
  blocking site data) is the usual cause. Since v2 a failed write no longer
  toasts "Entry saved": the editor stays open with what you typed.

- **A "Today · in progress" entry you did not create.** That is the Dock
  commit's log entry (status `draft`, id `draft-<date>`). Opening it and
  saving completes it; a second commit on the same day updates it in place
  rather than filing a second one.
- **"Imported 0 entries, N skipped".** The file isn't this app's export
  format — commonly a CSV re-imported by mistake (CSV import isn't
  supported: `accept=".json"` blocks the file picker from even offering CSV
  files, so this only happens if a CSV was renamed to `.json`), or JSON hand-
  edited into an invalid shape. Check the row rules in step 3.
- **Log looks empty after reinstalling the PWA on iOS Safari.** IndexedDB
  survives an app reinstall in most cases but is not guaranteed — iOS can
  evict any web storage under disk pressure, PWA or not. This is exactly why
  export exists; there is no cloud backup. Import the last export.

## Last verified

- **Last verified:** 2026-08-25, drills-and-loop phase 03 (log schema v2).
  The export/import code path and `validateRow` rules were read directly from
  `src/lib/logExport.ts` and `src/ui/screens/Log.svelte`; `pnpm test`
  (`src/lib/logExport.test.ts`, `src/lib/logStore.test.ts`,
  `src/ui/log/store.test.ts`) covers the round trip, the v1→v2 migration, the
  merge/replace split and the malformed-row cases. The UI flow itself
  (clicking Backup → Export/Import in a real browser) was not walked in this
  pass — no browser available.
