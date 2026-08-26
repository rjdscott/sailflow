# Verdict: the app is ready to be seen, the front door is not — the README's honesty paragraph has all four of its numbers backwards, and `make check` is already red before a contributor touches anything

- **Lens:** a technical sailor or engineer opens this repo and the live site cold, for the first time
- **Commit:** c5da8d7

The live site survives a stranger better than the repository does. Five
screens, two viewports, a fresh context each time: zero console errors, zero
failed requests, the 3D hero rendering under SwiftShader, the confidence tiers
explained in plain language on More, and every screen titled and deep-linkable.
The documents in front of it are where the release is not ready. `README.md`'s
"Known limitation, stated plainly" — the paragraph the entire honesty pitch
rests on — states that the model is 5.8 % and 15 % **slow** and sails **high**,
when `validation/report.md`, two sections earlier in the same README, says it
is 5.8 % and 15 % **fast** and sails **low**; the same sentence swaps the polar's
172° with the model's 146.5°, inverting the physical story of the one miss the
project has chosen to lead with. `ASSUMPTIONS.md` and the phase-02 progress log
both have it right, so this is a README defect, not a model one — which is
exactly why it should not survive the release that advertises the README as
rewritten. Alongside it, the published `validation/report.md` still names boat
hash `3527bccc`; regenerating at HEAD gives `6272af4c`, because the report was
never re-run after #88 changed what the hash covers. And a contributor who
follows the README and nothing else cannot get `make check` green: `docs-check`
shells out to `uvx`, and `uv` appears nowhere except the runbook for starting a
*different* repository. And underneath that, on a clean tree at this commit,
`make check` is already red: `validation/hash.test.ts` fails both
`prettier --check` and `svelte-check`, so the gate `CLAUDE.md` and the
Contributing section both make mandatory does not pass on the release branch.

None of this is deep. Two of the three top risks are a paragraph of prose and a
`pnpm validate`. What earns the verdict is where they sit: every one of them is
in the first thousand words a stranger reads, on a project whose stated
differentiator is that it does not fudge numbers.

**Scope.** Repo front door (`README.md`, `CLAUDE.md`, `CHANGELOG.md`,
`ASSUMPTIONS.md`, `PROVENANCE.md`, `LICENSE`, the five `docs/*/README.md`
indexes, `docs/plans/2026-08-26-phase-two/`); the live site at
https://rjdscott.github.io/sailflow/; the contributor path. Physics, `src/core`
and UX beyond first-run legibility are out. Full contract in
[`scope.md`](scope.md).

**Method.** Inline, single auditor, 2026-08-26. Every quantitative claim
re-derived by running the command behind it — `pnpm vitest run` for the test
count, `pnpm validate` for the report, a link-walker over all 17 documents in
scope. Live site driven with headless Chromium (`@playwright/test` 1.62.1,
SwiftShader) at 1920×1080 and 390×844, one fresh context per screen, script and
raw capture in [`sweep.mjs`](sweep.mjs) and [`img/`](img/).

**Findings: 18.**

| Severity | Count | Codes |
|----------|-------|-------|
| Critical | 0 | — |
| High | 4 | H-01, H-02, H-15, H-18 |
| Medium | 8 | M-03, M-04, M-05, M-06, M-10, M-11, M-16, M-17 |
| Low | 6 | L-07, L-08, L-09, L-12, L-13, L-14 |

**Top risks**

1. **[H-18](03-contributor-path.md#h-18)** — `make check` does not pass at
   `c5da8d7` on a clean tree. `validation/hash.test.ts`, added in #88, fails
   `prettier --check` and `svelte-check`; `vitest` passes it because Vitest
   does not typecheck. CI runs `make check` on every push, so the release
   branch cannot merge green.
2. **[H-01](01-repo-first-impressions.md#h-01)** — the README's known-limitation
   paragraph reverses the sign of all four residuals it quotes and swaps the two
   downwind angles. The one place the project cannot afford to be wrong.
3. **[H-15](03-contributor-path.md#h-15)** — even once H-18 is fixed,
   `make check` fails on a machine provisioned exactly as the README describes,
   because `uv` is never named.
4. **[H-02](01-repo-first-impressions.md#h-02)** — the published validation
   report identifies its model with a hash no build at this commit produces.

**Verified clean.** All relative links resolve. The ADR count (17), test count
(1167), golden-corpus size (65) and app-line count (~26 k) are accurate. Every
Quick-start command exists and `make help` prints all eleven targets. `make
docs-check` and `make test` are green (1167 passing). No console
errors on any screen at either viewport. Tier badges are explained on More. The
More screen reads v0.2.0, which is the last `main` deploy and not a defect.

**Punchlist:** [`todo.md`](todo.md).
