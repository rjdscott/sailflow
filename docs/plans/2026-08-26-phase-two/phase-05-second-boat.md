# Phase 05: Second boat class

- **Status:** 🟢 Completed

## Goal

A second one-design (J/24 or Melges 24 — pick by polar availability) sails
in the app from its own `data/boats/*.json`, and the J/70 golden corpus is
byte-identical before and after. The boat file is data; `src/core` names no
class.

## Tasks

- [x] Inventory: `grep -rl j70 src/core` (ten files at close-out) — for each, move the constant into `BoatDefinition` or justify it as class-independent with a `prov:` tag.
- [x] `validateBoat` covers every field the solver reads; a missing field is an error, not a silent default.
- [x] Boat picker (More screen), persisted; router carries `boat=` in share URLs (phase 02 schema).
- [x] Second boat file with full provenance; polar from ORC if published, else the class association; drills templates optional. — `data/boats/m24.json` (137 provenance rows: 45 published, 50 derived, 42 assumed) and `data/polar/orc-m24.json`; no drill templates sourced, and the screen says so ([ADR 0020](../../adr/0020-melges-24-is-the-second-class-blocked-on-the-ui-boat-switch.md))
- [x] Calibration per boat: `pnpm calibrate --boat <id>`; residuals and golden corpus per boat.
- [x] Runbook `docs/runbooks/add-a-boat-class.md` re-verified by actually following it.
- [x] **New, carried out of this phase:** repoint the thirteen UI components that still import `data/boats/j70.json` for control ranges and drawing dimensions.

## Verification

```bash
make check
pnpm golden --boat j70 && git diff --exit-code validation/golden
SAILFLOW_BOAT=m24 pnpm validate   # NOT `--boat`: vitest eats the flag, see the runbook
pnpm test:ui
```

## Artifacts

`data/boats/<second>.json`, `data/polar/<second>.json`, per-boat golden
directory, updated runbook.

## Progress log

### 2026-08-26 — `src/core` stops naming the J/70; the corpus does not move

Tasks 1 and 2 landed together, as one commit, because the J/70 golden corpus
is the only proof that task 1 changed no physics and it had to stay
byte-identical across it. It did: `boatHash 6272af4c`, `calibHash 12b5f6f6`,
all three files unchanged, `make check` 0, 1214 unit tests green.

**The two real couplings** were file imports, not constants. `shape/base.ts`
imported `data/boats/j70.json` for `baseRace`/`baseRaceDown`, and
`reference/polar.ts` imported `data/polar/orc-j70.json` at module scope. Both
now take the boat: `baseRace(boat)`, `polarTarget(boat, …)`. The polar rides
on the boat as `BoatDefinition.polar`, attached at load by the new
`src/lib/boat.ts` registry (and by `validation/compare.ts` for the harness) —
*not* committed into the boat file, so `data/polar/` keeps one file per source
with its own `PROVENANCE.md` section rather than a copy inlined per class.

**Everything else was a constant, and the split was 4 moved / 5 justified.**
Moved to per-boat `knob()`s (the house pattern — 76 knobs already work this
way, code default plus per-boat override): the spreader-stripe spacing and its
calibrated offset, the stall meter's centre and range, and the helm reference
moment. Each is a class fact — stripe spacing is what a class paints on its
spreaders, the helm moment scales with rudder area and displacement.

