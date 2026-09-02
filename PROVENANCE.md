# Provenance

Every number the app uses, where it came from, when it was retrieved, and
whether it is published, measured, derived or assumed. Third-party settings
are committed by decision (ADR 0008); this file attributes them and does not
reproduce any prose from the source documents.

Kinds: **published** (printed in a source), **measured** (from an
instrument), **derived** (computed from published values by a stated
method), **assumed** (no source; see ASSUMPTIONS.md).

## The ORC VPP edition is pinned by year

**`src/core/aero/orc/tables.ts` transcribes the ORC VPP Documentation, 2023
edition** (`orc-vpp-2023` below). Citing "the ORC VPP documentation" without a
year is not enough: ORC moves both the table numbers and the numbers in them
between editions, and in one case did so without saying it had.

**Table numbering by edition.** The 2026 edition inserted a new Table 5.1 (RS
percentages) and a new Table 5.7 (roller-furling jib deltas), pushing the
spinnaker tables down by two. Every `orcTable` label in `data/boats/j70.json`
is **2023 numbering**; by the same insertion points the main (`5.1`) and jib
(`5.4`) become 5.2 and 5.5 in 2026 — inferred from the insertions, not read off
the 2026 document.

| Sail | 2023 / 2024 | 2026 |
| --- | --- | --- |
| Symmetric spinnaker (`kpss` 0.02639) | 5.6 | 5.8 |
| **Asymmetric on centreline** (`kpasc` 0.02648) — the J/70 | **5.7** | 5.9 |
| Asymmetric on a pole (`kpasp` 0.02648) | 5.8 | 5.10 |

**The 2026 edition changed the asymmetric-on-centreline coefficients, and the
revision list does not mention it.** The section still carries a footnote
saying the last adjustment to single-sail coefficients was made in 2016. It is
wrong. Read off the two published tables, with drive
`CFx = CL·sin β − CD·cos β` derived from them:

| AWA | 2023 CL | 2026 CL | 2023 CD | 2026 CD | drive `CFx` |
| ---: | ---: | ---: | ---: | ---: | --- |
| 75° | 1.075 | 1.130 | 0.477 | 0.400 | 0.915 → 0.988 |
| 115° | 0.805 | 0.885 | 0.566 | 0.565 | 0.969 → 1.041 |
| **130°** | **0.372** | **0.592** (+59 %) | 0.475 | 0.540 | 0.590 → 0.801 (**+36 %**) |
| 150° | 0.100 | 0.240 | 0.352 | 0.420 | 0.355 → 0.484 (**+36 %**) |
| 180° | 0.000 | 0.000 | 0.262 | 0.195 | 0.262 → 0.195 (**−26 %**) |

Net effect: 2026 raises deep-angle drive by ~36 % at 130–150° and lowers it
20–26 % at 170–180°. It does not move the peak — maximum drive is at 100° AWA
in both editions.

**The repo stays on 2023 deliberately, until re-validated.** The whole hydro
calibration was fitted against the 2023 coefficients, so adopting 2026 is a
re-fit and a re-run of the hold-out gate, not a table swap: +36 % of drive at
130–150° AWA is exactly the regime the gate's asymmetric VMG rows live in, and
the reference polar those rows are scored against is older still (ORC Speed
Guide, VPP 2011 1.02). Swapping one of the three without the others would
trade a known bias for an unknown one. Numbers above from research
[`2026-08-25-spinnaker/01-asymmetric-aerodynamics.md`](docs/research/2026-08-25-spinnaker/01-asymmetric-aerodynamics.md)
§2.1–2.3, which read both editions directly.

**One constant is not from 2023, on purpose.**
`FLAT_MIN_SPINNAKER = 0.53` — the baseline minimum `flat` with a spinnaker or a
headsail set flying — comes from the **2026** edition, §5.1 footnote 3, which
records the change as made in 2024. The 2023 text gives only the 0.42 upwind
baseline and no separate offwind floor, so there is nothing to carry from it;
leaving 0.42 in place let the solver de-power downwind past what the VPP
permits. The mixed edition is the honest trade and is flagged in the constant's
own docblock.

**Research-corpus source ids.** `prov:` tags in `src/**` that cite `F*`, `T*`
or `S*` resolve against the research workspace they name, not against the
Sources table below: `F*`/`T*` in
`docs/research/2026-08-25-spinnaker/README.md`, `S*` in
`docs/research/2026-08-25-cockpit/02-j70-trim-mental-model.md`.

## Keuning & Sonnenberg 1998: the heel law, and what could not be verified

`src/core/hydro/resistance.ts heelResistance` cites one published relation, the
Delft Systematic Yacht Hull Series scaling of the heeled residuary increment:

> ΔRrh(φ) = ΔRrh(20°) · 6.0 · φ^1.7, with φ in **radians**

from J. A. Keuning and U. B. Sonnenberg, *Approximation of the hydrodynamic
forces on a sailing yacht based on the Delft Systematic Yacht Hull Series*,
15th HISWA Symposium, Amsterdam, 16 November 1998 (TU Delft report 1175-P).

**This is not an ORC citation and must not be relabelled as one.** ORC's VPP
has published no closed-form heel drag since its 2013 hydro model: the 2023
edition's §6.4 says only that heeled viscous and residuary resistance are
recomputed by re-running the hull's hydrostatics heeled, and the closed form
that *did* appear in ORC VPP 2012 §6.4.2.1 eqs [73]–[77] is a different model
with a hull-form-dependent exponent, in a superseded edition.

**Transcription chain, stated because the primary is not reachable.** The 1998
paper is not available online (checked 2026-09-02; it is a symposium paper, not
an open report). The relation above is transcribed from four independent
secondary sources that agree digit for digit — a TU Lisboa MSc VPP thesis, the
Bathfield report X-04/151, and two open-source VPP implementations (Python-VPP,
SailPy) — and is independently pinned by its own arithmetic:
6 · (20° in radians)^1.7 = 1.0025, so the law returns unity at exactly the 20°
datum it is defined on. That single check fixes the constant, the exponent and
the radian convention simultaneously, which is why this app is willing to ship
it without the primary.

**What is deliberately NOT taken from the same paper.** ΔRrh(20°) itself is a
regression in Lwl/Bwl, Bwl/Tc and LCB with a coefficient table over Fn
0.25–0.55. It is not used, for two reasons and either would be enough: it needs
the canoe-body draft Tc and LCB, neither of which is a measured field on any
boat file here; and its **scale factor is unresolved across the same sources** —
one prints the coefficients "multiplied by 100", one divides them by 1000 in
code, and three print the equation with no factor at all, a spread of three
orders of magnitude in the answer. Resolving it needs Fossati, *Aero-
Hydrodynamics and the Performance of Sailing Yachts* (2009) Table 2.7, which
Python-VPP names as its own source. Until then the magnitude is fitted
(`hydro.heelDragK`, ASSUMPTIONS.md) and labelled assumed, not published.

<!-- generated: do not edit below this line -->

## Sources

