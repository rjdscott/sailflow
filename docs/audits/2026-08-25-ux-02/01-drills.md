# Drills

Findings whose primary surface is the Drills screen and the learning loop, in
severity order. Four of the seven Highs in this audit are here.

<a id="h-01"></a>

### H-01 — The drill answer key is a hardcoded constant, so every per-control coaching line is fabricated

**Evidence.** `src/ui/drills/store.svelte.ts:99-113` requests
`{ type: 'optimal', dock, condition, optimiseTwa: false }` with no `race` field.
`src/core/solve/optimal.ts:58` therefore falls through to `baseRace()` and `:64`
returns `{ ...baseRaceCtl, backstay: backstayFromFlat(flat) }`, so ten of the
eleven answer-key controls are the fixed table at `src/core/shape/base.ts:27-41`
— traveller 0, mainsheet 60, cunningham 20, outhaul 50, vang 30, jibSheet 60,
jibLead 5, inhauler 30, halyards 50, header-tagged `prov: assumed`. Running the
solver over all ten drills returns byte-identical `opt.race` except `backstay`
(0/9/18): both `t1-flat-06-backstay` at 6 kt and `t1-20-survival` at 20 kt
return the same ten constants. `perControlDelta` (`src/lib/drills.ts:120-138`)
and `coachLine` (`:120-151`) are the learner's distance from that constant, and
`ScoreSheet.svelte:46-56` prints it as an imperative with no caveat — the only
caveat, `:38-43`, is the C-tier note about the loss figure.
`drills-desktop-scored.jpg` reproduces the arithmetic exactly: mainsheet 70 %,
traveller 40 %, "Less traveller (+ up to windward): 8 clicks.", ladder −8 / −2 =
(0−40)/5 and (60−70)/5 at the 5 % steps in `data/boats/j70.json`. The repo
already names this defect: `src/core/solve/optimalTrim.ts:4-11` — "a fabricated
answer key if you put it on eleven sliders (audit M-09)". Race was migrated to
`optimalTrim`; Drills was not, and `src/worker/solver.worker.ts:43-53` shows both
endpoints exist side by side. The key is also solved at `baseRace()` for the nine
controls each drill *locks*, so it is the optimum of a boat the learner is not
sailing. Nine of ten drills show a ladder; `t3-10-asym-angle` has `free: []` and
falls back to "No per-control answer key here" (`src/lib/drills.ts:145`), so
every drill that shows a ladder shows a fabricated one.

**Impact.** The imperative coach line and the per-control ladder are the most-used
teaching surface in the product, and they measure distance from an arbitrary
constant presented as the expert answer. On `t1-chop-08-twist` the drill's own
hint says "carry the boom back up with the car" while the score sheet in the same
viewport orders "Less traveller: 8 clicks" — the opposite move. On
`t1-20-survival` the hint reads "Maximum backstay, car well below centre" while
the sheet renders "Backstay −2 clicks" and coaches "Less mainsheet: 7 clicks".
Persona 1 spots the contradiction and stops trusting the app; persona 2 does not,
and learns the inverse of the drill's own lesson. It also breaches the CLAUDE.md
rule that no number ships without a `prov:` source, and re-opens on Drills the
M-09 defect ux-01 closed on Race.

