# Add a boat class

## When to use

Adding a new one-design class alongside the J/70.

**Read this first.** Phase 05 made the *physics* class-agnostic: `src/core`
names no class, the solver reads everything off the `BoatDefinition` it is
handed, and calibration, the golden corpus and the validation gate all take
`--boat <id>`. What is **not** done is the UI: thirteen components still import
`data/boats/j70.json` by path for control ranges and drawing dimensions
(step 5). So today this runbook gets you a validated, calibrated, gated boat
whose numbers are correct everywhere the solver reaches, and whose *sliders*
still carry the J/70's stops until step 5 lands.

Steps 1–4 and 6 are verified. Step 5 is the known gap and says so.

## Steps

### 1. Write the boat file

`data/boats/<id>.json`, to the `BoatDefinition` schema in `src/core/types.ts`.
Copy `data/boats/j70.json` as the starting shape — it is the worked example.

Required: `schemaVersion: 1`, `id`, `name`, `hull`, `rig`, `sails`
(`main`/`jib`/`asym`, each with its girths), `crew`, `controls` (one entry per
control id), `baseRace`, `baseRaceDown`, `calibration` (may be `{}`),
`provenance` (one entry per numeric leaf), `sources`.

**Never invent a dimension.** A number with no source is worse than a missing
class (ADR 0008). If a class rule does not publish a value, that value is
either derivable from ones it does publish — record it as `kind: "derived"`
with the method in the note — or the class is not ready to add. Every
`provenance` entry names a `sources` key, and every source carries a URL and a
retrieval date.

### 2. Validate it before wiring anything to it

`validateBoat` covers every field the solver reads, and a missing one is an
error rather than a silent default. Use a throwaway test — write it, run it,
delete it, do not commit it:

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

`validateBoat` returns one string per problem; an empty array means valid. Fix
every one before moving on.

### 3. Commit the reference polar, if the class has one

`data/polar/<source>-<id>.json`, same shape as `data/polar/orc-j70.json`:
`twsKt` ascending, `rows`, and a `source` block with `id`, `title`, `url`,
`retrieved`, and the VPP version and issue date where the source states them.

**A class with no published polar is a legal state**, not a blocked one. Leave
the polar out; `core/reference/polar.ts` then reports no target rather than
inventing one, `pctPolar` tiers down to C, and the ADR 0012 hold-out gate
simply has nothing to run. What you must not do is fit a polar from another
class or from memory.

`PROVENANCE.md` and `ASSUMPTIONS.md` pick the new files up automatically —
`scripts/provenance.mjs` globs `data/boats/*.json` and `data/polar/*.json`
rather than naming one file, so `make docs-check` sees the new class:

```bash
node scripts/provenance.mjs && git diff --stat PROVENANCE.md ASSUMPTIONS.md
```

### 4. Register the class

One entry in `BOATS` in `src/lib/boat.ts`:

```ts
import j24 from '../../data/boats/j24.json';
import polarJ24 from '../../data/polar/orc-j24.json';
// ...
const BOATS: Record<string, BoatDefinition> = {
  j70: withPolar(j70, polarJ70 as PolarTable),
  j24: withPolar(j24, polarJ24 as PolarTable), // omit the polar argument if the class has none
};
```

That is the only code change the solver, the harness, the boat picker and the
share link need. `src/lib/boat.test.ts` runs `validateBoat` over every
registered class, so the boat cannot reach the app without passing step 2.

### 5. Repoint the UI — NOT DONE, and the reason this runbook is not "add a file"

Thirteen components still read the J/70 directly for control ranges and
drawing dimensions. Until they take the active boat, a registered second class
gets correct physics and correct share links but **the J/70's slider stops and
the J/70's hull drawing**:

```bash
grep -rn "boats/j70.json" src --include='*.ts' --include='*.svelte' | grep -v '\.test\.'
```

As of 2026-08-26 that is `race/store.svelte.ts`, `race/RigElevation.svelte`,
`race/panels/Helm.svelte`, `race/ConditionsStrip.svelte`, `race/boat.ts`,
`drills/DrillView.svelte`, `dock/logic.ts`, `stores/conditions.svelte.ts`,
`three/{conventions,hull,rig3d,kite}.ts` and `lib/drills.ts`. Each wants
`boatFor(settings.boatId)` from `src/lib/boat.ts` in place of the import, and
the module-level constants in `race/boat.ts` and `lib/drills.ts` deferred
behind a function or `$derived` — they are computed at import time today.

