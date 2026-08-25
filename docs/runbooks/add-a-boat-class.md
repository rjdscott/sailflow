# Add a boat class

## When to use

Adding a new one-design class alongside the J/70. **Read this first:**
Sailflow is scoped to the J/70 only (`docs/initial-prompt.md`), and the
boat definition is not pluggable yet — `data/boats/j70.json` is imported by
file path from seven places in `src/`. This runbook is "how to add the data
file and wire it in today", not "flip a config switch". Expect a real PR,
not a five-minute edit.

## Steps

1. Write `data/boats/<id>.json` to the `BoatDefinition` schema
   (`src/core/types.ts`). Copy `data/boats/j70.json` as the starting shape —
   it's the only worked example. Required top level: `schemaVersion: 1`,
   `id`, `name`, `hull`, `rig`, `sails` (`main`/`jib`/`asym`), `crew`,
   `controls` (one entry per control id, each `{ mode, min, max, step,
   purchaseMin?, purchaseMax? }`), `calibration` (may be empty), `provenance`
   (one entry per numeric leaf), `sources`.

2. Validate the file's shape before wiring anything to it. There's no CLI
   for this yet, so use a throwaway test — write it, run it, delete it,
   don't commit it:

   ```bash
   cat > src/core/boat/_adhoc.test.ts <<'EOF'
   import { describe, expect, it } from 'vitest';
   import { validateBoat } from './validate';
   import boat from '../../../data/boats/<id>.json';

   describe('adhoc', () => {
     it('validates', () => {
       expect(validateBoat(boat)).toEqual([]);
     });
   });
   EOF
   pnpm exec vitest run src/core/boat/_adhoc.test.ts
   rm src/core/boat/_adhoc.test.ts
   ```

   Fix every reported problem (`validateBoat` returns a string per issue,
   empty array means valid) before moving on — in particular, every numeric
   leaf needs a `provenance` row naming a `sources` entry, per this repo's
   honesty rules (`CLAUDE.md`).

3. Add a matching provenance/assumptions entry. `scripts/provenance.mjs`
   currently reads `data/boats/j70.json` by name (not a glob), so a second
   boat isn't picked up by `make docs-check`'s provenance regeneration
   without editing that script too — out of scope for a single new boat file
   unless you're also making the class switchable.

4. Point the app at the new boat. Every one of these imports
   `data/boats/j70.json` directly and needs the same treatment (add a class
   switch, or duplicate-and-diverge if this is a one-off fork rather than a
   real multi-class feature):

   ```bash
   grep -rn "boats/j70.json" src | grep -v test
   ```

   As of this writing that's `src/ui/race/RigElevation.svelte`,
   `src/ui/drills/DrillView.svelte`, `src/ui/race/store.svelte.ts`,
   `src/ui/race/ConditionsStrip.svelte`, `src/ui/drills/client.ts`,
   `src/ui/dock/logic.ts`, and `src/lib/drills.ts`. `data/drills/j70-templates.json`
   (`add-a-drill.md`) and the tuning tables in `data/tuning/*-j70.json`
   (loaded by `src/lib/reference.ts`) are also J/70-specific and would need
   class-scoped equivalents.

5. Re-run the full gate before opening a PR:

   ```bash
   make check
   ```

## Failure modes

- **`validateBoat` reports `provenance.<path>: no entry for <leaf>`** for a
  value you didn't intend to be user-facing (an internal constant): every
  numeric leaf outside `calibration`/`provenance`/`sources`/`schemaVersion`
  needs a row, no exceptions — that's the point of `checkProvenance` in
  `src/core/boat/validate.ts`. Add the row rather than special-casing the
  field.
- **App still shows J/70 numbers after adding the new file.** Expected —
  step 1 alone changes nothing at runtime. This isn't a bug in the new file;
  it's the seven hardcoded imports from step 4.
- **`make docs-check` doesn't mention the new boat's sources at all.**
  Expected per step 3 — `scripts/provenance.mjs` only reads `j70.json`.
  Extending it to more than one boat is real script work, not a data-file
  change.

## Last verified

- **Last verified:** 2026-08-25 against a55d993. `validateBoat` and the
  adhoc-test pattern in step 2 were run for real against the committed
  `j70.json` (passes with zero problems). The `grep` in step 4 was run
  against this branch and lists exactly seven non-test import sites. Adding
  an actual second boat class, and the multi-class wiring in steps 3–4, were
  not carried out — there is no second class to add yet.
