# Shared primitives, accessibility, design system

Findings in `src/ui/components/**`, `src/ui/tokens.css`, `src/app.css` and the
`src/ui/disagree/**` panel that both screens embed. Severity order.

<a id="h-04"></a>

### H-04 — `summary { display: flex }` removes the disclosure marker on every expander

**Evidence.** `src/ui/screens/Race.svelte:293-301`
`details summary { min-height: 32px; display: flex; align-items: center; …
cursor: pointer }` and `src/ui/disagree/Panel.svelte:392-398`
`summary { min-height: var(--hit-min); display: flex; align-items: center;
cursor: pointer }`. Overriding the UA's `display: list-item` removes `::marker`
in Chromium and WebKit, and there is no replacement:
`grep -n "marker\|list-style\|::after\|::before" src/app.css src/ui/tokens.css
src/ui/disagree/Panel.svelte src/ui/screens/Race.svelte` returns only
`src/app.css:183` `.hit-44::after` (an unrelated hit-target expander) and a
`tokens.css` reduced-motion reset. `cursor: pointer` only fires on hover and does
nothing on the phone persona. Screenshots: `race-desktop-simple-top.jpg` y≈318 —
"Why" (`Race.svelte:164`) is bare grey bold text inside the coach-tip card;
`race-desktop-advanced-scrolled.jpg` y≈834 — the entire advanced disagreement
section (`Race.svelte:176-186`) is a bordered card whose only visible content is
the flat grey line "Model vs tuning guides"; `dock-desktop-loading.jpg`
y≈595/660/725 — "North race notes — 12-16 kt", "Quantum race notes — 12-14 kt"
and "Divergence history" (`Panel.svelte:243, 260`) render as three identical
bordered grey boxes, indistinguishable from empty placeholders;
`phone-race-dock-bottom.jpg` and `phone-race-dock-mid.jpg` show the same on the
phone. The Race "Why" summary is additionally a 32 px tap target
(`Race.svelte:294`), under the brief's own 44 px minimum.

**Impact.** The whole explanation layer — how the coach line was derived, the
guide race notes, the divergence history, and the Model-vs-guides panel that is
the product's stated honesty centrepiece — sits behind controls that give no
signal they are controls. On Race that panel is 100 % behind this
non-affordance. Both personas read the grey boxes as empty cards and never open
them. Content is still reachable by clicking the text, so this is not a
Critical; a feature neither persona can discover is not polish either.

**Fix.** Shortest version: delete `display: flex` (and the now-moot
`align-items`) from both blocks and let the native marker return — `min-height`
still applies to a `list-item`. Reach for a custom chevron only if the label
genuinely needs flex layout, in which case add
`summary::after { content: ''; width: 8px; height: 8px; margin-inline-start: auto;
border-right: 2px solid currentColor; border-bottom: 2px solid currentColor;
transform: rotate(45deg) }` with
`details[open] summary::after { transform: rotate(-135deg) }`. Raise
`Race.svelte:294` `min-height` to `var(--hit-min)` either way.

**Effort.** S

**Lenses.** visual-design, beginner-phone, a11y-interaction

<a id="m-06"></a>

### M-06 — Guide deltas are painted in the error colour, with no legend for sign or magnitude

**Evidence.** `src/ui/disagree/Panel.svelte:88-90` computes
`delta = model - guide`; `:164` renders it as a `<span class="delta">` *inside*
the guide's `<span class="cell">` (also `:213`, `:233`); `:93-97` `deltaClass()`
maps |d| ≤ 0.5 → `muted`, ≤ 1 → `warn`, else `bad`, styled at `:364-377`. The
delta is rendered only in the guide columns — the model column never carries one
— so the valenced ramp is applied one-sidedly to the guides, in a panel whose own
docstring says "It never picks a winner" (`Panel.svelte:2-6`) and whose on-screen
copy says "elsewhere the gap is information" (`:131-134`). No key exists anywhere
in the component, and the direction of subtraction is never stated.
`dock-desktop-scrolled.jpg`: the North column shows "2.7" stacked over "+0.3",
Quantum "1.0" over "+2.0", and the Lowers row "1.3 / −3.3" and "0.5 / −2.5" —
the last three rendered red.

**Impact.** "2.7" with "+0.3" beneath it reads naturally as "North says 2.7,
plus 0.3", i.e. 3.0, when it means the model is 0.3 turns above North. Three
colours encode gap magnitude with nothing saying grey means noise and red means a
real gap, so colour reads as approval/disapproval of the guide — the silent
resolution CLAUDE.md forbids. Note two corrections to the original finding: the
"+0.3 in amber" claim is false (|0.3| ≤ 0.5 → `muted` → `--ink-2`, plain grey on
pixel inspection, and no `warn` delta appears in any supplied screenshot), and
the "spends the alarm colour so a real error no longer stands out" argument does
not hold — `--bad` is not reserved for failure in this app
(`src/ui/race/PlanView.svelte:425` uses it for `.ribbon.stalled`,
`src/ui/race/ControlPanel.svelte:170` for a down-chevron), it is an established
three-step quality ramp.

