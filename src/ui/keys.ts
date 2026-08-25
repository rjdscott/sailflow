/**
 * Desktop keyboard shortcuts for the race screen (audit ux-02 M-13).
 *
 * Pure: the mapping from a keystroke to an intent, so the whole shortcut table
 * is unit-testable and the component is left with a switch. `[`/`]` are not
 * here — they nudge whichever slider has focus and live in `Slider.svelte`,
 * which is the only thing that knows the step.
 */

export type KeyAction =
  | { type: 'pointOfSail'; index: number }
  | { type: 'applyOptimum' }
  | { type: 'undo' }
  | { type: 'help' };

/** The keystroke fields the mapping reads. A `KeyboardEvent` satisfies it. */
export interface KeyStroke {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

const NON_TEXT_INPUTS = new Set(['range', 'checkbox', 'radio', 'button', 'submit', 'reset']);

/**
 * Is focus somewhere the keystroke belongs to the user, not the app? A range
 * input is not: it is a slider, and `[`/`]` are exactly what you want there.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== 'string') return false;
  if (el.isContentEditable) return true;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  if (el.tagName !== 'INPUT') return false;
  return !NON_TEXT_INPUTS.has((el as HTMLInputElement).type);
}

export function keyAction(stroke: KeyStroke, typing: boolean): KeyAction | null {
  if (typing || stroke.ctrlKey || stroke.metaKey || stroke.altKey) return null;
  if (stroke.key >= '1' && stroke.key <= '5') {
    return { type: 'pointOfSail', index: Number(stroke.key) - 1 };
  }
  if (stroke.key === 'o') return { type: 'applyOptimum' };
  if (stroke.key === 'u') return { type: 'undo' };
  if (stroke.key === '?') return { type: 'help' };
  return null;
}

/** The help sheet's table, and the only place the bindings are written down. */
export const SHORTCUTS: { keys: string; what: string }[] = [
  { keys: '1 – 5', what: 'Point of sail: close-hauled to run' },
  { keys: '[  ]', what: 'Nudge the focused slider one step' },
  { keys: '←  →', what: 'Nudge the focused slider one step' },
  { keys: 'o', what: 'Apply optimum' },
  { keys: 'u', what: 'Back to my trim' },
  { keys: '?', what: 'This list' },
];
