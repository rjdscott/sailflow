/**
 * The race screen's one handle on the solver. Everything downstream takes a
 * `Client`, so swapping the stub for the real worker is the single `return`
 * below (see the comment) — no other file changes.
 */
import { stubClient, type SolverClient } from '../../worker/client';

export type Client = Pick<SolverClient, 'request'>;

export function getClient(): Client {
  // Real worker (Phase 04 solver): `return new SolverClient();`
  return stubClient();
}