Justified class-independent with a `prov:` tag, not moved: the 50–70 % leech
stall band (generic mainsail-trim advice, nothing in it scales with the rig);
`PCT_POLAR_BAND` (a property of the Speed Guide's 2 kt column spacing);
`POLAR_MIN_TWS`/`POLAR_MAX_TWS` (6 and 20 are the first and last columns of
the Speed Guide *format*, printed the same for every class); the girth
stations at ¼/½/¾ of the luff (sail measurement rules, values off the boat
file); and the Newton seed table — a *starting point*, not an answer, and the
invariants suite already asserts the solve is seed-independent. If a future
class fails to converge from those seeds the fix is a `solve.seedBs*` knob,
not a second hard-coded table.

The 33 remaining `grep -rn "j70\|J/70" src/core` hits are now all `prov:`
comments naming where a number was read from, which is what the honesty rules
require. No code path reads a J/70 file or literal.

**Task 2 found a real gap rather than rubber-stamping one.** `baseRace` and
`baseRaceDown` — the datum every shape delta is measured against, and the trim
the sliders open on — were read by the solver and checked by nothing: a boat
missing `baseRace` hands `toOrc.ts` a set of `undefined`s and every delta comes
back `NaN`. `validateBoat` now checks both, and checks each value against its
own control's stops (a base trim outside the slider is a trim the user can
never return to). Also added: the sail girths `geometry/sailplan.ts`
integrates (it used to *throw*, which is a stack trace rather than an answer),
`rig.wire`, `rig.sweepDeg`, the spar outer dimensions, `hull.minDryWeightKg`
and `crew.minCount`. The J/70 file already carried all of them, so the corpus
did not move — the check was simply absent.

One thing the polar-on-the-boat design forced: `checkProvenance` was walking
into the attached polar and demanding a provenance row for each of its 182
printed cells. The polar carries its own `source` block and its own
`PROVENANCE.md` section, so it is skipped in the leaf walk and validated
separately instead (source URL present, TWS grid ascending, rows non-empty).

Deliberately *not* done here: `boatHash` still excludes the polar. That is
status quo, not a new hole — the polar was outside the hash entirely when it
was a module-scope import, and `validation/polar.test.ts` is what guards the
table itself.

### 2026-08-26 — per-boat harness, picker, share param, runbook

Three commits after the core refactor.

**Per-boat harness** (`1ea3daf`). `pnpm calibrate|golden|validate --boat <id>`,
defaulting to `j70` so every existing CI invocation is unchanged. The id is
read once at module load in `validation/compare.ts`, which resolves through the
same `src/lib/boat.ts` registry the app uses — the harness cannot gate a
different model from the one that ships. An unknown id is a hard error in the
harness (unlike in the app, where it falls back): a typo on a calibration run
would otherwise fit the J/70 and write the result under another class's name.
The golden corpus moved to `validation/golden/<boat>/` by `git mv`, and
`golden.test.ts` now replays every *registered* class rather than one
hard-coded directory — a second boat whose corpus nobody runs is a corpus that
rots. `loadPolar()` lost its filesystem read; the polar is already on the boat.

**Picker and share param** (`97cf238`). `sailflow.boat` in settings, validated
against the registry on read. More shows a picker only when more than one class
is committed — a one-option segmented control reads as broken — and otherwise
names the single class and points at this runbook. `boat=` is additive in
share v1 per ADR 0019: no version bump and no migration entry, because a link
that names no class means the default, which is exactly what every link written
before the field existed meant. An unknown class decodes to null so a crewmate
on an older build opens the link rather than a blank screen. `share.ts` stops
importing the J/70 and snaps a link's values to the stops of the boat *the link
names* — a J/24 jib lead runs to a different number of holes.

Switching class reloads rather than re-seeding live, marked `ponytail:`. Every
store reads its ranges and base trim from the boat once, at construction, so a
live swap would leave each holding the previous class's numbers under the new
class's name.

**Provenance and runbook** (`1474339`). `scripts/provenance.mjs` globs
`data/boats/*.json` and `data/polar/*.json` instead of naming the J/70 — the
bug the runbook warned about in its own failure modes, which would have let a
second boat's numbers land with no provenance rows and nothing to say so.
Output is byte-identical for one boat.

The runbook was re-verified by following it literally, not by re-reading it:
the step-2 adhoc `validateBoat` test was written, run (passes) and deleted;
`provenance.mjs --check` exits 0; `pnpm golden` reproduces the corpus
byte-identically; and `pnpm golden --boat nope` was run to confirm the error
text the new failure-modes section quotes. It now carries an explicit
**step 5 is not done** section rather than implying the app is multi-class.

