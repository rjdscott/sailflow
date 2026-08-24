import { sharedClient, type Client } from '../solverClient';

export type { Client };

export function getClient(): Client {
  return sharedClient();
}
