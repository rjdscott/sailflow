# The flying shape of an asymmetric, and what moves it

- **Date:** 2026-08-25
- **Scope:** what the sail's shape actually *is* in the air, measured where
  measurements exist, so the drawn kite in `src/ui/three/kite.ts` can stop
  being entirely `prov: assumed`. Source keys `F1`–`F12` are defined in
  [`README.md`](README.md).
- **The headline:** there is a full-scale photogrammetric dataset for a
  **J/80** — the J/70's larger sister, same builder, same sprit-tacked
  asymmetric, same sportboat shape — with per-height camber, draft position
  and twist at four apparent wind angles. Most of `kite.ts`'s invented
  constants have a measured counterpart. Some of them are wrong.

---

## 1. The single best source: Deparday 2016

Benoit Deparday's PhD, *Experimental studies of Fluid-Structure Interaction
on Downwind sails* (`F1`, free PDF), instrumented a full-scale **J/80** with
a 65 m² asymmetric: photogrammetric flying-shape capture at 25 Hz, load cells
on all three corners, 45 pressure taps. Accuracy is stated as better than
**1.5 % (0.15 m over 10 m)**, with edge-length errors under **1.2 %** average
and precision **0.3 % of luff length** (`F1`).

Why it transfers to the J/70 better than anything else in the literature: the
J/80 is an 8 m sportboat with a sprit-tacked nylon asymmetric, the J/70 is a
6.9 m sportboat with a sprit-tacked nylon asymmetric. Sail dimensions differ
by roughly the square root of the area ratio; the *shape parameters* — camber
as a fraction of chord, draft as a fraction of chord, twist in degrees — are
dimensionless and should carry across with far less violence than borrowing
from an America's Cup model or a cruising boat.

Second source of comparable quality: **Motta, Flay, Richards, Le Pelley,
Deparday & Bot**, *Ocean Engineering* 90:104–118 (2014) (`F2`), which measured
both a Stewart 34 and the same J/80 full scale with **VSPARS** (`F3`), plus a
VO70 wind-tunnel model with two gennakers.

---

## 2. Camber, draft position and twist, by height

**Deparday Table 3.1** (`F1`), full-scale J/80. Camber and draft are
percentages of that section's own chord; twist is the horizontal angle of the
section chord relative to the foot chord.

| Section height | **AWA 64°** camber | draft | twist | **AWA 124°** camber | draft | twist |
|---|---|---|---|---|---|---|
| foot | 20 % | 49 % | — | 31 % | 41 % | — |
| 1/6 | 28 % | 44 % | 3° | 32 % | 46 % | 10° |
| 2/6 | 27 % | 39 % | 6° | 28 % | 46 % | 18° |
| 3/6 | 26 % | 44 % | 6° | 24 % | 48 % | 23° |
| 4/6 | 18 % | 45 % | 3° | 20 % | 49 % | 25° |
| 5/6 | 15 % | **61 %** | 4° | 18 % | **67 %** | 26° |

Four things fall out of this table, and each of them contradicts something the
app currently draws.

**(a) Camber is 15–32 %, and the maximum is low, not at mid-height.** The
fullest sections are at **1/6 to 2/6 of the height**, and the sail flattens
steadily toward the head. `src/core/shape/flying.ts` currently sets
`shape.asymDraft = 0.17` with per-height multipliers `[1.0, 1.0, 0.85]` —
17 % / 17 % / 14.5 % at the quarter, half and three-quarter heights. Measured
at a running angle, those stations are roughly **30 % / 24 % / 19 %**. The
model is about **40 % too flat**, and its flat-then-taper profile has the
wrong shape.

**(b) Draft position moves aft with height, sharply above 4/6.** It sits at
39–49 % over the lower two-thirds and jumps to **61–67 % at 5/6 height**. The
model uses a single constant `asymDraftPos = 0.45` at every height. The 45 %
is a good value for the lower sail and badly wrong at the head — which is
also the part of the sail the app clamps to `DRAFT_POS_MAX = 0.6` anyway.

