# Phase 02 — Kite geometry: loft, plan view, section stack

## Goal

Under `sailset === 'asym'` the gennaker is drawn: a lofted asymmetric in the
3D hero, an outline in the plan view, and a section stack, all from one pure
mapping of the four `DownControls` to geometry (ADR 0017). `src/core` is not
touched.

## Tasks

- [ ] `src/ui/three/kite.ts` (pure, no three.js imports): `kiteGeometry(down: DownControls, shape: SailShape, rig: Rig3D, side): { tack, head, clew, spine, chords, curl: boolean }` using `boat.sails.asym` (luff 10800, leech 8800, foot 5700, half 5560 mm) and `boat.rig.bowspritOuterMm`. Tack from `sprit` and `tackLine`; head at the masthead with luff length from `kiteHalyard`; clew from `kiteSheet` (eased = forward + outboard, luff sags to leeward); `curl` when the sheet is eased past the `prov: assumed` threshold. Every constant `prov:` tagged and a row in `ASSUMPTIONS.md`.
- [ ] `SailChords` for the kite (`KITE_CHORDS`) fitted so the ¼ ½ ¾ girths match the sail definition; head/foot extrapolation explicit.
- [ ] `SailView3D.svelte`: build the kite with `buildSail` on the kite spine when `sailset === 'asym'` (new `kiteUp` + `down` props from `SailHero`); jib hidden; kite material (translucent, its own colour token); luff-curl cue as a fluttering ribbon column at the luff; edges and stripes as for the other sails; `__sail.kiteSail` in DEV.
- [ ] `PlanView.svelte`: kite outline from the same tack/clew/head (projected) via `planToWorld`'s inverse; jib hidden.
- [ ] `SailSectionStack.svelte`: accept `sail: 'asym'` with `shape.asym`; name "Kite".
- [ ] Tests: `kite.test.ts` — tack on the sprit tip at `sprit = 100`, clew to leeward, easing the sheet moves the clew forward and outboard monotonically, luff length equals the definition at `kiteHalyard = 100`, `curl` false at trimmed / true at eased, no NaN; loft invariants (existing `loft.test.ts` helpers) on the kite mesh; Playwright: `#/race?...set=asym` renders a canvas with `__sail.kiteSail` non-null and the jib null, plus a second screenshot baseline from the leeward preset under the kite.
- [ ] Progress log.

## Verification

`make check`; `pnpm test:ui`; `pnpm validate` unchanged (no core change); `node scripts/bundle_check.mjs`.

## Artifacts

`src/ui/three/kite.ts`, `src/ui/three/kite.test.ts`, `src/ui/three/SailView3D.svelte`,
`src/ui/race/PlanView.svelte`, `src/ui/race/SailSectionStack.svelte`, `ASSUMPTIONS.md`,
`tests/ui/race-3d.spec.ts` + snapshot.

## Progress log

