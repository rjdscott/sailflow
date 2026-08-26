import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Condition, RaceControls } from '../core/types';
import { readSession, SESSION_KEY, writeSession } from './scenario';

const RACE: RaceControls = {
  backstay: 30,
  mainsheet: 70,
  traveller: -20,
  cunningham: 20,
  outhaul: 60,
  vang: 30,
  jibSheet: 70,
  jibLead: 5,
  inhauler: 20,
  mainHalyard: 50,
  jibHalyard: 50,
};

const CONDITION: Condition = { twsKt: 18, twaDeg: 42, seaState: 2, crewKg: 320, sailset: 'jib' };

function mockLocalStorage(initial: Record<string, string> = {}): Map<string, string> {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  return store;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('session persistence', () => {
  it('writes and reads back a whole session', () => {
    mockLocalStorage();
    const forecast = { minKt: 8, likelyKt: 12, maxKt: 16, seaState: 1 as const, crewKg: 300 };
    writeSession({ condition: CONDITION, race: RACE, forecast });
    expect(readSession()).toEqual({ condition: CONDITION, race: RACE, forecast });
  });

  it('drops the parts that do not validate and keeps the rest', () => {
    mockLocalStorage({
      [SESSION_KEY]: JSON.stringify({ condition: { twsKt: 14 }, race: { backstay: 30 } }),
    });
    expect(readSession()).toEqual({ condition: { twsKt: 14 } });
  });

  it('snaps a stored trim onto the control grid, as a link is snapped', () => {
    mockLocalStorage({
      [SESSION_KEY]: JSON.stringify({ race: { ...RACE, backstay: 999, jibLead: -3 } }),
    });
    expect(readSession().race).toEqual({ ...RACE, backstay: 100, jibLead: 0 });
  });

  it('survives garbage and a storage that throws', () => {
    mockLocalStorage({ [SESSION_KEY]: 'not json' });
    expect(readSession()).toEqual({});
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('private mode');
      },
      setItem: () => {
        throw new Error('private mode');
      },
    });
    expect(readSession()).toEqual({});
    expect(() => writeSession({ race: RACE })).not.toThrow();
  });
});
