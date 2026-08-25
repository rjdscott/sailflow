# Phase 03 — Gennaker panel

## Goal

Under the kite the Headsail slot is the Gennaker panel: kite sheet, tack
line, halyard, sprit, with the kite section stack and a luff-curl cue
beside them; the Helm panel loses its Kite section. Under the jib nothing
changes.

## Tasks

- [ ] `src/ui/race/panels/Gennaker.svelte`: same `Panel` contract; controls `kiteSheet, tackLine, kiteHalyard, sprit` (`race.controls.down`), tier C badges, "direction only" note; visual = kite section stack + a `LuffCurl` cue (curling / flying / collapsed from `kite.ts`); instruments = none in Race, the kite's draft/twist cells in Analyse.
- [ ] `Race.svelte`: render `Gennaker` in the `jib` grid area when `conditions.sailset === 'asym'`, else `Headsail`; panel id stays `headsail` so `j`, PanelTabs and the puff replay keep working (`panelControlsId('headsail')`).
- [ ] `Helm.svelte`: remove the Kite section and the `race.downwind` checkbox (the panel swap replaces it); update `keys.ts`/help sheet copy if they mention it.
- [ ] Coach line / verdict: under the kite the sentence names the kite sheet, not the jib.
- [ ] Tests: store test that the panel swap follows `sailset`; Playwright: choosing Run shows the Gennaker heading and four kite sliders, `j` focuses the first; choosing Close-hauled restores Headsail.
- [ ] Progress log.

## Verification

`make check`; `pnpm test:ui`.

## Artifacts

`src/ui/race/panels/Gennaker.svelte`, `src/ui/race/LuffCurl.svelte`, `src/ui/screens/Race.svelte`,
`src/ui/race/panels/Helm.svelte`, tests.

## Progress log

