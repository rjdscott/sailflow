# Race and Dock

Findings on the two solving screens. Race and Dock were the whole of ux-01, so
these are what survived that remediation or was raised by a lens ux-01 did not
run.

<a id="h-07"></a>

### H-07 — The optimum the ticks, targets and Apply sell is path-dependent, and the Why text claims otherwise

**Evidence.** `src/ui/race/optimum.svelte.ts:43-45` keys the search as
`JSON.stringify([condition, controls.dock])` — race sliders excluded — and `:75-76`
returns early when that key is unchanged (`const key = optimumKey(...); if (key
=== this.#key) return;`), so `optimalTrim` runs once per condition/rig, starting
from whatever trim happened to be on screen at that moment.
`src/ui/screens/Race.svelte:41-45` re-runs its `$effect` on every control change
and the store no-ops, with a comment saying exactly that.
`src/core/solve/optimalTrim.ts:15-20` states the result is "a local optimum on the
control grid, not a global one, and it is idempotent only when the descent stopped
on its own". That single result drives the ghost ticks
(`ControlPanel.svelte:60-63`), the `target …` line under every readout
(`Readouts.svelte:58,66,76`) and the Apply button (`Race.svelte:70-80`). Yet the
Why disclosure at `Race.svelte:191-195` reads "Apply optimum runs the same search
over every control the shape layer responds to, **from where your sliders are
now**" — false the moment any trim slider moves, because no re-search fires. The
`stale` flag is real but keyed only on condition/dock (`optimum.svelte.ts:78`,
cleared `:102`), so there is no staleness cue for trim drift.

Path dependence is empirical, not theoretical. Running `optimalTrim` at 12 kt,
TWA 42, jib, base dock, default calibration, from three starting trims:

| start | VMG | backstay | mainsheet | traveller | vang | outhaul | jibSheet | jibLead |
|-------|-----|----------|-----------|-----------|------|---------|----------|---------|
| base trim | 4.4383 | 20 | 75 | 5 | 40 | 50 | 60 | 8 |
| mistrimmed | 4.4225 | 35 | 75 | −5 | 50 | 55 | 55 | 3 |
| lightly off | 4.4382 | 20 | 70 | 30 | 35 | 50 | 60 | 7 |

Same condition, same rig: the traveller target spans −5 to +30, backstay 20 vs 35,
jibLead 3 vs 8, purely as a function of where the sliders were when the condition
last changed. All three descents terminated on their own inside the 20-sweep
budget, so this is not non-convergence. VMG differs by only 0.016 kt (0.36 %),
which sharpens the point rather than blunting it: the ticks prescribe *positions*,
and positions are what the study persona memorises, while the objective the
descent maximises is nearly flat across all three. No test covers it —
`src/core/solve/optimalTrim.test.ts` tests idempotence (`:55-58`) and determinism
(`:71-72`), never two different starting trims at one condition.

**Impact.** A week of study is calibrated against a number that silently depends
on the order the user touched things: same 12 kt, same committed rig, two
different answer keys depending on whether he trimmed before or after stepping the
wind. Drag mainsheet 30 % away and the tick still marks a stale local optimum with
no staleness cue, while the explainer states the opposite. This is the app's one
prescriptive output and its stated method is not its actual method — a direct hit
on the CLAUDE.md honesty rule.

**Fix.** Two parts, in order. (1) Honesty now: reword `Race.svelte:191-195` to
"from the trim on screen when the condition or rig last changed" and say it is a
local optimum, matching `OPTIMUM_REASON` (`optimum.svelte.ts:34-35`), which is
already honest. (2) Correctness: add a coarse trim component to `optimumKey`, or
store the trim the descent started from and grey the ticks as stale once live trim
drifts more than one step on any `TRIM_CONTROLS` member. `optimalTrim` stops after
one sweep when already near its optimum (`:88-90`), so the re-run is cheap in the
common case.

**Effort.** M.

**Lenses.** desktop-study.

<a id="m-09"></a>

### M-09 — Downwind, the target delta is signed backwards against the coach line on the same card

**Evidence.** `src/ui/race/Readouts.svelte:37-48` computes the delta as
`round(to - value)` and renders the literal sign; no point-of-sail argument
reaches it, and `Race.svelte:60-67` passes
`optimum.result.result.vmgKt.value` raw. Meanwhile
`src/ui/race/store.svelte.ts:62-69` `objectiveKt()` negates VMG when `vmgDown` so
"more is always better", and `#probe` (`:289-304`) builds the coach line and the
chevrons from it. The A/B is clean: `race-desktop-closehauled.jpg` (TWA 42°, jib)
shows VMG 4.12 with "target 4.14 **+0.02**"; `race-desktop-run.jpg` (TWA 149°,
gennaker) shows VMG −5.00 with "target −5.02 **−0.02**" — an identical 0.02 kt
shortfall, opposite sign. `race-desktop-run-applied.jpg` puts the contradiction
inside one card: BSP "target 5.9 +0.2" (behind = +) in the same row as VMG
"target −5.02 −0.14" (behind = −), above a coach line reading "+0.01 kt VMG".
This is a regression of a closed defect at a new site:
`docs/audits/2026-08-25-ux-01/todo.md:14` (H-05) fixed the inversion for the coach
line, and `:23` (M-09) then added the readout targets without picking up the
objective semantics.

