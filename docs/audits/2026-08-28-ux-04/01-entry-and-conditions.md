# 01 — Entry and the conditions controls

Reading order: what a stranger meets first, in the order they meet it.
Repro base: `pnpm dev --port 5199`, fresh profile (no localStorage), open
`http://localhost:5199/`.

<a id="h-02"></a>
## H-02 · The first-run tour never mentions the wind

**Evidence.** `src/ui/onboarding/steps.ts:24-53` — three cards: "Dock, then
Race", "Two things called a tier", "Apply optimum". The word *wind* appears
once, inside the Dock card, describing the forecast. No card says where the
conditions the Race screen solves for are set, or that they should be set
first. Card 1 is drawn over the cockpit at desktop and over the point-of-sail
chips on a phone (`m1-cold.png`), so the rail it should be pointing at is
literally behind it.

**Impact.** Reproduces the owner's user report verbatim. A sailor who reads all
three cards still does not know the model is answering for 10 kt / 42° / ripple
/ 300 kg, or how to change that.

**Fix.** Make card 1 "Set the wind" and anchor it (a `data-tour` target +
spotlight cut-out) on the conditions block. Push "Dock, then Race" to card 2.
Three cards stays the budget.

<a id="h-01"></a>
## H-01 · Conditions are the smallest and most remote control on the primary screen

**Evidence.**
- Desktop 1440×900: the rail is the last thing on the header line, ~1300 px
  right of the BSP cell it drives. `ConditionsStrip.svelte:206-215` draws the
  stepper at 28 px inside `.cockpit`; `app.css:295-303` does the same for the
  chips. Five of the eight pills are inert `<span>`s
  (`ConditionsStrip.svelte:71-74`: TWA, sea state, crew, sail set) drawn in the
  same outline style as the clickable point-of-sail chips beside them.
- Phone 390×844 (`m2-race-top.png`): `Race.svelte:589-591` hides every
  non-stepper chip, so the row is `− 10 kt +` and `Edit`. **Wind angle, sea
  state, crew and sail set are not visible anywhere above the fold**; the
  only route to them is a button whose label does not say what it edits.
- The sheet is titled "Conditions" (`ConditionsStrip.svelte:93`) but the
  trigger is "Edit" — the noun is revealed only after the tap.

**Impact.** The single input that changes every number on the screen has the
lowest visual weight of anything on it. On a phone it is a two-tap discovery.
The owner's report is this finding.

**Fix.** See § Proposed layout below. In one line: split the instrument band
50/50, left half = what the boat is doing (BSP · %polar · VMG · heel · helm),
right half = what the world is doing (TWS · TWA · sea state · crew · sail
set), every cell on the right directly editable, same `InstrumentCell` type
ramp on both halves.

<a id="m-01"></a>
## M-01 · Read-only chips beside identically styled buttons

`ConditionsStrip.svelte:71-74` — `42° TWA`, `Ripple`, `300 kg`, `Jib` are
`<span class="chip">` but sit in a row with `button.chip` point-of-sail pills
and the `Edit` button. Tapping `Ripple` does nothing. Mixed affordance in one
row. **Fix:** folded into H-01 — every conditions value becomes a control.

<a id="m-02"></a>
## M-02 · One condition, three places to set it

- Crew weight: rail sheet (`ConditionsStrip.svelte:110-118`), Helm & conditions
  panel (`race/panels/Helm.svelte`, screenshot: "CREW · Crew weight 300 kg"),
  and Dock forecast card.
- TWA: sheet slider (20–180°) *and* five point-of-sail chips whose nominal
  angles differ from what the chip shows (`pointOfSail.ts:22` nominal 40°,
  rail shows `42° TWA` because the VMG solve moved it). A user who drags the
  slider to 45° still sees `Close-hauled` pressed.

**Fix:** one home for each condition (the right half of the band). Helm
panel keeps fore-aft only. Point-of-sail chips become a *preset row* under the
TWA cell, deselecting when the angle leaves the band.

<a id="m-03"></a>
## M-03 · "Presets" inside the Conditions sheet rewrite the trim

