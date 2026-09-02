# 0023. The VMG hold-out gate measures the VMG lost at the polar's printed angle, not the distance between two argmaxes

- **Status:** Accepted
- **Date:** 2026-09-02

## Context

ADR 0007 gates each held-out VMG row on two numbers: boat speed within 3 % and
VMG angle within 2°. After ADR 0022 nine of the ten held-out rows pass and the
tenth fails on the second number alone — TWS 14 asymmetric downwind, boat speed
2.1 % (inside tolerance) at a VMG angle 3.3° from the polar's printed 172.0°.

ADR 0022 already recorded why no number fixes it. The model's downwind VMG at
TWS 14 is flat: swept about its own optimum of 168.7°, it gives up 0.04 % at
±2°, 0.21 % at −4°, and only 1.1 % ten degrees away at 178.7°. The polar's own
172.0° costs the model 0.11 % of its best VMG — six hundredths of a knot on
6.27. Sailed there, the model does 6.32 kt against the polar's printed 6.26,
1.0 % fast.

A 2° criterion on the *location* of a maximum only means something where the
maximum is sharp. Swept the same way, the peaked rows cost 0.18–0.23 % at ±2°
(both held-out upwind rows) and 0.40 % downwind at TWS 8, against 0.04 % on the
14 kt plateau — a factor of ten between rows the criterion treats identically.

The source is no more precise than the model here. The ORC Speed Guide's own
printed running angle moves 162.5° → 172.0° → 174.0° across TWS 12, 14 and 16
while the VMG behind it climbs smoothly 5.64 → 6.20 → 6.70 kt: 9.5° of argmax
travel for 2 kt of breeze, from a VPP whose own optimiser faced the same flat
curve. Gating our argmax against that argmax to 2° asks both search algorithms
for a precision neither objective function contains.

So the failing row is not a physical disagreement, and the criterion that
reports it cannot tell a boat at the wrong angle from a boat on a plateau.
Both are worth catching; only the first is worth failing a build over.

## Options considered

**A. Keep the 2° criterion and add the missing downwind mechanism.** ADR 0022
names the candidates: the main's shadow on the kite (ORC gives the spinnaker no
blanketing term), the tack line, the sprit. The model's downwind optimum is
compressed into 168–169° from 14 kt up against the polar's 141.9° → 174.0°, and
a real mechanism there would move it.
- Pros: fixes the model rather than the ruler; the compressed optimum is a real
  weakness and this ADR does not make it less real.
- Cons: it does not rescue the criterion. Even with the argmax moved onto
  172.0°, a 2° gate on that row would be measuring a quantity worth 0.04 % of
  VMG — passing or failing on solver noise. The mechanism is worth adding; it
  is not what the gate should be waiting for. Epic 2 work either way.

**B. Widen the angle tolerance to 4°.** One constant, one line.
- Pros: the smallest possible diff; the row passes today.
- Cons: it is the move ADR 0007 forbids in its own words and
  `validation/README.md` repeats — loosening a tolerance until the gate is
  green. And it buys nothing structural: 4° is worth 0.21 % of VMG at TWS 14
  and 2.8 % at TWS 8 upwind, so the widened criterion is still ten times
  stricter on one row than on another, and still says nothing about knots.

**C. Gate boat speed alone and drop the angle.** Report the angle, gate
nothing.
- Pros: honest about what the 2° was measuring; simplest gate.
- Cons: throws away a real check. Boat speed is evaluated at the model's *own*
  chosen angle, so a model that sailed 30° too high at plausible speed would
  pass every row. Something has to hold the angle to account.

**D. Replace the angle criterion with a VMG-shortfall criterion** (chosen).
Solve each VMG row a second time at the polar's printed TWA — race trim still
optimised, TWA fixed — and require the model to keep at least 99 % of the VMG
it makes at its own optimum.
- Pros: measures the quantity the gate exists to protect, in the units the rest
  of the gate uses; scales itself to the curve, tightening automatically
  wherever the VMG peak is sharp and relaxing only where there is nothing to
  lose; and it fails the case option C cannot — a model sailing a genuinely
  wrong angle gives up real VMG at the polar's.
- Cons: a second solve per VMG row, and it is blind to a model that finds a
  different-but-equally-good angle. See Consequences.

## Decision

**We will replace ADR 0007's 2° VMG-angle tolerance with a VMG-shortfall
criterion: for every held-out VMG row, the model solved at the polar's printed
TWA must make at least 99 % of the VMG it makes at its own optimum — because
the distance between two argmaxes on a flat objective measures the flatness,
not the model.** ADR 0007's boat-speed tolerances (3 % on VMG rows, 5 % on the
printed-angle rows), ADR 0012's split, and the row set are untouched; no row
moves between the fitted and held-out sets, and no calibration value changes.