**Fix.** Target `Panel.svelte:364-377`: point `.delta.warn` and `.delta.bad` at
`--ink-2` and encode magnitude neutrally — `font-weight: 600` plus a 2 px
`--muted` bar sized to |Δ|. Name the subject: prefix the delta with "model +0.3",
or move it into its own column headed "Model − guide". Add a one-line key under
the table: "≤0.5 turns is inside the model's own noise; ≥1 turn is a real gap."

**Effort.** S

**Lenses.** visual-design, advanced-desktop

<a id="m-08"></a>

### M-08 — Slider readout is a dead tab stop, long-press-only, and zeroes the control when blurred empty

**Evidence.** `src/ui/components/Slider.svelte:86-95` — the readout `<button>`
carries only `onpointerdown`/`onpointerup`/`onpointerleave`; there is no
`onclick` and no key handler, so Enter and Space fire a synthetic click with no
listener, and a normal mouse click starts then immediately cancels the 500 ms
timer (`startPress`, `:47-53`). Its `aria-label` reads "{label} value, long-press
to edit" — naming an action those users cannot perform, on every slider in Race
and Dock. `Slider.svelte:59-63` `commitEdit()`: `Number('') === 0`, and `snap`
(`src/ui/format.ts:22-26`) clamps then rounds, so with
`data/boats/j70.json` `upperTurns {min:-6, max:6, step:0.5}` an emptied field
commits exactly 0 — +4.0 turns silently becomes 0.0. No Escape-to-cancel (only
Enter, `:83`); the edit input (`:77-84`) has no `aria-label` or `<label>`.
Styles at `:161-172` give the readout `padding: 0`, `min-width: 5.5ch`, 15 px
font and no `hit-44`, so the hit box is roughly 45×20 px, under the brief's 44 px
rule. `phone-race-dock-controls.jpg` and `phone-race-dock-mid.jpg`: readouts render as plain
bold text ("0.0 turns", "0 mm", "30 %", "5 holes", "70 %") with no affordance,
while the adjacent "Crew weight" uses explicit −/+ steppers — the gesture is
undiscoverable to everyone, not only keyboard users. `forestayMm {min:0, max:40,
step:2}` confirms that arrow-stepping 0→40 mm is 20 keypresses. Adjacent bug
worth folding in: the edit input is never focused (no autofocus, no focus action,
no `$effect` at `:76-84`), so `blur` may never fire and `editing` can stay `true`
indefinitely after an abandoned long-press.

**Impact.** Typing an exact value — what you want with wet fingers rather than
dragging a 4 px track — is effectively undiscoverable, and the readout is a focus
stop that announces an action it cannot perform. Value-setting itself is not
lost: the range input at `:100-110` carries `aria-label={label}` and is fully
keyboard-operable, so exact values are reachable by arrow-stepping — slow, not
impossible. The zeroing path is reachable only through the hidden gesture and its
result is immediately visible (readout flips to 0.0, thumb jumps) before any
commit persists anything.

**Fix.** Make it click-to-edit: add
`onclick={() => { editValue = String(value); editing = true; }}` (long-press
keeps working), focus the input when `editing` becomes true, bail in
`commitEdit` on `editValue.trim() === ''` or a non-finite value instead of
committing 0, and handle `Escape` to discard. Add `aria-label="{label} value"` to
the edit input and `class="readout hit-44"` using the existing helper at
`app.css:179-191`. The `pointercancel` and iOS text-callout sub-claims are
dropped: the Pointer Events spec fires `pointerout`/`pointerleave` after
`pointercancel` and `onpointerleave={cancelPress}` already clears the timer, and
the callout race is unevidenced.

**Effort.** S

**Lenses.** a11y-interaction, beginner-phone

<a id="m-13"></a>

### M-13 — Confidence tier badges are title-only and wear the interactive colour

