# Instrument and simulator UX: what makes a great cockpit interface

- **Date:** 2026-08-25
- **Method:** Web research across 47 sources — marine instrument manuals (B&G H5000 primary), sailing sim product docs and reviews, aviation/motorsport/automotive human-factors literature, HCI research (Wickens PCP, Fitts/steering law, Few, Tufte, NN/g), and web platform performance guidance. Evidence strength flagged throughout; thin areas called out at the end.

## 1. Sources (URL + one-line takeaway)

### A. Marine instruments
1. https://productimageserver.com/literature/ownersManual/56207OM.pdf — **B&G H5000 Operation Manual (primary source, strongest evidence in this report).** Exact page layouts: SailSteer = 4 corner numbers around one central spatial graphic; Start Line = 3 big distances + centre line-graphic + timer; Race Display = 2 values/page each with a labelled bargraph; 5 configurable pages; night mode with selectable colour (Red) + backlight level.
2. https://www.bandg.com/bg/series/h5000/ — H5000 bundles SailSteer, StartLine and WindPlot as *named task pages*, not generic data grids.
3. https://navico.com/2015/08/10/start-line-advantage-for-sailors-with-bg-racepanel/ — Zeus2 RacePanel is a mode-launcher menu (Race Timer / "What if?" / startline data / scaled line view).
4. https://www.mysailing.com.au/bg-offers-free-software-upgrade-that-gives-navigators-valuable-startline-information/ — StartLine gives distance-to-line, distance-to-each-end, line bias and *boat-lengths gained* — raw data converted into a decision-shaped unit.
5. https://www.bandg.com/bg/type/instruments/h5000race-display/ — Race Display pairs a bargraph adjacent to each number "providing an immediate visual indicator of target data and trends"; up to 10 Hz update.
6. https://www.manualsdir.com/manuals/599945/bg-h5000-pilot-computer.html?page=92 — Polar Performance = boat speed as **% of polar target** for current TWS/TWA.
7. https://sailmon.com/max/ and https://www.upffront.com/blog/sailing-equipment-1/sailmon-max-the-sailing-instrument-built-to-challenge-you-111 — Sailmon MAX: 320×240 transflective panel, soft keys cycling pre-configured pages; heel and pitch are the differentiating channels.
8. https://www.garmin.com/en-US/p/501394/ — Garmin GNX 120: 50+ parameters available but only a couple shown at once; GNX Wind = 2 data fields + one wind rose.
9. https://www.sea-help.eu/en/exclamation-test-technology/chartplotter-garmin-raymarine/ — Raymarine LightHouse sailing set: race timer, dashboards, SmartStart.
10. https://www.northsails.com/blogs/north-sails-blog/j70-upwind-sail-trim-tips + https://www.northsails.com/en-us/blogs/north-sails-blog/j70-upwind-tips-for-big-breeze-and-chop — What a J/70 crew watches: **heel angle** (8° super-light, 12° powered-up, 14° max, 14–17° big breeze/chop), speed vs target, leech telltales stalling 50–70%.
11. https://www.yachtingworld.com/5-tips/5-expert-tips-to-help-you-better-understand-sailing-heel-angles-159205 — Heel is the single most actionable trim feedback channel on a small keelboat.

