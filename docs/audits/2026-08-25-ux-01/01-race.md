# Race

Findings whose primary surface is the Race screen, in severity order.

<a id="c-01"></a>

### C-01 — Dock commit never reaches Race; Race hardcodes 0/0/0 and claims it is committed

**Evidence.** `src/ui/race/store.svelte.ts:28` `BASE_DOCK = { upperTurns: 0,
lowerTurns: 0, forestayMm: 0 }` and `:94` `dock: { ...BASE_DOCK }` — the only
writer. `grep -rn rigLock src/` hits `src/ui/stores/rigLock.svelte.ts`,
`src/ui/screens/Dock.svelte`, `src/ui/dock/CommitButton.svelte`,
`src/ui/dock/store.svelte.ts` and the rigLock test, and nothing under
`src/ui/race/**` or `src/ui/screens/Race.svelte`. `src/ui/race/ControlPanel.svelte:121`
is the literal `<span class="locked-note">🔒 committed for the day</span>` with
no `{#if}`, and `:124` renders all three dock rows with a constant `{ locked: true }`.
The value is load-bearing physics, not decoration: `src/core/solve/trimmed.ts:31`
`rigState(boat, controls.dock, controls.race.backstay)`, and
`src/core/rig/state.ts:48-52,67,81-82` derive shroud tension, rake, forestay sag
and prebend from those three fields. Contrast `src/ui/screens/Dock.svelte:53,126,131,137`,
which all gate on `rigLock.lockedToday`, and `src/ui/drills/store.svelte.ts:80,103`,
which threads a real dock setup through. `src/ui/stores/rigLock.svelte.ts:2-3`
documents the missing behaviour: "Race mode reads this to lock its dock controls."
`docs/plans/2026-08-25-mvp-analyser/phase-05-dock-mode.md:14` ticks
"Lock indicator + unlock-with-warning in Race"; neither half shipped.
Screenshots: `phone-race-dock-bottom.jpg` — left phone (Race) shows
"DOCK SETUP · 🔒 committed for the day" with 0.0 turns / 0.0 turns / 0 mm on
hatched locked tracks, while the right phone (Dock) simultaneously shows a live
"Commit for today" button, i.e. nothing is committed;
`race-desktop-advanced-scrolled.jpg` — same card, with the adjacent rig elevation
reading "Rake 0 mm"; `race-desktop-simple-top.jpg` — the beginner sees the same
false lock in Simple mode.

**Impact.** Two defects, either sufficient alone. (a) On a fresh install nothing
has been committed, yet Race states in copy and iconography that it has, and
locks the three standing-rigging controls so rig exploration is impossible.
(b) After a real commit of, say, +3.0/−2.0, the committed setup never reaches
Race, so BSP, VMG, heel, leeway, sail sections, rig elevation and the coach line
are all solved for the base boat while the header labels them as the user's
committed rig. Two screens disagree about the same rig and nothing flags it —
directly against the honesty rule. The unlock affordance is Dock-only
(`CommitButton.svelte:17-32`), so a user who believes the Race header has no
path forward from that screen.

**Fix.** In `src/ui/race/store.svelte.ts`, follow the lock: derive
`rigLock.locked?.setup ?? BASE_DOCK` into `controls.dock`. Two constraints from
the code: `race` is a module-level singleton constructed at import
(`store.svelte.ts:183`), so the sync must be a `$effect`/derived in `Race.svelte`
or a getter on the store, not a constructor read; and **`controls.dock` must be
mutated in place** because `ControlPanel.svelte:13` aliases the proxy and binds
the sliders through it — replacing the object breaks the binding (the same trap
is already noted at `store.svelte.ts:123`). In `ControlPanel.svelte:118-126`,
render both the `locked` flag and the note from `rigLock.lockedToday`: locked +
"🔒 committed for the day" when true, otherwise live sliders and "not committed —
base rig" with a route to Dock.

**Effort.** M

**Lenses.** advanced-desktop, beginner-phone, a11y-interaction, workflow-honesty

<a id="h-02"></a>

### H-02 — Sticky desktop metrics band is an opaque overlay on the slider column

