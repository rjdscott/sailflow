import { describe, expect, it } from 'vitest';
import boat from '../../../data/boats/j70.json';
import { coachSentence, EXPLAIN, MOVES } from '../explain';
import { PROBE_CONTROLS } from './store.svelte';

describe('EXPLAIN', () => {
  it('covers every control in the boat definition', () => {
    for (const id of Object.keys(boat.controls)) {
      expect(EXPLAIN[id], `missing explainer for ${id}`).toBeTruthy();
    }
  });

  it('has no explainer for a control that does not exist', () => {
    expect(Object.keys(EXPLAIN).sort()).toEqual(Object.keys(boat.controls).sort());
  });

  it('writes a paragraph, not a caption', () => {
    for (const [id, text] of Object.entries(EXPLAIN)) {
      expect(text.length, `${id} is too short to be a paragraph`).toBeGreaterThan(120);
    }
  });
});

describe('coachSentence', () => {
  it('phrases both directions of every probed control', () => {
    for (const id of PROBE_CONTROLS) {
      expect(MOVES[id].up.verb).toBeTruthy();
      expect(MOVES[id].down.verb).toBeTruthy();
      expect(coachSentence(id, 1, 0.1)).toMatch(/\+0\.10 kt VMG/);
      expect(coachSentence(id, -1, 0.1)).toMatch(/\+0\.10 kt VMG/);
    }
  });

  it('reads as one imperative sentence at the displayed VMG precision', () => {
    expect(coachSentence('mainsheet', -1, 0.0612)).toBe(
      'Ease mainsheet one click: +0.06 kt VMG, leech is stalled.',
    );
  });

  it('is empty for a control with no phrasing', () => {
    expect(coachSentence('cunningham', 1, 0.1)).toBe('');
  });
});