### B. Sailing trainers / sims
12. https://northu.com/simulator/ (+ https://learn.americansailing.com/p/northu-sail-trim-bundle/) — North U Trim Simulator: seven controls (mainsheet, backstay, traveler, cunningham, jib sheet, jib lead, jib luff), plus wind speed / sea state / view; TP52 and J/35.
13. https://www.apprview.com/sports/north-u-sailing-trim-simulator/ — Praised as "a fantastic mix of simulator, slides, video, replays"; criticised for limited settings — the sim alone doesn't teach; the *explanation attached to the sim* does.
14. https://www.northsails.com/blogs/north-sails-blog/developing-tools-to-help-visualize-performance — North's framing: the tool's job is to *visualise why* a tuning-guide number is recommended.
15. https://www.sailrhythm.com/ — SailRhythm: free browser VPP sim (Catalina 36), mainsheet/traveler/backstay, 3D sail with draft and twist response, wind arrows whose **length encodes speed**, readouts for speed, heel, "efficiency".
16. https://vrinshore.zendesk.com/hc/en-us/articles/360012273900-The-game-interface + https://apps.apple.com/us/app/virtual-regatta-inshore/id1182301199 — VR Inshore reduces trim to two buttons; reviewers report controls too close to the screen edge, mis-touches ejecting them from races.
17. https://store.steampowered.com/app/794860/eSail_Sailing_Simulator/ + https://steamcommunity.com/app/794860/discussions/0/1744469130472759911/ — eSail: 92% positive, most technically accurate; criticised for clunky camera/controls and terminology dumped too fast.
18. https://www.gamingnexus.com/Article/5619/Sailaway-The-Sailing-Simulator/ + https://boatsgeek.com/sailaway-sailing-simulator-review/ — Sailaway: "complexity in a vehicle typically requires complex controls"; the trim panel beside the GPS is singled out as *the* handy bit; difficulty tiers + hint mode rescue it for beginners.
19. https://forums.sailinganarchy.com/threads/new-sail-trim-simulator-sailrhythm.251029/ — (paywalled; search snippet only) sailors evaluate new trim sims primarily on whether the physics feel right.

### C. Other best-in-class sim/control UIs
20. https://pmc.ncbi.nlm.nih.gov/articles/PMC11086349/ — **Peer-reviewed:** G1000 glass panel beat steam gauges on flight performance (Z=−3.816, p<0.001) with lower EEG-indexed mental workload.
21. https://www.sciencedirect.com/science/article/abs/pii/S0003687014002130 — Counterweight: glass cockpits can *hinder* novices overwhelmed by data volume.
22. https://www.aopa.org/news-and-media/all-news/2020/august/flight-training-magazine/ol-how-it-works-pfd + https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/19870010832.pdf — PFD tape pattern: current value centred on a moving scale, coloured operating bands, a **bug** for target and a **trend arrow** predicting value in 5 s. NASA: bugs/range markers are *required* to restore the awareness the round dial gave for free.
23. https://www.nngroup.com/articles/tesla-big-touchscreen/ — Tesla: no haptics forces visual confirmation; bottom-edge placement violates Fitts; V9 shrank targets; persistent map background = clutter.
24. https://www.sciencedirect.com/science/article/pii/S2590198226000382 + https://www.techradar.com/tech/evs-are-finally-embracing-physical-buttons-with-hyundai-being-the-latest-to-admit-to-a-touchscreen-backlash — Multi-step touchscreen tasks raise cognitive load vs buttons; Hyundai/VW reversing course.
25. https://techcrunch.com/2024/10/30/rivians-chief-software-officer-says-in-car-buttons-are-an-anomaly — The dissenting view.
26. https://motorsport.tech/formula-1/understanding-the-f1-steering-wheel + https://www.motorsport.com/f1/news/mercedes-f1-steering-wheel-works/4351666/ — F1 wheel: max ~20 buttons, 9 rotaries, 6 paddles; **each rotary owns one subsystem**; central LCD for the few time-critical values; layout is driver-customisable.
27. https://factorio.com/blog/post/fff-277 + https://factorio.com/blog/post/fff-212 — Factorio: ~120 windows; "neutral and sober look"; 4px module grid at integer pixels; hovering "reset" highlights non-default settings so you see what will change before you click.
28. https://steamcommunity.com/app/954850/discussions/0/3772364949849941678/ + https://jennieyim.com/ksp2 — KSP2: oversized elements meant only ~12 parts visible; new data (Δv, TWR) solved with a **3-state density toggle** rather than adding rows.
29. https://www.overtake.gg/news/hud-preferences-of-the-overtake-community-immersion-vs-information.4114/ (403) + https://simxpro.com/en-us/blogs/guides/simhub-overlays-for-streaming-clean-layouts-for-obs-without-distractions — Sim-racing overlay rules: widgets where eyes already go; "big text beats clever graphics"; **"prefer state over data"**; always label what a delta is against; never move widgets between sessions.
30. https://www.apexsimracing.com/blogs/sim-racing-blog/understanding-telemetry-iracing — MoTeC i2 model: live HUD minimal and state-shaped; deep channel-overlay analysis is a separate post-session mode.

