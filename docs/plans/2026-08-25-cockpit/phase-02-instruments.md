# Phase 02: Core instrument outputs and the instrument bar

## Goal

The solver reports the four cues sailors actually watch — main leech
stall fraction, jib leech position against the spreader stripes, a helm
load proxy, and speed as a percentage of polar — and the Race screen shows
every number through the instrument-cell contract with target, trend and a
one-line verdict.

## Tasks

- [ ] `src/core/solve/instruments.ts` (pure): `leechStallFrac` (main, from `sheeting.ts` stall/luff deviation, tier C), `jibLeechStripe` (0–2 index + fractional, from jib twist and sheet angle vs spreader geometry in `j70.json`, tier C), `helmLoad` (CE–CLR lever from `aero.ceHeightM`, `mxNm`, heel; + = weather; tier C), `pctPolar` (bs / polar target at TWS,TWA from `reference/polar.ts`; tier A inside polar range, C outside). Every literal `prov:` tagged; ASSUMPTIONS rows.
- [ ] `SolveResult.instruments` additive field; `PROTOCOL_VERSION` stays 1; golden corpus regenerated (`pnpm golden`).
- [ ] Invariants in `validation/invariants.test.ts`: stall fraction rises with over-sheeting at fixed AWA; stripe index moves aft with lead aft; helm load rises with heel at fixed trim; `pctPolar` = 100 ± 3 on fit rows.
- [ ] `src/ui/race/verdict.ts` (pure): one sentence of state, not data — "0.2 kt below target: main leech stalled, ease 5 %" — from instruments + optimum delta + coach probe; tested for every point of sail and for the no-optimum case.
- [ ] `src/ui/race/InstrumentBar.svelte`: BSP (bug + sparkline), %POLAR, VMG (bug + sparkline), TWA, HEEL bullet gauge with TWS bands, HELM load bar beside it, verdict line; honours `data-tier`. Replaces `Readouts` on Race; `Readouts` stays for Drills until phase 05.
- [ ] Store tests: history buffer fed only by converged solves; stale answers dropped.

## Verification

```sh
make check
pnpm golden && git diff --stat validation/golden   # only additive fields
pnpm validate                                      # hold-out unchanged
```

## Artifacts

- `src/core/solve/instruments.ts` + test, `ASSUMPTIONS.md` rows, `validation/golden/*` regenerated, `src/ui/race/{InstrumentBar.svelte,verdict.ts}` + test.

## Progress log
