# Add a drill

## When to use

Adding a new trim drill to the committed J/70 set
(`data/drills/j70-static.json`), which `src/lib/drills.ts` loads as
`DRILLS` and `src/ui/drills/*` renders.

## Steps

1. A drill is a condition plus a deliberately wrong starting setup, scored
   against the solver's optimum at the same condition and dock tune
   (`Drill` in `src/lib/drills.ts`). Copy an existing entry in
   `data/drills/j70-static.json` as a starting shape rather than writing one
   from scratch. Required fields:

   | Field | Shape | Notes |
   |---|---|---|
   | `id` | string | unique, `t<tier>-<condition>-<focus>` convention, e.g. `t1-chop-08-twist` |
   | `title` | string | shown in the drill list |
   | `tier` | `1 \| 2 \| 3` | difficulty |
   | `brief` | string, >40 chars | expert register: what's wrong, not what to do |
   | `condition` | `{ twsKt, twaDeg, seaState, crewKg, sailset }` | `sailset: 'jib'` (upwind) or `'asym'` (downwind) |
   | `dock` | `DockControls` | `upperTurns`, `lowerTurns`, `forestayMm` |
   | `start` | `RaceControls` | all eleven race controls, deliberately wrong |
   | `free` | `(keyof RaceControls)[]` | the controls the learner may move; everything else stays locked |
   | `hint` | string, >20 chars | one line, names the mechanism not the exact number |
   | `down` | `DownControls` (optional) | only for `sailset: 'asym'` drills — the solver needs gennaker controls to reach equilibrium |
   | `freeDown` | `(keyof DownControls)[]` (optional) | free gennaker controls; not individually scored |
   | `cTier` | `boolean` (optional) | set when the model can only give a direction here, not a magnitude (currently true for the one downwind drill) |

2. Every numeric value in `start`/`dock`/`down` must be inside the boat's
   control range and land on that control's step size
   (`data/boats/j70.json` → `controls.<id>.{min,max,step}`) — the test suite
   enforces this, so an off-step value fails `pnpm test`, not silently.

3. Keep `condition.twsKt` inside 6–20 kt: that's the band the model is
   calibrated over (`src/lib/drills.test.ts` asserts every drill is in
   range).

4. Update the count assertion — it's a literal, on purpose, so a drill can't
   be silently dropped from the set:

   ```ts
   // src/lib/drills.test.ts
   it('has ten drills with unique ids', () => {
     expect(DRILLS).toHaveLength(10);   // bump to 11, etc.
   ```

   If the new drill is the second `sailset: 'asym'` drill, also update
   `'covers all three tiers and includes exactly one C-tier downwind drill'`,
   which currently asserts there is exactly one.

5. Verify:

   ```bash
   pnpm exec vitest run src/lib/drills.test.ts
   pnpm check   # svelte-check picks up any type mismatch in the new entry
   ```

## Failure modes

- **`unknown control <key>`** from "starts every control inside the boat
  definition range and on a step": a typo'd control key, or a value taken
  from `data/tuning/*.json` (a different unit/range) instead of
  `data/boats/j70.json`'s `controls` block.
- **`off step`** on the same test: the value doesn't land on
  `min + n*step` for that control. Round to the nearest step rather than
  entering a raw guide number.
- **`expect(DRILLS).toHaveLength(10)` fails after adding a drill.** Expected
  — bump the literal in step 4. This test exists precisely so a JSON edit
  that adds or drops a row doesn't go unnoticed.
- **Drill never appears in the UI tier list.** `src/ui/screens/Drills.svelte`
  groups by `tier`; confirm `tier` is `1`, `2`, or `3` (not a string).

## Last verified

- **Last verified:** 2026-08-25 against a55d993. Field shapes were read from
  `src/lib/drills.ts` and cross-checked against all ten entries in
  `data/drills/j70-static.json`; the constraints in steps 2–3 are the actual
  assertions in `src/lib/drills.test.ts`, run via `pnpm test` (186 tests
  passing on this branch, drills suite included). No drill was actually
  added in this pass to exercise the full add-and-bump-the-count flow.