**Evidence.** `src/ui/components/ConfidenceBadge.svelte:19` — the tier meaning
lives entirely in a `title` attribute on a non-focusable `<span>`
(`<span class="badge" title={reason ?? defaultReason[tier]}>{tier}</span>`), with
no button and no tap handler. It is inlined in the label text at
`Readouts.svelte:50-52`, `Slider.svelte:74`, `RegretCard.svelte:26` and
`SuggestButton.svelte:35`. The only prose legend is `src/ui/screens/More.svelte:64`,
inside an About paragraph. Separately, `ConfidenceBadge.svelte:129-139` gives
tier A `background: var(--accent); color: var(--on-accent)` and tier B an accent
outline — the same treatment as the active segmented control
(`src/ui/components/Segmented.svelte:200-203`), the Commit button
(`src/ui/dock/CommitButton.svelte:54-64`), the "calibrated here" chip
(`Panel.svelte:167-174`) and `button.chip` (`app.css:171-176`), while
`tokens.css:7` declares `--accent` "the one interactive colour". Screenshots:
`phone-race-dock-top.jpg` — "BSP Ⓐ", "VMG Ⓐ", "HEEL Ⓑ", "LEEWAY Ⓑ" with no way
to interrogate them; `race-desktop-simple-top.jpg` — the solid blue "A" pill
beside BSP has the same fill, radius and weight as the "Simple" toggle top right;
`dock-desktop-loading.jpg` — "calibrated here" is a solid blue pill that invites
a click and does nothing.

**Impact.** `title` never appears on touch and never on keyboard focus, so the
phone beginner — the user who most needs to know that B means "a band, not a
value" — can never surface it, and a screen reader announces "BSP A", a bare
letter with no relation. A stated product invariant is in practice
sighted-desktop-hover-only. Meanwhile one colour carries two meanings on a screen
with roughly twenty accent objects, so the pressable things stop standing out and
users press the badges and the calibration chip.

**Fix.** Make the badge a `<button class="hit-44">` that opens the existing
`Sheet` with the tier's `defaultReason` — the Sheet + explain pattern is already
wired at `ControlPanel.svelte:129-131` — with
`aria-label="Confidence {tier}: {reason}"` so hover is never the only path.
Restyle the tiers neutrally: A = `--ink` on a `--muted` fill, B = `--ink-2` on a
hairline, C unchanged; make `Panel.svelte`'s `.chip` match `.chip` in
`app.css:156-169` rather than an accent fill. Keep `--accent` for things that
respond to a press.

**Effort.** S

**Lenses.** beginner-phone, visual-design, a11y-interaction

<a id="m-16"></a>

### M-16 — Emoji padlocks are the only full-colour objects and ignore the theme tokens

**Evidence.** 🔒 is used as an interface icon in three places:
`src/ui/components/Slider.svelte:114-123` (the lock overlay button on every
locked track), `src/ui/race/ControlPanel.svelte:121` ("🔒 committed for the day")
and `src/ui/screens/Dock.svelte:53` (the TopBar chip). Everything else in the
shell uses stroked 24 px `currentColor` SVG paths —
`src/ui/components/BottomNav.svelte:14-26`, the tip bulb at
`src/ui/screens/Race.svelte:141-150`. `race-desktop-advanced-scrolled.jpg`: three
saturated yellow padlocks down the right edge of the Dock setup card plus a
fourth in its header; `phone-race-dock-bottom.jpg` shows the same four at 390 px.

**Impact.** Four saturated glyphs on an otherwise two-hue screen pull the eye to
the one thing the user cannot change. They render differently on every OS, ignore
`--ink-2`, and will glow against the dark palette (`tokens.css:74-87`) where
every other icon inverts.

**Fix.** Replace the three emoji with one stroked 16 px padlock path in
`currentColor`, alongside the existing nav icon set, coloured `--ink-2`.

**Effort.** S

**Lenses.** visual-design

<a id="m-17"></a>

### M-17 — ARIA composite roles with no keyboard model; sliders expose no units, band or lock reason

