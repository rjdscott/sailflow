# 0019. Share links are a versioned, compact query with a migration table

- **Status:** Accepted
- **Date:** 2026-08-26

## Context

Sailflow has no backend and no accounts (`docs/initial-prompt.md`), so the only
way one sailor can show another what they are looking at is a URL. Phase two's
first user-visible promise is exactly that: "a Race or Dock state is a URL a
sailor can paste into a group chat, and the recipient sees the same numbers and
the same sail".

Three forces pull against each other.

**The link outlives the app.** A URL pasted into a WhatsApp group in August is
opened in November, by which point the control set has grown — phase 05 of this
plan adds a second boat class, and phase 03 adds guides as data. A link that
silently mis-reads because a field moved is worse than one that refuses:
`traveller` and `cunningham` are adjacent in the trim string, and swapping them
produces a plausible boat that is not the one that was sent. The plan's own risk
register says so (`docs/plans/2026-08-26-phase-two/README.md`, risk 2).

**The link has to survive a chat client.** Chat clients truncate, wrap and
linkify. Twenty-two controls plus five condition fields plus a forecast is a lot
of query string, and a link that wraps across two lines gets half-copied.

**The link is user input.** It reaches the solver. `src/ui/scenario.ts` already
snapped and clamped everything a `#/race?tws=…&r=…` link carried, for exactly
this reason, and nothing in a wider schema changes that.

What already existed: an unversioned scenario query
(`?tws=&twa=&sea=&crew=&set=&r=30.60.0.…`) covering the condition and the eleven
race controls, written into the address bar by a debounced effect in
`App.svelte` since audit ux-02 M-05. Those links are live in v0.3.0 today. What
it did not cover: the four gennaker controls, the three dock controls, the
forecast, and the density tier.

## Options considered

**A. Base64 or LZ-compressed JSON blob.** Serialise the whole state, compress,
base64url it into one `?s=` parameter.

- Pros: shortest to write; carries any shape without a schema; adding a field
  costs nothing.
- Cons: opaque. Nobody can read or hand-edit a link, which is how the existing
  `?tws=18` links get used in practice ("try it at 22 knots"). Versioning still
  has to be solved inside the blob, so the hard part does not go away — it just
  becomes invisible. Base64 of JSON is also *longer* than the field list for a
  payload this small, and a compressor is a dependency for ~150 bytes.

**B. One query parameter per control.** `?backstay=30&mainsheet=60&…`, 22
parameters plus the rest.

- Pros: maximally readable and hand-editable; a missing field is obviously
  missing; no ordering to get wrong.
- Cons: ~400 characters of query for a state that fits in 150. Chat clients
  wrap it. And it does not actually solve versioning: renaming a control still
  breaks every old link, with no version to branch on.

**C. Versioned, grouped, positional query with a migration table.** One
parameter per control *block* (`r=` race, `w=` gennaker, `d=` dock, `f=`
forecast), values positional within the block, plus `s=<version>`, and a
`version → rewrite` table the parser runs a link through before reading it.

- Pros: short (under 200 characters with every group filled, asserted in
  `share.test.ts`) and still legible — a reader can see five groups and edit
  `tws=18`. The version makes a breaking change *possible* rather than
  forbidden. A migration rewrites the query, so the reader stays one parser for
  the current schema however old the link is.
- Cons: positional order inside a group is load-bearing and invisible — nothing
  in the URL says which slot is `traveller`. That has to be held by a test, not
  by care.

**D. No versioning; treat the schema as frozen.** Keep appending fields and
never change one.

- Pros: no mechanism at all.
- Cons: the plan already knows two schema-moving phases are coming (guides as
  data, a second boat class). "Never change one" is a promise this project
  cannot make, and discovering that after the links are in group chats is the
  expensive order to discover it in.

## Decision

**We will encode share state as a versioned, group-positional query
(`?s=1&tws=…&r=…&w=…&d=…&f=…&t=…`) read through a `version → query rewrite`
migration table, for every link the app produces or accepts.** The schema, its
groups, its migrations and its validators live in `src/ui/share.ts`.

