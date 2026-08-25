# How an asymmetric actually makes drive

- **Date:** 2026-08-25
- **Scope:** the aerodynamics of a sprit-tacked asymmetric across the downwind
  range, the ORC VPP's treatment of it, and the physical thresholds that
  matter on a J/70. Source keys `A*`, `F*`, `T*` are defined in
  [`README.md`](README.md).

**Evidence note.** The ORC 2023 and 2026 documentation was read directly from
the PDFs, and every coefficient derivation below is computed from those
tables. The pressure and wind-tunnel material comes from primary papers that
were retrieved. **Six sources named in the brief could not be obtained** —
Kerwin's MIT report, Fossati, Claughton's book, Richards/Johnson/Stanton,
Lasher & Richards, and Hansen/Jackson/Hochkirch. Nothing here rests on them;
§8 records what is missing and what it would settle. Where a claim comes from
a secondary characterisation rather than the primary, it says so.

---

## 1. The shape of the problem

An asymmetric spends its life across a range no other sail covers: from about
**60° apparent wind**, where it behaves like a very cambered wing with mostly
attached flow, to **180°**, where it is a bag being dragged through the air.
The flow regime changes completely across that range, and so does where the
drive comes from. A trainer presenting one mental model for the whole range
teaches the wrong thing at one end or the other.

The cleanest way to see it is to take the ORC coefficients — the same ones the
solver already uses — and resolve them into the boat's frame.

---

## 2. The ORC VPP's asymmetric, read directly

### 2.1 Which table — and the numbering moved

Verified in both editions:

| | Symmetric | **Asym on centreline** | Asym on pole |
|---|---|---|---|
| **2023 / 2024** | Table 5.6 (`kpss` 0.02639) | **Table 5.7** (`kpasc` 0.02648) | Table 5.8 (`kpasp` 0.02648) |
| **2026** | Table 5.8 | **Table 5.9** | Table 5.10 |

The shift is because 2026 inserted a new Table 5.1 (RS percentages) and Table
5.7 (roller-furling jib coefficient deltas). The J/70's gennaker is tacked to
a bowsprit on the centreline, so it is the **asym-on-CL** table in either
edition.

`src/core/aero/orc/tables.ts` transcribes the **2023** Table 5.7 cell for
cell, correctly — its `cdLow`/`clLow` rows match the published `cdasc1` and
`clasc1` exactly, and its header note about 5.8 sharing `kp` and diverging
from 115° is right.

**But `data/boats/j70.json` declares `sails.asym.orcTable: "5.6"` — the
symmetric spinnaker table.** A metadata error, not a behaviour bug:
`tables.ts` hardcodes `ASYM_TABLE`, nothing dispatches on the JSON field, and
`validate.ts` only checks the string is one of five known numbers, so `"5.6"`
passes. The field should read `"5.7"`, and given the renumbering it should
also name the edition.

### 2.2 ORC changed the asymmetric's coefficients, and says it didn't

Comparing the two editions' asym-on-CL rows directly:

| AWA | 2023 CL | **2026 CL** | 2023 CD | **2026 CD** |
|---|---|---|---|---|
| 75° | 1.075 | **1.130** | 0.477 | 0.400 |
| 115° | 0.805 | **0.885** | 0.566 | 0.565 |
| **130°** | **0.372** | **0.592** (+59 %) | 0.475 | 0.540 |
| 150° | 0.100 | **0.240** | 0.352 | 0.420 |
| 180° | 0.000 | 0.000 | 0.262 | **0.195** |

**ORC has materially re-powered the bowsprit asymmetric at deep angles.** Yet
the 2026 revision list names only the foiling model, RS rating assessment and
neural-network bounds, and the section heading still carries a footnote saying
"The last adjustment to the coefficients of single sails was done in 2016"
(`A1-2026`). **That footnote is false.** Practical consequence for this
project: `PROVENANCE.md` should pin the ORC **edition year** for these tables,
not just the document, because the numbers move without announcement.

### 2.3 Where the drive comes from — derived from the table

Resolving into drive and heel (`CFx = CL·sin β − CD·cos β`,
`CFy = CL·cos β + CD·sin β`), using the **2023** rows because that is what the
repo carries, with 2026 alongside:

