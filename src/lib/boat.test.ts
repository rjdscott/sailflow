import { describe, expect, it } from 'vitest';
import { validateBoat } from '../core/boat/validate';
import { boatChoices, boatFor, boatIds, DEFAULT_BOAT_ID, isBoatId } from './boat';

describe('boat registry', () => {
  it('lists the default first so a picker opens on the boat the gates run on', () => {
    expect(boatIds()[0]).toBe(DEFAULT_BOAT_ID);
  });

  it('validates every committed class against the schema the solver reads', () => {
    // The registry is the app's whole supply of boats. A class that reaches it
    // without passing `validateBoat` is one the solver will read fields off
    // and silently get `undefined` for.
    for (const id of boatIds()) expect(validateBoat(boatFor(id)), id).toEqual([]);
  });

  it('names every class, because the picker renders the name not the id', () => {
    for (const c of boatChoices()) expect(c.name.length).toBeGreaterThan(0);
  });

  it('attaches a reference polar to the default class', () => {
    // Without it `pctPolar` would quietly report 0 % at tier C for the one
    // boat the whole validation gate is built on.
    expect(boatFor(DEFAULT_BOAT_ID).polar?.twsKt.length).toBeGreaterThan(0);
  });

  it('falls back to the default rather than throwing on an unknown id', () => {
    // Unknown ids arrive from old share links and hand-edited localStorage.
    // A blank screen would be a worse answer than the default boat.
    expect(boatFor('not-a-boat').id).toBe(DEFAULT_BOAT_ID);
    expect(boatFor(undefined).id).toBe(DEFAULT_BOAT_ID);
    expect(isBoatId('not-a-boat')).toBe(false);
    expect(isBoatId(DEFAULT_BOAT_ID)).toBe(true);
  });
});
