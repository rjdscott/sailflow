# Phase 02 — Kite flying shape

**Goal.** The drawn gennaker reads as a J/70 asymmetric flying on a run and a
reach: rounded, full shoulders below the head; maximum depth around 40 % up
and 45–50 % aft in mid sections; a luff with positive round that curls to
windward when eased and bows to leeward when over-trimmed (already in
`kite.ts`, keep); a leech that opens (twists) with sheet ease; a foot with
skirt (positive round) rather than a straight line to the sprit. Today's
render is a near-flat orange sheet with a straight leech — the review
screenshot of 0.5.0 shows it.

## Sources (cite, do not restate)

`docs/research/2026-08-25-spinnaker/02-flying-shape.md` (measured flying
shapes, camber and twist distributions), `04-model-implications.md`,
ADR 0017. The J/70 asym dimensions are in `data/` via `boat.sails.asym`
(luff, leech, foot, area).

## Tasks

- [x] Read `kite.ts` end to end and `kite.test.ts`; list which of its
  section constants are `assumed` and what the research gives instead.
- [x] Sections: camber ratio per height from research doc 02 (typically
  ~20–25 % at mid-height for a runner, less at head and foot), max-draft
  position ~45–50 %, entry angle from the luff curl state; shoulders: chord
  grows fast just below the head then the girth peaks around 60–70 % up.
  Every constant carries a `prov:` tag and an `ASSUMPTIONS.md` row.
- [x] Foot: positive round (skirt), amount from research or `assumed`
  with a row.
- [x] Leech twist with sheet ease: head-to-clew twist increases as the
  sheet eases; tack-line ease raises the tack and rotates the luff to
  windward (keep existing mapping, check magnitudes).
- [x] `kite.test.ts`: assert girth peaks above mid-height, mid-section camber
  in the research band, foot round positive, area within ±10 % of the
  published area (integrate the loft), luff-curl sign unchanged.
- [x] Snapshot update (`loft.test.ts.snap` if the kite goes through it).
- [x] Visual review artefacts: `kite-run-leeward.png`, `kite-run-astern.png`,
  `kite-reach-topdown.png`, `kite-plan.png` at 1440 in the scratchpad, plus
  the same four from `main` before the change, side by side.
- [x] Plan view kite outline follows if it reads `kite.ts` (it should).
- [x] Research doc 02 gets a short dated addendum: what the drawing now
  takes from it, section by section.

## Verification

```sh
make check
pnpm test -- src/ui/three
pnpm test:ui
node scripts/bundle_check.mjs
```

## Artifacts

Updated `kite.ts`, tests, `ASSUMPTIONS.md` rows, research addendum,
before/after screenshots.

## Progress log

### 2026-08-28 — read of `kite.ts`, and the constants against research doc 02

Read end to end before touching anything. The file's constants, what tag each
carries today, and what doc 02 gives:

