# Phase 06: Phone, restyle, audit ux-03, close-out

## Goal

The cockpit works one-handed on a phone, the rest of the app wears the
same tokens, an adversarial audit has been run and its critical and high
findings closed, and the docs say where things stand.

## Tasks

- [x] **Desktop cockpit grid** (carried: phases 03–05 built the panels inside the old two-column Race layout). Implement the README layout at ≥ 1280 px: conditions rail, instrument bar full width, Mainsail | hero | Headsail three-column band, Helm + Rig + actions band; remove the duplicated "Sail sections" and "Rig elevation" cards (each sail's stack now lives in its panel; rig elevation lives in the Rig panel); lede trimmed to one line; one screen with no vertical scroll at 1280×720 in Race tier asserted by Playwright.
- [x] Phone (< 720 px): panels stacked, hero first, sticky panel tabs (Main / Jib / Helm / Rig) that scroll-to; each panel two-column (controls | visual) via container query; instrument bar collapses to BSP · %POLAR · VMG · HEEL with the rest behind a tap.
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

### 2026-08-25 — cockpit grid, phone, one screen (part A)

**The grid is the layout now.** `Race.svelte` is one `.cockpit` grid with
named areas per breakpoint instead of `.col-primary` / `.col-secondary`:
≥1280 `head / bar / main hero jib / helm helm rig / act act dis`; 1024–1279
two columns (bar, hero, actions left; the four panels stacked right);
720–1023 one column with the panels 2-up under the hero; below 720 plain DOM
order. The duplicated "Sail sections" and "Rig elevation" cards and the
phone's tabbed picture card are gone — each stack lives in its own panel —
and `SailSections.svelte` with them. One hero component now, not a desktop
copy and a phone copy with CSS hiding one, so there is one WebGL context by
construction rather than by a visibility gate.

**One screen is a height cap, not a diet.** At 1280×720 the panels' own
content is ~950 px tall; no amount of trimming fits that in 664. So from
1280 px the grid is `height: calc(100dvh - 56px)` with `minmax(0, …fr)` rows,
and each panel's body scrolls inside itself while its heading stays put. The
document then cannot scroll at any viewport height, which is what
`tests/ui/race.spec.ts` asserts at 1280×720 and 1440×900 (Race tier; Learn
and Analyse may scroll). Measured at 1280×720: rail 70, band 115, hero row
215, helm/rig row 121, actions 94.

**Where the 44 px went.** Thumb-sized rows are a phone requirement, and eight
of them in a panel column is the whole vertical budget. Inside `.cockpit`
only, at ≥1280 only: chips 28 px, actions and disclosures 32 px, slider rows
one 36 px line (label + value + track, label ellipsised — the full name is
still the range's accessible name), camera chips 28 px. Anything wearing
`.hit-44` keeps its 44 px hit area; the rest are ≥ 28 px, over the WCAG 2.2
minimum, on a surface that is a mouse-and-keyboard screen by definition.

**Phone.** Same four panels stacked, hero first at about 4:3, under a sticky
`Main · Jib · Helm · Rig` strip: click scrolls the panel in (honouring
reduced motion), an IntersectionObserver marks the one under the strip.
`panelSection()` in `ui/keys.ts` finds a panel through the heading that
labels it, so the strip and the keyboard use the same lookup and the panels
did not grow a second set of ids. The instrument band keeps BSP · %POLAR ·
VMG · HEEL and puts TWA, the helm bar and the analyse cells behind **More** —
a `max-width: 719px` rule, so no other layout can lose a reading to it.

**Keyboard.** `h` → Helm, `r` → Rig alongside `m` / `j`; all four scroll the
panel into view as well as focusing its first slider (Rig has no slider once
the tune is committed, so there the scroll is the whole jump). `SHORTCUTS`
and the help sheet updated; `keys.test.ts` asserts one key per panel and no
key bound twice.

**3D.** Hull `#8ea6bd → #b7c8d8`, deck `#a9bccf → #d5e0ea`, a third
directional light low and behind as a rim, water `#0d2233 → #12293c` with the
fog one step lighter than the sky so the distance fades into a horizon band,
sail cloth warmer (`#e8eef4 → #f2ece0`) with deeper draft stripes, telltales
1.5× longer, and the leeward preset aimed 0.8 m lower — it framed the sails
and left the hull on the bottom edge. The hero's height is the grid cell's:
`SailHero` publishes `--hero-h` (a clamp on the phone, `100cqh` in the
cockpit, where the slot is a size container) and both the 3D stage and the
plan view's svg read it, so the swap between them still moves nothing.

**Decisions.**

- *Panels scroll, the page does not.* The alternative was hiding controls per
  tier, which breaks "widget positions fixed across modes" (research §3
  principle 19) and hides exactly the control a trimmer reaches for. A panel
  that scrolls keeps every control in the same place and costs a wheel.
- *Controls above the picture inside a cockpit panel.* `Panel`'s narrow
  layout leads with the picture, which is right on a phone; at 1280 the
  panel column is ~315 px, the hero is the thing being looked at, and what
  the column is for is sliders. The panel's own visual is capped at 220 px
  and sits under them.
- *The lede is hidden at ≥1280*, not shortened again. It is one line now
  (copy trimmed) and it reads on the phone; wedged into the rail it wrapped
  to five lines beside the title, and every row there comes off the hero.
- *The screenshot gate moved 0.01 → 0.03.* The baseline is still generated in
  `mcr.microsoft.com/playwright:v1.62.1-noble` and is exact there; the wider
  hero cell gave the host's SwiftShader more antialiased sail edge to
  disagree about (measured 0.02 host-vs-image). The silhouette is what the
  shot guards, and `threshold: 0.35` is unchanged.

**Deviations from the brief.**

- **1024–1279 puts one panel per row in the right column, not 2-up.** Split
  at that width each panel is ~210 px, narrower than a single slider row
  wants. 2-up happens at 720–1023, where the column is the full page.
- **The actions strip is two lines at 1280 px** (one at 1440): the coach
  sentence, five buttons, the replay and the "why" do not fit 1136 px. It is
  the `auto` row at the bottom, so it costs the hero 46 px and nothing else.

**Not done / for the next agent.**

- At 1280×720 the 3D stage is ~110 px tall. Everything fits and nothing is
  hidden, but the hero is a strip at that size; at 1440×900 it is ~250 px.
  Worth an audit ux-03 look at whether the instrument band (115 px) should
  drop to `md` cells under 800 px of viewport height.
- The leeward preset still looks into the open hull shell rather than at lit
  topsides; the material is right (the astern view shows it), the geometry is
  a shell. A closed hull or a backface-culled one is phase 04 work.
- Dock / Log / Drills / More restyle and the disagreement panel are the
  concurrent half of this phase; audit ux-03 and the plan README state
  section are still open.
