/**
 * The first-run tour's three cards.
 *
 * Content only, so it is testable without mounting anything, and so the copy
 * sits in one file rather than inside markup. Three steps by design, and since
 * ADR 0021 merged Dock into the Simulator they are the three things a stranger
 * has to be told about one screen: where the wind is set, where the rig is and
 * why it locks, and the one button that rewrites the trim. Everything else is
 * learned from the `?` on the control.
 *
 * Card 1 is the wind because the audit's user report was that nobody could
 * find it (ux-04 H-02): three cards went by without the word appearing, and
 * card 1 was drawn *over* the rail it should have been pointing at. Each card
 * now names the element it is about, and `Tour.svelte` cuts a hole in its own
 * dimming over it.
 *
 * Prose only — no modelled numbers, so nothing here needs a `prov:` tag. The
 * one external reference is the J/70 class rule, which is a rule, not a
 * measurement.
 */
export interface TourStep {
  /** Sheet heading. */
  title: string;
  /** Two or three sentences; the whole card. */
  body: string;
  /** One line under the body, in quieter ink: where to go next. */
  hint: string;
  /**
   * CSS selector for the thing this card is about, spotlit behind the sheet.
   * A card with no anchor, or an anchor nothing on screen matches, simply
   * dims the page as before — so a selector may name an element a later phase
   * adds without this file having to know whether it is there yet.
   */
  anchor?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: 'Set the wind',
    anchor: '[data-tour="conditions"]',
    body:
      'The right half of the instrument band is the world you are sailing in: wind speed, wind ' +
      'angle, sea state, crew weight and which headsail is up. Every value over there is the ' +
      'control that sets it — drag the rose to swing the breeze aft, tap the words to change the ' +
      'sea or the sail.',
    hint: 'Everything on the left answers to it.',
  },
  {
    title: 'The rig, and the day',
    anchor: '[data-tour="rig"]',
    body:
      'The shroud turns and the forestay live in the Rig panel on this screen, so you can move ' +
      'one and watch the sail shape and the speed answer; Commit for today greys them, because ' +
      'class rule C.9.5(a) freezes the standing rigging once you leave the dock. Learn, Race and ' +
      'Analyse are display density; the small A, B or C beside a number is confidence in that ' +
      'number.',
    hint: 'A is a published figure, B a direction and a band, C a direction only.',
  },
  {
    title: 'Apply optimum',
    body:
      'Apply optimum searches every control the model actually reads, from where your sliders are ' +
      'and from the base tune, and keeps whichever finishes faster. It moves the sliders, so you can ' +
      'see what it changed and undo it.',
    hint: 'It is a local optimum on the control grid — tier B, a direction and a band, not a value to dial in.',
  },
];
