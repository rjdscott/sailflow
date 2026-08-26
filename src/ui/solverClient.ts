/**
 * One solver worker for the whole app (ADR 0003). Loads the boat once;
 * every screen's `getClient()` indirection resolves here.
 *
 * The worker holds exactly one boat at a time — `loadBoat` replaces it — so
 * switching class is a reload, not a second worker. `setBoat` is the only way
 * to do it, and it returns the promise every screen should await before
 * trusting the next result: a solve that lands between the switch and the load
 * would be the old class's physics under the new class's name.
 */
import { SolverClient, stubClient } from '../worker/client';
import type { LoadBoatRequest } from '../worker/protocol';
import { boatFor } from '../lib/boat';
import { settings } from './stores/settings.svelte';

export type Client = Pick<SolverClient, 'request'>;

let client: Client | undefined;
let loadedBoatId: string | undefined;
export let ready: Promise<null> | undefined;

function load(c: Client, boatId: string): Promise<null> {
  loadedBoatId = boatId;
  const p = c.request<LoadBoatRequest>({ type: 'loadBoat', boat: boatFor(boatId) });
  p.catch((e) => console.error('solver: boat failed to load', e));
  return p;
}

export function sharedClient(): Client {
  if (!client) {
    // No Worker in node (unit tests): fall back to the stub so stores can construct.
    if (typeof Worker === 'undefined') return (client = stubClient());
    const c = new SolverClient();
    ready = load(c, settings.boatId);
    client = c;
  }
  return client;
}

/**
 * Point the worker at another class and record the choice. A no-op when the
 * worker already holds that boat, so a picker can call it on every change
 * without churning the worker.
 */
export function setBoat(boatId: string): Promise<null> {
  settings.setBoatId(boatId);
  const c = sharedClient();
  if (loadedBoatId === settings.boatId) return ready ?? Promise.resolve(null);
  ready = load(c, settings.boatId);
  return ready;
}

/** The class the worker currently holds — what a result actually describes. */
export function loadedBoat(): string | undefined {
  return loadedBoatId;
}
