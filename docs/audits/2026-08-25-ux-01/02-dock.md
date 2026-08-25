# Dock

Findings whose primary surface is the Dock screen, in severity order.

<a id="h-01"></a>

### H-01 — Hardcoded minus sign makes every regret render negative and inverts the ranking

**Evidence.** `src/ui/screens/Dock.svelte:89`
`<td>−{fmt(p.regretSPerMile, 1)} s/mi</td>` — a literal U+2212 prefixed to an
already-formatted magnitude. `src/ui/format.ts:16-19` `fmt()` is
`round(...).toFixed(decimals)` and never emits a sign of its own, so the minus is
unconditional. The underlying value is provably non-negative:
`src/core/solve/dock.ts:131`
`regretSPerMile: Math.max(0, (times[i][j] - best[j].t) * 3600)`, clamped at zero
at the source. `dock-desktop-scrolled.jpg`, "REGRET BY WIND SPEED": every row
carries the minus — −0.5, −0.4, −0.4, −0.4, −0.4, −0.3, −0.3, −0.3, −10.0 s/mi
across 8–16 kt. The identical quantity is rendered unsigned two cards up:
`src/ui/dock/RegretCard.svelte:40,45` `{fmt(score.atMin.regretSPerMile, 1)} s/mi
slower` and `:51` "Worst case …: … s/mi slower than a rig tuned for it". No
legend, caption or header establishes a negative-means-loss convention — the
`<th>` is a bare "Regret" (`Dock.svelte:82`) and the only hint (`:102`) explains
the Best-setup column. Nothing in `src/ui/dock/logic.ts` negates the value before
render, and no comment marks the `−` as deliberate.

**Impact.** "−10.0 s/mi" reads as ten seconds per mile *faster* — the committed
setup beating a rig tuned for that wind, which is impossible, and exactly
backwards for the one number the Dock exists to communicate. It also inverts the
sort: −10.0 is the numerically smallest value in the column, so a user scanning
for lowest regret reads 16 kt as this rig's best wind when `dock.ts:135` has it
as the worst. The adjacent Best-setup column legitimately uses `signed()`
(`Dock.svelte:91`, "+0.0 / −2.0 / 0 mm") and the Model-vs-Guides panel below
renders genuine signed deltas, so the table trains the reader that a sign here
means a real direction — the wrong prior for this column.

**Fix.** Delete the literal `−` at `Dock.svelte:89`:
`<td>{fmt(p.regretSPerMile, 1)} s/mi</td>`, and change the column header to
"Regret (s/mi slower)" so the convention is stated once and matches
`RegretCard`'s wording.

**Effort.** S

**Lenses.** advanced-desktop, workflow-honesty

<a id="h-03"></a>

### H-03 — Suggest shares one busy flag and one sequence counter with rescore

**Evidence.** `src/ui/dock/store.svelte.ts:20` declares a single `busy`; both
`send()` (`:47-60`, the debounced rescore) and `suggest()` (`:63-75`) set it and
share `this.seq` (`:48` and `:64`, both `++this.seq`).
`src/ui/screens/Dock.svelte:42-48` runs `rescore()` in an `$effect` that fires on
mount and on any forecast or setup change; `:66-71` passes `busy={dock.busy}` to
`<SuggestButton>`, whose label is `{busy ? 'Searching…' : 'Suggest a setup'}` and
which is `disabled={busy}` (`src/ui/dock/SuggestButton.svelte:23-24`).
`dock-desktop-loading.jpg`: a greyed "Searching…" button under SUGGESTED SETUPS
on first paint, alongside "EXPECTED REGRET / Scoring…", with no click having
occurred; `phone-race-dock-top.jpg` shows the same. The drop path:
`suggest()` checks `if (id !== this.seq) return` at `:68`, so a rescore landing
during an in-flight suggest leaves `this.suggestion` unassigned, and `:72` is
likewise seq-gated so `this.error` is never set either.

**Impact.** Two failures from one flag. The primary Dock action mislabels itself
and sits disabled on every load and every slider settle (during the solve, not
the 300 ms debounce window — `busy` is set inside `send()` after the timer
fires). And a user-initiated 36-candidate search is voided silently by any
concurrent forecast change: the button returns to "Suggest a setup", no list
appears, no error shows, and the user concludes the model has nothing to suggest.