`ConditionsStrip.svelte:94-104` + `conditions.svelte.ts:74-…` — Light/Medium/
Heavy/Downwind set the condition **and all eleven trim sliders**. The note
under them says so, but they live in a sheet titled Conditions that a user
opened to change the wind. Six of the eleven controls are off-screen in
Simple mode, so the rewrite is mostly invisible. **Fix:** move presets out of
the conditions surface into the actions bar ("Start from: Light / Medium /
Heavy"), or label the buttons "Light day (wind + trim)".

<a id="m-08"></a>
## M-08 · No wind direction visual on the default Race view

Desktop default is the 3D hero; the only angle cue is the text `42°` in the
TWA cell and the `42° TWA` chip. The plan view (`PlanView.svelte:188`) has a
proper rose with TWA and AWA arrows but it is a tab away. Sailors think in
arrows. **Fix:** a small rose (TWA arrow, AWA arrow, boat icon) as the TWA
cell of the new right half; drag the arrow to set TWA.

<a id="m-09"></a>
## M-09 · The desktop header line has no grouping

One 28 px line carries: title, density segmented, lede, five point-of-sail
chips, stepper, four inert chips, Edit. Nothing separates "how dense" from
"which wind". **Fix:** falls out of H-01 — conditions leave the header.

<a id="l-03"></a>
## L-03 · "Helm & conditions" panel contains no conditions

Panel title at `race/panels/Helm.svelte` says *conditions*; content is mode,
crew and fore-aft. The actual conditions are in the header. Naming collision.
**Fix:** rename to "Helm & crew" once crew moves (M-02), or just "Helm".

<a id="l-01"></a>
## L-01 · Base URL silently restores the last session

Opening `/` rewrote the URL to `#/race?s=1&…&set=asym&twa=150` from the
previous session. Correct for the owner; a new visitor on a shared device
lands on a run under a kite with no "restored" cue. **Fix:** a one-line toast
"Restored your last session · Reset" on cold load when state ≠ defaults.

## Proposed layout — the split instrument band

What the owner asked for, made concrete. Replaces `InstrumentBar` + the
conditions rail on every width; the `Conditions` sheet stays as the fine-work
overflow (crew, sail set, long-form sliders).

```
┌──────────── BOAT ────────────────────┬──────────── CONDITIONS ─────────────┐
│ BSP      %POLAR    VMG      HEEL     │  TWS         TWA          SEA        │
│ 5.2 kt   93 %      3.85 kt  6°  ▮▯   │  − 10 kt +   ◐ 42°  ↗     Ripple ▾   │
│ tgt 5.6  +0.4      tgt 4.14 +0.29    │  [Light][Med][Heavy]      300 kg ▾   │
│ HELM  ▮▯  0.27                        │  ○ Close-hauled ○ Reach ○ Run  Jib▾ │
├──────────────────────────────────────┴─────────────────────────────────────┤
│ ✎ 0.29 kt below target: Trim mainsheet one click …                         │
└────────────────────────────────────────────────────────────────────────────┘
```

Rules that make it excellent rather than merely present:

1. **Same type ramp both sides.** Right-half values use `InstrumentCell` so
   `10 kt` weighs the same as `5.2 kt`. Cause and effect at one glance.
2. **Every right-half value is the control.** Tap TWS → stepper is already
   there; drag the rose arrow → TWA; tap Sea → 5-option popover; tap crew →
   stepper. No `Edit`.
3. **Phone:** the band is the first thing under the header — above the hero.
   Left half and right half stack to two rows of four cells; the point-of-sail
   row stays as a horizontal chip scroller under them. Hero comes third.
4. **Live coupling:** changing TWS re-solves and the left half animates
   (the `Tween` on BSP already exists, `Race.svelte:2`). That animation *is*
   the lesson.
5. **Sea state is honest:** `core/hydro/waves.ts:51-80` models it as added
   resistance; the sea cell's `?` says exactly that, tier B.
6. **Downwind:** the objective flips to VMG-down; the VMG cell shows
   `4.95 kt ↓` (see H-04), the TWA rose swings aft, sail set flips to
   Gennaker automatically as today (`race.setPointOfSail`).