**(c) Twist is far larger downwind than the model thinks.** Foot-to-top twist
is **~4° at AWA 64°**, over **20° at 96°**, **26° at 124°** and **28° at
141°** (`F1`, Fig 3.3). The model's `asymTwistBase = 12°` is roughly right for
a tight reach and **less than half** the measured value at the running angles
the kite is actually used at. Twist also rises near-linearly from foot to
half-height then flattens, which the model's `[0.5, 0.8, 1.0]` multipliers
approximate reasonably.

**(d) At tight AWA the top half behaves differently.** Deparday describes the
upper sail as "seemingly bridled and forced to stay tight" (`F1`) — twist
peaks at half height and then *decreases*. That is a qualitatively different
curve from the deep-angle shapes, not a scaling of them.

### Camber against apparent wind angle

Motta et al. Table 1 (`F2`), foot section, wind-tunnel VO70 model, two
gennakers. "Experimental" is the physical measurement:

| AWA | camber (% chord) | draft (% chord) |
|---|---|---|
| 60° | 16.7 % | 34.1 % |
| 80° | 25 % | 39 % |
| 100° | 30.9 % | 44.9 % |
| 120° | 36.6 % | 44.7 % |

So camber roughly **doubles from 17 % to 37 %** as the boat bears away from
60° to 120° AWA, and draft moves **aft from 34 % to 45 %**. This is the
strongest published statement that spinnaker shape is a function of apparent
wind angle, and it agrees with Deparday's foot row (20 % at 64°, 31 % at
124°).

For a single canonical number, Souppez, Arredondo-Galeana & Viola (`F4`) build
their reference spinnaker section at **22.32 % camber**, describing a circular
arc of "over 20% camber" as "a typical cross section through a modern
asymmetric spinnaker" (`F4`). That sits mid-range of everything above.

**Contradiction to record.** A figure of **0.40c camber with 16° twist**
circulates widely, attributed to a Viola/Flay wind-tunnel spinnaker model. It
could not be confirmed in the 2009 IJSCT primary text (`F5`), and 0.40c is
deeper than anything measured full scale. Most likely it is a designed mould
camber at the mitre rather than a per-stripe flying camber. Flag it, do not
use it.

**Second contradiction, inside one paper.** Motta et al. report that on the
Stewart 34 the half-height section "does not change significantly in spite of
the large 40° change in AWA" (`F2`) — attributed to light winds and a
sub-optimal hoist. That directly contradicts the strong AWA-dependence in the
same paper's VO70 table and in Deparday's J/80. Use the AWA-dependence; note
the exception.

---

## 3. Luff bow: magnitude, and the direction the app gets wrong

### 3.1 How much

The luff of an asymmetric is longer than the straight line between its tack
and head — that surplus is the whole of the bow, and it is exactly the model
`kite.ts` already uses. The question is how much surplus.

**Measured, J/80** (`F1`, §2.2 p.50): luff **12.18 m**, and the luff is
"1 m longer than the distance between the head and tack points" (`F1`). So

> luff arc / straight tack–head chord = 12.18 / 11.18 = **1.089**, an
> **8.9 % excess**.

Deparday's own summary of why: "Compared to upwind sails, the luff is much
more rounded" (`F1`).

Converting an 8.9 % excess to a bow depth, treating the luff as a planar
circular arc (θ/sin θ = 1.089 → θ ≈ 0.709 rad → sagitta/chord = 0.186):
**bow ≈ 18.6 % of the tack–head distance ≈ 2.07 m on the J/80**. That is an
*upper bound* — the real luff is a space curve, so part of the surplus goes
into fore-and-aft curvature rather than pure lateral sag.

**Now the J/70, as the app draws it.** With the tack at the sprit tip and the
head at the masthead, `kite.ts` puts the tack–head distance at **9.28 m**
against a published luff of **10.800 m**:

