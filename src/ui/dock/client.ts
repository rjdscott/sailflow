/**
 * The single place Dock mode names a solver client (ADR 0003). One line
 * changes when Phase 04's `solver.worker.ts` lands; nothing else in
 * `src/ui/dock` knows whether it is talking to a stub or a worker.
 */
import { stubClient, type SolverClient } from '../../worker/client';

export type Client = Pick<SolverClient, 'request'>;

let client: Client | undefined;

export function getClient(): Client {
  // ponytail: real-client swap is this line -> `client ??= new SolverClient();`
  client ??= stubClient();
  return client;
}
