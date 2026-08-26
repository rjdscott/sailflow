# Phase 05: Second boat class

- **Status:** 🟡 In progress

## Goal

A second one-design (J/24 or Melges 24 — pick by polar availability) sails
in the app from its own `data/boats/*.json`, and the J/70 golden corpus is
byte-identical before and after. The boat file is data; `src/core` names no
class.

## Tasks

- [x] Inventory: `grep -rl j70 src/core` (ten files at close-out) — for each, move the constant into `BoatDefinition` or justify it as class-independent with a `prov:` tag.
- [x] `validateBoat` covers every field the solver reads; a missing field is an error, not a silent default.
- [x] Boat picker (More screen), persisted; router carries `boat=` in share URLs (phase 02 schema).
- [ ] Second boat file with full provenance; polar from ORC if published, else the class association; drills templates optional. — **blocked on the UI task below**; class chosen and sourced ([ADR 0020](../../adr/0020-melges-24-is-the-second-class-blocked-on-the-ui-boat-switch.md))
- [x] Calibration per boat: `pnpm calibrate --boat <id>`; residuals and golden corpus per boat.
- [x] Runbook `docs/runbooks/add-a-boat-class.md` re-verified by actually following it.
- [ ] **New, carried out of this phase:** repoint the thirteen UI components that still import `data/boats/j70.json` for control ranges and drawing dimensions.

## Verification

```bash
make check
pnpm golden --boat j70 && git diff --exit-code validation/golden
pnpm validate --boat <second>
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