| AWA | CL | CD | **CFx (drive)** | CFy (heel) | **lift's share of drive** | 2026 CFx |
|---|---|---|---|---|---|---|
| 28° | 0.017 | 0.154 | −0.128 | 0.088 | — (net negative) | −0.128 |
| 41° | 0.698 | 0.239 | 0.278 | 0.684 | 165 % | 0.281 |
| 50° | 0.899 | 0.309 | 0.490 | 0.815 | 140 % | 0.522 |
| 60° | 1.040 | 0.389 | 0.706 | 0.856 | 127 % | 0.768 |
| 67° | 1.072 | 0.436 | 0.816 | 0.820 | 121 % | 0.893 |
| 75° | **1.075** | 0.477 | 0.915 | 0.739 | 113 % | 0.988 |
| **100°** | 0.985 | 0.545 | **1.065** | 0.366 | 91 % | **1.109** |
| 115° | 0.805 | **0.566** | 0.969 | 0.173 | 75 % | 1.041 |
| 130° | 0.372 | 0.475 | 0.590 | 0.125 | 48 % | 0.801 (+36 %) |
| 150° | 0.100 | 0.352 | 0.355 | 0.089 | 14 % | 0.484 (+36 %) |
| 170° | 0.020 | 0.290 | 0.289 | 0.031 | 1 % | 0.231 (−20 %) |
| 180° | 0.000 | 0.262 | 0.262 | 0.000 | 0 % | 0.195 (−26 %) |

Six conclusions, and they survive the edition change:

1. **Maximum lift is at 75° AWA; maximum drive is at 100°** — in *both*
   editions. Those are different angles, which is why "the fastest angle" and
   "the most powerful trim" are different questions.
2. **Below about 90° AWA, drag is a net brake.** The lift term exceeds 100 %
   of drive because drag subtracts. At 41° the lift term is 165 % of the net.
   Reaching, the sail is a wing and drag is pure cost.
3. **The wing-to-parachute changeover is around 140°.** At 130° lift still
   supplies 48 % of drive (57 % in 2026); by 150° it is 14 % (25 %); at
   170–180° essentially all drive is drag. That is the quantitative answer to
   the "vertical wings or horizontal parachutes?" framing: **both, and the
   changeover is near 140° AWA.**
4. **At 28° the sail is a net brake** (CFx −0.128). The kite has a real lower
   angle limit and the table says so.
5. **Heeling force collapses as you bear away** — CFy 0.856 at 60° to 0.125 at
   130°. Downwind depowering is achieved mostly by *angle*, not by trim.
6. **CL is exactly zero at 180°.** Dead downwind the sail has no lift in this
   model. It is a parachute, numerically.

The 2026 edition raises deep-angle drive by ~36 % at 130–150° and *lowers* it
20–26 % at 170–180°, sharpening the incentive to sail hotter angles. It does
not move the peak.

### 2.4 Depowering: `flat` and `reef` act together, and the floor is 0.53 — not 0.42

