# 0004. TypeScript solver now; a Rust engine only when multiplayer or heavier aero demands it

- **Status:** Accepted
- **Date:** 2026-08-25

## Context

The owner's end goal is the best sailing simulator on the market, including
multiplayer and possibly a paid tier. The MVP is a steady-state VPP: a 3×3
root-find per operating point, microseconds of arithmetic. The physics model
is the most uncertain part of the project for the next two months: the
rig-bend-to-shape layer is invented, calibration knobs change weekly. The app
must stay hostable on GitHub Pages with no server for the whole of Epic 1 and
Epic 2. Rust has a real role later: one physics crate compiled native for an
authoritative multiplayer server and to WASM for the browser, and the
headroom for panel-method aero.

## Options considered

**A. All-in Rust/WASM from the MVP**: the solver in Rust from day one.
- Pros: no later port; one language for engine and future server.
- Cons: slows exactly the iteration that matters now; wasm-bindgen toolchain
  and CI weight on a static site; harder to debug; buys no measurable speed
  for a 3-DOF equilibrium.

**B. TypeScript now, port to Rust later (mechanical port)**.
- Pros: fastest iteration on the uncertain physics; golden corpus makes the
  port verifiable module by module.
- Cons: a port is real work; two implementations exist during transition.

**C. TypeScript now, Rust engine written fresh at Epic 3 for the time-domain
multiplayer engine, consuming the same calibrated parameters** (chosen).
- Pros: as B, but the Rust code is written for what Rust is for (server +
  browser lockstep, many boats, higher-fidelity aero) instead of replicating
  a steady-state analyser that TS already runs fine.
- Cons: the TS analyser and the Rust engine coexist; parameter files must be
  shared by contract.

**D. Rust backend service**: physics on a server.
- Pros: none at this scale.
- Cons: hosting, uptime, privacy policy, no offline; nothing here needs it.

## Decision

**We will write the Epic 1 and Epic 2 physics in TypeScript, keep `src/core`
pure and behind the worker protocol (ADR 0003), maintain a golden corpus so a
Rust implementation can prove parity, and write the Rust engine fresh at
Epic 3, because performance is not the reason for Rust; multiplayer
determinism and code sharing between server and browser are.** No backend of
any kind before Epic 3.

Triggers that reopen this before Epic 3, any one of which is sufficient:
- a measured interaction exceeding 100 ms on a mid-range phone after
  precomputing the dock sweep in CI;
- a decision to implement lifting-line or vortex-lattice sail aero;
- a committed date for synchronous multiplayer.

## Consequences

Easier: weekly changes to the physics model, plain vitest, one toolchain.
Harder: Epic 3 must implement the protocol and pass the golden corpus at
1e-6 relative tolerance; the TS core cannot use anything a Rust port would
struggle to mirror (no closures over state, no floating-point tricks).
Committed to: `data/boats/*.json` and the calibration block as the shared
parameter contract. Risk accepted: two engines during Epic 3; unwinding
earlier than that costs the Rust toolchain setup plus whatever iteration
speed is lost.

**Revisit when:** any trigger above fires, or Epic 3 planning starts.

### Consequences — 2026-08-26 note (audit docs-consistency-01)

The reopen trigger is conditioned on "precomputing the dock sweep in CI",
which was never built — the dock perf work landed as a worker-side
provisional pass (#35). Read the trigger as: a measured interaction over
100 ms on a throttled Playwright run (L-08).

## Related

- Research: [02-market-and-physics §Web tech](../research/2026-08-25-sailing-sim-landscape/02-market-and-physics.md), decision-log rows 4–5
- [ADR 0003](0003-ui-talks-to-physics-only-through-a-typed-worker-protocol.md)
