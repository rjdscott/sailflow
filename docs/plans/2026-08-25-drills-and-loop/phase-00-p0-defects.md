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
- [ ] H-07 Race optimum: key includes race sliders (debounced), descent seeded from both current and base and the better kept; "Why" copy says "from where your sliders are now, and from the base tune".
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

_None yet._
