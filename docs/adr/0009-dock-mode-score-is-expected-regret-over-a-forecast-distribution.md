# 0009. Dock-mode score is expected regret in seconds per mile over a forecast distribution

- **Status:** Accepted
- **Date:** 2026-08-25

## Context

J/70 rule C.9.5 locks shrouds and forestay from leaving the dock until racing
ends for the day. The rig is therefore a bet on the day's wind, and the app's
most valuable question is "what does this bet cost if the breeze lands at the
top or bottom of the forecast?". The number must be comparable across setups,
robust to the analyser's absolute-speed error, and meaningful to a racer.

## Options considered

**A. Score at a single wind speed** (the likely value).
- Pros: one solve.
- Cons: answers the question the sailor did not ask; ignores the range.

**B. Sum of VMG across the range.**
- Pros: simple.
- Cons: mixes units; a fast setup in 20 kt hides a slow one in 8 kt; not
  interpretable.

**C. Expected regret in time per mile** (chosen): for each wind speed in the
forecast, lap time of a windward-leeward mile with the best race trim for that
setup, minus the lap time of the best possible rig for that wind speed;
weighted by a triangular distribution over min/likely/max.
- Pros: unit is seconds per mile, what racers feel; absolute model bias
  cancels because both terms come from the same model; the ends of the range
  are reported explicitly.
- Cons: needs a candidate grid to define "best possible rig"; several hundred
  VMG solves per scoring.

## Decision

**We will score a dock setup as Σ_w p(w)·(T(S,w) − T*(w))·3600 with
T(S,w) = 1/VMGup + 1/VMGdn, race trim re-optimised at each w, T*(w) the
minimum over a coarse legal grid of setups, and p(w) triangular on a 1-kt grid
with a 5 % floor so the range ends always count, because regret measured in
time is the only quantity that stays honest when the absolute model is
uncertain.** Reported alongside: regret at the forecast minimum and maximum,
the worst wind speed, and the setup that would have been best there.

## Consequences

Easier: an interpretable number, direct comparison of setups, the "cost at
each end" the brief asked for. Harder: cost of ~15 wind speeds × grid × 2 VMG
solves per scoring; the candidate grid defines the reference and must be
legal and reasonably fine. Committed to: the grid in
`src/core/solve/dock.ts`, the pmf shape, the tiering rule (A inside the polar
range under jib, C above 20 kt). Risk accepted: the grid may miss a better
setup, making regret slightly optimistic.

**Revisit when:** dock scoring exceeds one second on a mid-range phone after
caching, or users ask for a non-triangular forecast.

## Related

- Research: [03-innovation-candidates §2](../research/2026-08-25-sailing-sim-landscape/03-innovation-candidates.md)
- `src/core/solve/dock.ts`
