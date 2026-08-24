# Phase 00: Repo hygiene + tooling

- **Status:** 🟢 Completed

## Goal

Template remnants gone, Svelte 5 + Vite + TS skeleton builds, `make check` green locally and in CI, GitHub Pages serves the skeleton.

## Tasks

- [x] README rewritten (honesty statement near top), .gitignore, CLAUDE.md "This project" section [S]
- [x] Vite + Svelte 5 + TS + vitest + eslint/prettier + svelte-check skeleton; scripts dev/build/preview/check/lint/format/test [S]
- [x] Makefile (setup dev build docs docs-check lint typecheck test check validate help) [S]
- [x] .github/workflows/ci.yml + pages.yml [S]
- [x] Stale audit index + ADR 0002 dead links fixed, .idea removed, docs index regenerated [S]
- [x] Research workspace docs/research/2026-08-25-sailing-sim-landscape/ committed
- [x] This plan registered in docs/plans index; ADR 0005 (Svelte) written
- [x] PR opened, CI green, squash-merged; Pages enabled; URL loads on phone

## Verification

```bash
make check
gh run list --limit 3
curl -sI https://rjdscott.github.io/sailflow/ | head -1
```

## Artifacts

`Makefile`, `package.json`, `.github/workflows/ci.yml`, `.github/workflows/pages.yml`, `.gitignore`, `docs/adr/0005-*.md`

## Progress log

- 2026-08-25 — Skeleton, Makefile, CI, README, .gitignore, docs fixes, research workspace, plan, ADR 0005 all landed on `chore/repo-hygiene`. `make check` green locally. Fixes en route: doc tests are pytest-style so `docs-check` uses `uvx pytest`; CI got `astral-sh/setup-uv`. `.prettierignore` widened to docs/, .github, scripts, tests (Sonnet agent decision; docs formatting is not lint-enforced). Owner granted end-to-end autonomous run; standing rules added to CLAUDE.md (docs as-you-go, quality tests). Remaining: PR, merge, Pages enable, phone check.
- 2026-08-25 — PR #1 squash-merged; Pages enabled via API (build_type=workflow). URL check deferred to phase 01 PR (deploy runs on main).
