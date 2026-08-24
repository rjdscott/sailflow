/**
 * The drills screen's single point of contact with the solver. One indirection
 * so swapping `stubClient()` for the real `SolverClient` (Phase 04) is a
 * one-line change here rather than a sweep through the components.
 */
import { stubClient, type SolverClient } from '../../worker/client';
import type { LoadBoatRequest } from '../../worker/protocol';
import type { BoatDefinition } from '../../core/types';
import j70 from '../../../data/boats/j70.json';

let client: Pick<SolverClient, 'request'> | undefined;

export function getClient(): Pick<SolverClient, 'request'> {
  if (!client) {
    client = stubClient();
    void client.request<LoadBoatRequest>({
      type: 'loadBoat',
      boat: j70 as unknown as BoatDefinition,
    });
  }
  return client;
}
