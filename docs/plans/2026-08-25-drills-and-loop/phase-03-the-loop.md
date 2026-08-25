# Phase 03: The loop — Dock → Race → Log

## Goal

Commit at the Dock starts a durable log entry, Race knows the committed
forecast, the on-screen trim can be logged in one tap, and the log can be
read back with an outcome. Closes M-04, M-07, M-08, M-19, M-20, M-21, M-23,
M-24, M-11.

## Tasks

- [ ] Commit creates a persisted draft entry (IndexedDB) and the Log shows it as "Today, in progress".
- [ ] Race: "Log this trim" button; conditions strip offers the committed forecast band as a chip.
- [ ] Log fields carry units/steps from `boat.controls`; failed read/save surfaces an error line.
- [ ] Outcome fields: actual wind, result/placing, "what was fast", with forecast-vs-actual delta shown.
- [ ] Filters by venue/wind; import asks before merging; reset in More.
- [ ] Dock provisional number wears B while provisional.

## Verification

```sh
make check
```

## Artifacts

- `src/lib/logStore.ts` v2 schema + migration, `src/ui/log/**`.

## Progress log

_None yet._