**Evidence.** `src/ui/screens/Race.svelte:258-262` `.metrics-dock { position:
sticky; top: var(--space-4); z-index: 2 }`, applied to the first flex child of
`.col-secondary.stack` (`Race.svelte:128`), whose later siblings are the insight
card, `<ControlPanel />` (`:173`) and the advanced panel. The band is opaque
twice over: `.card { background: var(--surface) }` (`src/app.css:98-103`) and
`.metrics { position: relative; overflow: hidden }`
(`src/ui/race/Readouts.svelte:84-90`). Nothing else on the screen is sticky
(no `position:` rule in `TopBar.svelte`, `ConditionsStrip.svelte` or
`ControlPanel.svelte`), so it pins at viewport top + 16 px over raw slider rows.
`race-desktop-advanced-scrolled.jpg`, cropped x 800–1300 / y 0–230: a slider
track with its gain glyph and "?" renders *above* the band at y≈10 — impossible
unless sticky is engaged, since ControlPanel precedes it in DOM order; the band
spans y≈20–138; directly beneath it at y≈143 a track and knob appear with no
label/value row and a "?" button bisected by the card edge; "Outhaul 60 %" at
y≈178 is the first intact row. Also `race-desktop-advanced-scrolled.jpg`: the
left column's last card ends at y≈435 while the control column runs to y≈860,
so the primary column dies ~400 px early and the boat scrolls away exactly when
the lower controls come into reach (`Race.svelte:100-124` has no sticky
treatment; `.hero-boat { min-height: 480px }` at `:239-243` for a ~330 px
drawing).

**Impact.** ~120 px of the control column — one and a half to two slider rows —
is unreadable and unclickable at every scroll offset past the top. Whichever row
lands there loses its label, its value, its chevron and half the "?" hit area,
and the covered half of the track does not take the click because the band is
the hit target at z-index 2. The sticky band was added so the user can watch VMG
while dragging; it eats the thing being dragged. Recoverable by scrolling, so no
control is permanently unreachable — but the two halves of the desktop persona's
core loop destroy each other.

**Fix.** Delete `position: sticky` / `top` / `z-index` from `Race.svelte:258-262`,
or hoist `.metrics-dock` out of `.col-secondary` into a full-width sticky band
above `.screen` (it can float over the non-interactive boat card) with matching
`padding-block-start` on `.col-secondary`. Do not compensate with top padding on
the control panel; that only moves the overlap down the page. Add
`scroll-margin-top` to the slider rows regardless, for the keyboard case where
focus-scroll strands a control under the band. While in this file, make the
`.lg-only.stack` picture column sticky instead so the boat stays put, and trim
`.hero-boat` `min-height` to the drawing.

**Effort.** M

**Lenses.** advanced-desktop, visual-design, workflow-honesty

<a id="h-05"></a>

### H-05 — Coach line carries no confidence tier, and its sign is inverted downwind

**Evidence.** `src/ui/screens/Race.svelte:151-161` renders `{race.coach.text}`
bare. `grep -rn ConfidenceBadge src/ui` returns 12 hits — ControlPanel, Readout,
`Readouts.svelte:52`, Slider, RegretCard, SuggestButton, Kit — and none in
`Race.svelte`. The coach number is model output: `#probe` subtracts two solver
`vmgKt.value`s, `bestProbe` picks the max, `coachSentence`
(`src/ui/explain.ts:78-82`) formats `+${gainKt.toFixed(2)} kt VMG`; the tier is
discarded before it can be rendered — `Probe` (`store.svelte.ts:39-43`) stores
only `vmgKt: number`. `race-desktop-advanced-top.jpg`: "Lead car forward one
hole: +0.02 kt VMG, top of the jib is falling open." sits directly under a
readout strip where BSP/VMG carry A and HEEL/LEEWAY carry B — the one number the
user is told to act on is the only unbadged one on screen. Wording is upwind-only:
`MOVES` (`explain.ts:58-75`) covers backstay/mainsheet/traveller/jibLead in
upwind language ("losing height", "leech is stalled", "choking the slot"), and
`PROBE_CONTROLS` (`store.svelte.ts:33-34`) is that same fixed four regardless of
`sailset`. The Downwind preset (`src/ui/stores/conditions.svelte.ts:79-80`) sets
TWA 145° / `sailset: 'asym'` and is reachable from Simple mode
(`ConditionsStrip.svelte:26-30`, no mode gate), while the C-tier downwind banner
is double-gated at `ControlPanel.svelte:101-116` behind `{#if advanced}` **and**
a checkbox. Sharper than the tier gap: `vmg = bsKt * cos(twaDeg)`
(`src/core/solve/trimmed.ts:42`), so at TWA 145° VMG is negative
(`solve.test.ts:94` asserts it), and `bestProbe` (`store.svelte.ts:56-66`)
maximises `p.vmgKt - baseVmgKt`. `dock.ts:95` negates for the downwind case and
`optimal.ts:69` flips sign; the race coach path does neither.

**Impact.** The app's most actionable number ships without the tier every passive
readout carries, against the project's own honesty rule. On the downwind preset
it is worse than untiered: the coach line and the ControlPanel chevrons (same
sign convention, `gradients()`, `store.svelte.ts:69-80`) select the nudge that
makes VMG *less negative* — the move that slows progress to the leeward mark —
and describe it in upwind vocabulary about a leech and a slot that are not what
is limiting the boat. This is a sign bug in UI-owned code, not a physics gap.

