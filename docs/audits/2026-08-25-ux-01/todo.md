# Punchlist — ux-01

Priority: **P0** ship-blocker, **P1** before public release, **P2** soon,
**P3** nice. Details in [01-race.md](01-race.md), [02-dock.md](02-dock.md),
[03-shared.md](03-shared.md). Remediation PRs cite the finding code.

## P0 — ship-blocker

- [x] **C-01** (P0, M) Dock commit never reaches Race; Race hardcodes 0/0/0 and prints "committed for the day" unconditionally — derive `controls.dock` from `rigLock.locked?.setup ?? BASE_DOCK` (mutate in place; `ControlPanel.svelte:13` aliases the proxy) and gate both `locked` and the note on `rigLock.lockedToday`.
- [x] **H-01** (P0, S) Hardcoded minus makes every regret render negative and inverts the ranking — delete the literal `−` at `Dock.svelte:89`, header to "Regret (s/mi slower)".
- [x] **H-02** (P0, M) Sticky desktop metrics strip overlaps the control rows; primary column ends ~400 px early — drop `position: sticky` at `Race.svelte:258-262` or hoist the band full-width above `.screen`.
- [x] **H-03** (P0, S) Suggest shares the busy flag and seq with rescore ("Searching…" unprompted, suggestion silently dropped) — separate `suggesting` flag and `suggestSeq`.
- [x] **H-04** (P0, S) `summary { display: flex }` kills the disclosure marker on every expander — delete `display: flex` in `Race.svelte:293-301` and `Panel.svelte:392-398`; raise the "Why" summary to `var(--hit-min)`.
- [x] **H-05** (P0, M) Coach line carries no confidence tier and its sign is inverted downwind — badge it with the lower of base/probed `vmgKt.tier`, and negate the gain (or suppress coach + chevrons) when `sailset === 'asym'`.

## P1 — before public release

- [x] **M-01** (P1, M) Conditions only editable in a modal; TWA chip inert — point-of-sail chips (close-hauled / close reach / beam reach / broad reach / run) as the angle control, inline conditions on `lg`, "Done" button on `Sheet`.
- [x] **M-03** (P1, S) Phone commit bar: unlabelled one-tap, occludes mid-scroll, no scrim — add an opaque plate + hairline and state the consequence in the bar; keep one tap, do not touch `padding-block-end`.
- [x] **M-05** (P1, S) Model-vs-guides shows "n/a" while loading and "These disagree." unconditionally — `busy && !optimum → 'solving…'`, render `model.error`, derive the headline sentence, hold the "calibrated here" chip.
- [x] **M-07** (P1, S) Applying a suggestion moves the locked sliders, leaving two rigs on one screen — guard `DockStore.apply()` on `rigLock.lockedToday` and disable the `.pick` buttons.
- [x] **M-08** (P1, S) Slider readout is a dead tab stop, long-press only, blur-empty zeroes the value — add `onclick` to edit, focus the input, bail on empty/non-finite, `Escape` to cancel, `hit-44`.
- [x] **M-09** (P1, L) No optimise-to-target on Race, no target beside BSP/VMG — ghost ticks on the sliders showing the VPP optimum plus an "Apply" button, all tier-badged; **blocked**: `optimal.ts:51-58` optimises backstay only, so ship only real solver output until the Epic 2 multi-control optimiser lands.
- [x] **M-10** (P1, S) Telltales hidden on the third tab and off by default on phone — default the picture tab to Plan, add a streaming/lifting/stalled legend that survives reduced motion.
- [x] **M-13** (P1, S) Tier badges are title-only and wear the interactive colour — make the badge a button opening `Sheet`, restyle tiers neutrally, keep `--accent` for pressable things.
- [x] **M-15** (P1, M) Only motion is a full-cell flash; shapes snap — telltale flutter, heel tilt and eased tweens on `--dur`/`--ease` tokens, all respecting `prefers-reduced-motion`; replace the flash with an underline.
- [x] **M-17** (P1, M) ARIA composite roles with no keyboard model; sliders expose no units, band or lock reason; `aria-label` on spans — roving `tabindex` + arrow keys on `Segmented`, `aria-valuetext` + `aria-describedby` + `aria-disabled` on `Slider`, `role="group"` on the conditions strip.

## P2 — soon