| Id | Title | Retrieved | Edition | URL |
|---|---|---|---|---|
| `class-rules-2026` | International J/70 Class Rules, effective 1 February 2026 | 2026-08-25 | Published 02 February 2026; Effective 01 February 2026; previous issue 16 January 2024. Linked from https://j70ica.org/class-office-rules/ (no separate 2025 edition was found there; this is the current edition) | <https://j70ica.org/wp-content/uploads/2026/02/J70-Class-Rules-2026-1.pdf> |
| `orc-cert` | ORC public one-design certificate, J/70 | 2026-08-25 | 2021 offset file (J70.od), VPP ver 2021 1.00; page marked 'TEST CERTIFICATE - NOT VALID FOR RACING' (data.orc.org public template certificate, not an owner-specific issued certificate) | <https://data.orc.org/public/od/2021/j70.od.html?nav=1> |
| `app-convention` | Sailflow app UI convention (not a published source) | 2026-08-25 | internal | <> |
| `orc-vpp-2023` | ORC VPP Documentation | 2026-08-25 | 2023 edition. The coefficient tables in src/core/aero/orc/tables.ts are transcribed from this edition. ORC renumbered the sail tables in the 2026 edition (symmetric 5.6 -> 5.8, asymmetric on centreline 5.7 -> 5.9, asymmetric on pole 5.8 -> 5.10) and changed the asymmetric-on-centreline coefficients; every orcTable label in this file is 2023 numbering | <https://orc.org/uploads/files/ORC-VPP-Documentation-2023.pdf> |
| `class-rules-m24-2026` | International Melges 24 Class Rules, effective 30 January 2026 | 2026-08-26 | Effective date 2026-January-30, Status: Approved. Linked from World Sailing's class page (https://www.sailing.org/document/2023-apr-19-class-rules-melgels-24/). ADR 0020 expected the 2017 edition, because the link the class association's own Measurement & Inspection page carries (d7qh6ksdplczd.cloudfront.net/.../M24CR190422.pdf, the 2022 rules) points at a host that no longer resolves; the current edition is reachable through World Sailing instead | <https://media.sailing.org/sailing/wp-content/uploads/2023/04/30154150/M24_CR_2026-01Jan-30.pdf> |
| `orc-cert-m24` | ORC certificate, MELGES 24 'HAIZEA' POR-210, RefNo 03510004JAJ | 2026-08-26 | ESP national authority, certificate 21001, C_Type INTL, issued 2026-03-30. A per-certificate document, not a class one-design certificate: ADR 0020 measured the spread across 40 Melges 24 certificates at up to 11.4 %, driven by measured displacement spanning 821-1002 kg, so every number taken from it names this boat and not the class | <https://data.orc.org/public/WPub.dll?action=DownBoatRMS&RefNo=03510004JAJ&ext=json> |
| `north-j70` | J/70 Tuning Guide | 2026-08-25 | Rev. 1015 | <https://j70tr.org/wp-content/uploads/2025/12/north-j70-tuningguide-EUR.pdf> |
| `quantum-j70` | J/70 Tuning and How-To Guide | 2026-08-25 |  | <https://www.quantumsails.com/en/sails/one-design/documents/j70/j70_tuningguide.aspx> |
| `orc-speed-guide-j70` | ORC Speed Guide - J/70 Class | 2026-08-25 | VPP 2011 1.02 | <https://www.carpediemsailingteam.com/app/download/16137868/Speed_Guide_J70_Class.pdf> |
| `orc-rms-m24-03510004JAJ` | ORC certificate allowances, MELGES 24 'HAIZEA' POR-210, RefNo 03510004JAJ | 2026-08-26 | ORC VPP, certificate issued 2026-03-30 | <https://data.orc.org/public/WPub.dll?action=DownBoatRMS&RefNo=03510004JAJ&ext=json> |

## Boat definition: `data/boats/j70.json`

