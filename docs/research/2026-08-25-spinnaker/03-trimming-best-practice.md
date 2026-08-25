# The J/70 downwind playbook, by wind band

- **Date:** 2026-08-25
- **Scope:** what a good J/70 crew actually does downwind, and which of it a
  trainer can check. Sources are sailmaker guides (North, Quantum, Doyle),
  the J/70 class rules, the RRS, and the ORC speed guide. Full URL list in
  [`README.md`](README.md); source keys `T1`–`T12` are defined there.
- **Sibling docs:** [`01`](01-asymmetric-aerodynamics.md) for why any of this
  works, [`02`](02-flying-shape.md) for what the controls do to the cloth,
  [`04`](04-model-implications.md) for what the app should change.

---

## 1. The one rule change that matters most

**The J/70 class rules modify RRS 42.3(c).** This is not a footnote; it is
the difference between a trainer that teaches the class and one that teaches
a generic keelboat.

RRS 42.2(a) prohibits pumping — "repeated fanning of any sail" (RRS 42.2(a),
via `T10`). RRS 42.3(c) carves out one exception:

> "each sail may be pulled in only once for each wave or gust of wind"
> — RRS 42.3(c), 2021–2024 (`T10`)

International J/70 Class Rules 2024, C.1.1 RULES (b) replaces that with a
version in which the main and jib keep the one-pull-per-wave limit but

> "the gennaker sheet may be played without restriction"
> — J/70 Class Rules 2024, C.1.1(b) (`T9`)

The condition survives: the allowance only applies "when surfing … or planing
is possible" (`T9`). So the correct model is **unlimited gennaker sheet play
once surfing or planing is possible, one pump per wave on main and jib, and
nothing when it is not**. RRS 86.1 also matters: sailing instructions cannot
change rule 42, and only class rules can make it more permissive (`T10`).

Doyle's 2024 guide (`T4`) warns that repeated gennaker pumping is prohibited
by World Sailing. **That is either wrong for this class or is describing the
unmodified default; the class rule governs.** Flag the disagreement rather
than silently siding with the class rule, per the honesty rules — but the
class rule is the one that binds on a J/70 race course.

Two other class-rule constraints bind crew placement and therefore any
fore-aft coaching cue: **no crew forward of the mast** except momentarily for
sail handling (C.3.3(a)), and **at most two crew with legs outboard of the
sheerline** (C.3.3(c)) (`T9`). "Weight as far forward as possible" in the
sailmaker guides means *as far forward as the mast*, not the bow.

---

## 2. The bands

The sailmakers agree on the shape of the range and disagree on the numbers at
the boundaries. Below is each band with the settings each source gives, and
the disagreements kept visible rather than averaged away.

### 2.1 Light / VMG (0–7 kt)

| Item | Setting | Source |
|---|---|---|
| Mode | VMG — sail *higher* than the run, gybe through bigger angles | `T2` |
| Heel | **Slight leeward** heel, to keep the kite full and the luff projecting | `T2`, `T5` |
| Backstay | Completely slack | `T2`, `T3` |
| Vang | Off; all main leech telltales flowing 100% | `T3` |
| Mainsheet | Out past the corner of the boat, traveller centred | `T3` |
| Jib | Rolled up | `T2`, `T3` |
| Crew | As far forward as the class rule allows; under 8 kt the bow person joins the tactician **to leeward** to see under the kite | `T2`, `T6` |
| Kite sheet | Continuous ease-to-the-curl and trim back | `T1` |
| Tack line | Down (`T4`) or eased a few inches (`T5`) — see §4 | conflict |

The leeward heel here is not a mistake. In the lightest air the kite needs
gravity's help to stay projected and asleep; heeling to leeward hangs it out
away from the main. `T5` puts leeward heel in VMG mode and windward heel in
wing-on-wing mode, in the same article — the driver is *mode*, not wind speed.

### 2.2 Displacement / soak (8–13 kt)