| App state | tack–head chord | luff excess | circular-arc bow | `kite.ts` parabola bow |
|---|---|---|---|---|
| tack down, full hoist | 9.28 m | **16.4 %** | 2.36 m (25.4 % of chord) | **2.30 m** |
| tack eased, full hoist | 8.74 m | 23.6 % | 2.69 m | 2.60 m |
| tack eased, halyard eased | 7.68 m | 40.6 % | 3.17 m | 3.00 m (capped) |

**Two conclusions, and they point opposite ways.**

*The magnitude model is sound.* `kite.ts` inverts a parabolic arc-length
approximation and lands within **3 %** of the exact circular-arc sagitta at
every state. That is a real corroboration of an existing choice — the comment
in the file claiming "within about 2 % of the exact arc" checks out.

*The geometry it is applied to is suspect.* The app's own numbers give the
J/70 a **16.4 % luff excess against the J/80's measured 8.9 %** — nearly
double. Either the J/70's class-maximum kite genuinely carries far more luff
round relative to its short rig (plausible: luff is capped at 10 800 mm on an
8.5 m mast, and luff/foot is 1.895 against the J/80's 1.67), or the drawn
head or tack is misplaced. At the J/80's ratio the J/70's tack–head distance
would be **9.92 m**, 0.64 m more than the app draws. This is the sharpest open
question in the geometry and it is resolvable: measure a photograph.

The existing cap, `SAG_MAX_FRACTION = 0.3` of the luff (3.24 m), is looser
than the circular-arc bound at every state except halyard-eased, where it
binds slightly (arc 3.17 m, cap 3.00 m). It is doing little work and could be
replaced by the arc bound itself, which is derived rather than assumed.

### 3.2 Which way — and this is a genuine error in the app

`kite.ts` bows the luff **to leeward and forward, always**. Two independent
measurement programmes say the direction **flips with apparent wind angle**:

- **Deparday** (`F1`): at AWA 64°, "the whole luff is on the leeward side of
  the boat". At deep angles, "for deeper AWA, the spinnaker has a more rounded
  shape with the luff rotating to the windward side".
- **Motta et al.** (`F2`, §4): "As the AWA is increased, the luff moves more to
  windward, towards and across the centreline", while the leech moves aft and
  outboard, opening the sail up.

So: **luff to leeward at reaching angles (~60–70° AWA), swinging to windward
and across the centreline by 120–140° AWA.** The J/70's own downwind optimum
sits at 142–174° TWA (see [`03`](03-trimming-best-practice.md) §6), which is
deep in the windward-luff regime. The app currently draws the luff on the
wrong side of the boat at the angles the kite is mostly used at, and the
whole point of the "rotate to weather" coaching cue is the rotation the
drawing refuses to perform.

Deparday also settles the designed-versus-flying question: relative to the
design shape, every flying shape has "the luff more curved with the control
points more outwards" (`F1`). **Flying luff projection exceeds designed luff
round, measurably.**

**Contradiction to record.** A claim circulates that asymmetric luff length
ran 112 % of the straight-line measurement in 1982–83 designs and 103–104 % in
modern ones. It originates on a paywalled forum and could not be opened. It
disagrees with the measured J/80 value of 108.9 %, which sits between the two.

---

## 4. Head rotation and "projection", geometrically

"Rotating the kite to weather" is not the head alone moving. Measured, it is
a whole-sail deformation, and it is **volume-preserving**:

- The **luff and tack swing across to the windward side of the centreline**
  while the **leech opens aft and outboard** (`F1`, `F2`).
- **Clew travel from AWA 64° to 141°: 2.3 m further forward, 1.4 m higher, and
  only 0.5 m further to leeward** (`F1`).
- Projected area onto the head–tack–clew plane **shrinks** from 52 to 47 m²
  (of 65 m² cloth) as AWA goes 64° → 141°, while the **volume between the sail
  and that plane stays essentially constant at 110 ± 3 m³** (`F1`, Table 3.2).
- Max depth off the HTC plane: **3.1 m at AWA 64°, 3.3 m at 124°**; the design
  shape is slightly under 3 m at 102 m³, i.e. **the flying sail is fuller than
  the mould** (`F1`).
- The deepest point sits "slightly above and forward of the centroid" of the
  head–tack–clew triangle, migrating toward the clew as AWA increases; at
  141° it is at the midpoint of the head median. The iso-depth contour is
  **circular at 64° and an elongated bean at deep AWA** (`F1`).

Scaled to the J/70's 45.64 m² by area (linear dimensions as √area, volume as
area^1.5):

