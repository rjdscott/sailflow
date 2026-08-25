# Phase 05: Continuous improvement — gate, instrumentation, feedback

## Goal

The project learns from its users and its own numbers without a backend.
Closes M-27, M-29, M-30, L-05 (assessment only).

## Tasks

- [x] CI runs `pnpm validate` and posts the hold-out table as a job summary (non-blocking) so a regression is visible on every PR; badge in README.
- [x] Local-first instrumentation: counters in IndexedDB (screen visits, drills started/finished, Apply used, commit used), visible in More with an "export as JSON" button and nothing uploaded; ADR if it ever leaves the device.
- [x] Feedback: "This felt wrong" on Race and Drills opens a prefilled GitHub issue URL with the scenario URL from phase 04 attached (no PII).
- [x] Release surface: `CHANGELOG.md`, version from `package.json`, PWA update toast.
- [x] Second-class readiness: list the hardcoded `j70.json` imports and estimate the boat-loading refactor (report only, no code).

## Verification

```sh
make check
```

## Artifacts

- `.github/workflows/ci.yml` validate job, `src/lib/telemetry.ts` + test.
- `src/lib/feedback.ts` + test, `CHANGELOG.md`,
  `docs/research/2026-08-25-sailing-sim-landscape/05-second-class-readiness.md`.

## Progress log

### 2026-08-25 — phase complete, `make check` green

**M-27, CI gate visibility.** New `validate` job in `.github/workflows/ci.yml`:
`make setup` + `make validate` (i.e. `pnpm validate` — the polar vitest config
then `validation/report.ts`), `continue-on-error: true`, an awk pass that puts
the two HELD-OUT tables and the whole Gate section into
`$GITHUB_STEP_SUMMARY`, and `upload-artifact` for `validation/report.md`. The
`check` job is untouched, so the blocking gate is unchanged. A shields badge
was skipped: there is no endpoint that reflects a `continue-on-error` job's
real verdict, and a green badge over a FAILing gate is exactly the dishonesty
M-27 is about — README gets a prose "Model honesty" section pointing at the
report and `docs/runbooks/run-validation-and-recalibrate.md` instead. The
Makefile's `validate` help text no longer says "local only".

Running it regenerated `validation/report.md`: every number is identical, only
the `Generated`/`Commit` header moved (`fac5333` → `f15c3e9`), which was the
staleness M-27 flagged. Gate verdict is unchanged: FAIL, 21/25 gated rows in
tolerance.

**M-30, local-first instrumentation.** `src/lib/telemetry.ts`: a fixed
`TELEMETRY_EVENTS` enum (five screen views + `view.kit`, drill started/checked,
apply optimum, dock commit, log saved) with `count`, `track`, `snapshot`,
`exportJson`, `reset`. IndexedDB db `sailflow.telemetry.v1`, whole map under
one key so a count is one get + one put inside a single transaction (chained in
the request callback — an IDB transaction commits the moment control returns to
the event loop, so `await`-then-`put` would throw). Ten counters do not need an
index. No network path at all, and `telemetry.test.ts` asserts that against the
module source text (comments stripped first, since the module talks *about*
`fetch`) — an eslint rule would have needed a custom plugin to say the same
thing. Wired only at the router (`view.<route>` on construct and on a real
hash change); `track()` is exported for Race/Drills/Dock/Log to call when
those files are free.

**M-29, feedback.** `src/lib/feedback.ts` `feedbackUrl({route, version,
scenarioUrl?})` builds a `github.com/rjdscott/sailflow/issues/new` URL with a
titled prefill and a body carrying screen + version, a placeholder for the
phase-04 scenario URL, and a line saying nothing was attached automatically. No
labels param (GitHub rejects labels that do not exist yet), no counters, no
PII. Exported so Race and Drills adopt it with one link each.

**L-04, release surface.** `CHANGELOG.md` in Keep-a-Changelog form, 0.1.0
seeded from the squash-merged PR titles #1–#40 read via `gh pr list`, plus an
Unreleased section for this phase. `VITE_APP_VERSION` already existed
(`vite.config.ts` reads `package.json`), so More's version line just gained a
"what's new" link to the changelog — no new plumbing. `package.json` is left at
0.1.0: the bump belongs to whoever cuts the release batch, not to one phase
mid-plan. The native `confirm()` moved out of `src/main.ts` into `App.svelte`
as a `Toast` with a Reload action (`Toast` gained an optional `action` prop);
20 s auto-dismiss rather than sticky, because `registerType: 'autoUpdate'`
means the new SW takes over on the next navigation regardless.

**More screen.** One new "Improve Sailflow" card in `col-secondary`, deliberately
clear of the Data card another agent is editing in `col-primary`: the counts,
"Export usage JSON" (reusing `download` from `logExport.ts`), "Reset", the
"nothing leaves this device" sentence, and the "This felt wrong" link. Expect
a merge on the two version/changelog lines in the About card at most.

**L-05.** `docs/research/2026-08-25-sailing-sim-landscape/05-second-class-readiness.md`:
the eight production `data/boats/j70.json` import sites with what each takes
from the boat, the four non-app sites (harness, fitter, `provenance.mjs`'s
by-name read), the 14 test files that should keep importing the J/70 directly,
three sibling couplings the audit did not list (tuning guides in
`reference.ts:14-15` and the literal path in `disagree/Panel.svelte:319`,
`data/drills/j70-static.json`, the polar), and a ~2-day estimate. No code
changed.

**Verification.** `make check` green: docs-check (indexes, provenance, 10 doc
tests), lint, `svelte-check` 0 errors, 734 tests in 49 files — 14 of them new
(`telemetry.test.ts`, `feedback.test.ts`). `pnpm build` green, PWA chunk still
emitted after moving `registerSW` into `App.svelte`.

**Not done here, on purpose.** `track()` is not called from Race, Drills, Dock
or Log — those files belong to other agents this session, so the counters for
`drill.started`, `drill.checked`, `race.applyOptimum`, `dock.commit` and
`log.saved` read 0 until one `track(...)` line lands in each. The "This felt
wrong" link is on More only, for the same reason; `feedbackUrl` takes an
optional `scenarioUrl` so phase 04's addressable URLs drop straight in.