### D. Interaction research
31. https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf — **Few's full spec.** Text label, quantitative scale, featured measure (bar, ⅓ container thickness), 1–2 comparative measures (perpendicular tick behind the bar), 2–5 qualitative ranges (**ideally three**) as intensities of a *single hue* (40%/25%/10% black); no borders; measure becomes a symbol if the scale doesn't start at zero; ranges reversed for "lower is better".
32. https://journals.sagepub.com/doi/10.1518/001872095779049408 (Wickens & Carswell 1995) + https://apps.dtic.mil/sti/tr/pdf/ADA214488.pdf — **Proximity Compatibility Principle:** displays used in a common task should be close in perceptual space; integrated displays help integration but *hurt* focused attention on individual dimensions.
33. https://www.nngroup.com/articles/sliders-knobs/ — Sliders = exploration not precision; require ≤0.1 s live feedback; **rotary knobs are hostile to mouse/trackpad**; pair slider (coarse) + numeric field (fine); mark the default; provide reset.
34. https://www.nngroup.com/articles/steering-law/ — Accot–Zhai: longer/narrower tunnels cost more time; make sliders short and fat, allow click-to-jump.
35. https://www.tandfonline.com/doi/full/10.1080/07370024.2013.803873 + https://www.yorku.ca/mack/hci1992.html — Fitts: target **size** affects error rate disproportionately more than distance.
36. https://www.nngroup.com/articles/direct-manipulation/ + https://en.wikipedia.org/wiki/Direct_manipulation_interface — Shneiderman: continuous representation; physical actions; rapid, incremental, **reversible** operations with immediately visible impact.
37. https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/ — Sparklines: word-sized, data-ink ratio 1.0, no frames or ticks, scaled by adjacent numbers.
38. https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf — Few's 13 dashboard mistakes: exceeding one screen, inadequate context, excessive precision, meaningless variety in display media, poor highlighting, colour misuse.
39. https://www.colorcontrast.org/blog/dark-mode-contrast-accessibility-guide/ + https://dubbot.com/dubblog/2023/dark-mode-a11y.html — Dark UI: avoid pure black (halation); #121212–#1E1E1E surfaces, #E0E0E0–#F0F0F0 text; WCAG AA 4.5:1 text, 3:1 non-text components (1.4.11).
40. https://hfcc.dot.gov/publications/docs/GeneralGuidance/zz_FAA_GeneralGuidanceDoc_Chapter_03_Section_07.pdf + https://www.sciencedirect.com/science/article/abs/pii/S0141938219300368 — Aviation colour semantics: green = normal, amber = caution, red = warning; advisories any colour except red or green; keep the coded set to ~3–4.
41. https://blog.pope.tech/2025/12/08/design-accessible-animation-and-movement/ + https://css-tricks.com/almanac/rules/m/media/prefers-reduced-motion/ — `prefers-reduced-motion: reduce` covers *all* transitions; replace movement with fades, keep gesture-coupled motion; WCAG 2.3.3.
42. https://loke.dev/blog/css-font-variant-numeric-tabular-nums + https://data.europa.eu/apps/data-visualisation-guide/fonts-for-numbers — `font-variant-numeric: tabular-nums` prevents digit jitter in live counters; lining figures.

