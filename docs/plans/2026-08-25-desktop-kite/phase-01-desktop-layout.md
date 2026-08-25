# Phase 01 — Desktop layout: fill the screen, no internal scroll

## Goal

From 1280 px the cockpit sizes to its content and fills the window: no panel
scrolls inside itself, every control and gauge is on the page at full size,
and the components use the room — full control names, longer slider tracks,
bigger gauges, section stacks and hero. 1920×1080 holds everything; 1536×864
holds the instrument bar, the hero and both sail panels' primary controls in
the first viewport.

## Tasks

- [ ] `src/App.svelte` / `tokens.css`: `main` fills the window past the rail up to a 2200 px cap on Race (other screens keep `--content-max`).
- [ ] `Race.svelte` ≥ 1280: grid `height: auto`, rows `auto`, panel bodies `overflow: visible`; remove the `max-height: 799px` scroll mode and the `.visual` `max-height` cap (keep the `min-height` floor); hero row `minmax(480px, 56vh)` at ≥ 1080 tall.
- [ ] Panel columns: hero column grows first (`1fr 1.8fr 1fr` → measured), Helm/Rig row content-sized.
- [ ] Components grow: `ControlRow` label no ellipsis at ≥ 1280 (full names), slider track ≥ 160 px, `BulletGauge`/`SpreaderStripeGauge`/`SailSectionStack` scale with their container (container query units), instrument cells `lg` values bigger at ≥ 1536.
- [ ] Instrument bar out of view: coach line stays `role="status"`; note in the progress log whether a sticky readout is wanted after the live walk (ADR 0016 revisit trigger).
- [ ] Tests: replace the two "no scroll in either axis" tests with (a) no horizontal scroll at 1280×720, 1536×864, 1920×1080; (b) every `input[type=range]`, button and gauge in the cockpit has a non-zero box not clipped by any ancestor with `overflow` other than `visible`; (c) at 1920×1080 the document height ≤ viewport; (d) at 1536×864 the Mainsail and Headsail first sliders are inside the first viewport. Keep the Rig lit-row test but without the "inside the scroller" clause.
- [ ] Screenshot baseline regenerated in the pinned image if the hero pixels move.
- [ ] Progress log with measured heights at both target sizes.

## Verification

`make check`; `pnpm test:ui`; `node scripts/bundle_check.mjs`.

## Artifacts

`src/ui/screens/Race.svelte`, `src/App.svelte`, `src/ui/components/{Panel,Slider}.svelte`,
`src/ui/race/panels/ControlRow.svelte`, `tests/ui/race.spec.ts`.

## Progress log

