# Phase 03 — 3D telltales from aero state

**Goal.** The 3D hero's telltales show the same three states as the plan
view — streaming, lifting (windward ribbon lifts), stalled (leeward ribbon
droops and flops) — computed from the same functions, per ribbon, and
oriented to the local apparent flow rather than to `uTime` alone. Today
`SailView3D.svelte` animates six ribbons with a sine wave off `uTime` and
one `aLimp` attribute for the kite luff; no ribbon knows the angle of attack.

## Design

- Extract the plan view's per-ribbon state computation into
  `src/ui/race/telltales.ts`: `jibLuffStates(aero, jibDeg, twist)` (¼ ½ ¾
  head), `mainLeechStates(aero, boomDeg, twist)` (¾, ½), `kiteLuffStates(...)`
  (curling / flying / collapsed from the existing `kg.curl`). `PlanView.svelte`
  calls it; its behaviour and tests do not change (that is the contract:
  same inputs, same `Ribbon` per position).
- `SailView3D.svelte`: `buildTelltales` writes one attribute per ribbon
  `aState` (0 streaming, 1 lifting, 2 stalled) and `aSide` (windward /
  leeward of the cloth), replacing `aLimp`; the vertex shader:
  streaming = ribbon lies along the local chord with a small travelling
  wave; lifting = root-anchored, tip rises `~35°` off the chord with a slow
  wave; stalled = ribbon falls to `~60°` below the chord and flops with a
  larger, slower wave. Windward and leeward ribbons at the same station get
  their own state (plan view draws both). Colours stay the existing red;
  state is motion and angle, as on a real sail.
- Flow direction: ribbons stream along the local surface flow, i.e. the
  chord rotated by the local AoA sign, not the boat's centreline.
- `settings.motion` off: ribbons hold the state's rest pose (no wave) —
  a stalled ribbon still hangs.
- Bundle: reuse the one draw call; attributes only. Stay inside the gate.

## Tasks

- [ ] `race/telltales.ts` + `telltales.test.ts`: same `Ribbon` results as
  the plan view for a table of (awa, sheeting, twist) cases, including one
  where windward lifts and leeward streams.
- [ ] `PlanView.svelte` uses it; its tests stay green unchanged.
- [ ] `SailView3D.svelte`: `aState`/`aSide` attributes, shader poses, freeze
  behaviour; `buildTelltales` unit-tested for the attribute values on a
  known trim (it is pure enough to test or make it so).
- [ ] `loft.ts` `ribbonAnchor`: return the local chord direction as well as
  the root, so the shader's rest pose is in the sail's frame.
- [ ] Visual artefacts at 1440: `telltales-streaming.png` (trimmed right),
  `telltales-stalled.png` (over-sheeted), `telltales-lifting.png` (eased),
  plus the plan view of each for comparison.
- [ ] Playwright: `__sail` DEV handle exposes the per-ribbon state array; a
  spec asserts over-sheeting turns the mid-leech ribbon stalled in both
  views.

## Verification

```sh
make check
pnpm test -- src/ui/race/telltales src/ui/three
pnpm test:ui
node scripts/bundle_check.mjs
```

## Artifacts

`race/telltales.ts` + test, updated `SailView3D.svelte`, `loft.ts`,
screenshots.

## Progress log