### E. Web tech
43. https://apexcharts.com/blog/svg-vs-canvas-charts/ + https://www.svggenie.com/blog/svg-vs-canvas-vs-webgl-performance-2025 — SVG and Canvas neck-and-neck at ~1,000 elements; SVG degrades past a few thousand nodes; WebGL only for tens of thousands.
44. https://motion.dev/tutorials/js-svg-path-morphing + https://github.com/veltman/flubber — `d` can't be interpolated by CSS for differing point counts; keep point counts under ~200 and match winding.
45. https://blog.logrocket.com/container-queries-2026/ + https://dev.to/nickbenksim/the-ultimate-guide-to-css-container-queries-in-2026-1ndi — `container-type: inline-size` per panel; media queries for the page grid, container queries for panel internals; don't make every div a container.
46. https://developer.chrome.com/blog/view-transitions-misconceptions + https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API — View transitions to preserve context across view changes; use sparingly.
47. https://web.dev/articles/speed-rendering — 16 ms frame budget, but browser housekeeping means **your work must fit in ~10 ms**; centralise into one rAF loop.

## 2. Per-section findings

### A. Marine instrument design

**The dominant layout idiom is "corner numbers around a central spatial graphic."** The H5000 SailSteer page (manual p.18) places exactly four numeric fields at the four corners — BOAT SPD, TWA, TWD, TWS — around a compass rose carrying heading, laylines, tide, waypoint and true-wind indicator. Eleven distinct data items, one glance, zero scrolling. Garmin GNX Wind uses the same recipe at lower density.

**Racing pages are task-named, not data-named.** B&G ships SailSteer, StartLine, WindPlot, Race Timer; Zeus2's RacePanel is a four-item menu of *racing moments*. Raymarine ships SmartStart. Nobody ships a page called "Wind Data." Panels should be named for the sailor's job.

**Raw data gets converted into decision units.** StartLine shows distances in metres, bias in degrees, and then **BIAS ADV in boat lengths** — the number the afterguard actually argues about. Polar Performance shows speed as **% of polar target**, not knots. The single most transferable idea for a trainer: "backstay: 14" is useless; "% of target speed" and "boat lengths per mile lost" are teachable.

**State is encoded in shape and fill, not just colour.** The StartLine legend distinguishes *not pinged* (hollow), *pinged* (solid), *stale* (hatched), with port red / starboard green. The hollow/solid/hatched axis survives colour-blindness.

**Data-box hierarchy is strictly two-tier per cell.** Race Display: small caps variable name, huge value, small units, plus a *separately labelled* bargraph — the label tells you what the bar graphs, because it's often a different channel from the number. Number size dwarfs label size roughly 4:1.

**Trend is a bargraph beside the number, not a chart.** WindPlot is the exception where history matters: two side-by-side histograms (TWD, TWS) with a mean line and a 1/5/10/30/60-minute window — a sparkline for shifts.

**Night mode is a first-class setting with a colour choice.** Display Setup exposes Backlight level, Night mode, **Night mode colour (Red)**. Night mode is *chromatic*, not merely dark.

**What racers actually watch, ranked:** boat speed vs target/polar %; TWA and target wind angle; heel angle — J/70: 8° super-light, 12° powered up, 14° max, 14–17° big breeze and chop; TWS and TWD for shifts; VMG; laylines. Sailmon's differentiator is heel and pitch — on small keelboats heel *is* the trim gauge. Update rates: 10 Hz for the Race Display; racers expect instantaneous feedback.

### B. Sailing trainers / sims

**North U Trim Simulator** is the closest prior art: seven controls in two natural groups — main (mainsheet, traveler, backstay, cunningham) and jib (sheet, lead, luff tension) — plus environment and a **viewpoint control** (top-down for slot and leech; side for draft). Reviews are bimodal: the bundled version (sim + slides + video + replays) is praised; the bare simulator is thin. **The sim is the evidence, not the lesson. Pair every control with a stated "why."**

