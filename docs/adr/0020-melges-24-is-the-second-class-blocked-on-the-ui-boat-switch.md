# 0020. Melges 24 is the second class, and it lands after the UI takes the active boat

- **Status:** Accepted
- **Date:** 2026-08-26

## Context

Phase 05 made the physics class-agnostic: `src/core` names no class, the
solver reads everything off the `BoatDefinition` it is handed, and
calibration, the golden corpus and the validation gate all take `--boat <id>`.
The remaining question is which class goes in second, and the plan said to
pick "by polar availability" (`docs/plans/2026-08-26-phase-two/phase-05-second-boat.md`).

Sourcing both candidates changed the shape of that question. Three constraints
surfaced that the plan did not anticipate, and they do not point the same way.

**1. Both candidates have a fetchable polar, and the better one belongs to the
wrong boat.** ORC's public certificate feed is open and machine-readable, and
returns a full VPP polar for either class. But an ORC polar is issued per
*certificate*, for one measured hull, not per class. Across 29 J/24
certificates the polar varies by **≤ 1.8 %**, with LOA and max beam identical
on every one. Across 40 Melges 24 certificates it varies by up to **11.4 %**,
driven by measured displacement spanning 821–1002 kg. On polar quality alone
the J/24 wins clearly.

**2. The J/24 flies a symmetric spinnaker on a pole.** The model does not
represent that sail. `SailId` is `main | jib | asym`, `DownControls` carries a
`sprit`, and ADR 0017 draws the kite as a sprit-tacked asymmetric. The J/24's
ORC record confirms it: `Area_Sym: 35.34`, `Area_Asym: null`. Committing a
J/24 with a `sails.asym` block would not be an approximation, it would be a
category error — and it would be gated, calibrated and reported to sailors as
if the boat had a sail it does not have. The Melges 24 flies an asymmetric on
a retracting bowsprit, which is the sail plan the model was built for.

**3. Six hull and stability fields are unpublished for *every* one-design.**
`validateBoat` requires `hull.lwlM`, `bwlM`, `keelAreaM2`, `keelSpanM`, `kgM`
and `gmM`. No class rule publishes them, and the ORC public certificate carries
no hydrostatics at all — all 284 keys of the J/24 record were enumerated and
there is no `LWL`, `BWL`, `VCG`, `GM` or keel-area field. (`IMSL` is ORC's VPP
sailing length and `CDL` its Class Division Length; neither is LWL, and
substituting one would be an invented number wearing a citation.)

This third constraint reads as a blocker until you look at how the J/70's own
file answers it. Every one of those six is `kind: "assumed"` there, with the
estimation method written into the note — `bwlM` as 0.85 × max beam, `keelSpanM`
as 0.85 × draft, `kgM` as 0.35 × draft, `gmM` as 0.30 × beam. So the repo
already has a convention for these values, and it is not "publish or omit".

Separately, the free ORC feed does not tag which sail each polar row uses; the
sail-resolved Speed Guide is a paid per-boat product. The J/70's committed
polar prints a jib and an asymmetric row at overlapping angles, which the
harness relies on (`vmgRows` reads a jib `vmgUp` and an asym `vmgDn`).

## Options considered

**A. J/24, modelling its symmetric kite as the `asym` sail.** Take the class
with the class-representative polar and let the existing sail plan stand in.
- Pros: best polar by a wide margin (±1.8 % vs ±11.4 %); current, fetchable
  class rules (2026-03-01, Approved).
- Cons: the boat in the app is not the boat on the water. Every downwind
  number, every sprit control and the whole kite drawing would describe a sail
  the J/24 does not carry. It is precisely the "resolve the disagreement
  silently" failure `CLAUDE.md` forbids, dressed as a data decision.

**B. J/24, extending the model to symmetric spinnakers first.** Add a pole-set
symmetric sail to `SailId`, `DownControls` and the shape layer.
- Pros: the honest way to have the J/24; opens every class with a pole.
- Cons: a much larger change than "a second boat" — new controls, new
  geometry, a new ORC coefficient table, and a re-run of the downwind
  calibration that phase 01 just settled. It is its own epic, not a phase.

**C. Melges 24, with the six hydrostatic fields `assumed` by the J/70's own
documented formulas.** Take the class whose sail plan the model represents,
and reuse the established convention for what nobody publishes.
- Pros: the sail plan matches; the 2017 class rules publish *more* rig geometry
  than the J/70's do (spreader height, spreader length, sweep offset,
  chainplate transverse spacing), so several fields that are `assumed` on the
  J/70 would be `published` here; the assumed values follow a stated method
  already in `ASSUMPTIONS.md`.
