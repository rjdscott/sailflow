# Phase 04: Onboarding and explainers

- **Status:** 🔵 Not started

## Goal

A sailor who has never seen the app knows within a minute what Dock and
Race are for, what a tier badge means, and what each control does to the
sail — and an expert can switch all of that off. Absorbs the deferred
`docs/plans/2026-08-25-ux-excellence/phase-06` tasks.

## Tasks

- [ ] First-run tour: three steps (Dock vs Race, tiers, "Optimise"), dismissible, persisted, keyboard-reachable.
- [ ] Control explainers: title, one diagram each, what-it-changes list (ux-excellence 06 L-03) in `src/ui/explain.ts`; Learn tier shows them inline, Race/Analyse behind the existing `?` buttons.
- [ ] Dock: shroud-measurement illustration + "how to apply turns" sheet (M-20).
- [ ] Learn tier hides the sail-section table and the disagreement solve (M-12, M-23).
- [ ] "Sail by the numbers" gear-chart export from Dock (research cockpit 02) as a printable page.
- [ ] Playwright a11y run over the tour and explainers.

## Verification

```bash
make check
pnpm test:ui
```

## Artifacts

`src/ui/onboarding/`, explainer content, printable gear chart.

## Progress log
