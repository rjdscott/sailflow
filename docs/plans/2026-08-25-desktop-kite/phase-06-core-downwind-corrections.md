# Phase 06 — Core downwind corrections the research surfaced

## Goal

Fix the solver-side discrepancies the research found (doc 04 (b) and doc 01),
each as its own commit with the hold-out gate re-run: the spinnaker
`flatmin` (ORC 0.53 since 2024, the code applies 0.42 to every sailset); the
asym's ORC table label in `data/boats/j70.json` (5.6 is the symmetric; the
bowsprit asymmetric is 5.7 in the edition the repo cites); and the ORC
edition pinned by year in `PROVENANCE.md` given the 2024→2026 asym
coefficient change. Anything that moves the hold-out report is reported,
not hidden.

## Tasks

- [x] `src/core/aero/orc/depower.ts` (or wherever `clampFlat` lives): spinnaker `flatmin = 0.53` when `sailset === 'asym'`; test; `pnpm validate` before/after diff in the progress log. If the asym hold-out rows move, say by how much and whether it is towards or away from the published polar.
- [x] `data/boats/j70.json` `sails.asym.orcTable` → the correct table for the cited edition; `PROVENANCE.md` row.
- [x] `PROVENANCE.md`: ORC VPP edition pinned by year for the spinnaker tables; note the 2026 coefficient change and that the repo carries the earlier edition.
- [x] Progress log.

## Verification

`make check`; `pnpm validate` (report the numbers).

## Artifacts

Core depower, boat data, `PROVENANCE.md`, tests.

## Progress log

### 2026-08-25 — the spinnaker `flatmin` is 0.53, and the gate did not move

`flatMin()` and `clampFlat()` take the sailset now, and the baseline is 0.42
upwind / **0.53** with the kite (`FLAT_MIN_SPINNAKER` in `tables.ts`). Three
call sites route through it: `forces.ts` clamps with `input.sailset`,
`optimal.ts` opens its golden-section bracket at the sailset's own floor, and
`optimalTrim.ts` never touches flat directly so it needed nothing.

**Provenance, stated plainly because it is a mixed edition.** 0.53 is not in
the 2023 document the rest of `tables.ts` transcribes — the 2023 text gives
only the 0.42 upwind baseline and no separate offwind floor. It is ORC VPP
2026 §5.1 footnote 3, recording a change made in 2024. So this one constant
comes from a later edition than its neighbours, deliberately, and says so in
its own docblock and in `PROVENANCE.md`.

**Does the downwind optimum ever reach flat < 0.53? Yes.** Instrumented
`compareRow()` over all 84 polar rows before the change: 16 rows floored at
0.4209 (i.e. at `flatMin`), of which 8 were `asym` — every TWA 180° row at all
seven wind speeds, plus TWS 20 kt at TWA 60°. **None of them is a gated row.**
The gate's asym rows are the seven `vmgDn` rows, which optimise to flat 0.999
at every TWS except 16 kt (0.750); they were never near the floor.

**`pnpm validate` before → after.** Gate verdict identical:
`FAIL — 21/25 gated rows inside tolerance`, same four rows out
(TWS 6 jib 60° 5.7 %; TWS 14 jib vmgUp 5.8 % / 1.8°; TWS 14 asym vmgDn 15.1 %
/ 25.5°; TWS 20 jib 60° 6.5 %), same worst residuals (15.1 % boat speed and
25.5° angle, both TWS 14 asym vmgDn). Two cells in the whole report moved:

| where | before | after | note |
|---|---|---|---|
| TWS 20 asym vmgDn, model bs | 12.39 kt | 12.40 kt | +0.0115 %; row still **FAIL** at 7.5 % either way |
| dock table, 6–8 kt band, model lowers | 1 | 2 | discrete grid pick flipped on a 5th-decimal lap-time difference |

**No hold-out row moved.** TWS 8 and 14 are byte-identical before and after.
So: nothing moved towards or away from the published polar in any meaningful
sense — the change is legally binding on rows the gate does not score, and the
rows the gate does score never asked for that much de-power.

**Golden corpus regenerated** (`pnpm golden`; `boatHash 2b39f8fb`,
`calibHash ab97c1e7`, both unchanged, so this was a real solver-behaviour diff
and not a recalibration). 23 of 53 cases moved, **every one of them `asym`**;
no jib case moved. The mechanism is not the clamp binding — every moved case
sat at flat 0.999 or 0.750, well clear of 0.53 — it is the golden-section
bracket: shortening `[0.42, 1]` to `[0.53, 1]` moves the sample points, so the
converged flat lands at 0.999270 instead of 0.999099. Boat-speed deltas run
−0.010 % to +0.014 %, largest `tws10-vmgdn-asym` +0.0141 %.