**Fix.** Carry the lower of the base and probed `vmgKt.tier` into `Coach` and
render a `ConfidenceBadge` beside the line at `Race.svelte:151-161`. For the
sign: negate the gain when `condition.sailset === 'asym'` (or `twaDeg > 90`)
before `bestProbe`/`gradients`. Simplest honest version, given there is no
downwind `MOVES` copy: suppress the coach line and the chevrons entirely when
`sailset === 'asym'`, and move the C-tier downwind banner out from behind
Advanced + checkbox so it shows whenever the kite is up.

**Effort.** M

**Lenses.** workflow-honesty

<a id="m-01"></a>

### M-01 — Conditions are editable only inside a modal; the TWA chip is inert

**Evidence.** `src/ui/race/ConditionsStrip.svelte:16-20` renders TWS, TWA, sea
state, crew weight and sailset as inert `<span class="chip">`; `:21` the only
control is `<button class="chip hit-44" onclick={() => (open = true)}>Edit</button>`;
`:24-83` all five inputs live inside `<Sheet>`. `src/ui/components/Sheet.svelte:18`
calls `dialogEl.showModal()`, `:42-45` is a 480 px bottom-anchored panel, `:50-52`
a 40 %-black backdrop, and `:29-35` has no close button — dismissal is Esc or a
backdrop tap. No desktop variant exists: ConditionsStrip has no `.lg-only`/
`.lg-hide` branch though `Race.svelte:39-124` uses that pattern three times and
`app.css:194-205` defines it. `PlanView.svelte` draws the TWA arrow and its
"TWA 42°" tag (`:185`) with no pointer, click or tabindex handler anywhere in
`race/*.svelte`. `race-desktop-simple-top.jpg` / `race-desktop-advanced-top.jpg`
/ `phone-race-dock-top.jpg`: the chip row "10 kt · 42° TWA · Ripple · 300 kg ·
Jib · Edit" is the entire conditions surface, at 1440 px and at 390 px.

**Impact.** `showModal()` makes the page inert, so a trim control and a condition
can never be touched in the same interaction — the desktop persona's core study
question ("how does this trim behave from 8 to 16 kt") becomes open, drag, close,
look, repeat. The solve does update live behind the 40 % scrim, so the sweep is
watchable, just dimmed with the lower half of the boat occluded; the friction is
real, the blackout claim is not. On the phone the beginner has no cue that the
boat picture and the "42° TWA" chip are not the controls they look like, and
there is no other route to the number.

**Fix.** *Owner decision:* replace the raw TWA slider with point-of-sail chips —
close-hauled / close reach / beam reach / broad reach / run — as the primary
angle control, so the number stops being the interface. Alongside that, render
the conditions controls inline on `lg` (a compact TWS/TWA pair in the secondary
column or beside the metrics band) using the existing `.lg-only`/`.lg-hide`
plumbing, and keep the Sheet for `sm` with a "Done" button added at
`Sheet.svelte:29-35`. The sub-claim that the read-only chips borrow the button
affordance is dropped: `app.css:171-176` gives `button.chip` a different border,
text colour, background and cursor, and both screenshots show Edit as a
blue-outlined blue-text pill against grey-outlined dark pills.

**Effort.** M

**Lenses.** advanced-desktop, workflow-honesty

<a id="m-02"></a>

### M-02 — Gain chevrons paint direction as valence, colouring the recommended move as a fault

**Evidence.** `src/ui/race/store.svelte.ts:71-82` `gradients()` writes
`out[p.control]` only when `gainKt > eps`, so every chevron that renders is by
construction a VMG *gain*; the magnitude is computed at `:75` and discarded, only
the `Dir` sign survives. `src/ui/race/ControlPanel.svelte:66-74` renders `▲` when
`race.chevrons[id] > 0` else `▼`; `:169-176` sets `.chev { color: var(--bad) }`
with `--good` only under `.up`. `tokens.css:23-27` `--bad: #b42318`,
`--good: #1b8a3a`, same inversion in dark mode (`:66-70`, `:82-86`), and
`tokens.css:8` states good/warn/bad are "meaning only, never decoration" — here
`--bad` encodes direction. `race-desktop-advanced-top.jpg`: the insight card
reads "Lead car forward one hole: +0.02 kt VMG, top of the jib is falling open"
and the "Jib lead car position" row directly below carries a red ▼, as does
"Backstay"; cross-checked against `explain.ts` `MOVES.jibLead.down.verb =
'Lead car forward one hole'`, so the red ▼ marks the exact move the coach is
recommending. `ControlPanel.svelte:68-73` gives both directions the same
`aria-label="gain from moving this control"` on a `<span>` — ARIA prohibits
naming a generic role, so AT drops it — and there is no `title` and no legend
anywhere (`grep` for chev/▲/▼ across `src/ui` returns only `store.svelte.ts`,
`ControlPanel.svelte`, `store.test.ts`).

