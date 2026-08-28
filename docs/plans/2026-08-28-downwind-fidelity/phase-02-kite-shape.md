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

### 2026-08-28 — review round: two of the findings were defects

PR #116 review: the twist inversion and the kite hiding behind the main are
things a sailor sees, not characterisations to hold. Both fixed.

**Twist.** Four constructions were measured before one held every published
dimension:

| Construction | Twist at ¾ height, trim → ease | What broke |
|---|---|---|
| As shipped in round 1 | 24° → 2° | nothing; but backwards |
| Bulge direction = `chordDir(sheetRad + twist)` | 15° → 10° | nothing; still backwards |
| Section angle set from an explicit twist ramp | 3° → 22° ✓ | **drawn leech 10.7 m** against a published 8.800 (+22 %) — the #76 defect back |
| …plus a chord taper to pull that leech back | 3° → 22° ✓ | half width to 3.79 m (−32 %) — §2's shoulders undone |
| **Shipped**: bulge direction + sheet band 40°–55° | **2.3° → 8.0°** ✓ | nothing |

The third row is the reviewer's suggested mapping and it is why it was not
taken: in a loft whose sections are horizontal and whose three edges are
published, setting a section's *angle* independently moves its outboard end
off the leech, and the drawn leech is then the locus of those ends. Its length
is emergent, and it emerges long — exactly what #76 fixed.

What did work is two changes that leave the section angles emergent:

- **`bulgeDir` = `chordDir(sheetRad + twist)`**, with `TWIST_TRIM_DEG` = 4° and
  `TWIST_EASE_DEG` = 26° `prov: published` from `F1` Fig 3.3 (doc 02 §2c). Near
  the head the luff and the leech both converge on the masthead, so the bulge's
  direction *is* the head's chord angle. It was a fixed 66° off the centreline,
  which pinned the top of the sail whatever the sheet did.
- **Sheet band 25°–60° → 40°–55°.** The head is fixed at the masthead, so the
  only thing the sheet rotates is the foot; over a 35° band the foot outran
  anything the leech could do. 15° is the widest band, measured, whose twist
  still rises monotonically with ease — at 26° the mid-sheet state dips below
  the trimmed one. Cost: the sheet swings the sail 15° rather than 35°. The
  clew's rise across the band is unchanged at 1.42 m (`F1` measures 1.4 m)
  because the bulge's travel grew from +0.45 m to +1.1 m to compensate.

Direction is now right and **the range is still short** — 2.3° → 8.0° against
`F1`'s 4° → 26°. The cap is the clew circle: the published leech and foot pin
the clew, and it will not let the head open further without the drawn leech
leaving its published 8.800 m. Closing that gap needs the head given a rotation
of its own, which is a mapping change and an ADR. Logged as a follow-up in the
plan README; the test holds the direction, the monotonicity, the trimmed value
inside `F1` ± 6° and a floor on the eased one.

**The kite behind the main.** Measured, not a camera artefact. At AWA 150° the
half-height section's centroid sat **0.87 m** to leeward of the mast against
the mainsail's **1.04 m** — the kite's body was *inboard of the main*, so from
astern only its edges showed. The pocket was already leeward of the chord line
(`camberDir` is the leeward normal); what was wrong was the chord line itself.
`LUFF_FORWARD_FRACTION` splits the luff bow — magnitude fixed by the cloth
surplus at 2.4–2.5 m — between forward and athwartships, and at 0.6 it threw
the mid-luff **2.1 m to windward** at running angles, past the windward rail,
dragging the sail onto the centreline. Raised to 1.1: the centroid is now
**1.26 m** to leeward, outboard of the main's 1.04. The luff still crosses to
windward — `luffLateral`'s published direction is untouched — by 1.5 m instead
of 2.1. It also takes the tight-reach half width from 2.86 m to **4.22 m**,
which is most of the reaching narrowness finding above.

**Plan-view clipping** logged as a follow-up in the plan README rather than
fixed: `PLAN_LAYOUT` is cropped to the boat and belongs to neither phase.

Re-measured at the app's own downwind trim, AWA 114° / 150°:

| Measured off the loft | `main` | round 1 | **round 2** | target |
|---|---|---|---|---|
| Half width | 4.79 / 5.15 m | 5.48 / 5.78 | **5.39 / 5.77 m** | 5.560 published |
| ORC area of the drawn sail | 39.9 / 42.4 m² | 44.2 / 46.3 | **43.6 / 46.1 m²** | 45.64, ±10 % |
| Drawn leech | 8.76 / 8.77 m | 8.71 / 8.71 | **8.69 / 8.69 m** | 8.800 published |
| Girth peak height | 0.19 / 0.21 | 0.30 / 0.32 | **0.28 / 0.32** | — |
| Chord at ¾ height ÷ peak | 0.56 / 0.58 | 0.67 / 0.68 | **0.69 / 0.70** | — |
| Twist at ¾ height, trim → ease | 24 → 2° | 24 → 2° | **2.3 → 8.0°** | 4 → 26° (`F1`) |
| ½-height centroid to leeward, AWA 150° | 0.87 m | 0.87 m | **1.26 m** | ≥ 1.2; main's is 1.04 |
| Clew rise across the sheet band | 1.44 m | 1.46 m | **1.42 m** | 1.4 measured (`F1`) |
| Half width on a tight reach (AWA 70°) | 2.86 m | 3.64 m | **4.22 m** | still short |

### 2026-08-28 — visual review, round 2

Eight shots re-taken, same four views, same scratchpad names.

- **Astern** is the shot the round answers. Before, the kite sat directly ahead
  of the main with only a rim of orange either side. After, its body is clear
  to leeward of the main and it is the widest thing in the frame, with the
  shoulder above the main's head and the skirted foot below its boom.
- **Leeward**: rounder still than round 1 — the luff has moved forward rather
  than across, so the sail's belly reads as depth instead of as a sheet seen
  edge-on.
- **Top-down**: the pocket is now plainly to leeward of the tack–clew line and
  the sail no longer overlaps the main's outline.
- **Plan**: unchanged in kind; still clipped by `PLAN_LAYOUT`, now logged.

