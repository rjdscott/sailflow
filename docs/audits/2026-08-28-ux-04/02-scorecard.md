# 02 — Scorecard, every component 1–5

5 = category-leading, would show a stranger without caveat. 4 = right, needs
polish. 3 = works, a defect or a rough edge a user hits. 2 = user-visible
problem in the primary path. 1 = missing or misleading.

| # | Component | Score | Why (finding) |
|---|-----------|:-----:|---------------|
| 1 | Entry from `/` + first-run tour | **2** | Tour omits the wind (H-02); restores stale session silently (L-01); the copy on the three cards is otherwise the best in the app |
| 2 | Conditions controls (rail + sheet) | **2** | Remote, 28 px, mostly inert, hidden on phone behind "Edit" (H-01, M-01, M-03, M-09) |
| 3 | Wind-direction representation | **2** | Text only on the default view; the rose exists but is a tab away (M-08) |
| 4 | Instrument band (BSP · %polar · VMG · heel · helm) | **4** | Right numbers, target deltas, tier badges, verdict, live region. Negative downwind VMG (H-04); phone puts it below the fold (H-03) |
| 5 | Coach line + actions bar | **4** | One sentence, one primary button, A/B, undo, pin, copy link. `Lull`/`Shift`/`Replay a gust` have no affordance saying they are simulations (M-06) |
| 6 | 3D hero + view tabs | **4** | Whole boat framed on both axes, telltales, kite flies. Learn tier leaves the top 60 % empty (M-04) |
| 7 | Mainsail panel | **4** | Sliders + section stack + boom-angle glyph + leech stall meter + `?` on every control. Dense but every element earns its place |
| 8 | Headsail panel | **4** | As Mainsail; jib-leech stripe gauge and headstay sag are excellent honesty devices |
| 9 | Helm & conditions panel | **3** | Mode/fore-aft right; crew duplicated (M-02); title lies (L-03) |
| 10 | Rig panel (on Race) | **4** | "Nothing committed today … not what you will be sailing" is exactly the right sentence; "Set it on the dock →" is the right CTA |
| 11 | Model vs guides panel | **4** | Summary inline, table behind `Full table` (ux-03 H-03 fixed). Wording "These disagree." with no delta unit on first read |
| 12 | Density tiers Learn / Race / Analyse | **4** | Learn's per-control bullets are a genuine teaching layer; tour card 2 explains the naming collision well |
| 13 | Downwind mode (Run / Gennaker) | **3** | Kite, modes, tier-C mainsheet cue all right; VMG shown negative (H-04) |
| 14 | Navigation shell (rail / tab bar) | **4** | Five destinations, real hrefs. Phone tab bar carries a dead "Sailflow" wordmark row (M-07) |
| 15 | Phone Race layout | **2** | 5076 px tall, numbers below fold, conditions collapsed to `10 kt` + `Edit` (H-03, H-01) |
| 16 | Dock screen | **4** | Forecast → regret → suggest → rig → commit reads top-to-bottom; "Provisional — scoring 9 wind speeds × 36 setups" tells the truth about the wait |
| 17 | Drills | **4** | Today's drill, tiers, streak honesty line. Cards' condition line ("6–8 kt · flat/ripple · jib") is the best conditions summary in the app — steal its format for the band |
| 18 | Log | **3** | Correct empty state; nothing on it says what a saved entry gives you back later (M-05) |
| 19 | More / Settings / About | **4** | "A practice tool, not a measurement" paragraph is the honesty statement done right; usage counters are transparent |
| 20 | Honesty surfaces (A/B/C badges, `?` sheets, deltas) | **5** | Every number carries its tier, every `?` opens prose, the delta label states its sign convention. Category-leading |

**Mean 3.5.** The three 2s are one problem seen from three angles: the wind.
Fix H-01/H-02/H-03 and rows 1, 2, 3, 15 move to 4 without touching anything
else.