**SailRhythm** is the most direct browser competitor: free, VPP-driven, one boat, three controls, 3D sail showing draft and twist, orbit camera, wind arrows encoding speed by length, readouts for speed, heel and "efficiency" — a synthesised single-number score, the "state over data" pattern.

**Virtual Regatta Inshore** collapses trim to two buttons. Its recurring complaint is bottom-edge control placement causing mis-touches — a Fitts failure identical to the Tesla finding.

**eSail** (92% positive) proves fidelity plus a 17-module curriculum sells; criticisms are camera/control clunkiness and terminology arriving faster than explanation.

**Sailaway** frames the tension: "complexity in a vehicle typically requires complex controls." Its two rescues are (a) difficulty tiers with a hint mode and (b) a persistent **trim panel docked beside the instrument display** — reviewers single that panel out as the good part.

**MarineVerse** evidence is thin — one line. Don't lean on it.

### C. Other sim/control UIs

**Consolidation is measurably better — for the trained.** The G1000-vs-steam-gauge study (n=10 novices) found significantly better flight performance with glass and lower EEG-indexed workload. But a separate Applied Ergonomics study found glass can hinder novices overwhelmed by data volume. For a *trainer*: density helps once a scan pattern exists, and hurts before it does. Progressive disclosure is the resolution of a documented conflict, not a nicety.

**The PFD tape is the canonical delta/target widget:** current value centred on a moving scale, static coloured bands, a **bug** for the target, and a **trend vector** predicting 5 s ahead. NASA: tapes lost the dial's angular gestalt; bugs and range markers restore awareness. A bare number for boat speed is the weakest possible choice.

**F1 steering wheels group by subsystem, one rotary per system.** Hard ceiling on control count forces prioritisation. The four-group split (Mainsail / Headsail / Rig / Helm+Conditions) is the same organising move.

**Sim-racing overlays give the sharpest heuristics:** widgets where eyes already go; big text beats clever graphics; **prefer state over data** ("Pitting in 2 laps" over eight fuel numbers); always label what a delta is measured against; keep widget positions constant. MoTeC: minimal live HUD, deep channel-overlay analysis in a *separate* post-session mode.

**Tesla is the cautionary tale:** no haptics forces visual confirmation; controls at the screen bottom violate Fitts; V9 shrank targets; persistent map background reduces readability. Hyundai and VW publicly reversed on touch-only; Rivian dissents; the peer-reviewed ergonomics review sides with physical controls on cognitive load.

**Factorio** manages ~120 windows with a "neutral and sober look", a 4-pixel module grid at integer pixel positions. One gem: hovering reset **highlights the non-default settings** so you see what will change before committing.

**KSP2** shows failure and fix: oversized elements meant only ~12 parts visible; when new data had to fit dense rows, the answer was a **3-state density toggle** rather than more rows.

### D. Interaction research

**Proximity Compatibility Principle (Wickens & Carswell, 1995)** is the strongest theoretical backing for the core idea: information used together in one task should be rendered close together in perceptual space. Physical closeness and colour similarity both count. Warning: object/integrated displays *disrupt focused attention on individual dimensions*. So: put the sail-shape visual beside the sail's controls (integration), but keep each control's own numeric readout separable (focus).

**Sliders vs knobs vs steppers (NN/g):** sliders are for exploration, not precision, and only work when feedback lands within ~0.1 s. Rotary knobs are wrong on desktop — mice and trackpads have no rotation affordance. Recommended: a **linked pair**, slider for coarse, numeric field with steppers for exact, kept in sync; mark the default; provide reset.

**Fitts + steering law:** target *size* affects error rate disproportionately; slider tracks are steering tunnels. So: short, thick tracks; generous hit padding; click-anywhere-to-jump; arrow-key nudging.

**Direct manipulation (Shneiderman):** continuous representation, physical actions, and rapid, incremental, **reversible** actions whose impact is immediately visible. Reversibility (undo a tweak, A/B against the previous setting) is the one most sims skip.

