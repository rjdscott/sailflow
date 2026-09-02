# 04 — Phone layout and chrome

*Scope: the conditions band's chip row, the hero's camera-chip row and the
instrument band, at 390×844 and 1440×900. Shots: all 22 `shots/phone-*.png`
(hero and page, jib and gennaker, 3D presets and plan) and all nine
`shots/desktop-*-page.png`. Files: `src/ui/race/ConditionsBand.svelte`,
`src/ui/race/InstrumentBar.svelte`, `src/ui/race/pointOfSail.ts`,
`src/ui/three/SailHero.svelte`, `src/ui/three/SailView3D.svelte`,
`src/ui/race/PlanView.svelte`, `src/ui/screens/Race.svelte`, `src/app.css`.*

<a id="h-07"></a>
### H-07 — The selected point-of-sail chip is never drawn as selected

`ConditionsBand` is the only control in the app that sets `aria-pressed` and
paints nothing for it, so the row that sets the point of sail never says which
point of sail you are on.

**Evidence.**
- `src/ui/race/ConditionsBand.svelte:252` sets `aria-pressed={active === p.id}`.
  `src/app.css:203-208` `button.chip { border-color: var(--accent); color:
  var(--accent); background: transparent; }` paints every chip identically, and
  `app.css:295-303`'s `.cockpit` overrides touch height and padding only.
- `grep -rn "\[aria-pressed" src/` returns exactly one selector,
  `RigElevation.svelte:351`, which is component-scoped. Nothing in `app.css` or
  `ConditionsBand.svelte`.
- Crops of `shots/desktop-ch-page.png` (TWA 40),
  `shots/desktop-brk-page.png` (135) and `shots/desktop-run-page.png` (150) show
  all five chips with identical accent border and accent text; the phone chip
  rows at TWA 40 and TWA 150 are pixel-indistinguishable.
- The repo's own convention refutes a deliberate reading: `ActionsBar.svelte:208`
  pairs `aria-pressed` with `class:pinned`, and `SailHero.svelte:242` uses
  `class:on`.

**Impact.** The `active` derivation at `ConditionsBand.svelte:53-55`, and the
ux-04 M-02 rule it implements (nothing is pressed once the rose has been dragged
out of a chip's band), are a no-op on screen. Worse, 100 px below, an
accent-outlined chip does mean selected in the hero
(`SailHero.svelte:292-306`), so one visual idiom carries two opposite meanings
in one card: `shots/phone-ch-astern-page.png` shows three accent-outlined band
chips (none selected) above one accent-outlined camera chip (selected).

**Fix.** `button.chip[aria-pressed='true'] { background: var(--accent); color:
var(--bg); }` beside `app.css:203`, matching the filled treatment `Segmented`
already uses for the 3D/Plan toggle. The filled treatment is the right pick over
an accent outline, because the outline is already spoken for by the hero's
camera chips.

<a id="h-08"></a>
### H-08 — On a phone only three of five point-of-sail chips reach the screen, and both gennaker chips are cut

The chip row is a hidden horizontal scroller with a fade that reads as a
rendering seam, so the two downwind chips are undiscoverable.

**Evidence.**
- `shots/phone-run-plan-page.png` (TWA 150, SAIL Gennaker) and
  `shots/phone-brk-plan-page.png` (135) both show exactly three chips,
  Close-hauled, Close reach and Beam reach, with Broad reach and Run entirely off
  screen.
- `ConditionsBand.svelte:380-391` makes `.points` `flex-wrap: nowrap;
  overflow-x: auto; scrollbar-width: none` with
  `mask-image: linear-gradient(to right, #000 85%, transparent)`; the comment at
  `:373-378` names Broad reach and Run as the off-screen pair and claims the fade
  makes them read as "there is more". A 150 % crop of the phone chip row shows
  what the fade does: it dims the last two letters of "Beam reach" and nothing
  else. No partial chip, no scrollbar, no arrow.
- Nothing scrolls the active chip into view. `grep -rn
  "scrollIntoView|scroll-behavior|scrollLeft" src/` has no hit on the chip row,
  and `active` (`:53`) feeds only the aria attribute.
- Wrapping is already allowed, but only at ≥1280 (`:408-428`).
  `pointOfSail.ts:56-62` carries five long labels with no phone variant.
- The stated rationale, that the band cannot spare a 44 px row, is contradicted
  300 px lower on the same page: in `shots/phone-run-astern-page.png` the 3D
  camera-preset row, also five chips, wraps to two rows and shows all five. The
  band spends a second row on camera angles and refuses it for the primary angle
  control.

**Impact.** Combined with H-07, a phone sailor on a broad reach under the kite
sees three upwind labels, none lit, and no indication that the two chips
describing where they actually are exist. Getting downwind from the band on a
phone requires discovering an undiscoverable horizontal swipe, on the surface
the project's own cut order names as the last thing to lose.

**Fix.** Net deletion: make `flex-wrap: wrap` (already in the ≥1280 block at
`:422-427`) the default and delete the nowrap, mask and snap block at `:380-395`.
Five chips on two wrapped rows is what the camera row already does on the same
phone, costs one 44 px row, and removes the affordance problem rather than
papering it with a `scrollIntoView` effect.

<a id="h-09"></a>
### H-09 — Tapping 3D on a phone injects 96 px of wrapped camera chips above a 218 px picture

The hero's chip row has no phone rule, so it wraps to two rows, outweighs the
picture it frames, and shoves the page down as it appears.

**Evidence.**
- `src/ui/three/SailHero.svelte:286-290` `.chips { display: flex; flex-wrap:
  wrap; gap: var(--space-1) }` with no phone rule; the single-line treatment
  exists only inside `@media (min-width: 1280px)` at `:342-353`.
- Measured off the 2× hero shots: `shots/phone-ch-plan.png` has the toggle top at
  y = 22 and the svg top at y = 150, i.e. 64 CSS px of chrome;
  `shots/phone-ch-astern.png` has the toggle top at y = 22 and the stage top at
  y = 342, i.e. 160 CSS px, the five chips wrapping to two 44 px rows (Helm,
  Astern, Leeward, Up the luff, then Top-down alone). Same in
  `shots/phone-run-astern-page.png`, `shots/phone-run-ease-astern-page.png` and
  `shots/phone-brk-leeward.png`.
- The picture is 218 px (`--hero-h: min(56vw, 300px)`, `SailHero.svelte:328-332`),
  so the chrome is 73 % of the picture it frames. `SailHero.svelte:322-331`
  records that the picture was deliberately cut from 66vw to 56vw, 39 px,
  because that was "the picture the first viewport can afford (audit ux-04
  H-03)"; the chip wrap silently spends 2.5× what that cut saved.
