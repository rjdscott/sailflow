# 0025. The keel's effective draft falls off faster than cos(heel), at the shallow end of the published band, and nothing fits it

- **Status:** Accepted
- **Date:** 2026-09-02

## Context

`hydro/keel.ts` is the single choke point for side force and induced drag:
both read `effectiveAspectRatio(boat, heel)`, and that function scaled the
keel's span by a plain `cos(heel)`. That is geometric projection of the fin
onto the athwartships plane — the span you would measure with a ruler — and
it is not how a heeled keel behaves.

Two published effective-draft treatments say so and both say it in the same
direction. The DSYHS effective-draft polynomial (Keuning & Sonnenberg 1998)
gives Teff/T as a function of heel and Froude number with hull-form terms in
it; ORC's pre-2013 effective-draft treatment tabulates the same knockdown.
Between them the falloff is nearer cos^1.2 to cos^2.9, steepening with
beam/draft ratio. ADR 0022 listed this as option D and deferred it on purpose
— "a second heel mechanism fitted in the same round makes neither
attributable" — and both ADR 0024 and `validation/report.md` have carried it
since as the named next mechanism, the last published lever left on a heel
angle that is short by a fifth.

Neither closed form can be transcribed. The DSYHS polynomial needs the
canoe-body draft Tc, which is derivable (`draftM - keelSpanM` = 0.207 m on the
J/70), but it also carries the same contested scale factor that kept the
heeled-residuary polynomial out of the model in ADR 0022: transcriptions of
the same coefficient table divide by 100, by 1000, or not at all. ORC's chart
is from an edition ORC itself superseded in 2013. So the published thing here
is the *band*, and no source we can read says where inside it a given hull
sits.

## Options considered

**A. Leave the plain `cos(heel)`.** Keep projection.
- Pros: no change at all; the round stays a one-mechanism round.
- Cons: it is the one value both sources agree is wrong, and the report has
  been promising to test it for two rounds. "We never tried it" is a worse
  answer than "we tried it and here is what it cost".

**B. Transcribe the DSYHS effective-draft polynomial whole.** Teff(heel, Fn)
from the regression, with Tc derived from the boat file.
- Pros: no free parameter; the strongest provenance available if it could be
  read correctly.
- Cons: the same unresolved scale factor ADR 0022 refused on the residuary
  side, plus a regression evaluated outside the series' hull-form range for a
  6.7 m sportboat. A number whose order of magnitude the sources contradict is
  not provenance.

**C. Fit an exponent inside the band.** `span = s · cos(heel)^n`, with
`n = hydro.effDraftHeelExp` fitted in [1.2, 2.9] and unable to leave it.
- Pros: the bounds are the citation; the fit cannot produce a knockdown
  neither source supports, and a value on a bound is a reportable signal.
- Cons: **tried, and it failed on its own terms.** The J/70 fit went to 2.9
  and the Melges 24's to 1.2 — opposite bounds, at Bwl/Tc of 9.26 and 9.16,
  a 1 % difference in exactly the parameter the sources say sets the exponent.
  Whatever the two fits were responding to, it was not hull form. And the
  J/70's 2.9 broke the solver on a state race mode can reach: at 20 kt, TWA
  38°, fixed full-power trim, the boat heels 34° and the effective span falls
  to 0.78 m, and the 3-DOF solve finds no equilibrium at all — `trimmed()`
  returns `converged: false`, and invariant 3 catches it. Anything from about
  n = 2 up does this; the symmetric heel box added in the same round does not
  rescue it (checked).

**D. Take the band's shallow end as an unfitted constant** (chosen).
`n = 1.2`, held, with the law also held constant past 30° of heel.
- Pros: moves the model off the value both sources reject, to the weakest one
  either supports; no knob, so nothing to sit on a bound and nothing extra for
  a future reader to distrust; the solver stays well conditioned; and the
  claim made is exactly the claim the evidence supports — the band is
  published, the position inside it is not.
