# Phase 03: Mainsail and Headsail panels

## Goal

The two live-trim panels exist: each pairs its controls with its own
section stack and one feedback gauge, the slider is the NN/g linked pair,
and `ControlPanel` is retired.

## Tasks

- [ ] `src/ui/race/panels/Mainsail.svelte`: mainsheet, traveller, backstay, vang, outhaul, cunningham; main halyard collapsed under "setup". Visual: main section stack (¼ ½ ¾) + leech profile with top-batten angle vs boom. Gauge: `LeechStallMeter` (band 50–70 %, labelled wind- or mode-driven).
- [ ] `src/ui/race/panels/Headsail.svelte`: jibSheet, jibLead, inhauler; jib halyard collapsed. Visual: jib section stack + `SpreaderStripeGauge` (18/20/22", prov: North tuning guide). `SagIndicator` showing backstay's headstay effect. Sequence hint "ease → lead aft → tension" in Learn tier.
- [ ] `geometry.ts`: `leechProfile(shape)` and `battenAngleDeg(shape, boomDeg)`; `SECTION_LAYOUT` split per sail; fit tests updated.
- [ ] `Slider.svelte`: short fat track, click-to-jump, always-visible numeric stepper in Race/Analyse tiers, default tick, optimum bug (existing `target`), reset-hover highlight (`highlight` prop) — Race store exposes `willMoveOnReset()`/`willMoveOnApply()` for the Factorio pattern. Tests in `components/logic.test.ts` and `store.test.ts`.
- [ ] `ControlPanel.svelte` deleted; `EXPLAIN` sheets reachable from each panel row; kite rows move to Helm panel (phase 05) — until then they stay in a temporary "Downwind" card.
- [ ] `keys.ts`: `m` / `j` focus first control of Mainsail / Headsail; `ShortcutsSheet` updated; tests.
- [ ] a11y: every control 44 px hit, labelled; panels are `<section aria-labelledby>`.

- [ ] Carried from phase 02: `leechStallFrac` only reaches 0–0.11 upwind with the lift-loss e-fold as its scale, so the 50–70 % band is unreachable; rescale the meter on the leech twist range (see ASSUMPTIONS) so the band is meaningful upwind, with tests at base trim (inside band) and hard-sheeted (above). `jibLeechStripe` reads −0.6 at base trim: calibrate the spreader offset so base trim sits at stripe 1 (20"), ASSUMPTIONS row updated.

## Verification

```sh
make check
```

## Artifacts

- `src/ui/race/panels/{Mainsail,Headsail}.svelte`, `src/ui/race/{LeechStallMeter,SpreaderStripeGauge,SagIndicator}.svelte`, `geometry.ts` + tests, `Slider.svelte`, `keys.ts` + test.

## Progress log
