# Punchlist — ux-03

Priority: **P0** ship-blocker, **P1** before public release, **P2** soon,
**P3** nice. Effort in brackets after the priority. Details in
[01-race-cockpit.md](01-race-cockpit.md),
[02-accessibility.md](02-accessibility.md), [03-phone.md](03-phone.md),
[04-performance-3d.md](04-performance-3d.md). Remediation PRs cite the finding
code.

Phase 06's audit task says C/H findings are fixed in that phase, which is why
every High is P0 here.

## P0 — ship-blocker

- [x] **H-01** (#65) (P0, M) Every sail-shape visual in the desktop cockpit renders in a 0 px box, at every scroll position and both tiers — the visual's auto row track in `Panel.svelte`'s grid collapses inside the cockpit's `overflow-y: auto` panel; give `.visual` a `min-height: 140px` floor and assert a non-zero height at 1280×720 and 1440×900.
- [x] **H-02** (#65) (P0, S) On Drills at ≥ 1280 px the instrument band's verdict is thrown outside its `overflow: hidden` card and both gauges are clipped, because `InstrumentBar` switches layout on a viewport query while `DrillView` mounts it in a ~500 px column — `container-type: inline-size` on `.bar` and `@container (min-width: 1000px)`.
- [x] **H-03** (#65) (P0, S) The model-vs-guides panel is `overflow: hidden` in the cockpit grid, so 87 % of it is unreachable and the disagreement is asserted without a single number, while the page gains 820 px of void — render the summary row inline and put the table behind the existing `Sheet`.
- [x] **H-04** (#65) (P0, M) After committing on the Dock the Rig panel renders the gear-chart header with 0 of 7 rows (546 px hidden, no scrollbar gutter), which reads as "no data for this guide" — give Rig its own taller grid row and render only the lit row plus neighbours in the cockpit.
- [x] **H-05** (#62) (P0, S) Puff replay reads `race.result` before the new step has solved, so at the 14 kt peak it says "Underpowered" beside 15° heel and 1.16 helm load and flips to "Overpowered" only as the gust leaves — move the `powerState`/`panelOrder` assignment into `#next`'s existing poll-loop exit. Known-undone per phase 05's log.
- [x] **H-06** (#63) (P0, S) `ConfidenceBadge` is a `<button>` nested inside `button.apply`, so clicking or Entering the tier badge rewrites five sliders — fix both call sites (`ActionsBar.svelte:52-64` **and** `SuggestButton.svelte:43-49`, which applies a rig setup), following the plain `<span class="side">` precedent.
- [x] **H-07** (#65) (P0, S) Tab order runs rail → band → bottom actions strip → back up to the hero chips, reaching the first trim control at stop 41 and scrolling the viewport across three positions at 1024–1280 px — move `<section class="card insight">` after `.p-rig`; check the phone verdict placement at 390 px.
- [x] **H-08** (#63) (P0, M) Nothing on Race is a live region: apply-optimum, point-of-sail and every solve change the coach line silently — `role="status"` on `Race.svelte:271`, plus one visually-hidden status summarising BSP/%POLAR/VMG after a solve settles.
- [x] **H-09** (#64) (P0, S) `prefers-reduced-motion` never reaches the 3D hero: telltales run at 60 fps and camera presets tween on the default `'system'` setting, against an ADR 0014 commitment that phase 04 ticks as done and More's copy claims is honoured — fold `prefersReducedMotion.current` into `still`, and write the test with `sailflow.motion` **unset**, since pinning it to `'off'` is what hid this.
- [x] **H-10** (#63) (P0, S) The tier-B badge on the accent Apply optimum button measures 1.06:1 dark / 1.62:1 light, and tier-A on `--muted` measures 3.49:1 / 4.05:1 — give the badge an explicit surface instead of inheriting, repaint tier A on `--surface-2`, and add the two missing rows to `scripts/contrast_check.mjs`.
- [x] **H-11** (#62) (P0, M) On the phone the hero is 1045 px down under a sticky panel strip that scrolls past it with no way back, against the plan README's "hero first" — `order` rules under `@media (max-width: 719px)` to put the hero above the band and the tabs below it.
- [x] **H-12** (#64) (P0, S) ADR 0014's 50 ms first-frame gate times a warm second frame (1.0–12.7 ms across a 20× CPU spread) instead of the frame the user waits through (43–279 ms), so it can never trip and the 2D fallback is unreachable — gate on wall-clock `onMount` → frame 1 and re-pick the budget against real numbers.

## P1 — before public release

- [x] **M-01** (#70) (P1, M) Cockpit panels hide 54–81 % of their content behind an internal scroll with no styled affordance, worst on Rig (19 % visible) and tighter in Learn than Race — lower `Panel.svelte`'s 560 px container threshold or widen the column so the three-column layout fires; pin each panel's cue and add a scroll shadow.
- [x] **M-02** (close-out) (P1, S) A drill prints "Finding the optimum…" indefinitely while it is actually waiting for the user, because `verdict.ts:61` returns loading copy for the deliberately withheld target — add a distinct branch and copy that names the state, plus a `verdict.test.ts` case.
- [x] **M-04** (#70) (P1, S) The Learn tier ellipsises seven control names it is specified to spell out, while the hint text refers to them in full — scope the ellipsis to the race and analyse tiers and let Learn wrap to two lines.
- [x] **M-05** (close-out) (P1, S) The Δ sign convention is stated only in a source comment, so the band reads "+0.4" beside "0.29 kt below target" — extend the label once per band or flip to the loss reading, and add the sentence to the BSP/VMG explainers.
- [x] **M-06** (close-out) (P1, S) Race's purpose sentence is `display: none` at ≥ 1280 px and no in-content link points to Drills — keep the lede as one header-row line and add "New to this? Try a drill →" to the actions strip.
- [x] **M-13** (close-out) (P1, S) Thirteen instrument `?` buttons are 17.4 px tall on the phone against the repo's own 44 px token, and "Jib leech?" fails SC 2.5.8's spacing exception at 23.1 px — add `.hit-44` to `.explain` in `InstrumentCell` and `BulletGauge` only; leave `ConfidenceBadge` at its documented 24 px.
- [x] **M-14** (close-out) (P1, S) `aria-label` on role-less `<div>`s means the point-of-sail and conditions groups have no accessible name — add `role="group"` to `ConditionsStrip.svelte:39,53`.
- [x] **M-15** (close-out) (P1, S) `height: 56px` plus `padding-bottom: env(safe-area-inset-bottom)` under `border-box` means the tab bar does not grow on notched phones: all five labels sit in the gesture-reserved strip and Dock's commit bar floats 34 px clear — `height: calc(56px + env(safe-area-inset-bottom))`, which leaves Dock and Toast correct as written.
- [x] **M-16** (close-out) (P1, S) The HELM gauge is passed no `ranges`, so `symbol` mode draws two hairlines on an invisible track, on the phone band and the desktop Helm panel — pass a band split around `HELM_TARGET` and add a scale legend, or give `BulletGauge` a fallback track rect.
- [x] **M-17** (close-out) (P1, S) The verdict sentence is printed twice back-to-back on the phone, costing ~14 % of the first screen — `display: none` on the band's copy under `max-width: 719px`.
- [x] **M-18** (close-out) (P1, S) Dock's regret card prints "Expected regret" as an `h2` and again as the cell label — drop the `h2` and give the section `aria-labelledby` on the cell's label.
- [x] **M-19** (close-out) (P1, S) The instrument band's "More" disclosure and the "More" nav tab are on screen together at 390 px, and the pill gives no cue that three readings are hidden — "More readings ▾" / "Fewer readings ▴" plus a chevron.

## P2 — soon

- [ ] **M-03** (P2, M) "Clicks" is the unit the Race coach line and the whole of Drills grade in and it is defined nowhere; the Learn tier also hides the ± steppers, the only discrete click affordance — pending ux-02 M-15's purchase-derived units, add one sentence to the mainsheet `?` sheet. Do not print the coach line as a percentage delta: it is a ±1-step gradient probe, not the distance to the answer. **Deferred to phase two 04** (onboarding and explainers): the fix is one sentence in the mainsheet `?` sheet, which lives in `src/ui/explain.ts` — phase 04's surface, being rewritten there — and the item's own text blocks it on ux-02 M-15's purchase-derived units, which phase 04 also owns.
- [ ] **M-07** (P2, L) The Analyse tier's only unique numbers are LEECH STALL and JIB STRIPE, both duplicates of gauges on the same unscrolled screen, and the sparkline half of Pattern 5 is dead CSS that can never fire — land the promised content or fold the two cells into Race and delete the tier. **Deferred to phase two 04** (onboarding and explainers): this is a decision, not a fix — "land the promised content or delete the tier" is a fork on the density tiers (ADR 0006, ADR 0015) that needs an ADR before any code moves, and phase 06 is a performance phase with no standing to take it.
- [ ] **M-08** (P2, M) HEADSTAY SAG draws a zero-based bar with no bands and no bug, and %POLAR drops the confidence band `instruments.ts:233` already computes — forward the channels the solve already returns; leave the two bar cells whose panel gauges already carry the reference. **Deferred to phase two 04** (onboarding and explainers): the channels to forward are in `src/ui/instruments/instruments.ts` and the gauges that read them, which phase 04 is editing for the Learn tier concurrently. Instrument *content*, not phone performance.
- [ ] **M-09** (P2, S) `sparkPoints` normalises each series to its own min/max, so a 0.1 kt wobble draws a full-height collapse — floor the span per channel and draw the optimum as a reference line in the same box. **Deferred to phase two 04** (onboarding and explainers), paired with M-10: both are `sparkPoints` in `src/ui/instruments/gauges.ts` plus the panel wiring in `src/ui/race/panels/`, and M-10's null sentinel is only meaningful once M-09's polyline splitter exists to draw it. Splitting them across phases would push sentinels into a buffer no drawing code understands.
- [ ] **M-10** (P2, S) `historyKey` resets the trend buffer on any wind change, so the sparkline is empty during a wind sweep and a gust replay, and the collected heel series is never drawn — push a `null` sentinel and split the polyline; pass `trend={history.series('heel')}` to the HEEL gauge. **Deferred to phase two 04** (onboarding and explainers), paired with M-09 — see there. `historyKey` in `src/ui/race/store.svelte.ts` was deliberately left alone in phase 06: the finding does not ask for a looser key, it asks for a sentinel and a split polyline, and the store half is useless without the drawing half.
- [ ] **M-11** (P2, S) The analyse chevron's magnitude lives only in a `title`, unreachable on touch and keyboard — print `▲ +0.06 kt` using the `chevLabel` already computed. **Deferred to phase two 04** (onboarding and explainers): `src/ui/race/panels/ControlRow.svelte`, which phase 04 owns and is editing concurrently.
- [ ] **M-12** (P2, S) `.delta-label` is clipped outside the Learn tier, so Analyse sees "target 4.14 +0.29" with no statement of the reference or direction — show it at every tier, abbreviated rather than clipped at `sm`. **Deferred to phase two 04** (onboarding and explainers): `src/ui/components/InstrumentCell.svelte`, and the fix is a tier-gating change in the same rules phase 04 is rewriting for the Learn tier.
- [x] **M-20** (P2, M) Race spends ~600 px of the phone's first screen on title, lede and four wrapped chip rows before the first number — shrink the `h1`, collapse the lede, move the condition chips behind the existing Edit sheet. **Fixed** (phase-two 06): all inside Race's `max-width: 719px` block — `h1` to `--text-lg`, lede hidden, the four read-only condition chips behind the Edit sheet they duplicate. Head 302 → 176 px; hero `208–691` and the panel strip `707–767` at 390×844, both on the first screen. Covered by `tests/ui/phone-perf.spec.ts`.
- [x] **M-21** (P2, S) Every Race visit leaks two WebGL contexts and the whole detached Race DOM tree (+2,404 nodes, +38.9 listeners per visit; 61,865 nodes over 25 cycles) — `forceContextLoss()` before `dispose()`, memoise `hasWebGL()` at module level, add the four missed inline materials. No context-lost handling is needed: the live hero is never the eviction target. **Fixed** (phase-two 06): `forceContextLoss()` before `dispose()`, `hasWebGL()` memoised at module level, and the hand-written material list replaced by a `scene.traverse` that disposes material as well as geometry, which is what had let the four inline ones drift out of it. Contexts held over Race ↔ Dock ×5: 12 → 2, flat. Covered by `tests/ui/phone-perf.spec.ts`.
- [x] **M-22** (P2, S) The phone fetches 142 KB gzip of three.js and creates a context for a hero 372 px below the fold that then draws two frames and parks — swap `SailHero`'s width-only `shown` gate for an `IntersectionObserver` on the same slot. **Fixed** (phase-two 06), by a different route than proposed: H-11 had already moved the hero above the fold, so an `IntersectionObserver` alone saves nothing. The observer replaced the width gate anyway (hidden and off-screen copies fall out for free), and a phone with no stored preference now opens on the plan view. `SailView3D` requests on a 390 px first load 2 → 0; phone first-load JS 236.9 → 97.6 KB gzip. Desktop unchanged, asserted in the same spec.
- [x] **M-23** (#78) (P2, S) 13.8 KB gzip of provenance/assumptions/validation markdown and all five screens sit in the entry chunk — `await import()` the three `?raw` files inside their disclosure and make More, Log and Drills dynamic imports the way `Kit` already is.
- [x] **M-24** (P2, M) A one-second slider drag creates and destroys 285 GL buffers because everything but the two sail meshes is rebuilt from scratch per event — give the four line meshes `applySail`'s reuse path and skip the mast/boom rebuild unless the spar points changed. **Fixed** (phase-two 06): `applySail`'s reuse path extended to the four line meshes and to the telltales' six attributes, and the mast and boom tubes rebuilt only when their points move. A 20-step drag: 300 buffers created / 300 destroyed → 0 / 0. Covered by `tests/ui/phone-perf.spec.ts`.
- [x] **M-25** (P2, S) `DEBOUNCE_MS = 80` is 33× the measured 2.4 ms solve, so the instruments trail the slider by ~105 ms at 7–9 Hz while the 3D sail follows it live — drop the main `trimmed` solve to ~16 ms and keep the longer delay for the probe pass and `optimalTrim`. **Fixed** (phase-two 06): re-measured at a 1.4–2.0 ms median (n = 36, p90 8.8–11.9); `DEBOUNCE_MS` 80 → 20 and the eight-solve probe pass moved to its own `PROBE_DEBOUNCE_MS = 80` trailing timer. Settle time ~105 → ~25 ms. Two cases in `src/ui/race/store.test.ts`.

## P3 — nice

- [x] **L-01** (P3, S) Every drill wears a "Due" chip on a first run, so the one prioritisation signal on the page is uniformly on — suppress it when `attempts === 0`. **Fixed** (phase-two 06): suppressed at `attempts === 0` in `DrillCard`. `spacing.ts` is unchanged — a never-practised drill really is the most overdue, and the featured drill depends on that.
- [x] **L-02** (P3, S) `PuffReplay.svelte:80` outlines the Lull/Shift chips in `--line` (1.28:1 dark, 1.17:1 light), the one control outline phase 06's `--line-strong` sweep missed — swap the token. **Fixed** (phase-two 06).
- [x] **L-03** (P3, S) `RigElevation.svelte:147-161` puts a `<button>` as a direct child of a `<dl>` — move it into the `<figure>` beside the `<figcaption>`. **Fixed** (phase-two 06): the `<dl>` and the button now sit in a `.dims` flex wrapper, so the paint is identical.
- [x] **L-04** (P3, S) Log's actions row abuts the card below it with a 0 px gap where every other card has `--space-4` — add the margin. **Fixed** (phase-two 06): `margin-bottom: var(--space-4)` on `.toolbar`.
- [x] **L-05** (P3, S) The production-gated Kit chunk is still precached by the service worker (3.8 KB per install) — add `Kit-*` to the existing `workbox.globIgnores` beside `SailView3D`. **Fixed** (phase-two 06): `grep -c "Kit-" dist/sw.js` is 0.

## Reconciliation — 2026-08-26

Checked against `main` at `3a2e96d`. **P1 Mediums are excluded from this pass**
— they were being worked concurrently; only P2 and P3 were reconciled here.

Every open P2 and P3 item was re-verified against the code and none had been
fixed incidentally. Spot checks, in the two places most likely to have moved:
`DEBOUNCE_MS` is still 80 (`src/ui/race/store.svelte.ts:48`) for M-25, and the
hero still has no `forceContextLoss()` and calls `hasWebGL()` per instance
(`src/ui/three/SailHero.svelte:67,138`) for M-21. M-22's `shown` gate is still
the width-only `ResizeObserver` at `:130-133`, and `sparkPoints`
(`src/ui/instruments/gauges.ts:203`), `historyKey`
(`src/ui/race/store.svelte.ts:69`), `chevLabel`'s title-only magnitude
(`src/ui/race/panels/ControlRow.svelte:101`), `.delta-label`'s Learn-only
visibility (`src/ui/components/InstrumentCell.svelte:155`), PuffReplay's
`--line` outline (`:80`), RigElevation's `<button>` inside a `<dl>`
(`:161-163`) and `globIgnores` without `Kit-*` (`vite.config.ts:32`) are all
unchanged.

`docs/plans/2026-08-26-phase-two` does not exist yet — the deferral notes name
where this work is meant to land, and creating that plan is the next step.

## Log

- 2026-08-26 — reconciled against main at `3a2e96d`; 0 ticked, 17 deferred
  (P2 and P3 only; the P1 Mediums were left untouched for a concurrent pass).
- **2026-08-26 — P1 Mediums closed out** (`fix/ux03-p1-mediums`). M-02, M-05,
  M-06, M-13, M-14, M-15, M-16, M-17, M-18, M-19 fixed, each with a unit test
  or a Playwright check. M-13 and M-16 landed in the shared components
  (`InstrumentCell`, `BulletGauge`) rather than per call site, so the desktop
  Helm panel and every future symbol-mode gauge are covered with them. M-13
  keeps phase 06's cockpit carve-out: the 44 px overlay is off at ≥ 1280 px,
  where instrument rows are 37 px apart and two overlays would overlap. The 3D
  screenshot baselines did not move.
- **2026-08-26 — P2 performance and every P3 closed** (`perf/phone`, phase-two
  phase 06). M-20, M-21, M-22, M-24, M-25 and L-01–L-05 fixed, each with a
  measured before/after in the phase's progress log
  (`docs/plans/2026-08-26-phase-two/phase-06-phone-performance.md`) and, for
  the four with browser-visible behaviour, a case in
  `tests/ui/phone-perf.spec.ts` that fails against the code as it was. M-22
  landed by a different mechanism than the finding proposed, because H-11 had
  already moved the hero above the phone's fold and invalidated the
  below-the-fold premise; the recorded fix is the observer *and* a plan-view
  default on coarse pointers.
  The seven remaining P2 Mediums (M-03, M-07, M-08, M-09, M-10, M-11, M-12)
  are all instrument content or cockpit copy rather than phone performance,
  and all of them land in files phase-two phase 04 owns and is editing. Each
  now carries its file and its reason above rather than a bare deferral. M-07
  additionally needs an ADR before code moves.

