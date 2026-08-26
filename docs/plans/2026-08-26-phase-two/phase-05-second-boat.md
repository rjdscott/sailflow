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
- [ ] Boat picker (More screen), persisted; router carries `boat=` in share URLs (phase 02 schema).
- [ ] Second boat file with full provenance; polar from ORC if published, else the class association; drills templates optional.
- [ ] Calibration per boat: `pnpm calibrate --boat <id>`; residuals and golden corpus per boat.
- [ ] Runbook `docs/runbooks/add-a-boat-class.md` re-verified by actually following it.

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