**Fix.** Give suggest its own state: a `suggesting` flag driving the button's
label and `disabled`, and a separate `suggestSeq` so a concurrent rescore cannot
invalidate it. Keep `busy` for the RegretCard.

**Effort.** S

**Lenses.** advanced-desktop, beginner-phone

<a id="m-03"></a>

### M-03 — Phone commit bar is an unlabelled one-tap action that occludes content with no scrim

**Evidence.** `src/ui/screens/Dock.svelte:137-141` is a bare one-tap
`<button type="button" onclick={commit}>Commit for today</button>` — no arming,
no confirmation; `:201-208` make it `position: fixed; bottom: calc(56px +
var(--space-2) + env(safe-area-inset-bottom))` with an opaque
`background: var(--accent)` button (`:210-220`) and **no plate, hairline or
scrim** behind it. `:131` `class:hide-sm={!rigLock.lockedToday}` hides the
CommitButton card on phone until *after* commit, so its note "Locks the rig for
the day and starts a log entry" (`CommitButton.svelte:45`) never renders
pre-commit on a phone. Screenshots: `phone-race-dock-top.jpg` (right phone) — the
blue bar sits on the Model-vs-guides table immediately under the "Target BSP"
row, hiding the rows beneath; `phone-race-dock-mid.jpg` — its top edge crosses
the crew-weight stepper with the −/+ buttons chopped mid-control and
"Class limit 255–340 kg, minimum 3 crew." squeezed to a sliver;
`phone-race-dock-controls.jpg` — it overlaps the Rig card's lower edge. In a 4×
crop of `phone-race-dock-top.jpg` the card's outer border and the Panel grid's
vertical rules run past both button edges, and the ~8 px transparent stripe
between the button's rounded bottom and the tab bar shows card body sliding
through.

**Refuted, so do not fix these.** The bottom padding is already correct.
`src/App.svelte:42,66-77` makes `.tabbar-slot` `position: sticky; bottom: 0` as
the last flex child of `.shell`, so its 56 px is in flow at the document end;
total clearance below the last content pixel is
`Dock.svelte:194` 72 px + `App.svelte:58` `--space-8` 32 px + 56 px = 160 px
against a bar top at 44 + 8 + 56 = 108 px — ~52 px of slack.
`phone-race-dock-bottom.jpg` at max scroll confirms it: the page tail
("No published band for the forestay: the guides give rake in words.") is fully
legible with a clear gap above the bar. Raising `padding-block-end` would only
add dead space. Nor does commit create a log entry: `commit()` calls
`logStoreUi.setDraft()`, which is `this.draft = {...this.draft, ...partial}`
(`src/ui/log/store.svelte.ts:70-72`) — an in-memory `$state` draft that never
reaches IndexedDB or localStorage. The sole persisted write is one localStorage
key (`src/ui/stores/rigLock.svelte.ts:63-67`), and Undo appears in the same
screen region the moment it commits (`hide-sm` inverts at `Dock.svelte:131`).

**Impact.** The biggest, bluest, always-visible element on a beginner's first
Dock screen is a verb with zero stated consequence, and it guillotines live
numbers mid-line at intermediate scroll positions — including rows of the
comparison table the user is scrolling in order to decide what to commit. With no
plate it reads as a rendering fault rather than a deliberate overlay.