| Constant | Value on `main` | Tag | What research doc 02 gives |
|---|---|---|---|
| `FLYING_CHORD_FRACTION` | 0.85 | assumed | Chord/curve ratio per stripe 0.75–1.00 (`F1` Fig 3.2); the value is inside the band but is a consequence of camber, not a constant beside it (doc 04 §2.6) |
| `kiteGirthM` parabola | (0, 5.700), (½, 5.560), (1, 0) | published dimensions, ORC formula | Nothing — this is the *rated-area* quadrature, not a flying girth distribution |
| `KITE_CHORDS` | girth × 0.85 | assumed | — **and it does not reach the drawing**: `sections()` discards the stack's chord and measures luff→leech instead |
| `TACK_MIN_M` / `TACK_TRAVEL_M` | 0.05 / 0.3 m | assumed / applied from doc 04 §2.4 | 0–12 in J/70 band, contested across four sources. Already narrowed in #82 |
| `HALYARD_DROP_M` | 1.2 m | assumed, sources contradict | "Always fully hoisted" (`F9`); doc 04 §2.5. Unchanged, conflict already recorded |
| `SHEET_TRIM_DEG` / `SHEET_EASE_DEG` | 25° / 60° | assumed, inside a derived 18°–89° | Doc 04 §2.2: an arc on a derived circle. Nothing measures the endpoints |
| `LUFF_LEEWARD_AWA_DEG` / `LUFF_WINDWARD_AWA_DEG` | 64° / 141° | published | Doc 02 §3.2, two programmes. **Keep** |
| `LUFF_CROSSOVER_AWA_DEG` | 102.5° | derived | Midpoint; nothing brackets it tighter. **Keep** |
| `CURL_EASE_THRESHOLD` | 0.55 | assumed, stays assumed | Doc 02 §5: everything but onset is measured; onset is not. **Keep** |
| `LUFF_FORWARD_FRACTION` | 0.6 | assumed | Nothing |
| `SAG_MAX_FRACTION` | 0.3 of the luff | assumed, does no work | Doc 04 §2.3 proposes the circular-arc bound; not done, still not binding |
| `LEECH_BULGE_MIN_M` / `_TRAVEL_M` | 0.4 / 0.7 m | assumed (photographs) | Doc 02 §6 pins the leech's *length*; no stand-off profile exists anywhere |
| `LEECH_BULGE_PEAK_EXPONENT` | 1.5 (peak ~63 %) | assumed | Nothing |
| `LEECH_BULGE_FORWARD_FRACTION` | 0.4 **forward** | assumed | **Contradicted.** `F2`: "the leech moves aft and outboard, opening the sail up" (doc 02 §3.2) |
| Foot round | *absent* — the foot is a straight line | — | Nothing measures a foot; the class caps the straight foot at 5 700 mm and is silent on the cloth |
| Section camber / draft position | from `shape.asym` | derived (#76, from `F1` Table 3.1) | Already applied. `src/core` out of scope here |

Two things fell out of that read and set the whole phase:

1. **`KITE_CHORDS` never reaches the picture.** `sections()` computes each
   chord as the horizontal distance from the bowed luff to `leechAt`. So the
   girth model sets the solver's rated area and the **leech sets the
   silhouette**. Every "the sail is too narrow" symptom is a leech symptom.
2. **The complaint is measurable against a class dimension.** Taking a
   measurer's four dimensions off the drawn loft and running ORC's own
   spinnaker area formula on them (the formula the published 45.64 m² is the
   output of) gave 39.9–42.4 m², with a half width of 4.79–5.15 m against a
   published 5.560. The sail was 7–14 % narrow at exactly the height a
   spinnaker carries its shoulders. That is "reads like a jib", in millimetres.

### 2026-08-28 — geometry, and what each section now does

Three changes, all in `kite.ts` except one new loft primitive.

- **Leech bulge direction: forward → aft** (`LEECH_BULGE_FORWARD_FRACTION`
  0.4 renamed `LEECH_BULGE_AFT_FRACTION` 0.45). The one source *correction* in
  the phase rather than a fit: `F2` measured the leech moving aft and
  outboard. Forward pushed the leech toward the luff and shortened every
  section it touched. Worth 0.13 of the sail's height in where the girth peaks
  (h 0.19 → 0.32), at no cost anywhere else.
- **Leech bulge amount: 0.4 m/+0.7 m → 0.95 m/+0.45 m**, peak exponent
  1.5 → 1.6 (peak 63 % → 65 % of the leech). A fit to the class dimensions,
  tagged assumed. The *ease travel came down* even though more travel drew
  better shoulders: the bulge shortens the head→clew chord and so lifts the
  clew, and +1.1 m of travel lifted it 2.16 m against Deparday's measured
  1.4 m. +0.45 m lifts it 1.46 m.
- **Foot skirt** (`FOOT_SKIRT_M` 0.55 m over the bottom 0.3 of the height),
  drawn by a new optional `Section.dropM` in `loft.ts` — a half-sine sag along
  the chord, both ends pinned, so no published dimension moves and the main
  and jib are unchanged (the pchip and the per-vertex sine are skipped when no
  section sets it). Assumed: nothing measures an asymmetric's foot.

Camber, draft position, luff bow magnitude, luff bow *direction*, the clew
circle, the sheet band and the curl threshold are all untouched, and
`src/core` is not in the diff.

### 2026-08-28 — proof

Measured off the drawn loft at the app's own downwind trim
(`baseRaceDown`: sprit 100, halyard 100, tack line 50, sheet 50), AWA 114° and
150°:

| Measured off the loft | before | after | target |
|---|---|---|---|
| Half width, mid-luff to mid-leech | 4.79 / 5.15 m | **5.48 / 5.78 m** | 5.560 m published |
| ORC area of the drawn sail | 39.9 / 42.4 m² | **44.2 / 46.3 m²** | 45.64 m² published, ±10 % |
| Girth peak height | 0.19 / 0.21 | **0.30 / 0.32** | — |
| Chord at ¾ height ÷ peak | 0.56 / 0.58 | **0.67 / 0.68** | — |
| Chord at 0.9 height ÷ peak | 0.26 / 0.28 | **0.33 / 0.33** | — |
| Mid-section camber | 24 % of chord | **24 % of chord** | 20–25 % (`F1`) |
| Foot round | 0 | **0.55 m below the tack–clew line** | positive |
| Clew rise across the sheet band | 1.44 m | **1.46 m** | 1.4 m measured (`F1`) |
| Volume off the head–tack–clew plane | 52.9 m³ | **61.6 m³** | ~65 m³ scaled from `F1` |
| Cloth ÷ rated area | 1.06 / 1.08 | **1.21 / 1.22** | > 1, by the camber surplus |
| Half width on a tight reach (AWA 70°) | 2.86 m | **3.64 m** | still short — see below |

Seven new assertions in `kite.test.ts`, on both tacks: the class half width,
the ORC-measured area, the girth peak and shoulder widths, the mid-section
camber band, the skirt's sign and its pinned corners, and a characterisation
test for the twist. Four existing assertions had their bounds moved with a
reason in the comment (leech chord ≥ 0.90 of cloth, foot-row end within 1 m of
the clew, leech stand-off travel ≥ 0.25 m, and the flying-shape tests moved
onto `baseRaceDown`'s trim rather than `MID`'s retracted sprit). Luff-curl
sign and threshold are untouched and their tests unmodified.

**Area gate, stated exactly.** "Within ±10 % of the published area" is
asserted against the sail's *measurement*, not its cloth: 45.64 m² is the
output of `(SLU+SLE)/2 · (SFL+4·SHW)/6` on four measured dimensions, so the
comparison recovers those four from the loft and runs the same formula. The
mesh's own surface area is 1.21–1.22× rated and must be — a section carrying
24 % camber spans its girth with ~15 % more cloth than the girth — and it is
asserted separately with a 1.35 ceiling so the surplus stays a camber surplus
rather than a bag. On `main` the measured area was 0.87–0.93 of published,
which would have failed this gate.

### 2026-08-28 — three findings recorded rather than fixed

1. **The girth peak cannot reach 60–70 % of the height**, which is what the
   task list above asked for. The foot is a published 5.700 m and the half
   width a published 5.560 m, so a maximum above mid-height needs a mean girth
   the 45.64 m² rating cannot pay for — the sail would have to close from full
   width to a point over its top three-tenths. 0.30–0.32 is what the class
   dimensions allow, up from 0.19–0.21. What carries the picture turns out not
   to be the peak's height but how much width survives above it, and that is
   what the test asserts.
2. **Drawn twist runs the wrong way against the sheet**: 24° at full trim,
   14° mid, 2° fully eased, where `F1` measured 4° with the sheet in on a
   reach and 26° with it out on a run. Structural, not a constant — the sheet
   band swings the foot 35° while the head is pinned at the masthead, so the
   upper leech follows by only the 11–14° the bulge gives it, whatever the
   bulge is set to (checked at 0.4 m/+1.4 m as well as at the shipped values).
   Fixing it needs the sheet band narrowed to ~14° or the head given a
   rotation of its own — the sheet's geometry, not the sail's shape. Held as a
   characterisation test and an `ASSUMPTIONS.md` row.
3. **On a tight reach the sail is still narrow** — 3.64 m of half width at
   AWA 70° against 5.560, up from 2.86 m. `luffLateral` swings the luff to
   leeward there, onto the same side as a leech bulge that does not know about
   the apparent wind angle. Improved, not solved; the flying-shape assertions
   are made at the 100–150° AWA the J/70 actually runs at, and the reaching
   case is held loosely and named.

### 2026-08-28 — visual review

Eight shots at 1440 from a `pnpm dev --port 5195`, `main` and branch, in the
scratchpad: `kite-{before,after}-{leeward,astern,topdown,plan}.png`.
Run + Leeward, Run + Astern, Broad reach + Top-down, and the Plan view.

- **Leeward, before**: a straight-sided orange triangle, widest a fifth of the
  way up, tapering in one unbroken line to a needle beside the masthead, with
  a hard diagonal foot to the sprit. **After**: a rounded shoulder that
  carries width to just under the head, a convex leech, and a foot that hangs
  below the tack–clew line instead of ruling a line to the sprit.
- **Astern, before**: a narrow wedge tucked behind the main, straight leech.
  **After**: the shoulder is the widest thing on screen at three-quarter
  height and the leech sweeps out and aft of the main.
- **Top-down, broad reach**: a deeper pocket, visible as more curvature
  between luff and leech; the smallest of the four changes, because at broad
  reach the sheet is trimmed and the bulge is at its minimum.
- **Plan**: the outline follows `kite.ts` by construction — `PlanView` samples
  `spine` and `leechAt` — and it does. The kite runs off the left of the plan's
  viewBox at 150° TWA on this tack, before and after; that framing is
  `PLAN_LAYOUT`'s and is not phase 02's to change.

### 2026-08-28 — gates

`make check`, `pnpm test -- src/ui/three`, `pnpm test:ui` and
`node scripts/bundle_check.mjs` all green; last lines quoted in the PR body.

