# Phase 02 — Kite flying shape

**Goal.** The drawn gennaker reads as a J/70 asymmetric flying on a run and a
reach: rounded, full shoulders below the head; maximum depth around 40 % up
and 45–50 % aft in mid sections; a luff with positive round that curls to
windward when eased and bows to leeward when over-trimmed (already in
`kite.ts`, keep); a leech that opens (twists) with sheet ease; a foot with
skirt (positive round) rather than a straight line to the sprit. Today's
render is a near-flat orange sheet with a straight leech — the review
screenshot of 0.5.0 shows it.

## Sources (cite, do not restate)

`docs/research/2026-08-25-spinnaker/02-flying-shape.md` (measured flying
shapes, camber and twist distributions), `04-model-implications.md`,
ADR 0017. The J/70 asym dimensions are in `data/` via `boat.sails.asym`
(luff, leech, foot, area).

## Tasks

- [ ] Read `kite.ts` end to end and `kite.test.ts`; list which of its
  section constants are `assumed` and what the research gives instead.
- [ ] Sections: camber ratio per height from research doc 02 (typically
  ~20–25 % at mid-height for a runner, less at head and foot), max-draft
  position ~45–50 %, entry angle from the luff curl state; shoulders: chord
  grows fast just below the head then the girth peaks around 60–70 % up.
  Every constant carries a `prov:` tag and an `ASSUMPTIONS.md` row.
- [ ] Foot: positive round (skirt), amount from research or `assumed`
  with a row.
- [ ] Leech twist with sheet ease: head-to-clew twist increases as the
  sheet eases; tack-line ease raises the tack and rotates the luff to
  windward (keep existing mapping, check magnitudes).
- [ ] `kite.test.ts`: assert girth peaks above mid-height, mid-section camber
  in the research band, foot round positive, area within ±10 % of the
  published area (integrate the loft), luff-curl sign unchanged.
- [ ] Snapshot update (`loft.test.ts.snap` if the kite goes through it).
- [ ] Visual review artefacts: `kite-run-leeward.png`, `kite-run-astern.png`,
  `kite-reach-topdown.png`, `kite-plan.png` at 1440 in the scratchpad, plus
  the same four from `main` before the change, side by side.
- [ ] Plan view kite outline follows if it reads `kite.ts` (it should).
- [ ] Research doc 02 gets a short dated addendum: what the drawing now
  takes from it, section by section.

## Verification

```sh
make check
pnpm test -- src/ui/three
pnpm test:ui
node scripts/bundle_check.mjs
```

## Artifacts

Updated `kite.ts`, tests, `ASSUMPTIONS.md` rows, research addendum,
before/after screenshots.

## Progress log

