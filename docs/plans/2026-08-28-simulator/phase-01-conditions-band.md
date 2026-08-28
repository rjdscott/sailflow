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

- [ ] `src/ui/race/ConditionsBand.svelte` — the right half, props
  `{ editable = true }`, reads/writes `conditions` directly (it already does
  in `ConditionsStrip`).
- [ ] `src/ui/race/WindRose.svelte` — boat glyph + TWA/AWA arrows, drag +
  keyboard, `role="slider"` with `aria-valuenow`, tests on the angle math
  (`windRose.test.ts`: pointer → degrees, clamp, snap).
- [ ] `InstrumentBar.svelte` — wraps left + `ConditionsBand`; `data-tier`
  behaviour unchanged for the left half; container query for the split.
- [ ] `ActionsBar.svelte` — `Start from ▾` presets menu with the "wind +
  trim" wording and the existing `Back to my trim` undo.
- [ ] `panels/Helm.svelte` — crew removed, title "Helm".
- [ ] `Race.svelte` — `ConditionsStrip` removed from `.head`; delete
  `ConditionsStrip.svelte`; delete the `.head [aria-label='Conditions']`
  phone rule.
- [ ] `explain.ts` — five new explainer entries, prose only (no numbers → no
  `prov:`).
- [ ] `pointOfSail.ts` — `bandOf(twaDeg)` returns the chip whose band holds
  the angle or `null`; test.
- [ ] Playwright snapshots re-baselined at 390 / 768 / 1440; new assertion:
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