| Item | Setting | Source |
|---|---|---|
| Mode | Sail as low as the kite will stay asleep | `T2` |
| Tack line | Eased **4–5 in** to rotate the luff to weather; works only over ~9 kt | `T2`, `T5` |
| Heel | Flat, or **a couple of degrees to windward**; "there are times when we rock the boat a few degrees to weather" (`T2`) — legal under RRS 42.3(a) provided it does not become rocking | `T1`, `T2` |
| Vang | Enough to control the upper leech; look for "a small S turn in the battens around the shrouds" (`T2`) | `T2` |
| Backstay | Off (`T5`), or a little on to steady the rig in chop | `T3`, `T5` |
| Crew | Bow person in the companionway at 8–10 kt; bow knuckle just kissing the water | `T2`, `T6` |
| Jib | Furled once the kite is flying | `T3`, `T4` |
| Wing-on-wing | Starts to work at **10 kt**; ideal 10–14 kt; steer by the masthead fly, commands are "turn right/left" not "up/down" | `T2`, `T4`, `T5` |

Recovery rule if the kite goes unstable while soaking: **pull the tack down
and head up** (`T5`). That is the single most useful corrective cue in the
band, because the failure mode of tack-up soaking is a kite that collapses
and re-fills.

### 2.3 Marginal / lazy plane (13–16 kt)

The hardest band, and the one North calls "a very difficult mode to
maintain!" (`T1`).

| Item | Setting | Source |
|---|---|---|
| Backstay | **50–75% on** | `T5` |
| Vang | On, for maximum power when pumping; once planing, add vang until the leech telltales stall then ease a touch | `T5`, `T6` |
| Heel | **≤12° when the puff hits, <10° to get planing** (`T6`); Doyle **5–10°** (`T4`); North's tuning guide says **10–15°** for lazy plane (`T1`) — see §5 | conflict |
| Crew | Extremely active fore-and-aft; full hike in puffs; three forward crew stay **forward of the winch**, helm hip-to-winch to two feet behind it | `T5`, `T6` |
| Jib | Deployed, under-trimmed until planing, top quarter allowed to luff | `T4`, `T6` |
| Boat speed | Doyle: maintain **~10 kt** to justify lazy planing over wing mode | `T4` |
| Decision rule | If the gap between waves runs **~30 s**, furl the jib and sail low instead | `T2` |
| Puff technique | **Turn up 10–15°** to meet the puff, crew to the rail simultaneously | `T2` |

The 30-second wave-gap heuristic (`T2`) is the only quantified mode-selection
rule any source gives, and it is a better trainer cue than a wind threshold
because it is what the crew can actually observe.

### 2.4 Full plane (16 kt and up)

| Item | Setting | Source |
|---|---|---|
| Backstay | **75–100% on** — mast back, kite luff tight, kite draft forward | `T5` |
| Traveller | **All the way down**, so each mainsheet pump pulls the boom in *and* down | `T5` |
| Vang | Light, to twist the head; "the windier it is, the less vang you should use" (`T2`) | `T2`, `T4` |
| Tack line | All the way down | `T2` |
| Heel | Flat, ≤10° | `T4`, `T6` |
| Crew | 17–18 kt: helm to the aft stanchions, spin trimmer behind the winch. 20 kt: whole crew aft of the winch, tactician trimming main **at the transom** | `T2` |
| Jib | Out, telltales streaming, never over-trimmed — over-trim blankets the kite | `T2`, `T3`, `T4` |
| Kite sheet | Trim the curl **out** and hold it; gear-change with the mainsheet, not the kite sheet | `T4`, `T6` |
| Depower | Vang, mainsheet and spinnaker together, all at once | `T2` |
| Broach recovery | Ease the vang; if wiped out, blow vang, **drop the halyard about 8 ft**, bear off, re-hoist | `T1`, `T2` |

The failure mode named explicitly is the rudder cavitating and the boat
spinning out (`T2`) — the physical reason is in
[`01`](01-asymmetric-aerodynamics.md) §5.

---

## 3. Sheet trim: "ease to the curl" is a light-air technique

This is where the trainer's most-quoted cue turns out to be conditional. Four
sources, sorted by how much curl they want and how often:

| Source | Cue | Frequency |
|---|---|---|
| North tuning guide (`T1`) | "ease the sheet until the luff curls and then trim slowly back in" | continuous, displacement mode |
| Quantum (`T3`) | "Trim the spinnaker for a curl along the top 50 percent of the luff"; "When in doubt, ease it out" | continuous |
| Doyle (`T4`) | Ease until it curls **to check** you are not over-trimmed; "constant easing and trimming to maintain a curl is not needed unless soaking at lower angles" | intermittent |
| North / Healy planing (`T6`) | Ease to see curl when the puff first hits; **when planing, trim in to eliminate the curl**; test only from time to time | rare |
| North speed guide at 20 kt (`T2`) | "the spinnaker trimmer doesn't have to trim in and out a lot" — use the main as the trim tab | rare |

**Synthesis, and it is a real finding, not a hedge:** curl-and-trim is the
*displacement and soaking* technique. On a plane you trim the curl out, hold
it, and gear-change with the mainsheet. A trainer that shows "ease to the
curl" as a universal cue teaches the wrong thing above 15 kt.

Quantum's "top 50 percent of the luff" (`T3`) is the only source anywhere
that quantifies *where* the curl should appear. Everything else says "the
luff". That matters for the drawn kite: the curl belongs in the upper luff,
not along its whole length — see [`02`](02-flying-shape.md) §5.

---

## 4. Tack line: the sharpest numeric disagreement in the corpus

Four figures for the same control, and they do not reconcile:

| Source | Running / soaking tack line |
|---|---|
| North old guide, version O07 (`T7`) | Ease **6–12 in**, until the tack rides straight up or just slightly to leeward |
| North speed guide (`T2`) | Ease **4–5 in** in 8–13 kt, to rotate the luff to weather |
| North five modes (`T5`) | "a few inches", and only above **9 kt** |
| Doyle 2024 (`T4`) | **Two-blocked at the end of the sprit**, full stop |

Doyle is the most recent and the outlier. All four agree on the *reaching*
setting: tack down tight to the sprit end, because letting the tack up on a
reach "just moves the sail to leeward and increases heeling" (`T7`).

So the defensible model is: **tack down when reaching, in every source; tack
up somewhere between 0 and 12 inches when running, with the sources spread
across that whole range.** Show the band and the disagreement. Do not pick a
number.

Doyle adds one control the app does not model at all: the **luff cord** —
tighten in light air because the nylon goes unstable, ease in heavy air
because the kite stretches, "which is somewhat counter intuitive" (`T4`).

---

## 5. Heel, helm and crew weight

**Heel direction is a function of mode, not of wind speed.** All four sources
agree once indexed that way:

- **Leeward heel:** VMG mode, reaching, and light-air spots where the kite
  needs help staying full (`T4`, `T5`).
- **Windward heel:** soaking, running deep in pressure, wing-on-wing —
  "a boat that is heeled slightly to windward is fast when running" (`T3`).
  Wing-on-wing wants "consistent weather heel, more as the breeze lightens"
  (`T5`).

**Planing heel target — three sources, three numbers:**

| Source | Target |
|---|---|
| North / Healy (`T6`) | ≤12° when the puff hits, **<10° to get planing** |
| Doyle (`T4`) | **5–10°** is "the optimum range for planing mode" |
| North tuning guide, lazy plane (`T1`) | **10–15°** |

The two independent "target" figures cluster at ≤10°; North's own tuning
guide is the outlier high. Show 5–15° as the span with 10° as the consensus
ceiling, and say which source gives which.

**Why heel matters mechanically**, per the sources: (i) rolling to steer —
RRS 42.3(a) permits heeling to leeward to head up over a wave and to windward
to steer down the back, and North's framing is to "drive the boat with
side-to-side weight … use as little rudder (which creates drag) as possible"
(`T2`); (ii) **constant heel means constant helm load**, which is what lets
the helm find the fastest apparent wind angle (`T2`). This is the same point
the cockpit research already recorded upwind
([`../2026-08-25-cockpit/02-j70-trim-mental-model.md`](../2026-08-25-cockpit/02-j70-trim-mental-model.md)
§2.3): the helm-feel cue lies if heel is not held constant.

**Fore-aft** is bounded at both ends. Forward: the class rule stops everyone
at the mast (`T9`). Aft: North's old guide warns against sitting so far back
that the boat sits "artificially" bow-up (`T7`).