### 2026-08-26 — second class chosen (Melges 24), not registered; ADR 0020

Sourcing both candidates turned the plan's "pick by polar availability" into a
three-way constraint that does not point one way. Recorded as
[ADR 0020](../../adr/0020-melges-24-is-the-second-class-blocked-on-the-ui-boat-switch.md)
rather than settled in this log, because it commits the app to a sail plan.

**Polars: both fetchable, and the better one belongs to the wrong boat.** ORC's
public certificate feed is open, unauthenticated and machine-readable
(`data.orc.org/public/WPub.dll?action=DownBoatRMS&RefNo=<ref>&ext=json`), and
returns a full VPP polar for either class. Two things it does not give: it
publishes allowances in seconds per mile rather than speeds (`3600/allowance`
is exact, but the allowance is the primary datum), and it does not tag which
sail each row uses — the sail-resolved Speed Guide is a paid per-boat product.
An ORC polar is also per-*certificate*, not per-class: across 29 J/24
certificates the polar varies by ≤ 1.8 %, across 40 Melges 24 certificates by
up to 11.4 %, driven by measured displacement spanning 821–1002 kg.

**The J/24 has the better polar and a sail the model cannot represent.** It
flies a symmetric spinnaker on a pole — its ORC record reads `Area_Sym: 35.34`,
`Area_Asym: null` — and `SailId`, `DownControls.sprit` and ADR 0017 all describe
a sprit-tacked asymmetric. A `sails.asym` block on a J/24 would not be an
approximation, it would describe a sail the boat does not carry, and it would
then be calibrated and reported to sailors. The Melges 24 flies an asymmetric on
a retracting bowsprit, which is the plan the model was built for, so it takes
the slot despite the worse polar. Uncertainty has a tier (ADR 0006); a wrong
sail does not.

**The six "missing" hull fields were a false blocker, and finding that out is
the useful part.** `validateBoat` requires `hull.lwlM`, `bwlM`, `keelAreaM2`,
`keelSpanM`, `kgM` and `gmM`. No class rule publishes them and the ORC public
certificate has no hydrostatics at all — all 284 keys of the J/24 record were
enumerated and there is no `LWL`, `BWL`, `VCG`, `GM` or keel-area field. The
trap to avoid: `IMSL` is ORC's VPP sailing length and `CDL` its Class Division
Length; neither is LWL, and substituting one would be an invented number
wearing a citation.

But the J/70's own file carries all six as `kind: "assumed"` with the method in
the note — `bwlM` = 0.85 × max beam, `keelSpanM` = 0.85 × draft, `kgM` = 0.35 ×
draft, `gmM` = 0.30 × beam — and the same is true of `rig.chainplateYM`,
`spreaderZM` and `sweepDeg`. So the schema's bar is met by convention, not by
publication, and a second class clears it the same way. That is what makes the
Melges 24 a data task with a known shape rather than an open question. Its 2017
rules in fact publish spreader height, spreader length, sweep offset and
chainplate transverse spacing, so three fields that are `assumed` on the J/70
would be `published` on it.

**What actually blocks registration is code, not data.** Thirteen UI components
still import `data/boats/j70.json` by path for control ranges and drawing
dimensions, so a registered second class would get correct physics and correct
share links but the J/70's slider stops and hull drawing — and because the
picker appears as soon as a second class exists, it would offer a boat whose
sliders lie. Most of those files are owned by other agents working this plan
concurrently (`dock/**`, `race/panels/**`, `three/**`,
`race/store.svelte.ts`), so repointing them is left as a new task on this phase
rather than raced through a shared tree.

