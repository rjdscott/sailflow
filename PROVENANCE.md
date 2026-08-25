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
is **2023 numbering**; the main (`5.1`) and jib (`5.4`) labels also renumber in
2026, by how much is not recorded here because it was not read off the 2026
document.

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

<!-- generated: do not edit below this line -->

## Sources

| Id | Title | Retrieved | Edition | URL |
|---|---|---|---|---|
| `class-rules-2026` | International J/70 Class Rules, effective 1 February 2026 | 2026-08-25 | Published 02 February 2026; Effective 01 February 2026; previous issue 16 January 2024. Linked from https://j70ica.org/class-office-rules/ (no separate 2025 edition was found there; this is the current edition) | <https://j70ica.org/wp-content/uploads/2026/02/J70-Class-Rules-2026-1.pdf> |
| `orc-cert` | ORC public one-design certificate, J/70 | 2026-08-25 | 2021 offset file (J70.od), VPP ver 2021 1.00; page marked 'TEST CERTIFICATE - NOT VALID FOR RACING' (data.orc.org public template certificate, not an owner-specific issued certificate) | <https://data.orc.org/public/od/2021/j70.od.html?nav=1> |
| `app-convention` | Sailflow app UI convention (not a published source) | 2026-08-25 | internal | <> |
| `orc-vpp-2023` | ORC VPP Documentation | 2026-08-25 | 2023 edition. The coefficient tables in src/core/aero/orc/tables.ts are transcribed from this edition. ORC renumbered the sail tables in the 2026 edition (symmetric 5.6 -> 5.8, asymmetric on centreline 5.7 -> 5.9, asymmetric on pole 5.8 -> 5.10) and changed the asymmetric-on-centreline coefficients; every orcTable label in this file is 2023 numbering | <https://orc.org/uploads/files/ORC-VPP-Documentation-2023.pdf> |
| `north-j70` | J/70 Tuning Guide | 2026-08-25 | Rev. 1015 | <https://j70tr.org/wp-content/uploads/2025/12/north-j70-tuningguide-EUR.pdf> |
| `quantum-j70` | J/70 Tuning and How-To Guide | 2026-08-25 |  | <https://www.quantumsails.com/en/sails/one-design/documents/j70/j70_tuningguide.aspx> |
| `orc-speed-guide-j70` | ORC Speed Guide - J/70 Class | 2026-08-25 | VPP 2011 1.02 | <https://www.carpediemsailingteam.com/app/download/16137868/Speed_Guide_J70_Class.pdf> |

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
| `baseRaceDown.mainsheet` | 15 | assumed | `app-convention` | the mainsheet under the kite, same 0-100 scale as baseRace: eased until the boom is out past the corner of the boat, leech on the leeward shroud. 15 % is about 67 degrees of boom through shape/sheeting.ts boomAngle, mid the 60-80 degree band of research 2026-08-25-spinnaker doc 03 sections 2.1 (T3) and 2.2 (T2). Tier C cue, not a solve: see core/solve/optimalTrim notSolved |
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
| `hull.keelAreaM2` | 0.529 | assumed | `orc-cert` | estimated as keelSpanM x assumed average chord 0.45 m (typical thin high-aspect fin/bulb chord for a sportboat); no published keel area or chord found |
| `hull.keelSpanM` | 1.176 | assumed | `orc-cert` | estimated as draftM x 0.85, allowing ~15% of draft for hull depth above the keel root; no published keel span found |
| `hull.kgM` | 0.484 | assumed | `orc-cert` | estimated as 0.35 x draftM, a rule-of-thumb VCG fraction for a ballast-(bulb)-dominated fin-keel sportboat; ORC cert's VCGD/VCGM (0.034/0.024) and RM figures use a different reference baseline and were not used, since the conversion could not be verified against the ORC VPP Documentation in this pass |
| `hull.loaM` | 6.91 | published | `orc-cert` | ORC cert HULL AND APPENDAGES: LOA 6.910 |
| `hull.lwlM` | 6.691 | assumed | `orc-cert` | ORC cert reports IMS measurement length 'L' = 6.691 m; not an explicit LWL definition but the closest published proxy for a plumb-bow hull, so used directly rather than a fresh estimate |
| `hull.minDryWeightKg` | 812 | published | `class-rules-2026` | Class Rules C.6.1: minimum dry boat weight 812 kg |
| `hull.rmMeasuredKgMPerDeg` | 18.5 | published | `orc-cert` | ORC RM Measured, kg·m per degree of heel at small angles (inclining test); prefer over assumed gmM in righting model |
| `hull.wettedM2` | 9.13 | published | `orc-cert` | ORC cert HULL AND APPENDAGES: Wetted area 9.13 |
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

## Reference tables

- `data/tuning/north-j70.json`: 7 wind bands, © North Sails. Settings only; no prose reproduced.
- `data/tuning/quantum-j70.json`: 11 wind bands, © Quantum Sails, 2020. Settings only.
- `data/polar/orc-j70.json`: 182 rows at TWS 6/8/10/12/14/16/20 kt, VPP 2011 1.02, issued 2012-04-30.
