/**
 * One solver worker for the whole app (ADR 0003). Loads the boat once;
 * every screen's `getClient()` indirection resolves here.
 */
import { SolverClient, stubClient } from '../worker/client';
import type { LoadBoatRequest } from '../worker/protocol';
import type { BoatDefinition } from '../core/types';
import j70 from '../../data/boats/j70.json';

export type Client = Pick<SolverClient, 'request'>;

let client: Client | undefined;
export let ready: Promise<null> | undefined;

export function sharedClient(): Client {
  if (!client) {
    // No Worker in node (unit tests): fall back to the stub so stores can construct.
    if (typeof Worker === 'undefined') return (client = stubClient());
    const c = new SolverClient();
    ready = c.request<LoadBoatRequest>({
      type: 'loadBoat',
      boat: j70 as unknown as BoatDefinition,
    });
    ready.catch((e) => console.error('solver: boat failed to load', e));
    client = c;
  }
  return client;
}