Under spinnaker ORC couples the two parameters (`A1`, §5.1, "De-powering with
spinnaker and headsail set flying"):

> "the flat and reef parameters act together, and the global sail area is
> reduced as A·reef²" (`A1`)

Mechanics: area scales as **A · reef²**, CE height as **ZCE · reef**, and the
minimum reef under spinnaker is `0.85 · DefaultSpinArea / SpinArea` — so a
boat carrying a larger-than-default kite may depower further, modelling the
change to a smaller sail. Maximum heel under spinnaker is enforced at
**≈ 21.5°** as a soft boundary ("a 'soft' boundary is modeled in terms of a
rapidly increasing resistance", `A1`), reduced from ≈ 26.5° in 2014.

**The floor matters for this repo.** `tables.ts` sets
`FLAT_MIN_BASE = 0.42`, and `depower.ts` applies `clampFlat` unconditionally —
`forces.ts:284` calls it for every sailset, including `asym`. But ORC gives
spinnakers and headsails set flying **`flatmin = 0.53`**, and footnote 3
records "The baseline minimum flat has been changed to 0.53 in 2024" (`A1`).
So the repo's 0.42 is the 2023 upwind figure applied downwind, where the
current document says 0.53. **Worth checking whether the solver's downwind
optimum ever drives flat below 0.53; if it does, it is depowering past what
ORC allows.**

The collective equations apply unchanged downwind
(`CL_sailset = FLAT · CLmax`), and with no jib set `f_cdj = 0`, collapsing the
drag bracket to 1. `f_cdmult` still applies, and the repo's transcription
matches the published row exactly including the counter-intuitive 1.06 at
flat = 1.00.

### 2.5 The twist function: renumbered, re-coefficiented, and ambiguous downwind

- **2023 eq. (5.49):** `ZCE = ZCE|FLAT=1 · [1 − 0.406(1−flat) − 0.902(1−flat)(1−frac)]`
- **2026 eq. (5.40):** the first coefficient is **0.500**, not 0.406, and an
  overlap term `[1 − (overlap − 0.9)/0.6]` multiplies the bracket (added 2024).
- **2026 eq. (5.49)** is now something else entirely: `CR = CL sin β − CD cos β`.

The repo carries `TWIST_K_FLAT = 0.406`, i.e. the 2023 form. More importantly,
**whether the twist function applies under spinnaker is genuinely ambiguous in
the document.** It sits under the general centre-of-effort section, but the
spinnaker has its own hard-coded CEH (0.565 · ISP) and its own effective-height
equation. ORC's downwind effective height is explicitly simpler:

> "With spinnaker the effective height calculation is simpler, being
> independent of the apparent wind angle" (`A1`)

— taking `reef` directly, where upwind uses the AWA-dependent span factor
running 1.4513 at 20° to 0.80 at 80° (the repo's `KHEFF`). **This belongs in
`ASSUMPTIONS.md` as an open question, not as a silent choice.**

### 2.6 The blanketing gap — the most important finding in this section

ORC §5.6.3 is one line:

> Mizzen, Jib Downwind, Spinnaker: `bk(β) = 1` (`A1`, §5.6.3)

**The spinnaker's blanketing factor is exactly 1 at every apparent wind
angle.** And for a J/70 the other two vanish as well: the mainsail's factor
depends on `fm = 1.16 · A_mizzen-staysail / A_main`, and the document states
plainly that **fm = 0 for sloops**; the jib's depends on overlap and is **zero
for any non-overlapping jib**, which the J/70's is.

**So there is no downwind blanketing anywhere in the ORC model for this
boat.** The deep-angle collapse lives entirely in the coefficient tables —
asym-on-CL CL falling to 0.100 at 150° against the symmetric's 0.360 *is*
ORC's expression of the sprit-boat's deep-angle problem, encoded as
coefficients rather than as a shadow model.

This matters directly for the app. Every sailmaker source in
[`03`](03-trimming-best-practice.md) describes tack ease and sprit position as
rotating the kite "out from behind the main's wind shadow". **Two of the four
downwind controls act on a mechanism the solver has no term for.** That is a
more precise and more useful statement than "tier C", and it is the specific
reason those controls cannot reach a number.

(ORC contains an internal inconsistency here too: §5.2.4 says a power function
"was introduced to the mainsail blanketing algorithm", but §5.6.1 as printed
has no power term.)

### 2.7 Two more ORC inconsistencies worth logging

The §5.1.1 prose says that at 180° "the lift has declined to zero and the drag
coefficient increased to 1.0". **No table says 1.0 at 180°**: mainsail 1.34483,
symmetric spinnaker 0.635, asym-on-CL 0.195 (2026). The prose is a legacy
description of the Poor-era coefficients and no longer matches the tables —
Claughton's 1999 CSYS paper (`A11`) uses the same "increased to 1.0" wording,
which dates it.

The spinnaker power function caps at **1.28** in the formula while the prose
two paragraphs later says "the maximum power increment is 20% above the base
level" (1.20). Both are printed; neither is retracted.

---

## 3. Flow regimes: what the measurements show

### 3.1 The published coefficient corpus

The best single synthesis is Souppez & Viola, *Experiments in Fluids* 65:15
(2024) (`A12`), collecting the spinnaker coefficient literature:

| AWA | C_L | C_D |
|---|---|---|
| **50–55°** | **1.3–1.6** | **0.4–0.6** |
| **80–110°** | **0.6–1.1** | **0.5–0.8** |
| **120–150°** | **0.3–0.9** | **0.6–1.0** |

"The highest CL have been reported for 50° ≤ βa ≤ 55°" (`A12`). Note these are
**substantially higher than ORC's** — ORC's 2023 peak CL is 1.075 against the
literature's 1.3–1.6 — because ORC normalises on rated area with no efficiency
factor while the wind-tunnel convention uses **full moulded sail area**. §7.2
explains why that gap is bookkeeping, not physics.

One caveat with teeth: Lasher et al. found that on a dead run "the only
significant geometric parameter is projected sail area" — so the physically
meaningful reference area *flips* at deep angles. Mixing the two silently is a
10–20 % error where it matters most.

### 3.2 Attached flow with a leading-edge bubble — but only on the lower sail

Because the luff is a **sharp** edge, there is exactly one incidence at which
flow is attached on both sides ("There is only one angle of incidence, namely
the ideal angle of attack" — Arredondo-Galeana et al., `A13`). Above it,
leading-edge separation always occurs; the shear layer may reattach in the
time-averaged sense as a **leading-edge separation bubble**.

The regime map at a *single* AWA is the surprise (`F5`, 55° AWA, 10° heel):

- Leading-edge separation along the **entire** luff.
- **Top sections (3/4, 7/8): no reattachment.** Cp decays slowly and almost
  linearly luff-to-leech — a bluff-body signature.
- **Middle and lower sections: reattach within ~10 % of curve length**, if the
  luff is not flapping.
- Second suction peak from sail curvature at **10–40 %** of curve length.
- **Trailing-edge separation from 70 % (mid) to 50 % (lowest section).**

**So at one apparent wind angle the head is already a parachute while the foot
is still a wing.** The transition is a spanwise progression that marches
downward as AWA increases — not a single switch at one angle.

The canonical section this literature converges on is a circular arc of about
**22 % camber** (`F4` build theirs at 22.32 %), with **ideal angle of attack
11°**, transition at 14–15°, and **critical Reynolds number 144 000 ± 2 000**.

### 3.3 Deep angles: unsteady, and that is the whole point

The evidence is in the *unsteadiness*, not the mean. Motta et al. (`F2`) report
the standard deviation of Cp at **0.2–0.3 near the luff at 80–90° AWA**, but
**1.5–2.5 over the whole section on a running course** — the same order as the
mean Cp itself. "Increased AWAs over 100° drastically flatten the pressure
distributions" near the leading edge (`F2`). **Practical bluff-body transition:
AWA ≈ 100–115°, reaching the head well before the foot.**

Deparday's corner loads say the same in the time domain: over one luff-flap
cycle, loads dip to **−28 % to −16 %** of time-average during the fold, then
peak at **+25 % to +30 %** at recovery, with peak suction |ΔCp| of **1.5–3**
over the first 40 % of chord, decaying within **0.1 s** (`F1`).

**This is the single largest thing the ORC model does not represent.** ORC
gives one steady coefficient per angle. The real sail at running angles
oscillates ±30 % about it at 0.2–0.8 Hz, and the crew's job — pumping, rocking,
steering to the waves — is to exploit exactly that unsteadiness.

### 3.4 Trim sensitivity: the most actionable number in the literature

From the water-tunnel study (`A13`):

> a **25 % difference in driving-force coefficient** between trim η = 0° and
> η = −10°, against **under 1 %** between three sails of very different twist.

**Ten degrees of trim error costs an order of magnitude more than sail
choice.** Depowering by rotating the sail 10° cuts drive 17 % and side force
30 %.

And the quantified version of "ease to the curl": easing to the verge of
curling raises drive force **up to 15 % at AWA 100°**, at all tested wind
speeds and both spinnakers (`A14`). **But the gain vanishes as AWA
decreases** (`A13`, citing `F5` and `A14`) — confirming from the physics side
what the sailmakers say from the deck: curl-and-trim is a deep-angle
technique, not a universal one
([`03`](03-trimming-best-practice.md) §3).

Viola & Flay's seven-step sheet sequence gives the shape of the penalty (`F5`):
trim #2 is maximum drive with recovery inside the first 5 % of curve length;
over-sheeted, the LE peak drops below Cp −3 and trailing-edge separation moves
forward to 70 %; over-eased, the sail flaps. **Over-easing falls off abruptly;
over-sheeting declines gently** — an asymmetry worth teaching.

### 3.5 Scale effects, and a contradiction not to collapse

Viola's review (`A15`) is blunt that "the error due to the reduced Re has never
been quantified" — full scale is Re ~10⁷ against ~10⁵ in the tunnel. `F4`
recommends model sails be tested at **Re > 230 000**. Against that, `A13`
argues the conclusions still transfer because separation is *fixed* at the
sharp leading edge, while noting model tests likely **over-estimate
separation**.

**The "wind tunnel matches reality" claim is reported three ways and they are
not the same comparison:**

| Comparison | Agreement |
|---|---|
| Forces, tunnel vs CFD (same condition) | **0.24 % on C_x, 0.33 % on C_y** (`A16`) |
| Forces, tunnel vs full scale on the water | **"poorer agreement… very large dispersion"** (Hansen et al., via `A15`) |
| Pressures, tunnel vs full scale | same Cp *range*, **qualitatively different distribution** — full scale shows one suction peak, tunnel and CFD show two (`A16`) |

**Do not let 0.5 % be quoted as "the tunnel matches reality". It is a
CFD-versus-tunnel number.** The one genuine tunnel-versus-water downwind result
in the literature is *negative*.

Two further contested items: the leading-edge vortex contribution to sectional
lift is published as **10–20 %**, **15–25 %** and **≥25 %** by overlapping
authors; and `A13` partially retracts the stable-LEV hypothesis, finding **no
stably attached delta-wing LEV** despite 35° sweepback, with vortices
convecting downstream at 0.53 U∞. **"A spinnaker works like a delta wing" is
contested, not settled.**

---

## 4. Apparent wind, and the soak/heat cycle

### 4.1 The polar, and a newer source than the repo's

The repo carries the **2012 ORC speed guide** (VPP 2011 1.02) at
`data/polar/orc-j70.json`. A newer **ORC one-design certificate (VPP 2021)**
exists at `data.orc.org` (`A17`), and a scraped 2024 fleet dataset of 25 J/70
certificates corroborates it to within ~1.5° and ~2 % on VMG.

Downwind optimum, both sources:

| TWS | 6 | 8 | 10 | 12 | 14 | 16 | 20 |
|---|---|---|---|---|---|---|---|
| **Repo 2012: TWA** | 141.9° | 144.8° | 150.7° | 162.5° | 172.0° | 174.0° | **137.1°** |
| **Repo 2012: VMG** | 3.40 | 4.24 | 4.98 | 5.64 | 6.20 | 6.70 | 8.45 |
| **2021 cert: gybe angle** | 145.0° | 148.0° | 150.8° | 148.0° | 145.0° | 143.5° | **138.3°** |
| **2021 cert: run VMG** | 3.56 | 4.49 | 5.14 | 5.56 | 6.07 | 6.77 | **9.38** |

**The two disagree substantially in the middle of the range.** The 2012 guide
sweeps to 174° at 16 kt; the 2021 certificate never goes deeper than 150.8°
and is *hotter* in breeze. VMG at 20 kt differs by 11 % (8.45 vs 9.38 kt).
This is a decade of VPP revision, and the 2021 shape agrees far better with
what the sailmakers describe. **Worth considering as a data update**, with
both retained and the delta shown.

### 4.2 A claimed artefact that does *not* affect the repo's data

Agent research flagged that for hot-angle boats the printed 150° row in ORC
certificates can be back-derived as `RunVMG / cos(30°)` rather than being an
independent solve. **Checked directly against the committed dataset:**

| TWS | 6 | 8 | 10 | 12 | 14 | 16 | 20 |
|---|---|---|---|---|---|---|---|
| printed BS(150°) | 3.78 | 4.87 | 5.75 | 6.38 | 6.91 | 7.49 | 9.14 |
| `RunVMG / cos 30°` | 3.93 | 4.90 | 5.75 | 6.51 | 7.16 | 7.74 | 9.76 |
| difference | −0.15 | −0.03 | −0.00 | −0.13 | −0.25 | −0.25 | **−0.62** |

The identity holds **only at TWS 10**, and only because the optimum there is
itself at 150.7°. Everywhere else the printed value is genuinely lower — which
is what an independent solve must give, since VMG at 150° cannot exceed the
optimum VMG. **The repo's 150° rows are real solves; the artefact does not
apply to this dataset.** Recorded because the claim would otherwise propagate.

### 4.3 The soak/heat structure

The angle gets deeper as breeze builds — until it doesn't. In the 2012 data the
optimum sweeps 142° → 174° from 6 to 16 kt, then snaps back to 137° at 20 kt
while boat speed nearly doubles. That is the planing branch.

The VMG cost of being off the target angle is what makes this teachable
(2021 certificate, derived): sailing 135° costs **−3.9 % at 6 kt, −10.6 % at
10 kt, −3.9 % at 16 kt, −3.1 % at 20 kt**. **The penalty is worst around
10 kt and nearly vanishes at 20 kt** — the optimum becomes a broad flat
plateau once the boat planes. That is precisely why heating up is nearly free
in breeze and expensive at 10 kt, and it falls straight out of the certificate.

The soak/heat cycle crews actually sail — heat up in lulls to rebuild apparent
wind, soak in puffs to cash it in as distance — is the *dynamic* version of
moving along this curve. It is not in the polar, because the polar is a
steady-state optimum at fixed TWS and the cycle exists because TWS varies.
North's VMG-mode description captures it exactly: flatten and turn down in
puffs, more heel and turn up in lulls (`T5`).

**Generic advice points the other way, and it is not wrong — it is about a
different boat.** Sailing World and SailZing both say light air means sailing
high and heavy air means heading for the mark; that describes a displacement
boat with a symmetric kite, where added breeze becomes drag rather than
planing. The J/70 goes the other way between 10 and 20 kt. Show both.

---

## 5. Planing on a J/70

### 5.1 Two waterline lengths, and both are defensible

`data/boats/j70.json` carries `hull.lwlM = 6.691`, and `PROVENANCE.md`
already tags it **assumed**: the ORC certificate's IMS measurement length `L`,
used as "the closest published proxy" rather than a measured LWL. The
**published LWL is 6.24 m** (J/Boats, Wikipedia, boat-specs, unanimous).

| | IMS `L` = 6.691 m | published LWL = 6.24 m |
|---|---|---|
| Hull speed (1.34·√LWL_ft) | **6.28 kt** | **6.06 kt** |
| Boat speed at Fn = 1.0 | 15.75 kt | 15.21 kt |

A 3.5 % spread. The conclusions below hold on either, so both are carried.

### 5.2 The polar's own optima, placed on the scale

| Condition | BSP | Fn (6.691 m) | Fn (6.24 m) | × hull speed |
|---|---|---|---|---|
| 6 kt TWS, soak optimum | 4.32 kt | 0.274 | 0.284 | 0.69–0.71 |
| **14 kt TWS, soak optimum** | **6.26 kt** | **0.398** | **0.412** | **1.00–1.03** |
| 16 kt TWS, soak optimum | 6.73 kt | 0.427 | 0.443 | 1.07–1.11 |
| 16 kt TWS at 135° | 8.75 kt | 0.556 | 0.575 | 1.39–1.44 |
| **20 kt TWS, planing optimum** | **11.53 kt** | **0.732** | **0.758** | **1.84–1.90** |

**The soak branch is capped by wave-making.** At 14 kt TWS the optimum sits at
Fn ≈ 0.40 — hull speed almost exactly — and pushing to 16 kt buys only 7 %.
The polar is pressed against the displacement wall, which is also why the
*angle* keeps going deeper: extra power cannot become speed, so it becomes
course. The planing branch is a different regime at Fn ≈ 0.73–0.76.

### 5.3 The planing threshold is disputed by a factor of 1.7

| Source | Full planing |
|---|---|
| **Sponberg**, *The Design Ratios* (read in full) | SLR 2.0–2.5 ⟹ **Fn 0.60–0.74** ⟹ **9.1–11.2 kt** |
| **Faltinsen**, *Hydrodynamics of High-Speed Marine Vehicles* (secondary) | **Fn 1.0–1.2** ⟹ **15.2–18.2 kt** |
| **ITTC** 7.5-02-05-01 | Fn > 0.45 — but this is an *administrative* threshold for which test procedure applies, not a physical one |

**Nine knots versus fifteen. Do not silently pick one.** The likely cause is
definitional: Sponberg writes for small-craft designers where planing means
visible bow-up behaviour, Faltinsen defines it strictly as hydrodynamic lift
carrying most of the weight. On Sponberg's criterion the J/70's 20 kt polar
point (Fn 0.73–0.76) is planing; on Faltinsen's it is not, and the boat never
planes at all in the ORC data.

Related: **"Fn_vol > 3.0 means planing" has no source.** The sourced
volumetric thresholds are 2 (Clement & Blount) and 1.18 (ITTC).

### 5.4 Crew weight moves the threshold, and there is no class limit

J/70 class rule C.3.1(a): "The crew shall consist of **3 or more** persons" —
**no weight limit and no maximum count** (`T9`). The de facto optimum is set by
drag: North reports competitive weight "settling in between 700 and 780
pounds" with the risk of "too much drag" above it.

**710 lb = 322 kg on an 812 kg boat is +40 % displacement.** That moves
displacement/length from 93 to 133 and sail-area/displacement from ~25 to
~19.4 — out of "ultra-light" and below the conventional performance line. **No
ratio computed on dry displacement describes the sailing boat.** Any planing
model should use ~1 160 kg sailing displacement, not the 812 kg class minimum.

(Also worth noting: class minimum dry weight is **812 kg** per rule C.6.1,
while J/Boats' own spec page still says 1 750 lb / 794 kg. The repo uses 811 kg
and the ORC certificate 811 — consistent with the class rule.)

### 5.5 What actually happens on the water

North's speed guide (`T2`), practitioner testimony rather than instrumented
measurement: surfing starts at **12–13 kt TWS**; "lazy planing" at **14–15 kt**;
"really begin planing" at **17–18 kt**; ride the edge at **20 kt**. That
brackets the polar's 16→20 kt corner and sits neatly where the soak branch hits
the wall.

**Top-speed claims should not become model targets.** The only figures found
are dealer marketing (16.2 kt, and a "20 knots" claim from a 2013 race) with no
instrument, conditions or crew stated. Anchor on the ORC 20 kt / 135° figure of
11.5–12.9 kt and Healy's 17–18 kt onset. And remember the 11.53 kt is VPP
output, never measured — **the model's most useful validation target and its
least trustworthy number simultaneously.**

---

## 6. Why heel, rudder and rock matter

### 6.1 Rudder drag is the one leg with real numbers

**Rudder angle versus drag, measured full scale** (`A18`, full-scale Finn
rudders at 4.5 kt, repeatability 0.5 %):

| Rudder angle | 0° | 1° | 2° | **5°** | **10°** |
|---|---|---|---|---|---|
| Drag (N) | 1.81 | 2.00 | 2.49 | **6.14** | **19.4** |

**Five degrees of rudder is ~3.4× the zero-lift drag; ten degrees is ~10.7×.**
Drag rises roughly with the square of angle: the first 2° is nearly free,
everything past 5° is expensive. That is the number to build a "rudder tax"
into a trainer.

**How much of total resistance is at stake** (`A19`, Chalmers PhD): the rudder
is **~12.8 % of total hydrodynamic resistance** (hull 84 %, keel 3.5 %). In
that study, cutting rudder-angle amplitude from ±21.0° to ±16.2° (−23 %) cut
mean rudder resistance **32 %**, "due to the quadratic nature of induced drag".
The causal chain is the windward-heel argument in reverse: less heel amplitude
→ less yaw-moment imbalance → less rudder → less drag.

ORC encodes the heel-to-rudder coupling directly: "the rudder area is taken as
zero when the boat is upright, and increases sinusoidally up to **twice its
physical area at 30 degrees of heel**" (`A1`, §6.5).

### 6.2 The windward-heel speed gain is unmeasured

**No source found — sailmaker, coach or academic — publishes a measured boat
speed gain from windward heel.** The mechanisms are stated qualitatively:
stacking the centre of effort over the centre of lateral resistance to
neutralise the turning moment, projecting the kite out of the main's shadow,
and (weakest) reducing wetted surface. Only the rudder-drag chain is
quantified, and only upwind in waves at 4.5 kt on a dinghy rudder.

**Anything the app says about a windward-heel speed gain is an
`ASSUMPTIONS.md` row, not a `prov:` tag.**

Note also that the ORC polar reports **11.5–12.0° of leeward heel at every
downwind optimum** — the VPP has no representation of the windward heel every
sailmaker prescribes for soaking, which the project's `ASSUMPTIONS.md` already
flags.

### 6.3 Rocking and pumping exploit unsteadiness

Given §3.3's ±30 % load pulsation at 0.2–0.8 Hz, downwind sail force is
genuinely time-varying, and body movement in phase with it does real work. The
transferable numbers come from flapping-foil propulsion (`A20`): pumping
frequency **0.7–2 Hz**, efficient Strouhal band **0.2 < St < 0.4**, lab rigid
foils reaching **86 % efficiency at St = 0.3** — but **real measured windsurfer
sail pumping is ~20 % efficient**. Sailors instinctively stroke inside the
efficient band.

The Chalmers result is the best roll-specific evidence: putting the
aerodynamic heeling moment **in phase with heel** (rather than the
quasi-static model's maximum moment at minimum heel) cut heel amplitude 75 %
and rudder resistance 32 %. **The phase between rig motion and sail force is
what decides whether rolling helps or hurts.**

**No published thrust coefficient for roll-pumping a keelboat was found.** The
mechanism is the flapping-foil one; the J/70-specific magnitude is unmeasured.

This is why RRS 42 has to prohibit rocking at all, and why the J/70 class rules
deliberately permit **unlimited gennaker sheet play** when surfing or planing
is possible ([`03`](03-trimming-best-practice.md) §1). The rules draw a line
through a real physical effect.

---

## 7. Lineage, and the trap in comparing coefficient sets

### 7.1 Kerwin is not the source of the spinnaker table

A correction to the brief's framing. The tabulated-coefficient sail model
starts with **Hazen (1980)**, not Kerwin. Kerwin's surviving contributions are
the VPP equilibrium formulation and the **Reef/Flat depowering scheme**. ORC's
own background section records the lineage: Kerwin & Newman 1979 → MHS → "The
aerodynamic model was subsequently revised by George Hazen (Hazen 1980)", and
Claughton (`A11`) records that the aerodynamics "has not been fundamentally
changed since the shift from the Bay Bea 'complete sailplan' approach to that
described by George Hazen in 1980."

Hazen's induced drag was `CD_i = CL²·(1/(π·AR) + 0.005)` — **that 0.005 is the
direct ancestor of ORC's `kp`**, the 2-D lift-dependent viscous term that sits
alongside classical induced drag. The repo's `kp = 0.02648` is the same
quantity, five times larger and per-sail.

### 7.2 The 1.71-versus-1.026 trap

Poor's 1986 IMS spinnaker table peaks at **CL 1.71**; ORC 2023's symmetric
peaks at **1.026**. That is not a 40 % physics revision. ORC's own footnote:

> "in the old days some efficiency factors were adopted for the sails areas
> (1/1.16 for the mainsail, 0.6 for the symmetric spinnaker, 0.72 for the
> asymmetric)" (`A1`)

**1.71 × 0.6 = 1.026, exactly.** The coefficient did not fall; the reference
area grew by 1/0.6. (Hazen's CD at 180° of 0.66 = 1.1 × 0.6 corroborates.)
**Any app mixing a Poor-era CL with an ORC-era area is wrong by ~1.7×** — and
this is also most of why the wind-tunnel literature's CL of 1.3–1.6 (§3.1) sits
above ORC's 1.075 without either being wrong.

---

## 8. What could not be verified

**Named in the brief, not obtainable:** Kerwin's MIT report 78-11 (DSpace
bitstream empty, TU Delft 403); Fossati 2009 (**no preview, no snippets, zero
numbers extracted**); Claughton, Wellicome & Shenoi's book (lending-restricted);
Richards, Johnson & Stanton 2001; Lasher & Richards 2007; Hansen, Jackson &
Hochkirch 2003. Also unobtainable and wanted: Campbell 2014 on cross-tunnel
spread in downwind coefficients — the best source for how much tunnels disagree
with each other.

For **Richards, Johnson & Stanton**, §2.3 answers its title question
independently from the ORC table. A search-engine summary of the abstract
suggests the paper's answer is "both — trim for maximum lift while retaining
significant drag", which agrees; but that summary is unverified and is not
relied on.

For **Hansen et al.**, the substantive finding survives as a secondary
characterisation by a leading author (`A15`): they "found poorer agreement than
Masuyama et al., perhaps due to the very large dispersion of the experimental
data." **That is the key downwind tunnel-versus-full-scale result and it is a
negative one.** A related Hansen figure, also secondary: the traditional
"reef and flat" depowering scheme — the one ORC still uses — **under-estimates
boat speed by up to 4 %**, where a 'twist and ease' parameterisation predicts
to ±1 %.

**Highest-value single addition remains Hansen et al.**, because every
wind-tunnel number in §3 carries an unquantified scale error and that paper is
the one that measures the gap.
