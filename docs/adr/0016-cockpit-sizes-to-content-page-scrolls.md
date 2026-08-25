# 0016. The cockpit sizes to its content and the page scrolls; no panel scrolls inside itself

- **Status:** Accepted; the "1920×1080 holds the whole cockpit" target amended 2026-08-26
- **Date:** 2026-08-25

## Context

ADR 0015 made the desktop cockpit "a single screen with no scroll at 1280 px
and wider". Phase 06 delivered that literally: the grid is capped to the
viewport (`height: calc(100dvh − 56px)`) and each of the four panels scrolls
inside itself. Audit ux-03 measured the cost — panels hide 54–81 % of their
content behind an internal scroll with no affordance (M-01), the Rig panel
shows 19 % of itself, control names are ellipsised (M-04) — and the owner's
verdict on the live build was "cramped … each component has a scroll bar and
it doesn't scroll all the way down properly, information is hidden and
controls are clunky to get to". The screen the owner uses is a full desktop
monitor or a 14" laptop; the latter reports ~1536×864 CSS px, on which five
bands plus a hero worth looking at cannot fit without hiding something.

The one-screen rule was a proxy for a real goal — the control and its
consequence within one saccade (research 01 §3, principle 4). Internal
scrollers defeat that goal more than a page scroll does, because a hidden
control is further away than a control one wheel-notch down.

## Options considered

**A. Keep one screen; collapse secondary content behind disclosures.**
- Pros: the promise survives; nothing scrolls.
- Cons: the disclosures are the hidden content by another name; every tier
  needs a different collapse set; the laptop still cannot hold the primary
  controls at legible size.

**B. Size the cockpit to its content; the page scrolls; nothing scrolls inside a panel.** (chosen)
- Pros: every control and gauge is always on the page at full size; one
  scroll model; a 1080-tall monitor fits it all and a 14" laptop scrolls
  one notch; components can grow with the window instead of the grid
  shrinking them.
- Cons: "one screen" is no longer literally true; the instrument bar can
  leave the viewport while trimming the Rig row.

**C. Pin the hero and instrument bar; panels flow beneath.**
- Pros: numbers never leave the viewport.
- Cons: the pinned band takes ~40 % of a laptop's height for the whole
  session; the panels get less than they have today.

## Decision

**We will size the cockpit grid to its content, let the page scroll, and
forbid internal scrolling on panels, because a hidden control is the worst
place for a control to be.** Concretely, from 1280 px: the grid's height is
`auto`, its rows are `auto`, the panel bodies are `overflow: visible`, the
grid fills the window width past the nav rail up to a 2200 px cap, and the
first-class design targets are 1920×1080 and 1536×864 — the layout is tuned
so 1920×1080 holds the whole cockpit with the hero at ≥ 480 px tall and
1536×864 holds the instrument bar, the hero and the two sail panels' primary
controls in the first viewport. With the room, components grow: full control
names, longer slider tracks, larger gauges and section stacks, a bigger hero.
The phone and tablet layouts are unchanged.

This supersedes the "single screen with no scroll at 1280 px" clause of
ADR 0015 only; its panels, cell contract and tiers stand.

## Consequences

Easier: nothing is hidden; the Playwright layout test can assert the strong
property ("every control's box is inside the page and not clipped by an
ancestor") instead of the proxy ("no page scroll"). Harder: the instrument
bar is not always in view — the coach line's `role="status"` announces the
change, and a compact sticky readout is an option if the owner misses it.
Committed to: 1920×1080 and 1536×864 as the sizes that get screenshots and
tests. Cost to unwind: CSS in one file and two tests, under a day; the ADR
exists because it reverses a clause of an accepted ADR and the audit's
findings cite it.

**Revisit when:** the owner reports the instrument bar out of view as a
problem while trimming (add the sticky readout), or a viewport survey shows
most sessions under 864 px tall.

### Consequences — 2026-08-26 note (audit docs-consistency-01)

Measured after phase 01 and the live walk: the document is 1522–1539 px
tall at 1920×1080 — ~290 px of full-width chrome (title rail, instrument
band, actions strip, gaps) above a 1112 px hero flanked by two-column panels.
Closing the last ~450 px means moving content, not CSS. The promise is
restated as: **one short scroll at 1920×1080, hero ≥ 480 px, Apply optimum
above the fold, nothing clipped**, pinned by `tests/ui/race.spec.ts` at
≤ 1600 px (H-06). The 1536×864 promise holds as written.

## Related

ADR 0015 (one-screen clause superseded); audit ux-03 M-01, M-04;
plan `docs/plans/2026-08-25-desktop-kite/`.
