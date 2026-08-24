# 03. Innovation candidates, ranked by value ÷ cost

Borrowed from flight sims, sim racing telemetry (VRS, Hotlap.ai), chess
puzzle trainers (Lichess spaced repetition), Zwift progression, golf trainers.

1. **Ghost/delta replay against a reference lap.** Overlay your beat against a
   fast reference aligned by distance up the course; delta trace shows where
   and which channel (heel, VMG, sheet, angle) lost distance. Nothing in
   sailing has this. Cheap once a state vector exists. (Epic 2)
2. **C.9.5 rig-tune bet as a game mechanic.** Commit rig for a forecast band,
   breeze does what it does, you are locked. Score the tune separately from the
   sailing. Unique to one-design; one screen. (Epic 1 Dock mode)
3. **Trim puzzles with spaced repetition.** 30-second scenarios rated by solve
   history, failed ones resurface at 1/3/7 days. Highest learning per minute;
   works on a phone in 3 minutes. (Static drills Epic 1; SR Epic 2)
4. **Telltale/leech feedback tied to the force model.** North gives numeric
   targets (top leech telltale stalling 50–70%); render stall from computed
   local AoA so the cue is the physics. (Epic 1 plan view)
5. **"Why am I slow?" coach.** Deterministic, no LLM: rank deficits from the
   VPP optimum, say the biggest one. (Epic 1)
6. **Progression ladder + unlockable conditions.** Zwift-style. (Epic 2)
7. **Asynchronous ghost racing on a daily deterministic seed.** 80% of the
   competitive pull, zero server. (Epic 2)
8. **Seeded daily race + global leaderboard.** Needs Worker + KV. (Epic 3)
9. **Crew weight / hiking / boathandling as first-class inputs;** manoeuvre
   trainer scoring tack/gybe/set/douse VMG loss. (Epic 2)
10. **Import your own polar / tune sheet** to calibrate to your boat. (Epic 2)

Deliberately excluded: VR, real-time physics multiplayer before Epic 3,
in-browser sail CFD, accounts before a backend exists.