**Evidence.** Three related gaps in the same primitives.
(a) `src/ui/components/Segmented.svelte:20-31` declares `role="radiogroup"` with
`role="radio"` buttons and has no roving `tabindex` and no arrow-key handler;
`src/ui/screens/Race.svelte:48-61` declares `role="tablist"`/`role="tab"` with
the same omissions, and the panels (`Race.svelte:64-97`) contain only
non-focusable SVG with no `tabindex`. Every option is its own tab stop, so
tabbing past Sea state costs five stops and past Simple/Advanced two.
Screenshots: `phone-race-dock-controls.jpg` (five-option Sea state radiogroup),
`phone-race-dock-top.jpg` (Sections/Rig/Plan tablist).
(b) `src/ui/components/Slider.svelte:100-110` — the range carries only
`aria-label={label}`, no `aria-valuetext`, so it announces "0" where the screen
shows "0.0 turns" and "30" where it shows "30 %". The provenance hint
(`Slider.svelte:131-133`, "J/70 Tuning Guide: +4.0 in 12-16 kt", visible in
`dock-desktop-scrolled.jpg`), the guide `tick` (`:111-113`, the dark mark on the
Upper-shroud track in the same screenshot) and the lock note (`:126-130`) are not
linked by `aria-describedby`; the lock toggle (`:115-122`) has no `aria-expanded`
and is labelled "tap for why"; locked sliders use `disabled` (`:108`), removing
them from tab order entirely.
(c) `aria-label` is placed on non-interactive spans, where ARIA prohibits naming
a generic role and AT drops it: `src/ui/race/ControlPanel.svelte:68-73`
`<span class="chev" aria-label="gain from moving this control">` (see
[M-02](01-race.md#m-02)) and `src/ui/race/ConditionsStrip.svelte:15`
`<div class="chip-row" aria-label="Conditions">`, whose five chips (`:16-20`) are
unlabelled spans.

**Impact.** The roles tell AT that arrow keys move within the group; they do
nothing, so a screen-reader user is stuck, and the picture panes cannot be
focused or scrolled from the keyboard at all. A non-sighted user gets bare
numbers with no units and never hears the tuning-guide band or the tick that is
the whole point of the Dock screen — the provenance the honesty rules require is
sighted-only. Because locked inputs are `disabled`, a keyboard user cannot even
focus the committed rig to read it back. The conditions the entire solve depends
on read out as five loose numbers with no context.

**Fix.** One change covers both composites since Race, Dock and Conditions all
use `Segmented`: give non-selected buttons `tabindex="-1"` and add an `onkeydown`
that moves selection and focus on Arrow/Home/End; either reuse `Segmented` for
the Race picture tabs or drop `role="tab"` there for plain buttons with
`aria-pressed`. On `Slider`: add `aria-valuetext={fmt(value, decimals, unit)}`,
give the hint and lock note stable ids and point `aria-describedby` at them, add
`aria-expanded={showLockNote}`, reword the lock label to "Why this is locked",
and swap `disabled` for `aria-disabled="true"` (keeping the existing
`if (locked) return` guard in `onInput`) so the value stays focusable and
readable. On the strip: `<div role="group" aria-label="Conditions">` with each
chip's text prefixed by its quantity ("wind 10 kt", "crew 300 kg").

**Effort.** M

**Lenses.** a11y-interaction

<a id="l-02"></a>

### L-02 — Slider troughs and chip borders sit near 1.3:1 against their background

**Evidence.** `src/ui/tokens.css:22` `--muted: #cbd3de` is the unfilled slider
track (`Slider.svelte:192`) — 1.36:1 against `--surface #f2f4f7`; dark mode
`--muted: #2f3a47` (`tokens.css:64`) is 1.52:1 against `--surface #141a22`.
`--line #dde3ea` (`tokens.css:21`) is 1.29:1 against `--bg`, and it is the only
boundary on `.chip` (`app.css:162`) and on the "?" buttons
(`ControlPanel.svelte:160`). `phone-race-dock-controls.jpg`: the right-hand
portion of every track and the ring around each "?" are barely distinguishable
from the card.

**Impact.** WCAG 1.4.11 wants 3:1 for the parts of a control that convey its
extent. The unfilled half of the track is what tells you how much travel is left,
in an app whose stated context is a sunlit deck. The conditions chips lose their
outline and read as loose text.

**Fix.** Darken `--muted` to roughly `#9aa5b5` in light and lighten to `#4a5766`
in dark — it is used only for troughs, axes and receding geometry, so nothing
text-shaped regresses — and give `.chip` and `.info` an `--ink-2`-derived border
instead of `--line`.

**Effort.** S

**Lenses.** a11y-interaction

<a id="l-03"></a>

### L-03 — Control explainers are a single untitled paragraph with no illustration

**Evidence.** Benchmark: North U pairs the simulator with video clips showing
real-life trim and performance techniques for each control, and the North J/70
guide annotates every setting with a photo of the fitting concerned
(https://www.northsails.com/en-us/blogs/north-sails-blog/j70-tuning-guide).
Sailflow's "?" button opens a sheet containing exactly one paragraph:
`src/ui/race/ControlPanel.svelte:129-131`,
`<Sheet …><p class="explainer">{explaining ? EXPLAIN[explaining] : ''}</p></Sheet>`,
sourced from the flat string map in `src/ui/explain.ts`.
`race-desktop-advanced-top.jpg` shows the "?" circle beside every slider; there
are eleven of them on the Race screen alone.

**Impact.** For the beginner the text answers what a control does but never shows
what its effect looks like, so the explainer and the diagram three cards away are
never connected. Eleven identical "?" circles read as undifferentiated chrome,
with nothing indicating that some explanations matter more than others.

**Fix.** Render the relevant existing diagram alongside the text in the explain
sheet — `SailSections` for a sheet or lead control, `RigElevation` for backstay
and halyards — driven off a per-control key in `EXPLAIN`. Reuses components
already on the screen; no new artwork.

**Effort.** M

**Lenses.** competitor-benchmark
