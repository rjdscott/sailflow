# Tuning guides

One JSON file per published tuning guide. Adding a guide is a file, not a code
change: `src/lib/reference.ts` enumerates this directory with
`import.meta.glob`, the disagreement panel and the Dock recommendation render
whatever it finds, and `scripts/provenance.mjs` validates the shape and writes
the `PROVENANCE.md` rows.

Why the numbers are committed at all, and what "settings only, never prose"
means: [ADR 0008](../../docs/adr/0008-third-party-reference-data-committed-with-provenance.md).
How to add one, step by step:
[`docs/runbooks/add-a-tuning-guide.md`](../../docs/runbooks/add-a-tuning-guide.md).

## Filename

`<guide-id>-<boat-id>.json`, lowercase, hyphen-separated — e.g.
`north-j70.json` is guide `north` for boat `j70`. Everything after the **last**
hyphen is the boat id, so a multi-word guide id (`class-crib-j70.json` →
`class-crib`) works. The boat id is the filter: `guidesFor('j70')` returns only
the J/70 guides, which is how a second class gets its own set without touching
the panel.

The guide id is also the key written into the local divergence log, so renaming
a file orphans that guide's history. Pick the id once.

## Committed guides

| File | Guide | Boat | Retrieved |
|------|-------|------|-----------|
| `north-j70.json` | North Sails | j70 | 2026-08-25 |
| `quantum-j70.json` | Quantum Sails | j70 | 2026-08-25 |

A third J/70 guide (Doyle, Ullman, or a class-association crib) is a **wanted,
empty slot** — see the runbook's "Failure modes" for the 2026-08-26 attempt
that could not source one. Nothing goes in here that was not read off a
published document.

## Schema

`schemaVersion` is `1`. Validated by `node scripts/provenance.mjs`, which runs
inside `make check`; a malformed file fails the build rather than rendering as
a blank column.

### Top level

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `schemaVersion` | `1` | yes | |
| `source` | object | yes | the provenance block, below |
| `base` | object | yes | base rig setup, mostly free text |
| `bands` | array | yes | wind bands, below. **May be empty** — see "Removing a guide" |
| `downwind` | object | no | `{ notes, controls }`, free text |
| `crew` | object | no | `{ recommendedKg, notes }` |
| `verbatimNotes` | string[] | no | short paraphrased technique notes, not reproduced prose |

### `source` — the provenance block

Every field is required and non-empty except `revision`, which must be present
but may be `""` when the document carries no revision marking.

| Field | Example | Notes |
|-------|---------|-------|
| `label` | `"North"` | short display name; this is what the UI columns and slider hints say |
| `id` | `"north-j70"` | the source id used in `PROVENANCE.md` |
| `title` | `"J/70 Tuning Guide"` | the document's own title |
| `url` | `"https://…/north-j70-tuningguide-EUR.pdf"` | where it was retrieved from |
| `retrieved` | `"2026-08-25"` | **`YYYY-MM-DD`, the date it was actually fetched** |
| `revision` | `"Rev. 1015"` | the document's revision marking, or `""` |
| `copyright` | `"North Sails"` | the rights holder, as printed |

### `base`

Free text describing the base setup, so a sailor can reproduce the zero point
the `bands` turns are counted from. `description` and `notes` are prose;
`uppers`, `lowers` and `gaugeType` are short strings (`"22 (PT-2)"`,
`"Loos PT-2"`) because guides publish gauge readings in their own dialect.
`rakeMm` and `forestayMm` are numbers or `null`.

### `bands`

Ordered by `twsMinKt` ascending, and **the last band must be open-ended**
(`twsMaxKt: null`). Gaps between bands are allowed — Quantum has one at 4–5 kt
— and resolve upward to the next band rather than inventing a value. Bands are
read half-open, `[twsMinKt, twsMaxKt)`.

| Field | Type | Unit | Notes |
|-------|------|------|-------|
| `label` | string | — | the guide's own band name, verbatim (`"12-16 kt"`) |
| `twsMinKt` | number | kt | true wind speed, lower bound |
| `twsMaxKt` | number \| null | kt | upper bound; `null` on the top band only |
| `uppersTurns` | number \| null | turns from base | signed; `null` if unpublished |
| `lowersTurns` | number \| null | turns from base | signed; `null` if unpublished |
| `uppersGauge` | number \| string \| null | gauge units | string where the guide prints words (`"Loose"`) |
| `lowersGauge` | number \| string \| null | gauge units | as above |
| `rakeMm` | number \| null | mm | `null` where the guide gives rake in words |
| `forestayMm` | number \| null | mm | as above |
| `race` | object | — | control settings, **values are strings or `null`, never numbers** |
| `targets` | object | — | `{ bsKt, heelDeg, leechTelltale }`, numbers/string or `null` |
| `notes` | string \| null | — | which chart in the source this row came from |

**Units are not converted.** A guide printing `54 1/2 in` of headstay stays in
inches, in a `notes` or `base` string; the app shows the guide's own unit next
to the model's, because a silent conversion is a number nobody published.

`race` keys the UI has labels for: `backstay`, `mainsheet`, `traveller`,
`cunningham`, `outhaul`, `vang`, `jibLead`, `jibSheet`, `inhauler`,
`jibHalyard`. Any other key renders under its raw name, so an unusual control
is not lost.

### `targets`

`bsKt` and `heelDeg` are the only two the disagreement panel deltas against the
model. Most guides publish neither; `null` is the normal answer and the panel
shows "—" rather than a gap it cannot compute.

## Removing a guide

Empty the `bands` array (keep the file and its `source` block). The panel then
says "not loaded" and names the file, calibration keeps whatever it fitted, and
nothing invents a substitute. Deleting the file outright also works — the glob
simply stops finding it — but leaves no trace of what used to be there.

## What never goes in these files

- Numbers nobody published. No interpolation, no "roughly", no memory of a
  regatta. If the document does not print it, the field is `null`.
- Reproduced prose. `verbatimNotes` are short paraphrases of technique; the
  guides' text is not copied (ADR 0008).
