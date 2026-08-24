# Sailing simulator landscape, physics evidence base, and brief review

- **Question:** Can a free, GitHub-Pages-hosted, J/70-specific web trainer be
  the best sailing simulator on the market, and does it need a Rust physics
  backend? Is `docs/initial-prompt.md` the right brief?
- **Date:** 2026-08-25
- **Method:** Three parallel research agents: (1) adversarial review of the
  brief as VPP engineer + product lead, with ORC VPP Documentation 2023 read in
  full; (2) web survey of existing sims, public physics resources, and web
  tech; (3) repo scan. Followed by four rounds of owner Q&A.

## Files

1. `01-adversarial-review.md`: 18 findings against the brief, severity-tagged.
2. `02-market-and-physics.md`: competitor survey, public physics sources, tech.
3. `03-innovation-candidates.md`: ranked feature ideas from other training domains.
4. `04-decision-log.md`: every owner Q&A answer, verbatim intent, with the
   recommendation that was offered. Decisions are promoted to ADRs; this file
   is the audit trail.

## Verdict (summary; decisions live in ADRs)

Gap is real and specific. Physics is not the blocker. Rust is not needed until
multiplayer. The brief describes an analyser, not a simulator, and its
validation scheme is a curve fit. See ADR 0003 onward.
