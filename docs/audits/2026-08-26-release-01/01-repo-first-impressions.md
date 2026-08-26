# Repo first impressions

`README.md`, `CLAUDE.md`, `CHANGELOG.md`, `ASSUMPTIONS.md`, `PROVENANCE.md`,
`LICENSE`, the five `docs/*/README.md` indexes and
`docs/plans/2026-08-26-phase-two/`, read as the front door of a repository
nobody has seen before. Every quantitative claim was re-derived rather than
trusted.

**Link check.** All relative links in those files resolve. A script walked
every markdown link in the 17 files in scope and reported two hits, both in
`docs/adr/README.md:18-19` where `NNNN-slug.md` and `...` are the documented
filename *convention*, not links. No action.

**Claims that hold.** 17 ADRs (`ls docs/adr/[0-9]*.md | wc -l` → 17); 1167
tests in 73 files (`pnpm vitest run` → `Tests 1167 passed`), so "1100+"; 65
golden cases (35 + 12 + 18 across `validation/golden/*.json`); ~26 k lines of
app code (26,500); every command in Quick start exists in the `Makefile` or
`package.json`, and `make help` prints all eleven targets.

---

<a id="h-01"></a>

## H-01 — The README's "known limitation" reverses the sign of every number in it

`README.md:52-61` is the paragraph the whole honesty pitch rests on. All four
residuals it quotes are wrong, and the two downwind angles are swapped.

README:55-57:

> The two misses are both at 14 kt: upwind VMG (**5.8 % slow**, **1.8° high**)
> and downwind VMG (**15 % slow**, and **the model runs 172° where the polar
> gybes at 146°**).

`validation/report.md:60-61`, the TWS 14 kt HELD-OUT table
(`row | polar bs | model bs | bs err | polar twa | model twa | twa err`):

```
| vmgUp jib  | 5.89 | 6.23 |  5.8 % | 38.0  | 39.8  |  1.8° | … | **FAIL** |
| vmgDn asym | 6.26 | 7.21 | 15.1 % | 172.0 | 146.5 | 25.5° | … | **FAIL** |
```

- Upwind: model 6.23 kt against a polar of 5.89 — the model is 5.8 %
  **fast**, not slow.
- Upwind angle: model 39.8° against a polar of 38.0° — the model sails 1.8°
  **wider**, i.e. lower, not "high".
- Downwind: model 7.21 kt against a polar of 6.26 — 15 % **fast**, not slow.
- Downwind angle: the **polar** runs 172°; the **model** gybes at 146.5°. The
  README names them the wrong way round, which inverts the physical story:
  the miss is that the model refuses to soak deep, not that it soaks too deep.

Two other surfaces have it right, so this is a README-only defect, not a model
one. `ASSUMPTIONS.md:20-26` says "the model is ~5 % slow at 6 kt and ~6–8 %
fast at 16–20 kt" and "ORC's downwind optimum jumps 150° → 172° … the model
stays near 147°". `docs/plans/2026-08-25-mvp-analyser/phase-02-solver-calibration-validation.md:42`
records "TWS 14 asym vmgDn **+15 %/−25°**".

**Impact.** A sailor reading the README expects the app to be conservative
— under-predicting speed, sailing low. It does the opposite on both counts. An
engineer who then opens `validation/report.md` finds the README contradicting
the artefact it links to in the previous section. For a project whose stated
differentiator is that it does not fudge numbers, this is the worst possible
place to have four of them backwards.

**Fix.** Rewrite `README.md:55-57` against `validation/report.md:60-61` and
`ASSUMPTIONS.md:20-26`.

---

<a id="h-02"></a>

## H-02 — The published validation report identifies a model that no build at this commit produces

`README.md:37-40` calls `validation/report.md` the public validation artefact.
The report names the model it scored by hash, and says why
(`validation/report.md:3-9`, as shipped at this commit):

