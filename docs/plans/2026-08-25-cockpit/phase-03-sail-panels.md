# Phase 03: Mainsail and Headsail panels

## Goal

The two live-trim panels exist: each pairs its controls with its own
section stack and one feedback gauge, the slider is the NN/g linked pair,
and `ControlPanel` is retired.

## Tasks

- [x] `src/ui/race/panels/Mainsail.svelte`: mainsheet, traveller, backstay, vang, outhaul, cunningham; main halyard collapsed under "setup". Visual: main section stack (¼ ½ ¾) + leech profile with top-batten angle vs boom. Gauge: `LeechStallMeter` (band 50–70 %, labelled wind- or mode-driven).
- [x] `src/ui/race/panels/Headsail.svelte`: jibSheet, jibLead, inhauler; jib halyard collapsed. Visual: jib section stack + `SpreaderStripeGauge` (18/20/22", prov: North tuning guide). `SagIndicator` showing backstay's headstay effect. Sequence hint "ease → lead aft → tension" in Learn tier.
- [x] `geometry.ts`: `leechProfile(shape)` and `battenAngleDeg(shape, boomDeg)`; `SECTION_LAYOUT` split per sail; fit tests updated.
- [x] `Slider.svelte`: short fat track, click-to-jump, always-visible numeric stepper in Race/Analyse tiers, default tick, optimum bug (existing `target`), reset-hover highlight (`highlight` prop) — Race store exposes `willMoveOnReset()`/`willMoveOnApply()` for the Factorio pattern. Tests in `components/logic.test.ts` and `store.test.ts`.
- [x] `ControlPanel.svelte` deleted; `EXPLAIN` sheets reachable from each panel row; kite rows move to Helm panel (phase 05) — until then they stay in a temporary "Downwind" card.
- [x] `keys.ts`: `m` / `j` focus first control of Mainsail / Headsail; `ShortcutsSheet` updated; tests.
- [x] a11y: every control 44 px hit, labelled; panels are `<section aria-labelledby>`.

- [x] Carried from phase 02: `leechStallFrac` only reaches 0–0.11 upwind with the lift-loss e-fold as its scale, so the 50–70 % band is unreachable; rescale the meter on the leech twist range (see ASSUMPTIONS) so the band is meaningful upwind, with tests at base trim (inside band) and hard-sheeted (above). `jibLeechStripe` reads −0.6 at base trim: calibrate the spreader offset so base trim sits at stripe 1 (20"), ASSUMPTIONS row updated.

## Verification

```sh
make check
```

## Artifacts

- `src/ui/race/panels/{Mainsail,Headsail,DownAndDock,ControlRow}.svelte` + `copy.ts`,
  `src/ui/race/{SailSectionStack,LeechProfile,SpreaderStripeGauge,SagIndicator}.svelte`,
  `geometry.ts` + tests, `Slider.svelte`, `keys.ts` + test, `tests/ui/race.spec.ts`.
  The leech-stall meter is a `BulletGauge` against `LEECH_STALL_BAND` rather
  than a `LeechStallMeter` component — the primitive already does it.

## Progress log

### 2026-08-25 — shipped

**Calibration (carried from phase 02).** Both meters are anchored on the
canonical base trim, `src/core/shape/base.ts` `baseRace()` upwind at 10 kt /
42° — the trim phase 02 measured at −0.6 stripes.

- `leechStallFrac(devDeg)` is a logistic on the *twist* deviation:
  `1 / (1 + exp(−(dev / 0.25 + 56°) / 45°))`. `dev / TWIST_TO_AOA` is the head
  twist the leech would need for the sheeting model's mid-height angle of
  attack to land on its optimum, minus the twist it has — which is exactly the
  "leech twist deviation from the optimum-twist target" the phase asked for,
  and it is proportional to the same `devDeg` the forces read, so monotonicity
  in mainsheet is preserved by construction. Readings at 10 kt / 42°: eased to
  30 % **0.09**, base trim **0.53**, hard on **0.80**. Downwind (TWA 150)
  still reads ~1.0, which the old scaling also got right and a twist-only
  meter would have lost. `sheeting.ts` now exports `TWIST_TO_AOA` so the 0.25
  is not written twice.
- `jibLeechStripe` gained `STRIPE_OFFSET_IN = 3.2`, which puts base trim on
  the middle 20" stripe (**0.99**). Three holes aft reads 2.32, three forward
  −0.38 — the nearest stripes, so the tests assert `toBeCloseTo(2, 0)` and
  `toBeCloseTo(0, 0)` rather than an exact index the lead-to-twist gain is not
  calibrated to hit.

**Decisions.**

- *Anchored on `baseRace()`, not Race mode's `BASE_RACE`.* The two "base
  trims" in this repo are not the same trim — `BASE_RACE` sheets harder (main
  70 %, jib 70 % against 60/60) — and the phase brief quoted the −0.6 stripe,
  which is `baseRace()`. The stall meter reads 0.68 at `BASE_RACE`, still
  inside the band; the stripe reads −0.45 there, still hooked, so the verdict
  can still say "lead aft" at the screen's default trim. **Reconciling the two
  base trims is the follow-up**, and an ASSUMPTIONS row now says so.
- *The stall centre is −56°, a large offset, and the comment says why.* The
  sheeting layer's optimum angle of attack is its lift-maximising one, far
  tighter than the trim the guides call base; anchoring on the guide's trim
  rather than on the model's own optimum is the honest way round, and it is
  the only way the published band is reachable.
- *`SailSections` became a two-up of the new `SailSectionStack`.*
  `SECTION_LAYOUT` is now one sail's box (`w` 132, `luffX` 16), the fit test
  loops one sail, and the primary column's picture card keeps working
  untouched — the 3D hero agent owns that column.
- *`ControlRow.svelte` is shared by both panels and the temporary card.* Three
  callers, so it is reuse rather than a speculative abstraction. `Slider`'s
  lock mechanism is reused verbatim for "jib not flying": same affordance,
  same accessibility tree, no second disabled state. That needed `lockReason`
  to carry the whole sentence rather than a fragment with a rigging clause
  hard-coded after it.
- *`valueText` gained a `word` argument.* The tick on the track is the base
  trim, and announcing it as "guide 70 %" would have been a number claiming a
  source it does not have.
- *A "Base trim" button was added to the actions row.* `willReset()` was in
  the brief but had no caller — "Back to my trim" is the undo, and previewing
  a reset-to-base on it would be a lie. The button is six lines, gives the
  Factorio preview its canonical example, and there was otherwise no way back
  to base without changing the condition via a preset.
- *`LEECH_STALL_BAND` and `STRIPE_INCHES` are written on both sides of the
  module boundary.* ADR 0003's eslint rule forbids `src/ui` importing
  `src/core`, so the two published constants live in
  `src/ui/instruments/gauges.ts` as well, with a "keep them identical" note —
  the same precedent `src/ui/race/boat.ts` already sets for the two angle
  formulas.

**Verification.**

- `make check` — green (63 files, 984 tests).
- `pnpm test:ui` — green, 5 tests. `tests/ui/race.spec.ts` is new: no
  horizontal scroll at 1280×720 and 1440×900, both panel headings visible,
  and both panels exposed as labelled regions.
- `pnpm golden` — 65 cases, `boatHash c31fb449 calibHash ab97c1e7` unchanged.
  The diff is 181 changed lines, every one of them a `value` or `sign` inside
  a `leechStallFrac` or `jibLeechStripe` block; no other field moved.
- `pnpm validate` — hold-out gate **unchanged: FAIL, 21/25 gated rows inside
  tolerance**, same four rows, worst residuals 15.1 % and 25.5° at TWS 14 asym
  vmgDn. Instruments are outputs only, so the physics could not move.
  `validation/report.md` regenerated byte-identical but for the timestamp and
  commit lines, and reverted.

**Not done / for later.**

- The two base trims (`baseRace()` vs `BASE_RACE`) still disagree; the stripe
  offset is calibrated to the first, so Race mode's default trim reads −0.45.
- The Race screen still scrolls vertically at 1280×720; the one-screen
  assertion belongs with phases 04–06, and the Playwright test says so.
- Chevrons are analyse-tier only now, by CSS. Nothing tests the tier gating —
  it is a stylesheet rule, and a jsdom test of it would assert the CSS text.