- [x] **M-02** (P2, S) Gain chevrons use red/green as direction, colouring the recommended move as a fault — one colour for both glyphs, thread the magnitude out of `gradients()` into a directional label (updates `store.test.ts:155`).
- [x] **M-04** (P2, S) Phone coach line sits a full screen down — render an `lg-hide` copy of the insight card under `<ConditionsStrip />`.
- [x] **M-06** (P2, S) Guide deltas painted in the error colour, no legend — neutral magnitude encoding at `Panel.svelte:364-377`, name the subject ("model +0.3"), add a noise-threshold key.
- [x] **M-11** (P2, S) Presets overwrite all eleven sliders with no undo — split condition from trim, or stash the previous controls and offer Undo via the existing `Toast`.
- [x] **M-12** (P2, M) Simple mode hides sliders but keeps every hard concept — show only BSP/Height/VMG, collapse the section table, single Boat view. — closed in phase-two 04: the Learn tier no longer renders `SailSectionStack` in Mainsail, Headsail or Gennaker, and the disagreement solve was already gated (see M-23). See the reconciliation note below for what "Simple mode" became.
- [x] **M-14** (P2, S) Dock columns missing `.stack`, so cards butt into one grey slab — add `stack` at `Dock.svelte:59` and `:117`.
- [x] **M-16** (P2, S) Emoji padlocks ignore the theme tokens — one stroked 16 px `currentColor` padlock in `--ink-2`.
- [x] **M-18** (#52, #58: HELM load in the instrument bar and Helm panel) No helm or rudder-angle readout — surface the solver's balance term as an eighth tier-badged readout, or state its absence.
- [x] **M-19** (#58: A/B compare in the actions bar) No before/after compare — "Pin this trim" storing one `$state.snapshot`, drawn as the `.ref` path with pinned-vs-live deltas.
- [x] **M-20** (P2, M) Shroud turns with no picture of how to measure — one own-drawn rig elevation SVG on the Dock RIG card, reusing `RigElevation` geometry. — closed in phase-two 04 by `src/ui/dock/ShroudGuide.svelte`: a schematic of the upper and lower shrouds with the turnbuckle barrel enlarged beside them, plus a "How to apply turns" sheet. Not `RigElevation`'s geometry — that drawing is to scale and a turnbuckle is three pixels tall in it; this one is deliberately not to scale.
- [x] **M-21** (P2, S) Wind arrows the same length at all TWS — scale `RING.len` with `twsKt`, clamped.
- [x] **M-22** (P2, S) Downwind preset in Simple mode has no kite controls — drive `race.downwind` off `conditions.sailset` and show the kite controls in Simple under the existing C-tier banner.
- [x] **M-23** (#65) (P2, S) Disagreement solve runs even when the panel is hidden — gate the `$effect` on the `<details>` open state, surface the headline delta unconditionally.

## P3 — nice

- [ ] **L-01** (P3, S) Simple mode wastes three rows on locked dock sliders — largely subsumed by C-01; afterwards wrap the Dock setup card in `{#if advanced}` or show a one-line summary chip.
- [x] **L-02** (P3, S) Slider troughs and chip borders near 1.3:1 contrast — darken `--muted`, give `.chip`/`.info` an `--ink-2`-derived border.
- [x] **L-03** (P3, M) Control explainers untitled with no illustration — render the matching `SailSections`/`RigElevation` beside the text in the explain sheet. — closed in phase-two 04. Titled since the cockpit remodel (`panels/copy.ts`); illustrated now by `src/ui/components/ExplainDiagram.svelte` from `src/ui/explainDetail.ts`, plus a what-it-changes list. Nine schematics rather than the live `SailSections`/`RigElevation`: an explainer is about a *direction*, and a live drawing of the current solve does not show one.

## Reconciliation — 2026-08-26

Checked against `main` at `3a2e96d`. The cockpit remodel (ADR 0015, #51–#60)
and the desktop-kite plan rebuilt the screens two of these findings were
written against, so the state below is what a stranger should read, not the
tick alone.

- **M-23** — ticked. The `<details>` the finding named is gone: ux-03 H-03
  (#65) put the summary row inline in the cockpit panel and moved the table
  behind the existing `Sheet`, so the delta is now unconditional. The solve
  itself is gated on the density tier — `src/ui/screens/Race.svelte:47-49` and
  `src/ui/screens/Dock.svelte:22-24` only `model.request(...)` when
  `settings.advanced`, and the panel renders under the same guard.
- **M-12** and **L-01** — superseded by the cockpit density tiers (ADR 0015,
  #51–#60). Both cite `src/ui/race/ControlPanel.svelte`, which no longer
  exists; Simple/Advanced was replaced by `learn` / `race` / `analyse`
  (`src/ui/stores/settings.svelte.ts:6-12`, which migrates the old values), and
  the panels are per sail system. The successor findings on the same ground are
  ux-03 M-04 (Learn tier) and ux-03 M-07 (Analyse tier); those are the live
  handles, not these.
- **M-20** — still open, unchanged. `RigElevation.svelte` is mounted only in the
  Race Rig panel (`src/ui/race/panels/Rig.svelte:143`); the Dock RIG card still
  issues shroud turns with no picture. Deferred to phase two.
- **L-03** — still open, unchanged. `EXPLAIN` is a flat `Record<string, string>`
  (`src/ui/explain.ts:12`) rendered as one untitled paragraph
  (`src/ui/race/panels/copy.ts:33`, `InstrumentBar.svelte:241`); no title, no
  illustration. Deferred to phase two.

## Log

- 2026-08-26 — reconciled against main at `3a2e96d`; 1 ticked, 4 deferred
  (2 superseded by the cockpit remodel, 2 carried forward unchanged).

