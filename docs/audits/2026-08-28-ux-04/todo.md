# Punchlist — ux-04

Priority: **P0** ship-blocker, **P1** before sharing with the skipper and
friends, **P2** soon, **P3** nice. Effort in brackets. Details in
[01-entry-and-conditions.md](01-entry-and-conditions.md) and
[03-cockpit-and-screens.md](03-cockpit-and-screens.md); scores in
[02-scorecard.md](02-scorecard.md). Remediation PRs cite the code.

## P1 — before it goes to the skipper

- [ ] **H-01** (P1, L) Split the instrument band: boat left, conditions right, every conditions value directly editable, same cell type ramp; conditions leave the header rail. Absorbs M-01, M-02, M-08, M-09.
- [ ] **H-02** (P1, S) Tour card 1 becomes "Set the wind", anchored on the conditions band; "Dock, then Race" moves to card 2.
- [ ] **H-03** (P1, M) Phone order: header → conditions → boat band → hero → panels; cap phone hero height so band + hero fit 844 px.
- [ ] **H-04** (P1, S) Downwind VMG renders as magnitude + `↓`, delta label restated for VMG-down.
- [ ] **M-03** (P1, S) Presets that rewrite trim leave the Conditions surface, or say "wind + trim" on the button.
- [ ] **M-04** (P1, S) Re-fit the hero camera on `.hero-boat` resize so Learn tier frames the boat.

## P2 — soon

- [ ] **M-05** (P2, S) Log empty state says what a saved entry gives back.
- [ ] **M-06** (P2, S) Lull / Shift / Replay a gust grouped under "Simulate" with ▶ glyphs.
- [ ] **M-07** (P2, S) Delete the wordmark row from the phone tab bar.
- [ ] **L-03** (P2, S) Rename "Helm & conditions" once crew moves to the band.

## P3 — nice

- [ ] **L-01** (P3, S) "Restored your last session · Reset" toast on cold load with non-default state.
- [ ] **L-02** (P3, S) Race lede stops truncating on phone.

Absorbed into H-01 (tick with it): M-01, M-02, M-08, M-09.
