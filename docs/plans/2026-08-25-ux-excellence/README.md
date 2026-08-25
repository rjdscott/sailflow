# UX excellence: make Race and Dock the best trim trainer in a browser

- **Status:** 🟡 In progress

Remediation of audit [`ux-01`](../../audits/2026-08-25-ux-01/) plus the
three owner-requested features from 2026-08-25: point-of-sail chips, an
optimise-to-target affordance (ghost ticks + Apply), and cheap 2D motion
(telltale flutter, heel tilt, eased tweens). 3D sail visuals in the North
Sails style are explicitly Epic 2 (`E2-05` in the MVP plan) and out of scope
here.

## Scope

Race and Dock screens, shared primitives, `src/ui` only. Physics changes
only where a UI feature needs a new worker request (optimise at fixed TWA
already exists as `optimal` with `optimiseTwa: false`).

## Non-goals

- 3D / three.js sail rendering (Epic 2).
- Solver accuracy work (hold-out FAIL rows, downwind heel): separate plan.
- Log, Drills, More screens beyond what the shared-primitive fixes touch.

## Phases

| NN | Phase | Status | Last update |
|----|-------|--------|-------------|
| 00 | [P0 defects](phase-00-p0-defects.md) | 🟢 Completed | 2026-08-25 |
| 01 | [Conditions and point of sail](phase-01-conditions-and-point-of-sail.md) | 🟢 Completed | 2026-08-25 |
| 02 | [Optimise to target](phase-02-optimise-to-target.md) | 🟡 In progress | 2026-08-25 |
| 03 | [Phone flow and loading states](phase-03-phone-flow.md) | 🟡 In progress | 2026-08-25 |
| 04 | [Motion](phase-04-motion.md) | 🟢 Completed | 2026-08-25 |
| 05 | [Accessibility and design system](phase-05-a11y-and-design-system.md) | 🟢 Completed | 2026-08-25 |
| 06 | [Content and comparison](phase-06-content-and-comparison.md) | 🔵 Not started | none |

## Critical files

- `src/ui/screens/{Race,Dock}.svelte`, `src/ui/race/**`, `src/ui/dock/**`
- `src/ui/components/{Slider,ConfidenceBadge,Sheet}.svelte`, `src/app.css`, `src/ui/tokens.css`
- `src/ui/stores/{conditions,rigLock,settings}.svelte.ts`
- `src/worker/protocol.ts` (only if phase 02 needs a new request shape)
- `docs/audits/2026-08-25-ux-01/todo.md` (tick as findings close; PR titles cite codes)

## Top risks

1. Optimise-to-target maps the solver's `flat`/`reef` optimum back onto 11
   sliders through the invented shape layer: result is tier B at best and
   must be badged as such, never presented as "the" answer.
2. Dock initial scoring takes >10 s on the desktop dev build (108-candidate
   grid × 9 winds × 2 VPP solves). Phone will be worse. Phase 03 measures and
   either precomputes or shrinks the grid; cannot hide it behind "Scoring…".
3. Motion on a phone during slider drags: must be `transform`/`opacity` only
   and honour `prefers-reduced-motion`, or it becomes the jank the audit
   already flagged (M-15).

## Implements

- Audit [ux-01](../../audits/2026-08-25-ux-01/00-executive-summary.md), punchlist in its `todo.md`.
- Owner decisions 2026-08-25, recorded in
  [decision log rows 23–27](../../research/2026-08-25-sailing-sim-landscape/04-decision-log.md).
- ADR 0011 (2D only for Epic 1) stays in force.