**Bullet graphs (Few):** label left, scale beneath, featured measure as a bar ~⅓ container thickness, comparative measure as a tick *behind* the bar, ideally **3** qualitative ranges as intensities of one hue. No borders. If the scale doesn't start at zero, encode the measure as an X or dot (use for heel angle); **reverse range order for "lower is better"** (leeway, drag). Split bar (actual + projected) maps onto current vs settled speed.

**Sparklines (Tufte):** word-sized, data-ink ratio 1.0, quantified by adjacent numbers. The right form for a 30-second speed or heel history beside its number.

**Few's dashboard mistakes** most threatening here: exceeding one screen; inadequate context; excessive precision; meaningless variety in display media; failing to highlight what matters; misusing colour.

**Dark UI:** avoid pure black; #121212–#1E1E1E surfaces with #E0E0E0–#F0F0F0 primary text, ~#A9A9AB secondary, ~#666–777 tertiary. WCAG AA: 4.5:1 text, 3:1 large text, and **3:1 for non-text UI components** (1.4.11) — binds slider tracks, thumbs, gauge strokes and focus rings.

**Colour semantics:** green = normal, amber = caution, red = warning; advisories any colour *except* red or green. Sailing has a conflicting prior claim on red/green (port/starboard); pick one meaning per hue and hold it.

**Reduced motion:** applies to *all* animation; replace movement with fades; keep motion directly coupled to the user's gesture (a sail responding to a slider drag survives).

**Typography:** `font-variant-numeric: tabular-nums` globally on the instrument container; lining figures.

### E. Web tech

**SVG is the right default for 2D.** Element counts are in the dozens, not thousands; SVG buys CSS styling, per-element events, accessibility, crisp scaling. **Sail-shape morphing:** recompute the path each frame from the model; no morph library needed. **Container queries** production-ready: `container-type: inline-size` on each panel; media queries for the page grid. **View transitions** for context preservation, sparingly. **Frame budget:** ~10 ms of work per frame; one rAF loop.

## 3. Synthesised design principles, ranked by evidence strength

**Tier 1 — strong (peer-reviewed, primary spec, or multiple converging sources)**

1. **Put each visual immediately adjacent to the controls that drive it.** PCP + Sailaway reviews + H5000 SailSteer. Strongest-supported claim in the report.
2. **But keep individual channels separable within the group.** Same PCP paper. Group, don't merge.
3. **Show target and actual together, never actual alone.** Few's bullet graph; PFD bug + trend; B&G bargraph and Polar %.
4. **One screen, no scrolling for the primary cockpit.** Few's #1 mistake; every marine instrument page.
5. **Sliders are coarse; always pair with an exact numeric field.** NN/g + steering law + Fitts.
6. **No rotary knobs on desktop.** NN/g.
7. **Feedback under ~100 ms and continuous during drag.** NN/g; Shneiderman; B&G 10 Hz.
8. **Dark, not black.** #121212–#1E1E1E; 3:1 on non-text per WCAG 1.4.11.
9. **Reserve red/amber/green for status semantics only; cap the coded palette at 3–4 colours.** FAA.
10. **Encode state redundantly in shape/fill, not colour alone.** H5000 legend; Few's single-hue ranges.
11. **`tabular-nums` on every live value.**
12. **Honour `prefers-reduced-motion`, but keep gesture-coupled motion.**
13. **SVG for 2D, one rAF loop, ~10 ms per frame.**

**Tier 2 — medium (industry practice, consistent across products, or single credible study)**