> - **Boat:** `j70` — geometry hash `3527bccc`
> …
> The boat and calibration hashes above identify the model these numbers came
> from.

Regenerating at HEAD:

```
$ cp validation/report.md /tmp/report-shipped.md && pnpm validate
…
wrote …/validation/report.md in 13.0 s
$ diff /tmp/report-shipped.md validation/report.md
3,4c3,4
< - **Generated:** 2026-08-25 23:40:47 UTC
< - **Boat:** `j70` — geometry hash `3527bccc`
---
> - **Generated:** 2026-08-26 00:36:28 UTC
> - **Boat:** `j70` — geometry hash `6272af4c`
```

Every solved number is byte-identical; only the identifier moved. The shipped
report was generated at 2026-08-25 23:40, before PR #88 changed what the boat
hash covers (`CHANGELOG.md:37-38`, "Boat hash covers solver data only"), and
was never regenerated.

**Impact.** The one field whose entire job is to let a reader confirm which
model produced the table names a model identity that no longer exists. Anyone
following `docs/runbooks/run-validation-and-recalibrate.md` gets a different
hash and has to work out whether the model drifted or the file is stale.

**Fix.** `pnpm validate`, commit the regenerated report. (README:37's "is
regenerated on every push" is also loose: CI regenerates it into the job
summary and an artifact — `.github/workflows/ci.yml:90-113` — the committed
file is updated by hand.)

---

<a id="m-03"></a>

## M-03 — The README ships an internal note pointing at a directory that does not exist

`README.md:21`:

```html
<!-- screenshot: docs/img/race-desktop.png (1920×1080, Race, kite up) -->
```

`ls docs/img` → `No such file or directory`. `docs/` contains `adr audits
initial-prompt.md plans research runbooks` and nothing else.

**Impact.** A note-to-self left in the front door of a public repo, and the
README of an app whose selling point is a 3D visualisation carries no image at
all. Anyone reading the source of the README sees an unfinished document.

**Fix.** Either capture the screenshot and reference it, or delete the
comment. Do not leave both the placeholder and the gap.

---

<a id="m-04"></a>

## M-04 — CHANGELOG bills three PRs to two different releases

`CHANGELOG.md:69` opens the 0.2.0 section with "Everything from #41 to #80".
The 0.3.0 section above it claims three PRs inside that range:

