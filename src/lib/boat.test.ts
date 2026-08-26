import { describe, expect, it } from 'vitest';
import { validateBoat } from '../core/boat/validate';
import {
  activeBoat,
  boatChoices,
  boatFor,
  boatIds,
  DEFAULT_BOAT_ID,
  isBoatId,
  sailM,
} from './boat';

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

  it('resolves an active class the whole UI can draw from', () => {
    // Every UI module that used to import `data/boats/j70.json` now reads
    // `activeBoat`. If this were ever undefined — or a boat outside the
    // registry — the cockpit would draw a sail plan nothing had validated.
    expect(isBoatId(activeBoat.id)).toBe(true);
    expect(validateBoat(activeBoat)).toEqual([]);
  });
});

describe('sailM', () => {
  it('reads a girth in metres from the mm the file carries', () => {
    expect(sailM(boatFor(DEFAULT_BOAT_ID).sails.jib, 'lpMm')).toBeCloseTo(2.45, 6);
  });

  it('names the missing dimension instead of drawing a sail with no cloth', () => {
    // `SailDef`'s girths are `number | string`, so an absent or textual value
    // would otherwise reach the loft as `NaN` and silently collapse the sail.
    const sail = boatFor(DEFAULT_BOAT_ID).sails.main;
    expect(() => sailM(sail, 'noSuchMm')).toThrow(/noSuchMm/);
    expect(() => sailM(sail, 'orcTable')).toThrow(/not a number/);
  });
});
