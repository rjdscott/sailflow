# Add a drill

## When to use

Adding a new drill template to the committed J/70 set
(`data/drills/j70-templates.json`), which `src/lib/drills.ts` loads as
`TEMPLATES` and `src/ui/drills/*` renders.

Schema v2 (ADR 0013): a drill is no longer a hand-written start. It is
`(template, seed)` — the template names a condition *range* and which controls
are knocked off a base trim and by how much, and `generateDrill` produces the
instance. Adding a template therefore means choosing controls the solver can
feel and fault sizes big enough that the model can tell the start is wrong.
Both are enforced by tests, so a template that fails them fails `make check`
rather than shipping a drill nobody can lose.

## Steps

1. Copy an existing entry in `data/drills/j70-templates.json` rather than
   writing one from scratch. Required fields (`DrillTemplate` in
   `src/lib/drills.ts`):

   | Field | Shape | Notes |
   |---|---|---|
   | `id` | string | unique, `t<tier>-<tws>-<focus>` convention, e.g. `t2-10-slot` |
   | `title` | string | shown in the drill list |
   | `tier` | `1 \| 2 \| 3` | difficulty. Simple mode shows tiers 1–2 only |
   | `brief` | string, >40 chars | expert register: what's wrong, not what to do |
   | `hint` | string, >20 chars | direction and sequence, never a magnitude. Gated behind `<details>` and recorded as `hintUsed` |
   | `objective` | `'vmg' \| 'speed'` | what "better" means. `vmg` for beats and runs, `speed` for a reach |
   | `conditions` | `{ twsKt: [min,max], twaDeg: [min,max] \| 'optimal', seaState: SeaState[], sailset, crewKg }` | `'optimal'` takes the VMG-optimal angle from `data/polar/orc-j70.json` at the sampled TWS — prefer it |
   | `dock` | `DockControls` | constant across seeds |
   | `base` | `RaceControls` | all eleven race controls: the trim the faults are applied to, and the value every locked control sits at |
   | `faults` | `{ control, steps: [min,max], sign? }[]` | how far off `base`, in whole control steps. `sign` forces the direction; omit it and the seed picks a side |
   | `free` | `TrimControl[]` | the controls the learner may move. Must contain every fault control |
   | `prov` | string | where `base` and the fault sizes came from |
   | `cTier` | `boolean` (optional) | set when the model can only give a direction here, not a magnitude |

2. **Only `TRIM_CONTROLS` may be fault or free controls** — backstay,
   mainsheet, traveller, vang, outhaul, cunningham, jibSheet, jibLead. The
   shape layer never reads the halyards, the inhauler or any gennaker control,
   so a drill built on them has no feedback loop (audit ux-02 H-03). The
   committed set also avoids `cunningham` and `vang`: both are worth well
   under the medal band in this model.

3. **Derive `base` from the model, not from a guess.** The base trim of every
   committed template is `optimalTrim`'s own answer at that condition and dock
   tune, so the drill's answer key is stable and the faults are the only
   error. Get it by running the solver at the mid-TWS of your range from any
   reasonable start, then rounding onto the control grid.

4. **Size the faults so the start is measurably wrong.** Every generated start
   must converge *and* lose at least `START_LOSS_MIN_PCT` (3 %) against its
   own answer key, or `generateDrillAsync` walks to the next seed;
   `drills.test.ts` fails the template if no seed in 1..8 clears it. In this
   model easing a sheet or dropping the car is expensive and over-flattening
   is cheap, so a fault list built only on backstay/vang/outhaul will not
   reach 3 % — check it rather than assuming.

5. Verify:

   ```bash
   pnpm exec vitest run src/lib/drills.test.ts
   pnpm check   # svelte-check picks up any type mismatch in the new entry
   make check
   ```

## Failure modes

- **`<id> has a costly, converged start within the seed budget` fails.** The
  faults are too small, or they are on controls the model cannot feel, or they
  push the boat somewhere the solver will not converge (a sheet at 0 in a
  breeze). Widen the fault range, swap in a control with authority
  (`jibSheet`, `mainsheet`, `traveller`, `jibLead`), or pull the extreme back.
- **`fault <c> is not free`.** Every fault control must appear in `free` — the
  learner cannot fix an error on a locked control.
- **`free <c>` not in `TRIM_CONTROLS`.** See step 2.
- **`unknown control <key>`** in the base/dock check: a typo'd control key, or
  a value taken from `data/tuning/*.json` (a different unit/range) instead of
  `data/boats/j70.json`'s `controls` block.
- **Drill never appears in the UI tier list.** `src/ui/drills/store.svelte.ts`
  groups by `tier`; confirm it is `1`, `2` or `3` (not a string), and that
  Simple mode is not hiding a tier-3 entry.
- **Old attempt history looks wrong after a rename.** History is keyed on
  `templateId`. Renaming an id orphans its attempts and its spacing schedule;
  keep ids stable once shipped.

## Last verified

- **Last verified:** 2026-08-25 on the drills-and-loop phase-01 branch. The
  nine committed templates were re-authored through this exact procedure —
  bases read off `optimalTrim`, faults sized against measured single-control
  cost surfaces — and `make check` is green with the validity gate running the
  real solver over every template.