| Quantity | J/80 measured | **J/70 scaled** |
|---|---|---|
| Max depth off HTC plane | 3.1–3.3 m | **2.60–2.77 m** |
| Volume off HTC plane | 110 m³ | **~65 m³** |
| Projected area / cloth area | 80 % → 72 % | **36.5 → 33.0 m²** |

The constant-volume result is the most useful single invariant for a drawn
kite: **rotation is a fixed-volume deformation.** A rendering that rotates the
sail to weather while its belly stays put is drawing the wrong thing.

**What makes it rotate to weather rather than sag to leeward**, per the
sailmakers (`F6`, `F7`, `F8`):

1. **Luff round in the cut.** Klingler (Doyle): "We're designing so much
   positive luff round that the dynamics of the sail pull the draft forward"
   (`F6`). Positive luff round is *for* rotation and draft-forward, not just
   projection.
2. **Tack line ease** — the tack rises and floats to weather, taking the luff
   out from behind the main.
3. **Sheet ease plus windward heel** — North's J/80 guide prescribes all three
   together: tack eased 12–18 in, heel to windward, sheet eased, and "This
   rotates the chute out from behind the main's wind shadow" (`F8`).
4. **The failure mode:** on a *reach*, easing the tack does not rotate
   anything — it "just move[s] the sail to leeward and increase[s] heeling"
   (`F7`). Tack ease should help only below some AWA threshold and hurt above
   it.

Lutz's field test for whether rotation is happening (`F6`): ease the tack line;
if the tack "goes straight up or moves to weather, you have good rotation". If
it sags to leeward instead, pull the tack back down to the sprit.

---

## 5. The luff curl: where it starts, which way it folds, how fast

This is the app's headline coaching cue and currently its most invented
constant (`CURL_EASE_THRESHOLD = 0.55` of sheet travel, `prov: assumed`).
Deparday measured the phenomenon directly (`F1`, Ch. 4):

- **Flapping was present in every stable "optimum trim" run**, at all AWA,
  with and without the main. Curl is not an error state; it is what correct
  trim looks like.
- **It starts high and travels down.** The 3/4-height stripe begins folding
  before the 1/2-height stripe and reaches maximum fold first: "The flapping
  can be seen as a spanwise propagating wave going downwards" (`F1`).
- **The luff folds toward the windward side.**
- **Extent:** the folded region spans **0 to ~10 % of the section curve
  length**, with the low-suction zone evolving "up to 15% of the curve" (`F1`).
- **Load signature over one cycle:** corner loads dip to **−28 % to −16 %** of
  their time-average during the fold, then peak at **+25 % to +30 %** at full
  shape recovery. Peak suction |ΔCp| reaches **1.5–3** over the first 40 % of
  chord at recovery, decaying within **0.1 s** (`F1`).
- **Frequency, full scale:** pseudo-frequency **0.2–0.8 Hz** for AWS 3–7 m/s,
  scaling linearly with AWS, at a constant reduced frequency
  **f·√S / AWS ≈ 0.9** (`F1`, Fig 4.11). For the J/70's 45.64 m² kite,
  √S = 6.76 m, so **f ≈ 0.133 · AWS Hz** — about **0.67 Hz at 5 m/s AWS**.
  Viola & Flay measured 1–2 Hz at 1/15 model scale (`F5`), consistent after
  scaling.

