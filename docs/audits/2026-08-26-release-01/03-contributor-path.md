# Contributor path

The question: clone the repo, read `README.md` and nothing else, and get
`make check` green. `make setup` cannot be re-run offline here, so each
command in Quick start was checked against the target it invokes and against
what a fresh machine would and would not already have.

**What resolves.** Every command in `README.md:81-88` exists: `make setup`,
`dev`, `build`, `docs`, `docs-check`, `lint`, `typecheck`, `test`, `check`,
`validate` are all declared in the `Makefile` with `##` help text, `make help`
prints all eleven, and `pnpm test:ui` is `package.json:17`. `make check`'s
description — "docs-check + lint + typecheck + 1100+ unit tests" — matches
`Makefile:34` and the measured 1167.

---

<a id="h-18"></a>

## H-18 — `make check` is red at the audited commit, before a contributor changes anything

Found while re-running the gate over the audit's own edits. On a clean tree at
`c5da8d7` (`git stash push -u`, `git status --short` empty), two of `make
check`'s four targets fail on a file that landed in #88:

```
$ pnpm exec prettier --check validation/hash.test.ts
Checking formatting...
[warn] validation/hash.test.ts
[warn] Code style issues found in the above file. Run Prettier with --write to fix.

$ pnpm exec svelte-check --tsconfig ./tsconfig.json
ERROR "validation/hash.test.ts" 11:21
  Argument of type '{ provenance: { 'hull.loaM': { source: string; kind: string; note: string; } }; … }'
  is not assignable to parameter of type 'BoatDefinition'.
    … Type 'string' is not assignable to type 'ProvenanceKind'.
COMPLETED 1038 FILES 1 ERRORS 0 WARNINGS 1 FILES_WITH_PROBLEMS
```

`make lint` runs `eslint . && prettier --check .` (`package.json:11`) and
`make typecheck` runs `svelte-check` (`package.json:10`); both are dependencies
of `check` (`Makefile:34`). `make test` is green — 1167 passing — because
Vitest transpiles without typechecking, which is why the file passed the run
that mattered to its author and nothing else.

The cause is at `validation/hash.test.ts:8`: the object literal's `kind: 'assumed'`
widens to `string`, and `ProvenanceKind` is a union of the four kinds
`PROVENANCE.md` defines. `kind: 'assumed' as const`, or annotating the literal
`ProvenanceEntry`, fixes both errors; the prettier warning is a `--write` away.

**Impact.** `CLAUDE.md` opens its project section with "**`make check`** before
every PR … all green, or don't open it", `README.md:149` repeats it as the
contributor rule, and CI runs `make check` on every push and every PR
(`.github/workflows/ci.yml:29`). The release branch cannot merge green as it
stands, and the first thing a new contributor sees after cloning is two
failures in code they did not write — with no way to tell they are pre-existing.

**Fix.** Code, in `validation/hash.test.ts`. Left for the owner; it is the one
P0 on this punchlist that this audit did not fix.

---

<a id="h-15"></a>

## H-15 — `make check` cannot go green from the README alone: `uv` is never mentioned

`Makefile:18-23`:

```make
docs-check: ## Check docs indexes, provenance files, design tokens, and run doc tests
	python3 scripts/docs_index.py --check
	python3 scripts/prov_check.py
	node scripts/provenance.mjs --check
	node scripts/contrast_check.mjs
	PYTHONPATH=scripts uvx pytest tests -q
```

`check` depends on `docs-check` (`Makefile:34`), so the last line runs on every
`make check`. `uvx` ships with [uv](https://docs.astral.sh/uv/); nothing in
`make setup` installs it, `package.json` has no `postinstall`, and the README's
only word on the subject is `README.md:90`:

> Node 20, pnpm 9. Python 3.12 is used only by the docs tooling.

A machine with Node, pnpm and Python 3.12 and no `uv` fails at the last line of
the first target `make check` runs. CI does not catch this because
`.github/workflows/ci.yml:27` adds `astral-sh/setup-uv@v5` before
`make setup`; a contributor's laptop has no such step.

The prerequisite *is* written down — `docs/runbooks/start-a-new-project.md:10-14`:

> 0. Prerequisites: `git`, `gh` (authenticated), and `uv`. Without `uv`,
>    `make setup` fails with `make: uv: No such file or directory`

— but that is the runbook for cookie-cuttering the template into a *new*
repository. Nobody contributing to Sailflow has a reason to open it, and the
README never links it.

**Impact.** The first command the Contributing section demands
(`README.md:149`, "`make check` green") fails on a correctly-provisioned
machine, with an error that names `uvx` and not the thing to install. This is
the documented contributor path, broken at step one.

**Fix.** Name `uv` in `README.md:90` alongside Node and pnpm, with the install
line. Docs-only.

---

<a id="m-16"></a>

## M-16 — `pnpm test:ui` fails on a fresh clone; the browsers are never installed

`README.md:86` offers:

```bash
pnpm test:ui    # Playwright: layout, a11y, 3D smoke, screenshots
```

`package.json:17` expands that to `pnpm build && playwright test`. There is no
`postinstall`, and `README.md` never mentions `playwright install`, so on a
fresh clone the run dies with Playwright's "Executable doesn't exist … run
`npx playwright install`". This audit's own sweep only ran because the machine
already had `~/.cache/ms-playwright/chromium-1234` from other work.

CI sidesteps it the same way as H-15: `ui-smoke` runs inside
`mcr.microsoft.com/playwright:v1.62.1-noble` (`.github/workflows/ci.yml:39`),
which ships the browsers.

**Impact.** Lower than H-15 — `test:ui` is not part of `make check`, and
Playwright's error message names its own fix. Still a documented command that
does not work as printed.

**Fix.** Add `pnpm exec playwright install chromium` to Quick start, or a
`postinstall`. Docs-only if the first.

---

<a id="m-17"></a>

## M-17 — "Node 20, pnpm 9" is asserted in prose and enforced nowhere

`package.json` at this commit declares neither `engines` nor `packageManager`:

```
$ node -e "const p=require('./package.json'); console.log(p.engines, p.packageManager)"
undefined undefined
```

So the only statement of the toolchain is `README.md:90`, and the only place it
is applied is `.github/workflows/ci.yml` (`pnpm/action-setup@v4` version 9,
`actions/setup-node@v4` node-version 20, in all three jobs). A contributor on
Node 18 or pnpm 10 gets whatever failure surfaces first — for pnpm, most likely
a lockfile the `--frozen-lockfile` in `make setup` refuses.

**Impact.** Contributor-time only, and the versions in the README are the right
ones. But the repo's stated posture is that claims are machine-checked, and
this claim is honour-code while the two-line fix exists.

**Fix.** Code — add `"engines": { "node": ">=20" }` and
`"packageManager": "pnpm@9.15.0"` to `package.json`; `corepack` then pins pnpm
for anyone who has it on. Left for the owner.
