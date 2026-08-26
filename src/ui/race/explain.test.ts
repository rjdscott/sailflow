import { describe, expect, it } from 'vitest';
import boat from '../../../data/boats/j70.json';
import { coachSentence, EXPLAIN, MOVES, READOUT_EXPLAIN } from '../explain';
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
      expect(coachSentence(id, 1, 0.1, 'VMG')).toMatch(/\+0\.10 kt VMG/);
      expect(coachSentence(id, -1, 0.1, 'VMG')).toMatch(/\+0\.10 kt VMG/);
    }
  });

  it('reads as one imperative sentence at the displayed VMG precision', () => {
    expect(coachSentence('mainsheet', -1, 0.0612, 'VMG')).toBe(
      'Ease mainsheet one click: +0.06 kt VMG, leech is stalled.',
    );
  });

  it('names the metric it was given, so a reach does not claim VMG', () => {
    expect(coachSentence('mainsheet', -1, 0.0612, 'boat speed')).toBe(
      'Ease mainsheet one click: +0.06 kt boat speed, leech is stalled.',
    );
  });

  it('is empty for a control with no phrasing', () => {
    expect(coachSentence('cunningham', 1, 0.1, 'VMG')).toBe('');
  });
});

/**
 * The Δ sign convention used to be stated in one source comment and nowhere a
 * reader could reach it, so a leading `+` read as good news beside "0.29 kt
 * below target" (audit ux-03 M-05). The two readouts that print a delta in the
 * instrument band say which way it is signed.
 */
describe('READOUT_EXPLAIN', () => {
  it('states the delta sign convention on the two readouts that carry a delta', () => {
    for (const id of ['bsp', 'vmg']) {
      expect(READOUT_EXPLAIN[id], `${id} never says which way the delta is signed`).toMatch(
        /optimum is faster/,
      );
    }
  });
});
