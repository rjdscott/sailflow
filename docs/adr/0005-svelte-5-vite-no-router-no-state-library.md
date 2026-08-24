# 0005. Svelte 5 + Vite for the UI, with hash routing and no router or state library

- **Status:** Accepted
- **Date:** 2026-08-25

## Context

Sailflow is a mobile-first PWA served from GitHub Pages. The heavy lifting is
a DOM-free physics core behind a Web Worker; the UI is a slider-dense
instrument panel plus SVG/Canvas views. Primary device is a phone on a dock
with no signal, so bundle size and cold-load time matter more than ecosystem
breadth. The brief allows "no heavyweight framework unless justified in the
README". A second boat class is expected within a year, but the UI shape is
the same for any keelboat.

## Options considered

**A. Vanilla TS + Vite**: no framework.
- Pros: zero runtime, no build-tool coupling.
- Cons: hand-rolled reactivity for ~20 sliders feeding several panels; more
  boilerplate than the framework it avoids.

**B. Svelte 5 + Vite**: compiled components, runes for state, ~5 KB runtime.
- Pros: smallest runtime of the mainstream options; reactive stores fit the
  slider-to-panel data flow; SVG is plain markup; Vite is the reference
  toolchain.
- Cons: smaller hiring pool than React; Svelte 5 runes are new.

**C. React + Vite**: the default choice.
- Pros: ecosystem, familiarity.
- Cons: 40–100 KB runtime for a UI that gains nothing from it; JSX for SVG is
  noisier than Svelte markup.

**D. SolidJS**: tiny and fast.
- Pros: comparable size to Svelte.
- Cons: smaller ecosystem than either; no advantage over B for this app.

Routing: hash routing (`#/race`) in ~20 lines versus a router dependency.
State: Svelte runes stores versus an external state library.

## Decision

**We will build the UI in Svelte 5 with Vite, use hash-based routing written in
the app, and use runes stores rather than a state library, because the UI is a
thin panel over a worker and the runtime budget on a phone is the binding
constraint.** Applies to the whole `src/ui` layer for Epic 1 and 2.

## Consequences

Easier: sub-10 KB shell, SVG views as plain markup, one toolchain (Vite) for
app, worker, and tests. Harder: contributors must learn runes; no router means
route guards and deep links are hand-written. Committed to: Vite as the build
tool for the worker bundle too. Risk accepted: Svelte 5 API churn. Unwinding
means rewriting every screen, roughly a week at MVP size.

**Revisit when:** a screen needs a routing feature that takes more than a day
to hand-write, or the UI grows past ~30 components and store coupling becomes
the main source of bugs.

## Related

- Research: [2026-08-25 landscape, §Web tech](../research/2026-08-25-sailing-sim-landscape/02-market-and-physics.md)
- Decision log row 12: [04-decision-log](../research/2026-08-25-sailing-sim-landscape/04-decision-log.md)
- Plan: [2026-08-25-mvp-analyser](../plans/2026-08-25-mvp-analyser/README.md)
