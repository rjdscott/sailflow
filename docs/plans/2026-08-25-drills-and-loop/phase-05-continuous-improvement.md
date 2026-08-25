# Phase 05: Continuous improvement — gate, instrumentation, feedback

## Goal

The project learns from its users and its own numbers without a backend.
Closes M-27, M-29, M-30, L-05 (assessment only).

## Tasks

- [ ] CI runs `pnpm validate` and posts the hold-out table as a job summary (non-blocking) so a regression is visible on every PR; badge in README.
- [ ] Local-first instrumentation: counters in IndexedDB (screen visits, drills started/finished, Apply used, commit used), visible in More with an "export as JSON" button and nothing uploaded; ADR if it ever leaves the device.
- [ ] Feedback: "This felt wrong" on Race and Drills opens a prefilled GitHub issue URL with the scenario URL from phase 04 attached (no PII).
- [ ] Release surface: `CHANGELOG.md`, version from `package.json`, PWA update toast.
- [ ] Second-class readiness: list the hardcoded `j70.json` imports and estimate the boat-loading refactor (report only, no code).

## Verification

```sh
make check
```

## Artifacts

- `.github/workflows/ci.yml` validate job, `src/lib/telemetry.ts` + test.

## Progress log

_None yet._