- It breaks a promise written in the same file (`:313-316`, "the 2D-to-3D swap
  and the perf fallback never move the rest of the page"): `.slot` height is
  constant but `.hero-head` is not, because the chip row renders only under
  `{#if wants3d && View}` (`:235`), so tapping 3D injects about 96 px above the
  slot.
- The entry path is real, not hypothetical: `SailHero.svelte:113-121`
  `readHero()` returns `'plan'` on `phoneFirst()` when nothing is stored, so the
  phone default is the plan view and every phone user reaching 3D pays the
  injection on the first tap. In `shots/phone-run-astern-page.png` row 1 ends at
  x = 318 CSS with content starting at 29, so "Top-down" needs about 402 px
  against about 332 px available: the row wraps on every phone up to roughly
  460 CSS px, not only at 390.

**Impact.** The 218 px picture is already the smallest thing the card can
defend, and it is outweighed by its own controls on the surface where space is
scarcest, at every phone 3D state.

**Fix.** Reuse the pattern already in the repo: inside `SailHero.svelte`'s
`@media (max-width: 719px)` block give `.chips` the scroller treatment
`ConditionsBand.svelte:380-395` gives `.points`, and shorten two labels in
`presets.ts` for the phone ("Up the luff" to "Luff", "Top-down" to "Top") so the
row is one 44 px line. Reserve that line's height in `.hero-head` in both modes
so the toggle stops shifting the page. Note the tension with H-08's fix, which
deletes the same scroller from the band: the band has five long labels and is the
primary control, the hero has five short ones and is secondary, so a one-line
scroller is the right answer here and a wrap is the right answer there.

<a id="m-05"></a>
### M-05 — The 3D hero shows no TWA or AWA, and on a phone the band's TWA cell is off-screen whenever the picture is on-screen

The mode that omits the angle is also the mode whose chrome scrolls the angle
away.

**Evidence.**
- `src/ui/race/PlanView.svelte:366-367` draws `TWA {n}°` and `AWA {n}°` beside
  the rose. `grep -n "TWA|twaDeg" src/ui/three/SailView3D.svelte` returns only
  camera-side uses (`:510` `presetPose(id, tackSide(twaDeg))`, `:892`, `:1118`):
  no label, no wind arrow.
- `shots/phone-run-astern-page.png` and
  `shots/phone-run-ease-astern-page.png`: the kite is up, the picture fills the
  screen, and there is no angle anywhere in the viewport. The same state in
  `shots/phone-run-plan-page.png` carries "TWA 150° AWA 118°" inside the
  drawing, with the SAIL header still on screen at the same scroll position.
- The mechanism is H-09's chip wrap: the extra row is what pushes the band's TWA
  cell above the fold in 3D and not in plan. The visible chips do not rescue it,
  since only the first three are in frame and none is lit (H-07, H-08).
- `SailView3D`'s own aria-label (`:1139`, "The numbers it draws are in the
  readouts beside it.") encodes the same assumption that the band is beside the
  picture, which is false on the phone layout.

**Impact.** The card's job is to show what this point of sail looks like, and in
3D on a phone it never names it: a sailor scrolled to the picture cannot tell a
135 from a 150. The two heroes also disagree about whether the angle is part of
the picture. Desktop is unaffected because band and hero share the fold.

**Fix.** `SailHero` has both numbers in scope (`twaDeg` at `:43`,
`result.aero.awaDeg`). Absolutely position a two-line tag in the corner of
`.slot` (`SailHero.svelte:257-275`) using the same text and the `.tag` /
`.tag.accent` styling as `PlanView.svelte:366-367`, so the label is identical in
both modes and costs no vertical space, and update the aria-label to match. Pair
it with H-09's single-row chip strip.

<a id="m-06"></a>
### M-06 — The instrument band reflows when heel reaches two digits

At two-digit heel the HELM value drops to a second line and the two gauge bars
stop sharing a baseline.

**Evidence.**
- A crop of `shots/desktop-tr-page.png` (HEEL 12°) at 300 %: "HEEL ? [C] 12°"
  is one line while "HELM ? [C]" wraps and pushes "2.23" onto a second line,
  dropping the HELM bar about 26 px below the HEEL bar. Bar geometry measured at
  x ≈ 500-613 (heel) and x ≈ 630-748 (helm). The same crop of
  `shots/desktop-brk-page.png` (HEEL 4°) and `shots/desktop-ch-page.png`
  (HEEL 8°, HELM 0.47) has both header rows inline and both bars on one baseline.
  The misalignment is visible unmagnified in the full-page shot.
- `src/ui/race/InstrumentBar.svelte:491-493` `.gauges { display: flex; flex: 0 1
  260px; gap: var(--space-4) }` with `:501-504` `.gauges > * { flex: 1;
  min-width: 0 }`, about 120 px per gauge after the gap, which "HELM ? [C] 0.59"
  only just fits and loses as soon as its neighbour takes an extra character.
- `.bar-host` declares `container-type: inline-size` (`:354-357`), so the 300 px
  override at `:523-525` is keyed on the band's own ~1320 px width at a 1440
  viewport, which is why the 260 px basis is the one in force. Phone is
  unaffected.

**Impact.** Two gauges the comment at `:278-280` says are side by side on
purpose ("helm feel only tells the truth while heel is steady") stop being
comparable exactly when the boat is over-pressed, which is the moment the
pairing exists for. The row also visibly jumps as heel crosses 10°.

**Fix.** Use the wide basis at the narrower breakpoint: `flex: 0 1 300px` at
`:492`, matching the ≥1400 container query already at `:523-524`. Alternatively
give the value span a `min-width: 4ch` so a two-digit heel cannot steal its
neighbour's width.

## Checked and not reported

Read `SailHero.svelte` (hero-head, chips and slot CSS across the phone, tablet
and cockpit breakpoints), `Race.svelte:600-700` (the phone `order` block),
`PanelTabs.svelte`, `ConditionsBand.svelte`'s `.points` scroller,
`app.css:179-208`, `InstrumentBar.svelte:396-506` and
`PlanView.svelte:366-367`, `529-546`, `601-612`; viewed all 22 phone shots and
all nine desktop page shots. Correct and not reported: the phone default hero is
the cheap plan view; the sticky panel strip sits below the hero by design, so
its absence in the scrolled shots is expected; the MAINSAIL / HEADSAIL /
GENNAKER panel headings and the phone tab strip's Jib-to-Kite swap track
`conditions.sailset` correctly; the hero picture height is identical in 2D and
3D so the swap does not move the slot; the boat is not clipped by the stage
bottom at 1440×900 in any state; and chip and label text contrast against
`--surface` is fine.
