# Punchlist — ux-04

Priority: **P0** ship-blocker, **P1** before sharing with the skipper and
friends, **P2** soon, **P3** nice. Effort in brackets. Details in
[01-entry-and-conditions.md](01-entry-and-conditions.md) and
[03-cockpit-and-screens.md](03-cockpit-and-screens.md); scores in
[02-scorecard.md](02-scorecard.md). Remediation PRs cite the code.

Every row was closed by the [simulator plan](../../plans/2026-08-28-simulator/)
(ADR [0021](../../adr/0021-dock-and-race-merge-into-one-simulator-page.md)):
#108 phase 01, #110 phase 02, #107 phase 03, #109 phase 04, #111 phase 05.

## P1 — before it goes to the skipper

- [x] **H-01** (P1, L) Split the instrument band: boat left, conditions right, every conditions value directly editable, same cell type ramp; conditions leave the header rail. Absorbs M-01, M-02, M-08, M-09. — #108
- [x] **H-02** (P1, S) Tour card 1 becomes "Set the wind", anchored on the conditions band; "Dock, then Race" moves to card 2. — #110; card 2's spotlight anchor (`data-tour="rig"`) landed with the Rig panel in #111
- [x] **H-03** (P1, M) Phone order: header → conditions → boat band → hero → panels; cap phone hero height so band + hero fit 844 px. — #110
- [x] **H-04** (P1, S) Downwind VMG renders as magnitude + `↓`, delta label restated for VMG-down. — #110
- [x] **M-03** (P1, S) Presets that rewrite trim leave the Conditions surface, or say "wind + trim" on the button. — #108 (`Start from ▾` in the actions bar, each item "— wind + trim")
- [x] **M-04** (P1, S) Re-fit the hero camera on `.hero-boat` resize so Learn tier frames the boat. — the `ResizeObserver` refit was already in `SailView3D` (#72, both axes #101) and the cockpit slot resizes with the card, so the framing was measured rather than rebuilt: at Learn/1440 the head of the mainsail projects to 11 % of the canvas height, inside the top quarter. Pinned by a regression test in #111, which also exposes the live camera on the DEV handle so the test can project through it.

## P2 — soon

- [x] **M-05** (P2, S) Log empty state says what a saved entry gives back. — #111. Not the sentence the audit proposed: `Suggest a setup` scores a candidate grid by expected regret over the forecast (`ui/dock/logic.ts`) and never reads the log, so "the setup you logged is the first suggestion" would have been false. What is true is the link — "Every entry keeps a link back to the Simulator on the wind, the rig and the trim you sailed".
- [x] **M-06** (P2, S) Lull / Shift / Replay a gust grouped under "Simulate" with ▶ glyphs. — #111, plus the TWS cell wearing an `--accent` ring while a replay writes it (static ring under Motion off, pulse otherwise)
- [x] **M-07** (P2, S) Delete the wordmark row from the phone tab bar. — #110
- [x] **L-03** (P2, S) Rename "Helm & conditions" once crew moves to the band. — #108 (the panel is `Helm`); its Learn-tier lede is #111

## P3 — nice

- [x] **L-01** (P3, S) "Restored your last session · Reset" toast on cold load with non-default state. — #110
- [x] **L-02** (P3, S) Race lede stops truncating on phone. — #110 (shortened at the source: "Trim for the wind in front of you.")

Absorbed into H-01 (tick with it): M-01, M-02, M-08, M-09.
