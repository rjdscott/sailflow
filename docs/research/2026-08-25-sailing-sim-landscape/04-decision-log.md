# 04. Decision log (owner Q&A, 2026-08-25)

Each row: question, options offered (recommended marked ★), owner's answer,
and where the decision now lives. Verbatim owner notes in quotes.

| # | Question | Answer | Lives in |
|---|---|---|---|
| 1 | Analyser vs simulator | ★ Both, staged: Epic 1 analyser, Epic 2 quasi-static time-domain, Epic 3 Rust engine | ADR 0004, plan README |
| 2 | Beginners | "Both from MVP" → confirmed as progressive disclosure + presets + coach line + ~10 static drills; spaced repetition and progression in Epic 2 | plan phases 04, 07 |
| 3 | Honesty claim | ★ Confidence tiers A/B/C rendered in UI | ADR 0006 |
| 4 | Hosting/runtime | ★ Pages + TS, ADR closed, "but massive backdoor for rust as my end goal is to make this the best simulator on the market… should we go all in now?" Recommendation given: incremental with backdoor built in (pure core, worker protocol, golden corpus); Rust engine written fresh at Epic 3 because the only real triggers are an authoritative multiplayer server and higher-fidelity aero. Owner accepted ★ incremental | ADR 0004 |
| 5 | Endgame | Yes multiplayer, may monetise. Open-core physics MIT, private server repo later. Repo stays public until a backend exists | ADR 0004, Epic 3 outline |
| 6 | Beginner MVP scope | ★ Minimal drills in MVP | plan phase 07 |
| 7 | Visuals | ★ 2D SVG/Canvas polished; three.js Epic 2 | ADR 0011 |
| 8 | Validation | ★ Hold-out gate: fit TWS 6/10/12/16/20, hold out 8/14 + TWA 60/90/120 | ADR 0007 |
| 9 | North guide | **Commit numbers anyway** (not recommended for a public repo; risk accepted by owner). Mitigation: one JSON per source, provenance inline, removable in one commit | ADR 0008 |
| 10 | Waves + crew | ★ Both in MVP | plan phase 02 |
| 11 | Timeline | ★ No hard deadline; clean template remnants first | plan phase 00 |
| 12 | UI stack | ★ Svelte 5 + Vite + TS | ADR 0005 |
| 13 | Second class | Yes, plan for it → one BoatDefinition JSON per boat, no plugin abstraction | plan architecture |
| 14 | Success metric | ★ Owner uses it before every J/70 regatta day | plan README |
| 15 | Execution | ★ Fable orchestrates and verifies; Opus/Sonnet build in parallel; one PR per logical change | CLAUDE.md |

Open items carried into Phase 00 PR review: delete
`docs/runbooks/start-a-new-project.md` (template's own runbook)? Commit the ORC
polar alongside the tuning guides (assumed yes, same policy as #9)?

Standing instruction from owner (mid-session): capture every decision,
research note and finding; update docs as-you-go so another session can resume
with minimal disruption.

## Decisions made during execution (2026-08-25)

| # | Decision | Where |
|---|---|---|
| 16 | Hold-out split by wind speed, not angle (first fit could not constrain the reaching regime) | ADR 0012 |
| 17 | Polar gate runs locally (`pnpm validate`), report committed; CI runs invariants + golden. Gate currently FAILs on 2 of 10 held-out rows and says so | phase-02 log, `validation/report.md` |
| 18 | Crew hike in proportion to heel (`hydro.hikeRampDeg`) so light air has an equilibrium | `src/core/solve/equilibrium.ts` |
| 19 | Race trim in VPP mode optimised through ORC `flat` only (backstay mapped from flat); full 11-control search is Epic 2 | `src/core/solve/optimal.ts` |
| 20 | `dockScore` protocol gained optional `candidates`; lap times memoised per boat | `src/worker/protocol.ts`, `src/core/solve/dock.ts` |
| 21 | Worker client JSON-round-trips every request (reactive proxies otherwise fail structured clone) | `src/worker/client.ts` |
| 22 | Third-party data policy applied to the ORC polar as well as the tuning guides (assumption flagged to owner) | ADR 0008 |
| 23 | Second autonomous block, 2026-08-25: UX audit first, then punchlist, then owner features (optimise, point-of-sail chips, motion). Scope Race + Dock, both personas judged equally | audit `ux-01`, plan `2026-08-25-ux-excellence` |
| 24 | Optimise on Race = ghost ticks marking the VPP optimum on every slider **plus** an Apply button; never silent, always tier-badged | plan phase 02 |
| 25 | Point-of-sail chips: Close-hauled and Run resolve to the VPP-optimal VMG angle at the current TWS; Close reach / Beam reach / Broad reach fixed at 60 / 90 / 135 | plan phase 01 |
| 26 | Cheap 2D motion now (telltale flutter, heel tilt, eased tweens, all honouring reduced-motion); North-Sails-style 3D sail rendering stays Epic 2 (E2-05) | plan phase 04, ADR 0011 |
| 27 | Owner runs the block autonomously end to end (audit → plan → build → merge → Pages check); stop only for decisions costing more than a day to unwind | this log |
| 28 | Race mode models sheeting angle vs AWA (luff / stall efficiency, invented, tier B); VPP mode keeps ORC ideal trim so calibration and the polar gate are unaffected | `src/core/shape/sheeting.ts`, plan ux-excellence phase 02 log |
| 29 | Audit `ux-02` (whole app + drills pedagogy + engagement benchmark): drills answer key fabricated, scoring blind; drills rebuilt as generated fault templates scored in control space (ADR 0013, proposed) | audit ux-02, ADR 0013 |
| 30 | Continuous improvement without a backend: CI hold-out visibility, local-first instrumentation, prefilled GitHub-issue feedback | plan drills-and-loop phase 05 |
