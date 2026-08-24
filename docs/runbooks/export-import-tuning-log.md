# Export and import the tuning log

## When to use

Backing up a tuning log before clearing browser storage, moving entries to a
new device or browser, or restoring after IndexedDB got evicted (see
`src/lib/logStore.ts` — iOS Safari can evict storage under pressure; the
tuning log is otherwise the app's only persistent data).

## Steps

1. **Export.** Log screen → "Export JSON" or "Export CSV". Both download the
   full log (`src/ui/log/store.svelte.ts` → `logStoreUi.exportJson()` /
   `exportCsv()`, backed by `src/lib/logExport.ts`). JSON is the round-trip
   format; CSV is one-way, for spreadsheets — the app cannot re-import a CSV.

2. **Import.** Log screen → "Import" → pick a `.json` file previously
   exported by this app (`accept=".json"` on the file input,
   `src/ui/screens/Log.svelte`). Import is additive and idempotent by `id`:
   re-importing the same file does not duplicate entries, since
   `logStoreUi.import()` calls `store.put()` per row, which replaces on a
   matching `id`.

3. Confirm what landed. The app shows a toast: `Imported N entries` or
   `Imported N entries, M skipped` — `M` is malformed rows that were dropped
   rather than failing the whole import (`fromJson` in
   `src/lib/logExport.ts`). If rows were skipped, open the JSON file and
   check each row against `validateRow`'s rules: `v: 1`; string
   `id`/`date`/`venue`/`notes`/`fast`/`createdAt`; a `forecast` object
   (`minKt`/`likelyKt`/`maxKt`); an `actual` object (`minKt`/`maxKt`);
   `seaState` 0–4; numeric `crewKg`; a `dock` object
   (`upperTurns`/`lowerTurns`/`forestayMm`); and, if present, a `race` object
   with all eleven `RaceControls` fields numeric.

4. Restore onto a fresh browser/device: open the app once (so a store —
   IndexedDB, or the localStorage fallback; `chooseLogStore()` in
   `src/lib/logStore.ts` — initialises), then Import the JSON file from
   step 1.

## Failure modes

- **Import silently does nothing, no toast.** The file picker was cancelled
  or no file was selected — `handleImportFile` returns early when
  `input.files?.[0]` is empty. Not a bug, just no file chosen.
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

- **Last verified:** 2026-08-25 against a55d993. The export/import code path
  and `validateRow` rules were read directly from `src/lib/logExport.ts` and
  `src/ui/screens/Log.svelte`; `pnpm test` (`src/lib/logExport.test.ts`,
  `src/lib/logStore.test.ts`) covers the round trip and the malformed-row
  cases. The UI flow itself (clicking Export/Import in a real browser) was
  not walked in this pass — no browser available.