Sailmakers agree the curl belongs at the **shoulder** — "trim until the
shoulder just starts to curl" (`F9`) — which is the upper luff, matching
Deparday's 3/4-height origin. Quantum is the only source that quantifies the
extent: "Trim the spinnaker for a curl along the top 50 percent of the luff"
(`F10`). Some asymmetrics carry a **V mark on the luff** precisely because the
curl is hard to judge off a sprit (`F9`).

**How much curl — three sources, three numbers**, all rules of thumb:

| Source | Curl size |
|---|---|
| Nixon, Melges 24 (`F6`) | "We always keep a smaller, 2-inch curl, which makes the trimmer concentrate" — noting the field sails with "a foot of curl" |
| Ullman, Melges 24 (`F11`) | "Keep about a 6" curl in the luff of the spinnaker", all conditions |
| North, sportboat (`F9`) | Close reach: "the luff of the sail should only just curl"; broad reach: "ease the sheet out to achieve a bigger luff curl" |

So **50 mm tight / 150 mm nominal / 300 mm deep**, wind-angle dependent. The
cadence North gives is a rhythm, not a threshold: "Ease to a curl, pause and
the curl disappears. Ease again" (`F9`).

**And the physics behind why "trimmed to the curl" is right.** Viola & Flay
measured that sheeting in just far enough to stop the luff flapping moved the
**trailing-edge separation point from ~60 % of chord forward to ~50 %**, at a
cost in drive force (`F5`). Over-trim is measurably slow, which is the
quantitative version of Kaseler's claim that sailors over-trim about 80 % of
the time (`F12`).

---

## 6. The leech, and a hard constraint the app currently violates

**The leech flies curved, and more open than it was designed.** Deparday:
"In reality, the leech is more curved, more twisted at 3/4 height and closed
at bottom due to the only control we have with the clew point"; and "The leech
is more curved for the flying shape than for the design shape" (`F1`). In
Bézier terms the flying leech control points sit further forward than the
design ones, so the flying leech is **more open**.

Motta et al. compare two boats at nearly the same AWA (J/80 at 91°, Stewart 34
at 89°) and find the J/80's section "opens up" more while the Stewart 34's is
"much more closed" (`F2`). The consequence they draw matters for a trainer: the
closed sail generates a **larger heeling component for the same drive**.

**The constraint the app breaks.** The J/70's leech is a published dimension —
**8 800 mm** — and the drawn kite's leech emerges from the loft rather than
being constrained. Integrating the current model's leech path (the locus of
each section's chord end from foot to head) gives:

| App state | emergent leech | published |
|---|---|---|
| full trim, full hoist | **11.0–11.5 m** | 8.800 m |
| eased sheet | **12.0–12.4 m** | 8.800 m |
| tack up, halyard eased | **11.2–11.7 m** | 8.800 m |

The drawn sail carries **25–40 % more cloth in its leech than the sail has.**

The fix is available and it is *derived, not assumed*. The straight
head-to-clew distance at full trim is **8.71 m** — within 1 % of the published
8.800 m leech, which is what you would expect for an edge held in tension
between two corners with a little round in it. That means the clew is not a
free parameter:

> **The clew lies at the intersection of a sphere of radius ≈ leech length
> about the head and a sphere of radius ≈ foot length about the tack** — a
> circle. The sheet chooses a point on that circle; it does not choose the
> clew's distance from anything.

Solving that circle on the app's own head and tack, with both edges flying at
their full published length:

| Sheet angle off centreline | aft of tack | to leeward | **height above tack** |
|---|---|---|---|
| 18° | 5.41 m | 1.80 m | −0.02 m |
| 27° | 5.06 m | 2.63 m | +0.14 m |
| 36° | 4.58 m | 3.38 m | +0.36 m |
| 45° | 3.99 m | 4.02 m | +0.62 m |
| 54° | 3.31 m | 4.55 m | +0.93 m |
| 63° | 2.55 m | 4.93 m | +1.28 m |

