# Add a boat class

## When to use

Adding a new one-design class alongside the J/70.

**Read this first.** The whole app is class-agnostic as of phase 05: `src/core`
names no class, the solver reads everything off the `BoatDefinition` it is
handed, the cockpit reads control ranges, base trims and drawing dimensions off
`activeBoat` from the registry, and calibration, the golden corpus and the
validation gate are all per boat. Adding a class is data plus one registry
entry.

Every step below was carried out for real on the Melges 24 (ADR 0020) on
2026-08-26, and the wrong ones were fixed rather than annotated.

**What a class needs before you start.** Two documents and one honest look:

- a **class rule** with the rig and sail dimensions, and
- a **certificate or polar** for the hull dimensions and a speed reference.

And the sail plan has to be one the model represents: main, jib and a
sprit-tacked asymmetric. A class with a symmetric spinnaker on a pole is out of
scope by ADR 0020 — modelling its kite as an `asym` would describe a sail the
boat does not carry.

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

**Source ids are global.** `PROVENANCE.md` has one Sources table for the whole
repo and `scripts/provenance.mjs` dedupes by id, so a second class reusing a
generic id like `class-rules-2026` or `orc-cert` does not get its own row — its
rows silently resolve to the *first* class's document. Namespace them:
`class-rules-m24-2026`, `orc-cert-m24`. Two classes that genuinely cite the same
paper share one id, and then the entries must be identical: the script now
throws on an id used for two different titles or URLs, which is how this was
found.

**What is unpublished for every one-design, and what to do about it.**
`hull.lwlM`, `bwlM`, `keelAreaM2`, `keelSpanM`, `kgM` and `gmM` are required and
no class rule publishes them. Do not substitute an ORC length for LWL as if it
were published — `IMSL` is the VPP sailing length and `CDL` the Class Division
Length, and neither is LWL (ADR 0020). Use the J/70 file's documented
estimators, `kind: "assumed"`, with the formula in the note:

| Field | Method |
|---|---|
| `bwlM` | 0.85 × max beam |
| `keelSpanM` | 0.85 × draft |
| `keelAreaM2` | `keelSpanM` × an assumed 0.45 m mean chord |
| `kgM` | 0.35 × draft |
| `gmM` | 0.30 × beam |
| `lwlM` | the certificate's sailing length, *as an assumption*, cross-checked against the J/70's own LWL/LOA ratio applied to this LOA |

`hull.rmMeasuredKgMPerDeg` is optional: omit it when the source has no righting
moment and `hydro/righting.ts` falls back to the assumed `gmM`.

**Two rules for reading a class-rule table**, both worth writing into the note:
a *sail* dimension printed as a maximum is what a one-design sail is built to,
so take the limit; a *rig or fitting* dimension printed as a tolerance band
(`4285 mm – 4305 mm`) is a manufacturing window, so take the midpoint and say
so.

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

**ORC's public certificate feed is open and machine-readable**, which is the
easiest polar to get and the one with the most caveats:

```bash
curl 'https://data.orc.org/public/WPub.dll?action=DownBoatRMS&RefNo=<ref>&ext=json'
```

Three things it does *not* give you, each of which belongs in the file's
`notes` rather than being papered over:

- **Speeds.** It publishes allowances in seconds per nautical mile.
  `bsKt = 3600 / allowance` is exact. `Beat` and `Run` are VMG made good, so
  their boat speed is that over `cos(BeatAngle)` / `cos(GybeAngle)`.