Left alone on purpose: `backstayFromFlat()` still divides by the jib floor, so
under the kite it now stops at 81 rather than reaching 100. It is a
`prov: assumed` map from flat to a slider position, and re-scaling it per
sailset would change the rig's response to the sail carried for no evidence.
Also untouched, and still true of the model: ORC couples `flat` with `reef`
downwind (`A · reef²`) and enforces a ≈ 21.5° soft heel ceiling under
spinnaker. Neither is modelled here; both are research doc 01 §2.4 items for
someone else.


### 2026-08-25 — the asym's ORC table label is 5.7, not 5.6

`sails.asym.orcTable` said `"5.6"`, which in the 2023 edition is the
**symmetric** spinnaker table (`kpss` 0.02639). The J/70's gennaker is tacked
to a bowsprit on the centreline, so it is **Table 5.7** (`kpasc` 0.02648) —
confirmed against `tables.ts`'s own header, which names 5.7 and correctly
distinguishes it from 5.8 (asym on a pole: same `kp`, same values out to
AWA 100°, diverging from 115°), and against research doc 01 §2.1.

**Nothing reads the label numerically.** `grep -rn orcTable` over the repo
returns three code hits and no dispatch: `types.ts:96` types it as a union of
five strings, `validate.ts:48` checks set membership against
`{5.1, 5.4, 5.6, 5.7, 5.8}` (so `"5.6"` passed happily), and nothing else. The
solver hardcodes `ASYM_TABLE` in `tables.ts`. Proof rather than assertion: the
regenerated golden corpus is byte-identical apart from the `boatHash` line
(`2b39f8fb` → `60104ed1`, from the boat file changing at all), and `pnpm
validate` differs only in its generated-at, commit and hash header lines. Gate
still `FAIL — 21/25`, same rows, same residuals.

**`PROVENANCE.md` row added**, which meant adding a source too: the boat file
had no ORC VPP documentation entry at all, so the row now cites a new
`orc-vpp-2023` source. The row records that the label is 2023 numbering, that
the same table is 5.9 in 2026, and that the old value was a metadata error
rather than a behaviour bug — the kind of quiet mislabelling the provenance
rules exist to catch.

Not touched: `sails.main.orcTable` `"5.1"` and `sails.jib.orcTable` `"5.4"`.
Both are correct in the 2023 edition and both also renumber in 2026 (2026
inserted a new Table 5.1 for RS percentages and a new 5.7 for roller-furling
jib deltas). The edition pin in `PROVENANCE.md` covers all three labels at
once, so neither needed its own row for this.

### 2026-08-25 — the ORC VPP edition is pinned by year

`PROVENANCE.md` gains a hand-written section above the generated marker: the
coefficient tables in `src/core/aero/orc/tables.ts` are the **2023 edition**,
the spinnaker table numbering by edition (5.6/5.7/5.8 → 5.8/5.9/5.10), the
2026 asym-on-centreline coefficient change with the numbers, and why the repo
stays on 2023.

The reason to pin by year rather than by document: ORC changed these numbers
**without announcing it**. CL at 130° AWA went 0.372 → 0.592 (+59 %), raising
derived drive at 130–150° by ~36 %, while the 2026 revision list names only
the foiling model, RS rating assessment and neural-network bounds, and a
standing footnote still claims the last single-sail coefficient change was in
2016. A citation without an edition year silently tracks whichever PDF is at
the URL today.

**Staying on 2023 is a decision, not inertia**, and the section says so: the
hydro calibration was fitted against the 2023 coefficients and the reference
polar is older still (VPP 2011 1.02), so adopting 2026 means a re-fit and a
re-run of the hold-out gate — and +36 % of drive at 130–150° AWA lands
squarely on the regime the gate's asym VMG rows occupy. Moving one of the
three without the others trades a known bias for an unknown one. Flagged as
"until re-validated" rather than left implicit.

Two numbers were deliberately *not* written down. The research reads the 2026
main and jib table numbers off no table, so the section says the main (`5.1`)
and jib (`5.4`) labels renumber in 2026 without guessing to what; and the 170°
row's 2026 CD is absent from the research's table, so that row is out of the
comparison and the 20 % figure appears only as prose from the derived `CFx`.

`pnpm validate` before → after: header lines only (generated-at, commit). Gate
unchanged, `FAIL — 21/25`. `make check` green.

**Phase closed 🟢, with one caveat for whoever reads the gate.** Step 1 was the
only behavioural change and it did not move the gate — but that is because the
rows the gate scores never de-powered near the floor, not because the fix was
inert. It binds on eight asym rows the gate does not score (every TWA 180° row
plus TWS 20 kt at 60°), so a future gate that adds deep-angle rows will see it.