**Easing the sheet lifts the clew** — about 0.3 m of rise per 10° of ease
across the app's own 25°–60° sheet range. `kite.ts` currently holds the clew
at exactly the tack's height at every sheet setting, because `chordDir` has no
vertical component.

And this construction is independently corroborated: over its 25°–60° range it
raises the clew **1.08 m** (the table's 1.28 m is the 63° *height*, not the
range rise — corrected 2026-08-26, audit docs-consistency-01 M-20), against
Deparday's measured **1.4 m** of clew rise from AWA 64° to 141° (`F1`). Two
entirely different routes to about the same number.

---

## 7. Control → geometric effect → range → source

| Control | Geometric effect | Typical range | Source | Tier |
|---|---|---|---|---|
| **Sheet** | Clew swings on the leech/foot circle: eased → forward, outboard **and up**; trimmed → aft, inboard, down | 18°–63° off centreline; clew rises ~0–1.3 m across it | derived from `sails.asym.leechMm` + `footMm`; corroborated by `F1` clew travel | **derived** |
| **Sheet, at the margin** | Ease past max drive → luff folds from 3/4 height downward, folding to **windward**, over 0–10 % of chord | curl 50 mm tight / 150 mm nominal / 300 mm deep | `F1` (mechanism, extent); `F6`, `F11`, `F9` (size) | published + rule-of-thumb |
| **Sheet, over-trim** | Trailing-edge separation moves 60 % → 50 % of chord, drive falls | — | `F5` | published |
| **Tack line** | Tack rises; luff rotates to **weather** and out of the main's shadow. On a reach it does not rotate — it just moves the sail to leeward and adds heel | 0–18 in (0–0.45 m) sportboat; see §8 conflict | `F7`, `F8`, `F11`, and `03` §4 | rule-of-thumb, contested |
| **Halyard** | Lengthens the drawn luff → more surplus → more bow. Published advice is mostly **do not** | 0 default; 0.3–0.9 m only for wing-on-wing | `F9` ("always fully hoisted"), `F13` | weak — see §8 |
| **Sprit** | Fixed on the J/70: 1 495 mm hull-to-outer-point, fully retracted unless the gennaker is set | binary | J/70 Class Rules C.9.4 | **published** |
| **Apparent wind angle** | Camber 17 % → 37 % and draft 34 % → 45 % as AWA goes 60° → 120°; twist 4° → 28°; luff crosses from leeward to windward | see §2, §3.2 | `F1`, `F2` | **published** |
| **Sheet lead position** | Forward lead at broad angles "keeps the clew from rising up and dumping off the leech" | — | `F10` | rule-of-thumb |
| **Telltales** (if drawn) | 0.45–0.6 m aft of the luff, at 1/3 and 2/3 height | — | `F9` | rule-of-thumb |

---

## 8. Where the sources disagree

**Tack float when running.** Quantum's cruising guide says let the tack "float
up 4-6' off the deck" (`F10`); Cruising World's rendering of the same guidance
says 4–6 **inches** (`F14`). Both are live. The feet version fits stemhead-tacked
cruising asymmetrics, the inches version fits sportboats. For a J/70 the
sportboat range (0–18 in) is defensible. The J/70-specific spread is worse
still — see [`03`](03-trimming-best-practice.md) §4, where four North and Doyle
figures span 0 to 12 inches for the same control.

**The halyard.** "Ease the halyard 6–12 inches" is **folklore that could not
be sourced to any sailmaker publication.** North's own sportboat article and
Westaway both say the opposite — "The halyard should always be fully hoisted"
(`F9`). OneSails offers halyard ease as *interchangeable with* tack ease, with
no number (`F13`). The one numbered instance found is a sailor's account of
J/70 "beast mode" wing-on-wing: retract the sprit fully and ease tack and
halyard 1–3 feet each, to present the kite square to the wind (`F15`). North's
Melges 24 guide permits it only in very light air and warns the sail becomes
"more uncontrollable, especially in chop" (`F7`).

