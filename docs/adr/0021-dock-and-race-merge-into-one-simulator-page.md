# 0021. Dock and Race merge into one Simulator page, with the conditions as an editable half of the instrument band

- **Status:** Accepted
- **Date:** 2026-08-28

## Context

The app has two primary screens because the J/70 class rule C.9.5(a) freezes
the standing rigging once the boat leaves the dock: Dock is the half hour
before (forecast, shroud turns, forestay, commit), Race is the half hour
after (sheets, leads, traveller, backstay). The split was chosen so the app
never suggests a shroud change on the water ([0015](0015-cockpit-panels-by-sail-system-with-density-tiers.md)
and the first-run tour, `src/ui/onboarding/steps.ts`).

Audit [ux-04](../audits/2026-08-28-ux-04/) shows the split costing more than it
protects. The conditions the model solves for (wind speed, wind angle, sea
state, crew) live in a 28 px chip rail at the far edge of the Race header,
collapse to `10 kt` + `Edit` on a phone, and are not mentioned by the tour.
The Race screen already carries a Rig panel with the shroud sliders and a
"Set it on the dock →" link; Dock carries its own copy of crew weight and
sea state. A user learning how a rig is tuned wants to move a shroud and
watch the sail shape and the speed change *in the same place*, and the
owner's stated audience — a skipper and sailing friends, then the wider
class — is people learning, not people committing a rig at 08:30 on a race
morning.

Constraints that stay: no number without provenance; every output carries a
tier; the solver boundary (`src/worker` protocol) is unchanged; share links
keep working through the migration table ([0019](0019-share-links-are-a-versioned-query-with-a-migration-table.md)).

## Options considered

**A. Keep Dock and Race, move the conditions into the Race instrument band.**
- Pros: smallest change; fixes the audit's Highs on their own.
- Cons: the rig is still two taps and a mental model away from the sails;
  crew and sea state stay duplicated; the tour still has to explain why
  there are two screens.

**B. One Simulator page: the Race cockpit absorbs the Dock.**
Forecast, regret, suggest and commit become part of the Rig panel on the
cockpit; conditions become the right half of the instrument band; `#/dock`
and `#/race` redirect to `#/sim`; the nav drops to four items.
- Pros: one place to tweak everything — the owner's ask; cause and effect
  (shroud turn → sag → jib entry → speed) is visible on one screen; kills
  three duplicated inputs; the tour has one screen to explain.
- Cons: the cockpit is denser; the "rig is frozen on the water" lesson must
  be carried by copy and by the commit affordance instead of by
  navigation; Dock's print card and the Dock share link need a new home;
  ~3 days of work across `Race.svelte`, `Dock.svelte`, the Rig panel, nav,
  router, tour and the UI snapshots.

**C. One Simulator page with the Dock as a modal "morning" wizard.**
- Pros: keeps the commit ceremony intact.
- Cons: a wizard is exactly the two-tap distance the owner is removing;
  the forecast band (min/likely/max) is worth seeing *while* tuning.

## Decision

**We will merge Dock into the Race cockpit as one Simulator page (option B),
because the audience is learning how a rig and sails interact and that is
only visible when every input sits on one screen.** Scope: the UI shell,
routes, nav, tour, and the Rig panel. The solver protocol, the Dock and
Race stores' logic, and the rig-lock persistence are kept; the lock becomes
an optional "Commit for today" on the Rig panel that greys the shroud
sliders and stamps the tuning log, not a separate screen.

Concretely:
1. Route `sim` is the default; `race` and `dock` parse to `sim` (with the
   Dock's `?f=` forecast params mapped onto the Rig panel's forecast band).
2. The instrument band is split: left half is what the boat is doing
   (BSP · %polar · VMG · heel · helm), right half is what the world is
   doing (TWS · TWA rose · sea state · crew · sail set), every right-hand
   value directly editable. `ConditionsStrip` and the `Edit` sheet go.
3. The Rig panel gains the forecast band (min / likely / max wind), the
   expected-regret readout, `Suggest a setup`, and `Commit for today`.
   The regret-by-wind-speed table and the print card move behind a sheet.
4. Nav: Simulator · Log · Drills · More.

## Consequences

Easier: one screen to teach from; one home per input; the tour has one
card about conditions and one about the rig; the phone order can be
conditions → numbers → boat → panels.

Harder: the Rig panel is the densest panel on the screen and must read at
Learn density; the "frozen on the water" rule is now a sentence and a lock
toggle rather than a screen boundary, so the copy has to carry it.
Committed to: `#/sim` as the permanent public URL, the split band as the
instrument contract for `DrillView` too.

Unwind cost: about a day — the Dock screen and its stores still exist
until the phase that deletes them; routes are a table.

**Revisit when:** a user commits a rig, changes a shroud on the Simulator
after committing without noticing the lock, and reports it — or when the
Rig panel's content at Learn density exceeds one phone viewport (844 px)
and the panel needs to split again.

## Related

- Audit [ux-04](../audits/2026-08-28-ux-04/) — findings H-01..H-04 and the
  band layout in `01-entry-and-conditions.md`.
- Plan [2026-08-28-simulator](../plans/2026-08-28-simulator/).
- [0015](0015-cockpit-panels-by-sail-system-with-density-tiers.md) — the
  cockpit this extends; its panel-by-sail-system rule is kept, the Rig panel
  is the fourth system.
- [0016](0016-cockpit-sizes-to-content-page-scrolls.md) — still governs.
- [0019](0019-share-links-are-a-versioned-query-with-a-migration-table.md)
  — the route change is a migration entry, not a break.