| Path | Value | Kind | Source | Note |
|---|---|---|---|---|
| `baseRace.backstay` | 30 | assumed | `app-convention` | the app's own reading of the North guide's base wind band onto the 0-100 control scales; the guide publishes qualitative settings ("Firm", "Snug", "5-6 holes showing"), not percentages. This is the datum every shape delta in core/shape/toOrc.ts is measured against and the trim the cockpit's leech-stall and spreader-stripe meters are calibrated on, so the solver and Race mode's default trim read the one block instead of keeping two |
| `baseRace.cunningham` | 20 | assumed | `app-convention` | see baseRace.backstay |
| `baseRace.inhauler` | 30 | assumed | `app-convention` | see baseRace.backstay |
| `baseRace.jibHalyard` | 50 | assumed | `app-convention` | see baseRace.backstay |
| `baseRace.jibLead` | 5 | assumed | `app-convention` | see baseRace.backstay |
| `baseRace.jibSheet` | 60 | assumed | `app-convention` | see baseRace.backstay |
| `baseRace.mainHalyard` | 50 | assumed | `app-convention` | see baseRace.backstay |
| `baseRace.mainsheet` | 60 | assumed | `app-convention` | see baseRace.backstay |
| `baseRace.outhaul` | 50 | assumed | `app-convention` | see baseRace.backstay |
| `baseRace.traveller` | 0 | assumed | `app-convention` | see baseRace.backstay |
| `baseRace.vang` | 30 | assumed | `app-convention` | see baseRace.backstay |
| `baseRaceDown.kiteHalyard` | 100 | assumed | `app-convention` | the four gennaker controls the race screen starts from, on the same 0-100 scale as baseRace, moved here from a literal in src/ui/race/store.svelte.ts so they carry provenance like every other datum. Halyard two-blocked at the masthead before the sheet is touched: North and Westaway both say the hoist should always be full (research 2026-08-25-spinnaker doc 04 section 2.5), so 100 is the honest default |
| `baseRaceDown.kiteSheet` | 50 | assumed | `app-convention` | kite sheet mid-range, to be trimmed to the curl. Tier C cue, not a solve: core/solve/optimalTrim does not solve the downwind sheet. See baseRaceDown.kiteHalyard |
| `baseRaceDown.mainsheet` | 15 | assumed | `app-convention` | the mainsheet under the kite, same 0-100 scale as baseRace: eased until the boom is out past the corner of the boat, leech on the leeward shroud. 15 % is about 67 degrees of boom through shape/sheeting.ts boomAngle, inside the 60-87 degree band the solver's own downwind descent reaches between 135 and 165 degrees TWA (plan 2026-08-25-desktop-kite phase 04 log, app-convention); research 2026-08-25-spinnaker doc 03 section 2.1 (T3) supplies only the qualitative cue, out past the corner of the boat. Tier C cue, not a solve: see core/solve/optimalTrim notSolved. Also the downwind shape datum: core/shape/base.ts baseRaceDown() measures the toOrc deltas from this mainsheet under the kite, so the correct ease is zero deviation instead of enough shapeInfluence to demote the downwind default to tier C (ASSUMPTIONS.md) |
| `baseRaceDown.sprit` | 100 | assumed | `app-convention` | sprit fully out. On a J/70 the pole is either all the way out or the kite is not up, so 100 is class practice rather than a chosen midpoint. See baseRaceDown.kiteHalyard |
| `baseRaceDown.tackLine` | 50 | assumed | `app-convention` | tack line mid-range, a trim control the sailor is expected to move rather than a setting: the J/70 sources disagree between two-block-it and ease 4-12 in (research 2026-08-25-spinnaker doc 03 section 4, doc 04 section 2.4), so the app starts in the middle of the band instead of picking a side. See baseRaceDown.kiteHalyard |
| `controls.backstay.max` | 100 | derived | `app-convention` | app control range; 0-100% travel |
| `controls.backstay.min` | 0 | derived | `app-convention` | app control range; 0-100% travel |
| `controls.backstay.purchaseMax` | 4 | published | `class-rules-2026` | Class Rules F.4.2: Backstay Control purchase maximum 4:1 |
| `controls.backstay.purchaseMin` | 2 | published | `class-rules-2026` | Class Rules F.4.2: Backstay Control purchase minimum 2:1 |
| `controls.backstay.step` | 5 | derived | `app-convention` | app control range; 0-100% travel in 5% steps |
| `controls.cunningham.max` | 100 | derived | `app-convention` | app control range; 0-100% travel |
| `controls.cunningham.min` | 0 | derived | `app-convention` | app control range; 0-100% travel |
| `controls.cunningham.purchaseMax` | 8 | published | `class-rules-2026` | Class Rules F.4.2: Cunningham purchase maximum 8:1 |
| `controls.cunningham.purchaseMin` | 1 | published | `class-rules-2026` | Class Rules F.4.2: Cunningham purchase minimum 1:1 |
| `controls.cunningham.step` | 5 | derived | `app-convention` | app control range; 0-100% travel in 5% steps |
| `controls.forestayMm.max` | 40 | assumed | `app-convention` | see controls.forestayMm.min |
| `controls.forestayMm.min` | 0 | assumed | `app-convention` | range not published in Class Rules; app convention for a workable forestay length adjustment sweep |
| `controls.forestayMm.step` | 2 | assumed | `app-convention` | see controls.forestayMm.min |
| `controls.inhauler.max` | 100 | assumed | `app-convention` | see controls.inhauler.min |
| `controls.inhauler.min` | 0 | assumed | `app-convention` | discrepancy: brief lists inhauler as a race-mode control, but Class Rules F.4.2 purchase table has no 'Inhauler' entry; range and purchase are unregulated app assumptions |
| `controls.inhauler.step` | 5 | derived | `app-convention` | app control range; 0-100% travel in 5% steps |
| `controls.jibHalyard.max` | 100 | derived | `app-convention` | app control range; 0-100% travel |
| `controls.jibHalyard.min` | 0 | derived | `app-convention` | app control range; 0-100% travel |
| `controls.jibHalyard.purchaseMax` | 8 | published | `class-rules-2026` | Class Rules F.4.2: Headsail Halyard Fine Tune purchase maximum 8:1 |
| `controls.jibHalyard.purchaseMin` | 4 | published | `class-rules-2026` | Class Rules F.4.2: Headsail Halyard Fine Tune purchase minimum 4:1 |
| `controls.jibHalyard.step` | 5 | derived | `app-convention` | app control range; 0-100% travel in 5% steps |
| `controls.jibLead.max` | 10 | assumed | `app-convention` | see controls.jibLead.min |
| `controls.jibLead.min` | 0 | assumed | `app-convention` | jib lead car hole count not specified in Class Rules; app convention, typical 10-hole car track |
| `controls.jibLead.step` | 1 | assumed | `app-convention` | see controls.jibLead.min |
| `controls.jibSheet.max` | 100 | derived | `app-convention` | app control range; 0-100% travel |
| `controls.jibSheet.min` | 0 | derived | `app-convention` | app control range; 0-100% travel |
| `controls.jibSheet.purchaseMax` | 2 | published | `class-rules-2026` | Class Rules F.4.2: Headsail Sheet purchase maximum 2:1 (fixed, no min/max range) |
| `controls.jibSheet.purchaseMin` | 2 | published | `class-rules-2026` | Class Rules F.4.2: Headsail Sheet purchase minimum 2:1 (fixed, no min/max range) |
| `controls.jibSheet.step` | 5 | derived | `app-convention` | app control range; 0-100% travel in 5% steps |
| `controls.kiteHalyard.max` | 100 | assumed | `app-convention` | see controls.kiteHalyard.min |
| `controls.kiteHalyard.min` | 0 | assumed | `app-convention` | discrepancy: Class Rules F.4.1 lists a Gennaker Halyard minimum line diameter (6mm) but F.4.2 purchase table has no Gennaker Halyard purchase entry; range and purchase are unregulated app assumptions |
| `controls.kiteHalyard.step` | 5 | derived | `app-convention` | app control range; 0-100% travel in 5% steps |
| `controls.kiteSheet.max` | 100 | derived | `app-convention` | app control range; 0-100% travel |
| `controls.kiteSheet.min` | 0 | derived | `app-convention` | app control range; 0-100% travel |
| `controls.kiteSheet.purchaseMax` | 1 | published | `class-rules-2026` | Class Rules F.4.2: Gennaker Sheets purchase maximum 1:1 (fixed, no min/max range) |
| `controls.kiteSheet.purchaseMin` | 1 | published | `class-rules-2026` | Class Rules F.4.2: Gennaker Sheets purchase minimum 1:1 (fixed, no min/max range) |
| `controls.kiteSheet.step` | 5 | derived | `app-convention` | app control range; 0-100% travel in 5% steps |
| `controls.lowerTurns.max` | 6 | assumed | `app-convention` | see controls.lowerTurns.min |
| `controls.lowerTurns.min` | -6 | assumed | `app-convention` | range not published in Class Rules; app convention, mirrors upperTurns |
| `controls.lowerTurns.step` | 0.5 | assumed | `app-convention` | see controls.lowerTurns.min |
| `controls.mainHalyard.max` | 100 | derived | `app-convention` | app control range; 0-100% travel |
| `controls.mainHalyard.min` | 0 | derived | `app-convention` | app control range; 0-100% travel |
| `controls.mainHalyard.purchaseMax` | 2 | published | `class-rules-2026` | Class Rules F.4.2: Main Halyard Fine Tune purchase maximum 2:1 |
| `controls.mainHalyard.purchaseMin` | 1 | published | `class-rules-2026` | Class Rules F.4.2: Main Halyard Fine Tune purchase minimum 1:1 |
| `controls.mainHalyard.step` | 5 | derived | `app-convention` | app control range; 0-100% travel in 5% steps |
| `controls.mainsheet.max` | 100 | derived | `app-convention` | app control range; 0-100% travel |
| `controls.mainsheet.min` | 0 | derived | `app-convention` | app control range; 0-100% travel |
| `controls.mainsheet.purchaseMax` | 6 | published | `class-rules-2026` | Class Rules F.4.2: Main Sheet purchase maximum 6:1 |
| `controls.mainsheet.purchaseMin` | 4 | published | `class-rules-2026` | Class Rules F.4.2: Main Sheet purchase minimum 4:1 |
| `controls.mainsheet.step` | 5 | derived | `app-convention` | app control range; 0-100% travel in 5% steps |
| `controls.outhaul.max` | 100 | derived | `app-convention` | app control range; 0-100% travel |
| `controls.outhaul.min` | 0 | derived | `app-convention` | app control range; 0-100% travel |
| `controls.outhaul.purchaseMax` | 8 | published | `class-rules-2026` | Class Rules F.4.2: Outhaul purchase maximum 8:1 |
| `controls.outhaul.purchaseMin` | 4 | published | `class-rules-2026` | Class Rules F.4.2: Outhaul purchase minimum 4:1 |
| `controls.outhaul.step` | 5 | derived | `app-convention` | app control range; 0-100% travel in 5% steps |
| `controls.sprit.max` | 100 | derived | `app-convention` | app control range; 0-100% travel |
| `controls.sprit.min` | 0 | derived | `app-convention` | app control range; 0-100% travel |
| `controls.sprit.purchaseMax` | 1 | published | `class-rules-2026` | Class Rules F.4.2: Sprit Control purchase maximum 1:1 (fixed, no min/max range) |
| `controls.sprit.purchaseMin` | 1 | published | `class-rules-2026` | Class Rules F.4.2: Sprit Control purchase minimum 1:1 (fixed, no min/max range) |
| `controls.sprit.step` | 5 | derived | `app-convention` | app control range; 0-100% travel in 5% steps |
| `controls.tackLine.max` | 100 | derived | `app-convention` | app control range; 0-100% travel |
| `controls.tackLine.min` | 0 | derived | `app-convention` | app control range; 0-100% travel |
| `controls.tackLine.purchaseMax` | 1 | published | `class-rules-2026` | Class Rules F.4.2: Tack Line purchase maximum 1:1 (fixed, no min/max range) |
| `controls.tackLine.purchaseMin` | 1 | published | `class-rules-2026` | Class Rules F.4.2: Tack Line purchase minimum 1:1 (fixed, no min/max range) |
| `controls.tackLine.step` | 5 | derived | `app-convention` | app control range; 0-100% travel in 5% steps |
| `controls.traveller.max` | 100 | derived | `app-convention` | app control range; -100 to +100% car travel |
| `controls.traveller.min` | -100 | derived | `app-convention` | app control range; -100 to +100% car travel |
| `controls.traveller.purchaseMax` | 3 | published | `class-rules-2026` | Class Rules F.4.2: Traveler purchase maximum 3:1 |
| `controls.traveller.purchaseMin` | 2 | published | `class-rules-2026` | Class Rules F.4.2: Traveler purchase minimum 2:1 |
| `controls.traveller.step` | 5 | derived | `app-convention` | app control range; -100 to +100% car travel in 5% steps |
| `controls.upperTurns.max` | 6 | assumed | `app-convention` | see controls.upperTurns.min |
| `controls.upperTurns.min` | -6 | assumed | `app-convention` | range not published in Class Rules; app convention for a workable turns sweep either side of a dock-tuning base setting |
| `controls.upperTurns.step` | 0.5 | assumed | `app-convention` | see controls.upperTurns.min |
| `controls.vang.max` | 100 | derived | `app-convention` | app control range; 0-100% travel |
| `controls.vang.min` | 0 | derived | `app-convention` | app control range; 0-100% travel |
| `controls.vang.purchaseMax` | 8 | published | `class-rules-2026` | Class Rules F.4.2: Boom Vang purchase maximum 8:1 (fixed, no min/max range) |
| `controls.vang.purchaseMin` | 8 | published | `class-rules-2026` | Class Rules F.4.2: Boom Vang purchase minimum 8:1 (fixed, no min/max range) |
| `controls.vang.step` | 5 | derived | `app-convention` | app control range; 0-100% travel in 5% steps |
| `crew.maxKg` | 340 | published | `orc-cert` | ORC cert CREW: Maximum weight 340 kg |
| `crew.maxLegsOut` | 2 | published | `class-rules-2026` | Class Rules C.3.3(c): not more than two crew may have their legs outboard of the sheerline |
| `crew.minCount` | 3 | published | `class-rules-2026` | Class Rules C.3.1(a): crew shall consist of 3 or more persons |
| `crew.minKg` | 255 | published | `orc-cert` | ORC cert CREW: Minimum weight 255 kg |
| `hull.beamM` | 2.254 | published | `orc-cert` | ORC cert HULL AND APPENDAGES: Max. Beam 2.254 |
| `hull.bwlM` | 1.916 | assumed | `orc-cert` | estimated as 0.85 x max beam (typical waterline/max-beam ratio for a flared-topside sportboat hull); no published bwl found |
| `hull.dispKg` | 811 | published | `orc-cert` | ORC cert HULL AND APPENDAGES: Displacement 811 kg (VPP sailing displacement, differs by 1 kg from the class rule minimum dry weight of 812 kg -- see hull.minDryWeightKg) |
| `hull.draftM` | 1.383 | published | `orc-cert` | ORC cert HULL AND APPENDAGES: Draft 1.383 |
| `hull.gmM` | 0.676 | assumed | `orc-cert` | estimated as 0.30 x beamM, a rule-of-thumb GM/beam ratio for high-initial-stability bulb-keel sportboats; not backed out from the ORC cert's RM Measured (18.5 kg.m) because the certificate's reference heel angle for that figure could not be confirmed |
| `hull.hbiM` | 0.715 | derived | `orc-cert` | ORC HBI, the height of the sheer at the base of I above the water plane, interpolated from the certificate's own flotation measurements: FF 0.792 at SFFP 0.155 and FA 0.571 at SAFP 6.903, read at the mast station SFBI = SFJ + J = 0.160 + 2.340 = 2.500 m, which gives 0.715 m. HBI is the datum ORC measures every sail-plan height from (VPP 2023 eq 5.57, heeling arm = HBI + ZCE x REEF); it is a freeboard, not a rig dimension |
| `hull.keelAreaM2` | 0.529 | assumed | `orc-cert` | estimated as keelSpanM x assumed average chord 0.45 m (typical thin high-aspect fin/bulb chord for a sportboat); no published keel area or chord found |
| `hull.keelSpanM` | 1.176 | assumed | `orc-cert` | estimated as draftM x 0.85, allowing ~15% of draft for hull depth above the keel root; no published keel span found |
| `hull.kgM` | 0.484 | assumed | `orc-cert` | estimated as 0.35 x draftM, a rule-of-thumb VCG fraction for a ballast-(bulb)-dominated fin-keel sportboat; ORC cert's VCGD/VCGM (0.034/0.024) and RM figures use a different reference baseline and were not used, since the conversion could not be verified against the ORC VPP Documentation in this pass |
| `hull.loaM` | 6.91 | published | `orc-cert` | ORC cert HULL AND APPENDAGES: LOA 6.910 |
| `hull.lwlM` | 6.691 | assumed | `orc-cert` | ORC cert reports IMS measurement length 'L' = 6.691 m; not an explicit LWL definition but the closest published proxy for a plumb-bow hull, so used directly rather than a fresh estimate |
| `hull.minDryWeightKg` | 812 | published | `class-rules-2026` | Class Rules C.6.1: minimum dry boat weight 812 kg |
| `hull.rmMeasuredKgMPerDeg` | 18.5 | published | `orc-cert` | ORC RM Measured, kg·m per degree of heel at small angles (inclining test); prefer over assumed gmM in righting model |
| `hull.wettedM2` | 9.13 | published | `orc-cert` | ORC cert HULL AND APPENDAGES: Wetted area 9.13 |
| `rig.basM` | 0.992 | published | `orc-cert` | ORC cert RIG: BAS 0.992, the boom above the sheer. With hull.hbiM it puts the boom 1.707 m above the water plane, which is the mainsail tack height core/geometry/sailplan.ts measures the mainsail centre of effort from |
| `rig.boomOuterMm` | 2876 | published | `class-rules-2026` | Class Rules C.9.3(a): boom outer point distance maximum 2876mm |
| `rig.bowspritOuterMm` | 1495 | published | `class-rules-2026` | Class Rules C.9.4(a): hull to bowsprit outer point maximum 1495mm |
| `rig.chainplateYM` | 1 | assumed | `class-rules-2026` | assumed 1.00 m athwartship offset, approximating a rail-mounted chainplate typical of shroud-base sportboats; not published |
| `rig.eM` | 2.876 | published | `orc-cert` | ORC cert RIG: E 2.876; equal to mainsail foot maximum in Class Rules G.3 and to boom outer point in C.9.3 |
| `rig.iM` | 8 | published | `orc-cert` | ORC cert RIG: IG 8.000; equal to headsail luff maximum in Class Rules G.4.3 |
| `rig.jM` | 2.34 | published | `orc-cert` | ORC cert RIG: J 2.340 (foretriangle base) |
| `rig.mastLenM` | 8.5 | assumed | `class-rules-2026` | estimated as rig.iM + 0.5 m for typical gooseneck-to-deck and masthead-fitting allowance; not published |
| `rig.pM` | 7.974 | published | `orc-cert` | ORC cert RIG: P 7.974; equal to mainsail luff maximum in Class Rules G.3 |
| `rig.spreaderLenM` | 0.55 | assumed | `class-rules-2026` | assumed 0.55 m, typical swept-spreader length for this boat size; not published |
| `rig.spreaderZM` | 4.4 | assumed | `class-rules-2026` | estimated as 0.55 x rig.iM, a typical single-spreader height fraction; not published |
| `rig.sweepDeg` | 20 | assumed | `class-rules-2026` | assumed 20 degrees, typical swept-spreader angle for a rig with no runners/checkstays (ORC cert confirms Runners/Checkstays: 0); not published |
| `sails.asym.footMm` | 5700 | published | `class-rules-2026` | Class Rules G.5.3: gennaker foot length maximum 5700mm |
| `sails.asym.halfMm` | 5560 | published | `class-rules-2026` | Class Rules G.5.3: gennaker half width maximum 5560mm |
| `sails.asym.leechMm` | 8800 | published | `class-rules-2026` | Class Rules G.5.3: gennaker leech length maximum 8800mm |
| `sails.asym.luffMm` | 10800 | published | `class-rules-2026` | Class Rules G.5.3: gennaker luff length maximum 10800mm |
| `sails.asym.orcTable` | 5.7 | published | `orc-vpp-2023` | Table 5.7, asymmetric spinnaker tacked on centreline (kpasc 0.02648) - the J/70's gennaker is tacked to a bowsprit on the centreline. Was labelled 5.6, which is the SYMMETRIC spinnaker table; a metadata error only, since src/core/aero/orc/tables.ts hardcodes ASYM_TABLE from 5.7 and nothing dispatches on this string. 2023-edition numbering: the same table is 5.9 in the 2026 edition, whose coefficients also differ (see PROVENANCE.md) |
| `sails.asym.ratedAreaM2` | 45.64 | published | `orc-cert` | ORC cert SAIL AREAS: Asymmetric Rated 45.64 m2 |
| `sails.jib.halfMm` | 1250 | published | `class-rules-2026` | Class Rules G.4.3: headsail half width maximum 1250mm |
| `sails.jib.lpMm` | 2450 | published | `class-rules-2026` | Class Rules G.4.3: headsail luff perpendicular maximum 2450mm |
| `sails.jib.luffMm` | 8000 | published | `class-rules-2026` | Class Rules G.4.3: headsail luff length maximum 8000mm |
| `sails.jib.quarterMm` | 1860 | published | `class-rules-2026` | Class Rules G.4.3: headsail quarter width maximum 1860mm |
| `sails.jib.ratedAreaM2` | 10.01 | published | `orc-cert` | ORC cert SAIL AREAS: Headsail Luffed Rated 10.01 m2 |
| `sails.jib.threeQuarterMm` | 650 | published | `class-rules-2026` | Class Rules G.4.3: headsail three-quarter width maximum 650mm |
| `sails.jib.topMm` | 64 | published | `class-rules-2026` | Class Rules G.4.3: headsail top width maximum 64mm |
| `sails.main.battens` | 5 | published | `class-rules-2026` | Class Rules G.3.2(c): mainsail shall have five batten pockets in the leech, top three full length |
| `sails.main.footMm` | 2876 | published | `class-rules-2026` | Class Rules G.3: mainsail foot length maximum 2876mm |
| `sails.main.halfMm` | 2134 | published | `class-rules-2026` | Class Rules G.3: mainsail half width maximum 2134mm |
| `sails.main.leechMm` | 8335 | published | `class-rules-2026` | Class Rules G.3: mainsail leech length maximum 8335mm |
| `sails.main.luffMm` | 7974 | published | `class-rules-2026` | Class Rules G.3: mainsail luff length maximum 7974mm |
| `sails.main.quarterMm` | 2570 | published | `class-rules-2026` | Class Rules G.3: mainsail quarter width maximum 2570mm |
| `sails.main.ratedAreaM2` | 16 | published | `orc-cert` | ORC cert SAIL AREAS: Mainsail Rated 16.00 m2 |
| `sails.main.threeQuarterMm` | 1425 | published | `class-rules-2026` | Class Rules G.3: mainsail three-quarter width maximum 1425mm |
| `sails.main.topMm` | 364 | published | `class-rules-2026` | Class Rules G.3: mainsail top width maximum 364mm |
| `sails.main.upperMm` | 880 | published | `class-rules-2026` | Class Rules G.3: mainsail upper width maximum 880mm |

