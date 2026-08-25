# Spinnaker physics, flying shape, and trimming best practice

- **Question:** The gennaker is now drawn in 3D from four controls, but its
  shape model is invented (ADR 0017, every constant `prov: assumed`). What
  does the evidence actually say about how an asymmetric works, what shape it
  flies in, and how a J/70 is trimmed downwind — and how much of the drawn
  kite can honestly stop being assumed?
- **Date:** 2026-08-25
- **Method:** Three parallel research agents (aerodynamics; flying-shape
  measurement; the J/70 downwind playbook), plus local geometry checks run
  against `src/ui/three/kite.ts`, `src/core/shape/flying.ts` and the ORC
  polar already committed at `data/polar/orc-j70.json`.

## Summary

The invented layer turns out to be far more replaceable than ADR 0017
assumed, because a full-scale photogrammetric dataset exists for the **J/80**
— the J/70's sprit-tacked sportboat sister — with per-height camber, draft
position and twist measured at four apparent wind angles, plus corner loads
and the luff-curl mechanism itself. Measured against it, the app's drawn kite
is roughly 40 % too flat, carries less than half the twist a running
asymmetric flies, holds its draft position constant where the real sail moves
it aft above three-quarter height, and — the one outright error — bows its
luff to leeward at every angle when the measured luff crosses to **windward**
by 120–140° AWA, which is where the J/70 spends its downwind legs. Two purely
local checks add more: the drawn leech carries 25–40 % more cloth than the
sail's published 8 800 mm leech, and the clew is treated as a free point when
the published leech and foot lengths pin it to a circle — a circle whose
geometry independently reproduces Deparday's measured 1.4 m of clew rise. The
luff-sag *magnitude* model, by contrast, checks out to within 3 % of an exact
circular arc, and the ORC downwind polar in `data/polar/` is tier A and
already in the repo. On the aerodynamics side, resolving ORC's own Table 5.7
into the boat's frame answers the "wing or parachute" question numerically —
lift supplies over 100 % of net drive below 90° AWA and 0 % at 180°, with the
changeover near 140° — and turns up the sharpest honesty finding in the set:
**ORC gives the spinnaker a blanketing factor of exactly 1 at every angle**,
and a sloop's mainsail factor is identically 1 too, so two of the four
downwind controls (sprit and tack line) act on a main-shadow mechanism the
solver has no term for at all. Reading the current ORC edition alongside the
2023 one also found that **ORC silently re-powered the bowsprit asymmetric at
deep angles** (CL at 130° AWA up 59 %) while its own revision list and a
standing footnote both deny any change, and that ORC's minimum `flat` under
spinnaker is **0.53**, not the 0.42 the repo applies to every sailset. Three
smaller corrections: `data/boats/j70.json` labels the asymmetric with ORC
Table **5.6**, the *symmetric* table (the solver correctly uses 5.7, so this
is mislabelled provenance, not a bug); a newer **VPP 2021** ORC polar exists
that is markedly hotter downwind than the 2012 speed guide the repo carries;
and a claimed artefact in ORC's 150° polar row was checked against the
committed data and **does not apply to it**. The honest verdict is that most
of `kite.ts` can move from `assumed` to `published` or `derived`, that target
TWA/BSP by TWS is tier A today, and that curl *onset as a function of sheet
position* remains the one thing nobody has measured and which must stay
tier C.

## Files

1. [`01-asymmetric-aerodynamics.md`](01-asymmetric-aerodynamics.md) — how an
   asymmetric makes drive across the downwind range, the ORC VPP's treatment
   of spinnaker coefficients and depowering, the wind-tunnel and full-scale
   evidence, why heel, rudder and rock matter, and the J/70's planing
   thresholds.
2. [`02-flying-shape.md`](02-flying-shape.md) — what the flying shape is and
   what moves it, with measured numbers: camber, draft and twist by height
   and by AWA; luff bow magnitude and direction; head rotation as a
   fixed-volume deformation; the curl mechanism; the leech constraint. Ends
   with the control → effect → range → source table.
