# 0003. The UI talks to the physics core only through a typed worker protocol

- **Status:** Accepted
- **Date:** 2026-08-25

## Context

The physics core (`src/core`) must be testable headlessly, deterministic,
reusable by a build-time calibration script, and portable to Rust/WASM in
Epic 3 without touching the UI. Dock-mode scoring runs hundreds of equilibrium
solves per interaction and must not block the main thread on a phone. If UI
code imports solver functions directly, every one of those properties erodes
one convenience at a time.

## Options considered

**A. UI imports `src/core` directly**: simplest possible call.
- Pros: no message plumbing, synchronous results.
- Cons: solver blocks rendering; UI grows dependencies on internal core
  shapes; a WASM swap later means touching every call site.

**B. Typed request/response protocol over a Web Worker** (`src/worker/protocol.ts`):
JSON messages, versioned, with a promise client.
- Pros: main thread stays free; the protocol is the only surface a Rust
  engine must implement; golden-corpus tests are literally recorded
  request/response pairs; a main-thread fallback for tests is trivial.
- Cons: one indirection; results are async; message size matters for batch
  requests.

**C. Comlink or similar RPC library**: B with a dependency.
- Pros: less boilerplate.
- Cons: hides the wire format we need to freeze for the golden corpus and for
  the Rust port.

## Decision

**We will expose the physics core to the UI only via the versioned JSON
protocol in `src/worker/protocol.ts`, run in a Web Worker, because it is the
single boundary that keeps the core pure, keeps the phone responsive, and is
the contract a later Rust engine implements.** `src/ui` never imports from
`src/core`; an ESLint restriction enforces it from Phase 03.

## Consequences

Easier: headless tests, golden corpus, Rust parity, batch dock scoring off
the main thread. Harder: every new solver capability is a new request type
plus a version bump; debugging crosses a worker boundary. Committed to:
`PROTOCOL_VERSION` discipline and regenerating `validation/golden` on any
breaking change. Unwinding this means rewriting every store that calls the
solver, several days at MVP size.

**Revisit when:** a UI interaction measurably needs sub-frame synchronous
solver access (e.g. a 60 Hz time-domain loop in Epic 2 may move the loop
itself into the worker rather than reverse this decision).

### Consequences — 2026-08-26 note (audit docs-consistency-01)

The rule as enforced is one clause narrower than written: `src/ui` may
import **types only** from `src/core/types` (the shared DOM-free contract),
enforced by `no-restricted-imports` in `eslint.config.js`; ~35 UI files rely
on it. Verified 2026-08-26: every UI→core import is `import type … from
'…/core/types'`; `src/core` imports nothing from `src/ui` (M-17).

## Related

- Research: [01-adversarial-review §15–16](../research/2026-08-25-sailing-sim-landscape/01-adversarial-review.md)
- [ADR 0004](0004-typescript-solver-now-rust-engine-at-multiplayer.md)
- Plan: [2026-08-25-mvp-analyser phase 01](../plans/2026-08-25-mvp-analyser/phase-01-contracts-and-data.md)