- Cons: it under-uses a published range, and if the true exponent for this
  hull is nearer 2 the model is leaving a real mechanism half-applied. It also
  makes the change small enough to look pointless — cos^1.2 against cos^1.0 —
  which is honest but unexciting.

## Decision

**We will take option D: the keel's effective span goes as `cos(heel)^1.2`, an
unfitted constant at the shallow end of the published band, because the band
is what the sources agree on and fitting a position inside it produced two
opposite bounds at the same beam/draft and one unsolvable state.**

Concretely:

- `hydro/keel.ts` `effectiveAspectRatio` raises `cos(heel)` to
  `hydro.effDraftHeelExp`, default **1.2**. It is read through `knob()` so a
  boat file can override it, exactly like `hydro.inducedDragK` and
  `hydro.hullLiftFrac`, the module's other unfitted knobs. **No calibration
  stage fits it**, on any class.
- Past **30°** of heel the law is held constant rather than extrapolated. The
  DSYHS heeled tests run at 0, 10, 20 and 30° and 30 is the last station, and
  `hydro/resistance.ts` already refuses out-of-range regressions in its own
  words. No row of either class's polar heels past 30° at a VPP trim, so this
  changes nothing fitted or gated; it is what keeps race mode solvable when
  the sailor leaves the boat at full power in a breeze.
- Both `sideForce` and `inducedDrag` read the same function, unchanged
  otherwise, so `hydro.keelLiftSlope` keeps its meaning exactly.
- Nothing here is fitted to the polar's heel column; ADR 0022 stands.

Scope: the hydro layer, every class. Until a source resolves the DSYHS scale
factor (option B), or a source is found that maps beam/draft to a position
inside the band.

## Consequences

**What gets easier.** The model no longer uses a value both published sources
reject, and it says so in one constant a reader can check rather than in a
fitted number they would have to trust. The change is small by construction:
cos^1.2 against cos^1.0 costs about 4 % of effective span at 25° of heel and
so about 8 % of the keel's induced drag there.

**What gets harder, and this is the round's honest negative result.** The
effective-draft law was named as the last published lever on the heel
shortfall, and it is not one. Fitted at its most aggressive it bought +0.3° of
heel at TWS 14 and cost 1.0° at TWS 20; held at 1.2 it is smaller than that
again. Heel remains short by about a fifth and the remaining published
candidate is still ORC's downwind crew law (ADR 0024 option C). The
`validation/report.md` bullet that used to name this mechanism as "next" now
records what happened when it was tried.

**What is committed to.** That the exponent is a constant, not a knob: if a
later round wants it fitted, that needs a source placing this hull inside the
band, not a wider bound. And that the law is not evaluated past 30° of heel.

**What risk is accepted.** A model that is deliberately at the weak end of a
published range. If the J/70 really does sit near cos^2.9, some of its heeled
induced drag is still missing, and it will show up the next time a heeled row
reads slow.

**What it would cost to unwind.** Half a day: one constant in `keel.ts`, then
both classes recalibrated and both golden corpora regenerated.

**Revisit when:** the DSYHS scale factor is resolved and option B becomes
readable; or a source appears that maps Bwl/Tc to a position inside the band;
or a class is added whose polar heels past 30° at a VPP trim, which would make
the range guard a modelling decision rather than a robustness one.

## Related

- [0022](0022-heel-costs-published-drag-and-nothing-fits-the-heel-column.md) —
  option D there is this ADR's subject, deferred for attributability. Nothing
  is fitted to the heel column, still.
- [0024](0024-the-heeling-arm-is-published-geometry-not-a-fitted-knob.md) —
  the published heeling arm, the shortfall this was expected to help, and the
  crew law that is now the only published candidate left.
- [0026](0026-residuary-curve-is-held-above-the-last-froude-bin-the-fit-rows-reach.md) —
  the other change in the same refit, and the one that actually closed the
  gate.
- `hydro/resistance.ts` — the DSYHS scale-factor problem and the
  out-of-range-regression rule, both stated once there and not restated here.
- `PROVENANCE.md`, "Keuning & Sonnenberg 1998" — what is and is not claimed
  for the band.