## Boat definition: `data/boats/m24.json`

| Path | Value | Kind | Source | Note |
|---|---|---|---|---|
| `baseRace.backstay` | 30 | assumed | `app-convention` | no Melges 24 tuning guide is committed under data/tuning/, so unlike the J/70's this base trim is not a reading of a published guide: it is the mid-band starting point the app opens on, and the datum every shape delta in core/shape/toOrc.ts is measured against. The disagreement panel shows the honest no-guide-for-this-boat state rather than quoting the J/70's tables at a different rig |
| `baseRace.cunningham` | 20 | assumed | `app-convention` | see baseRace.backstay |
| `baseRace.inhauler` | 30 | assumed | `app-convention` | see baseRace.backstay |
| `baseRace.jibHalyard` | 50 | assumed | `app-convention` | see baseRace.backstay |
| `baseRace.jibLead` | 5 | assumed | `app-convention` | see baseRace.backstay |
| `baseRace.jibSheet` | 60 | assumed | `app-convention` | see baseRace.backstay |
| `baseRace.mainHalyard` | 50 | assumed | `app-convention` | see baseRace.backstay |
| `baseRace.mainsheet` | 60 | assumed | `app-convention` | see baseRace.backstay |
| `baseRace.outhaul` | 50 | assumed | `app-convention` | see baseRace.backstay |
| `baseRace.traveller` | 0 | assumed | `app-convention` | see baseRace.backstay |
| `baseRace.vang` | 30 | assumed | `app-convention` | see baseRace.backstay |
| `baseRaceDown.kiteHalyard` | 100 | assumed | `app-convention` | halyard two-blocked at the masthead before the sheet is touched. App convention, same as the J/70's |
| `baseRaceDown.kiteSheet` | 50 | assumed | `app-convention` | kite sheet mid-range, to be trimmed to the curl. core/solve/optimalTrim does not solve the downwind sheet. App convention, same as the J/70's |
| `baseRaceDown.mainsheet` | 15 | assumed | `app-convention` | the mainsheet under the kite, on the same 0-100 scale as baseRace: eased until the boom is out past the corner of the boat. Same app convention and the same value as the J/70's, which shape/sheeting.ts turns into about 67 degrees of boom; the sheeting model is class-independent, so the number carries across where a guide reading would not. Tier C cue, not a solve |
| `baseRaceDown.sprit` | 100 | published | `class-rules-m24-2026` | sprit fully out. Class Rules C.11.1 requires the bowsprit to be fully retracted at all times except during a continuous hoist, while flying or while dropping the spinnaker, so on this class the pole is all the way out or the kite is not up — 100 is the rule, not a chosen midpoint |
| `baseRaceDown.tackLine` | 50 | assumed | `app-convention` | tack line mid-range: a trim control the sailor is expected to move, not a setting. App convention, same as the J/70's |
| `controls.backstay.max` | 100 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.backstay.min` | 0 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.backstay.purchaseMax` | 8 | published | `class-rules-m24-2026` | Class Rules Appendix H .54 Backstay 8:1, shall not be modified |
| `controls.backstay.purchaseMin` | 8 | published | `class-rules-m24-2026` | Class Rules Appendix H .54 Backstay 8:1, shall not be modified |
| `controls.backstay.step` | 5 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.cunningham.max` | 100 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.cunningham.min` | 0 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.cunningham.purchaseMax` | 6 | published | `class-rules-m24-2026` | Class Rules Appendix H .49 Mainsail Cunningham 3:1 - 6:1 |
| `controls.cunningham.purchaseMin` | 3 | published | `class-rules-m24-2026` | Class Rules Appendix H .49 Mainsail Cunningham 3:1 - 6:1 |
| `controls.cunningham.step` | 5 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.forestayMm.max` | 40 | assumed | `app-convention` | range not published in the class rules; app convention for a workable forestay length adjustment sweep. F.3.3 offers both an adjustable and a fixed forestay system, and the choice may not change during an event |
| `controls.forestayMm.min` | 0 | assumed | `app-convention` | range not published in the class rules; app convention for a workable forestay length adjustment sweep. F.3.3 offers both an adjustable and a fixed forestay system, and the choice may not change during an event |
| `controls.forestayMm.step` | 2 | assumed | `app-convention` | range not published in the class rules; app convention for a workable forestay length adjustment sweep. F.3.3 offers both an adjustable and a fixed forestay system, and the choice may not change during an event |
| `controls.inhauler.max` | 100 | assumed | `app-convention` | discrepancy: the app's control set carries an inhauler, but the Melges 24 class rules have no inhauler — Appendix H's purchase table lists none, and the only windward-sheeting system it permits is on the mainsail traveller (.30). Range and purchase are unregulated app assumptions, as they are on the J/70 |
| `controls.inhauler.min` | 0 | assumed | `app-convention` | discrepancy: the app's control set carries an inhauler, but the Melges 24 class rules have no inhauler — Appendix H's purchase table lists none, and the only windward-sheeting system it permits is on the mainsail traveller (.30). Range and purchase are unregulated app assumptions, as they are on the J/70 |
| `controls.inhauler.step` | 5 | assumed | `app-convention` | discrepancy: the app's control set carries an inhauler, but the Melges 24 class rules have no inhauler — Appendix H's purchase table lists none, and the only windward-sheeting system it permits is on the mainsail traveller (.30). Range and purchase are unregulated app assumptions, as they are on the J/70 |
| `controls.jibHalyard.max` | 100 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.jibHalyard.min` | 0 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.jibHalyard.step` | 5 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.jibLead.max` | 10 | assumed | `app-convention` | the class rules leave the jib sheet car's pin position optional (Appendix H .14) and publish no hole count; app convention, a typical 10-hole car track, the same as the J/70's |
| `controls.jibLead.min` | 0 | assumed | `app-convention` | the class rules leave the jib sheet car's pin position optional (Appendix H .14) and publish no hole count; app convention, a typical 10-hole car track, the same as the J/70's |
| `controls.jibLead.step` | 1 | assumed | `app-convention` | the class rules leave the jib sheet car's pin position optional (Appendix H .14) and publish no hole count; app convention, a typical 10-hole car track, the same as the J/70's |
| `controls.jibSheet.max` | 100 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.jibSheet.min` | 0 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.jibSheet.purchaseMax` | 2 | published | `class-rules-m24-2026` | Class Rules Appendix H .47 Jib sheets 2:1, shall not be modified |
| `controls.jibSheet.purchaseMin` | 2 | published | `class-rules-m24-2026` | Class Rules Appendix H .47 Jib sheets 2:1, shall not be modified |
| `controls.jibSheet.step` | 5 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.kiteHalyard.max` | 100 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.kiteHalyard.min` | 0 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.kiteHalyard.step` | 5 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.kiteSheet.max` | 100 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.kiteSheet.min` | 0 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.kiteSheet.purchaseMax` | 1 | published | `class-rules-m24-2026` | Class Rules Appendix H .48 Spinnaker sheets 1:1, shall not be modified |
| `controls.kiteSheet.purchaseMin` | 1 | published | `class-rules-m24-2026` | Class Rules Appendix H .48 Spinnaker sheets 1:1, shall not be modified |
| `controls.kiteSheet.step` | 5 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.lowerTurns.max` | 6 | assumed | `app-convention` | turns on the shroud rigging screws either side of a boat's own base tune, not an absolute setting: F.6.1 lets the rigging screws be adjusted while racing but publishes no travel. App convention, the same sweep as the J/70's |
| `controls.lowerTurns.min` | -6 | assumed | `app-convention` | turns on the shroud rigging screws either side of a boat's own base tune, not an absolute setting: F.6.1 lets the rigging screws be adjusted while racing but publishes no travel. App convention, the same sweep as the J/70's |
| `controls.lowerTurns.step` | 0.5 | assumed | `app-convention` | turns on the shroud rigging screws either side of a boat's own base tune, not an absolute setting: F.6.1 lets the rigging screws be adjusted while racing but publishes no travel. App convention, the same sweep as the J/70's |
| `controls.mainHalyard.max` | 100 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.mainHalyard.min` | 0 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.mainHalyard.step` | 5 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.mainsheet.max` | 100 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.mainsheet.min` | 0 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.mainsheet.purchaseMax` | 5 | published | `class-rules-m24-2026` | Class Rules Appendix H .46 Mainsail sheet 5:1, shall not be modified |
| `controls.mainsheet.purchaseMin` | 5 | published | `class-rules-m24-2026` | Class Rules Appendix H .46 Mainsail sheet 5:1, shall not be modified |
| `controls.mainsheet.step` | 5 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.outhaul.max` | 100 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.outhaul.min` | 0 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.outhaul.purchaseMax` | 6 | published | `class-rules-m24-2026` | Class Rules Appendix H .51 Mainsail outhaul 6:1 |
| `controls.outhaul.purchaseMin` | 6 | published | `class-rules-m24-2026` | Class Rules Appendix H .51 Mainsail outhaul 6:1 |
| `controls.outhaul.step` | 5 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.sprit.max` | 100 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.sprit.min` | 0 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.sprit.purchaseMax` | 2 | published | `class-rules-m24-2026` | Class Rules Appendix H .53 Bowsprit Launch system 2:1, shall not be modified |
| `controls.sprit.purchaseMin` | 2 | published | `class-rules-m24-2026` | Class Rules Appendix H .53 Bowsprit Launch system 2:1, shall not be modified |
| `controls.sprit.step` | 5 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.tackLine.max` | 100 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.tackLine.min` | 0 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.tackLine.step` | 5 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.traveller.max` | 100 | derived | `app-convention` | app control range; -100 to +100 % of track travel, positive up to windward |
| `controls.traveller.min` | -100 | derived | `app-convention` | app control range; -100 to +100 % of track travel, positive up to windward |
| `controls.traveller.purchaseMax` | 3 | published | `class-rules-m24-2026` | Class Rules Appendix H .52 Traveller Control 3:1, shall not be modified |
| `controls.traveller.purchaseMin` | 3 | published | `class-rules-m24-2026` | Class Rules Appendix H .52 Traveller Control 3:1, shall not be modified |
| `controls.traveller.step` | 5 | derived | `app-convention` | app control range; -100 to +100 % of track travel, positive up to windward |
| `controls.upperTurns.max` | 6 | assumed | `app-convention` | turns on the shroud rigging screws either side of a boat's own base tune, not an absolute setting: F.6.1 lets the rigging screws be adjusted while racing but publishes no travel. App convention, the same sweep as the J/70's |
| `controls.upperTurns.min` | -6 | assumed | `app-convention` | turns on the shroud rigging screws either side of a boat's own base tune, not an absolute setting: F.6.1 lets the rigging screws be adjusted while racing but publishes no travel. App convention, the same sweep as the J/70's |
| `controls.upperTurns.step` | 0.5 | assumed | `app-convention` | turns on the shroud rigging screws either side of a boat's own base tune, not an absolute setting: F.6.1 lets the rigging screws be adjusted while racing but publishes no travel. App convention, the same sweep as the J/70's |
| `controls.vang.max` | 100 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.vang.min` | 0 | derived | `app-convention` | app control range; 0-100 % travel |
| `controls.vang.purchaseMax` | 12 | published | `class-rules-m24-2026` | Class Rules Appendix H .50 Boom Vang 12:1, shall not be modified |
| `controls.vang.purchaseMin` | 12 | published | `class-rules-m24-2026` | Class Rules Appendix H .50 Boom Vang 12:1, shall not be modified |
| `controls.vang.step` | 5 | derived | `app-convention` | app control range; 0-100 % travel |
| `crew.maxKg` | 350 | published | `orc-cert-m24` | ORC certificate CrewWT 350 kg. Not a class limit (there is none) but the crew weight this certificate's VPP ran, which is exactly what the validation harness needs: validation/compare.ts replays the polar at crew.maxKg |
| `crew.maxLegsOut` | 2 | published | `class-rules-m24-2026` | Class Rules C.11.3: the crew hike sitting outboard between the foremost stanchion and the spinnaker turning block, and the helmsperson shall not hike at all. At the class minimum crew of three that leaves two hiking, which is what hydro/righting.ts reads (it takes maxLegsOut over crew.minCount). Unlike the J/70's C.3.3(c) this is not a flat cap of two: on a six-up boat five may hike, and a class where that distinction bites would need righting.ts to take the crew count it is actually solving |
| `crew.minCount` | 3 | published | `class-rules-m24-2026` | Class Rules C.2.1(a): the crew shall consist of a minimum of 3 to a maximum of 6 persons |
| `crew.minKg` | 262 | assumed | `app-convention` | the Melges 24 class rules publish no crew weight limit at all — C.2.1(a) limits the crew to 3-6 persons and says nothing about weight — so the slider's lower stop has no source. Taken as 0.75 x crew.maxKg, the same span the J/70's published 255-340 kg limits describe. Only the range of the crew-weight slider depends on it; the polar is replayed at maxKg |
| `hull.beamM` | 2.49 | published | `orc-cert-m24` | ORC certificate MB (maximum beam) 2.490 m |
| `hull.bwlM` | 2.117 | assumed | `orc-cert-m24` | estimated as 0.85 x max beam, the J/70 file's documented method for the same unpublished field; no published waterline beam found |
| `hull.dispKg` | 945 | published | `orc-cert-m24` | ORC certificate Dspl_Measurement 945 kg. The same certificate also prints Dspl_Sailing 1400 kg, which carries crew, sails and gear; the measurement displacement is the one the J/70 file uses for this field (811 kg there, against its 812 kg class dry weight) |
| `hull.draftM` | 1.539 | published | `orc-cert-m24` | ORC certificate Draft 1.539 m |
| `hull.gmM` | 0.747 | assumed | `orc-cert-m24` | estimated as 0.30 x beam, the J/70 file's documented method. Unlike the J/70 this class has no RM Measured to prefer over it: the ORC public feed publishes a Stability_Index but no righting moment per degree, so hull.rmMeasuredKgMPerDeg is absent and hydro/righting.ts falls back to this GM |
| `hull.keelAreaM2` | 0.589 | assumed | `orc-cert-m24` | estimated as keelSpanM x an assumed 0.45 m average chord, the J/70 file's documented method; no published keel area or chord found. The class rules limit the combined fin and bulb weight (E.3.6, 300-313 kg) but publish no planform |
| `hull.keelSpanM` | 1.308 | assumed | `orc-cert-m24` | estimated as 0.85 x draft, allowing ~15 % of draft for hull depth above the keel root; the J/70 file's documented method for the same unpublished field |
| `hull.kgM` | 0.539 | assumed | `orc-cert-m24` | estimated as 0.35 x draft, a rule-of-thumb VCG fraction for a bulb-ballasted fin-keel sportboat; the J/70 file's documented method. The ORC public certificate carries no hydrostatics at all (ADR 0020) |
| `hull.loaM` | 7.509 | published | `orc-cert-m24` | ORC certificate LOA 7.509 m |
| `hull.lwlM` | 7.289 | assumed | `orc-cert-m24` | ORC certificate IMSL (VPP sailing length) 7.289 m, used as LWL. ADR 0020 warns that IMSL is not LWL and that citing it as published would be an invented number wearing a citation, so it is recorded as assumed: on this plumb-bow hull it is the closest published proxy, the same reading the J/70 file makes of its own IMS 'L'. Cross-check: the J/70's LWL/LOA ratio (6.691/6.910) applied to this LOA gives 7.271 m, 0.25 % away |
| `hull.minDryWeightKg` | 809 | published | `class-rules-m24-2026` | Class Rules C.6.1: weight of the boat in dry condition, minimum 809 kg |
| `hull.wettedM2` | 12.28 | published | `orc-cert-m24` | ORC certificate WSS 12.28 m2 |
| `rig.boomOuterMm` | 3800 | published | `class-rules-m24-2026` | Class Rules C.9.4(a): boom outer point distance, maximum 3800 mm |
| `rig.bowspritOuterMm` | 1400 | published | `class-rules-m24-2026` | Class Rules C.9.5(b): centre of the tack-line 'u' bolt to the foreside of the stem, maximum 1400 mm (the 2019 Measurement Form item 10 prints the same figure in its maximum column, which resolves the rules PDF's ragged min/max columns) |
| `rig.chainplateYM` | 0.869 | derived | `class-rules-m24-2026` | half the midpoint of Class Rules Appendix H .4, transverse distance between the shroud plates 1725-1750 mm. Published, unlike the J/70's, which the J/70 file has to assume |
| `rig.eM` | 3.8 | published | `class-rules-m24-2026` | Class Rules C.9.4(a): boom outer point distance, maximum 3800 mm |
| `rig.iM` | 8.315 | derived | `class-rules-m24-2026` | midpoint of Class Rules F.3.4 .8, forestay height 8300-8330 mm above the mast datum point. A manufacturing tolerance band, so the midpoint rather than the limit |
| `rig.jM` | 2.41 | derived | `class-rules-m24-2026` | midpoint of Class Rules Appendix H .5, horizontal distance from the aft face of the furler drum recess to the forward edge of the mast step, 2405-2415 mm. The forestay tacks at the furler drum, so this is the foretriangle base to within the drum/mast-face datum |
| `rig.mastLenM` | 9.528 | derived | `class-rules-m24-2026` | Class Rules F.3.4 .7, upper point height 9528 mm above the mast datum point. The spar continues above the band by an amount the rules do not publish, so this is the top of the mainsail hoist rather than the masthead. It is the right length for the model's mast frame, which measures every other rig height from the same datum: it puts the gooseneck at (mastLenM - pM) = 0.710 m, exactly the class lower point height, and the hounds at iM, exactly the class forestay height |
| `rig.pM` | 8.818 | derived | `class-rules-m24-2026` | Class Rules F.3.4 .7 upper point height (max 9528 mm) minus .6 lower point height (min 710 mm), both above the mast datum point: the largest legal mainsail hoist |
| `rig.spreaderLenM` | 0.82 | derived | `class-rules-m24-2026` | midpoint of Class Rules F.3.4 .15, spreader length 810-830 mm |
| `rig.spreaderZM` | 4.295 | derived | `class-rules-m24-2026` | midpoint of Class Rules F.3.4 .16, spreader height 4285-4305 mm. Published, unlike the J/70's, which the J/70 file has to assume |
| `rig.sweepDeg` | 17.4 | derived | `class-rules-m24-2026` | asin(0.245 / 0.820) from Class Rules F.3.4 .17 (230-260 mm from the aft side of the mast to a taut line across the shroud tips) over .15 (spreader length 810-830 mm), both band midpoints. The offset's datum is the mast's aft face rather than the spreader root, so this reads low: carrying the mast's half fore-and-aft section at spreader height (~50 mm, interpolating F.3.4 .1 and .3) would give 21 degrees instead |
| `sails.asym.footMm` | 6300 | published | `class-rules-m24-2026` | Class Rules G.5.3 .3: spinnaker foot length, maximum 6300 mm (minimum 6000 mm) |
| `sails.asym.halfMm` | 5860 | published | `class-rules-m24-2026` | Class Rules G.5.3 .5: spinnaker half width, maximum 5860 mm |
| `sails.asym.leechMm` | 11078 | published | `class-rules-m24-2026` | Class Rules G.5.3 .2: spinnaker leech length, maximum 11078 mm (minimum 10000 mm) |
| `sails.asym.luffMm` | 11585 | published | `class-rules-m24-2026` | Class Rules G.5.3 .1: spinnaker luff length, maximum 11585 mm (minimum 11285 mm) |
| `sails.asym.ratedAreaM2` | 52.95 | published | `orc-cert-m24` | ORC certificate Area_Asym 52.95 m2, for the certificate this file's polar comes from. The class maxima below describe a slightly larger sail: the ORC spinnaker-area formula over them gives 56.2 m2, so this certificate's kite is about 6 % under the limit. Both numbers are kept as they are rather than one being bent to the other — the geometry is what the class allows, the area is what the boat behind the polar actually measured |
| `sails.jib.halfMm` | 1347 | assumed | `class-rules-m24-2026` | straight-leech triangle, 0.50 x LP. See sails.jib.quarterMm |
| `sails.jib.lpMm` | 2694 | derived | `orc-cert-m24` | the class rules publish the jib's foot length (G.4.3 .3, 2926-3026 mm) but never its luff perpendicular. LP = 2 x rated headsail area / luff = 2 x 11.53 / 8.560, a triangular approximation. On the J/70, where both are published, the same formula gives 2502 mm against a published LP of 2450 mm, so it reads about 2 % high. The foot length is not usable as LP here: it would over-read the sail by 12 %, because the clew is well aft of the perpendicular from the luff |
| `sails.jib.luffMm` | 8560 | published | `class-rules-m24-2026` | Class Rules G.4.3 .1: jib luff length, maximum 8560 mm (minimum 8460 mm) |
| `sails.jib.quarterMm` | 2020 | assumed | `class-rules-m24-2026` | not published: G.4.3 limits the jib's luff, leech, foot and top width but no girths, because G.4.2(d) requires the leech to be negative (hollow) and an unroached sail needs no girth cap. Taken as the straight-leech triangle, 0.75 x LP. On the J/70 the same method gives 1838 mm against a published 1860, about 1 % low; on this sail, whose leech is hollow rather than straight, it is an over-estimate instead |
| `sails.jib.ratedAreaM2` | 11.53 | published | `orc-cert-m24` | ORC certificate Area_Jib 11.53 m2, for the certificate this file's polar comes from |
| `sails.jib.threeQuarterMm` | 674 | assumed | `class-rules-m24-2026` | straight-leech triangle, 0.25 x LP. See sails.jib.quarterMm |
| `sails.jib.topMm` | 50 | published | `class-rules-m24-2026` | Class Rules G.4.3 .4: jib top width, maximum 50 mm |
| `sails.main.battens` | 4 | published | `class-rules-m24-2026` | Class Rules G.3.3(c): four battens dividing the leech into five equal parts +/- 100 mm |
| `sails.main.footMm` | 3800 | derived | `class-rules-m24-2026` | the boom outer point distance, C.9.4(a) maximum 3800 mm — the same number as rig.eM. G.3.4 limits the mainsail's foot median (9200 mm, head to foot midpoint) rather than its foot length, so the spar limit is what bounds the foot |
| `sails.main.halfMm` | 2700 | published | `class-rules-m24-2026` | Class Rules G.3.4 .3: mainsail half width, maximum 2700 mm |
| `sails.main.leechMm` | 9590 | published | `class-rules-m24-2026` | Class Rules G.3.4 .1: mainsail leech length, maximum 9590 mm |
| `sails.main.luffMm` | 8818 | derived | `class-rules-m24-2026` | the largest legal hoist, F.3.4 .7 minus .6 — the same number as rig.pM. The class rules limit the mainsail's leech, girths and foot median but not its luff, because the mast bands already do |
| `sails.main.quarterMm` | 3250 | assumed | `class-rules-m24-2026` | not published: G.3.4 limits the half, three-quarter and top widths but not the quarter width. Linear interpolation between the published foot (3800 mm) and half (2700 mm) widths. On the J/70, whose quarter width is published, the same method gives 2505 against a published 2570 mm, so it reads about 2.6 % low |
| `sails.main.ratedAreaM2` | 22.04 | published | `orc-cert-m24` | ORC certificate Area_Main 22.04 m2, for the certificate this file's polar comes from |
| `sails.main.threeQuarterMm` | 1680 | published | `class-rules-m24-2026` | Class Rules G.3.4 .4: mainsail three-quarter width, maximum 1680 mm |
| `sails.main.topMm` | 175 | published | `class-rules-m24-2026` | Class Rules G.3.4 .5: mainsail top width, maximum 175 mm |
| `sails.main.upperMm` | 928 | assumed | `class-rules-m24-2026` | not published: G.3.4 limits no 7/8 width. Linear interpolation between the published three-quarter (1680 mm) and top (175 mm) widths. On the J/70, whose upper width is published, the same method gives 894 against a published 880 mm, so it reads about 1.6 % high |

## Reference tables

- `data/tuning/north-j70.json`: 7 wind bands, retrieved 2026-08-25, © North Sails. Settings only; no prose reproduced.
- `data/tuning/quantum-j70.json`: 11 wind bands, retrieved 2026-08-25, © Quantum Sails, 2020. Settings only; no prose reproduced.
- `data/polar/orc-j70.json`: 182 rows at TWS 6/8/10/12/14/16/20 kt, VPP 2011 1.02, issued 2012-04-30.
- `data/polar/orc-m24.json`: 90 rows at TWS 4/6/8/10/12/14/16/20/24 kt, ORC VPP, certificate issued 2026-03-30, issued 2026-03-30.
