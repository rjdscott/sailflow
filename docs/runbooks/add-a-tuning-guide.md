# Add a tuning guide

## When to use

A new published tuning guide (another sailmaker, a class-association crib
sheet) should appear in the disagreement panel and the Dock recommendation, or
an existing guide has a newer revision. Adding one is a data file plus a
regenerated `PROVENANCE.md` — no code change. Why the numbers are committed at
all: [ADR 0008](../adr/0008-third-party-reference-data-committed-with-provenance.md).

## Steps

1. Get the document and confirm it is publicly published by its owner. Note the
   **exact URL you fetched it from** and **today's date** — both go in the file
   and neither is optional. If you cannot reach a published document, stop:
   nothing goes in `data/tuning/` that was not read off one.

2. Pick the ids. The filename is `<guide-id>-<boat-id>.json`, lowercase; the
   boat id is everything after the last hyphen and must match the boat
   (`j70` today). The guide id is also the key in the local divergence log, so
   it is chosen once and not renamed.

3. Copy the closest existing file as the shape and transcribe into it. Full
   field-by-field schema: [`data/tuning/README.md`](../../data/tuning/README.md).

   ```bash
   cp data/tuning/north-j70.json data/tuning/<guide-id>-j70.json
   ```

   Transcribe **settings only**, never the guide's prose. Every number comes
   off the document; anything it does not print is `null`, not a guess. Do not
   convert units — a guide that prints inches stays in inches, in a string.
   Bands are ordered by `twsMinKt` and the last one is open-ended
   (`"twsMaxKt": null`).

4. Validate the file and regenerate the provenance tables. The same command
   does both: schema first, then the write.

   ```bash
   node scripts/provenance.mjs
   ```

   Expected on success: `updated PROVENANCE.md` (or silence, if the tables
   already matched). Any schema problem prints `error: data/tuning/<file>: …`
   and exits 1 without writing.

5. Confirm the generated file is what will be committed, and that a second run
   is a no-op:

   ```bash
   git diff PROVENANCE.md
   node scripts/provenance.mjs && git diff --exit-code PROVENANCE.md
   ```

   The new guide must appear twice: a row in `## Sources` and a bullet in
   `## Reference tables`. `PROVENANCE.md` is generated below its
   `<!-- generated -->` marker — never hand-edit that half.

6. Run the gate. The disagreement panel picks the guide up from the glob in
   `src/lib/reference.ts`; there is nothing to wire.

   ```bash
   make check
   ```

7. Look at it. With more than two guides committed the panel and the Dock
   sliders grow a guide selector; with two or fewer every guide is a column.

   ```bash
   pnpm dev
   ```

   Open the Dock screen: the rig sliders quote the guide by its `source.label`
   and the panel shows the model's row first with a Δ against each guide.

## Failure modes

- **`error: data/tuning/<file>: name must be <guide-id>-<boat-id>.json,
  lowercase`** — an uppercase letter, an underscore, or no hyphen at all. The
  boat filter is the part after the last hyphen; without it the guide belongs
  to no boat and would never render.
- **`error: … source.retrieved must be YYYY-MM-DD (ADR 0008)`** — the retrieval
  date is the whole point of the provenance block. Use the date you actually
  fetched the document, not the document's own publication date.
- **`error: … the last band must be open-ended (twsMaxKt: null)`** — guides
  print a top band like "20+ kt"; leaving a finite upper bound there means
  every wind speed above it silently clamps to a band the guide never wrote.
- **`error: … bands must be ordered by twsMinKt ascending`** — usually a band
  pasted into the wrong place. Gaps between bands are fine (Quantum has one at
  4–5 kt); disorder is not.
- **New guide validates but no column appears in the panel.** Its `bands` array
  is empty, which is the documented "table removed" state, or the boat id in
  the filename does not match the boat being shown. `guidesFor('<boat-id>')`
  is the filter.
- **`make check` fails on `node scripts/provenance.mjs --check` after editing
  a guide.** The generated tables are stale — run `node scripts/provenance.mjs`
  (no flag) and commit the result. `--check` never writes.
- **2026-08-26, phase 03 (guides-as-data): no third guide could be sourced.**
  The plan called for adding a Doyle / Ullman / class-association J/70 guide.
  In that environment WebSearch was exhausted and every direct fetch failed:
  `doylesails.com` and `ullmansails.com` returned HTTP 403, the North Sails
  blog and UK Sailmakers tuning-guide URLs 404, `j70class.org` redirects to
  `ic37class.org`, and `j70ica.org`'s documents page lists class rules and
  equipment regulations but **no tuning guide**. The Quantum PDF fetched fine
  but came back as unreadable binary, so PDF transcription was not viable
  either. The schema, the enumeration and the empty slot shipped; no numbers
  were invented. Retry from a machine with working search, starting at the
  sailmakers' own one-design pages.

## Last verified

- **Last verified:** 2026-08-26 against the `feat/guides-as-data` branch
  (phase 03 of `docs/plans/2026-08-26-phase-two`). Steps 4–6 were run for real:
  `node scripts/provenance.mjs` was made to fail on a deliberately corrupted
  `north-j70.json` (missing `source.label`, string `twsMinKt`) and to pass and
  regenerate on the restored file; `node scripts/provenance.mjs && git diff
  --exit-code PROVENANCE.md` is clean; `make check` is green. Step 3 was
  **not** exercised on a real new guide — none could be sourced, see the
  2026-08-26 entry in Failure modes.
