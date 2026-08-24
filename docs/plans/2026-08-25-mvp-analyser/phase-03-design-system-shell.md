# Phase 03: Design system + app shell

- **Status:** 🟢 Completed

## Goal

Tokens, primitives, and a hash-routed 5-tab shell at 380 px in light and dark, built against a stub worker, so UI phases start the moment the solver lands.

## Tasks

- [x] `src/ui/tokens.css` (sun-readable light, dark, type scale, spacing, 44 px targets) [S]
- [x] Primitives: Slider (native range, purchase-derived step, readout, tick, lock), Readout, ConfidenceBadge, Toggle, BottomNav, Sheet, Toast [S]
- [x] Shell: hash routes #/race #/dock #/log #/drills #/more, top bar (Simple/Advanced, lock, tier), #/kit dev route [S]
- [x] Stub worker client returning fixed SolveResult [S]
- [x] ADR 0011 (2D only Epic 1)

## Verification

```bash
make check
pnpm build && pnpm preview  # open /#/kit at 380px, both themes
```

## Artifacts

`src/ui/tokens.css`, `src/ui/components/*.svelte`, `src/ui/App.svelte` with routes

## Progress log

- 2026-08-25 — Built by a Sonnet agent in an isolated worktree against `stubClient()`; PR #3 squash-merged. Deviations: `router.svelte.ts` (runes need the `.svelte.ts` suffix); `SolverClient.request` needs an explicit type argument at call sites (discriminated-union `Omit` limitation); worker specifier built through a variable so Vite does not resolve the not-yet-existing `solver.worker.ts` at build time (inline once it lands); More screen version hardcoded `0.0.0`. ESLint `no-restricted-imports` now enforces ADR 0003. ADR 0011 written in the solver PR.