**Impact.** Two states with identical meaning get opposite semantic colours, on a
screen whose own token file forbids exactly that. Nobody is steered to the
opposite adjustment — the glyph is correct and the plain-English instruction sits
six rows above — but the colour says "this setting is bad" about the app's own
recommendation, and neither hover nor screen reader recovers the direction or the
magnitude. Advanced-mode only (`ControlPanel.svelte:94` passes
`chevron: advanced`), so the phone-beginner persona never sees it.

**Fix.** Drop the `.chev.up` colour split — one colour for both glyphs, `--accent`
being the honest choice since neither state is a warning. Thread the gain out of
`gradients()` instead of discarding it, give the chevron `role="img"` and a
directional label ("more backstay gains VMG" / "less backstay gains VMG"), or
fold the direction into the slider's `aria-describedby`. Note the signature
change: `store.test.ts:155` asserts `store.chevrons` equals
`{ mainsheet: -1, traveller: 1 }` and needs updating with it.

**Effort.** S

**Lenses.** advanced-desktop, visual-design, a11y-interaction, workflow-honesty

<a id="m-04"></a>

### M-04 — On a phone the coach line sits a full screen below the fold

**Evidence.** `src/ui/screens/Race.svelte:39-125` is `.col-primary` (hero
Readouts at `:41-45`, the tabbed Sections/Rig/Plan card at `:47-98`); the insight
card carrying the coach sentence is `:139-171`, inside `.col-secondary` (`:127`).
`src/app.css:209` is the `@media (min-width: 720px)` two-column rule, so below
720 px `.screen` is single-column and `.col-secondary` renders after
`.col-primary`. `.lg-only .metrics-dock` is `display: none` below 1024 px
(`app.css:193-197`), so nothing from the secondary column pads the gap.
`phone-race-dock-top.jpg` (left phone): chips, BSP/HEIGHT/VMG/HEEL/LEEWAY/AWA/
FLAT, and the Sections tab's MAIN/JIB bezier drawing — no advice.
`phone-race-dock-mid.jpg` (left phone): "Lead car forward one hole: +0.02 kt
VMG, top of the jib is falling open." appears at y≈250 of the second frame,
after the six-row draft/twist table. Measured scroll delta ≈610 px against a
≈620 px usable viewport, so ~1.3 screens down — one flick, not the two screenfuls
the original claimed, and the first screen is roughly half diagram rather than
all numbers.

**Impact.** `docs/initial-prompt.md:104` states the primary use is "a phone, on a
dock, in sunlight, one-handed". In the first ten seconds that user sees seven
metrics and a bezier diagram and nothing telling them what to do. The teaching
output of the product is the part they have to hunt for.

**Fix.** Move the `.insight` section out of `.col-secondary` and render a
`lg-hide` copy directly under `<ConditionsStrip />`, keeping the existing
`.col-secondary` instance under `lg-only` — the same duplication pattern
Readouts already uses at `Race.svelte:41-45` vs `:128-137`.

**Effort.** S

**Lenses.** beginner-phone

<a id="m-09"></a>

### M-09 — No optimise-to-target on Race, and no target beside BSP/VMG

**Evidence.** `src/ui/race/Readouts.svelte:29-45` builds every metric as
`{label, text, unit, tier}` — no reference, no delta, no colour state; the only
conditional styling is `.stale` opacity at `:121`.
`race-desktop-advanced-top.jpg`: "BSP Ⓐ 5.5 kt", "VMG Ⓐ 4.12 kt", nothing to
compare against; `phone-race-dock-top.jpg`: same three bare hero numbers. A
target does exist but is buried: `src/ui/disagree/Panel.svelte:199-217` renders
the "Target BSP" row, and `Race.svelte:175-188` wraps `Panel` in `{#if advanced}`
plus a collapsed `<details>` — and in `phone-race-dock-top.jpg` that row reads
"n/a / n/a / n/a". `ControlPanel.svelte` contains exactly one `<button>`
(`:75-82`, the "?" glyph); there is no optimise affordance anywhere on Race. The
optimised angle is computed and thrown away: `src/ui/disagree/store.svelte.ts:57`
passes `optimiseTwa: true` and `src/core/solve/optimal.ts:76` runs the angle
search, but `optimal.twaDeg`'s only consumer is the divergence logger
(`Panel.svelte:75`) and Panel renders five rows with no TWA row. `OptimalResult.race`
(`src/core/types.ts:251-254`) is dropped entirely — the `ModelOptimum` interface
(`disagree/store.svelte.ts:16-21`) has no `race` field. Simple mode never
requests it at all (`Race.svelte:19` gates on `advanced`).

