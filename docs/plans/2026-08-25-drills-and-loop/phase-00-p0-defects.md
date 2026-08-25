# Phase 00: P0 defects

## Goal

Every P0 line in the ux-02 punchlist closed: drills score against a real
optimum with validated starts, inert drills gone, the Log form usable and
safe, the Race optimum honest about its path.

## Tasks

- [ ] H-01 Drill store requests `optimalTrim` from the drill start with locked controls held (add `fixed?: string[]` to the request or filter `TRIM_CONTROLS` by `drill.free`); answer key = that result.
- [ ] H-02 `scripts`/test: every drill start must lose ≥ 3 % (prov: assumed) against its optimum, else the test fails; medal bands widened to ≥ the held-out error and combined with control distance (interim, before v2).
- [ ] H-03 Remove or re-author the four drills on unfelt controls (halyards, inhauler, cunningham-only, kite); keep the count ≥ 8.
- [ ] H-04 Investigate light-air backstay (model wants 80 % at 6 kt flat): sweep `trimmed` over backstay × twist at 6 kt, compare to North "backstay off below 8 kt"; either a shape-layer knob fix with a test, or a documented disagreement surfaced on the score sheet.
- [ ] H-05 Log form: number rows wrap (`flex-wrap`, `min-width: 0`, `NumberField` width), no page-level horizontal scroll at 390/720/1440; new entry prefilled from committed rig + last forecast instead of zeros.
- [ ] H-06 Log editor deep-copies (`structuredClone` / `$state.snapshot`) on open; Cancel discards; Dock draft never aliases a committed entry. Test.
- [x] H-07 Race optimum: key includes race sliders (debounced), descent seeded from both current and base and the better kept; "Why" copy says "from where your sliders are now, and from the base tune". Closed 2026-08-25, with M-09 and M-26 on the same card.
- [ ] Tick the punchlist lines.

## Verification

```sh
make check
pnpm vitest run src/lib/drills.test.ts
```

Manual: open each drill, press Check untouched → no medal; Log new entry on a 390 px phone → no horizontal scroll.

## Artifacts

- `src/lib/drills.test.ts` start-validity test; updated `data/drills/j70-static.json`.

## Progress log

### 2026-08-25 — H-07 closed, plus M-09 and M-26 on the same card

- `optimalTrim` takes `opts.seeds` and runs one coordinate descent per seed,
  best score wins, ties to the earlier seed so it stays idempotent on its own
  answer. Default seeds are the trim passed in and `baseRace()`. Only the
  active controls are seeded, so a seed never rewrites the halyards or the
  inhauler. Cost roughly doubles, ~280–380 solves per search.
- `optimumKey` now includes the `TRIM_CONTROLS` values, debounce 150 → 300 ms.
  A drag re-keys sixty times and buys one search seeded from where the thumb
  stopped; the halyards and the inhauler still cost nothing. While a search is
  pending the standing answer is marked `stale`: the ghost ticks drop to 35 %
  opacity with a "re-searching from this trim" title, and Apply is disabled
  (`canApply` already read `stale`).
- Why copy rewritten: searched from the sliders *and* the base tune, keeps
  whichever finishes faster, a local optimum on the control grid, tier B.
  `OPTIMUM_REASON` says the same thing in the badge.
- M-26: `applied` in `Race.svelte` renders `optimum.moved` as
  "Mainsheet 70 % → 75 %" chips under the insight card after an apply, cleared
  by undo and by the next condition change.
- M-09: `targetOf` moved out of `Readouts.svelte` into `src/ui/format.ts` with
  a `better: 'more' | 'less'` argument and tests. `Readouts` takes an
  `objective` prop, so downwind the VMG delta reads "+0.14" for a gain like
  every other metric on the card.
- Tests: two-seed descent (≥ either single seed, deterministic, winner is one
  of the two descents), seeds-ignore-unsearched-controls, store re-keys on a
  trim change and not on a halyard, stale-while-searching, `targetOf` downwind.

### 2026-08-25 — the boat hero, compact

Owner: "the boat graphic has way too much wasted space, make it more compact
and dense."

- `PLAN_LAYOUT` in `src/ui/race/boat.ts` is the single place the plan view's
  numbers live (as `SECTION_LAYOUT` is for the sail sections). viewBox 320×264
  → **150×190**, cropped to the boat: the hull is 145 units of the 190, and the
  measured worst-case ink box across both tacks, every heel and the widest legal
  trim is `x [1.9, 147] y [6.6, 189]`.
- The wind arrows were parked on an ellipse around the whole boat, which is
  what forced a viewBox twice the hull's length — the arrows had to clear the
  transom on a run. They are a **rose off the windward bow** now: fixed centre,
  22-unit rim, arrows swinging inside it, TWA and AWA labels stacked
  underneath so they never chase an arrowhead. `windArrow`/`Ring` deleted,
  `roseArrow` replaces them.
- Heel inset deleted. The hull's own tilt carries the heel (capped at 25°, as
  before) and a `Heel 7°` tag sits in the leeward transom corner with the
  solved, uncapped angle. Both animations kept: the hull tilt still transitions
  and the telltale ribbons still flutter/lift/stall, all under
  `prefers-reduced-motion: no-preference`, untouched.
- Three-line caption + two-line legend + metrics row → a one-line caption with
  a `?` opening the existing `Sheet` explainer, a one-line three-chip legend,
  and the draft/twist/flat metrics — all moved into a flank column beside the
  drawing from 1024 px, which is where most of the height went.
- Card height at 1440×900: **~660 px → ~429 px** (svg 360 + section title 17 +
  gap 12 + card padding 40). Hull renders 275 px, **64 % of the card**, against
  ~45 % before. Sail sections and Rig elevation now sit below it inside the
  viewport.
- `geometry.ts` gains `cropBox(pts, pad)`; `boat.test.ts` uses it to prove
  nothing clips at any tack, heel or trim, and that the boat still fills > 90 %
  of the viewBox height — so the crop cannot quietly be padded back out.
