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

- [x] `race/telltales.ts` + `telltales.test.ts`: same `Ribbon` results as
  the plan view for a table of (awa, sheeting, twist) cases, including one
  where windward lifts and leeward streams.
- [x] `PlanView.svelte` uses it; its tests stay green unchanged.
- [x] `SailView3D.svelte`: `aState`/`aSide` attributes, shader poses, freeze
  behaviour; `buildTelltales` unit-tested for the attribute values on a
  known trim (it is pure enough to test or make it so).
- [x] `loft.ts` `ribbonAnchor`: return the local chord direction as well as
  the root, so the shader's rest pose is in the sail's frame.
- [x] Visual artefacts at 1440: `telltales-streaming.png` (trimmed right),
  `telltales-stalled.png` (over-sheeted), `telltales-lifting.png` (eased),
  plus the plan view of each for comparison.
- [x] Playwright: `__sail` DEV handle exposes the per-ribbon state array; a
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

### 2026-08-28 — built, all gates green

**What shipped.** `src/ui/race/telltales.ts` is the one place either picture
asks what a ribbon is doing: `jibLuffState`/`jibLuffStates` (¼ ½ ¾ head,
`localAoa` against a 12° entry) and `leechStates` (¾, ½). The physics stays in
`boat.ts`; this only fixes the stations and the entry angle, which is the part
the two views have to share. `PlanView.svelte` calls it and draws exactly what
it drew before; `SailView3D.svelte` calls it per ribbon at the loft's own row
heights and writes `aState` (0 streaming, 1 lifting, 2 stalled, 3 kite curl)
and `aSide` (+1 windward, −1 leeward, 0 single) in place of `aLimp`.

The shader turns that into the pose, not a colour: the ribbon streams along
`aDir` — the local chord at that row, twist included, so it follows the flow
over its own station rather than the centreline — and rotates in its own
vertical plane, +35° for a windward ribbon whose station is lifting, −60° for
a leeward ribbon whose station is stalled, with a bigger and slower wave under
a stall and a quicker flick under a lift. A jib luff station now hangs the
pair a real luff carries; leech ribbons stay single and answer to both states.
`settings.motion` off pins `uTime` at 0, which was already the freeze path, so
a stalled ribbon still hangs — the pose is time-independent by construction.

**Three decisions worth the ink.**

1. *`aLimp` became a fourth state code rather than disappearing.* A curling
   kite luff is a geometric threshold (ADR 0017), not an angle of attack, and
   its fold direction is the claim. Folding it into "stalled" would have added
   60° of droop to a vector that already points where the research says it
   points, so `aState = 3` keeps the old flutter and the old direction and
   claims nothing new.
2. *The telltale material lost `depthTest`.* A windward luff ribbon sits
   behind cloth at 0.94 opacity, so the pinching cue — the whole point of a
   windward telltale — was invisible in the default leeward view. Sailors read
   windward telltales through the sail; the picture now does too, and the
   windward ribbon is drawn at 0.55 alpha to say that is what is happening.
3. *`ribbonAnchor`'s `lift` is now signed to leeward.* It already returned the
   local chord, so half of the plan's fourth task was already there; what it
   did not have was a stable sense for the offset — the chord's
   horizontal normal flips with the tack, so the single ribbon was windward on
   starboard and leeward on port. Signed against the grid normal (which
   `buildSail` already points to leeward), a positive lift is the leeward face
   on either tack, which is what makes a *pair* meaningful. `loft.test.ts` now
   asserts it on both tacks.

**Agreement.** `telltales.test.ts` holds the plan view's pre-refactor answers
as a table (generated by running the old inline expressions, then refactoring
to them), including one trim that carries all three states up one luff. The
Playwright spec over-sheets the jib and asserts the ¾ station reads stalled in
both pictures — the 3D hero through `__sail.telltaleStates`, the plan view
through the CSS class on `[data-sail="jibLuff"][data-at="0.75"]` — then eases
to 20 % and asserts both leave the stalled band, so the agreement is not
vacuous.

**Two deviations from the task list.** The Playwright assertion is on the jib
luff's ¾ station rather than the mid-leech: over-sheeting is what the owner's
report is about, the luff pair is where the windward/leeward split lives, and
it is the station both pictures draw. `buildTelltales` is a closure inside the
component and stayed one: the logic that can break (which state, at which
station) is unit-tested in `telltales.test.ts`, and the packing is asserted
end to end through the DEV handle rather than by exporting a function so a
test can watch it fill six arrays.

**Gates.**

- `make check`: `Test Files 80 passed (80) / Tests 1322 passed (1322)`
- `pnpm test -- src/ui/race src/ui/three`: `Test Files 18 passed (18) / Tests 341 passed (341)`
- `pnpm test:ui`: `100 passed (16.8s)` — the two committed 3D baselines still
  match inside their tolerance with twice as many ribbons on screen.
- `node scripts/bundle_check.mjs`: first load 112 680 B gzip against a 113 178 B
  limit, **+142 B** for this phase (112 538 B before it), 498 B of headroom left.

**Screenshots**, 1440 wide, leeward-quarter preset, motion off, each with its
plan-view twin: `telltales-streaming.png` (Apply optimum — jib luff streams at
¼ and ½, the head already lifting, which is the twist doing what twist does),
`telltales-stalled.png` (jib sheet 100 %, every luff station stalled and the
leeward ribbons hooked down), `telltales-lifting.png` (jib sheet 20 %, every
luff station lifting). The plan view's colours agree with the hero's poses in
all three.
