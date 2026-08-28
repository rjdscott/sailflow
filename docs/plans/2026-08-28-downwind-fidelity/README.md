# Downwind fidelity: VMG reads like an instrument, the kite looks like a J/70 kite, and the 3D telltales tell the truth

- **Status:** 🟡 In progress

Owner's report after 0.5.0 (2026-08-28): "going downwind the VMG is negative
numbers; the spinnaker doesn't look the right shape; telltales aren't
behaving relative to the wind, like the plan visuals display." Three
independent fixes, three phases, built in parallel by Opus agents and
reviewed on Fable.

## Scope

- Every VMG surface shows magnitude + direction; the sign stays in the solver
  and the share link (extends audit ux-04 H-04, which fixed only the face).
- The gennaker's drawn geometry rebuilt against the research in
  `docs/research/2026-08-25-spinnaker/` so it reads as a J/70 asymmetric
  flying: rounded shoulders, deep mid-height sections, curved luff with
  positive round, a skirted foot, leech that opens with ease. Still tier C,
  still ADR 0017's UI-side mapping.
- 3D telltales driven by the same aerodynamic state the plan view computes
  (`race/boat.ts` `localAoa`, `luffRibbon`, `leechRibbon`): streaming,
  lifting, stalled, per ribbon, oriented to the apparent wind.

## Non-goals

- No solver change (`src/core` untouched). No new tier-A/B claims about kite
  shape; the geometry is a drawing and says so.

## Status

| NN | Phase | Status | Last update |
|----|-------|--------|-------------|
| 01 | [VMG magnitude everywhere](phase-01-vmg-sign.md) | 🟢 Done | 2026-08-28 |
| 02 | [Kite flying shape](phase-02-kite-shape.md) | 🔵 Not started | none |
| 03 | [3D telltales from aero state](phase-03-telltales-3d.md) | 🔵 Not started | none |

## File ownership (parallel build)

| Phase | Owns | Must not touch |
|---|---|---|
| 01 | `src/ui/format.ts`, `race/InstrumentBar.svelte`, `race/verdict.ts`, `drills/DrillView.svelte`, `drills/ScoreSheet.svelte`, `race/store.svelte.ts` (display only), `screens/Race.svelte` VMG lines, `log/**` VMG columns | `src/ui/three/**`, `race/PlanView.svelte` |
| 02 | `src/ui/three/kite.ts` + test + snapshot, `three/loft.ts` only if a new section primitive is needed, `race/PlanView.svelte` kite outline only, `ASSUMPTIONS.md` kite rows, research doc 02 addendum | `three/SailView3D.svelte` telltale code, anything phase 01 owns |
| 03 | `src/ui/three/SailView3D.svelte` telltale block, `three/loft.ts` `ribbonAnchor`, new `race/telltales.ts` shared with `PlanView.svelte` (extract, do not change plan-view behaviour) | `three/kite.ts`, anything phase 01 owns |

## Critical files

`src/ui/format.ts` (`vmgDisplay`, `targetOf`), `src/ui/three/kite.ts`
(508 lines, ADR 0017), `src/ui/three/SailView3D.svelte` telltale shader
(~184–210, `buildTelltales` ~535–630), `src/ui/race/boat.ts` ribbon state
functions, `src/ui/race/PlanView.svelte` 195–235.

## Top risks

1. Kite shape is a judgement call with no measurement; the review is visual
   against photos of J/70s under kite (research doc 02 has the references).
2. Telltale state in 3D must agree with the plan view for the same inputs, or
   the two pictures contradict each other on the same screen.
3. Bundle gate has 749 B of headroom (phase 05 of the simulator plan); a new
   shader attribute or geometry pass must stay inside it.

## Related

ADR 0017, ADR 0021, audit ux-04 H-04, research 2026-08-25-spinnaker.
