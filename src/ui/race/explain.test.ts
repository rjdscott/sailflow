import { describe, expect, it } from 'vitest';
import boat from '../../../data/boats/j70.json';
import { coachSentence, EXPLAIN, MOVES, READOUT_EXPLAIN } from '../explain';
import { DIAGRAM_LABELS, EXPLAIN_DETAIL } from '../explainDetail';
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

/**
 * The illustrated half (audit ux-01 L-03). Two things can rot here: a control
 * gains an explainer paragraph and no diagram, and a diagram is drawn in
 * `ExplainDiagram.svelte` and then never referenced by anything.
 */
describe('EXPLAIN_DETAIL', () => {
  it('illustrates exactly the controls that have a paragraph', () => {
    expect(Object.keys(EXPLAIN_DETAIL).sort()).toEqual(Object.keys(EXPLAIN).sort());
  });

  it('names a diagram that has an accessible label', () => {
    for (const [id, d] of Object.entries(EXPLAIN_DETAIL)) {
      expect(DIAGRAM_LABELS[d.diagram], `${id} points at an undrawn diagram`).toBeTruthy();
    }
  });

  it('draws no schematic that nothing points at', () => {
    const used = new Set(Object.values(EXPLAIN_DETAIL).map((d) => d.diagram));
    for (const kind of Object.keys(DIAGRAM_LABELS)) {
      expect(used.has(kind as keyof typeof DIAGRAM_LABELS), `${kind} is drawn but unused`).toBe(
        true,
      );
    }
  });

  it('lists two to four things each control changes, as phrases not essays', () => {
    for (const [id, d] of Object.entries(EXPLAIN_DETAIL)) {
      expect(d.changes.length, `${id} lists the wrong number of effects`).toBeGreaterThanOrEqual(2);
      expect(d.changes.length, `${id} lists the wrong number of effects`).toBeLessThanOrEqual(4);
      for (const c of d.changes) {
        expect(c.length, `${id}: "${c}" is not a phrase`).toBeGreaterThan(10);
        expect(c.length, `${id}: "${c}" is a paragraph, not a phrase`).toBeLessThan(110);
      }
    }
  });

  /**
   * CLAUDE.md's honesty rule: no number in the app without a `prov:` tag or an
   * `ASSUMPTIONS.md` row. None of these are modelled outputs, so the enforceable
   * version here is that they stay qualitative — a digit in a bullet is a
   * setting someone will dial in.
   */
  it('quotes no numbers, because none of these are measured', () => {
    for (const [id, d] of Object.entries(EXPLAIN_DETAIL)) {
      for (const c of d.changes) {
        expect(c, `${id}: "${c}" prints a number with no provenance`).not.toMatch(/\d/);
      }
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

/**
 * The conditions half of the instrument band (ADR 0021). Every value over
 * there is a control, and every control carries the same `?` the boat's
 * numbers do, so a missing entry is a `?` that opens an empty sheet.
 */
describe('READOUT_EXPLAIN for the conditions half', () => {
  const CONDITION_IDS = ['tws', 'twa', 'sea', 'crew', 'sailset'];

  it('explains every value the conditions half draws', () => {
    for (const id of CONDITION_IDS) {
      expect(READOUT_EXPLAIN[id], `no explainer for ${id}`).toBeTruthy();
      expect(READOUT_EXPLAIN[id].length, `${id} is a caption, not a paragraph`).toBeGreaterThan(
        120,
      );
    }
  });

  it('says what sea state actually is, and where it is modelled', () => {
    expect(READOUT_EXPLAIN.sea).toMatch(/added resistance/i);
    expect(READOUT_EXPLAIN.sea).toMatch(/waves\.ts/);
    expect(READOUT_EXPLAIN.sea).toMatch(/tier B/i);
  });

  it('keeps no explainer for a readout the band no longer draws', () => {
    expect(READOUT_EXPLAIN.height, 'TWA is the conditions half`s `twa` now').toBeUndefined();
  });
});
