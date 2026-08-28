# Phase 01 — Conditions band

**Goal.** The instrument band is two halves. Left: what the boat is doing
(BSP · %polar · VMG · heel · helm · verdict). Right: what the world is doing
(TWS · TWA · sea state · crew · sail set), each value drawn with the same
`InstrumentCell` type ramp as the left and each directly editable in place.
`ConditionsStrip` and its `Edit` sheet are deleted; the header line carries
title, density and lede only. Audit ux-04 H-01, M-01, M-02, M-08, M-09, L-03.

## Layout contract

```
┌──────── BOAT ─────────────────┬──────── CONDITIONS ──────────────┐
│ BSP   %POLAR  VMG   HEEL      │ TWS        TWA        SEA        │
│ 5.2   93 %    3.85  6° ▮▯     │ − 10 kt +  ◐ 42° ↗    Ripple ▾   │
│ HELM ▮▯ 0.27                  │ [Light][Med][Heavy]   300 kg ▾   │
│                               │ ○Close-hauled ○Reach ○Run  Jib ▾ │
├───────────────────────────────┴──────────────────────────────────┤
│ ✎ 0.29 kt below target: Trim mainsheet one click …               │
└──────────────────────────────────────────────────────────────────┘
```

- ≥ 1280 px: two halves side by side, 50/50, one `Panel`-styled card with a
  1 px divider. 720–1279: halves stack, conditions first. < 720: each half
  is two rows of cells; point-of-sail chips become a horizontal scroller.
- Right-half cells: `TWS` = the existing stepper (44 px hits on phone, 28 px
  in the cockpit, as today) around an `InstrumentCell` value. `TWA` = a
  small rose (boat glyph, TWA arrow, AWA arrow — reuse `roseArrow` from
  `PlanView.svelte`) with the number beside it; pointer-drag on the arrow
  sets `conditions.twaDeg` (20–180, snap 1°); arrow keys ±1°, shift ±5°.
  `Sea` = a `Segmented` popover with the five `SEA_STATES` labels; its `?`
  says "Added resistance from waves, tier B, `core/hydro/waves.ts`". `Crew`
  = stepper, 5 kg, class limits from `activeBoat.crew`. `Sail set` = Jib /
  Gennaker `Segmented`, auto-flipped by the point-of-sail chips as today.
- Point-of-sail chips move under the TWA cell as a preset row and *deselect*
  when `twaDeg` leaves the chip's band (M-02).
- Presets Light / Medium / Heavy / Downwind: they rewrite trim, so they
  leave the conditions surface. Add them to `ActionsBar` as a `Start from ▾`
  menu whose items say "Light day — wind + trim" (M-03).
- Crew weight leaves `panels/Helm.svelte`; the panel is retitled "Helm"
  (L-03).
- Every right-half value carries a `?` → the existing `Sheet` explainer
  (`READOUT_EXPLAIN` gains `tws`, `twa`, `sea`, `crew`, `sailset` entries).
- `DrillView` passes `conditionsEditable={false}`; the right half renders
  the drill's condition read-only with a lock glyph.

## Tasks

- [x] `src/ui/race/ConditionsBand.svelte` — the right half, props
  `{ editable = true }`, reads/writes `conditions` directly (it already does
  in `ConditionsStrip`).
- [x] `src/ui/race/WindRose.svelte` — boat glyph + TWA/AWA arrows, drag +
  keyboard, `role="slider"` with `aria-valuenow`, tests on the angle math
  (`windRose.test.ts`: pointer → degrees, clamp, snap).
- [x] `InstrumentBar.svelte` — wraps left + `ConditionsBand`; `data-tier`
  behaviour unchanged for the left half; container query for the split.
- [x] `ActionsBar.svelte` — `Start from ▾` presets menu with the "wind +
  trim" wording and the existing `Back to my trim` undo.
- [x] `panels/Helm.svelte` — crew removed, title "Helm".
- [x] `Race.svelte` — `ConditionsStrip` removed from `.head`; delete
  `ConditionsStrip.svelte`; delete the `.head [aria-label='Conditions']`
  phone rule.
- [x] `explain.ts` — five new explainer entries, prose only (no numbers → no
  `prov:`).