**Do not attribute "6–12 inches" to North or Quantum.** The honest model is
halyard ease = 0 by default, with a documented penalty of instability rather
than a shape gain.

**Camber magnitude.** Full-scale measured 15–32 % (`F1`) and 17–37 % (`F2`)
against a widely repeated 0.40c attributed to a wind-tunnel model, unverifiable
in the primary text (§2).

**Luff round percentage.** Measured J/80 108.9 % (`F1`) against an unsourced
forum claim of 103–104 % modern and 112 % in the 1980s (§3.1).

**Whether shape depends on AWA at all.** Strongly dependent in Deparday's J/80
and Motta's VO70 table; not significantly dependent on the Stewart 34 in the
same paper (§2).

---

## 9. A parametric surface, if the loft is ever rebuilt

Worth recording because it is a ready-made replacement for the current
stack-of-sections loft, and it comes with measured parameters. Deparday fits
the whole spinnaker with a **degree-4 triangular Bézier surface**: corner
control points are head, tack and clew; edge control points shape luff, leech
and foot; the next-in control points set entry and exit angles; a **single
central control point sets overall camber** (`F1`, §3.1.4). He then shows the
flying shape at any AWA can be **interpolated from the control-point tracks**
(Figs 3.16–3.18).

That is, almost exactly, a parametric kite model for a trainer: fifteen
control points, interpolated on apparent wind angle, with published tracks.
Not a change to make now — but the right target if the drawn kite ever needs
to stop being a loft of independent sections.

VSPARS (`F3`) offers the alternative, simpler parameterisation already closer
to the app's structure: per-stripe luff and leech positions, chord angle to
centreline, camber and draft, plus the sail's angle to vertical at the stripe
luff. Its stated resolution is better than **5 mm at full scale**, and it
assumes a flat head with a small chord — which is what `KITE_CHORDS.head = 0`
already does.

---

## Addendum — 2026-08-28: what the drawn kite now takes from this document

Added by plan
[`2026-08-28-downwind-fidelity`](../../plans/2026-08-28-downwind-fidelity/phase-02-kite-shape.md)
phase 02, after the owner's 0.5.0 report: "the spinnaker doesn't look the
right shape". This section records what the drawing takes from the sections
above and, more usefully, **where this document could not answer and the code
had to fit instead**. It adds no new source and revises no finding; §§1–9
above stand as written on 2026-08-25.

### The measurement that turned the visual complaint into a number

