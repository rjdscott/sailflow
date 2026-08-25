# 0008. Third-party reference data is committed to the repo with inline provenance

- **Status:** Accepted
- **Date:** 2026-08-25

## Context

The disagreement panel compares the model against the North and Quantum J/70
tuning guides, and calibration targets the ORC J/70 Speed Guide polar. All are
freely downloadable PDFs published by their owners for sailors to use, but
they are copyrighted works and this repository is public under MIT. The
original brief required loading them at runtime from a gitignored file so
nothing third-party is committed. The adversarial review found that this makes
the headline feature dead for 95% of visitors and makes any CI validation gate
decorative.

## Options considered

**A. Gitignored runtime tables** (the brief): user obtains and types in the numbers.
- Pros: zero redistribution risk.
- Cons: the panel is empty for nearly everyone; CI cannot run the polar gate;
  every contributor must transcribe the same PDFs.

**B. Importer + request permission from the publishers**: ship a paste-and-parse
importer, email North and Quantum for redistribution with attribution.
- Pros: clean; likely granted for a free training tool.
- Cons: weeks of latency; feature still empty until then.

**C. Commit the numbers with provenance, one JSON per source, attribution
inline, removable in one commit** (owner's decision).
- Pros: feature works on day one; CI gate is real; transcription done once.
- Cons: redistributes tabular settings from copyrighted guides. Tables of
  factual settings enjoy thin copyright protection, and the publishers
  distribute the guides freely, but a takedown request is possible.

## Decision

**We will commit the North and Quantum tuning-guide settings and the ORC
Speed Guide polar under `data/` as one JSON file per source with a `source`
block (title, URL, retrieval date, revision, copyright holder), because the
owner has weighed the redistribution risk against a dead headline feature and
accepted it.** Every file is removable in a single commit; the app must
degrade honestly (`reference tables not loaded`) if one is removed. The
importer from option B is still built so users can load a newer revision.

## Consequences

Easier: disagreement panel and polar gate work out of the box; contributors
share one transcription. Harder: a takedown means removing a file and
re-running calibration against whatever remains. Committed to: attribution in
`PROVENANCE.md` and in the app's provenance screen; never restating the
guides' prose, only their settings. Risk accepted by the owner: copyright
challenge from a publisher.

**Revisit when:** a publisher objects, or a publisher grants explicit
permission (then record it here and drop the caveat).

### Consequences — 2026-08-26 note (audit docs-consistency-01)

The tuning-guide importer from option B was **not built** (H-18): the only
import path in the app is the tuning-log JSON. Deferred indefinitely — a
stale or withdrawn guide revision leaves users with "not loaded" and no
in-app recovery until it exists.

## Related

- Research: [01-adversarial-review §5–6](../research/2026-08-25-sailing-sim-landscape/01-adversarial-review.md), decision-log row 9
- Supersedes the licensing constraint in `docs/initial-prompt.md` §Licensing
