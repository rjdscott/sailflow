# 03 — Numbers: ASSUMPTIONS.md and PROVENANCE.md against the constants

<a id="h-04"></a>
### H-04 — The plan-view sheeting formulas in `ASSUMPTIONS.md` are wrong, with the traveller sign inverted
- `ASSUMPTIONS.md:61–62` "boom angle ≈ 6° + (100 − mainsheet)·0.25° + traveller·0.08°; jib ≈ 7° + jibLead·0.4° + (100 − jibSheet)·0.15°".
- `src/core/shape/sheeting.ts:26` `clamp(6 + 0.0085·eased² − traveller·0.08, 2, 90)`; jib `4 + jibLead·0.35 + 0.0045·eased²` (`boat.ts:166–167` identical). At `mainsheet = 15`: doc 27°, code 67.4° — and `ASSUMPTIONS.md:353` (generated) says 67°.
- Fix: rewrite the bullet from `sheeting.ts`.

<a id="h-05"></a>
### H-05 — The 3D perf budget is three numbers across the docs and one in the code
- `ASSUMPTIONS.md:82–87` 50 ms, "no phone was profiled"; ADR 0014 `:85` heading 350 ms; `CHANGELOG.md:112` 350 ms "wall-clock"; `docs/plans/2026-08-25-cockpit/README.md:100` 350 ms; code `SailHero.svelte:45` 800, measured work not wall-clock (`SailView3D.svelte:276–291`).
- Fix: 800 everywhere with the measurement basis; ADR heading corrected.

<a id="h-15"></a>
### H-15 — `TACK_TRAVEL_M` = 0.6 m is above every cited source; the panel beside it quotes 0–12 in
- `kite.ts:121`; `ASSUMPTIONS.md:136–140` "known wide: J/70 figures 0–12 in (0–0.30 m), sportboat literature 18 in"; research doc 04 §2.4 "change to ~0.30 m" unapplied; `downwind.ts:109` shows "0–12 in across four sources".
- Fix: `TACK_TRAVEL_M = 0.3` (applied in the remediation PR) and the row re-tagged.

<a id="h-16"></a>
### H-16 — `SAG_FORWARD_FRACTION` exists twice (0.35 forestay, 0.6 kite luff); one row
- `rig3d.ts:43` 0.35; `kite.ts:204` 0.6; `ASSUMPTIONS.md:88–90` documents 0.35 only.
- Fix: rename the kite one `LUFF_FORWARD_FRACTION`; add its row.

### M-26 — `ASSUMPTIONS.md:151–152` inverts which bound binds the luff sag ("the arc bound is looser nearly everywhere") — the 0.3 cap (3.24 m) is looser than the parabola bow (2.46 m default, 3.00 m slackest); it never binds.
### M-27 — Clew-rise corroboration stale since #80 (`ASSUMPTIONS.md:182–185`, `kite.ts:313`): 1.1 m / 0.3 m per 10° → 1.42–1.46 m / 0.41 m per 10°.
### M-28 — `ASSUMPTIONS.md:182` "head-to-clew *is* the published leech" vs `:161–162` and `kite.test.ts:187–189` (chord 8.75 m trimmed, 8.44 m eased).
### M-29 — `BASE_DOWN` (`store.svelte.ts:36–43`) has no row in either file; `baseRace` has eleven. Fix: move to `data/boats/j70.json` `baseRaceDown.*` so `provenance.mjs` generates the rows.
### M-30 — `PROVENANCE.md`'s Sources table resolves none of the `F*`/`T*`/`S*` ids the code's `prov:` tags cite; `gauges.ts:118–130` cites "North Sails J/70 upwind trim tips" which matches nothing. Fix: a "research-corpus source ids" section above the generated marker; retag `gauges.ts` to research doc 01 item 10.
### M-31 — `prov_check.py` and `provenance.mjs --check` validate only `src/core` literals and the generated tables; every hand-written bullet in `ASSUMPTIONS.md` (where H-04, H-05, M-26–M-28 live) and the ORC section of `PROVENANCE.md` are ungated. Fix: say so in `ASSUMPTIONS.md`'s header; widen `prov_check` as a follow-up.
### L-10 — `ASSUMPTIONS.md:42–43` v1 drill-medal rule presented as current above the v2 rule; `:92` `.svelte` suffixes on `hull`/`rig3d`; `:7` points the invented layer at `src/core/aero/shape` (the applier) not `src/core/shape`.
### L-11 — `PROVENANCE.md:22–24` says the 2026 main/jib renumbering "is not recorded here" while `:19–20` states the insertion points that imply 5.1→5.2, 5.4→5.5.