Every drawn section spans from the bowed luff to the drawn leech
(`kiteGeometry.sections`), so in that loft **the leech is the silhouette** —
the girth at a height is whatever the leech leaves it. Taking a measurer's
four dimensions off the loft (luff and leech arcs, straight foot, and the half
width between the two edges' arc mid-points) and running ORC's own spinnaker
area formula on them, at the app's own downwind trim:

| Measured off the drawn loft | 0.5.0 | after phase 02 | class (`T9` G.5.3) |
|---|---|---|---|
| Half width SHW, AWA 114° / 150° | 4.79 / 5.15 m | **5.48 / 5.78 m** | 5.560 m |
| `(SLU+SLE)/2 · (SFL+4·SHW)/6` | 39.9 / 42.4 m² | **44.2 / 46.3 m²** | 45.64 m² |
| Girth peak, as a height fraction | 0.19 / 0.21 | **0.30 / 0.32** | — |
| Chord at ¾ height, as a fraction of the peak | 0.56 / 0.58 | **0.67 / 0.68** | — |
| Half width on a tight reach (AWA 70°) | 2.86 m | **3.64 m** | — |

So the sail was 7–14 % narrow at exactly the height a spinnaker carries its
shoulders, and *measured* 7–13 % small overall. That is the whole of "reads
like a jib" in one dimension, and it is a class dimension, not a taste.

### Section by section, what the drawing takes from this document

- **§3.2, luff direction.** Unchanged, and deliberately: `luffLateral`'s
  published endpoints (64° leeward, 141° windward) and the derived 102.5°
  crossover are exactly as landed in #76.
- **§3.2, leech direction — newly applied.** Motta et al.: "the leech moves
  aft and outboard, opening the sail up" (`F2`). The drawn bulge went
  *forward*, which pushed the leech toward the luff and shortened every
  section it touched. Reversing it to aft is worth 0.13 of the sail's height
  in where the girth peaks, at no cost in any other dimension. This is the
  one change in phase 02 that is a source correction rather than a fit.
- **§6, the leech constraint.** Unchanged and still holding: the drawn leech
  carries the published 8.800 m at every sheet setting, with the straight
  head→clew chord shortened by the bulge's arc surplus.
- **§6, clew rise.** The bulge's ease travel is capped by this, not by the
  shoulders. 0.45 m of travel lifts the clew 1.46 m across the sheet band
  against Deparday's measured 1.4 m; 1.1 m of travel drew visibly better
  shoulders and lifted the clew 2.16 m, so it was rejected.
- **§2, camber.** Untouched. `shape.asym` was re-based on Table 3.1 in #76 and
  `src/core` is out of phase 02's scope; the drawn mid-height section measures
  20–25 % of chord, which is the band, and a test now holds it there.
- **§4, the fixed-volume invariant.** Not asserted, but measured and moving
  the right way: volume between the sail and the head–tack–clew plane went
  52.9 → 61.6 m³ against the ~65 m³ this document scales from `F1`.

### Three places this document could not answer

1. **No leech profile exists.** §6 pins the leech's *length* and says the
   flying leech is "more curved" and "more open" than the design leech, but
   nothing published gives a stand-off against height for any asymmetric. The
   drawn amount (0.95 m trimmed, +0.45 m eased, peak at 65 % of the leech) is
   therefore a fit to the class dimensions above, tagged `assumed`, and it is
   the largest remaining invented number in the drawing.
2. **No foot round exists either.** §6 is a leech constraint; nothing in this
   corpus measures a foot. The class rules cap the *straight* foot at
   5 700 mm and say nothing about the cloth in it. The drawn skirt (0.55 m,
   ~10 % of the foot) is assumed, on the reasoning that a free edge with no
   forestay under it should carry round of the same order as the 8.9 % measured
   on the luff (§3.1). Only its sign is claimed.
3. **The girth peak cannot go where a spinnaker's eye puts it.** The
   phase brief asked for the peak at 60–70 % of the height. It is not
   reachable: the foot is a published 5.700 m and the half width a published
   5.560 m, so a maximum above mid-height needs a mean girth the 45.64 m²
   rating cannot pay for — the sail would have to close from full width to a
   point over the top three-tenths of its height. 0.30–0.32 is what the class
   dimensions allow, up from 0.19–0.21, and what carries the picture is not
   the peak's height but how much width survives above it (0.56 → 0.67 of the
   peak at three-quarter height).

### One finding this document contradicts, left standing and now tested

**Drawn twist runs the wrong way against the sheet.** §2c measures foot-to-top
twist at 4° on a tight reach and 26° at running angles — sheet in, little
twist; sheet out, a lot. The drawing does the opposite: 24° at full trim, 14°
at mid sheet, 2° fully eased. The cause is structural rather than a constant —
the sheet band swings the foot 35° (25° → 60°) while the head is pinned at the
masthead, so the upper leech can only follow by the stand-off the bulge gives
it, measured at 11–14° whatever the bulge is set to. Inverting it needs the
sheet band narrowed to ~14° or the head given a rotation of its own, and both
are the sheet's geometry rather than the sail's shape. Held as a
characterisation test in `kite.test.ts` and a row in `ASSUMPTIONS.md`, so a
fix cannot land silently and the disagreement is not buried.
