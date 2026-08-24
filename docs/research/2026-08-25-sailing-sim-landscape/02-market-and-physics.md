# 02. Market landscape, public physics sources, web tech

## Existing sims and trainers

| Product | What it does well | Weakness for our purpose | Price / platform |
|---|---|---|---|
| [Virtual Regatta Inshore](https://www.virtualregatta.com/en/inshore-game/) | Fleet racing, RRS umpire, huge fleet, World Sailing eSailing partner | **No sail trim at all** (autotrim); pay-to-win boosts | Free + IAP, web/mobile |
| SailX | Was best free browser fleet racer (100k+ users) | **Dead** after a hack | — |
| [VibeSail](https://vibesail.com/) | Free browser 3D, daily race, leaderboards, touch | Generic boat, no tuning, unknown physics depth | Free, web |
| [eSail](https://store.steampowered.com/app/794860/) | 17-module structured cruiser course; good feel | No one-design racing, no rig tuning | ~$30, Steam |
| Sailaway | Real charts, GRIB weather, passages | Cruising, irrelevant to buoy racing | ~£30 + sub |
| Sail Simulator 5 | Legacy | Windows only, unmaintained | ~£30 |
| Top Sailor | Trim matters, capsize | Finicky controls | $2.49 mobile |
| [North U Sail Trim Simulator](https://apps.apple.com/us/app/north-u-sailing-trim-simulator/id988150300) | Real North Design Suite shapes, full control set | **J/35 only**, static, no racing, no scoring | $6.99 iOS/Android |
| [SailRhythm](https://www.sailrhythm.com/) | Free browser VPP, 3D draft/twist responds to controls, real polars | Catalina 36 cruiser, no racing, no rig tune | Free, web |
| [Atterwind](https://simulator.atterwind.info/) | Wind gradient / apparent wind / twist teaching toy | Single concept | Free, web |
| Expedition / Adrena | Pro nav, consumes polars | Not a trainer | ~$1400 |
| [ORC Sailor Services](https://orc.org/sailors/sailor-services) | Free Speed Guides + polar tables (SYLK/Expedition) | Data, not a tool | Free reg |

**Gap:** nobody offers a free, browser, one-design-specific, physics-honest
trainer where rig tune + sail trim + helm + tactics are live and scored on the
same boat. VR = tactics, no trim. North U = trim, wrong boat, no racing.
SailRhythm = trim, cruiser. SailX dead.

## Public physics sources

- [ORC VPP Documentation 2023](https://orc.org/uploads/files/ORC-VPP-Documentation-2023.pdf):
  full aero coefficient tables, depowering, twist, windage, blanketing,
  added resistance in waves. Annual, free.
- Hazen 1980 aero model, origin of ORC/IMS approach; known limitation: flat/reef
  don't correctly model twist-based depowering.
- Delft Systematic Yacht Hull Series (Keuning & Katgert 2008, Gerritsma/Onnink
  1981). Coefficient tables restated publicly. **J/70 sits at or outside DSYHS
  parameter bounds** (light, wide, planing sportboat); calibrate rather than trust.
- [marinlauber/Python-VPP](https://github.com/marinlauber/Python-VPP) (MIT):
  3-DOF, implements ORC aero + hydro. Port the coefficient math, not the solver.
- [leeboardtools/bythelee](https://github.com/leeboardtools/bythelee): JS 3D
  sailing sim with three.js + `sailsim` force module.
- J/70 data: [ORC OD certificate](https://data.orc.org/public/od/2021/j70.od.html?nav=1)
  (LOA 6.910, beam 2.254, draft 1.383, disp 811 kg);
  [ORC Speed Guide J/70](https://www.carpediemsailingteam.com/app/download/16137868/Speed_Guide_J70_Class.pdf)
  (polars TWS 6/8/10/12/14/16/20, jib + A-sail); [boatpolars.com](https://www.boatpolars.com/);
  [North J/70 tuning guide](https://j70tr.org/wp-content/uploads/2025/12/north-j70-tuningguide-EUR.pdf)
  (shroud tension by band, leech telltale targets);
  [Quantum J/70 guide](https://www.quantumsails.com/en/sails/one-design/documents/j70/j70_tuningguide.aspx);
  [Class Rules 2025](https://j70ica.org/wp-content/uploads/2025/03/Class-Rules-2025.pdf).
- Paywalled/private: sail-designer flying shapes, North Design Suite
  coefficients, measured J/70 CFD/tank data, SNAME/HISWA originals.

## Web tech

- **Rust→WASM vs TS:** WASM wins only when the sim stays inside WASM and
  crosses the JS boundary rarely. A 3-DOF equilibrium (or a 60 Hz rigid body
  with ~10 boats) is microseconds in TS. Real reasons for Rust later: (1) same
  physics crate native on an authoritative multiplayer server and WASM in the
  browser; (2) panel-method/lifting-line aero at 100× the compute; (3) build-
  time grid precompute speed. Rust also costs toolchain and iteration speed
  during the period when the physics model is most uncertain.
- **Web Worker** for physics regardless of language; fixed timestep, render
  with interpolation. OffscreenCanvas ~95% supported.
- **Rendering:** Canvas 2D / SVG for course and section views (no dependency);
  three.js only for a sail close-up, later.
- **Framework:** Svelte 5 (~3–10 KB gzip) or vanilla for a mobile PWA shell.
- **GitHub Pages:** static only, 1 GB, 100 GB/month soft, 10 builds/hour. No
  multiplayer, no persistence. Private repo Pages requires paid plan;
  Cloudflare Pages is free on private repos.
- **Free backend when needed:** Cloudflare Workers free (100k req/day) + KV/D1;
  Durable Objects (real-time) paid. Supabase free pauses after 7 idle days.
