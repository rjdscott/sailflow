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

### Consequences — 2026-08-25 amendment: the gate's budget is 350 ms, measured from mount

The Decision above is unchanged and stands. What follows corrects a number in
it, and what that number measures, after audit ux-03 found the control inert
(H-12, `docs/audits/2026-08-25-ux-03/04-performance-3d.md`, landing on a
separate branch).

The 50 ms in the Decision was three frames at 60 Hz, but the implementation
applied it to the **second** render — a warm context, where `renderer.render`
is GPU command submission and costs ~1 ms on any device. It therefore passed at
every CPU throttle rate up to 20×, the 2D fallback was unreachable, and the
revisit trigger above could never fire.

The gate now measures wall-clock from `onMount` to the first presented frame,
which is the quantity the ADR meant: geometry build, context creation, shader
compilation and upload. Re-measured in `mcr.microsoft.com/playwright:v1.62.1-noble`
at 1440×900 and 390×844 — 61–65 ms unthrottled, 137 ms in a 2-core container
(the CI worst case), 115–119 ms at 4× CPU, 272–279 ms at 10×, 605–609 ms at
20×. **The budget is 350 ms** (`src/ui/three/SailHero.svelte`): it sits in the
gap between the 10× class, which still renders acceptably, and the 20× stand-in
for a low-end Android that the fallback exists for, with ~2.6× headroom over
the slowest fast-path measurement so no desktop and no CI runner trips it. Full
table in
[plan phase 06](../plans/2026-08-25-cockpit/phase-06-phone-restyle-audit.md).

Amended rather than superseded, deliberately: the choice this ADR records — 3D
behind a lazy chunk and a first-frame gate, 2D otherwise — is unchanged and
still correct. Only the threshold and the quantity it is applied to moved,
which is a calibration against measurement, not a fork. A new ADR would say the
same thing as this one with one number different.

Also closed in the same change: the Consequences' `prefers-reduced-motion`
commitment was never wired to the media query, so it only held for the
non-default `motion = 'off'` setting
(H-09, `docs/audits/2026-08-25-ux-03/02-accessibility.md`). Both halves —
frozen telltales and jump-cut presets — are now driven by
`prefersReducedMotion` on the `'system'` default, with a Playwright case that
runs with the setting unset.

## Related

- Supersedes [ADR 0011](0011-two-d-svg-and-canvas-only-for-epic-1.md).
- Research: [03-webgl-sail-rendering](../research/2026-08-25-cockpit/03-webgl-sail-rendering.md).
- Plan: [2026-08-25-cockpit](../plans/2026-08-25-cockpit/) phase 04.
- Decision log rows 40.
- Measured 2026-08-25: three chunk 139.4 KB gzip, entry chunk unchanged at 101.5 KB gzip (baseline 100.2 KB, +1.3 KB of hero glue; `scripts/bundle_check.mjs`).
