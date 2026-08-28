import { describe, expect, it } from 'vitest';
import { TOUR_STEPS } from './steps';

/**
 * The tour is copy, so most of it is not testable — but some of it is a
 * contract rather than prose, and most of those clauses are audit findings.
 * (These assertions used to live in `race/explain.test.ts`, a file about the
 * control explainers; they belong next to the copy they pin.)
 *
 * 1. The anchors. `Tour.svelte` spotlights `step.anchor` by CSS selector, and
 *    a selector is a string nothing else in the build checks: rename
 *    `data-tour="conditions"` on the band and the tour silently stops pointing
 *    at anything (ux-04 H-02).
 * 2. The budget. Three cards, no card over three sentences. The first-run tour
 *    is the one screen a stranger reads before they have any reason to trust
 *    it; a fourth card and a wall of text is how a tour gets skipped, which is
 *    how the wind stayed undiscoverable in the first place.
 * 3. The two things called a tier stay separated (release-01 M-11) — now
 *    inside the rig card, since ADR 0021 left only one screen to explain.
 * 4. No numbers without provenance (CLAUDE.md). None of this is a modelled
 *    output, so the enforceable version is that it stays qualitative.
 */
describe('TOUR_STEPS', () => {
  it('is three steps, each with a title, a body and a hint', () => {
    expect(TOUR_STEPS).toHaveLength(3);
    for (const s of TOUR_STEPS) {
      expect(s.title.length, `"${s.title}" is not a title`).toBeGreaterThan(4);
      expect(s.body.length, `"${s.title}" has no body`).toBeGreaterThan(120);
      expect(s.hint.length, `"${s.title}" has no hint`).toBeGreaterThan(20);
    }
  });

  it('leads with the wind (audit ux-04 H-02)', () => {
    expect(TOUR_STEPS[0].title).toBe('Set the wind');
    expect(TOUR_STEPS[0].body).toMatch(/wind speed/i);
    expect(TOUR_STEPS[0].body).toMatch(/sea state/i);
  });

  it('anchors card 1 on the conditions half and card 2 on the rig', () => {
    expect(TOUR_STEPS[0].anchor).toBe('[data-tour="conditions"]');
    expect(TOUR_STEPS[1].anchor).toBe('[data-tour="rig"]');
    // Apply optimum is a button in the actions card, which the sheet does not
    // cover; nothing to point at, so nothing is cut out.
    expect(TOUR_STEPS[2].anchor).toBeUndefined();
  });

  it('says why the rig locks, in the rule that makes it lock', () => {
    expect(TOUR_STEPS[1].body).toContain('C.9.5(a)');
    expect(TOUR_STEPS[1].body).toContain('Commit for today');
  });

  it('separates the two things the app calls a tier (audit release-01 M-11)', () => {
    const tiers = TOUR_STEPS.find((s) => /density/i.test(s.body));
    expect(tiers, 'no step explains the word "tier"').toBeTruthy();
    expect(tiers!.body).toMatch(/confidence/i);
  });

  it('keeps every card inside three sentences', () => {
    for (const step of TOUR_STEPS) {
      // A terminator followed by a space or the end, so `C.9.5(a)` counts as
      // one token rather than as three sentences.
      const sentences = step.body.match(/[.!?](\s|$)/g) ?? [];
      expect(
        sentences.length,
        `"${step.title}" is ${sentences.length} sentences`,
      ).toBeLessThanOrEqual(3);
      expect(sentences.length, `"${step.title}" has no sentence`).toBeGreaterThan(0);
    }
  });

  it('quotes no numbers, so nothing in it needs provenance', () => {
    for (const s of TOUR_STEPS) {
      // A class-rule citation is a rule, not a measurement: `C.9.5(a)` is the
      // reason the rig locks, and there is no `prov:` tag for a rule book.
      const prose = `${s.title} ${s.body} ${s.hint}`.replace(/\bC\.\d+(\.\d+)*\(?\w?\)?/g, '');
      expect(prose, `"${s.title}" prints a number`).not.toMatch(/\d/);
    }
  });
});