**Impact.** One card carries two opposite sign conventions with no legend, on the
C-tier downwind surface where the beginner persona is least able to self-correct.
Bounded: nothing actionable derives from the delta — Apply, the chevrons and the
coach line all run through `objectiveKt` and stay correct — and both operands are
on screen, so the delta restates visible numbers rather than being the only source.
Observed magnitudes are 0.02–0.14 kt.

**Fix.** Pass `raceObjective(conditions.value)` into `Readouts` and sign the delta
with `objectiveKt` semantics — the delta is always "gap to target", positive means
the target is better than you. Alternatively render downwind VMG as a magnitude
labelled "VMG to leeward". Either way, one convention across coach line, chevrons
and readouts. There is no Readouts test at all, so the new downwind case belongs
beside `targetOf`, not in `race/store.test.ts` (whose `:292` already covers the
downwind objective).

**Effort.** S.

**Lenses.** desktop-study.

<a id="m-10"></a>

### M-10 — Vocabulary collides and no readout has an explainer

**Evidence.** `race-desktop-run.jpg` shows the conditions chip "Ripple" — one of
the sea states whose first option is literally "Flat"
(`src/ui/stores/conditions.svelte.ts:96`, `src/ui/dock/ForecastCard.svelte:17`,
and the Dock's Sea state control in `dock-desktop-provisional.jpg`) — while the
metrics band on the same screen reads "FLAT 0.98", the ORC depowering parameter
(`Readouts.svelte:85`, repeated at `PlanView.svelte:321`). Same word, two
unrelated meanings, both visible at once. In the same band, `Readouts.svelte:60`
labels TWA as "Height", so the Run preset renders "HEIGHT 149°". `src/ui/explain.ts`
carries explainers for the eighteen controls only; no readout — BSP, Height, VMG,
Heel, Leeway, AWA, Flat — has a `?` affordance or a definition anywhere in the
app, and the tier badges explain the tier, not the quantity
(`ConfidenceBadge.svelte:20`).

**Impact.** Persona 2 reads seven unexplained numbers and cannot tell which are
sailing quantities and which are model internals; "FLAT 0.98" is meaningless and
"Height 149°" is actively misleading. Persona 1 is fluent in twist and VMG but not
in ORC's `flat`, and "height" on a 149° run is wrong in their own vocabulary —
height is a pointing quantity upwind. The app spent real effort making every
number honest about its confidence and then left the numbers unnamed.

**Fix.** Rename the metric to "TWA" (or "Angle") since it is TWA at every point of
sail, and rename "Flat" to "Depower" or "ORC flat" to break the collision with the
sea state. Add a `?` on each readout label reusing the existing `Sheet` + `EXPLAIN`
pattern from `ControlPanel.svelte:38-41`, one sentence per quantity.

**Effort.** S.

**Lenses.** first-run.

<a id="m-11"></a>

### M-11 — Dock's hero number is a provisional value wearing an A badge

**Evidence.** `dock-desktop-provisional.jpg`: "EXPECTED REGRET / 0.4 s/mi (A)"
with the next line reading "Provisional — measured against five reference setups
so far, so it can only rise. Scoring 121 / 333…". The badge is rendered
unconditionally from `score.expectedRegretSPerMile.tier`
(`src/ui/dock/RegretCard.svelte:43-47`) while the provisional note at `:48-53` is
a separate branch, so the app's highest confidence tier sits on a number the same
card says is wrong and rising. The definition — "What you would give up per mile
of windward-leeward against a rig re-tuned for that wind. It is the price of
committing once, not a mistake." — renders after the ends row, the worst-case line
and the sparkline, roughly 250 px below the number it defines. The wait is a known
risk: `docs/plans/2026-08-25-ux-excellence/README.md`, Top risks 2, "Dock initial
scoring takes >10 s on the desktop dev build… Phone will be worse".

**Impact.** The first ten-plus seconds on the app's most distinctive screen show a
headline number that visibly climbs, badged A, above a hedge. A stranger reads
either "this is broken" or "0.4 s/mi, fine" followed by a silent jump to a much
worse figure. "Regret" is not standard sailing vocabulary and its one-sentence
definition is below the fold on a 390 px phone, so the number that sells the
C.9.5 mechanic arrives unexplained.

**Fix.** While provisional, suppress the hero value and show the progress plus the
definition sentence in its place, or downgrade the badge to the tier the partial
scoring actually supports and label it "provisional" in the badge itself. Hoist
the definition sentence directly under the section title so the word is defined
before it is used, and precompute or shrink the candidate grid so the first paint
is not a moving number.

**Effort.** S.

**Lenses.** first-run.

<a id="m-24"></a>

### M-24 — Race ignores the forecast band the rig was committed against

**Evidence.** `src/ui/stores/rigLock.svelte.ts:5-12` persists `forecast` alongside
`setup` in every lock and `dock.commit()` fills it
(`src/ui/dock/store.svelte.ts:167`). The only readers of `rigLock.locked` are
`Dock.svelte`, `dock/store.svelte.ts`, `CommitButton.svelte` and `Race.svelte:33`
— and Race takes `.setup` only, discarding the band.
`ConditionsStrip.svelte:11-12` lets TWS run 2–30 kt with no reference to it. Dock
computes and displays the cost at each end of the band
(`dock-desktop-provisional.jpg`: "8–16 kt likely 12", "at 8 kt 0.5 s/mi slower /
at 16 kt 5.0 s/mi slower", plus the per-TWS table) and Race then throws all of it
away.

**Impact.** The brief's premise is that the rig is a bet on a forecast range and
Race is where you live with the bet. Today you can commit for 8–16 kt, study Race
at 22 kt with the shrouds silently locked at a tune that was never scored for that
wind, and nothing on screen says so. The cross-screen story that separates
Sailflow from a trim simulator stops at the rig numbers.

**Fix.** Mark the committed band on the TWS control in the conditions strip and
show a one-line warning when `conditions.twsKt` falls outside
`rigLock.locked.forecast` ("rig committed for 8–16 kt — this is 22 kt"). Cheap
follow-on with the same data: a three-column strip solving the current trim at
min/likely/max of the band, which is the side-by-side compare a study session
needs and which the `optimum`/`race` stores can already answer.

**Effort.** M.

**Lenses.** desktop-study.

<a id="m-25"></a>

### M-25 — Nothing prints: no tuning card to take to the boat (opportunity)

**Evidence.** Grep of `src/` finds no `@media print` rule and no print view;
`src/app.css` styles screen layout only, and the shell renders a fixed nav rail
and sticky tab bar (`src/App.svelte:23-43`) that would land in any printout. The
committed setup exists only as one on-screen line, `describeSetup(lock.setup)` at
`src/ui/dock/CommitButton.svelte:31`, and export is JSON/CSV of past log entries
(`Log.svelte:262-266`). The reference this persona actually uses on the boat is a
printed sheet — the North J/70 tuning guide, which pairs each setting with a
picture (https://www.northsails.com/en-us/blogs/north-sails-blog/j70-tuning-guide).

**Impact.** The output of a week of study is a rig setup and a set of target trims
for a wind range, and there is no way to get it out of the browser and onto the
bulkhead. The scored dock bet across a forecast band — the differentiator — ends
as pixels the user photographs with a phone.

**Fix.** One `@media print` block hiding nav, chips and controls, plus a "Tuning
card" print layout for the committed setup: uppers/lowers/forestay, the forecast
band, per-TWS regret from the table already rendered at `Dock.svelte:94-124`, and
the current race trim with its targets. All the data is on screen; this is a
stylesheet plus one printable card, not a feature.

**Effort.** M.

**Lenses.** desktop-study.

<a id="m-26"></a>

### M-26 — Apply optimum rewrites up to eight sliders with no statement of what it changed

**Evidence.** `src/ui/screens/Race.svelte:89-99` lerps all eight `TRIM_CONTROLS`
to the solver's answer over 400 ms. `optimum.moved` — "controls the search
actually moved, in TRIM_CONTROLS order" — is computed by the solver
(`src/core/solve/optimalTrim.ts:163`), exposed by the store
(`src/ui/race/optimum.svelte.ts:317-320`) and used in exactly one place: the zero
case, "Already there — nothing the model would move." (`Race.svelte:178-180`).
After a non-empty apply the UI says nothing; `race-desktop-run-applied.jpg` shows
the post-apply card offering only "Back to my trim".

**Impact.** The teaching moment is which four controls moved and in which
direction — that is the lesson the student carries to the boat. Instead eight
sliders animate at once in a column that does not fit on one screen (six below the
fold at 1440 px), and the student must diff two remembered screenshots. Undo
exists, so the app already knows the before state.

**Fix.** After an apply, render `optimum.moved` as a short before → after list in
the insight card — the before state is already parked by `race.remember()`
(`store.svelte.ts:189-192`), so it is a map over `moved` with `CONTROLS[id]` for
label, unit and decimals. Keep it until the next condition change or undo.

**Effort.** S.

**Lenses.** desktop-study.