Scope and the rules that come with it:

- **The live address bar *is* the share link.** `App.svelte` writes the same
  encoding it reads, on Race and Dock, so there is one URL shape rather than a
  displayed one and a shareable one. "Copy link" builds the URL from the live
  stores rather than reading `location`, because that writer is debounced.
- **Group order is append-only.** A new control is a new slot on the end of its
  group. `share.test.ts` walks `data/boats/j70.json` and fails if any control is
  missing from the schema, present twice, or filed under a group its `mode`
  does not name — so a control added to the boat file cannot be forgotten.
- **A version bump requires a migration entry**, and the migration rewrites the
  query rather than the decoded object.
- **Every value is snapped and clamped** through the owning control's own spec
  before it reaches a store. A group whose length does not match is dropped
  whole, never half-applied.
- **An unknown future version is read best-effort, not rejected**: a link from a
  newer build should still land the fields this build understands.
- **What a link never carries is the rig Race solves.** That is the recipient's
  own committed tune under class rule C.9.5 (ADR 0015's premise); `d=` restores
  the Dock screen's setup, which is the screen that asks that question.

`_` is the in-group separator, not `.`: dock turns move in half-steps, and a dot
cannot tell `-1.5_0` from `-1_5_0`. The v0 links already in the wild used dots,
which was safe only because every race control is an integer — `MIGRATIONS[0]`
rewrites them, and that is the table's first real entry rather than a
placeholder.

## Consequences

**Easier.** Sharing a trim is a paste. Reproducing a bug report is a paste. The
tuning log gets a link per entry for free, because an entry is a `ShareState`
with fewer fields. A reload restores the whole state including the gennaker
controls, which the session store never carried.

**Harder.** Every future control change now has a second place to land, and a
test that will fail until it does. Renaming a control is no longer free: it is a
version bump plus a migration. That cost is the point.

**Committed to.** The v1 field order, permanently — `RACE_KEYS`, `DOWN_KEYS`,
`DOCK_KEYS` and the forecast tuple in `src/ui/share.ts` are now a published
wire format, not an implementation detail. And to `MIGRATIONS[0]`: v0.3.0's
dot-separated links must keep working for as long as anyone has one.

**Risk accepted.** A share link applies the sender's density tier to the
recipient's browser, and persists it. That is a UI preference with its own
visible toggle, and "see what they were looking at" is the whole promise, so it
is applied rather than ignored — but it is the one field a recipient did not ask
for. Unwinding that is one line in `App.svelte`.

**Cost paid.** First-load bundle +3107 B gzip against this branch's HEAD, about
half of it Rollup regrouping `data/boats/j70.json` out of the index chunk rather
than new code; recorded with the measurement in
`scripts/bundle_baseline.json`.

**Revisit when:** the schema needs its first real breaking change — phase 05's
second boat class is the likely trigger, since a link will then have to name
which boat it is a trim for. If `MIGRATIONS` reaches three entries, or a
migration ever needs to *drop* a field rather than rewrite one, the positional
groups have stopped paying and option A's blob deserves a second look.

## Related

- **Numbering note:** 0018 is being written concurrently on another branch
  (phase-two phase 01). This ADR took 0019 rather than 0018 to avoid two
  branches claiming the same number; if the two land out of order the index
  will read 0017, 0019, 0018 for a while. Numbers are never reused or
  renumbered (`docs/adr/README.md`), so the gap is left as it falls.
- Plan: `docs/plans/2026-08-26-phase-two/phase-02-share-and-compare.md`, and
  risk 2 in that plan's `README.md`.
- ADR 0005 (hash routing, no router library) — the query this decision shapes
  lives inside that hash.
- ADR 0015 (one instrument-cell contract) — why a pinned trim takes the target
  slot rather than adding a second delta to every cell.
- Audit ux-02 M-05, which created the unversioned scenario link this supersedes
  in shape but not in behaviour, and ux-01 M-19, the pin-and-compare finding the
  same phase closes.
