# Phase 01: Contracts + data

- **Status:** 🔵 Not started

## Goal

The type contracts everything codes against, the worker protocol, and all reference data transcribed with provenance, before any solver or UI exists.

## Tasks

- [ ] `src/core/types.ts`: BoatDefinition, ControlState{dock,race,down?}, Condition, SolveResult, Tiered, RigState, SailShape [O]
- [ ] `src/worker/protocol.ts` PROTOCOL_VERSION=1 request/response unions [O]
- [ ] `data/boats/j70.json` from class rules + ORC OD certificate, every number `prov`-tagged [S]
- [ ] `data/tuning/north-j70.json`, `data/tuning/quantum-j70.json` transcribed from guides with retrieval dates [S]
- [ ] `data/polar/orc-j70.json` from ORC Speed Guide (7 TWS, VMG up/down + 60/90/120 rows) [S]
- [ ] `PROVENANCE.md`, `ASSUMPTIONS.md` skeletons [S]
- [ ] `src/core/boat/validate.ts` + tests (rejects illegal purchase, missing sail, negative EI) [S]
- [ ] ADRs 0003 (core/UI boundary), 0004 (TS now, Rust Epic 3), 0008 (third-party data committed)

## Verification

```bash
make check
pnpm test -- validate
```

## Artifacts

`src/core/types.ts`, `src/worker/protocol.ts`, `data/boats/j70.json`, `data/tuning/*.json`, `data/polar/orc-j70.json`, `PROVENANCE.md`, `ASSUMPTIONS.md`

## Progress log

