# Race mode as a cockpit: what makes a great simulator control centre

- **Question:** If Race mode is rebuilt as a cockpit / control centre —
  controls grouped logically, each visual beside the controls that move it,
  a dark instrument aesthetic, a real 3D sail view — what does the evidence
  say the layout, grouping, widgets, and rendering stack should be?
- **Date:** 2026-08-25
- **Method:** Four parallel research agents: (1) map of the current Race
  screen (kept in the plan, not here); (2) instrument and simulator UX
  survey, 47 sources across marine instruments, sailing sims, glass
  cockpits, sim racing, HCI research, web tech; (3) J/70 trim mental model
  from tuning guides, speed guides and top-team interviews, 20 sources;
  (4) WebGL sail rendering stack, 35 sources. Two rounds of owner Q&A
  (decision log rows 35–43).

## Files

1. `01-instrument-and-simulator-ux.md`: sources, findings, 27 design
   principles ranked by evidence strength, five layout patterns worth
   stealing, thin-evidence list.
2. `02-j70-trim-mental-model.md`: crew roles, the control set with gear
   order, feedback cues and which a simulator can render, coaching
   frameworks, recommended panel grouping, contradictions between
   sailmakers.
3. `03-webgl-sail-rendering.md`: library sizes measured today, sail loft
   algorithm from sectional shape, rig and procedural hull, camera,
   performance, determinism testing, risks.

The decision log for this block continues in
[`../2026-08-25-sailing-sim-landscape/04-decision-log.md`](../2026-08-25-sailing-sim-landscape/04-decision-log.md)
(rows 35 onward) so the whole project's audit trail stays in one table.

## Verdict (summary; decisions live in ADRs 0014 and 0015)

Group by sail system, not crew seat — ownership varies by team, the sail a
control moves does not. Put each visual beside its controls (Proximity
Compatibility Principle) but keep every channel separately readable.
Never show a bare number: target bug + trend + labelled delta. Density
tiers are a requirement, because the glass-cockpit literature says
consolidation helps the trained and hurts the novice. Raw three.js in a
lazily loaded chunk is the only 3D stack that pays for itself here.