**Nothing was committed under `data/boats/` or `data/polar/` for the second
class.** Registration is the last step, not the first (the rewritten runbook now
says so), and a boat file committed ahead of the UI work would sit unvalidated
by any gate that runs — `boat.test.ts` only validates *registered* classes, and
`golden.test.ts` only replays them. The sourcing is done and recorded in
ADR 0020; the transcription lands with the UI change it depends on.
- 2026-08-26 — Merged onto main after phases 04 and 06 (keep-both conflicts in `settings.svelte.ts` and `More.svelte`: boat id and tour flag coexist). Bundle +3378 B — registry + polar on the entry; baseline raised with attribution, to be re-measured when the thirteen UI import sites are repointed.

### 2026-08-26 — the cockpit takes the active boat; the Melges 24 sails

Two commits. The phase closes 🟢.

**The thirteen import sites, and why the fix is a const rather than a rune.**
Every one of `race/{store.svelte.ts,RigElevation.svelte,ConditionsStrip.svelte,
boat.ts}`, `race/panels/Helm.svelte`, `drills/DrillView.svelte`,
`dock/logic.ts`, `stores/conditions.svelte.ts`, `three/{conventions,hull,rig3d,
kite}.ts` and `lib/drills.ts` now reads `activeBoat` from `src/lib/boat.ts`.
`activeBoat` is a **const**, read once at module load from the same
`sailflow.boat` key the settings store writes — not a `$derived`. Switching
class reloads the page precisely because every store takes its ranges and base
trim at construction (the `ponytail:` note in `More.svelte`), so within one page
the active boat cannot change and a rune would only pretend otherwise. It reads
storage directly rather than through `settings`, because `settings` imports the
registry and the reverse edge would be a cycle whose evaluation order decides
whether the app boots.

Four things were more than a swap. Presets are snapped onto the active class's
own stops and crew range (`trim()`, `crewOf()`), the rule `share.ts` already
applies to a link — the preset numbers are J/70 guide readings and a jib lead
runs to a different number of holes on another boat. `gauges.ts:STRIPE_INCHES`
reads the per-boat `instruments.stripeIn*` knobs instead of mirroring the J/70
literal. `lib/drills.ts` enumerates `data/drills/*-templates.json` the way
`reference.ts` enumerates the guides, takes its polar off the boat, and names
the class when there is no polar to read a VMG angle from. And `guidesFor()`
defaults to the active class, so a class with no guide gets the honest empty
state. New `sailM()` narrows `SailDef`'s `number | string` girths once,
mirroring `core/geometry/sailplan.ts:mm`.

**The Melges 24 is data, and finding the data changed one of ADR 0020's
premises.** The ADR expected the 2017 rules, because the class association's own
Measurement & Inspection page links a CloudFront host that no longer resolves.
The **2026 edition** (effective 2026-01-30, Approved) is reachable through World
Sailing and is what `data/boats/m24.json` cites. It publishes more than the ADR
hoped: spreader height, length and sweep offset, chainplate spacing, mast lower
and upper point heights, forestay height, boom outer point and bowsprit limit,
plus the mainsail, jib and spinnaker dimension tables and the Appendix H
purchase ratios. Fifty of the 137 provenance rows are `derived` from those with
the arithmetic in the note (P = 9528 − 710; sweep = asin(0.245/0.820); the
chainplate is half the published transverse spacing), 45 are `published`, 42 are
`assumed` — the six hydrostatics by the J/70's documented estimators exactly as
the ADR sanctioned, the two unpublished mainsail girths by interpolation between
published ones (checked against the J/70, where the same method reads 2.6 % low
and 1.6 % high), the jib's girths by a straight-leech triangle off an LP derived
from the ORC rated area, and the crew-weight slider's lower stop, because the
class publishes **no crew weight limit at all**.

**Four things the ORC feed does not publish, each of which cost code.**

1. *Speeds.* It gives allowances in s/mile. `3600/allowance` is exact; the Beat
   and Run allowances are VMG made good, so boat speed is that over the cosine
   of the printed angle.
2. *A sail tag.* The fixed-angle rows do not say which sail the VPP chose. The
   tag in `orc-m24.json` is read off the sail plan — one headsail, one
   sprit-tacked kite, so 52/60/75° are the jib and 90° out is the kite — and the
   file's `notes` name the 90° row as the weakest call, which matters because it
   is one of the three angles the gate scores.