**Fix.** Two small changes, neither of them the padding. (1) Give `.commit-bar` a
`background: var(--bg)` plate with a top hairline and full-bleed inline insets so
the button sits on an opaque bar. (2) State the consequence with the bar: either
drop the `hide-sm` at `Dock.svelte:131` so the CommitButton card and its note
show pre-commit, or put the setup in the label ("Commit 0.0 / 0.0 / 0 mm for
today"). Keep it **one tap** — do not mirror the two-tap arming from
`CommitButton.svelte:17-24`; unlock is two-tap because unlock is the
class-rule-violating direction (C.9.5(a)), while commit is the happy path, and
symmetry here buys friction, not safety.

**Effort.** S

**Lenses.** beginner-phone, visual-design, a11y-interaction

<a id="m-05"></a>

### M-05 — Model-vs-guides prints "n/a" while solving and "These disagree." unconditionally

**Evidence.** `busy` is consumed exactly once, as `aria-busy={busy}`
(`src/ui/disagree/Panel.svelte:121`); the component has no visual busy branch.
Every Model cell falls back to the literal `'n/a'` when `modelOptimum` is null —
`Panel.svelte:153` (rendered twice via the `turnsRow` snippet, for Uppers and
Lowers), `:186` Rake, `:202` Target BSP, `:222` Target heel. The null window is
real: `Dock.svelte:107-113` passes `modelOptimum={model.optimum}` /
`busy={model.busy}`, and `disagree/store.svelte.ts:74-89` sets `optimum = null`
initially and `busy = true` on `request()`, then waits `DEBOUNCE_MS = 400`
(`:67`) plus two worker round trips. Separately,
`ModelOptimumStore.error` is set but never read: neither `Race.svelte:179-185`
nor `Dock.svelte:107-113` passes it and `Panel` has no `error` prop, so a throw
in `computeModelOptimum` leaves the table at n/a permanently with no message.
And `Panel.svelte:131-134` renders "These disagree. The model is calibrated to
North at 8–10 and 12–16 kt (marked); elsewhere the gap is information." as static
copy outside any `{#if}` on `modelOptimum` or on the computed deltas, with the
"calibrated here" chip (`:124-128`) driven only by `isCalibratedBand(twsKt)`.
Three of five rows are structurally empty regardless:
`data/tuning/north-j70.json` and `quantum-j70.json` carry `rakeMm: null`,
`targets.bsKt: null`, `targets.heelDeg: null` in every band.
`dock-desktop-loading.jpg`: the MODEL column reads n/a on all five rows, Rake /
Target BSP / Target heel read n/a across all three columns — 11 of 15 data cells
— under a lit "calibrated here" chip and the unconditional "These disagree";
`dock-desktop-scrolled.jpg` shows the same table populated (3.0 / −2.0 / 5.75 kt
/ 13°) once the solve lands. In-repo inconsistency, visible in the same
screenshot: `RegretCard.svelte:96` renders `{busy ? 'Scoring…' : 'No score yet.'}`
and `SuggestButton.svelte:24` `{busy ? 'Searching…' : 'Suggest a setup'}`.

**Impact.** The panel whose entire job is honest model-vs-guide reporting claims
a disagreement it has not computed, and states "no answer" for "still solving".
A silent failure is indistinguishable from a modelled result. The exposure is
narrower than it looks — `Dock.svelte:106` gates the panel behind
`{#if advanced}` and `settings.svelte.ts:40` defaults `mode` to `'simple'`, so
the beginner persona never renders it; and on subsequent forecast changes `#run`
never nulls `optimum` before the new solve lands (`store.svelte.ts:92-105`), so
the table holds the previous numbers instead of reverting to n/a. That
stale-shown-as-current behaviour is a separate, unfiled issue.

**Fix.** Match the pattern the two sibling cards already use: render
`busy && !optimum ? 'solving…' : 'n/a'` in the five Model cells
(`Panel.svelte:153, 186, 202, 222`); no skeleton shimmer needed. Add `error` to
`Panel`'s props and render it in `--bad`, passing `model.error` from
`Race.svelte:179` and `Dock.svelte:107`. Derive the headline sentence: "Comparing…"
while null, "These agree within half a turn." when every delta is inside the
noise threshold, the current copy otherwise; hold the "calibrated here" chip
until `modelOptimum` resolves. Drop or relocate the three permanently-null rows
(behind the existing race-notes `details`) so they stop consuming most of a
390 px scrollful.

**Effort.** S

**Lenses.** advanced-desktop, beginner-phone, visual-design, workflow-honesty

<a id="m-07"></a>

### M-07 — Applying a suggestion moves the "locked" sliders, leaving two rigs on one screen

**Evidence.** `src/ui/dock/store.svelte.ts:87-90`
`apply(setup) { this.setup = {...setup}; this.rescore(); }` — no
`rigLock.lockedToday` check. `src/ui/screens/Dock.svelte:66-71` renders
`SuggestButton` unconditionally with `onapply={(s) => dock.apply(s)}`, and
`src/ui/dock/SuggestButton.svelte:23,31` disables the search button on `busy`
while the `.pick` buttons carry no `disabled` at all. Contrast `Dock.svelte:126`,
which passes `locked={rigLock.lockedToday}` to RigSliders, where
`src/ui/components/Slider.svelte:108` `disabled={locked}` plus guards at `:42`
(`onInput`) and `:48` (`startPress`, the long-press numeric edit) mean the user
cannot drag or type the values back. `src/ui/dock/CommitButton.svelte:10,30`
reads `rigLock.locked`, so the Committed card keeps rendering
`describeSetup(lock.setup)` — the old rig — while the sliders and RegretCard show
the applied one.

**Impact.** Disabled controls change value from another affordance, so the
padlock reads as decoration — the wrong lesson in a rule-C.9.5 trainer — and the
screen shows two contradictory rigs with the only recovery being the two-tap
Unlock in `CommitButton.svelte:31`. Not destructive: `apply()` never writes
`rigLock` (`rigLock.commit` is only called from `store.svelte.ts:94` via the
Commit button, which is hidden while locked), the persisted lock and its
localStorage record are untouched, and nothing wrong reaches the log.

**Fix.** Guard once at the root — `apply(setup) { if (rigLock.lockedToday)
return; … }` in `DockStore` — and pass `disabled={locked}` to the `.pick` buttons
in `SuggestButton` so the block is visible before it is hit.

**Effort.** S

**Lenses.** a11y-interaction

<a id="m-14"></a>

### M-14 — Dock's columns are missing `.stack`, so its cards butt into one grey slab

**Evidence.** `src/ui/screens/Dock.svelte:59` `<div class="col-primary">` and
`:117` `<div class="col-secondary">` — no `stack` class, unlike
`src/ui/screens/Race.svelte:39` and `:127`, which use `class="col-primary stack"`.
`.stack` is the sole source of the 16 px card rhythm (`src/app.css:89-94`) and
`.card` carries no margin of its own (`src/app.css:98-103`).
`dock-desktop-loading.jpg`: Expected regret / Suggested setups / Model vs guides
read as one continuous ~700 px `--surface` panel crossed by arbitrary hairlines.
`phone-race-dock-top.jpg` makes the contrast direct — the Race phone on the left
has clean 16 px gaps between its cards, the Dock phone on the right has none.

**Impact.** `app.css:16` describes the card as "the only container", and Dock is
the one screen where it does not read as one. Grouping collapses: the regret
score, the suggester and the guide comparison look like one undifferentiated form
rather than three separate decisions.

**Fix.** Add `stack` to both class lists, `Dock.svelte:59` and `Dock.svelte:117`.

**Effort.** S

**Lenses.** visual-design

<a id="m-20"></a>

### M-20 — Shroud turns are issued with no picture of how to measure or apply them

**Evidence.** Benchmark: the North J/70 tuning guide pairs its numbers with
annotated photos and diagrams — an image captioned "Hold main halyard to bottom
of mast track to measure pre-bend", jib clew position relative to the cabin
house, spreader trim-mark placement, plus a companion "Video Tuning
Guide—providing a visual reference for setup, tuning, and trimming techniques"
(https://www.northsails.com/en-us/blogs/north-sails-blog/j70-tuning-guide).
Sailflow's Dock RIG card is three sliders and one line of text:
`src/ui/dock/RigSliders.svelte:47-70`, hint
`"{guideSource}: {signed(band.uppersTurns)} in {band.label}"`.
`dock-desktop-scrolled.jpg` and `phone-race-dock-controls.jpg` show it: "Upper
shroud turns (from base) · 0.0 turns · J/70 Tuning Guide: +4.0 in 12-16 kt" and
nothing visual. The Race screen gets three diagrams; the Dock screen —
`docs/initial-prompt.md:29`, "the mode nobody else has built and the most
valuable part of the app" — gets none.

**Impact.** A sailor new to the J/70 is told to add four turns from base with no
indication of what base is, where the turnbuckle marks are, or how prebend and
rake are measured. The number is unusable on an actual dock, which is precisely
the scenario in `docs/initial-prompt.md:104`. The most differentiated screen is
the least illustrated.

**Fix.** Add one own-drawn SVG to the Dock RIG card — side elevation with rake,
prebend and the spreader/turnbuckle datum labelled — reusing
`src/ui/race/RigElevation.svelte`'s geometry, so it costs a component rather than
a drawing system. Own artwork, so no third-party licence question.

**Effort.** M

**Lenses.** competitor-benchmark