---

## 6. Sail by the numbers: target TWA and BSP by TWS

Tier A, and already committed to this repo as
[`data/polar/orc-j70.json`](../../../data/polar/orc-j70.json) (ORC speed
guide, J/70 ONE DESIGN, VPP 2011 1.02, issued 2012-04-30, `T8`). Downwind
optimum, asymmetric set:

| TWS (kt) | Run TWA | BSP (kt) | VMG (kt) | VPP heel |
|---|---|---|---|---|
| 6 | 141.9° | 4.32 | 3.40 | 11.8° |
| 8 | 144.8° | 5.19 | 4.24 | 12.0° |
| 10 | 150.7° | 5.72 | 4.98 | 12.0° |
| 12 | 162.5° | 5.92 | 5.64 | 11.8° |
| 14 | 172.0° | 6.26 | 6.20 | 11.7° |
| 16 | 174.0° | 6.73 | 6.70 | 11.7° |
| 20 | **137.1°** | **11.53** | **8.45** | 19.0° |

And the constant-angle rows, which are what a trainer showing "you are at
150°, target is X" actually needs (BSP kt):

| TWA | 6 | 8 | 10 | 12 | 14 | 16 | 20 |
|---|---|---|---|---|---|---|---|
| 110° | 5.40 | 6.41 | 7.23 | 7.85 | 8.24 | 8.59 | 9.38 |
| 120° | 5.28 | 6.31 | 6.99 | 7.76 | 8.55 | 9.08 | 10.19 |
| 135° | 4.69 | 5.74 | 6.48 | 7.09 | 7.80 | 8.75 | **11.51** |
| 150° | 3.78 | 4.87 | 5.75 | 6.38 | 6.91 | 7.49 | 9.14 |
| 165° | 3.18 | 4.19 | 5.07 | 5.84 | 6.41 | 6.91 | 8.07 |
| 180° | 2.97 | 3.93 | 4.82 | 5.57 | 6.19 | 6.69 | 7.75 |

Jib-only at 180° for comparison — the kite's actual worth: 2.65 / 3.51 /
4.33 / 5.02 / 5.65 / 6.17 / 6.99 kt at the same TWS. About **+0.5 kt at
10 kt and +0.8 kt at 20 kt** dead downwind (`T8`).

**Two things to say out loud about this table.**

**(a) The 16→20 kt discontinuity is the planing regime.** Optimum run TWA
snaps from 174° back to 137°, and BSP at 135° jumps from 8.75 to 11.51 kt.
That is real physics — the VPP crossing into planing — but the *magnitude* is
VPP output, never measured, and 11.53 kt is at the top of what anyone claims
for the boat. Treat it as the model's most useful validation target and its
most suspect number simultaneously.

**(b) The polar and the sailmakers disagree at 12–16 kt, and both are
right.** The VPP says soak: 162–174°. Every sailmaker says 14–15 kt is where
you start planing and you should be up on a plane at a much higher angle. The
reason is that the VPP has **no wave-surfing and no crew-kinetics model** —
and the class rules explicitly permit unlimited gennaker pumping in exactly
those conditions (§1). The VPP is solving a steady-state problem the crew is
not solving. This is the cleanest example in the whole project of the honesty
rule: show both, show the delta, do not resolve it.

---

## 7. Getting on and staying on a plane

Assembled from `T2`, `T4`, `T5` and `T6`; the ordering is synthesised, the
steps are each sourced.

1. Wait for the puff to actually arrive, then act immediately.
2. **Unfurl the jib**, under-trimmed so it does not disturb flow to the kite.
3. **Turn up 10–15°** into the puff, all crew weight to the weather rail at
   the same moment.
4. Find the heading by heel: **≤12° on impact, <10° to get up**.
5. Once up, **add vang** until the main leech telltales stall, then ease
   slightly. This lets you sail lower while planing and keeps you planing
   longer as the puff fades.
6. Trim the curl out of the kite and hold it.
7. Backstay 75–100% on; traveller all the way down; tack line all the way
   down.
