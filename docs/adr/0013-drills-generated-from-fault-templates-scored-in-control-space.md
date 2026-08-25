# 0013. Drills generated from fault templates, scored in control space

- **Status:** Accepted
- **Date:** 2026-08-25

## Context

Audit [`ux-02`](../audits/2026-08-25-ux-02/00-executive-summary.md) found
the ten hand-written drills structurally broken, not merely rough: the
answer key is a `baseRace()` constant for ten of eleven controls (H-01),
two drills are Gold before the learner touches anything and eight award a
medal for zero input (H-02), four drills teach controls the solver cannot
feel (H-03), and the model's own optimum contradicts the tuning guide a
drill is teaching (H-04). The medal measures VMG loss alone, and the
model's VMG surface is flat across most of control space (≈1 % over the
traveller's full range at 8 kt), so a loss-only score has no dynamic range.

Ten fixed drills also exhaust in one sitting, carry no attempt history,
and give the learner no reason to return. The owner's brief is drills that
are "best practice" and "more engaging".

## Options considered

**A. Patch the ten drills**: re-author starts so they cost ≥ 3 % VMG, swap
the answer key to `optimalTrim`, keep loss-only medals.
- Pros: a day's work, no schema change.
- Cons: still ten drills, still exhaustible; scoring stays blind wherever
  the model is flat; every future physics change silently re-breaks the
  starts unless tested.

**B. Fault templates + generated drills, scored on control distance and
loss**: a drill is `(condition, fault template, seed)`; the template names
which controls are knocked off and by how much; the start is validated
against the model at generation time (start loss ≥ threshold, else
resample); score = distance to `optimalTrim` in legal steps over the free
controls, plus loss; medals on distance bands; attempt history per
template with spacing.
- Pros: unbounded, always-valid drills; scoring works where the model is
  flat because distance is measured on the answer, not the loss; history +
  spacing become possible; a physics change fails a CI test instead of
  shipping a Gold-on-arrival drill.
- Cons: two to three days; needs an ADR-level commitment to the schema;
  distance-to-optimum inherits `optimalTrim`'s local-optimum caveat.

**C. Time-domain drills with replay** (Epic 2 E2-03).
- Pros: the real thing.
- Cons: needs the quasi-static time loop first; months, not days.

## Decision

**We will adopt B**, because the defect is the drill model, not the drill
copy: any hand-written start is one physics change away from being wrong
again, and a loss-only score cannot grade a model whose objective is flat.
Scope: Epic 1 Drills screen; hand-written drills survive only as named
templates. Hint text is gated behind the first attempt. Controls the shape
layer does not read (halyards, inhauler, kite sheet, tack line) are not
eligible fault controls until the solver feels them.

## Consequences

Easier: adding a drill is adding a template; scoring is honest wherever
the model is flat; spacing and streaks have a schema to hang off.
Harder: the drill answer is "the model's optimum from here", so every
score sheet must carry the tier and the local-optimum caveat. Committed
to: `src/lib/drills.ts` schema v2 with a localStorage migration for
`best` scores. Risk accepted: a learner can be coached toward a model
optimum that a sailmaker would dispute (H-04); the disagreement panel's
"model vs guide" honesty rule applies to drills too.

**Revisit when:** the time-domain loop (E2-02) lands, or when the shape
layer starts reading draft position and entry angle.

## Related

Audit ux-02 `01-drills.md`; plan
[`2026-08-25-drills-and-loop`](../plans/2026-08-25-drills-and-loop/);
ADR 0006 (aero split + tiers); decision log rows 29–30.