- [x] `pointOfSail.ts` — `bandOf(twaDeg)` returns the chip whose band holds
  the angle or `null`; test.
- [x] Playwright snapshots re-baselined at 390 / 768 / 1440; new assertion:
  at 390 the band's bottom edge < 844 px on cold load with the tour skipped.

## Verification

```sh
make check
pnpm test -- src/ui/race
pnpm test:ui
```

Manual: 1440 — drag the rose from 42° to 150°: sail set flips to Gennaker,
BSP/VMG animate, the `Run` chip lights. 390 — the whole band is above the
fold; every right-half cell has a 44 px hit.

## Artifacts

- `src/ui/race/ConditionsBand.svelte`, `src/ui/race/WindRose.svelte`,
  `src/ui/race/windRose.test.ts`
- `src/ui/race/ConditionsStrip.svelte` deleted
- Updated snapshots under `tests/ui/`

## Progress log

### 2026-08-28 — built, `make check` and `pnpm test:ui` green

Branch `feat/conditions-band`, four commits. `ConditionsStrip.svelte` is
deleted and nothing references it.

**What shipped.** `ConditionsBand.svelte` is the right half: TWS, TWA, sea,
crew and sail set, each drawn with `InstrumentCell` and each editable in
place — steppers for wind (±1 kt) and crew (±5 kg), `WindRose.svelte` for the
angle, a segmented popover for the sea, Jib/Gennaker for the sail. The
point-of-sail chips sit under the cells and deselect through `bandOf()`.
`InstrumentCell` gained one prop, `onactivate`, which turns the *value* into
the control without touching the type ramp; the sea cell is the only user of
it so far. `InstrumentBar` takes `condition` and `conditionsEditable` in place
of `twaDeg`/`twsKt`, and its three primary numbers tween (260 ms, `Tween`,
`prefersReducedMotion` collapses it to an instant set).

**Decisions worth knowing.**

- *The band moved above the hero on a phone.* The gate is "the whole band is
  above the fold at 390×844". With the hero first it could not be: measured
  head 196 + hero 483 + strip 60 put the band's bottom at 1052 px. Band first
  puts it at 752. That is ADR 0021's stated phone order (conditions → numbers
  → boat), arriving a phase early; phase 02 owns the rest of the phone order
  and the tour, and should treat this as done.
- *`bandOf` has an end, deliberately.* Midpoint bands tile 30–180°, so the
  honest `null` is the ends: inside `LUFFING_DEG` (30°, `prov: assumed`) you
  are head to wind, not close-hauled, and nothing is pressed.
- *Crew's range moved into an `aria-label`.* A ± stepper has nowhere to put
  bounds that the slider it replaced announced for free, so `.stepper` is a
  `role="group"` named "Crew weight, 255 to 340 kilograms". `boat.spec.ts`
  reads the class limits off it.
- *`focusPanel` gained a fallback.* `h` looked for `input[type=range]` inside
  the Helm panel, which has none since crew left; it now falls back to the
  panel's first control rather than focusing nothing.

**The one promise this phase weakened.** `race.spec.ts`'s 1536×864 case
asserted both sail panels' *first sliders* were above the fold. The band is
184 px where the readings alone were ~90, and ADR 0016 floors the hero at
480 px, so the first Mainsail slider measured 939 px against 845 before. The
test now pins the band, the hero and both panel *headings* in the first
viewport with the first slider at most 100 px below the fold. ADR 0021 took
this trade knowingly ("the cockpit is denser"); phase 05 is where to buy the
height back if the owner wants it.

**Also re-baselined** (all in `tests/ui/`): the phone stack is band → hero →
strip; the band's phone extra is HELM, not TWA; the v0 share link reads its
wind off the band; and the buffer-churn drag names the jib sheet, because
`input[type=range]:first` used to resolve to the closed conditions sheet's
hidden wind slider and now resolves to the mainsheet, whose boom legitimately
rebuilds a `TubeGeometry`.

**Gates.** `make check`: docs-check, lint, `svelte-check` 0 errors 0 warnings,
1285 vitest tests green. `pnpm test:ui`: 77 passed. Nothing red for reasons
outside this change.

