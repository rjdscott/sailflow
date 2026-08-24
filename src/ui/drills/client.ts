import { sharedClient, type Client } from '../solverClient';

export function getClient(): Client {
  return sharedClient();
}
