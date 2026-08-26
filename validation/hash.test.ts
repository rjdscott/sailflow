import { describe, expect, it } from 'vitest';
import { boat, boatHash } from './compare';

describe('boatHash', () => {
  it('does not move on a provenance or source note edit', () => {
    const edited = {
      ...boat,
      provenance: {
        ...boat.provenance,
        'hull.loaM': { source: 'x', kind: 'assumed' as const, note: 'reworded' },
      },
      sources: {},
    };
    expect(boatHash(edited)).toBe(boatHash());
  });
  it('moves on a geometry edit', () => {
    expect(boatHash({ ...boat, hull: { ...boat.hull, loaM: boat.hull.loaM + 0.01 } })).not.toBe(
      boatHash(),
    );
  });
});