**Blocker, and the reason the original fix was reversed.** `optimum.race` is
**not an answer key today.** `src/core/solve/optimal.ts:51-58` optimises only
`backstay`, mapped from the single ORC `flat` scalar by a 12-iteration golden
section; the other ten controls are returned verbatim from `baseRace()`. The
module says so at `optimal.ts:6-11` ("race trim is optimised through the single
ORC `flat` parameter … A full search over eleven controls is Epic 2 work"), and
`docs/plans/2026-08-25-mvp-analyser/phase-02-solver-calibration-validation.md:42`
books it as an Epic 2 candidate. Rendering `optimum.race` on all eleven sliders
would present hard-coded base constants as "the fast setting" — a fabricated
answer key, and a worse defect than the gap it closes.

**Impact.** Both personas hill-climb at `GAIN_EPS = 0.005` kt
(`store.svelte.ts:37`). A user parked in a mediocre basin is told "Trim is
balanced: no single control gains more than 0.005 kt" (`Race.svelte:31`) and
reasonably concludes they are done; a one-step local gradient cannot detect that.
The beginner has no absolute anchor at all — 5.5 kt at 10 kt TWS could be
class-competitive or a disaster and nothing on screen says which. The
desktop persona is partly served by the collapsed advanced panel; the Simple-mode
phone user gets nothing.

**Fix.** *Owner decision:* ghost ticks on the sliders showing the VPP optimum,
plus an "Apply" button, every value tier-badged. Sequenced against the blocker
above: today only the backstay tick is a real optimum, so ship the tick for
backstay (plus target BSP/heel and the optimised TWA, all real solver output)
and either omit the other ten ticks or badge them at the tier the solver actually
supports — never render `baseRace()` constants as an optimum. The remaining data
is already in hand and merely discarded: carry `race` and `twaDeg` through
`ModelOptimum`, add the rows to `Panel.svelte`'s grid, drop the `advanced` gate
at `Race.svelte:18-20` so `model.optimum.vmgKt` can feed a "% of target" line
under BSP and VMG (with a null path — the phone screenshot shows it resolving to
n/a in at least one state). Full eleven-control ghost ticks wait on the Epic 2
optimiser. `perControlDelta` (`lib/drills.ts:120-136`) exists and should be
reused rather than reimplemented. Out-of-scope spillover worth routing: the same
`optimal.ts` limitation makes the Drills answer key largely hollow — 9 of 10
drills in `data/drills/j70-static.json` free controls that `perControlDelta`
compares against `baseRace()` constants. File separately.

**Effort.** L

**Lenses.** competitor-benchmark, workflow-honesty

<a id="m-10"></a>

### M-10 — Telltales, the only visual flow cue, sit behind the third tab and off by default on phone

**Evidence.** Telltales live only in `PlanView`: jib luff ribbons at ¼/½/¾/head
(`src/ui/race/PlanView.svelte:99-109`), main leech ribbons (`:111-131`), drawn at
`:220-241`. `Race.svelte:27-28` sets `TABS = ['Sections','Rig','Plan']` with
`tab = $state(0)`, and the tabbed card is `lg-hide`, so phone and tablet land on
Sections — `phone-race-dock-top.jpg` confirms the left phone shows "Sections"
active with the MAIN/JIB camber curves and no telltale on screen. No legend
exists: grepping `src/ui` for streaming/lifting/stalled returns only CSS classes
and `boat.ts`/`geometry.ts` internals, never user-visible text, and the PlanView
figcaption (`:249-252`) names camber, twist, heel and wind angles but never
telltales. Colour is *not* the sole encoding — `PlanView.svelte:449-490` gives
each state a distinct rotation (flutter ±4°, lift −25° to −45°, stall +40° to
+70°) — except under `prefers-reduced-motion: reduce`, where those animations are
suppressed and all three states render at the same base rotation with only `fill`
differing (`:414-424`). Desktop is unaffected: `Race.svelte:101-113` makes
PlanView the hero.

**Impact.** The best learning artefact costs the phone persona one labelled tap
they have no reason to take, and where it is seen the three-state code is
unexplained — against `tokens.css:8`'s own "meaning only, never decoration" rule.
Under reduced motion it degrades to colour-only, which fails the deuteranopia
case in the sunlit-deck context the brief targets (`docs/initial-prompt.md:104,109`).

**Fix.** Default the picture tab to Plan (`Race.svelte:28`, one token). The
legend matters more than the default: add a one-line key under the figcaption
("streaming / lifting / stalled") that distinguishes the states by label or
shape, and make sure it still reads under `prefers-reduced-motion`, where the
angle differentiation disappears.

**Effort.** S

**Lenses.** competitor-benchmark

<a id="m-11"></a>

### M-11 — Preset buttons overwrite all eleven trim sliders with no undo

**Evidence.** `src/ui/race/ConditionsStrip.svelte:28`
`<button onclick={() => race.applyPreset(p)}>{p.label}</button>` →
`src/ui/race/store.svelte.ts:121-125` `conditions.apply(p.condition);
Object.assign(this.controls.race, p.race)`. Every `Preset.race` is a full
`RaceControls` (`src/ui/stores/conditions.svelte.ts:11-23,37-50,56,62-75,81-91`),
so all eleven keys are replaced, not merged. No undo anywhere: grepping
`src/ui/` for undo/history/snapshot returns only `$state.snapshot` and the
divergence-history `<details>`; `Toast` is imported only by `screens/Log.svelte`
and `screens/Kit.svelte`. `race-desktop-simple-top.jpg` shows the "Edit" chip is
the only entry point. The sharpest part is invisibility, not surprise: in Simple
mode `ControlPanel.svelte:26` renders only mainsheet, traveller, backstay,
jibSheet and jibLead, so six of the eleven overwritten controls (cunningham,
outhaul, vang, inhauler, mainHalyard, jibHalyard) change with nothing on screen
moving.

**Impact.** A user who opens Edit to change wind speed and taps "Heavy" loses a
converged trim state, six controls of which change with no visible feedback. Not
data loss: `race.controls` is never persisted (the only localStorage writers are
`stores/rigLock.svelte.ts` and `stores/settings.svelte.ts`), so a refresh
discards the same state, and the coach line plus chevrons re-converge it in five
drags in Simple, eleven in Advanced. Not unlabelled either —
`ConditionsStrip.svelte:25` heads the row "Presets" and `:31` says they are
"starting points for the sliders".

**Fix.** Split the action: preset buttons set `p.condition` only, with a separate
"Reset trim to preset" affordance. Cheapest safe version: keep the single button,
stash the previous `race` controls, and show the existing `Toast` component with
an Undo.

**Effort.** S

**Lenses.** workflow-honesty

<a id="m-12"></a>

### M-12 — Simple mode hides the sliders but keeps every hard concept

**Evidence.** `src/ui/race/ControlPanel.svelte:25,40-42` filters the slider list
to five ids in Simple. Nothing else on Race is gated: `Race.svelte:41-45` renders
all seven readouts (`Readouts.svelte:29-45` includes LEEWAY, AWA and FLAT),
`Race.svelte:47-98` renders the Sections/Rig/Plan tab card in both modes,
`SailSections.svelte:71-95` renders a 6×5 Draft/Pos/Twist table at 12 px mono
(`app.css:140-144`), and `ControlPanel.svelte:118-126` renders the locked
Dock-setup card. Only the disagreement panel is mode-gated (`Race.svelte:175-188`).
`race-desktop-simple-top.jpg`: Simple is selected and LEEWAY 5.8°, AWA 26°,
FLAT 0.97, A/B badges, sail sections, rig elevation and the locked dock card are
all present.

**Impact.** The default mode removes the six controls a beginner could safely
play with and keeps the vocabulary that makes the screen unreadable — leeway,
apparent wind angle, a dimensionless flat coefficient, confidence tiers and a
camber/twist table. That is the opposite trade.

**Fix.** Gate on `advanced` in `Race.svelte`: render only BSP/Height/VMG in
Simple (a `simple` variant on Readouts, or the quiet row conditionally), collapse
the section table behind the existing `details` pattern, and drop the Rig/Plan
tabs to a single Boat view.

**Effort.** M

**Lenses.** beginner-phone

<a id="m-15"></a>

### M-15 — The only motion is a full-cell flash; the shapes the user is watching snap

**Evidence.** `src/ui/race/Readouts.svelte:56-60` re-keys each cell on its text
and `:170-184` flashes `color-mix(--accent 12%)` behind the value for 400 ms; one
slider drag changes all seven metrics, so seven cells strobe continuously for the
length of the drag. `phone-race-dock-top.jpg` catches all seven mid-flash,
sitting in pale filled rounded rectangles that read as input fields rather than
numbers. Meanwhile `src/ui/race/SailSections.svelte:13-14` documents "Nothing
here animates" and `src/ui/race/PlanView.svelte:245` binds
`rotate({-side * heelDeg})` straight to the solved value with no transition, so
the boat jumps between heel angles. `src/ui/tokens.css` has no duration or easing
token at all — its only motion rule is the reduced-motion kill switch at
`:93-102`. Telltale flutter (`PlanView.svelte:450-460`) is the one place motion
works, which marks the rest as omission rather than stance.

**Impact.** Backwards for an instrument UI: motion is spent on a strobe that
makes read-only numbers look editable and withheld from the continuous
quantities — sail shape, mast bend, heel — where an eased tween is what teaches a
beginner that easing the sheet opens the leech.

**Fix.** *Owner decision:* telltale flutter, heel tilt and eased tweens
throughout, all respecting `prefers-reduced-motion`. Concretely: add
`--dur-fast: 120ms; --dur: 220ms; --ease: cubic-bezier(0.2, 0, 0, 1)` to
`tokens.css`; replace the Readouts flash with a 2 px `--accent` underline on the
changed cell only; put `transition: transform var(--dur) var(--ease)` on
PlanView's heel group (`PlanView.svelte:245`) and on the SailSections twist
`<g>` — the rotations tween even though the bezier `d` cannot. The existing
reduced-motion block at `tokens.css:93-102` must cover the new tokens.

**Effort.** M

**Lenses.** visual-design

<a id="m-18"></a>

### M-18 — No helm or rudder-angle readout

**Evidence.** Benchmark: North U "shows rudder angle, which signals whether helm
is excessive—indicating that sail trim adjustments are needed for better balance"
(https://www.northsails.com/sailing/en/2018/03/developing-tools-to-help-visualize-performance).
Sailflow's metric set is fixed at BSP, Height, VMG
(`src/ui/race/Readouts.svelte:29-33`) and Heel, Leeway, AWA, Flat (`:35-45`);
`race-desktop-advanced-top.jpg` shows exactly those seven cells, with no helm,
rudder angle or balance term.

**Impact.** Weather helm is the feedback the Yachtmaster persona reads through
his hands on every beat and the first thing he will look for when translating
handicap-boat instincts to a J/70. Without it, traveller and mainsheet moves
surface only as a two-decimal VMG wobble — the least intuitive channel available
— and the app cannot explain *why* a setting is slow (over-trimmed main loading
the rudder) rather than only that it is.

**Fix.** Surface the solver's yaw-balance / rudder term as an eighth readout with
its own confidence tier. If `src/core/solve` does not produce one, say so
explicitly in the Readouts card rather than leaving the concept absent — the
honesty rule already covers the admission.

**Effort.** M

**Lenses.** competitor-benchmark

<a id="m-19"></a>

### M-19 — No before/after comparison; the "reference" ghost compares each sail to itself

**Evidence.** Benchmark: North U's Magic Wand exists so users can "compare their
manual trim adjustments against ideal configurations and see performance
differences"
(https://www.northsails.com/sailing/en/2018/03/developing-tools-to-help-visualize-performance).
Sailflow's only overlay is `src/ui/race/SailSections.svelte:53`,
`<path class="ref" d={sectionPath(sail.shape.quarter, L.chord)} />` — the same
sail's own ¼ section, as the figcaption in `race-desktop-advanced-scrolled.jpg`
states: "Live shape in accent, this sail's ¼ section repeated behind it as a
reference." `PlanView`'s ghost (`:78-85`) is likewise the same sail's ¾ section.
Grepping `src/ui` for reset/snapshot/pin returns nothing outside the drills store.

**Impact.** The desktop persona's stated loop is A/B: set trim, change one thing,
see the difference. With nothing to pin, every comparison is held in the user's
head against a number that has already been overwritten, and the shape diagrams
cannot show the delta at all.

**Fix.** A "Pin this trim" button storing one `$state.snapshot(race.controls)`
plus its `SolveResult`; when a pin exists, draw the pinned section as the `.ref`
path instead of the ¼ section and show pinned-vs-live deltas beside BSP/VMG. One
store field, no persistence.

**Effort.** M

**Lenses.** competitor-benchmark

<a id="m-21"></a>

### M-21 — Wind arrows are the same length at 4 kt and 25 kt

**Evidence.** Benchmark: SailRhythm lists "Intuitive Wind Visualization" where
"arrow length represents wind speed" (https://www.sailrhythm.com/). Sailflow's
arrow length is a constant: `src/ui/race/PlanView.svelte:58`
`const RING = { rx: 110, ry: 100, len: 18 }`, consumed by `windArrow` in
`src/ui/race/boat.ts`, which runs the arrow from `at(r + ring.len)` to `at(r)`
with no TWS term anywhere in the function. `race-desktop-simple-top.jpg` at 10 kt
shows a TWA arrow that is pixel-identical at 6 kt or 20 kt; only the chip text
changes.

**Impact.** Wind strength is the top-level variable in every tuning decision the
app models, and it is the one thing the hero drawing does not depict. Switching
between the Light/Medium/Heavy presets changes the sail shapes and the numbers
but leaves the environment looking identical.

**Fix.** Scale `len` with TWS — pass `twsKt` into the ring, e.g.
`len: 10 + twsKt` with a clamp. One expression in `PlanView.svelte:58` plus a
clamp in `boat.ts`; `geometry.test.ts` already covers arrow clearance.

**Effort.** S

**Lenses.** competitor-benchmark

<a id="m-22"></a>

### M-22 — The Downwind preset produces a gennaker boat with no gennaker controls in Simple mode

**Evidence.** Benchmark: Virtual Regatta Inshore exposes sail choice as one
always-available button — "The blue button allows you to switch sails, which
optimizes your speed according to your course"
(https://vrinshore.zendesk.com/hc/en-us/articles/360012273900-The-game-interface).
In Sailflow, `ConditionsStrip.svelte:28` applies presets including `downwind`,
which sets `sailset: 'asym'` and TWA 145°
(`src/ui/stores/conditions.svelte.ts:77-92`), but the kite controls are
double-gated: `src/ui/race/ControlPanel.svelte:100` `{#if advanced}` around the
Downwind section, and `:105` a further "show kite controls" checkbox.
`phone-race-dock-bottom.jpg` shows the DOWNWIND card with the checkbox unticked
and nothing under it. The Simple control set (`ControlPanel.svelte:25`) is
upwind-only: mainsheet, traveller, backstay, jibSheet, jibLead.

**Impact.** A beginner in Simple mode taps "Downwind", gets a boat solved with an
asymmetric at 145° TWA, and is handed jib-sheet and jib-lead sliders that no
longer correspond to a hoisted sail. The screen silently becomes incoherent
rather than switching modes, and the class-rule split the app is built around
(`docs/initial-prompt.md:31`) is invisible in the mode most users start in.
Compounds [H-05](#h-05), whose coach line points the wrong way at the same TWA.

**Fix.** Drive `race.downwind` off `conditions.sailset` instead of a separate
checkbox, and show the kite controls in Simple mode too, still under the C-tier
banner already at `ControlPanel.svelte:110`. Deletes the checkbox and one
`{#if advanced}`.

**Effort.** S

**Lenses.** competitor-benchmark

<a id="m-23"></a>

### M-23 — The disagreement solve runs on every condition change even when the panel is hidden

**Evidence.** `src/ui/screens/Race.svelte:175-188` puts the whole `Panel` inside
`{#if advanced}` and a `<details>` summarised "Model vs tuning guides", as the
last card in the secondary column; `race-desktop-advanced-scrolled.jpg` shows it
as a closed grey strip below DOCK SETUP, off the first screen. Separately,
`Race.svelte:18-20` fires `model.request(...)` on every conditions change
whenever `advanced` is true, independent of whether the `<details>` is open, and
each request is a 24-setup `dockScore` plus an `optimal` solve
(`disagree/store.svelte.ts:45-59`) on the same worker as the race solve and its
eight probes.

**Impact.** The beginner persona never sees the model-vs-guide delta at all; the
Yachtmaster is three scrolls and a click away from the numbers it contradicts, so
"show both and the delta" is satisfied on paper only. Meanwhile the hidden
panel's solves queue ahead of the race probes on every slider move, which is what
makes the coach line lag.

**Fix.** Bind the `<details>` open state and gate the `$effect` on it
(`if (advanced && panelOpen) model.request(...)`). Surface the headline delta
unconditionally as one line near the readouts — "model is +0.3 uppers vs North
here" — that expands into the full table, shown in Simple mode too.

**Effort.** S

**Lenses.** workflow-honesty

<a id="l-01"></a>

### L-01 — Simple mode spends three of its eight control rows on permanently locked Dock sliders

**Evidence.** `src/ui/race/ControlPanel.svelte:118-126` — the Dock setup
`<section class="card">` sits outside the `{#if advanced}` guard that wraps the
Downwind card (`:100`), and its rows render with `{ locked: true }`
unconditionally. The `visible()` filter (`:40-42`) and the `SIMPLE` list (`:25`)
trim the other groups to five controls. `race-desktop-simple-top.jpg`: Sheets
(4 rows) + Rig (1 row, Backstay) + DOCK SETUP (3 greyed rows) fills the column.

**Impact.** The mode meant to strip the interface to the five gears you move on a
beat hands the beginner three sliders that cannot move, one of which (forestay
length in mm) is the most jargon-heavy control in the app, each still carrying a
"?" that opens a modal.

**Fix.** Largely subsumed by [C-01](#c-01) — once the dock rows follow
`rigLock.lockedToday` they will be live rather than dead most of the time. What
remains after that: wrap the Dock setup card in `{#if advanced}` to match the
Downwind card, or render the committed rig in Simple mode as a one-line read-only
summary chip rather than three sliders.

**Effort.** S

**Lenses.** advanced-desktop