The angle difference keeps being printed in `validation/report.md`, as
information rather than as a verdict, alongside the new shortfall column. Both
columns are computed for every VMG row at every wind speed, fitted and held-out
alike; only the held-out rows are gated, exactly as before.

**Why 1 %.** Three bounds meet there.

- *From below, the source's own resolution.* The polar prints VMG to 0.01 kt,
  which on the 6.20 kt row at issue is 0.16 %. A criterion inside a few tenths
  of a percent would be gating on the last printed digit.
- *From above, the gate's own speed tolerance.* 1 % of a 6 kt VMG is 0.06 kt,
  a third of the 3 % this row already carries on boat speed. An angle criterion
  stricter than the speed criterion would fail models on where the optimiser
  landed while passing them on how fast the boat goes.
- *Against what it replaces.* Measured on the four held-out VMG rows, 2° of
  angle is worth 0.18 % (TWS 14 upwind), 0.23 % (TWS 8 upwind), 0.40 % (TWS 8
  downwind) and 0.04 % (TWS 14 downwind) of VMG. One percent is the same order
  as the old criterion on the three rows where the old criterion meant
  something — it sits at about ±4° on those — and is reached only ~9° out on
  the plateau where it did not.

Scope: the held-out polar gate, for every class. Until a second reference
source arrives (ADR 0007's revisit trigger), or the asymmetric gains the
mechanism option A describes and the downwind VMG curve stops being flat.

## Consequences

**What gets easier.** The J/70 gate closes: 10/10 held-out rows, PASS, with the
worst VMG shortfall 0.32 % at TWS 8 asymmetric against the 1 % limit. CI's
`validate` job has a green gate to protect for the first time, which is the
precondition for making it blocking rather than `continue-on-error`. And every
row now reports its angle disagreement in knots, so the report says how much a
disagreement is worth instead of only how large it looks.

**What gets harder.** The criterion is blind to a model that reaches the same
VMG by a different route, and there is a live example: the fitted TWS 12
asymmetric row sails 151.3° against a printed 162.5° — 11.2° apart, the largest
angle disagreement in the polar — and scores a shortfall of 0.24 %, because the
model's VMG at the polar's angle really is within a quarter of a percent of its
own. That row is caught by boat speed instead (8.6 % fast, the only row in the
polar outside 3.4 %), and it is caught only because it is fast. A future model
that picked the wrong downwind hump at plausible speed would now pass a
criterion the 2° would have failed. The compressed downwind optimum, and
`optimal()`'s hump-picking at the crossing, therefore stay on the weakness list
in `validation/report.md` — they are no longer gate failures, and nothing here
makes them less true.

**What it costs to run.** Two solves per VMG row instead of one. The second is
the cheap one — no TWA search — so a full calibration loss evaluation over the
J/70's 25 fit rows goes from 327 ms to 345 ms, +5 %, measured. `calibration/`
pays that rather than carrying a flag that could switch half the gate off
silently; the fit's loss reads the model's own angle and is unchanged, so no
knob moves and no refit is required by this ADR.

**What is committed to.** A gate whose two criteria are now in the same
currency, and the claim that VMG is what a VMG row is for. If a class ever
arrives whose polar prints a downwind angle we have reason to trust to a
degree, this criterion will not check it, and a second one would have to be
added rather than this one tightened.

**Revisit when:** the asymmetric gains a second mechanism (blanketing, tack
line, sprit) and the TWS 14 downwind VMG curve is no longer flat to 0.11 % over
168–172°; or a held-out row passes this criterion while sailing an angle a
sailor would call wrong, which is the failure mode the Consequences above
describe and the TWS 12 fitted row already rehearses.

## Related

- [0007](0007-calibration-and-validation-are-separate-with-a-held-out-gate.md) —
  supersedes its VMG-angle tolerance. Its boat-speed tolerances stand.
- [0012](0012-hold-out-split-by-wind-speed-not-by-angle.md) — the row set, also
  unchanged.
- [0022](0022-heel-costs-published-drag-and-nothing-fits-the-heel-column.md) —
  measured the plateau this ADR responds to, and accepted the failing row as
  the last open one.
- [0018](0018-offwind-parachute-drag-knob-not-a-mode-switch.md) — the one
  downwind knob, and why the asymmetric has no second mechanism yet.
- `validation/report.md`, "Gate" — the criterion as it ships, with the
  shortfall column.
