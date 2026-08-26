/**
 * The first-run tour's three cards (phase-two 04).
 *
 * Content only, so it is testable without mounting anything, and so the copy
 * sits in one file rather than inside markup. Three steps by design: the
 * two screens, the two things the app calls a "tier", and the one button that
 * rewrites the trim. Everything else is learned from the `?` on the control.
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
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: 'Dock, then Race',
    body:
      'Dock is the half hour before you leave: a forecast in, shroud turns and forestay out, ' +
      'committed for the day. Race is the half hour after: sheets, leads, traveller and backstay, ' +
      'and what each move is worth.',
    hint: 'The rig is on Dock because class rule C.9.5(a) freezes the standing rigging once you leave.',
  },
  {
    title: 'Two things called a tier',
    body:
      'Learn, Race and Analyse are display density — how much of the cockpit is on screen. ' +
      'The small A, B or C beside a number is something else: confidence in that number. ' +
      'A is a published figure, B a direction and a band, C a direction only.',
    hint: 'Density lives on the Race header and in More → Settings; tap any A/B/C badge for what it means.',
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
