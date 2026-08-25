# Phase 05 — Kite flying shape from the research

## Goal

The drawn gennaker matches what is measured (research `2026-08-25-spinnaker`,
doc 02 and doc 04): the luff rotates to windward across the centreline at
deep angles instead of bowing to leeward everywhere; the clew is fixed by the
published leech and foot lengths and lifts as the sheet eases; the section
camber, draft position and twist by height come from measured flying shapes
rather than the invented constants; the curl cue is the measured one
(starts at ¾ height, folds to windward). Constants move from `prov: assumed`
to `prov: published` / `derived` wherever the research supplies a source.

## Tasks

- [ ] `src/ui/three/kite.ts`: luff-bow direction as a function of apparent wind angle (leeward at reaching angles, rotating to windward past the measured crossover — doc 02 table), magnitude kept (within 3 % of the arc).
- [ ] Clew from the leech/foot circle (leech 8800, foot 5700 published) with the sheet ease lifting it (doc 02: ~1.3–1.4 m over the range); the head→clew leech stays the straight line phase 02's fix introduced; leech cloth length within 2 % of published.
- [ ] `src/core/shape/flying.ts` `asymShape`: camber/draft position/twist by height re-based on the measured values (doc 02 §camber, doc 04 (a)); this is `src/core` — tier stays C, `pnpm validate` must be unchanged (the flying shape does not feed the aero tables; assert that in the progress log with the before/after report diff).
- [ ] Curl cue: onset stays the tier-C sheet threshold; the animation starts at ¾ height and folds to windward per doc 02.
- [ ] `ASSUMPTIONS.md` rows updated: every constant that gained a source is re-tagged; the ones still assumed say so.
- [ ] Tests updated/added in `kite.test.ts` (luff side flips with AWA; clew on the circle; clew rises with ease; leech length) and `flying.test.ts` if it exists.
- [ ] Baselines regenerated; progress log.

## Verification

`make check`; `pnpm test:ui`; `pnpm validate` unchanged.

## Artifacts

`src/ui/three/kite.ts`, `src/core/shape/flying.ts`, `ASSUMPTIONS.md`, tests, baselines.

## Progress log