3. [`03-trimming-best-practice.md`](03-trimming-best-practice.md) — the J/70
   downwind playbook by wind band, the class rule that rewrites RRS 42.3(c),
   sheet technique, heel and crew weight, target TWA/BSP by TWS, planing,
   gybing, and the jib-downwind argument.
4. [`04-model-implications.md`](04-model-implications.md) — what the app
   should change: corrections to `kite.ts`, which numbers can leave tier C,
   what the Gennaker panel should show, and a proposed `ASSUMPTIONS.md` row
   list split into published / derived / still assumed.

Decisions belong in ADRs, not here. This workspace is analysis; ADR 0017 is
the standing decision it would revise.

---

## Sources

All URLs accessed **2026-08-25**.

### Aerodynamics (`A*`)

**Verified — read first-hand in this pass:**

| Key | Source |
|---|---|
| `A1` | ORC VPP Documentation. [2023 edition](https://orc.org/uploads/files/ORC-VPP-Documentation-2023.pdf) (Tables 5.6/5.7/5.8, the ones the repo transcribes) and [2026 edition](https://orc.org/uploads/files/Rules-Regulations/2026/ORC-VPP-Documentation-2026.pdf) (same tables renumbered 5.8/5.9/5.10, coefficients changed). §5.1 spinnaker de-powering and `flatmin`, §5.2.3–5.2.4 spinnaker area / power / SHAPE, §5.4.3 `fcdmult`, §5.4.4 twist, §5.6.3 blanketing, §6.5 rudder-area heel coupling, §7.1 apparent wind |
| `A2` | [ORC Speed Guide Explanation 2023](https://orc.org/uploads/files/Rules-Regulations/2023/Speed-Guide-Explanation-2023.pdf) |
| `A11` | [Claughton, *Developments in the IMS VPP Formulations*, 14th CSYS (1999)](https://www.boatdesign.net/attachments/ussailingclaughton1999-36211-pdf.162765/) — the accessible primary closest to the requested Claughton book; coefficients "based on cloth area", downwind sail-type comparison, effective-rig-height factors |
| `A12` | [Souppez & Viola, *Water tunnel testing of downwind yacht sails*, Experiments in Fluids 65:15 (2024)](https://link.springer.com/content/pdf/10.1007/s00348-023-03752-2.pdf) — the published Cl/Cd-vs-AWA corpus, reference-area conventions, mainsail upwash |
| `A13` | [Arredondo-Galeana, Babinsky & Viola, *Vortex flow of downwind sails*, Flow 3:E8 (2023)](https://www.cambridge.org/core/journals/flow/article/vortex-flow-of-downwind-sails/7D33E98C997AFF463C9AE425D5C5F481) — ideal angle of attack, trim sensitivity (25 % drive for 10° of trim), partial retraction of the stable-LEV hypothesis |
| `A14` | [Augier, Deparday et al., *J. Sailing Technology* (2021)](https://hal.science/hal-04203524/document) — drive gain from easing to the verge of curling (up to 15 % at AWA 100°) |
| `A15` | [Viola, *Downwind sail aerodynamics: a review*, Applied Mechanics Reviews (2013)](https://www.pure.ed.ac.uk/ws/files/14078155/Viola_2013AMR.pdf) — Reynolds-scaling caveats; carries the secondary characterisation of Hansen et al. |
| `A16` | [Viola & Flay, *Ocean Engineering* 38(16):1733–1743 (2011)](https://www.pure.ed.ac.uk/ws/files/12967578/Viola_Flay_2011OE.pdf) — wind tunnel vs CFD force agreement, and the qualitatively different full-scale pressure distribution |
| `A17` | [ORC one-design certificate, J/70, VPP 2021](https://data.orc.org/public/od/2021/j70.od.html?nav=1) — newer polar than the 2012 speed guide the repo carries; cross-checked against the [scraped 2024 ORC fleet dataset](https://github.com/jieter/orc-data) |
| `A18` | [Persson et al., *Performance Evaluation and Ranking of Rudders*, J. Sailing Technology 2018-04](https://higherlogicdownload.s3.amazonaws.com/SNAME/1516f098-2760-4bff-86fa-9ca63a85f102/UploadedImages/2018-04__Persson_et_al___Performance_Evaluation_and_Ranking_of_7_rudders.pdf) — full-scale rudder drag vs angle |
| `A19` | [Persson, PhD thesis, Chalmers (2025)](https://www.dissertations.se/dissertation/f3a378ccf1/) — rudder share of total resistance; heel-amplitude → rudder-drag chain |
| `A20` | [Bertrand et al., *Efficiency of human-powered sail pumping*](https://hupi.org/HPeJ/0023/HumanPoweredSailPumpingV7.pdf) — Strouhal band and measured pumping efficiency |
| `A21` | [Sponberg, *The Design Ratios*](https://www.ericwsponberg.com/wp-content/uploads/2021/09/THE-DESIGN-RATIOS.pdf) — derives the 1.34 hull-speed constant; the lower of the two planing thresholds |
| `A22` | [ITTC 7.5-02-05-01, High Speed Marine Vehicles](https://ittc.info/media/2065/75-02-05-01.pdf) |
| `A23` | [International Measurement System 2024](https://orc.org/uploads/files/Rules-Regulations/2024/International-Measurement-System-2024.pdf) — SLU/SLE/SFL/SHW definitions and the old→new abbreviation table (ASF ≡ SFL, SMG ≡ SHW) |

The pressure and wind-tunnel evidence in [`01`](01-asymmetric-aerodynamics.md)
§3 is also cited under the `F*` keys below (`F1`, `F2`, `F4`, `F5`), because
those same papers supply both the flying-shape and the pressure measurements.

**Named in the brief, could NOT be obtained. Nothing in
[`01`](01-asymmetric-aerodynamics.md) rests on them; §8 there records what
each would settle:**

- Kerwin, *A Velocity Prediction Program for Ocean Racing Yachts* (MIT 78-11)
  — DSpace bitstream empty, TU Delft 403. Note [`01`](01-asymmetric-aerodynamics.md)
  §7.1 corrects the premise: the coefficient-table model descends from Hazen
  1980, not Kerwin, whose surviving contribution is the Reef/Flat scheme
- Fossati, *Aero-Hydrodynamics and the Performance of Sailing Yachts* (2009)
  — no preview, no snippets, **zero numbers extracted**
- Claughton, Wellicome & Shenoi, *Sailing Yacht Design: Theory* —
  lending-restricted; `A11` is the accessible substitute
- Richards, Johnson & Stanton, "America's Cup downwind sails — vertical wings
  or horizontal parachutes?", *J. Wind Eng. Ind. Aerodyn.* 89 (2001) —
  [`01`](01-asymmetric-aerodynamics.md) §2.3 answers its title question
  independently from the ORC table
- Lasher & Richards, spinnaker force-coefficient studies, *J. Ship Research*
- Hansen, Jackson & Hochkirch, wind-tunnel vs full-scale sail forces, IJSCT
  145(B1) (2003) — **the highest-value single addition**, because every
  wind-tunnel number carries an unquantified scale error and this is the paper
  that measures it. Its finding survives only as a secondary characterisation
  in `A15`, and it is negative
- Campbell, "A comparison of downwind sail coefficients from tests in different
  wind tunnels", *Ocean Engineering* 90:62–71 (2014) — paywalled; the best
  source for cross-tunnel spread

### Flying shape (`F*`)

| Key | Source |
|---|---|
| `F1` | [Deparday, *Experimental studies of Fluid-Structure Interaction on Downwind sails*, PhD thesis (2016)](https://theses.hal.science/tel-01368071v1/file/Deparday2016_ExperimentalStudiesDownwindSails_FinalThesis.pdf) — full-scale J/80 photogrammetry, Table 3.1 (camber/draft/twist by height), Table 3.2 (3D camber, volume), Ch. 4 (curl mechanism), §3.1.4 (Bézier surface) |
| `F2` | [Motta, Flay, Richards, Le Pelley, Deparday & Bot, *Ocean Engineering* 90:104–118 (2014)](https://hal.science/file/index/docid/1071557/filename/IRENAV_OE_2014_BOT2.pdf) — VSPARS full-scale + VO70 wind-tunnel, Table 1 (camber/draft vs AWA), Table 2 (boat dimensions) |
| `F3` | [Le Pelley & Modral, *VSPARS* sail-shape acquisition (2008)](https://www.vspars.com/cmsFiles/file/LePelley_Modral_VSPARS.pdf) |
| `F4` | [Souppez, Arredondo-Galeana & Viola, *Recent Advances in Numerical and Experimental Downwind Sail Aerodynamics*, J. Sailing Technology 4(1):45–65 (2019)](https://www.pure.ed.ac.uk/ws/portalfiles/portal/111983387/2019_03_Souppez_et_al_Recent_Advances_in_Downwind_Sail_Aerodynamics.pdf) |
| `F5` | [Viola & Flay, IJSCT 151(B2) (2009)](https://www.pure.ed.ac.uk/ws/files/14074681/Viola_Flay_2009IJSCT.pdf) — same paper as `A9`, cited here for trim → separation and luff-flap frequency |
| `F6` | [Sailing World — *The Commandments of Asym Trim*](https://www.sailingworld.com/how-to/the-commandments-of-asym-trim/) (Klingler/Doyle, Lutz/North, Nixon) |
| `F7` | [North Sails — Melges 24 Tuning Guide](https://www.northsails.com/en-us/blogs/north-sails-blog/melges-24-tuning-guide) |
| `F8` | [North Sails J/80 Tuning Guide (PDF)](https://www.j80na.com/wp-content/uploads/2025/02/North-Sails-Tuning-Guide.pdf) |
| `F9` | [North Sails — *Trim an Asymmetric Spinnaker on a Sport Boat*](https://www.northsails.com/en-us/blogs/north-sails-blog/trim-an-asymmetric-spinnaker-on-a-sport-boat); [Westaway Sails — Asymmetric Spinnaker Tuning Guide](https://www.westawaysails.co.uk/sail-setting/asymmetric-spinnaker-tuning-guide/) (near-identical wording) |
| `F10` | [Quantum — Guide to Cruising Asymmetrical Spinnakers (PDF)](https://www.quantumsails.com/QuantumSails/media/Whitepapers/Product-Guide-to-Crusing-asymmetrical-Spinnakers.pdf?ext=.pdf) |
| `F11` | [Ullman Sails Melges 24 Sailing Guide (PDF)](https://ullmansails.co.uk/wp-content/uploads/2019/10/melges24sailingguide.pdf) |
| `F12` | [48° North — *A-Sail Luff Curl: Sometimes, Always, Never?*](https://48north.com/racing/racing-technique/a-sail-luff-curl-sometimes-always-never/) — intro only, body not retrievable |
| `F13` | [OneSails — Spinnaker Trimming](https://www.onesails.com/spinnaker-trimming/) |
| `F14` | [Cruising World — Trimming an Asymmetrical Sail](https://www.cruisingworld.com/trimming-an-asymmetrical-sail/) |
| `F15` | [48° North — J/Podders at J/70 Worlds ("Beast Mode")](https://48north.com/racing/race-reports/j-podders-at-j-70-worlds/) |

### Trimming and rules (`T*`)

| Key | Source |
|---|---|
| `T1` | [North Sails J/70 Tuning Guide](https://www.northsails.com/en-us/blogs/north-sails-blog/j70-tuning-guide) |
| `T2` | [North Sails J/70 Speed Guide](https://www.northsails.com/en-us/blogs/north-sails-blog/j70-speed-guide) (Tim Healy Q&A) |
| `T3` | [Quantum J/70 Tuning and How-To Guide 2021 (PDF)](https://www.quantumsails.com/QuantumSails/media/ODClassDocuments/J70_TuningGuide_2021.pdf) |
| `T4` | [Doyle 2024 J/70 Tuning & Trim Guide (PDF)](https://www.doylesails.com/wp-content/uploads/2023/11/J70-Tuning-Guide-2024.pdf) (Jud Smith / Tomas Hornos) |
| `T5` | [North Sails — *Speed Reading: Five Downwind Modes*](https://www.northsails.com/en-uk/blogs/north-sails-blog/north-sails-j-70-tips-simplified-to-optimize-your-downwind-performance) |
| `T6` | [North Sails — J/70 Downwind Tips, Marginal Planing](https://www.northsails.com/en-us/blogs/north-sails-blog/downwind-tips-us-winter-series) (Tim Healy, DIYC Winter Series) |
| `T7` | [North Sails J/70 Tuning Guide, Version O07 (PDF)](https://www.carpediemsailingteam.com/app/download/9737020/north-j70-tuningguide.pdf) |
| `T8` | [ORC Speed Guide — J/70 ONE DESIGN polar tables (PDF)](https://www.carpediemsailingteam.com/app/download/16137868/Speed_Guide_J70_Class.pdf) — VPP 2011 1.02, issued 2012-04-30. Already committed at [`data/polar/orc-j70.json`](../../../data/polar/orc-j70.json) |
| `T9` | [International J/70 Class Rules 2024 (PDF)](https://j70ica.org/wp-content/uploads/2023/12/Class-Rules-2024.pdf) — C.1.1(b) modifies RRS 42.3(c); C.3.3 crew position; C.9.4 bowsprit; G.5.3 spinnaker dimensions |
| `T10` | [US Sailing — RRS 42.3 Exceptions (PDF)](https://www.ussailing.org/wp-content/uploads/2020/12/42.3-Exceptions.pdf); [RRS 42.2 Prohibited (PDF)](https://www.ussailing.org/wp-content/uploads/2020/12/42.2-Prohibited-Items.pdf) |
| `T11` | [World Sailing Rule 42 Interpretations (PDF)](https://www.sailing.org/tools/documents/42interpretations2010final-%5B8881%5D.pdf) |
| `T12` | [ORC Speed Guides programme page](https://orc.org/sailors/sailor-services/speed-guides) — current guides paywalled behind ORC Sailor Services |

### Sources checked and rejected

- **UK Sailmakers J/70** ([page](https://www.uksailmakers.com/one-design/j-70/),
  [tuning guide PDF](https://www.uksailmakers.com/wp-content/uploads/2022/10/UK_Sailmakers_J70_Tuning_Guide.pdf))
  — **no downwind content exists**; the guide is a two-page image-only scan.
  Do not cite it downwind.
- **Renzsch & Graf, FlexSail** — a coupled RANSE/FEM spinnaker solver whose
  reported force deviations (~3 % against Auckland wind-tunnel data) would be
  worth citing, but no primary copy could be opened (ResearchGate and
  Academia.edu both 403). Left uncited rather than cited second-hand.
- **Ranzenbach** — appears in this literature as a discusser of `A9`/`F5`, not
  as a flying-shape measurement source. No geometry numbers.
- **Sailing Anarchy forum claim** that asymmetric luff round ran 112 % in the
  1980s and 103–104 % today — paywalled, unopenable, and contradicted by the
  measured 108.9 % in `F1`. Recorded as a contradiction in
  [`02`](02-flying-shape.md) §3.1, not used.
