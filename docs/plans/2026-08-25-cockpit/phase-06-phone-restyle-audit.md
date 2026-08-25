# Phase 06: Phone, restyle, audit ux-03, close-out

## Goal

The cockpit works one-handed on a phone, the rest of the app wears the
same tokens, an adversarial audit has been run and its critical and high
findings closed, and the docs say where things stand.

## Tasks

- [ ] **Desktop cockpit grid** (carried: phases 03–05 built the panels inside the old two-column Race layout). Implement the README layout at ≥ 1280 px: conditions rail, instrument bar full width, Mainsail | hero | Headsail three-column band, Helm + Rig + actions band; remove the duplicated "Sail sections" and "Rig elevation" cards (each sail's stack now lives in its panel; rig elevation lives in the Rig panel); lede trimmed to one line; one screen with no vertical scroll at 1280×720 in Race tier asserted by Playwright.
- [ ] Phone (< 720 px): panels stacked, hero first, sticky panel tabs (Main / Jib / Helm / Rig) that scroll-to; each panel two-column (controls | visual) via container query; instrument bar collapses to BSP · %POLAR · VMG · HEEL with the rest behind a tap.
- [ ] Dock, Log, Drills, More restyled to tokens v2: cards, chips, sliders, badges pick up the new tokens with no IA change; `DisagreePanel` uses InstrumentCell for its numbers.
- [ ] `/audit ux-03` — lenses: novice (Learn tier), expert (Analyse tier), accessibility (contrast, keyboard, reduced motion, screen reader on cells), phone, performance (3D on a throttled CPU). Evidence screenshots. C/H findings fixed in this phase; M/L to `todo.md`.
- [ ] `CHANGELOG.md` entry; runbooks: `deploy-to-github-pages` (Playwright job), any touched.
- [ ] Plan README "State at end of the fourth autonomous block"; memory note updated.
- [ ] Pages live-verified desktop 1280×720 (no scroll) and phone; reduced-motion; both themes; keyboard-only trim.

## Verification

```sh
make check
pnpm validate
pnpm exec playwright test --project=chromium
```

## Artifacts

- `docs/audits/2026-08-25-ux-03/*`, `CHANGELOG.md`, restyled screens, plan README state section.

## Progress log