3. *Heel.* No heel column exists (all 284 keys enumerated). `PolarRow.heelDeg`
   is now `number | null`; calibration stage 3 skips itself and says so rather
   than fitting `crewArmMul` against a zero, and the report prints an em dash.
4. *A tuning guide.* `fit.ts` imported `north-j70.json` **by path**, so stage 4
   would have fitted the Melges 24's six rig and shape knobs to North's J/70
   shroud turns — the exact "resolve the disagreement silently" failure
   `CLAUDE.md` forbids, and a J/70 file the phase's own inventory missed because
   it greps `src/core`, not `calibration/`. The guide is now resolved by boat id
   and the stage skips when there is none.

**Verdict: 7 of 10 gated rows inside tolerance, and the misses are named.**
`SAILFLOW_BOAT=m24 pnpm validate` fails TWS 8 jib vmgUp (6.6 % against 3 %),
TWS 8 jib 60° (14.3 % against 5 %) and TWS 14 asym 90° (6.0 % against 5 %).
Nothing was tuned on those rows and no tolerance moved. Three known reasons, in
order of size: six rig and shape knobs are unfitted for want of a guide; the
polar is one certificate whose per-hull spread ADR 0020 measured at up to
11.4 %, wider than the 3 % the gate applies; and the 90° sail tag is a judgement.
The J/70 is unmoved throughout — `boatHash 6272af4c`, `calibHash 12b5f6f6`,
`validation/golden/j70/` byte-identical, `report.md` identical but for its
timestamp.

**Bundle: +9258 B, and one attempted saving reverted for being a broken
build.** Repointing the UI was +250 B (the boat JSON was already on the entry
via the registry); the second class is the other +9007 B, 9.6 KB gzip of boat
file plus 2.6 KB of polar. About 5.8 KB of the boat file is `provenance` and
`sources`, which nothing at runtime reads, so `boat.ts` was switched to named
JSON imports of the ten fields the app does read. The bundle dropped 12 KB,
`make check` stayed green — and the app rendered nothing. Vite stringifies a
JSON module above ~10 KB (`json.stringify: 'auto'`), a stringified module has
only a default export, and every named import had resolved to `undefined`. 42
of the 69 Playwright specs caught it; Vitest caught none of it, because its
transform does not stringify. Reverted, baseline raised to 111130 B with the
attribution, and both the runbook and `boat.ts` now carry the warning. Taking
that payload off the entry needs a per-class dynamic import or a sidecar file
for the prose, not a leaner import statement.

**Five runbook steps were wrong and are fixed** (`docs/runbooks/add-a-boat-class.md`,
re-verified by executing it rather than reading it). The worst:
`pnpm validate --boat <id>` never worked — vitest rejects the unknown option, so
the flag was dropped, the J/70 was gated instead, and `validation/report.md` was
overwritten with a run nobody asked for. It is `SAILFLOW_BOAT=<id> pnpm validate`
now, and the report is per class. Second worst: source ids are global across
`PROVENANCE.md`, so the M24's `class-rules-2026` and `orc-cert` were silently
swallowed by the J/70's rows and every Melges 24 citation resolved to the J/70's
rules PDF. Ids are namespaced and `scripts/provenance.mjs` throws on the
collision now.

**Not done, deliberately.** No tuning guide and no drill templates are committed
for the class — neither could be sourced without a paid product, both surfaces
say so in as many words, and `tests/ui/boat.spec.ts` asserts they do. The
`instruments.stripeIn*` knobs are unset for the M24, so its spreader gauge reads
the reference boat's 18/20/22 in spacing; `gauges.ts` documents the fallback.
The heel-target anchors in `gauges.ts` are still read off the North J/70 guide
for every class — they are a gauge band rather than a solved number, and moving
them per class needs a source this class does not have. Carried into phase 03's
guide backlog rather than guessed at here.