8. Pump: one per wave on main and jib, **unlimited on the gennaker sheet**
   (§1).
9. Falling off the plane — if wave gaps run ~30 s: furl the jib, bear away to
   maximum downwind angle, ease main, backstay fully off, weight max forward.
   Consider wing-on-wing to ride an 8–13 kt puff back to the middle.

---

## 8. Gybing, in brief

**Inside vs outside is decided at the dock**, by how the tack line is
attached: tack line **on top of** the sheet at the tack ring gives an inside
gybe; **underneath** gives an outside gybe (`T7`).

Everyone gybes inside. "Almost everyone is now gybing inside and not using
the outside gybes" (`T7`) — the reasons given are that the lazy sheet cannot
fall in the water, there is less sheet to pull, and all three takedown options
stay available at the leeward mark.

The standard J/70 inside gybe (`T7`, `T2`):

1. Turn down **slowly**; ease the old sheet until the clew is just forward of
   the headstay.
2. Overhaul the new sheet, then **completely release** the old one, pulling
   the clew around the headstay **before the main gybes**.
3. Boat turns through; main comes across.
4. Timed right, main and kite fill simultaneously on the new side.
5. Forward crew grabs the clew near the shrouds, pulls down sharply and lets
   go, to pop the kite full; trimmer does a big ease as it pops.

Vang **on** through the gybe to pop the compression battens (`T3`, `T5`).
Furl the jib through the gybe in 13–15 kt so the kite fills more easily, and
in very light air so the clew does not crumple the jib against the headstay
(`T3`). Cadence is called by the tactician — "in 8 knots it might be
'2, 1, flatten'" (`T2`); at 12 kt there is no delay. The named errors are
coming out too low, mistiming the old-sheet ease against the rate of turn,
and turning too fast, which puts the kite inside the foretriangle.

---

## 9. Jib downwind: furled or drawing

The sources agree more than they look, once indexed on **mode** rather than
wind speed — with one genuine disagreement left over.

| Source | Rule |
|---|---|
| North speed guide (`T2`) | "As soon as you are planing, unfurl the jib." **Trigger is planing state, not wind speed.** Never over-trim; the upper leech must stay open |
| North / Healy (`T6`) | Leave the jib out in a planing puff; **furl it when the puff dies**. Cycles in and out with the puffs |
| Doyle (`T4`) | Furl after the kite is flying in light-air displacement. Deployed at 14–15 kt lazy plane and 16+ full plane, telltales streaming, never over-trimmed |
| Quantum (`T3`) | **By wind speed**: furled 0–13 kt; out and loose 13–15 kt with the top quarter luffing; out all the time 15+ kt. Rig matrix says In / In-Out at 14–18 / Out at 18+ — internally inconsistent with its own prose |

**The disagreement, stated precisely:** at 13–15 kt marginal conditions,
Quantum triggers on wind speed alone; North and Doyle trigger on actually
planing, and North explicitly cycles the jib with the puffs.

There is a second, smaller disagreement about *why* the jib is there. North
frames it as **added area for acceleration**; Quantum frames it as **balance
and steering control** — its job is to "make it easier for the driver to stay
downwind" (`T3`). These produce different model behaviour and are both
testable.

---

## 10. What is weak here

- **The ORC polar is 2012-vintage** (VPP 2011 1.02). Current ORC speed guides
  are paywalled behind ORC Sailor Services; the mirrored 2012 table is what is
  freely available (`T8`). It is still the only real J/70 polar in circulation
  — the class association's own "speed guide" page links out to a North
  article containing no numbers.
- **No verified J/70 top-speed figure** exists in any class or press source.
  Anything above ~13 kt is anecdote.
- **UK Sailmakers has no downwind content at all.** Its tuning guide is a
  two-page image-only scan. Do not cite it downwind.
- **Doyle's guide has an obvious typo** — "24 to 15 knots" for lazy planing,
  which reads as 14–15 kt from context.
- **Rake reference numbers across guides are not comparable** (56.5 in / 54 in
  / 58 in / 58.25 in) because they are measured to different pins. Not a
  downwind issue, but it is the same failure mode as the tack-line spread and
  worth remembering before any of these numbers get averaged.
