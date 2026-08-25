# 0015. Race mode is a cockpit of task-named sail-system panels, one instrument-cell contract, and three density tiers

- **Status:** Accepted; one-screen clause superseded by [0016](0016-cockpit-sizes-to-content-page-scrolls.md)
- **Date:** 2026-08-25

## Context

Race mode grew by accretion: a picture carousel, a readouts card, a control
panel grouped as Sheets / Rig / Halyards, and a coach line. Each piece is
sound (audits ux-01, ux-02) but the whole does not read as one instrument.
The owner asked for a cockpit: controls in logical groups, visuals beside
the controls that move them, dark instrument styling, intuitive for a
beginner and dense enough for a Grand Prix trimmer.

The research
([01](../research/2026-08-25-cockpit/01-instrument-and-simulator-ux.md),
[02](../research/2026-08-25-cockpit/02-j70-trim-mental-model.md)) gives
three hard constraints. The Proximity Compatibility Principle says
information used in one task must sit together in perceptual space, but
fused displays hurt attention to any single channel. Glass-cockpit studies
say consolidation helps trained users and overwhelms novices, so one fixed
density cannot serve both. And J/70 sources disagree on which crew member
owns which control but agree on which sail each control moves.

## Options considered

**A. Group controls by effect (power / twist / balance / height).**
- Pros: teaches the North U power model directly.
- Cons: splits real-world jobs across panels; a mainsheet drag would light
  two panels.

**B. Group by crew seat (helm / main / jib / bow).**
- Pros: mirrors a race boat.
- Cons: ownership differs between North's speed guide, Quantum, and the
  Worlds-winning team; a seat-keyed layout is wrong for some readers by
  construction.

**C. Group by sail system: Mainsail, Headsail, Helm & Conditions, Rig.**
  (chosen)
- Pros: every source agrees which sail a control moves; each panel gets one
  visual and one feedback cue; matches marine instruments' task-named pages.
- Cons: backstay moves both sails; resolved by placing it with Mainsail
  (where the hand is) and showing a headstay-sag cross-indicator on
  Headsail.

**Density: two modes (Simple / Advanced, status quo) vs three tiers.**
Two modes leave no home for A/B compare, sparklines and bullet graphs
without crowding Advanced; a third tier (Analyse) gives them one. A tier is
an attribute on the panels, not three component trees.

**Numbers: bare value vs instrument cell.** Aviation and marine practice
never show a bare number; every value carries its target bug, trend and a
labelled delta, or it is not an instrument.

## Decision

**We will rebuild Race mode as four task-named panels grouped by sail
system — Mainsail, Headsail, Helm & Conditions, and a dock-gated Rig
panel — each pairing its controls with the one visual and one feedback cue
that those controls move; every number is rendered through a single
instrument-cell contract (label, value, unit, optional target bug, optional
trend, tier badge, labelled delta); and one global density toggle with
three tiers (Learn / Race / Analyse) replaces Simple / Advanced.** Desktop
is a single screen with no scroll at 1280 px and wider; the phone stacks
the same panels.

## Consequences

Easier: a control and its consequence sit within one saccade; new metrics
have one place to land (the cell) and one axis to hide behind (the tier);
the layout matches what B&G and Sailmon users already read. Harder: the
tier attribute must be honoured by every panel; Drills and the disagreement
panel must move onto the cell contract; the phone loses the picture
carousel for a stacked cockpit. Committed to: `settings.mode` migrates
simple→Learn and advanced→Race; red and green are reserved for telltale
state; every non-text component meets 3:1 in both themes. Unwinding costs
days, not hours: the panels replace `ControlPanel` and `Readouts` rather
than wrapping them.

**Revisit when:** audit ux-03 finds novices fail the Learn tier, or a fifth
panel is proposed (the cap is four; a fifth means the grouping is wrong).

## Related

- Research: [01-instrument-and-simulator-ux](../research/2026-08-25-cockpit/01-instrument-and-simulator-ux.md),
  [02-j70-trim-mental-model](../research/2026-08-25-cockpit/02-j70-trim-mental-model.md).
- Plan: [2026-08-25-cockpit](../plans/2026-08-25-cockpit/).
- Builds on ADR 0005 (Svelte, no state library), ADR 0006 (tiers),
  ADR 0014 (3D hero). Decision log rows 36–39, 41.
