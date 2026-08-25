# Phase 06: Phone, restyle, audit ux-03, close-out

## Goal

The cockpit works one-handed on a phone, the rest of the app wears the
same tokens, an adversarial audit has been run and its critical and high
findings closed, and the docs say where things stand.

## Tasks

- [ ] **Desktop cockpit grid** (carried: phases 03–05 built the panels inside the old two-column Race layout). Implement the README layout at ≥ 1280 px: conditions rail, instrument bar full width, Mainsail | hero | Headsail three-column band, Helm + Rig + actions band; remove the duplicated "Sail sections" and "Rig elevation" cards (each sail's stack now lives in its panel; rig elevation lives in the Rig panel); lede trimmed to one line; one screen with no vertical scroll at 1280×720 in Race tier asserted by Playwright.
- [ ] Phone (< 720 px): panels stacked, hero first, sticky panel tabs (Main / Jib / Helm / Rig) that scroll-to; each panel two-column (controls | visual) via container query; instrument bar collapses to BSP · %POLAR · VMG · HEEL with the rest behind a tap.
- [x] Dock, Log, Drills, More restyled to tokens v2: cards, chips, sliders, badges pick up the new tokens with no IA change; `DisagreePanel` uses InstrumentCell for its numbers.
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

### 2026-08-25 — Dock, Log, Drills, More and the shell wear the cockpit

**No IA change, one visual language.** Every card outside Race now sits on
`--surface-2` — the same raise the Race panels use (ADR 0015) — through one
`:global(.card)` rule per screen rather than a rewrite of twelve components.
`src/app.css` was left alone on purpose: it belongs to the Race agent this
block, and a screen-scoped rule is reversible in one line.

**Numbers moved onto the cell contract.** `RegretCard` renders the expected
regret (size `lg`), the two ends of the forecast band and the argmax (size
`sm`) through `InstrumentCell`, each end carrying a delta labelled *to
expected* (research §3 principle 15). `ScoreSheet` puts "off optimum" and
"VMG lost" through the same cell, with the searched optimum's tier badge and
reason on the line beneath rather than buried in a `title`. More's drill
streak and attempt count are cells too. The disagreement panel lost its
column-header row: every cell now names its own source (Model / North /
Quantum), which is what let four columns of numbers wrap to one on a phone,
and the Δ still rides underneath in plain ink — the panel picks no winner
(audit ux-01 M-06). Its verdict line is weighted like the instrument bar's,
learn tier included.

**Waiting states.** `RegretCard` copies the instrument bar's 1 px
indeterminate sweep verbatim (four lines of CSS; a shared component for that
is worse than the duplication) and drops the 40 % card-wide fade that used to
push the number it was waiting on below 4.5:1.

**Shell.** Rail and tab-bar items are real `<a href="#/…">` with
`aria-current="page"`, off a new pure `navItems(route)` helper in
`src/ui/components/navItems.ts` — extending the list that already existed
rather than adding `src/ui/nav.ts` beside it — with `navItems.test.ts`
covering the hrefs and the single current item. The router is untouched: the
existing `hashchange` listener already does the work. The phone tab bar
gained the rail's 3 px accent indicator, so the current tab is not colour
alone (research §3 principle 10).

**Token hygiene.** Every `var(--line, color-mix(…))` fallback on a control
outline in the touched files became `--line-strong`, which the contrast gate
holds at 3:1 on all three surfaces (WCAG 1.4.11): log fields and NumberField,
the Dock's optimum chips and quiet buttons, the drill secondary buttons, the
tier and mastery dots. `Segmented` became an inset control (`--bg` trough,
`--line-strong` outline). `Toast` stopped inverting to `--ink`/`--bg` — a
white slab across a dark cockpit — and became a raised `--surface-2` panel;
Dock's commit now raises one. Log rows show the wind as the row's instrument
line and the result as a chip. Drill cards carry a `Due` chip, a best-medal
chip and a C-tier badge drawn to match `ConfidenceBadge` (the component is a
`<button>` and the card already is one). `tokens.css` needed no value change;
`scripts/contrast_check.mjs` passes.

**Not done here:** the desktop cockpit grid, the phone panel tabs, audit
ux-03 and the close-out tasks are the other tasks on this phase.
