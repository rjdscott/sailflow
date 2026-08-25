# 0014. A three.js 3D sail and rig view, lazily loaded behind a performance gate with the 2D view as fallback

- **Status:** Accepted
- **Date:** 2026-08-25

## Context

The owner wants Race mode to feel like a cockpit, and named the North Sails
3D visualisers as the bar. ADR 0011 chose SVG only for Epic 1 and deferred
WebGL to Epic 2 behind a performance gate, on the grounds that a 3D view is
heavy and mostly decorative for trim decisions. Two things changed. The 2D
views have shipped and are tested, so 3D is now additive rather than a
substitute; and the research
([03-webgl-sail-rendering](../research/2026-08-25-cockpit/03-webgl-sail-rendering.md))
found that the solver already emits exactly the sectional parameters
(draft, draft position, twist, entry at ¼ ½ ¾, mast bend, sag, rake) that
sail-design software lofts a surface from, so a 3D view carries real
information — twist read down the leech, camber read from the leeward
quarter, entry read up the luff — that no single 2D projection shows at
once.

Constraints: GitHub Pages, no backend; a 380 px phone must still work;
`src/core` stays pure and deterministic; the first-load bundle of the app
must not grow; every visual must be testable without a GPU in CI.

## Options considered

**A. Keep ADR 0011: 2D only until Epic 2.**
- Pros: no new dependency, no GPU risk, nothing to measure.
- Cons: the cockpit hero stays a plan view; twist, camber and entry never
  appear together; the owner's stated bar is not met.

**B. three.js directly (`three` + `OrbitControls` addon), lazily imported.**
  (chosen)
- Pros: one dependency, 14 M weekly downloads, 182 KB gzip full barrel and
  ~150 KB tree-shaken (unverified until measured); procedural geometry only,
  so no assets or licences; the loft is a pure function testable in vitest
  with no WebGL; touch orbit built in.
- Cons: three tree-shakes poorly, so the chunk is not small; a custom
  backlit shader couples to three's internals; software-rendered CI
  screenshots can drift across Chromium versions.

**C. Threlte (Svelte wrapper over three).**
- Pros: declarative scene graph, Svelte 5 native.
- Cons: a 3.3k-star wrapper as a peer dependency for a scene of about twelve
  objects rebuilt from one solver snapshot; adds coupling to two release
  cadences for ~80 lines of imperative glue.

**D. Babylon.js or a glTF viewer.**
- Pros: batteries included.
- Cons: Babylon starts at 1.7 MB gzip; glTF viewers need a model we neither
  have nor can license (J/70 is a trademarked one-design, and public models
  are non-commercial).

## Decision

**We will add a 3D sail and rig view rendered with `three` and its
`OrbitControls` addon, loaded as a separate chunk only when the Race screen
mounts it, built entirely from procedural geometry lofted in a pure,
`three`-free module, and shown only when WebGL is available and the first
frame renders inside 50 ms; otherwise the existing 2D plan view stays.**
This supersedes ADR 0011 for the Race hero only; sections, rig elevation and
plan view remain SVG.

## Consequences

Easier: twist, camber and entry become visible together; the cockpit has a
hero worth the name; camera presets teach the sighting views sailors use.
Harder: a second geometry pipeline must agree with the 2D one on sign
conventions (one `conventions.ts`, asserted in tests); CI gains a Playwright
job on a pinned image; head and foot shapes must be extrapolated from the
¼ ½ ¾ sections and that extrapolation is an assumption. Committed to:
first-load bundle unchanged (asserted in CI), render on demand rather than a
continuous loop, `prefers-reduced-motion` freezes telltales and jump-cuts
camera presets, procedural hull labelled illustrative. Risk accepted: the
measured chunk may exceed 150 KB gzip; the number lands in phase 04's
progress log and here in Related. Unwinding costs about a day: delete
`src/ui/three`, drop the dependency, the 2D fallback is already the
default path.

**Revisit when:** the measured chunk exceeds 250 KB gzip, or the first-frame
gate fails on the owner's phone, or Epic 2 time-domain work needs a
continuous render loop.

## Related

- Supersedes [ADR 0011](0011-two-d-svg-and-canvas-only-for-epic-1.md).
- Research: [03-webgl-sail-rendering](../research/2026-08-25-cockpit/03-webgl-sail-rendering.md).
- Plan: [2026-08-25-cockpit](../plans/2026-08-25-cockpit/) phase 04.
- Decision log rows 40.
