# Phase 05 — Kite flying shape from the research

## Goal

The drawn gennaker matches what is measured (research `2026-08-25-spinnaker`,
doc 02 and doc 04): the luff rotates to windward across the centreline at
deep angles instead of bowing to leeward everywhere; the clew is fixed by the
published leech and foot lengths and lifts as the sheet eases; the section
camber, draft position and twist by height come from measured flying shapes
rather than the invented constants; the curl cue is the measured one
(starts at ¾ height, folds to windward). Constants move from `prov: assumed`
to `prov: published` / `derived` wherever the research supplies a source.

## Tasks

- [x] `src/ui/three/kite.ts`: luff-bow direction as a function of apparent wind angle (leeward at reaching angles, rotating to windward past the measured crossover — doc 02 table), magnitude kept (within 3 % of the arc).
- [x] Clew from the leech/foot circle (leech 8800, foot 5700 published) with the sheet ease lifting it (doc 02 §6's circle: ~1.1 m over 25°–60°; the shipped kite ~1.4 m since #80's bulge shortens the chord); the head→clew leech was straight in this phase and bulges since #80; leech cloth length within 3 % of published.
- [x] `src/core/shape/flying.ts` `asymShape`: camber/draft position/twist by height re-based on the measured values (doc 02 §2 (a)–(c), doc 04 §3); this is `src/core` — tier stays C. `pnpm validate` re-run and the report diff recorded: `asymShape` reaches the coefficients via `shape/toOrc.ts`'s reference shapes, so it *can* move the numbers (it moved asym rows ≤ 0.12 %; see the log).
- [x] Curl cue: onset stays the tier-C sheet threshold; the animation starts at ¾ height and folds to windward per doc 02.
- [x] `ASSUMPTIONS.md` rows updated: every constant that gained a source is re-tagged; the ones still assumed say so.
- [x] Tests updated/added in `kite.test.ts` (luff side flips with AWA; clew on the circle; clew rises with ease; leech length) and `flying.test.ts` if it exists.
- [x] Baselines regenerated; progress log.

## Verification

`make check`; `pnpm test:ui`; `pnpm validate` before/after diffed in the log (hold-out verdict unchanged).

## Artifacts

`src/ui/three/kite.ts`, `src/core/shape/flying.ts`, `ASSUMPTIONS.md`, tests, baselines.

## Progress log

### 2026-08-25 — done

Branch `worktree-agent-abcbc7ba4fa76153a`. All seven tasks landed.

**Constants, old → new, with the tag each earned.** Sources are the `F*` keys
of `docs/research/2026-08-25-spinnaker`.

| Where | Constant | Old | New | prov |
|---|---|---|---|---|
| `three/kite.ts` | luff bow direction | leeward + forward, unconditional | `luffLateral(awaDeg)`: +1 leeward at AWA 64°, −1 windward at 141°, linear | **published** endpoints (`F1`, `F2`); ramp assumed |
| `three/kite.ts` | `LUFF_CROSSOVER_AWA_DEG` | — | 102.5° (midpoint of the two measured angles) | **derived**; inside doc 04 §2.1's 100–120° band, but nothing brackets it tighter than 64–124°, so treat as assumed |
| `three/kite.ts` | clew | `tack + chordDir(sheet) × KITE_CHORDS.foot` (4.845 m) | `clewOnCircle`: sphere(head, leech 8.800) ∩ sphere(tack, foot 5.700) | **derived** from Class Rules G.5.3 |
| `three/kite.ts` | `SHEET_TRIM_DEG` / `SHEET_EASE_DEG` | 25 / 60, an invented clew distance | 25 / 60, an *arc* on the derived circle | still **assumed**, inside the circle's achievable 18°–89° |
| `three/kite.ts` | bow magnitude, `SAG_MAX_FRACTION` | parabolic arc inversion, cap 0.3 | unchanged | **derived** — within 3 % of the exact circular arc (doc 02 §3.1); the cap stays assumed |
| `SailView3D.svelte` | `CURL_RIBBON_HEIGHTS` | `[0.15, 0.35, 0.55, 0.75, 0.9]`, drooping | `[0.75, 0.67, 0.58, 0.5]`, folding to windward | **published** origin, downward travel and fold direction (`F1` Ch. 4) |
| `three/kite.ts` | `CURL_EASE_THRESHOLD` | 0.55 | 0.55 | **assumed, and it stays** — curl onset vs sheet is unmeasured anywhere |
| `core/shape/flying.ts` | asym camber, ¼/½/¾ | 0.17 / 0.17 / 0.145 | 0.30 / 0.24 / 0.19 | **derived**, `F1` Table 3.1 at AWA 124° |
| `core/shape/flying.ts` | asym draft position | 0.45 at every height | 0.46 / 0.48 / 0.58 | **derived**, same table |
| `core/shape/flying.ts` | `shape.asymTwistBase` | 12° | 26° | **derived**, `F1` Fig 3.3 at running angles |
| `core/shape/flying.ts` | `DRAFT_MAX` | 0.25 | 0.32 | **derived**, the 15–32 % measured camber band |
| `core/shape/flying.ts` | `ASYM_TWIST_F` | `[0.5, 0.8, 1.0]` | unchanged | **assumed**; doc 02 §2 says it approximates the measured ramp |

