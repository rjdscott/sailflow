# Phase 04: Onboarding and explainers

- **Status:** 🟢 Completed

## Goal

A sailor who has never seen the app knows within a minute what Dock and
Race are for, what a tier badge means, and what each control does to the
sail — and an expert can switch all of that off. Absorbs the deferred
`docs/plans/2026-08-25-ux-excellence/phase-06` tasks.

## Tasks

- [x] First-run tour: three steps (Dock vs Race, tiers, "Optimise"), dismissible, persisted, keyboard-reachable.
- [x] Control explainers: title, one diagram each, what-it-changes list (ux-excellence 06 L-03) in `src/ui/explain.ts`; Learn tier shows them inline, Race/Analyse behind the existing `?` buttons.
- [x] Dock: shroud-measurement illustration + "how to apply turns" sheet (M-20).
- [x] Learn tier hides the sail-section table and the disagreement solve (M-12, M-23).
- [x] "Sail by the numbers" gear-chart export from Dock (research cockpit 02) as a printable page.
- [x] Playwright a11y run over the tour and explainers.

## Verification

```bash
make check
pnpm test:ui
```

## Artifacts

`src/ui/onboarding/`, explainer content, printable gear chart.

## Progress log

- 2026-08-26 — All six tasks landed on `feat/onboarding-explainers`.

  **Tour.** `src/ui/onboarding/{steps.ts,tour.svelte.ts,Tour.svelte}`, mounted
  from `App.svelte` behind `{#if tour.mounted}` + `await import()`, so a
  returning visitor never fetches the chunk. It reuses `Sheet` rather than
  drawing a spotlight, which buys focus trapping, Escape and inertness from
  `<dialog>.showModal()` for no code, and leaves nothing to animate — hence
  reduced-motion-safe by construction rather than by a media query. The
  dismissal is a `settings` flag (`sailflow.tourSeen`), not a new store. More →
  Settings → "Show again" replays it without clearing the flag.

  One bug worth recording: gating the mount on `tour.open` tore the component
  down in the same flush that closed it, so the `$effect` that records the
  dismissal never ran and the tour reappeared on every load. `mounted` latches
  on and `open` is what moves; the comment in `tour.svelte.ts` says so.

  **Explainers.** `src/ui/explainDetail.ts` (`EXPLAIN_DETAIL`, one entry per
  control: a diagram kind and a what-it-changes list) +
  `src/ui/components/ExplainDiagram.svelte`. Nine schematics, not eighteen —
  every control on the boat does one of nine things to the sail plan, so nine
  drawings give a reader a vocabulary instead of eighteen unrelated pictures.
  Inline SVG, tokens only, dashed `--muted` ghost against a solid `--accent`
  shape. The five panels' identical explain sheets collapsed into one
  `panels/ExplainSheet.svelte`; the Learn tier renders `panels/InlineExplain`
  under each control instead.

  **Dock.** `dock/ShroudGuide.svelte`: an own-drawn schematic of the upper and
  lower shrouds with the turnbuckle barrel enlarged beside them, plus a
  six-step "How to apply turns" sheet. The Dock asked for turns and had never
  said what a turn was.

  **Printable gear chart.** The wind-range chart (research cockpit 02 §2.5)
  now rides on Dock's existing print card, from `gearChart.ts`, with the
  forecast's band marked ▸ and the guide's own attribution under it. A print
  stylesheet, not a PDF library: the browser already paginates, and "Save as
  PDF" is in every print dialog.

  **Learn tier.** The three-section stack is gone from Mainsail, Headsail and
  Gennaker at `learn` (ux-01 M-12) — it is the abstraction, not the sail, and
  the leech profile / stripe gauge / luff curl stay. The disagreement solve
  was already gated on `settings.advanced` at both call sites (ux-01 M-23,
  closed in #65); verified, not re-fixed.

  **Bundle.** The first pass put the explainer content 4468 B past the
  first-load tolerance. Rather than raise the baseline: `EXPLAIN_DETAIL` and
  `DIAGRAM_LABELS` moved out of `explain.ts` into their own module (the
  paragraph copy in `explain.ts` is reached from the instrument band, which is
  on the first screen; none of the new content is), and `ExplainSheet`,
  `InlineExplain` and `ShroudGuide` are all `await import()`. First load
  +1037 B, inside the 2048 B tolerance; `scripts/bundle_baseline.json`
  untouched.

  **Also closed.** `Sheet` gave every sheet in the app an `aria-labelledby`,
  so eighteen explainers, the gear chart and the tour stop being announced as
  unnamed dialogs. Audit release-01 M-10 (Log's contradicting empty states:
  the detail pane no longer renders while the list is empty). Audit release-01
  L-12 and L-13 were already fixed by ux-03 M-06 and M-18 respectively — the
  audit is stale on both; regression tests added rather than code changed.

  **Tests.** `tests/ui/onboarding.spec.ts` (16 cases: the tour's modality,
  keyboard path, persistence, reduced motion and its not delaying the first
  solve; the explainers' named dialog, diagram and list; the Learn/Race tier
  split; the shroud guide; the printed gear chart; and the release-01 items
  above). `tests/ui/fixtures.ts` seeds `sailflow.tourSeen` for every other
  spec — a fresh Playwright context is a first run, and without it the modal
  tour eats every click in the suite.

  **Gates.** `make check` → 0. `pnpm test:ui` → 60 passed.
  `node scripts/bundle_check.mjs` → OK.

  **Open.** Audit release-01 M-11 is only half closed: the confidence badge
  already announces "Confidence B" and the tour now separates density tiers
  from confidence tiers, but the drill difficulty is still called "Tier 1–3"
  in `src/lib/drills.ts` and `src/ui/drills/`, which is outside this phase's
  files. Row stays 🟡 until the branch is reviewed and merged.