- `CHANGELOG.md:40` — "**First load −31 %** (#78, ux-03 M-23)"
- `CHANGELOG.md:47` — "**The kite's head opens as the sheet eases** (#80)"
- `CHANGELOG.md:56` — "**The 3D perf gate measures work, not the clock**
  (#66)", which 0.2.0 already describes at `CHANGELOG.md:171` ("the 350 ms
  first picked was raised after a cold desktop GPU measured 315 ms, #66")

Both sections are dated 2026-08-26, so the two releases cannot be separated by
date either.

**Impact.** The changelog is the only place a reader can find out what shipped
when. Three entries appear twice, and the "#41 to #80" range is the claim that
makes it wrong.

**Fix.** State 0.2.0's range as the PRs it actually contains and drop the
duplicated #66 entry from one of the two sections.

---

<a id="m-05"></a>

## M-05 — The README's documentation table miscounts two of the five surfaces

- `README.md:126` — "Point-in-time sweeps (**UX ×3, docs consistency**)".
  `docs/audits/` holds four at HEAD and five once this audit lands.
- `README.md:128` — "Deploy, release and cache-bust, recalibrate, add a boat,
  add a drill", five runbooks. `ls docs/runbooks/*.md` returns seven:
  `export-import-tuning-log.md` and `start-a-new-project.md` are unlisted.

**Impact.** Small on its own; in a README whose pitch is that the counts are
checked, an enumerable list that does not match `ls` is the cheapest possible
way to lose a reader's trust.

**Fix.** Count them, or stop enumerating and describe the surface instead.

---

<a id="m-06"></a>

## M-06 — Two clicks in, the docs speak a vocabulary the front door never introduces

`README.md:132` sends a stranger to `docs/plans/README.md` "for what is done
and what is next". From there the first plan in the table is
`2026-08-25-mvp-analyser`, whose fifth line reads:

`docs/plans/2026-08-25-mvp-analyser/README.md:5`

> - **Owner:** Rob Scott, executed autonomously by Claude (Fable orchestrating,
>   Sonnet/Opus subagents)

The same vocabulary runs through the progress logs and the published audit
method lines — "Built by an Opus agent in a worktree"
(`phase-04-race-mode.md:30`), "six lenses … on Opus … synthesis by Fable"
(`docs/audits/2026-08-25-ux-01/00-executive-summary.md:29-31`), and a dozen
more. `README.md` and `CLAUDE.md` never mention that the repo was built this
way.

**Impact.** A reader hits unexplained proper nouns in what is otherwise a
carefully written corpus and cannot tell whether they are people, tools, or
internal codenames. The information itself is worth having — it is a genuinely
unusual provenance story and the repo is honest about everything else — it is
just never introduced.

**Fix.** One sentence in the README saying how the repo was built, so the
progress logs parse. The progress logs and published audits are append-only
and immutable by convention (`docs/plans/README.md`, `docs/audits/README.md`)
and must not be rewritten to remove the terms.

---

<a id="l-07"></a>

## L-07 — "~12 k lines of tests" is 13.9 k

`README.md:115`. Measured:

```
$ find src calibration validation tests -name '*.test.ts' -o -name '*.spec.ts' | xargs wc -l | tail -1
   13913 total
```

16 % under. The neighbouring figures in the same sentence (26 k app lines, 17
ADRs) are accurate, which is what makes this one stand out.

**Fix.** `~14 k`.

---

<a id="l-08"></a>

## L-08 — The plans index credits phase-two with activity that never happened

`docs/plans/README.md:53`:

```
| [2026-08-26-phase-two](2026-08-26-phase-two/) | Phase two: … | 🔵 Not started | 2026-08-25 |
```

A plan created on 2026-08-26 reporting its last activity as the day before,
with every phase at `🔵 Not started` and every progress log empty. The cause is
`scripts/docs_index.py:67-88`: `latest_date()` takes the newest `YYYY-MM-DD`
appearing *anywhere* in the plan tree, and phase-two's newest is a
cross-reference — `docs/research/2026-08-25-spinnaker/` at
`docs/plans/2026-08-26-phase-two/README.md:63`.

**Impact.** Cosmetic today. It matters because the same function feeds the
60-day staleness gate the plans README advertises as enforced: a plan can keep
itself looking fresh by citing a dated directory.

**Fix.** Code, not docs. Restrict `latest_date()` to dates in progress-log
lines, or exclude dates that are part of a path. Left for the owner.

---

<a id="l-09"></a>

## L-09 — `CLAUDE.md` is offered as "the engineering rules" and opens with template boilerplate

`README.md:133` and `README.md:151` both send readers — including would-be
contributors — to `CLAUDE.md` for the rules. Its first line is:

`CLAUDE.md:3-4`

> Template repo conventions. Everything above the "This project" section is
> generic and travels to every project unchanged.

The Sailflow-specific rules start at `CLAUDE.md:123` ("## This project"). The
122 lines before it describe a documentation scaffold's tiers and skills, and
link `docs/runbooks/start-a-new-project.md` — a runbook about cookie-cutting
the template, whose index entry reads "2026-08-07 against 6ced8b9 (template
repo; **not a commit in this repository**)".

**Impact.** A contributor who wants "branch, `make check`, provenance, tiers"
reads two pages about a doc scaffold first. Nothing is wrong, it is just not
what the README promised.

**Fix.** Point the README's two links at `CLAUDE.md#this-project`, which is
where the rules it summarises actually live.
