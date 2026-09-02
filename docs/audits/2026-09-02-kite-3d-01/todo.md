# Punchlist — kite-3d-01

Priority: **P0** ship-blocker, **P1** before the next release, **P2** soon,
**P3** nice. Effort in brackets (S under an hour, M a session, L more than a
day). Details in [01-gennaker.md](01-gennaker.md),
[02-plan-view.md](02-plan-view.md),
[03-3d-scene-and-cameras.md](03-3d-scene-and-cameras.md) and
[04-phone-and-chrome.md](04-phone-and-chrome.md). Remediation PRs cite the
code. Re-shoot with `node scripts/shoot_matrix.mjs <dir>` and compare against
the state named in each finding before ticking.

## P0 — the picture lies about trim

- [ ] **C-02** (P0, M) Loft the kite edge to edge: add a per-section rise so each row runs from the luff point to the leech point at its own knot, so the drawn corner equals `kiteGeometry().clew` at every sheet setting and the foot leaves the sheer. Test: drawn corner within 1 cm of the clew, mesh minimum y never below `tack.y − FOOT_SKIRT_M`, for all sheet × tack states. [01](01-gennaker.md#c-02)
- [ ] **C-01** (P0, S) One `setSailSet` on the race store that the conditions-band SAIL cell, the point-of-sail chips and the share link all route through; jib→asym applies `BASE_RACE_DOWN`, undoable. [03](03-3d-scene-and-cameras.md#c-01)

## P1 — before the next release

- [ ] **H-10** (P1, S) Clamp the fitted camera above `WATER_Y` in `presetPose` and the resize refit; re-pose `luff`; spec asserting every preset's eye is above the water on both tacks. [03](03-3d-scene-and-cameras.md#h-10)
- [ ] **H-06** (P1, S) Drop the `helm` fit exemptions and re-pose it so hull and boom are in frame. [03](03-3d-scene-and-cameras.md#h-06)
- [ ] **H-11** (P1, M) `MAST_STATION = rig.jM / hull.loaM`; move cabin and cockpit forward with it; delete `KITE_SCALE_X`; re-baseline the plan tests and rewrite the two ASSUMPTIONS rows. [02](02-plan-view.md#h-11)
- [ ] **H-02** (P1, S) Give `PLAN_LAYOUT` an `asymTop` and widen `asymHalfW`; extend the fit test to both axes across the four downwind controls and the solved AWAs. [02](02-plan-view.md#h-02)
- [ ] **H-03** (P1, M) Draw the plan kite from the lofted sections (luff ends down, leech ends back), not from three projected edges. [02](02-plan-view.md#h-03)
- [ ] **H-01** (P1, S) Let the plan svg fit its slot (`max-height`) and give the layout bottom slack so the transom and heel tag render on desktop. [02](02-plan-view.md#h-01)
- [ ] **H-05** (P1, S) Restore the caption and the `?` explainer on the desktop plan flank. [02](02-plan-view.md#h-05)
- [ ] **H-04** (P1, S) Plan jib telltales: fan them just aft of the luff, or draw one per sail and leave heights to the 3D hero. [02](02-plan-view.md#h-04)
- [ ] **H-12** (P1, L) Design pass on the kite's twist: drive the leech's per-height azimuth from a published twist profile, assert emergent twist positive and monotone at AWA 69/93/118/159. Depends on C-02. [01](01-gennaker.md#h-12)
- [ ] **H-07** (P1, S) Style `button.chip[aria-pressed='true']` like the Segmented control. [04](04-phone-and-chrome.md#h-07)
- [ ] **H-08** (P1, S) Scroll the active point-of-sail chip into view and shorten labels under 720 px so all five fit. [04](04-phone-and-chrome.md#h-08)
- [ ] **H-09** (P1, S) Phone camera chips on one scrolling row; shorten two labels. [04](04-phone-and-chrome.md#h-09)

## P2 — soon

- [ ] **M-08** (P2, S) After C-02: `FOOT_SKIRT_M` 0.55 → ~0.35, `FOOT_SKIRT_SPAN` 0.3 → 0.15, low point a third aft of the tack; prov from the photo survey. [01](01-gennaker.md#m-08)
- [ ] **M-09** (P2, S) Rewrite the three clew passages in `kite.ts` and ASSUMPTIONS.md to say what the construction does once C-02 lands. [01](01-gennaker.md#m-09)
- [ ] **M-10** (P2, S) Delete `FLYING_CHORD_FRACTION`, `KITE_CHORDS`, `KiteGeometry.chords` and their tautological tests, or make the girth parabola load-bearing. [01](01-gennaker.md#m-10)
- [ ] **M-11** (P2, S) `bareSpar(rakeM)` for the plan view, or document the 0.41 m head offset in ASSUMPTIONS; test plan head x against 3D head x. [01](01-gennaker.md#m-11)
- [ ] **M-12** (P2, S) ASSUMPTIONS rows for the sheeting band, the twist pair, the luff AWA endpoints and the curl threshold; fix the stale 0.45 in `kite.test.ts`. [01](01-gennaker.md#m-12)
- [ ] **M-01** (P2, S) Draw the bowsprit retracted under the jib and at its `sprit` fraction under the kite, in both pictures. [02](02-plan-view.md#m-01)
- [ ] **M-07** (P2, S) A downwind leeward pose (forward of abeam) when the kite is up. [03](03-3d-scene-and-cameras.md#m-07)
- [ ] **M-02** (P2, M) Fit the camera to the projected extent of the geometry, not one union AABB. [03](03-3d-scene-and-cameras.md#m-02)
- [ ] **M-03** (P2, M) Taller 3D stage on desktop, or a two-column hero. [03](03-3d-scene-and-cameras.md#m-03)
- [ ] **M-04** (P2, S) Larger water plane, or fog to the horizon. [03](03-3d-scene-and-cameras.md#m-04)
- [ ] **M-05** (P2, S) TWA/AWA tag on the 3D hero, matching the plan view. [04](04-phone-and-chrome.md#m-05)
- [ ] **M-06** (P2, S) Reserve two digits for the heel value so the band does not reflow. [04](04-phone-and-chrome.md#m-06)
- [ ] **—** (P2, S) After C-02 and M-08: re-fit the clew's absolute height against the photo median (0.19 of mast) with a tagged flying-leech fraction if the drawn band still sits low. Owner decision 2026-09-02: photos decide, assumed-and-tagged is allowed.

## P3 — nice

- [ ] **L-01** (P3, S) Publish the curling kite luff as its own state, not `stalled`. [03](03-3d-scene-and-cameras.md#l-01)
- [ ] **L-02** (P3, S) One telltale vocabulary across both heroes, and a legend on the 3D card. [03](03-3d-scene-and-cameras.md#l-02)
- [ ] **L-03** (P3, S) Test the luff side at AWA 93 and 118 with magnitude bands; replace the constant-vs-constant sheet-band check with one solved from the clew circle. [01](01-gennaker.md#l-03)