`src/ui/share.ts` is the worked example of the change: it snaps a link's
values to the stops of the boat the link names.

**Do not register a class for users until this is done**, or the picker will
offer a boat whose sliders lie. Registering it behind a build that never shows
the picker (one entry in `BOATS`, `boatChoices()` still length 1) is fine and
is how the data lands first.

### 6. Calibrate and gate the class

Each takes `--boat`; the default stays `j70`, so every existing CI invocation
is unchanged.

```bash
pnpm calibrate --boat <id>   # ~3-4 min; writes the calibration block + calibration/residuals-<id>.json
pnpm golden --boat <id>      # writes validation/golden/<id>/*.json
pnpm validate --boat <id>    # ADR 0012 hold-out gate + validation/report.md
```

`golden.test.ts` replays every *registered* class, so the new corpus is gated
from the moment it exists, and a registered class with no corpus reports as
skipped rather than passing silently.

A class with no polar cannot run `calibrate` or `validate` — there is nothing
to fit against, and `fit.ts` says so by name rather than throwing a stack
trace. It sails on the reference boat's knob defaults, which
`ASSUMPTIONS.md` records as unfitted.

### 7. Run the gate

```bash
make check
```

## Failure modes

- **`validateBoat` reports `provenance: no entry for <leaf>`** for a value you
  did not intend to be user-facing. Every numeric leaf outside
  `calibration`/`provenance`/`sources`/`schemaVersion`/`polar` needs a row, no
  exceptions — that is the point of `checkProvenance`. Add the row rather than
  special-casing the field.
- **`baseRace.<control>: <n> is outside controls.<control> [min, max]`.** The
  base trim has to be reachable on the class's own sliders; a value outside
  them is a trim the user can never return to. Fix whichever of the two is
  wrong — usually the control range was copied from the J/70 and not updated.
- **`--boat <id>: unknown class`** from `calibrate`/`golden`/`validate`. The
  harness resolves through the registry and refuses an unregistered id on
  purpose: without that, a typo would fit the J/70 and write the result under
  another class's name. Do step 4 first.
- **`<id> has no committed reference polar`** from `pnpm calibrate`. Expected
  for a class with no published polar (step 3). Skip calibration; do not
  substitute another class's table.
- **The new class's sliders show J/70 stops.** Expected — step 5.
- **`golden.test.ts` reports `recorded against boat <hash>, current is
  <hash>`.** A boat-file edit is not a recalibration. Review the intended
  change, then `pnpm golden --boat <id>` and commit the corpus.
- **`make docs-check` says `PROVENANCE.md is stale`.** Run
  `node scripts/provenance.mjs` and commit both generated files. (Before
  2026-08-26 the script named `j70.json` and a second boat was invisible to it
  entirely; that is fixed, so a stale file now means you simply have not run
  it.)

## Last verified

- **Last verified:** 2026-08-26 against 97cf238, phase 05. Steps 1, 2, 3, 4, 6
  and 7 were re-read against the code as it now stands and the commands run:
  `validateBoat` passes on the committed `j70.json` via the step-2 adhoc test;
  `node scripts/provenance.mjs --check` exits 0 and now globs both data
  directories; `pnpm golden` writes `validation/golden/j70/` and reproduces the
  corpus byte-identically; `make check` exits 0. The step-4 registry snippet
  matches the real shape of `src/lib/boat.ts`. **Step 5 was not carried out and
  is written up as the open gap**, with the grep that enumerates it — the
  thirteen sites were counted from that grep on this branch. No second class is
  registered yet.
- Earlier pass, 2026-08-26 against e9a0f7d: steps re-read against
  `data/boats/j70.json` after #56/#58/#75/#79 added `baseRace`, `baseRaceDown`
  and the ORC edition rows; commands unchanged.
- Earlier pass, 2026-08-25 against a55d993: `validateBoat` and the adhoc-test
  pattern were run for real against the committed `j70.json`. The step-4 grep
  listed exactly seven non-test import sites at that time.