- Cons: the polar is per-hull to ±11.4 %, so the certificate must be named
  alongside every number; the current 2022 rules are unreachable (the class
  site's link points at a CloudFront host that no longer resolves), leaving the
  2017 edition; and the polar's rows carry no sail tag, so assigning jib and
  asymmetric by angle is a judgement the J/70's committed polar never needed.

**D. Ship nothing and re-scope.** Land the class-agnostic machinery, name the
blockers, add no second boat.
- Pros: no invented numbers, no half-correct boat in front of a user.
- Cons: the phase's headline goal — a second boat sailing — goes unmet.

## Decision

**We will make the Melges 24 the second class (option C), and it will not be
registered in `src/lib/boat.ts` until the UI takes the active boat.**

The sail plan decides it. A polar that is 10 % uncertain is a number with a
band on it, which ADR 0006's tier system exists to express. A boat shown flying
a sail it does not carry is not uncertain, it is wrong, and no tier expresses
that. Option A trades a representable boat for a better number and is rejected
on those grounds; option B is the right eventual answer for the J/24 and is
explicitly deferred, not dismissed.

Scope of the deferral: the *blocker* is code, not data. Thirteen UI components
still import `data/boats/j70.json` by path for control ranges and drawing
dimensions (the grep is in `docs/runbooks/add-a-boat-class.md` step 5). Until
they read the active boat, a registered second class gets correct physics and
correct share links but the J/70's slider stops and hull drawing — so the boat
picker would offer a class whose sliders lie. That is a worse failure than
having one class, and it is why the registry entry is the last step rather than
the first.

The six hydrostatic fields will be `kind: "assumed"`, carrying the same
formulas and the same note style as the J/70's, and will surface in
`ASSUMPTIONS.md` like every other assumed value. This is the existing
convention applied consistently, not a new licence: the alternative is a schema
whose required fields no one-design in the world publishes.

## Consequences

**Easier.** The second class is now a data task with a known shape rather than
an open question: the polar endpoint, the certificate reference, the rule
edition and the per-field provenance kinds are all settled. Several fields that
are `assumed` on the J/70 will be `published` on the Melges 24, because its
rules dimension the rig where the J/70's delegate to builder drawings.

**Harder.** Every Melges 24 number carries a certificate identity, not just a
class name — the ±11.4 % spread means "the Melges 24's polar" is not a
well-formed phrase. The boat file's `sources` block must name the specific
certificate (RefNo `03510004JAJ`, ESP, INTL grade, issued 2026-03-30) and the
2017 rule edition, and the disagreement surfaces must not present it as a class
polar.

**Committed to.** The `asym` sail plan as the only downwind rig the model
represents, until option B is taken up. Any class with a symmetric spinnaker is
out of scope by this ADR, and that includes most keelboats older than the
J/80 — the pool of addable classes is narrower than "one-design keelboats".

**Risk accepted.** The Melges 24 polar's per-hull spread is larger than the
ADR 0007 hold-out tolerance on boat speed (3 % on VMG rows). The gate may
therefore fail on rows where the model is fine and the reference is simply a
different hull. Unwinding costs a re-fit against another certificate, roughly a
day; it does not touch the model.

**Revisit when:** the thirteen UI sites read the active boat, which unblocks
registration. Revisit option B when a second class with a pole-set symmetric
kite is actually wanted — the J/24 is the obvious candidate and its polar is
the best-conditioned of any class examined.

## Related

- `docs/plans/2026-08-26-phase-two/phase-05-second-boat.md` — the phase, its
  progress log, and the sourcing detail behind the numbers quoted here.
- `docs/research/2026-08-25-sailing-sim-landscape/05-second-class-readiness.md`
  — the import-site inventory this ADR's blocker is drawn from, and decision
  #13 ("one `BoatDefinition` JSON per boat, no plugin abstraction").
- [ADR 0006](0006-faithful-orc-aero-layer-plus-invented-shape-layer-with-confidence-tiers.md)
  — the tier system that carries polar uncertainty.
- [ADR 0008](0008-third-party-reference-data-committed-with-provenance.md) — the
  provenance rules the `assumed` kinds answer to.
- [ADR 0017](0017-kite-drawn-from-downwind-controls-as-tier-c-geometry.md) — the
  sprit-tacked asymmetric this ADR commits to as the only kite.
- `docs/runbooks/add-a-boat-class.md` — step 5 is the blocker named above.