**The flying shape did move the solver — flagged, not tuned.** This phase's
own prior assumption was that the flying shape does not feed the aero tables
(audit docs-consistency-01 H-19: an earlier version of this entry attributed
that to doc 04 §3, which says no such thing). It does not feed them
*directly*, but it does reach the numbers through `shape/toOrc.ts`, which
measures mean draft against `referenceShapes()` — the same shape at the base
state. Changing the asym constants therefore shifts the denominator of the
draft deviation, and with it `flat` and the coefficient deltas. Per the phase's
own instruction the constants were left at the measured values and nothing was
tuned to hide it. What actually moved:

- **No jib or upwind case changed at all.** Every non-asym golden row is
  byte-identical; only the 14 asym rows in `001-polar-points.json` and the 9
  downwind rows in `003-dock-setups.json` moved.
- **Held-out rows (TWS 8 and 14):** boat speed moved 0.005 % at the VMG rows
  and at most 0.122 % (tws14-twa120-asym), against a 3 % gate.
- **Worst fit-row move:** 0.58 % boat speed at TWS 20; `flat` at
  tws16-vmgdn-asym 0.750 → 0.788.
- **`validation/report.md` gate section is unchanged**: still `FAIL — 21/25`,
  the same three rows outside tolerance, the same worst residuals (15.1 % boat
  speed and 25.5° at TWS 14 asym vmgDn). The whole report diff is four cells:
  TWS 6 and 14 model heel (0.6 → 0.5 and 2.0 → 1.9, an ungated column), TWS 16
  vmgDn 6.37 → 6.38 kt and 170.0 → 169.5°, TWS 20 vmgDn 12.39 → 12.46 kt.

`validation/golden/*.json` regenerated with `pnpm golden` (boat and calibration
hashes unchanged — this is a deliberate solver change, not a recalibration).

**Two calls worth knowing about.**

*The leech construction stayed as phase 02 left it.* Pinning the clew to the
circle lifts it above the tack when the sheet is eased and drops it a little
below when trimmed, so the horizontal-section loft no longer has the tack as
its lowest corner. Rebuilding the trailing boundary as the polyline
tack → clew → head was tried and reverted: it is right when the clew is high
and wrong when it is low, and the phase brief says to keep the construction.
The residual is a thin wedge at the very bottom of the drawn sail, and the
leech test asserts the drawn leech column stays within 2 % of the head→clew
line's length at every sheet setting so it cannot grow.

*The bundle baseline was raised deliberately*, 125384 → 129780 B. A clean HEAD
build here is already 127114 B (parallel phases). Of this phase's +2666 B only
332 B is code; the rest is `ASSUMPTIONS.md`, which `More.svelte` imports as raw
text — so the honesty surface is first-load bytes. Recorded in
`scripts/bundle_baseline.json` history with that breakdown.

**Gates.** `make check` green (docs-check, prov-check, contrast, pytest, lint,
svelte-check 0 errors, 1130/1130 vitest). `pnpm validate` — polar gate FAIL
21/25, byte-identical to before this phase. `node scripts/bundle_check.mjs` OK
at the raised baseline. `pnpm test:ui` 30/30, and 30/30 again in the pinned
`mcr.microsoft.com/playwright:v1.62.1-noble` image. Baselines regenerated
there: only `race-3d-kite-leeward` changed; the jib baseline is untouched.

**Left for later, deliberately.** `TACK_TRAVEL_M` (0.6 m against a J/70
evidence band of 0–0.30 m) and `HALYARD_DROP_M` (1.2 m, unsourced folklore that
North and Westaway contradict) are doc 04 §2.4 and §2.5 — recorded in
`ASSUMPTIONS.md` with the conflict named, not changed here. `asymShape` is
still constant when camber, draft and twist are all strongly AWA-dependent;
that needs `FlyingShapeFn` to see the condition.
