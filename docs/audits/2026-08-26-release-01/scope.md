# Scope — release-01

- **Lens:** a technical sailor or engineer opens this repo and the live site
  cold, for the first time. Do the front-door documents tell the truth, and
  does the live site make its first move obvious?
- **Commit:** `c5da8d7487b96724b9f26fe8b0ece64b204057fd` on `docs/close-out-v0.3`
  (`git rev-parse HEAD`).
- **Date:** 2026-08-26.
- **Method:** inline, single auditor. Repo claims checked by running the
  commands they describe; live site driven with headless Chromium
  (`@playwright/test` 1.62.1, `--use-gl=swiftshader
  --enable-unsafe-swiftshader`) at 1920×1080 and 390×844 against
  https://rjdscott.github.io/sailflow/ in a fresh context with no
  `localStorage`. Screenshots and captured page text in [`img/`](img/).

## In scope

1. **Repo first impressions.** `README.md`, `CLAUDE.md`, `CHANGELOG.md`,
   `ASSUMPTIONS.md`, `PROVENANCE.md`, `LICENSE`, the five `docs/*/README.md`
   indexes, `docs/plans/2026-08-26-phase-two/`. Every relative link resolved by
   script; every quantitative claim re-derived from the code, the test run or
   the generated artefact; stale references, dates and internal-only noise.
2. **Live site first run.** https://rjdscott.github.io/sailflow/ — Race, Dock,
   Log, Drills, More at both viewports. What a stranger sees, whether the first
   move is obvious, whether the A/B/C confidence tiers are explained anywhere
   reachable, console errors, and the version string on More.
3. **Contributor path.** Can someone clone and get `make check` green from the
   README alone? Do the commands in Quick start exist, and do the stated
   Node/pnpm versions match anything the repo enforces? `make check` was run in
   full, which is how H-18 surfaced.

## Out of scope

- Physics correctness and anything under `src/core` — covered by the polar
  hold-out gate and `validation/`.
- UX beyond first-run legibility — `docs/audits/2026-08-25-ux-03/` owns it,
  and its open P2/P3 items are already carried into
  `docs/plans/2026-08-26-phase-two/` phase 06.
- The More screen reading version `0.2.0`: the live site is the last
  `main` deploy, and `0.3.0` ships when the release PR merges. Recorded as
  context in [`02-live-first-run.md`](02-live-first-run.md), not as a defect.
