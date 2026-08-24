# 0010. Persistence behind a LogStore interface: localStorage now, IndexedDB when the schema settles

- **Status:** Accepted
- **Date:** 2026-08-25

## Context

The tuning log is a first-class feature used on a phone with no signal. iOS
Safari evicts site data after periods of disuse and PWAs cannot rely on
storage persisting forever. The entry schema will change during Epic 1 as
dock mode and the disagreement panel land. The brief asks for IndexedDB and
JSON export.

## Options considered

**A. IndexedDB from day one.**
- Pros: larger quota, structured; the brief's request.
- Cons: async boilerplate and migrations while the schema is still moving.

**B. localStorage only.**
- Pros: trivial.
- Cons: ~5 MB cap, synchronous, same eviction rules.

**C. A `LogStore` interface with one implementation now (localStorage) and
an IndexedDB implementation in the last MVP phase** (chosen). This is the one
interface-with-one-implementation the project allows itself, because a second
implementation is scheduled, not speculative.

## Decision

**We will put all log persistence behind `LogStore` in `src/lib/logStore.ts`,
version every entry with a `v` field, ship localStorage now and IndexedDB in
phase 08, and keep JSON export prominent from the first release, because
export is the only durable backup on iOS regardless of storage engine.**

## Consequences

Easier: swapping engines is one file; tests use an in-memory store. Harder:
migrations must be written when `v` changes. Committed to: versioned entries,
tolerant reads (corrupt data → empty + warning), export/import round trip
tests. Risk accepted: users who never export can lose data to eviction.

**Revisit when:** entries exceed a few thousand, or a sync/backend exists
(Epic 3).

## Related

- `docs/initial-prompt.md` §Tuning log
- Plan phases 06 and 08