**Fix.** Score against `optimalTrim` (`src/core/solve/optimalTrim.ts:102`), run
from `drill.start` with `controls.race` holding the drill's *locked* values, so
the key is a real optimum reachable from where the learner sits. The
`optimalTrim` worker request already exists (`solver.worker.ts:48-53`); add an
`only?: readonly TrimControl[]` option, pass `drill.free`, and drop the `optimal`
call from the drill store entirely. Note the ceiling: `mainHalyard`, `jibHalyard`
and `inhauler` are deliberately absent from `TRIM_CONTROLS`
(`optimalTrim.ts:62-70`) because the shape layer never reads them, so no key can
be produced for the three drills that list them free — see [H-03](#h-03). Until
the correct key lands, suppress the per-control ladder and the coach line on the
drill screen rather than displaying a constant as truth.

**Effort.** M.

**Lenses.** drills-pedagogy.

<a id="h-02"></a>

### H-02 — Scoring measures nothing: 8 of 10 drills award a medal for zero input, 2 of them Gold

**Evidence.** Running the shipped `scoreDrill` over each drill's committed,
untouched `start`: `t1-chop-08-twist` 0.63 % → **gold**, `t2-flat-14-depower`
0.68 % → **gold**, `t3-18-bow-down` 1.15 % → silver, `t1-flat-06` 3.02 %,
`t2-chop-16` 3.56 %, `t1-20-survival` 3.34 %, `t3-10-asym` 3.82 %,
`t3-12-halyards` 5.15 % → bronze, `t2-10-jib-lead-aft` 16.04 % and
`t3-09-inhauler` 17.93 % → none. Eight of ten hand out a medal before the learner
touches a control. Replacing the broken key ([H-01](#h-01)) with a free-restricted
coordinate descent from `start` does not rescue it: `t1-chop-08` 0.43, `t2-flat-14`
0.44, `t2-chop-16` 0.22 and `t3-12-halyards` 0.00 are all inside the gold band at
the start, i.e. four of nine upwind drills. `drills-desktop-open.jpg` shows
`t1-chop-08-twist` untouched (mainsheet 90 %, traveller 40 %, VMG 3.05 kt) with
Check live — `DrillView.svelte:160` gates it only on `!drills.result ||
drills.checking`, so one click on arrival wins Gold. `drills-desktop-scored.jpg`
then shows the contradiction on one card: "Gold / 0.2 % VMG lost" directly above
"Less traveller (+ up to windward): 8 clicks." with the ladder reading Traveller
−8, Mainsheet −2. `src/lib/drills.ts:91-101` scores one channel, `vmgKt`;
`perControlDelta` (`:120-138`) is computed and never scored
(`store.svelte.ts:104-110` uses `deltas` for the coach line only). The bands
themselves are finer than the model: gold ≤ 1 %, silver ≤ 3 %, bronze ≤ 6 %
(`drills.ts:74-78`, self-described "prov: assumed thresholds"), against a
held-out upwind VMG error of 1.6 % at TWS 8 in `validation/report.md`, whose gate
currently FAILs. And the loss figure is the one model output in the app with no
tier: `ScoreSheet.svelte:35` carries no `ConfidenceBadge`, while the Boat speed /
VMG / Heel readouts directly above it show A / A / B in
`drills-desktop-scored.jpg` and B / B / C in `drills-desktop-open.jpg`. Nothing
in the UI ever states what gold requires. Two calibrations: "no drill can ever be
failed" is false — two drills score no medal at start and a sweep of
`t1-chop-08-twist` reaches 71 % loss — and the "~1 % dynamic range" holds only for
the two gold-at-start drills, not for the 16–18 % jib-lead and inhauler drills.

**Impact.** The reward signal is decoupled from the skill each drill trains.
Deliberate practice needs a task the learner cannot already do; here the medal is
decided by the drill author's unverified guess, so the tier ladder is decorative
and there is no reason to attempt a drill twice. The beginner is told they are
expert at a skill they never exercised; the Yachtmaster reads 0.2 % against a
visible 8-click error, concludes the scorer is broken, and stops trusting the
honesty claim. A learner separated from gold by 0.9 % is inside the model's own
demonstrated error, so the grade is unfalsifiable. It also masks [H-03](#h-03):
an inert drill and a pre-solved drill look identical from outside.

**Fix.** Three parts, in order. (1) Validate the content: an authoring gate in
`src/lib/drills.test.ts` asserting that every drill's committed `start` is at
least a threshold worse than the true reachable optimum over `free` (>2× the gold
band), and that the optimum's own control state scores gold — run it in CI, and
re-author the failing starts along the controls the solver actually responds to.
(2) Score both channels: distance-to-optimum in control space *and* VMG loss,
both inside band for gold, against the corrected key from [H-01](#h-01) — gating
on today's constant would demand a trim the solver rates 12.9 % slow. Print both
numbers ("0.2 % VMG lost, 10 clicks off the optimum shape"), which is also the
honest statement about a flat optimum. (3) Widen the bands past the held-out
error at that TWS, badge the loss with the lower of the user and key `vmgKt.tier`,
and print the criterion inline ("Gold = within 1.6 % of the optimum · you: 0.2 %").
Tier C drills should show a rank, not a percentage.

**Effort.** M.

**Lenses.** drills-pedagogy, drills-engagement, first-run, strategy.

<a id="h-03"></a>

### H-03 — Two drills are unwinnable and three more teach a control the solver cannot feel

**Evidence.** Sweeping each free control across its full legal grid through
`trimmed()`: `t3-12-halyards-draft` (free = mainHalyard, jibHalyard, cunningham)
moves VMG by 0.00000 kt on all three — VMG pinned at 4.0191 kt for every legal
combination, so `scoreDrill` returns 5.1499 % / bronze and that is the only score
the drill can ever produce. `t3-10-asym-angle`: kiteSheet 0.00000, tackLine
0.00000, VMG pinned at −4.8137, frozen at 3.818 % / bronze. `t3-09-inhauler-pointing`
— the drill named after the inhauler — inhauler 0.00000 (though jibSheet spreads
0.765 kt and jibLead 0.150 kt, so the drill itself is playable; only its title
control is dead). Cunningham 0.00000 in both `t2-flat-14-depower` and
`t3-18-bow-down`. Vang's entire range in `t2-chop-16-vang-outhaul`, the drill
built to teach vang, is worth 0.00901 kt — 0.207 % of a 4.35 kt VMG. Root cause in
code, not just in a comment: `src/core/shape/flying.ts:112,146` fold the halyards
into `draftPos` and `:148` folds inhauler into `entryShift`, while
`src/core/shape/toOrc.ts` reads only meanDraft / meanTwist / reef —
draft position and entry angle are never read. `kiteSheet`/`tackLine` appear at
`src/core/types.ts:152-153` and nowhere else in `src/core`; `flying.ts:167`
confirms `DownControls` never reach the shape function. Cunningham is worse than
inert: at backstay 100 in `t3-18`, cunningham 0 and 95 both give 4.44820 kt while
cunningham 100 drops to 4.41220 (`toOrc.ts:72-76`, `maxed` → reef 0.95) — the one
state where it acts is a discontinuous penalty. The coach line actively prescribes
dead moves: on their start trims `t3-12` renders "Less cunningham: 8 clicks" and
`t3-09` "More inhauler: 6 clicks", each worth exactly zero. No mitigation in the
UI: `DrillView.svelte:114-125` renders `drill.free`/`freeDown` as plain sliders
with no sensitivity marker, and `drills-desktop-open.jpg` shows bare sliders with
nothing distinguishing a live control from a dead one. Phase 02 of the
ux-excellence plan suppressed optimum ticks for these controls on Race
(`phase-02:83,149`) and left the drill `free` lists untouched.

**Impact.** Two drills — one of them the only downwind drill — have no feedback
loop at all: no input maps to any output, so the medal is decided entirely by
controls the learner was told are locked. The learner grinds sliders, watches the
numbers stay frozen, and is then coached to make a move worth nothing. The
Yachtmaster reads a 0.00 kt response to full inhaul as the model being wrong about
the boat.

**Fix.** Gate the drill set on sensitivity in `drills.test.ts`: every entry in
`free`/`freeDown` must move VMG by more than the gold band across its range or it
may not be listed as free. Retire or rebuild `t3-12-halyards-draft` and
`t3-10-asym-angle` on responsive controls; drop cunningham and inhauler from
`free` everywhere until the shape layer reads them. Until then, say so in the
drill — a one-line "this control is drawing-only in the current model" beats a
silent dead slider.

**Effort.** M.

**Lenses.** drills-pedagogy.

<a id="h-04"></a>

### H-04 — The model's own optimum contradicts the tuning guide the drill exists to teach

**Evidence.** Free-controls-only grid descent through `trimmed()` from each
drill's own start: `t1-flat-06-backstay` — the brief says "the mast is bent enough
to flatten the main to nothing… Power the rig back up", start backstay 60, and the
descent optimum is backstay **80** / mainsheet 80, +1.36 % VMG over start, i.e.
*more* backstay in 6 kt flat water. `t1-20-survival` — the brief says "get the rig
flat" and the hint says "Maximum backstay, car well below centre", start backstay
30, and the descent optimum is backstay **15** / traveller −100 / mainsheet 90,
+2.98 %, i.e. *less* backstay in 20 kt. The shipped key is a third answer again:
`store.svelte.ts:100-105` requests `type: 'optimal'`, and `optimal.ts:58,66` holds
every control at `baseRace()` while moving only backstay-from-flat, so both drills
return the identical constant `{mainsheet:60, traveller:0, cunningham:20,
outhaul:50, vang:30, jibSheet:60, jibLead:5, inhauler:30, mainHalyard:50,
jibHalyard:50}` at 6 kt and at 20 kt. The clearest user-visible inversion is
`t1-20-survival`: hint "Maximum backstay" on screen while the score sheet renders
"Backstay −2 clicks" (30 → 18) and coaches "Less mainsheet: 7 clicks", with brief
and hint still mounted above the medal (`drills-desktop-scored.jpg`;
`ScoreSheet.svelte:46-57`). The disagreement is inside the noise the bands sit on:
a backstay sweep at the drill-1 start runs 2.9957 kt at b=20 to 2.9672 at b=100 —
0.95 % across the full range and 0.07 % across 0–80, against a gold band of ≤ 1 %.
`src/ui/disagree/Panel.svelte`, built for exactly this case, is used on Race and
nowhere in drills.

**Impact.** Drills are the one place the app speaks in imperatives. When the
imperative inverts published J/70 practice a learner who trusts it sails slower,
which is the failure mode the honesty rules exist to prevent, and the CLAUDE.md
rule "when the model and a tuning guide disagree, show both and the delta, never
resolve it silently" is broken by omission on the surface where it matters most.

**Fix.** Reuse `src/ui/disagree` in the score sheet: when the drill's answer key
diverges from the guide row for that condition, render both and the delta rather
than a single imperative. Cheaper interim: suppress the imperative for any control
whose full-range VMG spread is under the gold band, and say "the model cannot
separate these settings here."

**Effort.** M.

**Lenses.** drills-pedagogy.

<a id="m-02"></a>

### M-02 — The hint prints the answer before the attempt

**Evidence.** `src/ui/drills/DrillView.svelte:96-97` renders `<p class="brief">`
and `<p class="quiet">{drill.hint}</p>` unconditionally inside the Coach card —
no `{#if}`, no post-Check gate, no mode gate. Grep confirms `drill.hint` renders
in exactly one place, so all ten drills behave identically.
`drills-desktop-open.jpg` shows the untouched start with "Twist buys acceleration
out of the waves. Ease the sheet first, then carry the boom back up with the car."
on screen beside the two sliders and Check unpressed; `t1-chop-08-twist`'s free
controls are exactly `mainsheet` and `traveller`, so the hint names both moves and
their order. `t1-20-survival`'s hint, "Maximum backstay, car well below centre",
names a terminal value. The `<details><summary>` primitive the fix needs is
already in the file at `DrillView.svelte:142-143`, and the marker styling exists
(`src/app.css:60-88`, added by ux-01 H-04). Two bounds: hints give direction and
sequence, not magnitude — `docs/runbooks/add-a-drill.md:27` makes that a
deliberate constraint — and the hint is not the biggest answer leak on the screen,
since `DrillView.svelte:63-91` streams live VMG on every slider move, so a learner
can hill-climb to gold with the hint hidden.

**Evidence (benchmark).** chess.com gates the same information behind a cost —
"If you make your first correct move after using a hint, you won't earn any
progression points" — and reserves feedback for after the move
(https://support.chess.com/en/articles/8608686-how-do-puzzles-work-on-chess-com).
Lichess Puzzle Streak shows the solution only once the run ends
(https://lichess.org/streak).

**Impact.** The retrieval attempt is optional and free, so the learner recognises
rather than retrieves and nothing transfers to the boat. Compounded by
[H-02](#h-02): the answer is on screen and the medal is awarded anyway, so the
loop has no moment of effort at all. The cost lands mainly on persona 1; for
persona 2 an up-front directional hint is defensible scaffolding, so the goal is
to gate it, not delete it.

**Fix.** Wrap the hint in `<details><summary>Stuck? Show a hint</summary>`, closed
by default; leave `drill.brief` visible since it states the fault, not the fix.
Recording `hintUsed` and capping that attempt at silver means touching the
persisted schema (`BestScores` is `Record<string, number>`, `drills.ts:155-157`),
so do it with the v2 schema in [M-17](#m-17). The `<details>` gate alone is S.

**Effort.** S (schema half M).

**Lenses.** first-run, drills-engagement.

<a id="m-03"></a>

### M-03 — "Next drill" walks raw JSON order into the tiers the list hides

**Evidence.** `src/ui/drills/store.svelte.ts:35` `readonly list = DRILLS` is the
raw JSON array (`src/lib/drills.ts:62`, no sort or filter), and `:69-74` `next()`
is `this.list[(i + 1) % this.list.length]` with no mode or tier awareness —
`settings.mode` is never read in the drill store. `src/ui/screens/Drills.svelte:17`
restricts the rendered list to `[1, 2]` in Simple mode with the comment "the C-tier
downwind drill and the seven-control depower puzzles are noise until the basics
are automatic", and `settings.svelte.ts:40` defaults `mode` to `'simple'`, so this
is the default path. JSON order puts `t2-chop-16-vang-outhaul` at index 4 and
`t3-18-bow-down` (tier 3, seven free controls) at index 5, so one press of the
ScoreSheet's primary "Next drill" button (`ScoreSheet.svelte:59`, wired
`DrillView.svelte:105`) from the last Simple-visible drill lands there, and
`DrillView.svelte:114` renders all seven sliders regardless of mode.
`t3-10-asym-angle` is index 8, four presses away, not two. The list contradicts
the sequence in the other direction too: `drills-desktop-list.jpg` shows
"20 kt: survival upwind" (`t1-20-survival`) rendered third in the Tier 1 group
while sitting last in the array, so in Simple mode it is reachable via Next only
by traversing four hidden tier-3 drills. `DrillView`'s header (`:46-50`) shows
title and condition with no tier badge, so there is no signal the user has left
their tier; the wrap at index 9 → 0 is silent in Advanced mode too. Two
mitigations: the C-tier drill self-explains (`DrillView.svelte:54-59` and
`ScoreSheet.svelte:39-44` both render the "Tier C: direction of the effect only"
strip), and recovery is one tap on "← All drills" — which then does not contain
the drill just left.

**Impact.** The one progression control the product has leaks, on the end-of-drill
CTA. The beginner who chose Simple to avoid seven-slider puzzles is dropped into
one, then into the two inert drills of [H-03](#h-03), with no explanation of how
they got there. "Next" also does not mean next: the list's tier IA and the Next
sequence are two contradicting curricula over the same content.

**Fix.** Move the tier filter into the store as a `visible` getter (filter by
`settings.mode`, sort by tier then index) and have both `next()` and
`Drills.svelte` read it. At the end of the visible set, return to the list with
"Tier 1 and 2 complete — switch to Advanced for tier 3" rather than wrapping
silently into hidden content.

**Effort.** S.

**Lenses.** ia-navigation, drills-engagement, first-run, drills-pedagogy.

<a id="m-06"></a>

### M-06 — The coach line vanishes the instant the learner acts on it

**Evidence.** `src/ui/drills/store.svelte.ts:82` sets `this.score = undefined` at
the top of every `solve()`; `DrillView.svelte:27-31` calls `solve()` from an
`$effect` that deep-reads `drills.controls`; `DrillView.svelte:100` gates
`<ScoreSheet>` on `{#if drills.score}`; and `Slider.svelte:161` binds `oninput`,
per drag step rather than on release. So the first pixel of slider movement after
reading "Less traveller: 8 clicks" unmounts the medal, the loss figure, the coach
line and the per-control ladder. `src/app.css:255-270` makes `.screen` two columns
only from 720 px, so below that the ScoreSheet (`col-primary`) renders above the
Controls (`col-secondary`) and the correction is not co-visible with the slider on
a phone. Three claims do not survive: iterating from the corrected trim works
(only the explicitly-labelled "Try again" resets to `drill.start`,
`store.svelte.ts:60-67`; nudge-and-Check preserves it), the correction is not
unverifiable (the Live card, `DrillView.svelte:61-92`, stays mounted and re-solves
on every move), and Check reappears in the Controls card, not in the sheet's
position. The void-on-move is deliberate — the source comment reads "A score
belongs to the trim it was taken on; moving anything voids it" — and defensible
under the honesty rules.

**Impact.** The per-control ladder is a reference the learner must memorise before
acting on it, and on a phone it is not even on screen at the same time as the
control it names. That degrades the practice loop; it does not break it.

**Fix.** Keep the last score sheet mounted and mark it stale — dim it, swap the
medal for "re-check" — instead of unmounting, so the coach line and ladder stay
live while the learner works. Drop the "Keep my trim" half of the original
proposal; that path already works.

**Effort.** S.

**Lenses.** drills-pedagogy.

<a id="m-15"></a>

### M-15 — "Clicks" are 5 %-of-range slider steps, not purchase-derived boat instructions

**Evidence.** `src/lib/drills.ts:134` computes `steps: Math.round(delta /
spec.step)` and `ScoreSheet.svelte:23-27` renders it as "−8 clicks". `step` is 5
for every percentage control in `data/boats/j70.json`, so one "click" is 5 % of a
slider. That file also carries `purchaseMin`/`purchaseMax` for every control
(traveller 2:3, mainsheet 4:6, vang 8:8) and `docs/initial-prompt.md:108` asks for
"class-legal purchase-derived increments", but grep finds `purchase` read only by
`src/core/boat/validate.ts:78-81` — never by any UI or scoring path. On a real
J/70 "8 traveller clicks" names nothing measurable; the car runs on a continuous
track.

**Impact.** Transfer to the boat is the point of a trainer, and the only
instruction it hands the sailor is in a unit the boat does not have. It also ships
a number with no provenance, against the CLAUDE.md honesty rule. The Yachtmaster
cannot execute it dockside; the beginner invents a meaning for it.

**Fix.** Express deltas in units the boat has — shroud turns, jib-lead holes
(already correct), traveller in cm from centreline, sheet in purchase-derived
pulls from `purchaseMin`/`purchaseMax` — and fall back to "a touch / a lot" where
no honest unit exists. The same helper serves the Race coach line.

**Effort.** M.

**Lenses.** drills-pedagogy.

<a id="m-16"></a>

### M-16 — No target, no distance-to-goal, no ghost ticks: the learner trims blind until Check (opportunity)

**Evidence.** `drills-desktop-open.jpg` shows three bare readouts (4.11 kt /
3.05 kt / 5°) with no reference value, no starting VMG, no target and no
indication whether a move helped; `DrillView.svelte:63-92` renders `Readout` with
no delta and no ghost tick, and the drill screen never surfaces `MEDAL_BANDS`.
The lede (`Drills.svelte:20-23`) says only "the solver's optimum tells you what it
cost". The affordances exist one screen away and are not wired in:
`src/ui/components/Slider.svelte:32` documents a `target` prop, "Solver optimum,
drawn as a ghost marker above the trough", exposed to screen readers at `:168`,
and Race uses it plus an "Apply optimum" button (`Race.svelte:167-168, 217, 304`);
`DrillView.svelte:115-135` passes no `target`, and `ScoreSheet` offers only "Try
again" and "Next drill". `drills-desktop-scored.jpg` shows the result — "Traveller
−8 clicks, Mainsheet −2 clicks" as prose beside unmarked sliders, so the
correction must be arithmetic'd by hand from a percentage readout — even though
the score already carries the answer key (`store.svelte.ts:31`).

**Evidence (benchmark).** North U's Trim Simulator "Magic Wand… automatically
calculates optimum upwind boat trim… allowing users to compare their manual trim
adjustments against ideal configurations and see performance differences"
(https://www.northsails.com/sailing/en/2018/03/developing-tools-to-help-visualize-performance).
Virtual Regatta Inshore turns speed green when VMG is optimal and shows an
indicator when it is not
(https://vrinshore.zendesk.com/hc/en-us/articles/360012273900-The-game-interface).
chess.com's Daily Puzzle has the Coach react to moves, and Lichess shows the
solved line on failure
(https://support.chess.com/en/articles/8608686-how-do-puzzles-work-on-chess-com,
https://lichess.org/streak).

**Impact.** Feedback arrives once, at the end, in a sheet that then deletes itself
([M-06](#m-06)). Between opening and Check the learner has no signal, and the most
teachable moment in the loop — immediately after a wrong answer — delivers the
weakest feedback in the app. The two screens that should feel like one product
behave differently.

**Fix.** Show the goal on open ("you are 7.4 % off; gold is within 1.6 %") and a
live "vs start: +0.14 kt" delta beside VMG, so every move is legible without
giving away the key's slider positions. After Check, pass `target={{...score.optimum.race}}`
into each free-control `<Slider>` — one prop, rendering already exists — and add a
third ScoreSheet button, "Show the optimum", that applies the key and lets the
live solve re-run. Blocked on [H-01](#h-01): do not draw ticks from the current
constant.

**Effort.** M.

**Lenses.** drills-pedagogy, drills-engagement.

<a id="m-17"></a>

### M-17 — No attempt history, no spacing, no adaptive or generated drills (opportunity)

**Evidence.** `src/lib/drills.ts:157-172` persists `Record<drillId,
lowestLossPct>` under `sailflow.drills.v1` — no timestamp, no attempt count, no
session, no per-control record; `saveBest` (`:179-189`) keeps only the lowest
loss, so nothing tracks which drills were failed and nothing ever re-offers one.
`data/drills/j70-static.json` contains exactly ten drills, nine upwind jib and one
asym, all unlocked and all visible at once on one desktop screen
(`drills-desktop-list.jpg`), each running the same mechanic — wrong start, move
the free controls, hit Check (`Drill` at `src/lib/drills.ts:18-41`). The solver is
deterministic by contract, so each has one fixed answer that never changes.
`docs/research/2026-08-25-sailing-sim-landscape/03-innovation-candidates.md:14-17`
ranks "Trim puzzles with spaced repetition… failed ones resurface at 1/3/7 days"
as the **highest learning per minute** of all candidates, and decision-log row 2
defers it to Epic 2 — but the schema shipping now records nothing SR could later
be built from.

**Evidence (benchmark).** Lichess's puzzle dashboard breaks a player's rating down
by theme, shows the three strongest and three weakest, and lets you replay failed
puzzles and drill a weak theme (https://lichess.fandom.com/wiki/Puzzles, and the
per-attempt history behind https://lichess.org/training). chess.com's Custom
Puzzles let you "choose the themes and rating range" and show "success percentages
by theme"
(https://support.chess.com/en/articles/8608686-how-do-puzzles-work-on-chess-com).

**Impact.** Total content life is roughly one 20-minute sitting for either
persona. Ten static drills solved once teach recognition, not recall; without
spacing there is no retention, and without attempt history there is nothing to
space on. Every day this ships accumulates users whose practice history is
unrecoverable, so Epic 2's SR starts from zero. No diagnostic tells the Yachtmaster
which class of decision he is weak at, which is the reason a serious sailor would
return weekly.

**Fix.** Cheap half now: bump to `sailflow.drills.v2` storing
`{ perDrill: { id: { best, attempts, lastISO, lastMedal } }, days: string[] }` in
the same key, show attempts plus best on the card, resurface any drill whose last
attempt earned no medal at 1, 3 and 7 days, and put a "due today" row at the top
of the list. Then variety that costs data rows rather than solver work: keep the
ten as archetypes and derive variants from `seed = hash(archetypeId, dayIndex)`
jittering TWS ±3 kt, sea state and start offsets; tag each archetype with a theme
(`twist`, `depower`, `slot`, `luff-tension`, `downwind-angle`) and render a
per-theme strike rate — the Lichess dashboard in five rows.

**Effort.** M (generated variants L).

**Lenses.** drills-pedagogy, drills-engagement, strategy.

<a id="m-18"></a>

### M-18 — No streak, no daily challenge, no progress on the list, no celebration (opportunity)

**Evidence.** The only drill persistence is the flat best-loss map
(`src/lib/drills.ts:157-189`); a grep of `src/` for `localStorage` shows the only
stored timestamp anywhere is `rigLock.committedAt`
(`src/ui/stores/rigLock.svelte.ts:11-16`). The default route is Race, a goal-less
sandbox (`router.svelte.ts:9`), and Drills is fourth of five tabs
(`navItems.ts:13-19`), so the app never proposes anything to do today.
`drills-desktop-list.jpg` shows ten cards in three tier sections with no
completion count, no "x of 10", no medal summary, no distinction between attempted
and unattempted and no "start here" — while the data to do better (`drills.best`,
`medalFor`) is already imported at `Drills.svelte:32`. The personal best is stored
and never celebrated: `ScoreSheet.svelte` contains no reference to `best` at all,
so beating a record is presented identically to missing one, and on the list the
best figure exists only in a `title` tooltip (`DrillCard.svelte:37`), which has no
hover on a touch device. `phone-drills-log-more.jpg` shows the Drills column with
three cards carrying no medal, no score and no attempt marker.

**Evidence (benchmark).** Duolingo calls Streaks "the single most effective
retention lever in the product", reporting significant Day-1/7/14 retention lifts
with Day-7 the largest
(https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals/).
chess.com's Daily Puzzle "maintains a streak that resets if not completed within
48 hours of release", and Puzzle Rush shows "leaderboards and personal best
tracking displayed on your profile"
(https://support.chess.com/en/articles/8608686-how-do-puzzles-work-on-chess-com).
Brilliant pairs a daily challenge archive with "daily streaks and progress
tracking" (https://brilliant.org/daily-problems/archives/,
https://brilliant.org/help/using-brilliant/). Virtual Regatta Inshore fronts its
Academy with explicit training challenges before free play
(https://www.virtualregatta.com/en/inshore-game/).

**Impact.** The plan's success metric is "owner uses it before every J/70 regatta
day", and nothing in the product supports a repeated visit. With no multiplayer
until Epic 3, self-competition is the only competitive loop available and the app
throws away the one number it already has to run it. Neither persona can answer
"where am I up to?" or "what should I do now?" — the question a training product
must answer on every open. Because no date is ever written, the data needed to add
a streak later does not exist retroactively.

**Fix.** All local, no account, no backend, on the v2 schema from
[M-17](#m-17). Derive a "Drill of the day" deterministically from the date
(`DRILLS[hash(YYYY-MM-DD) % DRILLS.length]`) so it is the same for everyone
without a server; surface it as the first card on Drills and a one-line prompt on
Race; render a streak chip in the Drills TopBar with one day of forgiveness rather
than a hard reset. Add one derived line under the lede — "3 of 10 attempted ·
1 🥇 1 🥈" plus "Start here →" pointing at the lowest-tier unattempted drill — and
print the medal glyph and best figure on the card face instead of in a tooltip,
with a dimmed outline glyph for unattempted. Pass `best` into `ScoreSheet` for one
line under the medal ("New best — was 4.1 %"). State plainly on More that the
streak is device-local and lost if site data is cleared.

**Effort.** M.

**Lenses.** drills-engagement.