14. **Prefer state over data.** "0.2 kt below target — main too flat for this chop" beats a wall of numbers.
15. **Label what every delta is measured against.**
16. **Name panels after tasks, not data types.**
17. **One control group owns one subsystem, with a hard cap.** F1; North U's seven controls bisected into main and jib.
18. **Progressive disclosure is required, not optional, for a trainer.** G1000 vs novice conflict; KSP2 toggle; Sailaway tiers; eSail modules.
19. **Keep widget positions fixed across sessions and modes.** Muscle memory is the payoff of a cockpit metaphor.
20. **Two-tier hierarchy in every data cell: small label + huge value + small units**, plus a *separately labelled* trend bar.
21. **A viewpoint control is part of the trim UI, not a camera toy.** Different trim faults are only visible from different angles.
22. **Pair every control with its "why."** North U bare sim vs bundle; eSail's terminology complaint.
23. **Split live cockpit from post-hoc analysis.** MoTeC/iRacing.
24. **Preview the consequence of destructive actions.** Factorio reset hover.
25. **Build on a fixed spacing module at integer pixels**, with container queries per panel.

**Tier 3 — weak / directional**

26. Analog/needle forms may read *rate of change* faster than digits (trade sources only) — keep a small angular heel indicator alongside numeric heel; don't over-invest.
27. Rivian's "buttons are a bug" position exists but is outweighed.

## 4. Five layout patterns worth stealing

**Pattern 1 — "Four corners around a live centre" (B&G H5000 SailSteer).** One central spatial graphic carries everything relational; four corners hold the four numbers you steer to. For each system panel: the sail shape lives centre; corners hold that system's key numbers. For Mainsail: draft position %, twist °, leech telltale state, Δ speed vs target. Corner cells double as click-to-expand targets.

**Pattern 2 — "Decision-unit strip" (B&G StartLine).** Measurements on top, a schematic that states the verdict in the middle (hollow/solid/hatched fill, arrow for the favoured end), consequence-in-human-units along the bottom. Our bottom row: "0.15 kt below target · ≈ 2 boat lengths per mile."

**Pattern 3 — "Number + bug + trend, three widgets in one" (G1000 PFD tape; B&G Race Display; Few).** Heel angle: current heel as an X on a scale, the 8°/12°/14° J/70 targets as bands whose boundaries shift with TWS, a bug at the current condition's target. Speed gets the same treatment against polar target.

**Pattern 4 — "Docked system panel with its own instrument column" (Sailaway's trim panel; Wickens PCP; F1 one-rotary-per-subsystem).** Each system is a self-contained card: header naming the system, linked slider+numeric controls down one side, the visual beside them, and a narrow instrument column showing only the metrics that system moves. Container queries let the card reflow docked wide or narrow. Groups without merging.

**Pattern 5 — "Density toggle, not more rows" (KSP2; Sailaway; eSail; G1000-vs-novice literature).** Three states per panel: **Learn** (one visual, one number, one plain-language verdict, control names spelled out), **Race** (full instrument face, abbreviations, targets and trends), **Analyse** (bullet graphs and sparklines for every channel, plus A/B against the previous setting). One global toggle, persisted.

## 5. Where the evidence is thin

- **Sail-trim simulator UI specifically.** No published usability research. North U's user guide PDF is 404; the SailRhythm thread is paywalled. Section B is product marketing plus review sentiment — directional, not evidential.
- **MarineVerse / VR sailing.** One sentence of coverage. Ignore for desktop-first.
- **Marine instrument *design rationale*.** The H5000 manual documents *what*, never *why*. The "why" in Section A is inference from aviation and dashboard literature.
- **Night-mode colour science for screens.** Red night mode rationale is established for physical instruments; no source evaluates it on emissive web displays. A dimmed low-chroma dark theme is defensible; a hard red mode is a flourish with no evidence.
- **Knobs vs sliders quantitatively.** NIME 2009 "A Quantitative Evaluation of the Differences between Knobs and Sliders" surfaced but not read.
- **Dark-mode hex values.** Convention traceable to Material Design, not research. The WCAG ratios *are* normative — anchor on those.
- **F1 pit-wall screen layouts.** No public layout documentation. Steering-wheel evidence is much better.
- **SVG node-count thresholds** come from charting-library vendor blogs. Measure the scene rather than trusting the numbers.