- **A sail tag.** The fixed-angle rows do not say which sail the VPP chose; the
  sail-resolved Speed Guide is a paid product. Assign the tag off the *boat's
  sail plan* (which angles the class's only kite can be carried at), write the
  rule into `notes`, and name the row you are least sure of — `validation/polar.test.ts`
  gates 60/90/120°, so a mis-tagged 90° row reads as a model failure.
- **Heel.** There is no heel column. Set `heelDeg: null` on every row; the
  schema allows it, calibration stage 3 skips itself and says so, and
  `validation/report.md` prints an em dash. **Never write `0`** — that is the
  fit chasing a boat sailing flat.

And an ORC polar is per *certificate*, not per class: name the boat, sail
number and issue date in `source.title`, because "the class's polar" is not a
well-formed phrase (ADR 0020 measured an 11.4 % spread across 40 Melges 24
certificates).

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
  j70: entry(j70, polarJ70 as PolarTable),
  j24: entry(j24, polarJ24 as unknown as PolarTable), // omit the polar if the class has none
};
```

**A class costs about 12 KB gzip on first load** — 9-10 KB of boat file and
2-3 KB of polar — and `scripts/bundle_check.mjs` will say so. Raise the
baseline with the attribution; that is what the file is for. Do **not** try to
trim it by importing only the fields the app reads: Vite stringifies a JSON
module over ~10 KB, a stringified module has only a default export, and every
named import silently resolves to `undefined`. It looks like a 12 KB saving and
it is the boat data going missing (2026-08-26; Vitest passed, 42 of 69
Playwright specs failed with an empty cockpit). If the payload ever has to come
off the entry, it is a per-class dynamic import or a sidecar file for the
`provenance` prose.

That is the only code change the solver, the harness, the boat picker, the
cockpit and the share link need. `src/lib/boat.test.ts` runs `validateBoat` over
every boat **file** under `data/boats/` and asserts the file count matches the
registry, so a class cannot reach the app without passing step 2, and a file
nobody registered fails too.

### 5. Check the class in the browser

Nothing to do here any more — the cockpit reads `activeBoat` from the registry
— but two minutes of looking is cheaper than a wrong slider in front of a
sailor. `tests/ui/boat.spec.ts` automates the four things worth checking, and
you should extend its class list rather than write a new spec:

```bash
pnpm test:ui
```

1. **More** offers the class in the Boat picker, and choosing it reloads.
2. Every slider carries *that class's* stops — the crew-weight slider is the
   quickest tell, since crew limits differ between classes.
3. A share link from that class carries `boat=<id>` and opens on the right
   class **in a fresh browser context** (a second page in the same context
   inherits `localStorage` and would pass on a link carrying nothing).
4. The disagreement panel and the drills screen say "no guide / no drills for
   this class" rather than showing a blank or, worse, another class's numbers.

The old contents of this step — thirteen components importing
`data/boats/j70.json` by path — landed on 2026-08-26. `grep -rn
"boats/j70.json" src --include='*.ts' --include='*.svelte' | grep -v '\.test\.'`
now returns only comments and `src/lib/boat.ts` itself.

### 6. Calibrate and gate the class

The default stays `j70`, so every existing CI invocation is unchanged. Note
the third line: **`validate` takes an environment variable, not the flag.**

```bash
pnpm calibrate --boat <id>       # ~5 min; writes the calibration block + calibration/residuals-<id>.json
pnpm golden --boat <id>          # writes validation/golden/<id>/*.json
SAILFLOW_BOAT=<id> pnpm validate # ADR 0012 hold-out gate + validation/report-<id>.md
```

`pnpm validate --boat <id>` does **not** work and never did: half of that
script is a `vitest run`, and vitest rejects an option it does not know
(`CACError: Unknown option --boat`). Before 2026-08-26 the flag was dropped
before it reached the harness and the J/70 was gated instead, overwriting
`validation/report.md` with a run nobody asked for. `validation/compare.ts` now
reads `SAILFLOW_BOAT` as well as the flag, and the report is written per class:
the default keeps `report.md` (the More screen loads that path), others get
`report-<id>.md`.

Then commit all three per-boat artefacts:
`calibration/residuals-<id>.json`, `validation/golden/<id>/` and
`validation/report-<id>.md`.

`golden.test.ts` replays every *registered* class, so the new corpus is gated
from the moment it exists, and a registered class with no corpus reports as
skipped rather than passing silently.

**Expect stages to skip, and read what they say.** Calibration is four stages
and the last two need sources a new class may not have:

| Stage | Needs | If it is missing |
|---|---|---|
| 1 hydro, 2 asym | the polar | `calibrate` refuses by name; the class sails on code defaults |
| 3 righting | a heel column in the polar | skipped, `hydro.crewArmMul` keeps its default |
| 4 rig + shape | a tuning guide under `data/tuning/*-<id>.json` | skipped, six rig/shape knobs keep their defaults |

A skip is not a failure, but it *is* a tier: `validation/report-<id>.md` lists
each one under "Honest weaknesses", and every dock-tune number on a class with
no guide is tier C. Do not point stage 4 at another class's guide to make it
run.

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
- **`pnpm validate --boat <id>` runs the J/70.** Not a typo on your part —
  vitest eats the flag. Use `SAILFLOW_BOAT=<id> pnpm validate` (step 6). The
  tell is the report header: `- **Boat:** \`j70\`` when you asked for another.
- **`source id "<id>" is used for two different documents`** from
  `scripts/provenance.mjs`. Source ids are global across `PROVENANCE.md`; give
  the new class's rules and certificate per-class ids (step 1).
- **`<id>: the shape layer does not respond to the backstay on the unfitted
  knob defaults`** from `pnpm calibrate`. Stage 4 was skipped for want of a
  guide *and* the code defaults leave the sail section pinned against a clamp
  on this rig, so no trim would move a number. This one is a real stop: source
  a tuning guide for the class. (A milder version — inside the tuned window but
  still responding — prints a note and continues, which is what the Melges 24
  does.)
- **`<id> has no committed reference polar`** from `pnpm calibrate`. Expected
  for a class with no published polar (step 3). Skip calibration; do not
  substitute another class's table.
- **The new class's sliders show J/70 stops.** No longer expected. Since
  2026-08-26 the cockpit reads `activeBoat`; if you see this, something new
  imported `data/boats/j70.json` by path. The grep in step 5 finds it.
- **Every row of the gate fails by 5-15 % on a class whose polar came from one
  ORC certificate.** Read the certificate's measured displacement before
  touching the model: ADR 0020 found an 11.4 % spread across Melges 24
  certificates. Re-fitting against a more representative certificate is a day;
  widening the ADR 0007 tolerance is forbidden.
- **`golden.test.ts` reports `recorded against boat <hash>, current is
  <hash>`.** A boat-file edit is not a recalibration. Review the intended
  change, then `pnpm golden --boat <id>` and commit the corpus.
- **`make docs-check` says `PROVENANCE.md is stale`.** Run
  `node scripts/provenance.mjs` and commit both generated files. (Before
  2026-08-26 the script named `j70.json` and a second boat was invisible to it
  entirely; that is fixed, so a stale file now means you simply have not run
  it.)

## Last verified

- **Last verified:** 2026-08-26 on `feat/melges-24`, by adding the Melges 24
  with it. Every step was executed, not re-read, and **five were wrong**:
  - step 6's `pnpm validate --boat <id>` never worked (vitest rejects the
    unknown option, the flag was dropped, and the J/70 was gated and its
    `report.md` overwritten). Fixed: `SAILFLOW_BOAT=<id>`, and the report is
    per class.
  - step 1 said nothing about source ids being global, so the M24's
    `class-rules-2026` and `orc-cert` were silently swallowed by the J/70's
    rows and every M24 citation pointed at the J/70's rules PDF. Fixed in the
    step, and `scripts/provenance.mjs` now throws on the collision.
  - step 3 assumed a polar has a heel column. ORC's public feed has none, and
    the schema required one. Fixed: `PolarRow.heelDeg` is nullable and
    calibration stage 3 skips.
  - step 6 did not say that stage 4 fits against a *tuning guide* — `fit.ts`
    imported `north-j70.json` by path, so calibrating any second class would
    have fitted its rig to the J/70's shroud turns. Fixed: the guide is
    resolved by boat id and the stage skips when there is none.
  - step 4 said nothing about what a class costs on first load, and the
    obvious trim (named JSON imports, so Rollup drops the provenance prose) is
    a trap that silently empties the boat. Both are written into the step now,
    and `boat.test.ts` validates the boat files rather than only the registry.
  - step 5 was the "NOT DONE" gap and is now done; it is a browser checklist
    plus `tests/ui/boat.spec.ts`.
  Commands run end to end: `validateBoat` clean on `m24.json`;
  `node scripts/provenance.mjs` regenerated both docs; `pnpm calibrate --boat
  m24` (303 s, stages 1-2 fitted, 3-4 skipped with reasons); `pnpm golden
  --boat m24`; `SAILFLOW_BOAT=m24 pnpm validate` (7/10 gated rows inside
  tolerance); `pnpm golden` reproduces the J/70 corpus byte-identically
  (`boatHash 6272af4c`); `pnpm test:ui` 69 green; `make check` exits 0.
- Earlier pass, 2026-08-26 against e9a0f7d: steps re-read against
  `data/boats/j70.json` after #56/#58/#75/#79 added `baseRace`, `baseRaceDown`
  and the ORC edition rows; commands unchanged.
- Earlier pass, 2026-08-25 against a55d993: `validateBoat` and the adhoc-test
  pattern were run for real against the committed `j70.json`. The step-4 grep
  listed exactly seven non-test import sites at that time.
